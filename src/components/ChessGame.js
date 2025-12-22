import React, { useEffect, useRef, useState } from "react";
import { Chessboard, FEN } from "cm-chessboard";
import { Chess } from "chess.js";
import "cm-chessboard/assets/chessboard.css";

export default function ChessGame({ pgn, orientation = "w" }) {
  const boardRef = useRef(null);
  const chessboardInstance = useRef(null);
  const scrollRef = useRef(null);

  const [moveIndex, setMoveIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState([]);

  // 1. 解析 PGN
  useEffect(() => {
    if (!pgn) return;
    try {
      const game = new Chess();
      game.loadPgn(pgn);
      const moveHistory = game.history();

      const tempGame = new Chess();
      const fenList = [FEN.start];
      const simpleMoveList = [];

      moveHistory.forEach((move) => {
        tempGame.move(move);
        fenList.push(tempGame.fen());
        simpleMoveList.push(move);
      });

      setHistory(fenList);
      setMoves(simpleMoveList);
      setMoveIndex(0);
    } catch (error) {
      console.error("PGN 解析錯誤:", error);
    }
  }, [pgn]);

  // 2. 初始化棋盤
  useEffect(() => {
    if (!boardRef.current) return;

    chessboardInstance.current = new Chessboard(boardRef.current, {
      position: FEN.start,
      orientation: orientation,
      assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/",
      style: { animationDuration: 300 },
    });

    return () => {
      if (chessboardInstance.current) {
        chessboardInstance.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. 監聽 orientation 變化
  useEffect(() => {
    if (chessboardInstance.current) {
      chessboardInstance.current.setOrientation(orientation);
    }
  }, [orientation]);

  // 4. 同步棋盤步數位置 + 自動橫向捲動
  useEffect(() => {
    if (chessboardInstance.current && history[moveIndex]) {
      chessboardInstance.current.setPosition(history[moveIndex], true);
    }

    // 自動捲動邏輯 (水平)
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('.active-move');
      if (activeElement) {
        // inline: "center" 會讓被選中的步數盡量置中
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [moveIndex, history]);

  const handlePrev = () => setMoveIndex((p) => Math.max(p - 1, 0));
  const handleNext = () => setMoveIndex((p) => Math.min(p + 1, history.length - 1));

  // --- 輔助函式：將步數分組 ---
  const getMovePairs = () => {
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        turnNumber: Math.floor(i / 2) + 1,
        white: { text: moves[i], index: i + 1 },
        black: moves[i + 1] ? { text: moves[i + 1], index: i + 2 } : null,
      });
    }
    return pairs;
  };

  const movePairs = getMovePairs();

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "sans-serif" }}>

      {/* 棋盤區域 */}
      <div ref={boardRef} style={{ width: "100%" }} />

      {/* 控制按鈕 */}
      <div style={{ margin: "10px 0", display: "flex", justifyContent: "center", gap: "15px", alignItems: "center" }}>
        <button
            onClick={handlePrev}
            disabled={moveIndex === 0}
            style={{ padding: "5px 15px", cursor: "pointer" }}
        >
            &lt;
        </button>
        <span style={{ fontWeight: "bold", color: "#333", minWidth: "60px", textAlign: "center" }}>
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

      {/* 步數顯示區 (橫向捲動) */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",              // 改為 Flex 佈局
          overflowX: "auto",            // 允許橫向捲動
          whiteSpace: "nowrap",         // 防止換行
          backgroundColor: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "4px",
          padding: "10px",
          gap: "12px",                  // 每一回合之間的間距
          alignItems: "center"
        }}
      >
        {movePairs.map((pair) => (
          <div key={pair.turnNumber} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {/* 回合數 */}
            <span style={{ color: "#888", fontSize: "0.9rem", fontWeight: "bold" }}>{pair.turnNumber}.</span>

            {/* 白方步數 */}
            <span
              className={moveIndex === pair.white.index ? "active-move" : ""}
              onClick={() => setMoveIndex(pair.white.index)}
              style={{
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "3px",
                backgroundColor: moveIndex === pair.white.index ? "#ffcc00" : "transparent",
                color: moveIndex === pair.white.index ? "#000" : "#333",
                fontWeight: moveIndex === pair.white.index ? "bold" : "normal",
                transition: "background-color 0.2s"
              }}
            >
              {pair.white.text}
            </span>

            {/* 黑方步數 */}
            {pair.black && (
              <span
                className={moveIndex === pair.black.index ? "active-move" : ""}
                onClick={() => setMoveIndex(pair.black.index)}
                style={{
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  backgroundColor: moveIndex === pair.black.index ? "#ffcc00" : "transparent",
                  color: moveIndex === pair.black.index ? "#000" : "#333",
                  fontWeight: moveIndex === pair.black.index ? "bold" : "normal",
                  transition: "background-color 0.2s"
                }}
              >
                {pair.black.text}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}