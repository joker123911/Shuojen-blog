import React from 'react';
import EndgameBoard from './EndgameBoard';
import { loadTablebase } from './kqkLoader';

// 黑兵 b2、黑車在升變格 b1、白車在兵後面 b8，白王 h3，白先：Kg2（或 Kh2）才能贏
const DEFAULT_FEN = '1R6/6k1/8/8/5P2/6PK/1p6/1r6 w - - 0 1';

/**
 * 王要躲在哪裡對弈：玩家執白，黑方照殘局庫防守，照正常規則下完。
 * 車兵殘局查線上的 Lichess 七子殘局庫（需要連線）；
 * 簡化成王后（車、兵）對單王時改用本機殘局庫。
 */
export default function RookShelterBoard({ fen = DEFAULT_FEN }) {
  return <EndgameBoard fen={fen} player="w" loadTables={() => loadTablebase('p')} />;
}
