/**
 * 西洋棋局面評估預先計算腳本
 *
 * 掃描 blog/、docs/、src/pages/ 內所有 <White> / <Black> / <ChessGame> 的 PGN，
 * 將每個局面的評估分數（白方視角）預先寫入 src/data/chessEvals.json，讓讀者端 0 運算成本。
 *
 * 評估來源優先順序：
 *   1. Lichess Cloud Eval（前 12 回合，深度 50~75 CLOUD）
 *   2. 本地 Stockfish 18 Lite NNUE WASM（nn-9067e33176e8.nnue，與 Lichess 瀏覽器版相同引擎，深度 16，多核心平行運算）
 *
 * 用法：
 *   node scripts/gen-chess-eval.js             # 只計算新增局面，並移除已不再使用的局面
 *   node scripts/gen-chess-eval.js --refresh   # 全部重算
 *   node scripts/gen-chess-eval.js --write-pgn # 另外把 [%eval] 寫回 Markdown 的 PGN
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const { Chess } = require('chess.js');

const ROOT_DIR = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache');
const SF18_JS_PATH = path.join(CACHE_DIR, 'stockfish-18-lite-single.js');
const SF18_WASM_PATH = path.join(CACHE_DIR, 'stockfish-18-lite-single.wasm');
const SF18_JS_URL = 'https://unpkg.com/stockfish@18.0.5/bin/stockfish-18-lite-single.js';
const SF18_WASM_URL = 'https://unpkg.com/stockfish@18.0.5/bin/stockfish-18-lite-single.wasm';
const OUTPUT_JSON_PATH = path.join(ROOT_DIR, 'src', 'data', 'chessEvals.json');

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const DEFAULT_DEPTH = 16;
const WORKER_COUNT = 3;

/**
 * 第一優先：向 Lichess 官方 Cloud Eval API 查詢（即 Lichess 介面上的「深度 50~75 CLOUD」）
 * 回傳值已固定為白方視角（正數白優、負數黑優）
 */
async function fetchLichessCloudEval(fen) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
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
      return { cp: pv.mate > 0 ? 10000 : -10000, mate: pv.mate, winner: null, src: 'cloud' };
    }
    if (typeof pv.cp === 'number') {
      return { cp: pv.cp, mate: null, winner: null, src: 'cloud' };
    }
    return null;
  } catch {
    return null;
  }
}

async function ensureStockfish18Files() {
  if (fs.existsSync(SF18_JS_PATH) && fs.existsSync(SF18_WASM_PATH)) return;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log('⬇️  首次下載 Stockfish 18 Lite NNUE WASM 引擎 (~7MB)...');
  await Promise.all(
    [
      [SF18_JS_URL, SF18_JS_PATH],
      [SF18_WASM_URL, SF18_WASM_PATH],
    ].map(async ([url, dest]) => {
      if (fs.existsSync(dest)) return;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`下載失敗 ${url}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
    })
  );
}

/**
 * 建立單一 Stockfish 18 NNUE 子行程 Worker
 */
async function createSf18Worker() {
  const proc = spawn(process.execPath, [SF18_JS_PATH], {
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const rl = readline.createInterface({ input: proc.stdout });

  let lineHandler = null;
  rl.on('line', (line) => {
    if (lineHandler) lineHandler(line.trim());
  });

  await new Promise((resolve) => {
    lineHandler = (line) => {
      if (line === 'uciok') resolve();
    };
    proc.stdin.write('uci\n');
  });

  const evaluate = (fen, depth, turn) =>
    new Promise((resolve) => {
      const sign = turn === 'w' ? 1 : -1;
      let lastResult = null;

      const timer = setTimeout(() => {
        proc.stdin.write('stop\n');
      }, 8000);

      lineHandler = (line) => {
        if (line.startsWith('info ') && line.includes(' score ')) {
          if (/\b(lower|upper)bound\b/.test(line)) return;
          const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
          if (!scoreMatch) return;
          const rawVal = parseInt(scoreMatch[2], 10);
          if (scoreMatch[1] === 'mate') {
            const whiteMate = rawVal * sign;
            lastResult = {
              cp: whiteMate > 0 ? 10000 : -10000,
              mate: whiteMate,
              winner: null,
              src: 'sf18',
            };
          } else {
            lastResult = {
              cp: rawVal * sign,
              mate: null,
              winner: null,
              src: 'sf18',
            };
          }
        } else if (line.startsWith('bestmove')) {
          clearTimeout(timer);
          lineHandler = null;
          resolve(lastResult);
        }
      };

      proc.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
    });

  const close = () => {
    try {
      rl.close();
      proc.stdin.write('quit\n');
      proc.kill();
    } catch {
      // ignore
    }
  };

  return { evaluate, close };
}

let workerPoolPromise = null;
let nextWorkerIdx = 0;

function getWorkerPool() {
  if (workerPoolPromise) return workerPoolPromise;
  workerPoolPromise = (async () => {
    await ensureStockfish18Files();
    const workers = await Promise.all(
      Array.from({ length: WORKER_COUNT }, async () => {
        const w = await createSf18Worker();
        let queue = Promise.resolve();
        return {
          run: (fen, depth, turn) => {
            const job = queue.then(() => w.evaluate(fen, depth, turn));
            queue = job.catch(() => null);
            return job;
          },
          close: w.close,
        };
      })
    );
    return workers;
  })();
  return workerPoolPromise;
}

async function evaluateWithSf18Pool(fen, depth, turn) {
  const workers = await getWorkerPool();
  const worker = workers[nextWorkerIdx % workers.length];
  nextWorkerIdx++;
  return worker.run(fen, depth, turn);
}

/** 回傳白方視角的評估 */
async function evaluateFen(fen, depth = DEFAULT_DEPTH) {
  const game = new Chess(fen);
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'b' : 'w';
    return { cp: winner === 'w' ? 10000 : -10000, mate: 0, winner, src: 'terminal' };
  }
  if (game.isDraw()) {
    return { cp: 0, mate: null, winner: null, src: 'terminal' };
  }

  // 1. 前 12 回合優先查 Lichess Cloud（深度 50~75 CLOUD）
  const fullMoveNumber = parseInt(fen.split(' ')[5] || '1', 10);
  if (fullMoveNumber <= 12) {
    const cloudRes = await fetchLichessCloudEval(fen);
    if (cloudRes) return cloudRes;
  }

  // 2. 使用本地 Stockfish 18 Lite NNUE WASM 深度計算（無 API 限流、與 Lichess 瀏覽器引擎一致）
  return evaluateWithSf18Pool(fen, depth, game.turn());
}

/**
 * 與 src/components/Chess/ChessGame.js 的 normalizePgn 規則保持一致，
 * 確保這裡算出的 FEN 與讀者端重播出的 FEN 完全相同。
 */
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
    const termMatch = balanced.match(/(\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*)$/);
    if (termMatch) {
      const idx = balanced.length - termMatch[0].length;
      balanced = balanced.slice(0, idx) + ')'.repeat(openCount) + termMatch[0];
    } else {
      balanced += ')'.repeat(openCount);
    }
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
        const innerProcessed = processVariations(input.slice(i + 1, j - 1));
        const hasMovesAfter = countMoveTokens(input.slice(j)) > 0;
        if (!hasMovesAfter && countMoveTokens(innerProcessed) > 1) {
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

  const cleanedTokens = processVariations(balanced).replace(/\s+/g, ' ').trim().split(' ');

  const startFen = customFen || START_FEN;
  let game;
  try {
    game = new Chess(startFen);
  } catch {
    return { moves: [], customFen, startFen: null };
  }
  const moves = [];

  for (const token of cleanedTokens) {
    if (!token || /^\d+\.+$/.test(token) || ['*', '1-0', '0-1', '1/2-1/2'].includes(token)) continue;
    const san = token.replace(/^\d+\.+/, '').replace(/[!?]+$/, '');
    if (!san) continue;
    try {
      const m = game.move(san);
      if (m) moves.push({ san: m.san, fen: game.fen(), isCheckmate: game.isCheckmate() });
    } catch {
      // ignore invalid token
    }
  }

  return { moves, customFen, startFen: game ? new Chess(startFen).fen() : null };
}

function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  for (const file of fs.readdirSync(dirPath)) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllMarkdownFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      arrayOfFiles.push(filePath);
    }
  }
  return arrayOfFiles;
}

// 支援 pgn="..."、pgn={`...`}、pgn={"..."} 三種寫法
const PGN_SCAN_REGEX = /<(?:White|Black|ChessGame)\b[^>]*?\bpgn=(?:"([^"]*)"|\{\s*`([^`]*)`\s*\}|\{\s*"([^"]*)"\s*\})/g;
// --write-pgn 只改寫 pgn="..." 寫法
const PGN_WRITE_REGEX = /(<(?:White|Black|ChessGame)\b[^>]*?\bpgn=")([^"]*)("[^>]*?>)/g;

async function main() {
  const args = process.argv.slice(2);
  const writePgn = args.includes('--write-pgn');
  const forceRefresh = args.includes('--refresh');
  const fileArgs = args.filter((a) => !a.startsWith('--'));
  const scanAll = fileArgs.length === 0;

  const targetFiles = scanAll
    ? [
        ...getAllMarkdownFiles(path.join(ROOT_DIR, 'blog')),
        ...getAllMarkdownFiles(path.join(ROOT_DIR, 'docs')),
        ...getAllMarkdownFiles(path.join(ROOT_DIR, 'src', 'pages')),
      ]
    : fileArgs.map((p) => path.resolve(ROOT_DIR, p));

  let evalDb = {};
  if (fs.existsSync(OUTPUT_JSON_PATH)) {
    try {
      evalDb = JSON.parse(fs.readFileSync(OUTPUT_JSON_PATH, 'utf8'));
    } catch {
      console.warn('⚠️  chessEvals.json 格式損毀，將重新建立');
    }
  }

  // 收集所有用到的局面（含自訂 FEN 的起始局面），維持文件出現順序讓 JSON diff 穩定
  const usedFens = new Set([START_FEN]);
  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const match of content.matchAll(PGN_SCAN_REGEX)) {
      const pgnText = match[1] ?? match[2] ?? match[3] ?? '';
      const { moves, startFen } = normalizePgnToMoves(pgnText);
      if (startFen) usedFens.add(startFen);
      for (const m of moves) usedFens.add(m.fen);
    }
  }

  const needsCompute = (fen) => forceRefresh || !evalDb[fen] || evalDb[fen].approx;
  const fenArray = [...usedFens].filter(needsCompute);
  const failed = [];

  if (fenArray.length > 0) {
    console.log(`♟️  需計算 ${fenArray.length} 個局面（Lichess Cloud + Stockfish 18 NNUE）...`);
    let completed = 0;
    for (let i = 0; i < fenArray.length; i += WORKER_COUNT) {
      const batch = fenArray.slice(i, i + WORKER_COUNT);
      const results = await Promise.all(batch.map((fen) => evaluateFen(fen, DEFAULT_DEPTH)));
      batch.forEach((fen, idx) => {
        const res = results[idx];
        if (!res) {
          failed.push(fen);
          return;
        }
        evalDb[fen] = { cp: res.cp, mate: res.mate, winner: res.winner };
      });
      completed += batch.length;
      process.stdout.write(`\r   進度：${completed} / ${fenArray.length}`);
    }
    process.stdout.write('\n');
  } else {
    console.log('⚡ 所有棋步局面皆已在預先計算快取中！');
  }

  // 只保留目前文章用得到的局面，避免 JSON（會被打包給讀者）無限膨脹
  let outputDb = evalDb;
  if (scanAll) {
    outputDb = {};
    for (const fen of usedFens) {
      if (evalDb[fen]) outputDb[fen] = evalDb[fen];
    }
    const pruned = Object.keys(evalDb).length - Object.keys(outputDb).length;
    if (pruned > 0) console.log(`🧹 移除 ${pruned} 個已不再使用的局面`);
  }

  if (!fs.existsSync(path.dirname(OUTPUT_JSON_PATH))) {
    fs.mkdirSync(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  }
  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(outputDb, null, 2) + '\n', 'utf8');

  console.log(`💾 已儲存 ${Object.keys(outputDb).length} 個局面至：${path.relative(ROOT_DIR, OUTPUT_JSON_PATH)}`);
  if (failed.length > 0) {
    console.warn(`⚠️  ${failed.length} 個局面計算失敗未寫入（讀者端將以子力估算），下次執行會再嘗試`);
  }

  if (writePgn) {
    for (const filePath of targetFiles) {
      if (!fs.existsSync(filePath)) continue;
      let content = fs.readFileSync(filePath, 'utf8');
      let updated = false;

      for (const m of [...content.matchAll(PGN_WRITE_REGEX)]) {
        const [fullMatch, prefix, pgnText, suffix] = m;
        if (pgnText.includes('[%eval')) continue;
        const { moves, customFen } = normalizePgnToMoves(pgnText);
        if (moves.length === 0 || customFen) continue;

        const parts = moves.map((mv, i) => {
          const movePrefix = i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : '';
          const ev = outputDb[mv.fen];
          if (mv.isCheckmate || !ev) return `${movePrefix}${mv.san}`;
          const evalTag = ev.mate !== null ? `#${ev.mate}` : (ev.cp / 100).toFixed(2);
          return `${movePrefix}${mv.san} { [%eval ${evalTag}] }`;
        });
        content = content.replace(fullMatch, `${prefix}${parts.join(' ')}${suffix}`);
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`📝 已將 [%eval] 寫入檔案 PGN：${path.relative(ROOT_DIR, filePath)}`);
      }
    }
  }

  if (workerPoolPromise) {
    const workers = await workerPoolPromise;
    workers.forEach((w) => w.close());
  }
  process.exit(0);
}

// 評估失敗不應讓 npm run build / push 中斷：保留既有 JSON 並以 0 結束
main().catch((err) => {
  console.warn('⚠️  棋局評估計算失敗，沿用既有 chessEvals.json：', err && err.message ? err.message : err);
  process.exit(0);
});
