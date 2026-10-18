const fs = require('fs');
const path = require('path');
const https = require('https');
const { Chess } = require('chess.js');

const ROOT_DIR = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache');
const SF_CACHE_PATH = path.join(CACHE_DIR, 'stockfish-10.0.2.js');
const SF_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
const OUTPUT_JSON_PATH = path.join(ROOT_DIR, 'src', 'data', 'chessEvals.json');

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const DEFAULT_DEPTH = 16;

/**
 * 第一優先：向 Lichess 官方 Cloud Eval API 查詢（即 Lichess 介面上的「深度 50~75 CLOUD」）
 * 回傳值已固定為白方視角（正數白優、負數黑優）
 */
async function fetchLichessCloudEval(fen) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'ShuojenBlog-ChessEval/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const pv = data && data.pvs && data.pvs[0];
    if (!pv) return null;

    if (typeof pv.mate === 'number') {
      return {
        cp: pv.mate > 0 ? 10000 : -10000,
        mate: pv.mate,
        winner: null,
        evalStr: `#${pv.mate}`,
      };
    }
    if (typeof pv.cp === 'number') {
      return {
        cp: pv.cp,
        mate: null,
        winner: null,
        evalStr: (pv.cp / 100).toFixed(2),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 第二優先：使用 Stockfish 17 NNUE 引擎 API 計算（與 Lichess 現代 NNUE 評估標準一致，回傳值固定為白方視角）
 */
async function fetchStockfish17NnueEval(fen, depth = DEFAULT_DEPTH) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://chess-api.com/v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, depth: Math.min(depth, 18) }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || data.error) return null;

      if (data.mate !== null && data.mate !== undefined && data.mate !== '') {
        const mateVal = parseInt(data.mate, 10);
        if (!isNaN(mateVal)) {
          return {
            cp: mateVal > 0 ? 10000 : -10000,
            mate: mateVal,
            winner: null,
            evalStr: `#${mateVal}`,
          };
        }
      }

      if (data.centipawns !== undefined && data.centipawns !== null) {
        const cpVal = parseInt(data.centipawns, 10);
        if (!isNaN(cpVal)) {
          return {
            cp: cpVal,
            mate: null,
            winner: null,
            evalStr: (cpVal / 100).toFixed(2),
          };
        }
      }

      if (typeof data.eval === 'number') {
        const cpVal = Math.round(data.eval * 100);
        return {
          cp: cpVal,
          mate: null,
          winner: null,
          evalStr: data.eval.toFixed(2),
        };
      }
    } catch {
      // retry on transient network error
    }
  }
  return null;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
    }
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`下載失敗 HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

let currentLineHandler = null;
let localSfInitPromise = null;
let localSfQueue = Promise.resolve();

function ensureLocalStockfish() {
  if (localSfInitPromise) return localSfInitPromise;
  localSfInitPromise = (async () => {
    if (!fs.existsSync(SF_CACHE_PATH)) {
      console.log('⬇️  首次下載本地離線備援 Stockfish 引擎...');
      await downloadFile(SF_CDN_URL, SF_CACHE_PATH);
    }

    global.postMessage = (line) => {
      if (currentLineHandler) {
        currentLineHandler(String(line));
      }
    };
    global.close = () => {};

    const savedArgv = process.argv;
    process.argv = savedArgv.slice(0, 2);
    require(SF_CACHE_PATH);
    process.argv = savedArgv;

    const send = (cmd) => {
      if (typeof global.onmessage === 'function') {
        global.onmessage({ data: cmd });
      }
    };

    await new Promise((resolve) => {
      currentLineHandler = (line) => {
        if (line.includes('uciok')) {
          resolve();
        }
      };
      send('uci');
    });

    // 關閉舊版 Stockfish 預設的 Contempt=24，消除輪走方的波動偏差
    send('setoption name Contempt value 0');

    return { send };
  })();
  return localSfInitPromise;
}

function evaluateWithLocalStockfish(fen, depth, turn) {
  const run = async () => {
    const { send } = await ensureLocalStockfish();
    const sign = turn === 'w' ? 1 : -1;

    return new Promise((resolve) => {
      let lastResult = { cp: 0, mate: null, winner: null, evalStr: '0.00' };

      currentLineHandler = (text) => {
        if (text.startsWith('info ')) {
          const scoreMatch = text.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
          if (scoreMatch) {
            const type = scoreMatch[1];
            const rawVal = parseInt(scoreMatch[2], 10);
            if (type === 'mate') {
              const whiteMate = rawVal * sign;
              lastResult = {
                cp: whiteMate > 0 ? 10000 : -10000,
                mate: whiteMate,
                winner: null,
                evalStr: `#${whiteMate}`,
              };
            } else {
              // 將舊版 Classical 評估比例換算至現代 NNUE 標準百兵比例
              const whiteCp = Math.round(rawVal * sign * 0.55);
              lastResult = {
                cp: whiteCp,
                mate: null,
                winner: null,
                evalStr: (whiteCp / 100).toFixed(2),
              };
            }
          }
        } else if (text.startsWith('bestmove')) {
          resolve(lastResult);
        }
      };

      send(`position fen ${fen}`);
      send(`go depth ${depth} movetime 600`);
    });
  };

  localSfQueue = localSfQueue.then(run, run);
  return localSfQueue;
}

async function evaluateFen(fen, depth = DEFAULT_DEPTH) {
  const game = new Chess(fen);
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'b' : 'w';
    return {
      cp: winner === 'w' ? 10000 : -10000,
      mate: 0,
      winner,
      evalStr: winner === 'w' ? '1-0' : '0-1',
    };
  }
  if (game.isDraw()) {
    return {
      cp: 0,
      mate: null,
      winner: null,
      evalStr: '0.00',
    };
  }

  // 1. 前 12 回合優先查 Lichess Cloud（深度 50~75 CLOUD）
  const fullMoveNumber = parseInt(fen.split(' ')[5] || '1', 10);
  if (fullMoveNumber <= 12) {
    const cloudRes = await fetchLichessCloudEval(fen);
    if (cloudRes) return cloudRes;
  }

  // 2. 使用現代 Stockfish 17 NNUE 評估
  const nnueRes = await fetchStockfish17NnueEval(fen, depth);
  if (nnueRes) return nnueRes;

  // 3. 離線備援：本地 Stockfish（已關閉 Contempt 並正規化百兵值，透過佇列避免並發衝突）
  return evaluateWithLocalStockfish(fen, depth, game.turn());
}

function normalizePgnToMoves(rawPgn) {
  let text = rawPgn.trim();
  const fenMatch = text.match(/\[\s*FEN\s+"([^"]+)"\s*\]/i);
  const customFen = fenMatch ? fenMatch[1] : null;
  text = text.replace(/\[\s*\w+\s+"[^"]*"\s*\]/g, ' ');
  text = text.replace(/\{[^}]*\}?/g, ' ');
  text = text.replace(/;[^\r\n]*/g, ' ');
  text = text.replace(/\$\d+/g, ' ');

  let openCount = 0;
  let balanced = '';
  for (const ch of text) {
    if (ch === '(') {
      openCount++;
      balanced += ch;
    } else if (ch === ')') {
      if (openCount > 0) {
        openCount--;
        balanced += ch;
      }
    } else {
      balanced += ch;
    }
  }
  if (openCount > 0) {
    balanced += ')'.repeat(openCount);
  }

  const countMoveTokens = (str) =>
    str
      .replace(/\([^()]*\)/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => t && !/^\d+\.+$/.test(t) && !['*', '1-0', '0-1', '1/2-1/2'].includes(t)).length;

  const processVariations = (input) => {
    let result = '';
    let i = 0;
    while (i < input.length) {
      if (input[i] === '(') {
        let depth = 1;
        let j = i + 1;
        while (j < input.length && depth > 0) {
          if (input[j] === '(') depth++;
          else if (input[j] === ')') depth--;
          j++;
        }
        const innerRaw = input.slice(i + 1, j - 1);
        const innerProcessed = processVariations(innerRaw);
        const afterStr = input.slice(j);

        const hasMovesAfter = countMoveTokens(afterStr) > 0;
        const innerMoveCount = countMoveTokens(innerProcessed);

        if (!hasMovesAfter && innerMoveCount > 1) {
          result = result.replace(/\s*(?:\d+\.+\s*)?[^\s()]+\s*$/, ' ' + innerProcessed.trim() + ' ');
        }
        i = j;
      } else {
        result += input[i];
        i++;
      }
    }
    return result;
  };

  const cleanedTokens = processVariations(balanced)
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');

  const startFen = customFen || START_FEN;
  const game = new Chess(startFen);
  const moves = [];

  for (const token of cleanedTokens) {
    if (!token || /^\d+\.+$/.test(token) || ['*', '1-0', '0-1', '1/2-1/2'].includes(token)) {
      continue;
    }
    const san = token.replace(/^\d+\.+/, '').replace(/[!?]+$/, '');
    if (!san) continue;
    try {
      const m = game.move(san);
      if (m) {
        moves.push({ san: m.san, fen: game.fen(), isCheckmate: game.isCheckmate() });
      }
    } catch {
      // ignore invalid token
    }
  }

  return { moves, customFen };
}

function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllMarkdownFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      arrayOfFiles.push(filePath);
    }
  }
  return arrayOfFiles;
}

async function main() {
  const args = process.argv.slice(2);
  const writePgn = args.includes('--write-pgn');
  const forceRefresh = args.includes('--refresh');
  const fileArgs = args.filter((a) => !a.startsWith('--'));

  let targetFiles = [];
  if (fileArgs.length > 0) {
    targetFiles = fileArgs.map((p) => path.resolve(ROOT_DIR, p));
  } else {
    targetFiles = [
      ...getAllMarkdownFiles(path.join(ROOT_DIR, 'blog')),
      ...getAllMarkdownFiles(path.join(ROOT_DIR, 'docs')),
      ...getAllMarkdownFiles(path.join(ROOT_DIR, 'src', 'pages')),
    ];
  }

  let evalDb = {
    [START_FEN]: { cp: 19, mate: null, winner: null },
  };
  if (!forceRefresh && fs.existsSync(OUTPUT_JSON_PATH)) {
    try {
      evalDb = { ...evalDb, ...JSON.parse(fs.readFileSync(OUTPUT_JSON_PATH, 'utf8')) };
    } catch {
      // ignore corrupt json
    }
  }

  const pgnTagRegex = /(<(?:White|Black|ChessGame)\b[^>]*?\bpgn=")([^"]*)("[^>]*?>)/g;
  const fensToCompute = new Set();

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    pgnTagRegex.lastIndex = 0;
    while ((match = pgnTagRegex.exec(content)) !== null) {
      const pgnText = match[2];
      const { moves } = normalizePgnToMoves(pgnText);
      for (const m of moves) {
        if (forceRefresh || !evalDb[m.fen]) {
          fensToCompute.add(m.fen);
        }
      }
    }
  }

  if (fensToCompute.size > 0) {
    const fenArray = [...fensToCompute];
    console.log(`♟️  發現 ${fenArray.length} 個新局面，啟動 Lichess Cloud + Stockfish 17 NNUE 深度分析...`);

    const CONCURRENCY = 4;
    let completed = 0;

    for (let i = 0; i < fenArray.length; i += CONCURRENCY) {
      const batch = fenArray.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((fen) => evaluateFen(fen, DEFAULT_DEPTH)));
      batch.forEach((fen, idx) => {
        const res = results[idx];
        evalDb[fen] = {
          cp: res.cp,
          mate: res.mate,
          winner: res.winner,
        };
      });
      completed += batch.length;
      process.stdout.write(`\r   進度：${completed} / ${fenArray.length}`);
    }
    console.log('\n✅ Lichess Cloud + Stockfish 17 NNUE 深度計算完成！');
  } else {
    console.log('⚡ 所有棋步局面皆已在預先計算快取中！');
  }

  if (!fs.existsSync(path.dirname(OUTPUT_JSON_PATH))) {
    fs.mkdirSync(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  }
  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(evalDb, null, 2), 'utf8');
  console.log(`💾 已儲存預先計算分數至：${path.relative(ROOT_DIR, OUTPUT_JSON_PATH)}`);

  if (writePgn) {
    for (const filePath of targetFiles) {
      if (!fs.existsSync(filePath)) continue;
      let content = fs.readFileSync(filePath, 'utf8');
      const matches = [...content.matchAll(pgnTagRegex)];
      let updated = false;

      for (const m of matches) {
        const fullMatch = m[0];
        const prefix = m[1];
        const pgnText = m[2];
        const suffix = m[3];
        if (pgnText.includes('[%eval')) continue;

        const { moves, customFen } = normalizePgnToMoves(pgnText);
        if (moves.length === 0) continue;

        const parts = [];
        if (customFen) parts.push(`[SetUp "1"] [FEN "${customFen}"]`);
        for (let i = 0; i < moves.length; i++) {
          const mv = moves[i];
          const movePrefix = i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : '';
          const ev = evalDb[mv.fen];
          if (mv.isCheckmate || !ev) {
            parts.push(`${movePrefix}${mv.san}`);
          } else {
            const evalTag = ev.mate !== null ? `#${ev.mate}` : (ev.cp / 100).toFixed(2);
            parts.push(`${movePrefix}${mv.san} { [%eval ${evalTag}] }`);
          }
        }
        content = content.replace(fullMatch, `${prefix}${parts.join(' ')}${suffix}`);
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`📝 已將 [%eval] 寫入檔案 PGN：${path.relative(ROOT_DIR, filePath)}`);
      }
    }
  }

  if (localSfInitPromise) {
    const { send } = await localSfInitPromise;
    send('quit');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 計算失敗:', err);
  process.exit(1);
});
