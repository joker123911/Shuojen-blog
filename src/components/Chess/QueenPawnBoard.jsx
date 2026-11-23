import React from 'react';
import EndgameBoard from './EndgameBoard';
import { loadTablebase } from './kqkLoader';

// 白王 f6、白后 e5，黑兵在第 2 橫線、黑王在兵的右邊，白先：
// b 兵白勝，c 兵是和棋（黑王可以躲進角落，白后吃兵就逼和）
const DEFAULT_FEN = {
  attack: '8/8/5K2/4Q3/8/8/1pk5/8 w - - 0 1',
  defend: '8/8/5K2/4Q3/8/8/2pk4/8 w - - 0 1',
};

/** 黑兵所在的直線（0 = a 線） */
function pawnFile(fen) {
  const rows = fen.split(' ')[0].split('/');
  for (const row of rows) {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else if (ch === 'p') return f;
      else f++;
    }
  }
  return 1;
}

/**
 * 后對單兵對弈。
 * - mode = 'attack'：玩家執白，要阻止黑兵升變並殺王，黑方由殘局庫最頑強防守。
 * - mode = 'defend'：玩家執黑，要守和，白方由殘局庫挑最容易讓你走錯的一步。
 * 照正常規則下完：黑兵升后變成后對后、白后被吃變成王對王兵，都改查線上殘局庫繼續下。
 */
export default function QueenPawnBoard({ mode = 'attack', fen = DEFAULT_FEN[mode] }) {
  const kind = `qp${pawnFile(fen)}`;
  return <EndgameBoard fen={fen} player={mode === 'defend' ? 'b' : 'w'} loadTables={() => loadTablebase(kind)} />;
}
