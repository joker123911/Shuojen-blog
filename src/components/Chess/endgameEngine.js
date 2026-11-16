import { Chess } from 'chess.js';
import { DRAW, idx } from './kqkTablebase';

/**
 * 用殘局庫幫任一方挑棋步。tables 可以有：
 *   q：王后對單王、r：王車對單王、p：王兵對單王（各為 { w, b }）。
 * 局面值都以白方的角度：>= 0 是白方幾個半步後將死，DRAW 是和棋。
 */

/** 讀出白王、白子（Q／R／P）、黑王的位置與種類；不是這三種殘局就回傳 null。 */
function readPieces(fen) {
  const rows = fen.split(' ')[0].split('/');
  let wk = -1;
  let bk = -1;
  let piece = null;
  let sq = -1;
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
      } else return null;
      f++;
    }
  }
  if (wk < 0 || bk < 0 || piece === null) return null;
  return { wk, bk, piece, sq };
}

/** 局面值（白方角度）：將死 0、和棋 DRAW、其他查殘局庫；查不到也當和棋。 */
export function evaluate(tables, game) {
  if (game.isCheckmate()) return 0;
  if (game.isDraw()) return DRAW;
  const p = readPieces(game.fen());
  if (!p || !tables[p.piece]) return DRAW;
  const tb = tables[p.piece];
  return (game.turn() === 'w' ? tb.w : tb.b)[idx(p.wk, p.sq, p.bk)];
}

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
 */
export function pickMove(tables, fen) {
  const game = new Chess(fen);
  const options = game.moves({ verbose: true }).map((m) => {
    const next = afterMove(game, m);
    return { move: { from: m.from, to: m.to, promotion: m.promotion }, next, value: evaluate(tables, next) };
  });

  if (game.turn() === 'w') {
    const wins = options.filter((o) => o.value >= 0);
    if (wins.length > 0) {
      const best = Math.min(...wins.map((o) => o.value));
      return randomOf(wins.filter((o) => o.value === best)).move;
    }
    // 和棋局面：算每一步之後，黑方有幾種走法會走輸
    let bestTraps = -1;
    let candidates = [];
    for (const o of options) {
      if (o.next.isGameOver()) continue;
      const traps = o.next
        .moves({ verbose: true })
        .filter((m) => evaluate(tables, afterMove(o.next, m)) >= 0).length;
      if (traps > bestTraps) {
        bestTraps = traps;
        candidates = [o];
      } else if (traps === bestTraps) {
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
