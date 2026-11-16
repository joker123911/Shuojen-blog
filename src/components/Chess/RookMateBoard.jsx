import React from 'react';
import QueenMateBoard from './QueenMateBoard';

/** 單車殺王對弈：玩家執白（王＋車），黑方由殘局庫最頑強防守。 */
export default function RookMateBoard(props) {
  return <QueenMateBoard piece="r" {...props} />;
}
