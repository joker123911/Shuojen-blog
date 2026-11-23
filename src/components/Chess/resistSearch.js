import { Chess } from 'chess.js';

/**
 * 從殘局庫判定結果一樣的幾步裡，挑「最頑強」的一步。
 *
 * 七子殘局庫只有 DTZ（離下一次吃子或動兵還有幾步），沒有離殺棋幾步。照 DTZ 走的話，
 * 輸的一方會為了拖延「吃子」而不肯吃回兵（例如通路兵那篇黑方不走 gxf5），反而讓對方很快升后。
 * 所以改用小的本機搜尋：看幾個半步，比子力、通路兵，挑對自己最好的一步。
 */

const PIECE_VALUE = { p: 100, n: 300, b: 320, r: 500, q: 900, k: 0 };
// 通路兵依前進的橫線加分（自己的第 2～7 橫線）
const PASSED_BONUS = [0, 0, 10, 20, 40, 70, 120, 0];
const MATE = 100000;
const MAX_DEPTH = 4;
// 時間上限（毫秒）：盤面上有后時可走的步數很多，算太深會卡住畫面；超過就用上一層算完的結果。
// 對手本來就有 0.7 秒的「思考」時間，這段時間跟它重疊，玩家感覺不到。
const TIME_BUDGET = 300;

class OutOfBudget extends Error {}

function readPosition(game) {
  const pawns = { w: [], b: [] };
  const kings = {};
  let material = 0; // 白方角度
  game.board().forEach((row, r) =>
    row.forEach((p, f) => {
      if (!p) return;
      const sq = { file: f, rank: 7 - r }; // rank 0 = 第 1 橫線
      if (p.type === 'k') kings[p.color] = sq;
      if (p.type === 'p') pawns[p.color].push(sq);
      material += (p.color === 'w' ? 1 : -1) * PIECE_VALUE[p.type];
    }),
  );
  return { pawns, kings, material };
}

/** 前面和左右兩條直線都沒有敵兵擋 */
function isPassed(pawn, color, enemyPawns) {
  return !enemyPawns.some(
    (e) => Math.abs(e.file - pawn.file) <= 1 && (color === 'w' ? e.rank > pawn.rank : e.rank < pawn.rank),
  );
}

/** 局面分數（白方角度）：子力＋通路兵；對方王追不到的通路兵（兵的方格規則）再大幅加分 */
function evaluateWhite(game) {
  const { pawns, kings, material } = readPosition(game);
  let score = material;
  for (const color of ['w', 'b']) {
    const sign = color === 'w' ? 1 : -1;
    const enemy = color === 'w' ? 'b' : 'w';
    for (const pawn of pawns[color]) {
      if (!isPassed(pawn, color, pawns[enemy])) continue;
      const advance = color === 'w' ? pawn.rank : 7 - pawn.rank; // 1～6
      score += sign * PASSED_BONUS[advance];
      const king = kings[enemy];
      if (!king) continue;
      const promoRank = color === 'w' ? 7 : 0;
      const stepsToPromote = Math.min(Math.abs(promoRank - pawn.rank), 5); // 第 2 橫線可以一次走兩格
      const kingSteps = Math.max(Math.abs(king.file - pawn.file), Math.abs(king.rank - promoRank));
      const tempo = game.turn() === enemy ? 1 : 0;
      if (kingSteps - tempo > stepsToPromote) score += sign * 400;
    }
  }
  return score;
}

/**
 * 輪走方角度的 negamax（alpha-beta）；超過時間上限就丟 OutOfBudget。
 * chess.js 產生棋步很慢，每個節點只產生一次：沒有棋可走就是將死或逼和；
 * 搜尋裡不檢查三次重複（太花時間），只看子力不足。
 */
function search(game, depth, alpha, beta, ply, deadline) {
  if (Date.now() > deadline) throw new OutOfBudget();
  const all = game.moves({ verbose: true });
  if (all.length === 0) return game.inCheck() ? -MATE + ply : 0;
  if (game.isInsufficientMaterial()) return 0;
  if (depth === 0) {
    const s = evaluateWhite(game);
    return game.turn() === 'w' ? s : -s;
  }
  // 先算吃子、升變，剪枝比較有效
  const moves = all.sort((a, b) => (b.captured || b.promotion ? 1 : 0) - (a.captured || a.promotion ? 1 : 0));
  let best = -Infinity;
  for (const m of moves) {
    if (m.promotion && m.promotion !== 'q') continue;
    game.move(m);
    const v = -search(game, depth - 1, -beta, -alpha, ply + 1, deadline);
    game.undo();
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** 搜尋一層深度，回傳分數最高的 uci；同分時照殘局庫原本的順序 */
function bestAtDepth(game, candidates, depth, deadline) {
  let bestUci = candidates[0];
  let bestScore = -Infinity;
  for (const uci of candidates) {
    game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    try {
      const v = -search(game, depth - 1, -Infinity, Infinity, 1, deadline);
      if (v > bestScore) {
        bestScore = v;
        bestUci = uci;
      }
    } finally {
      game.undo();
    }
  }
  return bestUci;
}

/**
 * candidates：uci 字串陣列（殘局庫判定結果一樣的那幾步，依殘局庫的順序）。
 * 從淺到深逐層搜尋，時間到了就回傳上一層算完的結果。
 */
export function pickResistantMove(fen, candidates) {
  if (candidates.length <= 1) return candidates[0];
  const game = new Chess(fen);
  const deadline = Date.now() + TIME_BUDGET;
  let best = candidates[0];
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    try {
      best = bestAtDepth(game, candidates, depth, deadline);
    } catch (err) {
      if (err instanceof OutOfBudget) break;
      throw err;
    }
  }
  return best;
}
