import React, { useEffect, useRef, useState } from "react";
import { Chessboard, FEN } from "cm-chessboard";
import { Chess } from "chess.js";
import "cm-chessboard/assets/chessboard.css";

export default function ChessGame({ pgn, orientation = "w" }) {
  const boardRef = useRef(null);
  const chessboardInstance = useRef(null);

  const [moveIndex, setMoveIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState([]);

  // 1. 解析 PGN (只在 pgn 改變時執行)
  useEffect(() => {
    if (!pgn) return;
    try {
      const game = new Chess();
      game.loadPgn(pgn);
      const moveHistory = game.history();

      const tempGame = new Chess();
      const fenList = [FEN.start];
      const moveList = [null];

      moveHistory.forEach((move, i) => {
        tempGame.move(move);
        fenList.push(tempGame.fen());
        const turnLabel = (i % 2 === 0) ? `${Math.floor(i / 2) + 1}.` : "";
        moveList.push({ text: move, turn: turnLabel });
      });

      setHistory(fenList);
      setMoves(moveList);
      setMoveIndex(0);
    } catch (error) {
      console.error("PGN 解析錯誤:", error);
    }
  }, [pgn]);

  // 2. 初始化棋盤 (只執行一次，確保實例穩定)
  useEffect(() => {
    if (!boardRef.current) return;

    chessboardInstance.current = new Chessboard(boardRef.current, {
      position: FEN.start,
      orientation: orientation, // 初始視角
      assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/",
      style: { animationDuration: 300 },
    });

    return () => {
      if (chessboardInstance.current) {
        chessboardInstance.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 這裡不依賴 orientation，避免重複銷毀

  // 3. 監聽 orientation 變化，動態切換視角與座標
  useEffect(() => {
    if (chessboardInstance.current) {
      // 使用 API 方法設定視角，這會強制刷新座標 (Coordinates)
      chessboardInstance.current.setOrientation(orientation);
    }
  }, [orientation]);

  // 4. 同步棋盤步數位置
  useEffect(() => {
    if (chessboardInstance.current && history[moveIndex]) {
      chessboardInstance.current.setPosition(history[moveIndex], true);
    }
  }, [moveIndex, history]);

  const handlePrev = () => setMoveIndex((p) => Math.max(p - 1, 0));
  const handleNext = () => setMoveIndex((p) => Math.min(p + 1, history.length - 1));

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", textAlign: "center", fontFamily: "sans-serif" }}>

      <div ref={boardRef} style={{ width: "100%" }} />

      {/* 控制按鈕 */}
      <div style={{ margin: "1rem 0", display: "flex", justifyContent: "center", gap: "10px", alignItems: "center" }}>
        <button
            onClick={handlePrev}
            disabled={moveIndex === 0}
            style={{ padding: "5px 15px", cursor: "pointer" }}
        >
            &lt;
        </button>
        <span style={{ fontWeight: "bold", minWidth: "60px", color: "#333" }}>
           {moveIndex} / {Math.max(0, history.length - 1)}
        </span>
        <button
            onClick={handleNext}
            disabled={moveIndex === history.length - 1}
            style={{ padding: "5px 15px", cursor: "pointer" }}
        >
            &gt;
        </button>
      </div>

      {/* 步數顯示區 */}
      <div style={{
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        padding: "15px",
        borderRadius: "8px",
        fontSize: "1rem",
        lineHeight: "1.8",
        textAlign: "left",
        color: "#222"
      }}>
        {moves.map((move, index) => {
          if (!move) return null;
          const isActive = moveIndex === index;
          return (
            <span key={index} style={{ marginRight: "10px", whiteSpace: "nowrap", display: "inline-block" }}>
              {move.turn && <span style={{ color: "#666", marginRight: "4px", fontWeight: "bold" }}>{move.turn}</span>}
              <span
                onClick={() => setMoveIndex(index)}
                style={{
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: isActive ? "#ffcc00" : "transparent",
                  color: isActive ? "#000" : "#222",
                  fontWeight: isActive ? "bold" : "normal",
                  transition: "background-color 0.2s"
                }}
              >
                {move.text}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}