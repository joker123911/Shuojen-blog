import React, { useEffect, useRef, useState } from "react";
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Chess } from "chess.js";
import "cm-chessboard/assets/chessboard.css";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function ChessGameLogic({ pgn, orientation = "w" }) {
  const boardRef = useRef(null);
  const chessboardInstance = useRef(null);
  const scrollRef = useRef(null);

  const [moveIndex, setMoveIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState([]);
  const [isBoardReady, setIsBoardReady] = useState(false);

  // 1. 解析 PGN
  useEffect(() => {
    if (!pgn) return;
    try {
      const game = new Chess();
      game.loadPgn(pgn);
      const moveHistory = game.history();
      const tempGame = new Chess();
      const fenList = [START_FEN];
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

  // 2. 初始化棋盤 (修正熱更新導致的 invokeExtensionPoints 錯誤)
  useEffect(() => {
    let isMounted = true;
    let board = null;

    const initBoard = async () => {
      try {
        const { Chessboard, FEN } = await import("cm-chessboard");

        if (!isMounted || !boardRef.current) return;

        // 【關鍵修正】初始化前先清空容器，防止 Docusaurus HMR 導致重複掛載
        if (boardRef.current) {
          boardRef.current.innerHTML = '';
        }

        // 如果已有舊實例，嘗試銷毀它
        if (chessboardInstance.current) {
          try {
            await chessboardInstance.current.destroy();
          } catch (e) { /* 忽略銷毀時的錯誤 */ }
        }

        board = new Chessboard(boardRef.current, {
          position: history[moveIndex] || FEN.start,
          orientation: orientation,
          assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/",
          style: { animationDuration: 300 },
          responsive: true,
        });

        if (isMounted) {
          chessboardInstance.current = board;
          setIsBoardReady(true);
        } else {
          board.destroy();
        }
      } catch (err) {
        console.error("Chessboard 初始化失敗:", err);
      }
    };

    initBoard();

    // 清理函式
    return () => {
      isMounted = false;
      setIsBoardReady(false);
      if (chessboardInstance.current) {
        const instance = chessboardInstance.current;
        chessboardInstance.current = null;
        // 使用延遲或 try-catch 確保 destroy 不會噴錯影響 React 渲染
        setTimeout(() => {
          try {
            instance.destroy();
          } catch (e) {
            console.warn("清理棋盤實例時發生的警告:", e);
          }
        }, 0);
      }
    };
  }, [orientation]); // 僅在方向改變時重啟實例

  // 3. 同步棋盤位置 (加入安全防護)
  useEffect(() => {
    // 確保實例存在且已準備好
    if (isBoardReady && chessboardInstance.current && history[moveIndex]) {
      try {
        // 檢查實例是否還有 view 屬性，防止對已銷毀的對象操作
        if (chessboardInstance.current.view) {
          chessboardInstance.current.setPosition(history[moveIndex], true);
        }
      } catch (e) {
        // 靜默處理，避免紅畫面
        console.warn("setPosition 失敗，可能正處於組件切換中");
      }
    }

    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('.active-move');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [moveIndex, history, isBoardReady]);

  const handlePrev = () => setMoveIndex((p) => Math.max(p - 1, 0));
  const handleNext = () => setMoveIndex((p) => Math.min(p + 1, history.length - 1));

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
      <div
        ref={boardRef}
        style={{
          width: "100%",
          aspectRatio: "1/1",
          marginBottom: "10px",
          overflow: "hidden"
        }}
      />

      <div style={{ margin: "10px 0", display: "flex", justifyContent: "center", gap: "15px", alignItems: "center" }}>
        <button onClick={handlePrev} disabled={moveIndex === 0} style={{ padding: "5px 15px", cursor: "pointer" }}>&lt;</button>
        <span style={{ fontWeight: "bold", minWidth: "60px", textAlign: "center", color: "var(--ifm-color-emphasis-900)" }}>
           {moveIndex} / {Math.max(0, history.length - 1)}
        </span>
        <button onClick={handleNext} disabled={moveIndex === history.length - 1} style={{ padding: "5px 15px", cursor: "pointer" }}>&gt;</button>
      </div>

      <div
        ref={scrollRef}
        style={{
          display: "flex",
          overflowX: "auto",
          whiteSpace: "nowrap",
          backgroundColor: "var(--ifm-color-emphasis-100)",
          border: "1px solid var(--ifm-color-emphasis-300)",
          borderRadius: "4px",
          padding: "10px",
          gap: "12px",
          alignItems: "center"
        }}
      >
        {movePairs.map((pair) => (
          <div key={pair.turnNumber} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "var(--ifm-color-emphasis-600)", fontSize: "0.9rem", fontWeight: "bold" }}>{pair.turnNumber}.</span>
            <span
              className={moveIndex === pair.white.index ? "active-move" : ""}
              onClick={() => setMoveIndex(pair.white.index)}
              style={{
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "3px",
                backgroundColor: moveIndex === pair.white.index ? "#ffcc00" : "transparent",
                color: moveIndex === pair.white.index ? "#000" : "var(--ifm-color-emphasis-900)",
                fontWeight: moveIndex === pair.white.index ? "bold" : "normal",
              }}
            >
              {pair.white.text}
            </span>
            {pair.black && (
              <span
                className={moveIndex === pair.black.index ? "active-move" : ""}
                onClick={() => setMoveIndex(pair.black.index)}
                style={{
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  backgroundColor: moveIndex === pair.black.index ? "#ffcc00" : "transparent",
                  color: moveIndex === pair.black.index ? "#000" : "var(--ifm-color-emphasis-900)",
                  fontWeight: moveIndex === pair.black.index ? "bold" : "normal",
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

export default function ChessGame(props) {
  return (
    <BrowserOnly fallback={<div style={{height: "400px", display: "flex", alignItems: "center", justifyContent: "center"}}>載入棋盤中...</div>}>
      {() => <ChessGameLogic {...props} />}
    </BrowserOnly>
  );
}