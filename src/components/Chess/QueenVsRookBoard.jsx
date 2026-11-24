import React from 'react';
import EndgameBoard from './EndgameBoard';
import { loadTablebase } from './kqkLoader';

// Philidor 局面：白王 c6、白后 a5，黑王 b8、黑車 b7，白先
const DEFAULT_FEN = '1k6/1r6/2K5/Q7/8/8/8/8 w - - 0 1';

/**
 * 后對車對弈：玩家執白，黑方照殘局庫最頑強防守，照正常規則下完。
 * 后對車查線上的 Lichess 七子殘局庫（需要連線）；吃掉黑車變成單后殺王時改用本機殘局庫。
 */
export default function QueenVsRookBoard({ fen = DEFAULT_FEN }) {
  return <EndgameBoard fen={fen} player="w" loadTables={() => loadTablebase('q')} />;
}
