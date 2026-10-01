import React, { useEffect, useRef } from 'react';
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

export default function ChessgroundBoard({
  fen,
  orientation = 'white',
  lastMove,
  shapes = [],
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

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
          fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          orientation: orientation === 'b' || orientation === 'black' ? 'black' : 'white',
          viewOnly: true, // Read-only for study navigation
          coordinates: true,
          animation: {
            enabled: true,
            duration: 200,
          },
          drawable: {
            enabled: true,
            visible: true,
            autoShapes: shapes || [],
          },
          lastMove: lastMove && lastMove.length === 2 ? lastMove : undefined,
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
        fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        orientation: orientation === 'b' || orientation === 'black' ? 'black' : 'white',
        lastMove: lastMove && lastMove.length === 2 ? lastMove : undefined,
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
