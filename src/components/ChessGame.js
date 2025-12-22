import React, { useEffect, useRef, useState } from "react";
import BrowserOnly from '@docusaurus/BrowserOnly'; // 引入 BrowserOnly
import { Chess } from "chess.js";
import "cm-chessboard/assets/chessboard.css";

// 定義起始 FEN
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// === 內部邏輯組件 (只會在瀏覽器端執行) ===
function ChessGameLogic({ pgn, orientation = "w" }) {
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

  // 2. 初始化棋盤 (加入防呆與清理機制)
  useEffect(() => {
    if (!boardRef.current) return;

    // 標記組件是否還活著，防止非同步回調報錯
    let isMounted = true;

    const initBoard = async () => {
      // 動態載入套件
      const { Chessboard, FEN } = await import("cm-chessboard");

      // 如果組件已經被卸載，就不要繼續執行
      if (!isMounted || !boardRef.current) return;

      // 如果已經有實例，先銷毀它 (防止雙重掛載)
      if (chessboardInstance.current) {
        await chessboardInstance.current.destroy();
      }

      // 建立新棋盤
      chessboardInstance.current = new Chessboard(boardRef.current, {
        position: FEN.start,
        orientation: orientation,
        assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/",
        style: { animationDuration: 300 },
        responsive: true, // 確保開啟響應式
      });
    };

    initBoard();

    // 清理函式：當組件卸載時執行
    return () => {
      isMounted = false;
      if (chessboardInstance.current) {
        // 這裡一定要銷毀，防止 resize 事件殘留
        chessboardInstance.current.destroy();
        chessboardInstance.current = null;
      }
    };
  }, []); // 保持空依賴，只在掛載時執行

  // 3. 監聽 orientation 變化
  useEffect(() => {
    if (chessboardInstance.current) {
      chessboardInstance.current.setOrientation(orientation);
    }
  }, [orientation]);

  // 4. 同步棋盤步數
  useEffect(() => {
    if (chessboardInstance.current && history[moveIndex]) {
      chessboardInstance.current.setPosition(history[moveIndex], true);
    }

    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('.active-move');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [moveIndex, history]);

  // --- 處理步數顯示邏輯 ---
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

      {/* 棋盤容器：加上 aspect-ratio 防止高度塌陷導致計算錯誤 */}
      <div
        ref={boardRef}
        style={{
          width: "100%",
          aspectRatio: "1/1", // 關鍵修正：固定寬高比
          marginBottom: "10px"
        }}
      />

      {/* 控制按鈕 */}
      <div style={{ margin: "10px 0", display: "flex", justifyContent: "center", gap: "15px", alignItems: "center" }}>
        <button onClick={handlePrev} disabled={moveIndex === 0} style={{ padding: "5px 15px", cursor: "pointer" }}>&lt;</button>
        <span style={{ fontWeight: "bold", color: "var(--ifm-color-emphasis-900)", minWidth: "60px", textAlign: "center" }}>
           {moveIndex} / {Math.max(0, history.length - 1)}
        </span>
        <button onClick={handleNext} disabled={moveIndex === history.length - 1} style={{ padding: "5px 15px", cursor: "pointer" }}>&gt;</button>
      </div>

      {/* 步數捲動區 */}
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
                transition: "background-color 0.2s"
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

// === 主輸出組件：使用 BrowserOnly 包裹 ===
// 這是解決 Runtime Error 最核心的一步，確保 SSR 完全忽略它
export default function ChessGame(props) {
  return (
    <BrowserOnly fallback={<div style={{height: "400px", display: "flex", alignItems: "center", justifyContent: "center"}}>載入棋盤中...</div>}>
      {() => <ChessGameLogic {...props} />}
    </BrowserOnly>
  );
}