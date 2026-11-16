import React from 'react';
import EndgameBoard from './EndgameBoard';
import { loadTablebase } from './kqkLoader';

const DEFAULT_FEN = {
  q: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
  r: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
};

/**
 * 單后（piece = 'q'）／單車（piece = 'r'）殺王對弈：玩家執白直接走，黑方由殘局庫最頑強防守。
 */
export default function QueenMateBoard({ piece = 'q', fen = DEFAULT_FEN[piece] }) {
  return (
    <EndgameBoard
      fen={fen}
      player="w"
      loadTables={() => loadTablebase(piece).then((tb) => ({ [piece]: tb }))}
    />
  );
}
