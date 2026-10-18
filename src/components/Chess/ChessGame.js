import React, { useEffect, useRef, useState } from "react";
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Chess } from "chess.js";
import "cm-chessboard/assets/chessboard.css";
import precomputedEvals from "@site/src/data/chessEvals.json";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * 將 PGN 內的 [%eval ...] 字串解析為評估物件（Lichess 格式皆以白方視角為正）
 * 例如："0.35" -> { cp: 35 }, "-1.2" -> { cp: -120 }, "#3" -> { mate: 3 }, "#-2" -> { mate: -2 }
 */
function parseEvalString(evalStr) {
  if (!evalStr) return null;
  const s = evalStr.trim();
  if (s.startsWith("#")) {
    const mate = parseInt(s.slice(1), 10);
    if (!isNaN(mate)) {
      return {
        cp: mate >= 0 ? 10000 : -10000,
        mate,
        winner: null,
        source: "pgn",
      };
    }
  } else {
    const pawns = parseFloat(s);
    if (!isNaN(pawns)) {
      return {
        cp: Math.round(pawns * 100),
        mate: null,
        winner: null,
        source: "pgn",
      };
    }
  }
  return null;
}

/**
 * 清理並正規化 Lichess 匯出的 PGN，同時保留預先算好的 { [%eval ...] } 分數：
 * 1. 提取 { ... [%eval 0.35] ... } 為暫存標記 __EVAL_0.35__，移除其餘視覺標記與註解
 * 2. 自動補齊複製時漏掉的右括號 `)`
 * 3. 處理 Lichess Study 分支 (Variation)：
 *    - 中途的短分支（如 `20... Ne5 (20... Ncb4) 21. Nxe5`）會被剝除，保留主線
 *    - 若主線在某步停住、而整局後續實戰被包在句尾括號內（如 `9. Be2 (9. Be5 ... 38. f3+ Kf5)`），自動將該長分支拉回主線
 */
function normalizePgn(rawPgn) {
  if (!rawPgn || typeof rawPgn !== "string") {
    return { cleanedTokens: [], customFen: null };
  }

  let text = rawPgn.trim();

  // 擷取並移除 PGN Header Tags（如 [Event "..."]）
  const fenMatch = text.match(/\[\s*FEN\s+"([^"]+)"\s*\]/i);
  const customFen = fenMatch ? fenMatch[1] : null;
  text = text.replace(/\[\s*\w+\s+"[^"]*"\s*\]/g, " ");

  // 將大括號註解內的 [%eval ...] 轉為 __EVAL_xxx__ 標記保留，其餘註解內容移除
  text = text.replace(/\{([^}]*)\}?/g, (_, commentBody) => {
    const evalMatch = commentBody.match(/\[%eval\s+([#+-]?\d+(?:\.\d+)?)\]/i);
    return evalMatch ? ` __EVAL_${evalMatch[1]}__ ` : " ";
  });
  text = text.replace(/;[^\r\n]*/g, " ");

  // 移除 NAG 符號（如 $1, $2, $146）
  text = text.replace(/\$\d+/g, " ");

  // 自動修正不平衡的括號 ( )
  let openCount = 0;
  let balanced = "";
  for (const ch of text) {
    if (ch === "(") {
      openCount++;
      balanced += ch;
    } else if (ch === ")") {
      if (openCount > 0) {
        openCount--;
        balanced += ch;
      }
    } else {
      balanced += ch;
    }
  }
  if (openCount > 0) {
    const termMatch = balanced.match(/(\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*)$/);
    if (termMatch) {
      const idx = balanced.length - termMatch[0].length;
      balanced = balanced.slice(0, idx) + ")".repeat(openCount) + termMatch[0];
    } else {
      balanced += ")".repeat(openCount);
    }
  }

  // 計算字串中的棋步數量（忽略回合數、__EVAL__ 與結果標記）
  const countMoveTokens = (str) => {
    return str
      .replace(/\([^()]*\)/g, " ")
      .trim()
      .split(/\s+/)
      .filter(
        (t) =>
          t &&
          !/^\d+\.+$/.test(t) &&
          !/^__EVAL_/.test(t) &&
          !["*", "1-0", "0-1", "1/2-1/2"].includes(t)
      ).length;
  };

  // 遞迴處理分支括號 (...)
  const processVariations = (input) => {
    let result = "";
    let i = 0;
    while (i < input.length) {
      if (input[i] === "(") {
        let depth = 1;
        let j = i + 1;
        while (j < input.length && depth > 0) {
          if (input[j] === "(") depth++;
          else if (input[j] === ")") depth--;
          j++;
        }
        const innerRaw = input.slice(i + 1, j - 1);
        const innerProcessed = processVariations(innerRaw);
        const afterStr = input.slice(j);

        const hasMovesAfter = countMoveTokens(afterStr) > 0;
        const innerMoveCount = countMoveTokens(innerProcessed);

        if (!hasMovesAfter && innerMoveCount > 1) {
          // 若括號位於結尾且內部包含多步後續，代表原主線最後一步（及其附帶的 __EVAL__）只是短暫分支，將長分支拉回主線
          result = result.replace(
            /\s*(?:\d+\.+\s*)?[^\s()]+\s*(?:__EVAL_[^\s]+__\s*)?$/,
            " " + innerProcessed.trim() + " "
          );
        }
        i = j;
      } else {
        result += input[i];
        i++;
      }
    }
    return result;
  };

  const cleanedStr = processVariations(balanced).replace(/\s+/g, " ").trim();
  const cleanedTokens = cleanedStr ? cleanedStr.split(" ") : [];
  return { cleanedTokens, customFen };
}

// ─── 零資源消耗局面評估系統（直接讀取 PGN 預先算好的 [%eval] + 本地子力保底） ───

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

const PAWN_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

/**
 * 優先從預先計算好的 Stockfish 靜態資料庫 (chessEvals.json) 讀取分數，
 * 若為尚未預先計算的新局面，則以 0ms 本地子力位置表保底（完全不載入外部引擎，零資源消耗）
 */
function evaluateGameLocal(game) {
  try {
    if (game.isCheckmate()) {
      const winner = game.turn() === "w" ? "b" : "w";
      return {
        cp: winner === "w" ? 10000 : -10000,
        mate: 0,
        winner,
        source: "terminal",
      };
    }
    if (game.isDraw()) {
      return { cp: 0, mate: null, winner: null, source: "terminal" };
    }

    const fen = game.fen();
    if (precomputedEvals && precomputedEvals[fen]) {
      return {
        ...precomputedEvals[fen],
        source: "precomputed",
      };
    }

    const board = game.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (!cell) continue;
        const base = PIECE_VALUES[cell.type] || 0;
        const pstRow = cell.color === "w" ? r : 7 - r;
        let positional = 0;
        if (cell.type === "p") positional = PAWN_PST[pstRow][c];
        else if (cell.type === "n" || cell.type === "b") {
          positional = KNIGHT_PST[pstRow][c] * 0.5;
        }
        score += (cell.color === "w" ? 1 : -1) * (base + positional);
      }
    }
    return { cp: Math.round(score), mate: null, winner: null, source: "local" };
  } catch {
    return { cp: 0, mate: null, winner: null, source: "local" };
  }
}

/**
 * 優劣條 (Evaluation Bar) 元件
 */
function EvalBar({ evaluation, orientation = "w" }) {
  const { cp = 0, mate = null, winner = null } = evaluation || {};

  // 計算白方佔比 (0% ~ 100%)，使用 Lichess Sigmoid 勝率曲線
  let whitePercent = 50;
  if (winner === "w" || (mate !== null && mate > 0)) {
    whitePercent = 100;
  } else if (winner === "b" || (mate !== null && mate < 0)) {
    whitePercent = 0;
  } else {
    const clampedCp = Math.max(-1000, Math.min(1000, cp));
    const winChance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampedCp)) - 1);
    whitePercent = Math.max(4, Math.min(96, winChance));
  }

  // 格式化顯示文字
  let label = "0.0";
  if (winner === "w") {
    label = "1-0";
  } else if (winner === "b") {
    label = "0-1";
  } else if (mate !== null && mate !== 0) {
    label = `M${Math.abs(mate)}`;
  } else {
    const pawns = Math.abs(cp) / 100;
    label = pawns >= 10 ? pawns.toFixed(0) : pawns.toFixed(1);
  }

  const isWhiteAhead =
    winner === "w" || (mate !== null ? mate > 0 : cp >= 0);

  // 根據棋盤視角決定上下顏色（朝自己的一方在底部）
  const isWhiteBottom = orientation === "w";
  const topPercent = isWhiteBottom ? 100 - whitePercent : whitePercent;
  const bottomPercent = isWhiteBottom ? whitePercent : 100 - whitePercent;

  const topColor = isWhiteBottom ? "#262421" : "#f0f0f0";
  const bottomColor = isWhiteBottom ? "#f0f0f0" : "#262421";

  // 分數文字放在優勢方那一端（頂部或底部）
  const showLabelAtBottom =
    (isWhiteAhead && isWhiteBottom) || (!isWhiteAhead && !isWhiteBottom);
  const labelTextColor = isWhiteAhead ? "#262421" : "#f0f0f0";

  return (
    <div
      title={`局面評估：${isWhiteAhead ? "+" : "-"}${label}`}
      style={{
        width: "26px",
        flexShrink: 0,
        borderRadius: "4px",
        overflow: "hidden",
        border: "1px solid var(--ifm-color-emphasis-400)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        userSelect: "none",
        backgroundColor: "#262421",
      }}
    >
      <div
        style={{
          height: `${topPercent}%`,
          backgroundColor: topColor,
          transition: "height 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        style={{
          height: `${bottomPercent}%`,
          backgroundColor: bottomColor,
          transition: "height 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      {/* 中線刻度 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          backgroundColor: "rgba(128, 128, 128, 0.45)",
          pointerEvents: "none",
        }}
      />
      {/* 評估分數標籤 */}
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: showLabelAtBottom ? "auto" : "4px",
          bottom: showLabelAtBottom ? "4px" : "auto",
          textAlign: "center",
          fontSize: "10px",
          fontWeight: "700",
          lineHeight: 1.1,
          color: labelTextColor,
          letterSpacing: "-0.3px",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function ChessGameLogic({ pgn, orientation = "w", showEval = true }) {
  const boardRef = useRef(null);
  const chessboardInstance = useRef(null);
  const scrollRef = useRef(null);

  const [moveIndex, setMoveIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [evals, setEvals] = useState([]);
  const [moves, setMoves] = useState([]);
  const [isBoardReady, setIsBoardReady] = useState(false);

  // 1. 解析 PGN 與預先算好的 [%eval] 分數
  useEffect(() => {
    if (!pgn) return;
    try {
      const { cleanedTokens, customFen } = normalizePgn(pgn);
      const startFen = customFen || START_FEN;
      const game = new Chess(startFen);

      const fenList = [startFen];
      const evalList = [{ cp: 20, mate: null, winner: null, source: "init" }];
      const simpleMoveList = [];

      for (const token of cleanedTokens) {
        if (!token) continue;

        // 若為 [%eval ...] 標記，覆蓋最新一步的評估值
        const evalMatch = token.match(/^__EVAL_(.+)__$/);
        if (evalMatch) {
          const parsedEval = parseEvalString(evalMatch[1]);
          if (parsedEval && evalList.length > 0) {
            const lastEval = evalList[evalList.length - 1];
            // 若該步已經將死，保留將死狀態 (1-0 / 0-1)
            if (lastEval.source !== "terminal") {
              evalList[evalList.length - 1] = parsedEval;
            }
          }
          continue;
        }

        // 略過純回合數或終局標記
        if (
          /^\d+\.+$/.test(token) ||
          ["*", "1-0", "0-1", "1/2-1/2"].includes(token)
        ) {
          continue;
        }

        // 處理可能黏在一起的回合號，如 "13...Nc6" 或 "1.d4"
        const san = token.replace(/^\d+\.+/, "").replace(/[!?]+$/, "");
        if (!san) continue;

        try {
          const moveResult = game.move(san);
          if (moveResult) {
            fenList.push(game.fen());
            simpleMoveList.push(moveResult.san);
            evalList.push(evaluateGameLocal(game));
          }
        } catch {
          // 忽略非棋步 token
        }
      }

      setHistory(fenList);
      setEvals(evalList);
      setMoves(simpleMoveList);
      setMoveIndex(0);
    } catch (error) {
      console.error("PGN 解析錯誤:", error);
    }
  }, [pgn]);

  // 2. 初始化棋盤 (修正熱更新導致的 invokeExtensionPoints 錯誤)
  useEffect(() => {
    let isMounted = true;

    const initBoard = async () => {
      try {
        const { Chessboard, FEN } = await import("cm-chessboard");

        if (!isMounted || !boardRef.current) return;

        // 初始化前先清空容器，防止 Docusaurus HMR 或 React StrictMode 導致重複掛載
        boardRef.current.innerHTML = '';

        const board = new Chessboard(boardRef.current, {
          position: history[moveIndex] || FEN.start,
          orientation: orientation,
          assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/",
          style: { animationDuration: 300 },
          responsive: true,
        });

        // 避免 HMR (熱更新) 或組件卸載時，ResizeObserver 的 setTimeout 延遲執行 handleResize 導致 invokeExtensionPoints 報錯
        const originalHandleResize = board.view.handleResize;
        board.view.handleResize = function (...args) {
          if (board.state) {
            originalHandleResize.apply(board.view, args);
          }
        };

        if (isMounted) {
          chessboardInstance.current = board;
          setIsBoardReady(true);
        } else {
          // 如果異步載入完成時元件已經卸載，立即銷毀以清理殘留的 resize 監聽器
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
        // 【關鍵修正】必須同步執行 destroy()，絕對不能包在 setTimeout 裡面。
        // 這樣才能確保在 DOM 被卸載前，立刻解除 resize 事件綁定，避免觸發 invokeExtensionPoints 錯誤。
        try {
          chessboardInstance.current.destroy();
        } catch (e) {
          console.warn("清理棋盤實例時發生的警告:", e);
        }
        chessboardInstance.current = null;
      }
    };
  }, [orientation]);

  // 3. 同步棋盤位置 (加入安全防護)
  useEffect(() => {
    const activeFen = history[moveIndex];
    if (isBoardReady && chessboardInstance.current && activeFen) {
      try {
        if (chessboardInstance.current.view) {
          chessboardInstance.current.setPosition(activeFen, true);
        }
      } catch (e) {
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
  const currentEval = evals[moveIndex] || { cp: 20, mate: null, winner: null };

  return (
    <div style={{ maxWidth: showEval ? 454 : 420, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        {showEval && (
          <EvalBar evaluation={currentEval} orientation={orientation} />
        )}
        <div
          ref={boardRef}
          style={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            aspectRatio: "1/1",
            overflow: "hidden"
          }}
        />
      </div>

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

export function White({ pgn, showEval = true }) {
  return <ChessGame pgn={pgn} orientation="w" showEval={showEval} />;
}

export function Black({ pgn, showEval = true }) {
  return <ChessGame pgn={pgn} orientation="b" showEval={showEval} />;
}