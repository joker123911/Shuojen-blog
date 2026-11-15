import React, { useEffect, useRef } from 'react';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './ChessgroundBoard.css';
import { Chess } from 'chess.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * 依 FEN 判斷輪到的一方是否被將軍／將死，回傳 chessground 需要的 check 與 highlight 設定。
 * 將軍：沿用 chessground 內建的紅色光暈；將死：王所在格加上 `mate` class（紅色底）。
 */
function checkState(fen) {
  try {
    const game = new Chess(fen);
    if (!game.inCheck()) return { check: false, custom: new Map() };
    const turn = game.turn();
    const kingSquare = game
      .board()
      .flat()
      .find((p) => p && p.type === 'k' && p.color === turn)?.square;
    const custom = new Map();
    if (game.isCheckmate() && kingSquare) custom.set(kingSquare, 'mate');
    return { check: turn === 'w' ? 'white' : 'black', custom };
  } catch {
    return { check: false, custom: new Map() };
  }
}

function toConfig({ fen, orientation, lastMove }) {
  const currentFen = fen || START_FEN;
  const { check, custom } = checkState(currentFen);
  return {
    fen: currentFen,
    orientation: orientation === 'b' || orientation === 'black' ? 'black' : 'white',
    lastMove: lastMove && lastMove.length === 2 ? lastMove : undefined,
    check,
    highlight: { lastMove: true, check: true, custom },
  };
}

export default function ChessgroundBoard({
  fen,
  orientation = 'white',
  lastMove,
  shapes = [],
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  // 非同步載入 chessground 期間 props 可能已更新，初始化時讀取最新值
  const latestProps = useRef({ fen, orientation, lastMove, shapes });
  latestProps.current = { fen, orientation, lastMove, shapes };

  // Initialize Chessground
  useEffect(() => {
    let isMounted = true;

    async function initChessground() {
      if (!containerRef.current) return;

      try {
        const { Chessground } = await import('chessground');
        if (!isMounted || !containerRef.current) return;

        // Clear container before mount
        containerRef.current.innerHTML = '';

        const api = Chessground(containerRef.current, {
          ...toConfig(latestProps.current),
          viewOnly: true, // Read-only for study navigation
          coordinates: true,
          animation: {
            enabled: true,
            duration: 200,
          },
          drawable: {
            enabled: true,
            visible: true,
            autoShapes: latestProps.current.shapes || [],
          },
        });

        if (isMounted) {
          apiRef.current = api;
        } else {
          api.destroy();
        }
      } catch (err) {
        console.error('Chessground initialization failed:', err);
      }
    }

    initChessground();

    return () => {
      isMounted = false;
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {
          console.warn('Chessground destroy error:', e);
        }
        apiRef.current = null;
      }
    };
  }, []);

  // Update board state when props change
  useEffect(() => {
    if (!apiRef.current) return;

    try {
      apiRef.current.set({
        ...toConfig({ fen, orientation, lastMove }),
        drawable: {
          autoShapes: shapes || [],
        },
      });
    } catch (e) {
      console.warn('Chessground update failed:', e);
    }
  }, [fen, orientation, lastMove, shapes]);

  // Window resize handler to maintain board geometry
  useEffect(() => {
    function handleResize() {
      if (apiRef.current && apiRef.current.redrawAll) {
        apiRef.current.redrawAll();
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        userSelect: 'none',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
