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
  const [isBoardReady, setIsBoardReady] = useState(false); // 新增狀態：確保棋盤已準備好

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

  // 2. 初始化棋盤 (修正非同步競爭問題)
  useEffect(() => {
    let isMounted = true;
    let board = null;

    const initBoard = async () => {
      try {
        const { Chessboard, FEN } = await import("cm-chessboard");

        if (!isMounted || !boardRef.current) return;

        // 如果已有實例，先清理
        if (chessboardInstance.current) {
          await chessboardInstance.current.destroy();
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
          board.destroy(); // 如果初始化完成時組件已卸載，立即銷毀
        }
      } catch (err) {
        console.error("Chessboard init error:", err);
      }
    };

    initBoard();

    return () => {
      isMounted = false;
      setIsBoardReady(false);
      if (chessboardInstance.current) {
        // 使用一個變數暫存，避免與非同步過程衝突
        const instance = chessboardInstance.current;
        chessboardInstance.current = null;
        instance.destroy();
      }
    };
  }, [orientation]); // 當 orientation 改變時重新初始化，這比 setOrientation 更穩定

  // 3. 同步棋盤步數 (加上 isBoardReady 判斷)
  useEffect(() => {
    if (isBoardReady && chessboardInstance.current && history[moveIndex]) {
      // 使用 try-catch 防止 cm-chessboard 內部繪製錯誤崩潰
      try {
        chessboardInstance.current.setPosition(history[moveIndex], true);
      } catch (e) {
        console.warn("SetPosition failed:", e);
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
          overflow: "hidden" // 確保不會有溢出的繪製問題
        }}
      />

      <div style={{ margin: "10px 0", display: "flex", justifyContent: "center", gap: "15px", alignItems: "center" }}>
        <button onClick={handlePrev} disabled={moveIndex === 0} style={{ padding: "5px 15px", cursor: "pointer" }}>&lt;</button>
        <span style={{ fontWeight: "bold", minWidth: "60px", textAlign: "center" }}>
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
          backgroundColor: "rgba(150, 150, 150, 0.1)",
          border: "1px solid rgba(150, 150, 150, 0.3)",
          borderRadius: "4px",
          padding: "10px",
          gap: "12px",
          alignItems: "center"
        }}
      >
        {movePairs.map((pair) => (
          <div key={pair.turnNumber} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: "bold", opacity: 0.6 }}>{pair.turnNumber}.</span>
            <span
              className={moveIndex === pair.white.index ? "active-move" : ""}
              onClick={() => setMoveIndex(pair.white.index)}
              style={{
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "3px",
                backgroundColor: moveIndex === pair.white.index ? "#ffcc00" : "transparent",
                color: moveIndex === pair.white.index ? "#000" : "inherit",
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
                  color: moveIndex === pair.black.index ? "#000" : "inherit",
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