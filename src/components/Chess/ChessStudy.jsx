import React, { useEffect, useRef, useState } from "react";
import BrowserOnly from '@docusaurus/BrowserOnly';
import { Chess } from "chess.js";
import "cm-chessboard/assets/chessboard.css";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// 【核心算法】將 Lichess 複雜 PGN（含括號分支與大括號註解）解析為網狀/樹狀結構
function parsePgnToTree(pgn) {
  const root = { id: 'root', san: 'START', children: [], parentId: null, comment: '', ply: 0, fen: START_FEN };
  const nodesMap = { root: root };

  if (!pgn) return { root, nodesMap };

  // 移除 PGN 檔頭標籤，並將多餘空白收攏
  let pgnText = pgn.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ');

  // 利用正規表達式切出：{註解}、(左括號)、)右括號、著法單字
  const tokenRegex = /(\{[^}]*\})|(\()|(\))|([^\s()]+)/g;
  let match;
  const tokens = [];

  while ((match = tokenRegex.exec(pgnText)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'comment', value: match[1].slice(1, -1).trim() });
    } else if (match[2]) {
      tokens.push({ type: 'open' });
    } else if (match[3]) {
      tokens.push({ type: 'close' });
    } else if (match[4]) {
      const val = match[4];
      // 過濾掉回合數字（如 1., 3...）以及勝負宣告（如 1-0, *）
      if (/^\d+(\.+\.\.)?$/.test(val) || /^\d+\.$/.test(val) || ['1-0', '0-1', '1/2-1/2', '*'].includes(val)) {
        continue;
      }
      // 過濾掉 NAG 評估記號（如 $1, $2）
      if (val.startsWith('$')) continue;
      
      tokens.push({ type: 'move', value: val });
    }
  }

  let currentNode = root;
  let forkParent = null;
  const stack = [];

  tokens.forEach(token => {
    if (token.type === 'open') {
      // 遇到左括號，代表要從當前節點的「上一著（父節點）」切出新支線
      const parentNode = currentNode.parentId ? nodesMap[currentNode.parentId] : root;
      stack.push({ resumeNode: currentNode, branchParent: parentNode });
      forkParent = parentNode;
    } else if (token.type === 'close') {
      // 遇到右括號，彈回主線繼續前進
      if (stack.length > 0) {
        const frame = stack.pop();
        currentNode = frame.resumeNode;
      }
      forkParent = null;
    } else if (token.type === 'move') {
      const parentNode = forkParent ? forkParent : currentNode;
      const newId = 'node_' + Math.random().toString(36).substr(2, 9);
      
      const newNode = {
        id: newId,
        san: token.value,
        children: [],
        parentId: parentNode.id,
        comment: '',
        ply: parentNode.ply + 1,
        fen: START_FEN
      };

      parentNode.children.push(newNode);
      nodesMap[newId] = newNode;
      currentNode = newNode;
      forkParent = null; // 支線首步確定後，後續步伐順著走
    } else if (token.type === 'comment') {
      if (currentNode) {
        currentNode.comment = token.value;
      }
    }
  });

  // 使用 chess.js 遞迴遍歷整棵樹，算出每一個節點對應的客觀 FEN 盤面
  function calculateFens(node, currentFen) {
    node.children.forEach(child => {
      const chess = new Chess(currentFen);
      try {
        chess.move(child.san);
        child.fen = chess.fen();
      } catch (e) {
        console.warn(`不合法的棋步: ${child.san}`, e);
        child.fen = currentFen; // 失敗時維持原盤面
      }
      calculateFens(child, child.fen);
    });
  }
  calculateFens(root, START_FEN);

  return { root, nodesMap };
}

// 獲取包含當前節點的完整展現行（歷史路徑 + 未來延伸主線）
function getFullLineOfCurrentBranch(nodesMap, root, targetId) {
  const path = [];
  let current = nodesMap[targetId];
  while (current && current.id !== 'root') {
    path.unshift(current);
    current = nodesMap[current.parentId];
  }

  const forward = [];
  let forwardCurrent = nodesMap[targetId] || root;
  while (forwardCurrent && forwardCurrent.children && forwardCurrent.children.length > 0) {
    forwardCurrent = forwardCurrent.children[0];
    forward.push(forwardCurrent);
  }

  return [...path, ...forward];
}

function ChessStudyLogic({ pgn, orientation = "w" }) {
  const boardRef = useRef(null);
  const chessboardInstance = useRef(null);
  const scrollRef = useRef(null);

  // 初始化解析 PGN 樹
  const [treeData, setTreeData] = useState(() => parsePgnToTree(pgn));
  const [currentNodeId, setCurrentNodeId] = useState('root');
  const [isBoardReady, setIsBoardReady] = useState(false);

  // 當外部 PGN 改變時重新解析
  useEffect(() => {
    const data = parsePgnToTree(pgn);
    setTreeData(data);
    setCurrentNodeId('root');
  }, [pgn]);

  const currentNode = treeData.nodesMap[currentNodeId] || treeData.root;

  // 初始化棋盤
  useEffect(() => {
    let isMounted = true;

    const initBoard = async () => {
      try {
        const { Chessboard } = await import("cm-chessboard");
        if (!isMounted || !boardRef.current) return;

        boardRef.current.innerHTML = '';

        const board = new Chessboard(boardRef.current, {
          position: currentNode.fen,
          orientation: orientation,
          assetsUrl: "https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/",
          style: { animationDuration: 250 },
          responsive: true,
        });

        // 防止 HMR 造成的 resize 異常
        const originalHandleResize = board.view.handleResize;
        board.view.handleResize = function (...args) {
          if (board.state) originalHandleResize.apply(board.view, args);
        };

        if (isMounted) {
          chessboardInstance.current = board;
          setIsBoardReady(true);
        } else {
          board.destroy();
        }
      } catch (err) {
        console.error("棋盤初始化失敗:", err);
      }
    };

    initBoard();

    return () => {
      isMounted = false;
      setIsBoardReady(false);
      if (chessboardInstance.current) {
        try {
          chessboardInstance.current.destroy();
        } catch (e) {
          console.warn(e);
        }
        chessboardInstance.current = null;
      }
    };
  }, [orientation]);

  // 同步盤面位置與滾動條
  useEffect(() => {
    if (isBoardReady && chessboardInstance.current) {
      try {
        if (chessboardInstance.current.view) {
          chessboardInstance.current.setPosition(currentNode.fen, true);
        }
      } catch (e) {
        console.warn("切換位置失敗");
      }
    }

    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('.active-move');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentNodeId, treeData, isBoardReady]);

  // 導航控制
  const handlePrev = () => {
    if (currentNode.parentId) {
      setCurrentNodeId(currentNode.parentId);
    }
  };

  const handleNext = () => {
    if (currentNode.children && currentNode.children.length > 0) {
      // 預設前進到主線（第一個子分支）
      setCurrentNodeId(currentNode.children[0].id);
    }
  };

  // 格式化路徑棋譜顯示（一開始就完整呈現當前線路的所有步伐）
  const renderPathText = () => {
    const fullLine = getFullLineOfCurrentBranch(treeData.nodesMap, treeData.root, currentNodeId);
    
    if (fullLine.length === 0) {
      return <span style={{color: "var(--ifm-color-emphasis-500)", fontSize: "0.9rem"}}>暫無棋步資料</span>;
    }

    return fullLine.map((node) => {
      const isWhite = node.ply % 2 !== 0;
      const moveNum = Math.floor((node.ply - 1) / 2) + 1;
      const prefix = isWhite ? `${moveNum}. ` : "";
      const isActive = currentNodeId === node.id;
      return (
        <span
          key={node.id}
          className={isActive ? "active-move" : ""}
          onClick={() => setCurrentNodeId(node.id)}
          style={{
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "3px",
            marginRight: "6px",
            backgroundColor: isActive ? "#ffcc00" : "transparent",
            color: isActive ? "#000" : "var(--ifm-color-emphasis-900)",
            fontWeight: isActive ? "bold" : "normal",
            display: "inline-block"
          }}
        >
          {prefix}{node.san}
        </span>
      );
    });
  };

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "sans-serif" }}>
      {/* 棋盤容器 */}
      <div
        ref={boardRef}
        style={{
          width: "100%",
          aspectRatio: "1/1",
          marginBottom: "10px",
          overflow: "hidden"
        }}
      />

      {/* 導航控制鈕 */}
      <div style={{ margin: "10px 0", display: "flex", justifyContent: "center", gap: "20px", alignItems: "center" }}>
        <button onClick={handlePrev} disabled={currentNodeId === 'root'} style={{ padding: "6px 18px", cursor: "pointer" }}>&lt; 上一步</button>
        <button onClick={handleNext} disabled={!currentNode.children || currentNode.children.length === 0} style={{ padding: "6px 18px", cursor: "pointer" }}>下一步 &gt;</button>
      </div>

      {/* 互動式分支選擇器 (Lichess Study 靈魂核心) */}
      {currentNode.children && currentNode.children.length > 0 && (
        <div style={{ marginBottom: "12px", padding: "8px", border: "1px dashed var(--ifm-color-emphasis-300)", borderRadius: "4px" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-600)", marginBottom: "4px", fontWeight: "bold" }}>隨後變化分支：</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {currentNode.children.map((child, idx) => (
              <button
                key={child.id}
                onClick={() => setCurrentNodeId(child.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  backgroundColor: idx === 0 ? "var(--ifm-color-emphasis-200)" : "#2563eb",
                  color: idx === 0 ? "var(--ifm-color-emphasis-900)" : "#fff",
                  border: "none",
                  borderRadius: "3px",
                  fontWeight: "bold"
                }}
              >
                {child.san} {idx === 0 ? "(主線)" : `(分支 ${idx})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 當前全線路棋譜呈現 */}
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
          gap: "4px",
          alignItems: "center",
          marginBottom: "12px",
          minHeight: "40px"
        }}
      >
        {renderPathText()}
      </div>

      {/* 實戰戰術文字評註區 */}
      {currentNode.comment && (
        <div style={{
          backgroundColor: "rgba(255, 204, 0, 0.1)",
          borderLeft: "4px solid #ffcc00",
          padding: "10px 14px",
          borderRadius: "0 4px 4px 0",
          fontSize: "0.95rem",
          color: "var(--ifm-color-emphasis-900)",
          fontStyle: "italic",
          lineHeight: "1.5"
        }}>
          💡 <strong>評註：</strong> {currentNode.comment}
        </div>
      )}
    </div>
  );
}

// Docusaurus 安全加載外殼
export default function ChessStudy(props) {
  return (
    <BrowserOnly fallback={<div style={{height: "400px", display: "flex", alignItems: "center", justifyContent: "center"}}>研究面板載入中...</div>}>
      {() => <ChessStudyLogic {...props} />}
    </BrowserOnly>
  );
}

export function ChessStudyWhite({ pgn }) {
  return <ChessStudy pgn={pgn} orientation="w" />;
}

export function ChessStudyBlack({ pgn }) {
  return <ChessStudy pgn={pgn} orientation="b" />;
}