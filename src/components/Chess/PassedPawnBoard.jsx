import React from 'react';
import EndgameBoard from './EndgameBoard';
import { loadTablebase } from './kqkLoader';

// 黑王剛走到 e4 攻擊 f4 兵，白先：只有 f5 能贏
const DEFAULT_FEN = '8/8/p5p1/8/1K2kPP1/P7/8/8 w - - 0 1';

/**
 * 創造通路兵對弈：玩家執白，要找到唯一的勝著 f5，黑方照殘局庫最頑強防守，照正常規則下完。
 * 兵還很多的局面查線上的 Lichess 七子殘局庫（需要連線）；
 * 只剩王兵對單王、王后（車）對單王時改用本機殘局庫。
 */
export default function PassedPawnBoard({ fen = DEFAULT_FEN }) {
  return <EndgameBoard fen={fen} player="w" loadTables={() => loadTablebase('p')} />;
}
