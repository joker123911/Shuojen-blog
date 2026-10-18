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
const DEFAULT_DEPTH = 18;

/**
 * 優先向 Lichess 官方 Cloud Eval API 查詢（即 Lichess 介面上的「深度 50~75 CLOUD」）
 * 回傳值已固定為白方視角（正數白優、負數黑優）；若雲端未收錄該中後盤局面則回傳 null
 */
function fetchLichessCloudEval(fen) {
  return new Promise((resolve) => {
    const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`;
    const req = https.get(
      url,
      { headers: { Accept: 'application/json', 'User-Agent': 'ShuojenBlog-ChessEval/1.0' } },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const pv = data && data.pvs && data.pvs[0];
            if (!pv) {
              resolve(null);
              return;
            }
            if (typeof pv.mate === 'number') {
              resolve({
                cp: pv.mate > 0 ? 10000 : -10000,
                mate: pv.mate,
                winner: null,
                depth: data.depth,
                source: 'lichess-cloud',
                evalStr: `#${pv.mate}`,
              });
            } else if (typeof pv.cp === 'number') {
              resolve({
                cp: pv.cp,
                mate: null,
                winner: null,
                depth: data.depth,
                source: 'lichess-cloud',
                evalStr: (pv.cp / 100).toFixed(2),
              });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(null);
    });
  });
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

async function loadStockfishEngine() {
  if (!fs.existsSync(SF_CACHE_PATH)) {
    console.log('⬇️  首次下載 Stockfish 引擎至本地快取...');
    await downloadFile(SF_CDN_URL, SF_CACHE_PATH);
  }

  global.postMessage = (line) => {
    if (currentLineHandler) {
      currentLineHandler(String(line));
    }
  };
  global.close = () => {};

  // 避免 Emscripten 將 CLI 參數當作 Stockfish 啟動參數而直接結束
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

  return { send };
}

async function evaluateFenWithEngine({ send }, fen, depth = DEFAULT_DEPTH) {
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

  // 1. 優先向 Lichess Cloud Eval 查詢（取得跟 Lichess 一模一樣的深度 50~75 CLOUD 評估）
  const cloudRes = await fetchLichessCloudEval(fen);
  if (cloudRes) {
    return cloudRes;
  }

  // 2. 若該中後盤局面不在 Lichess Cloud 庫中，使用本地 Stockfish 深度 18 計算
  const turn = game.turn();
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
            const whiteCp = rawVal * sign;
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
    send(`go depth ${depth} movetime 1200`);
  });
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
    ];
  }

  let evalDb = {
    [START_FEN]: { cp: 20, mate: null, winner: null },
  };
  if (fs.existsSync(OUTPUT_JSON_PATH)) {
    try {
      evalDb = { ...evalDb, ...JSON.parse(fs.readFileSync(OUTPUT_JSON_PATH, 'utf8')) };
    } catch {
      // ignore corrupt json
    }
  }

  const pgnTagRegex = /(<(?:White|Black|ChessGame)\b[^>]*?\bpgn=")([^"]*)("[^>]*?>)/g;
  const fensToCompute = new Set();
  const filePgns = [];

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    pgnTagRegex.lastIndex = 0;
    while ((match = pgnTagRegex.exec(content)) !== null) {
      const pgnText = match[2];
      const { moves } = normalizePgnToMoves(pgnText);
      filePgns.push({ filePath, pgnText, moves });
      for (const m of moves) {
        if (forceRefresh || !evalDb[m.fen]) {
          fensToCompute.add(m.fen);
        }
      }
    }
  }

  // 額外確保第 1 局（持黑對歐忞侖）的 38 回合棋譜也預先算好存入快取
  const game1Pgn =
    '1. d4 Nf6 2. Bf4 c5 3. d5 b5 4. e3 Bb7 5. c4 g6 6. Nf3 Qa5+ 7. Nbd2 bxc4 8. Bxc4 Nxd5 { [%csl Ge5] } 9. Be2 (9. Be5 Nf6 10. Bc3 Qc7 11. O-O Bg7 12. Qb3 O-O 13. Rfe1 { [%csl Gc6] } 13... Nc6 14. Bxf7+ Rxf7 15. Ng5 Rf8 16. Nxf7 Rxf7 17. Nf3 e6 18. Rad1 Nd5 19. Bxg7 Kxg7 20. Rd2 { [%csl Ge5] } 20... Ne5 (20... Ncb4) 21. Nxe5 Rf8 22. Red1 Qxe5 23. Qxb7 Rf7 24. Qxa7 Nxe3 25. Rxd7 Nxd1 26. Rxf7+ Kh6 27. Rxh7+ Kg5 28. h4+ Kg4 29. Qa4+ Qd4 30. Qxd4+ cxd4 31. b4 Nc3 32. Re7 Kf5 33. a3 { [%csl Gf6] } 33... Kf6 34. Rd7 e5 35. Kf1 Ke6 36. Rd8 Kf5 37. Ke1 Ke4 38. f3+ Kf5) *';
  const { moves: game1Moves } = normalizePgnToMoves(game1Pgn);
  for (const m of game1Moves) {
    if (!evalDb[m.fen]) {
      fensToCompute.add(m.fen);
    }
  }

  let sf = null;
  if (fensToCompute.size > 0) {
    console.log(`♟️  發現 ${fensToCompute.size} 個新局面，啟動 Stockfish 進行深度分析 (depth=${DEFAULT_DEPTH})...`);
    sf = await loadStockfishEngine();
    let count = 0;
    for (const fen of fensToCompute) {
      count++;
      const res = await evaluateFenWithEngine(sf, fen, DEFAULT_DEPTH);
      evalDb[fen] = {
        cp: res.cp,
        mate: res.mate,
        winner: res.winner,
      };
      if (count % 10 === 0 || count === fensToCompute.size) {
        process.stdout.write(`\r   進度：${count} / ${fensToCompute.size}`);
      }
    }
    console.log('\n✅ Stockfish 深度計算完成！');
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

  if (sf) {
    sf.send('quit');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 計算失敗:', err);
  process.exit(1);
});
