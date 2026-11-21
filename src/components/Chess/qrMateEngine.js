import { Chess } from 'chess.js';
import { pickMove } from './endgameEngine';

/**
 * 王＋后＋車（KQRK）、王＋雙車（KRRK）對單王的黑方應著。這兩個殘局太簡單、殘局庫又太大（64⁴），
 * 所以黑方不用殘局庫，改用簡單的規則挑「最頑強」的一步：
 *   1. 能吃掉沒有保護的后或車就吃（之後變成單后／單車殺王，交給殘局庫）
 *   2. 不走進一步殺
 *   3. 離邊線越遠越好
 *   4. 下一步能走的格子越多越好
 *   5. 離白方的后、車越近越好（逼玩家處理被攻擊的子，不能無腦預走）
 * 不是 KQRK／KRRK 局面（例如黑王吃掉一子之後）就交回 endgameEngine 的 pickMove。
 */

const isLadder = (game) => {
  const pieces = game.board().flat().filter(Boolean);
  if (pieces.length !== 4) return false;
  const kinds = pieces.map((p) => p.color + p.type).sort().join(',');
  return kinds === 'bk,wk,wq,wr' || kinds === 'bk,wk,wr,wr';
};

const coords = (sq) => [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
const edgeDistance = (sq) => {
  const [f, r] = coords(sq);
  return Math.min(f, 7 - f, r, 7 - r);
};
const kingDistance = (a, b) => {
  const [af, ar] = coords(a);
  const [bf, br] = coords(b);
  return Math.max(Math.abs(af - bf), Math.abs(ar - br));
};

function afterMove(fen, move) {
  const next = new Chess(fen);
  next.move(move);
  return next;
}

/** 白方（輪到白方）有沒有一步殺 */
function whiteMatesInOne(game) {
  const fen = game.fen();
  return game.moves({ verbose: true }).some((m) => afterMove(fen, m).isCheckmate());
}

/** 黑王在這個局面（假裝輪到黑方）能走的格子數 */
function kingMobility(game) {
  const parts = game.fen().split(' ');
  parts[1] = 'b';
  parts[3] = '-';
  try {
    return new Chess(parts.join(' ')).moves().length;
  } catch {
    return 0;
  }
}

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

export function pickQueenRookMove(tables, fen, seen = []) {
  const game = new Chess(fen);
  if (game.turn() !== 'b' || !isLadder(game)) return pickMove(tables, fen, seen);

  const white = game
    .board()
    .flat()
    .filter((p) => p && p.color === 'w' && p.type !== 'k')
    .map((p) => p.square);

  let bestScore = null;
  let candidates = [];
  for (const m of game.moves({ verbose: true })) {
    const next = afterMove(fen, m);
    const nearest = Math.min(...white.filter((sq) => sq !== m.to).map((sq) => kingDistance(m.to, sq)));
    const score = [
      m.captured ? 1 : 0,
      whiteMatesInOne(next) ? 0 : 1,
      edgeDistance(m.to),
      kingMobility(next),
      -nearest,
    ];
    const cmp = bestScore ? score.findIndex((v, k) => v !== bestScore[k]) : 0;
    if (!bestScore || (cmp >= 0 && score[cmp] > bestScore[cmp])) {
      bestScore = score;
      candidates = [m];
    } else if (cmp < 0) {
      candidates.push(m);
    }
  }
  const m = randomOf(candidates);
  return { from: m.from, to: m.to };
}
