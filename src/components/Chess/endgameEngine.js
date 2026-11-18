import { Chess } from 'chess.js';
import { DRAW, idx } from './kqkTablebase';
import { kqkpIndex } from './kqkpTablebase';

/**
 * 用殘局庫幫任一方挑棋步。tables 可以有：
 *   q：王后對單王、r：王車對單王、p：王兵對單王（各為 { w, b }）；
 *   qp：王后對王兵（黑兵，{ file, w, b }，只有那一條直線）。
 * 局面值都以白方的角度：>= 0 是白方幾個半步後將死，DRAW 是和棋。
 */

/** 讀出白王、白子（Q／R／P）、黑王（和黑兵）的位置與種類；不是這幾種殘局就回傳 null。 */
function readPieces(fen) {
  const rows = fen.split(' ')[0].split('/');
  let wk = -1;
  let bk = -1;
  let piece = null;
  let sq = -1;
  let bp = -1;
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        f += Number(ch);
        continue;
      }
      const s = (7 - r) * 8 + f;
      if (ch === 'K') wk = s;
      else if (ch === 'k') bk = s;
      else if (piece === null && 'QRP'.includes(ch)) {
        piece = ch.toLowerCase();
        sq = s;
      } else if (ch === 'p' && bp < 0) bp = s;
      else return null;
      f++;
    }
  }
  if (wk < 0 || bk < 0 || piece === null) return null;
  return { wk, bk, piece, sq, bp };
}

/** 局面值（白方角度）：將死 0、和棋 DRAW、其他查殘局庫；查不到也當和棋。 */
export function evaluate(tables, game) {
  if (game.isCheckmate()) return 0;
  if (game.isDraw()) return DRAW;
  if (game.turn() === 'w' && tables.qp && hasBlackQueen(game)) {
    // 黑兵剛升后：白方能立刻吃掉新后才算贏，否則當和棋（同 kqkpTablebase 的近似）
    let best = -1;
    for (const m of game.moves({ verbose: true })) {
      if (m.captured !== 'q') continue;
      const v = evaluate(tables, afterMove(game, m));
      if (v >= 0 && (best < 0 || v < best)) best = v;
    }
    return best >= 0 ? best + 1 : DRAW;
  }
  const p = readPieces(game.fen());
  if (!p) return DRAW;
  if (p.bp >= 0) {
    const tb = tables.qp;
    if (p.piece !== 'q' || !tb || (p.bp & 7) !== tb.file) return DRAW;
    return (game.turn() === 'w' ? tb.w : tb.b)[kqkpIndex(p.wk, p.sq, p.bk, p.bp)];
  }
  if (!tables[p.piece]) return DRAW;
  const tb = tables[p.piece];
  return (game.turn() === 'w' ? tb.w : tb.b)[idx(p.wk, p.sq, p.bk)];
}

/** 局面比對只看棋盤和輪到誰 */
const positionKey = (fen) => fen.split(' ').slice(0, 2).join(' ');

/** 白王到黑兵的距離（王步數）；沒有黑兵就是 0。 */
function kingDistance(game) {
  let wk = null;
  let bp = null;
  game.board().forEach((row, r) =>
    row.forEach((p, f) => {
      if (p && p.type === 'k' && p.color === 'w') wk = [r, f];
      if (p && p.type === 'p' && p.color === 'b') bp = [r, f];
    }),
  );
  if (!wk || !bp) return 0;
  return Math.max(Math.abs(wk[0] - bp[0]), Math.abs(wk[1] - bp[1]));
}

const hasBlackQueen = (game) => game.board().some((row) => row.some((p) => p && p.type === 'q' && p.color === 'b'));

function afterMove(game, move) {
  const next = new Chess(game.fen());
  next.move(move);
  return next;
}

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * 幫目前輪到的一方挑一步：
 * - 白方：有勝法就走最快的；已經是和棋，就挑讓黑方最容易走錯的一步。
 * - 黑方：有守和的走法就守和；守不住就拖最久。
 * seen：（選用）這盤棋走過的 FEN，白方在和棋局面會盡量不走回重複的局面。
 */
export function pickMove(tables, fen, seen = []) {
  const game = new Chess(fen);
  // 兵一律升后（殘局庫不考慮升車、象、馬）
  const options = game
    .moves({ verbose: true })
    .filter((m) => !m.promotion || m.promotion === 'q')
    .map((m) => {
      const next = afterMove(game, m);
      return { move: { from: m.from, to: m.to, promotion: m.promotion }, next, value: evaluate(tables, next) };
    });

  if (game.turn() === 'w') {
    const wins = options.filter((o) => o.value >= 0);
    if (wins.length > 0) {
      const best = Math.min(...wins.map((o) => o.value));
      return randomOf(wins.filter((o) => o.value === best)).move;
    }
    // 和棋局面：挑讓黑方最難守的一步。依序比較：
    //   1. 不送子（黑方不能直接吃掉白子）
    //   2. 不讓黑兵安全升變
    //   3. 不走回已經出現過的局面（避免很快三次重複和棋）
    //   4. 白王離黑兵越近越好（真人的標準嘗試：用后拖時間，讓王走過來）
    //   5. 黑方守和的走法越少越好
    //   6. 黑方會走輸的走法越多越好
    const seenKeys = new Set(seen.map(positionKey));
    let bestScore = null;
    let candidates = [];
    for (const o of options) {
      if (o.next.isGameOver()) continue;
      let hangs = 0;
      let promotes = 0;
      let draws = 0;
      let traps = 0;
      for (const m of o.next.moves({ verbose: true })) {
        if (m.promotion && m.promotion !== 'q') continue;
        if (m.captured) hangs = 1;
        if (evaluate(tables, afterMove(o.next, m)) >= 0) traps++;
        else {
          draws++;
          if (m.promotion) promotes = 1;
        }
      }
      const repeated = seenKeys.has(positionKey(o.next.fen())) ? 1 : 0;
      const score = [hangs, promotes, repeated, kingDistance(o.next), draws, -traps];
      const cmp = bestScore ? score.findIndex((v, k) => v !== bestScore[k]) : 0;
      if (!bestScore || (cmp >= 0 && score[cmp] < bestScore[cmp])) {
        bestScore = score;
        candidates = [o];
      } else if (cmp < 0) {
        candidates.push(o);
      }
    }
    return randomOf(candidates.length ? candidates : options).move;
  }

  const draws = options.filter((o) => o.value === DRAW);
  if (draws.length > 0) return randomOf(draws).move;
  const longest = Math.max(...options.map((o) => o.value));
  return randomOf(options.filter((o) => o.value === longest)).move;
}
