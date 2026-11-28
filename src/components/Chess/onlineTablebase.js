import { Chess } from 'chess.js';
import { pickMove, canEvaluateLocally } from './endgameEngine';
import { pickResistantMove } from './resistSearch';

/**
 * 本機殘局庫算不到的局面（例如后對后、王對王兵、三兵對兩兵），改查 Lichess 七子殘局庫。
 * 需要連線；查不到時 Promise 會失敗，EndgameBoard 會顯示「連線失敗」。
 */

const TABLEBASE_URL = 'https://tablebase.lichess.ovh/standard';

/** 同一個局面只查一次 */
const probeCache = new Map();

/** 查 Lichess 七子殘局庫；moves 依輪走方最好的順序排列 */
export function probe(fen) {
  const key = fen.split(' ').slice(0, 4).join(' ');
  if (!probeCache.has(key)) {
    const request = fetch(`${TABLEBASE_URL}?fen=${encodeURIComponent(fen)}`).then((res) => {
      if (!res.ok) throw new Error(`tablebase HTTP ${res.status}`);
      return res.json();
    });
    request.catch(() => probeCache.delete(key)); // 失敗的不留，下次再查
    probeCache.set(key, request);
  }
  return probeCache.get(key);
}

/** 走完對方是輸（也就是自己贏）的殘局庫結果 */
const WINNING = new Set(['loss', 'maybe-loss']);

/**
 * 照線上殘局庫走最好的一步：
 * - 贏的一方：照殘局庫的順序（DTZ 最短），保證一直往前推進。
 * - 和棋或輸的一方：在殘局庫判定結果最好的那幾步裡，用本機搜尋挑最頑強的一步。
 *   殘局庫的順序只是拖延下一次吃子或動兵，例如會為了不吃子而讓對方很快升后。
 *   盤面上沒有兵的話不會有這個問題，直接照殘局庫的順序走。
 */
export async function pickOnlineMove(fen) {
  const { moves } = await probe(fen);
  if (!moves || moves.length === 0) throw new Error(`tablebase: no moves for ${fen}`);
  const best = moves[0].category;
  // 沒有兵的局面（例如后對車）殘局庫的順序就是最頑強的走法；本機搜尋會卡住畫面約 0.3 秒，不用跑
  const noPawns = !/p/i.test(fen.split(' ')[0]);
  const uci = WINNING.has(best) || noPawns
    ? moves[0].uci
    : pickResistantMove(
        fen,
        moves.filter((m) => m.category === best).map((m) => m.uci),
      );
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

/**
 * 本機殘局庫算不到的情況：
 * - 目前的局面本身不在本機殘局庫裡。
 * - 有一步能吃掉白方的后／車（例如后對單兵時黑王吃后，變成王對王兵）：本機會把吃完的局面當成和棋，
 *   不知道其實是黑方贏，所以這一步整個交給線上殘局庫判斷。
 * 兵升后的局面不算，endgameEngine 的 evaluate 已經有處理（后對單兵殘局庫的近似）。
 */
function needsOnline(tables, fen) {
  if (!canEvaluateLocally(tables, fen)) return true;
  const game = new Chess(fen);
  return game.moves({ verbose: true }).some((m) => {
    if (!m.captured || m.captured === 'p') return false;
    const next = new Chess(fen);
    next.move(m);
    return !next.isGameOver() && !canEvaluateLocally(tables, next.fen());
  });
}

/** 本機殘局庫算得到就用本機（不用連線），否則查線上殘局庫。 */
export function pickAnyMove(tables, fen, seen = []) {
  return needsOnline(tables, fen) ? pickOnlineMove(fen) : pickMove(tables, fen, seen);
}
