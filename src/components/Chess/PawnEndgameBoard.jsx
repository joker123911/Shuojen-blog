import React from 'react';
import EndgameBoard from './EndgameBoard';
import { loadTablebase } from './kqkLoader';

// 白王 e3、白兵 c2、黑王 b5：白先勝、黑先和
const DEFAULT_FEN = {
  attack: '8/8/8/1k6/8/4K3/2P5/8 w - - 0 1',
  defend: '8/8/8/1k6/8/4K3/2P5/8 b - - 0 1',
};

/**
 * 王兵對單王對弈。
 * - mode = 'attack'：玩家執白，要把兵送到底線並殺王，黑方由殘局庫最頑強防守。
 * - mode = 'defend'：玩家執黑，要守和，白方由殘局庫找勝法，和棋局面會挑最容易讓你走錯的一步。
 */
export default function PawnEndgameBoard({ mode = 'attack', fen = DEFAULT_FEN[mode] }) {
  return <EndgameBoard fen={fen} player={mode === 'defend' ? 'b' : 'w'} loadTables={() => loadTablebase('p')} />;
}
