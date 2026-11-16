import React, { useEffect, useRef, useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Chess } from 'chess.js';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './ChessgroundBoard.css';
import { blackMoves, idx, kqkFromFen, sqName } from './kqkTablebase';
import { loadTablebase } from './kqkLoader';

const DEFAULT_FEN = '8/8/8/4k3/8/8/8/3QK3 w - - 0 1';
const BLACK_DELAY = 700; // 黑方「思考」時間，也是讓玩家排預走的時間
const RESULT_DELAY = 700; // 最後一步走完後停一下，再顯示結果

const FILES = 'abcdefgh';
const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/* ---------- 黑方應著 ---------- */

/** 黑方挑能拖最久的走法；能吃后就吃。 */
function pickBlackMove(tb, fen) {
  const p = kqkFromFen(fen);
  const moves = blackMoves(p.wk, p.wq, p.bk);
  let chosen = moves.find((m) => m.capture);
  if (!chosen) {
    let best = -Infinity;
    let candidates = [];
    for (const m of moves) {
      const v = tb.w[idx(p.wk, p.wq, m.to)];
      if (v > best) {
        best = v;
        candidates = [m];
      } else if (v === best) {
        candidates.push(m);
      }
    }
    chosen = candidates[Math.floor(Math.random() * candidates.length)];
  }
  return { from: sqName(p.bk), to: sqName(chosen.to) };
}

/* ---------- 預走（premove）用的「虛擬盤面」 ---------- */

/** FEN 的棋盤部分 → Map(格子 → 棋子字元) */
function readBoard(fen) {
  const map = new Map();
  fen
    .split(' ')[0]
    .split('/')
    .forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) f += Number(ch);
        else map.set(FILES[f++] + (8 - r), ch);
      }
    });
  return map;
}

function writeBoard(map) {
  const rows = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (const file of FILES) {
      const piece = map.get(file + rank);
      if (piece) {
        row += (empty || '') + piece;
        empty = 0;
      } else {
        empty++;
      }
    }
    rows.push(row + (empty || ''));
  }
  return rows.join('/');
}

/** 把排好的預走套到盤面上，讓棋子先顯示在預走後的位置（chess.com 的做法）。 */
function applyQueue(fen, queue) {
  const map = readBoard(fen);
  for (const { from, to } of queue) {
    const piece = map.get(from);
    if (!piece) continue;
    map.delete(from);
    map.set(to, piece);
  }
  return map;
}

/** 預走可以走的格子：王走一格、后沿直線斜線走（只被自己的王擋住），不能走到黑王身上。 */
function premoveDests(map) {
  const dests = new Map();
  let blackKing = null;
  for (const [sq, p] of map) {
    if (p === 'k') blackKing = sq;
  }
  for (const [sq, p] of map) {
    if (p !== 'K' && p !== 'Q') continue;
    const f = FILES.indexOf(sq[0]);
    const r = Number(sq[1]);
    const list = [];
    for (const [df, dr] of DIRS) {
      let nf = f + df;
      let nr = r + dr;
      while (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) {
        const t = FILES[nf] + nr;
        const occupant = map.get(t);
        if (occupant === 'K' || occupant === 'Q') break;
        if (t !== blackKing) list.push(t);
        if (p === 'K') break;
        nf += df;
        nr += dr;
      }
    }
    dests.set(sq, list);
  }
  return dests;
}

function legalDests(game) {
  const dests = new Map();
  for (const m of game.moves({ verbose: true })) {
    if (!dests.has(m.from)) dests.set(m.from, []);
    dests.get(m.from).push(m.to);
  }
  return dests;
}

function resultText(game) {
  return game.isCheckmate() ? '殺棋' : '和棋';
}

/* ---------- 元件 ---------- */

/**
 * 只有一個棋盤的單后殺王對弈：玩家執白直接走，黑方由殘局庫最頑強防守。
 * - 黑方思考時可以連續排好幾步預走，預走的格子會標紅色，按右鍵取消全部預走。
 * - 對局結束後在棋盤上顯示結果，點一下重新開始。
 */
function QueenMateBoardLogic({ fen = DEFAULT_FEN }) {
  const containerRef = useRef(null);
  const restartRef = useRef(() => {});
  const [result, setResult] = useState(null);

  useEffect(() => {
    let api = null;
    let tb = null;
    let game = new Chess(fen);
    let lastMove;
    let queue = [];
    let over = false;
    let timer = null;
    let alive = true;
    const el = containerRef.current;

    const blackThinking = () => !over && game.turn() === 'b';

    const sync = () => {
      if (!api) return;
      const board = applyQueue(game.fen(), queue);
      const custom = new Map();
      for (const { from, to } of queue) {
        custom.set(from, 'premove-queued');
        custom.set(to, 'premove-queued');
      }
      const toMove = game.turn() === 'w' ? 'white' : 'black';
      if (game.isCheckmate()) {
        const king = game
          .board()
          .flat()
          .find((p) => p && p.type === 'k' && p.color === game.turn());
        if (king) custom.set(king.square, 'mate');
      }
      let dests = new Map();
      if (tb && !over) dests = blackThinking() ? premoveDests(board) : legalDests(game);
      api.set({
        fen: writeBoard(board),
        // 黑方思考時也讓白方「可以走」，走出來的就是預走
        turnColor: over ? toMove : 'white',
        lastMove,
        check: game.inCheck() ? toMove : false,
        highlight: { lastMove: true, check: true, custom },
        movable: { free: false, color: 'white', dests },
      });
    };

    const finish = () => {
      over = true;
      queue = [];
      sync();
      const text = resultText(game);
      timer = setTimeout(() => alive && setResult(text), RESULT_DELAY);
    };

    const blackMove = () => {
      const m = pickBlackMove(tb, game.fen());
      game.move(m);
      lastMove = [m.from, m.to];
      if (game.isGameOver()) {
        finish();
        return;
      }
      // 輪到白方：執行第一個預走；不合法就取消全部預走
      if (queue.length > 0) {
        const next = queue.shift();
        const legal = game.moves({ verbose: true }).some((x) => x.from === next.from && x.to === next.to);
        if (legal) {
          whiteMove(next.from, next.to);
          return;
        }
        queue = [];
      }
      sync();
    };

    function whiteMove(from, to) {
      game.move({ from, to, promotion: 'q' });
      lastMove = [from, to];
      if (game.isGameOver()) {
        finish();
        return;
      }
      sync();
      timer = setTimeout(blackMove, BLACK_DELAY);
    }

    const onBoardMove = (from, to) => {
      if (over) return;
      if (blackThinking()) {
        queue.push({ from, to });
        sync();
      } else {
        whiteMove(from, to);
      }
    };

    const onContextMenu = (e) => {
      e.preventDefault();
      if (queue.length > 0) {
        queue = [];
        sync();
      }
    };
    el.addEventListener('contextmenu', onContextMenu);

    restartRef.current = () => {
      clearTimeout(timer);
      game = new Chess(fen);
      lastMove = undefined;
      queue = [];
      over = false;
      setResult(null);
      sync();
    };

    (async () => {
      const { Chessground } = await import('chessground');
      if (!alive) return;
      api = Chessground(el, {
        fen: game.fen(),
        orientation: 'white',
        coordinates: true,
        animation: { enabled: true, duration: 180 },
        premovable: { enabled: false },
        drawable: { enabled: false },
        movable: { free: false, color: 'white', dests: new Map(), events: { after: onBoardMove } },
      });
      tb = await loadTablebase();
      if (alive) sync();
    })().catch((err) => console.error('QueenMateBoard init failed:', err));

    const onResize = () => api && api.redrawAll();
    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      clearTimeout(timer);
      el.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      if (api) api.destroy();
    };
  }, [fen]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 400,
        aspectRatio: '1 / 1',
        margin: '1.5rem auto',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {result && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => restartRef.current()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && restartRef.current()}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.55)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '2.5rem',
            fontWeight: 700,
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}

export default function QueenMateBoard(props) {
  return (
    <BrowserOnly fallback={<div style={{ maxWidth: 400, aspectRatio: '1 / 1', margin: '1.5rem auto' }} />}>
      {() => <QueenMateBoardLogic {...props} />}
    </BrowserOnly>
  );
}
