import React from 'react';
import EndgameBoard from './EndgameBoard';
import { loadTablebase } from './kqkLoader';
import { pickQueenRookMove } from './qrMateEngine';

const DEFAULT_FEN = {
  qr: '8/8/8/4k3/8/8/8/3QK2R w - - 0 1',
  rr: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1',
};

/** 黑王吃掉一子之後，用單車／單后殘局庫繼續防守 */
const loadTables = () => Promise.all([loadTablebase('q'), loadTablebase('r')]).then(([q, r]) => ({ q, r }));

/**
 * 階梯殺法對弈：玩家執白，黑方用 qrMateEngine 的規則防守。
 * pieces = 'qr'：王＋后＋車；'rr'：王＋雙車。
 */
export default function QueenRookMateBoard({ pieces = 'qr', fen = DEFAULT_FEN[pieces] }) {
  return <EndgameBoard fen={fen} player="w" loadTables={loadTables} engine={pickQueenRookMove} />;
}
