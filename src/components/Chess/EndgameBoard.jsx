import React, { useEffect, useRef, useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Chess } from 'chess.js';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './ChessgroundBoard.css';
import { pickMove } from './endgameEngine';

const OPPONENT_DELAY = 700; // 對手「思考」時間，也是讓玩家排預走的時間
const RESULT_DELAY = 700; // 最後一步走完後停一下，再顯示結果

const FILES = 'abcdefgh';
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KING_DIRS = [...ROOK_DIRS, ...BISHOP_DIRS];
const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

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

const isWhitePiece = (p) => p === p.toUpperCase();

/** 把排好的預走套到盤面上，讓棋子先顯示在預走後的位置（chess.com 的做法）；兵走到底線先當成后。 */
function applyQueue(fen, queue) {
  const map = readBoard(fen);
  for (const { from, to } of queue) {
    let piece = map.get(from);
    if (!piece) continue;
    if (piece === 'P' && to[1] === '8') piece = 'Q';
    if (piece === 'p' && to[1] === '1') piece = 'q';
    map.delete(from);
    map.set(to, piece);
  }
  return map;
}

/** 預走可以走的格子：照各棋子的走法，只被自己的子擋住，不能走到對方的王身上。 */
function premoveDests(map, color) {
  const dests = new Map();
  const own = (p) => p && isWhitePiece(p) === (color === 'w');
  const enemyKing = color === 'w' ? 'k' : 'K';
  const at = (f, r) => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? FILES[f] + r : null);
  for (const [sq, p] of map) {
    if (!own(p)) continue;
    const f = FILES.indexOf(sq[0]);
    const r = Number(sq[1]);
    const type = p.toLowerCase();
    const list = [];
    const add = (t) => {
      if (t && !own(map.get(t)) && map.get(t) !== enemyKing) list.push(t);
    };
    if (type === 'p') {
      const dir = color === 'w' ? 1 : -1;
      add(at(f, r + dir));
      if (r === (color === 'w' ? 2 : 7)) add(at(f, r + 2 * dir));
      add(at(f - 1, r + dir));
      add(at(f + 1, r + dir));
    } else if (type === 'n') {
      for (const [df, dr] of KNIGHT_JUMPS) add(at(f + df, r + dr));
    } else {
      const dirs = type === 'r' ? ROOK_DIRS : type === 'b' ? BISHOP_DIRS : KING_DIRS;
      const slide = type !== 'k';
      for (const [df, dr] of dirs) {
        let t = at(f + df, r + dr);
        let step = 1;
        while (t && !own(map.get(t))) {
          add(t);
          if (!slide) break;
          step++;
          t = at(f + df * step, r + dr * step);
        }
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

const PREMOVE_COST = 100; // 預走一步算 0.1 秒（毫秒），同 chess.com

/** 毫秒 → 「12.3」或「1:02.3」，捨去到 0.1 秒（chess.com 時鐘的最小單位） */
function formatClock(ms) {
  const ds = Math.floor(ms / 100);
  const min = Math.floor(ds / 600);
  const sec = Math.floor((ds % 600) / 10);
  const frac = ds % 10;
  return min > 0 ? `${min}:${String(sec).padStart(2, '0')}.${frac}` : `${sec}.${frac}`;
}

/* ---------- 元件 ---------- */

/**
 * 只有一個棋盤的殘局對弈：玩家執 player 那一方直接走，對手由殘局庫應著。
 * - 對手思考時可以連續排好幾步預走，預走的格子會標紅色，按右鍵取消全部預走。
 * - 兵升變一律升后。
 * - 對局結束後在棋盤上顯示結果，點一下重新開始。
 *
 * loadTables：回傳 Promise<{ q?, r?, p? }>，交給 endgameEngine 挑對手的棋步。
 */
function EndgameBoardLogic({ fen, player = 'w', loadTables }) {
  const containerRef = useRef(null);
  const clockRef = useRef(null);
  const restartRef = useRef(() => {});
  const startRef = useRef(() => {});
  const [result, setResult] = useState(null);
  const [started, setStarted] = useState(false);
  const playerColor = player === 'b' ? 'black' : 'white';

  useEffect(() => {
    let api = null;
    let tables = null;
    let game = new Chess(fen);
    let lastMove;
    let queue = [];
    let over = false;
    let started = false; // 按下「開始」之前不能走、不計時
    let timer = null;
    let alive = true;
    const el = containerRef.current;
    setStarted(false);

    /* ---- 玩家用時：只算輪到玩家的時間，預走每步固定 0.1 秒 ---- */
    let spent = 0; // 已用掉的毫秒
    let turnStart = null; // 這一步開始思考的時間；null 代表時鐘沒在走
    let clockTimer = 0;
    const drawClock = () => {
      if (!clockRef.current) return;
      const live = turnStart === null ? 0 : performance.now() - turnStart;
      clockRef.current.textContent = formatClock(spent + live);
    };
    const startClock = () => {
      if (turnStart !== null) return;
      turnStart = performance.now();
      clockTimer = setInterval(drawClock, 50);
    };
    /** 停錶；premove 為真時這一步只記 0.1 秒 */
    const stopClock = (premove = false) => {
      if (turnStart !== null) spent += premove ? PREMOVE_COST : performance.now() - turnStart;
      else if (premove) spent += PREMOVE_COST;
      turnStart = null;
      clearInterval(clockTimer);
      drawClock();
    };
    const resetClock = () => {
      stopClock();
      spent = 0;
      drawClock();
    };

    const opponentThinking = () => !over && game.turn() !== player;

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
      if (tables && started && !over) dests = opponentThinking() ? premoveDests(board, player) : legalDests(game);
      api.set({
        fen: writeBoard(board),
        // 對手思考時也讓玩家「可以走」，走出來的就是預走
        turnColor: over ? toMove : playerColor,
        lastMove,
        check: game.inCheck() ? toMove : false,
        highlight: { lastMove: true, check: true, custom },
        movable: { free: false, color: playerColor, dests },
      });
    };

    const finish = () => {
      over = true;
      queue = [];
      sync();
      const text = resultText(game);
      timer = setTimeout(() => alive && setResult(text), RESULT_DELAY);
    };

    const opponentMove = () => {
      const m = pickMove(tables, game.fen());
      game.move(m);
      lastMove = [m.from, m.to];
      if (game.isGameOver()) {
        finish();
        return;
      }
      // 輪到玩家：執行第一個預走；不合法就取消全部預走
      if (queue.length > 0) {
        const next = queue.shift();
        const legal = game.moves({ verbose: true }).some((x) => x.from === next.from && x.to === next.to);
        if (legal) {
          playerMove(next.from, next.to, true);
          return;
        }
        queue = [];
      }
      sync();
      startClock();
    };

    function playerMove(from, to, premove = false) {
      stopClock(premove);
      game.move({ from, to, promotion: 'q' });
      lastMove = [from, to];
      if (game.isGameOver()) {
        finish();
        return;
      }
      sync();
      timer = setTimeout(opponentMove, OPPONENT_DELAY);
    }

    const onBoardMove = (from, to) => {
      if (over || !started) return;
      if (opponentThinking()) {
        queue.push({ from, to });
        sync();
      } else {
        playerMove(from, to);
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

    /** 開局如果輪到對手（例如玩家執黑、白先），等殘局庫好了就讓對手先走。 */
    const startIfOpponentFirst = () => {
      if (!tables || !started || over) return;
      if (opponentThinking()) timer = setTimeout(opponentMove, OPPONENT_DELAY);
      else startClock();
    };

    /** 按「開始」：殘局庫還沒好的話，等它載入完會自動開始 */
    startRef.current = () => {
      if (started) return;
      started = true;
      setStarted(true);
      sync();
      startIfOpponentFirst();
    };

    restartRef.current = () => {
      clearTimeout(timer);
      resetClock();
      game = new Chess(fen);
      lastMove = undefined;
      queue = [];
      over = false;
      setResult(null);
      sync();
      startIfOpponentFirst();
    };

    (async () => {
      const { Chessground } = await import('chessground');
      if (!alive) return;
      api = Chessground(el, {
        fen: game.fen(),
        orientation: playerColor,
        coordinates: true,
        animation: { enabled: true, duration: 180 },
        premovable: { enabled: false },
        drawable: { enabled: false },
        movable: { free: false, color: playerColor, dests: new Map(), events: { after: onBoardMove } },
      });
      tables = await loadTables();
      if (!alive) return;
      sync();
      startIfOpponentFirst();
    })().catch((err) => console.error('EndgameBoard init failed:', err));

    const onResize = () => api && api.redrawAll();
    window.addEventListener('resize', onResize);
    drawClock();
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(clockTimer);
      el.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      if (api) api.destroy();
    };
    // loadTables 由包裝元件提供，換局面或換邊時才重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, player]);

  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '1.5rem auto' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
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
        {!started && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
            }}
          >
            <button
              type="button"
              onClick={() => startRef.current()}
              style={{
                padding: '0.45rem 1.6rem',
                border: 'none',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.92)',
                color: '#222',
                fontSize: '1rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              開始
            </button>
          </div>
        )}
      </div>
      <div
        ref={clockRef}
        title="玩家用時（預走每步算 0.1 秒）"
        style={{
          marginTop: 4,
          textAlign: 'right',
          fontSize: '0.8rem',
          fontVariantNumeric: 'tabular-nums',
          opacity: 0.7,
        }}
      >
        0.00
      </div>
    </div>
  );
}

export default function EndgameBoard(props) {
  return (
    <BrowserOnly fallback={<div style={{ maxWidth: 400, aspectRatio: '1 / 1', margin: '1.5rem auto' }} />}>
      {() => <EndgameBoardLogic {...props} />}
    </BrowserOnly>
  );
}
