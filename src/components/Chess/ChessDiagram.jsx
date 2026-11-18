import React, { useMemo } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import ChessgroundBoard, { COORD_GUTTER } from './ChessgroundBoard';
import { parseCommentTags } from './pgnParser';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BOARD_WIDTH = 420;

function ChessDiagramLogic({ fen, arrows, squares, orientation, caption }) {
  // 沿用 Lichess 的 [%cal] / [%csl] 寫法
  const shapes = useMemo(() => {
    const tags = `${arrows ? `[%cal ${arrows}]` : ''}${squares ? `[%csl ${squares}]` : ''}`;
    return parseCommentTags(tags).shapes;
  }, [arrows, squares]);

  return (
    <figure style={{ maxWidth: BOARD_WIDTH + COORD_GUTTER.right, margin: '2rem auto' }}>
      <ChessgroundBoard fen={fen || START_FEN} orientation={orientation} shapes={shapes} />
      {caption && (
        <figcaption
          style={{
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--ifm-color-emphasis-700)',
            paddingRight: COORD_GUTTER.right,
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * 靜態示意棋盤：擺一個局面，用箭頭、圈格標出走法，不能走棋。
 * - fen：局面（可以只放幾個棋子，不必是合法局面）
 * - arrows：箭頭，同 Lichess [%cal]，例如 "Gd4d8,Rd4h4"
 * - squares：圈格，同 Lichess [%csl]，例如 "Ge5,Rf6"
 * - 顏色代碼：G 綠、R 紅、B 藍、Y 黃
 */
export default function ChessDiagram({ orientation = 'w', ...props }) {
  return (
    <BrowserOnly fallback={<div style={{ height: BOARD_WIDTH, maxWidth: BOARD_WIDTH, margin: '2rem auto' }} />}>
      {() => <ChessDiagramLogic orientation={orientation} {...props} />}
    </BrowserOnly>
  );
}
