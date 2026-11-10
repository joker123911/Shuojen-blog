import React, { useEffect, useRef, useState, useMemo } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import ChessgroundBoard from './ChessgroundBoard';
import { parsePgnToStudyTree, START_FEN } from './pgnParser';
import styles from './ChessStudy.module.css';

function renderBranch(node, currentNodeId, onSelect, needMoveNumber = true) {
  if (!node) return null;
  const isWhite = node.ply % 2 !== 0;
  const turnNum = Math.floor((node.ply - 1) / 2) + 1;
  const prefix = isWhite
    ? `${turnNum}. `
    : needMoveNumber
    ? `${turnNum}... `
    : '';

  const isActive = currentNodeId === node.id;
  const mainlineChild = node.children && node.children.length > 0 ? node.children[0] : null;
  const variations = node.children && node.children.length > 1 ? node.children.slice(1) : [];

  return (
    <React.Fragment key={node.id}>
      <span
        className={`${styles.moveToken} ${isActive ? styles.moveTokenActive : ''}`}
        onClick={() => onSelect(node.id)}
        role="button"
        tabIndex={0}
      >
        {prefix}{node.san}
        {node.nag && <span className={styles.moveNag}>{node.nag}</span>}
      </span>
      {variations.length > 0 &&
        variations.map((vNode) => (
          <span key={vNode.id} className={styles.variationBlock}>
            ({renderBranch(vNode, currentNodeId, onSelect, true)})
          </span>
        ))}
      {mainlineChild && renderBranch(mainlineChild, currentNodeId, onSelect, isWhite ? false : true)}
    </React.Fragment>
  );
}

function ChessStudyLogic({
  pgn,
  orientation = 'w',
  title = '',
}) {
  const defaultOrientation = orientation === 'b' || orientation === 'black' ? 'black' : 'white';
  const [boardOrientation, setBoardOrientation] = useState(defaultOrientation);
  const moveTreeContainerRef = useRef(null);

  // Parse PGN to Tree
  const treeData = useMemo(() => parsePgnToStudyTree(pgn), [pgn]);
  const [currentNodeId, setCurrentNodeId] = useState('root');

  // Reset when pgn changes
  useEffect(() => {
    setCurrentNodeId('root');
  }, [pgn]);

  const currentNode = treeData.nodesMap[currentNodeId] || treeData.root;

  // Auto-scroll move tree to keep active token visible
  useEffect(() => {
    if (moveTreeContainerRef.current) {
      const activeEl = moveTreeContainerRef.current.querySelector(`.${styles.moveTokenActive}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentNodeId]);

  // Keyboard navigation (Left / Right / Up / Down)
  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentNode.parentId) {
          setCurrentNodeId(currentNode.parentId);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentNode.children && currentNode.children.length > 0) {
          setCurrentNodeId(currentNode.children[0].id);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNode]);

  // Controls
  const handleFirst = () => setCurrentNodeId('root');

  const handlePrev = () => {
    if (currentNode.parentId) {
      setCurrentNodeId(currentNode.parentId);
    }
  };

  const handleNext = () => {
    if (currentNode.children && currentNode.children.length > 0) {
      setCurrentNodeId(currentNode.children[0].id);
    }
  };

  const handleLast = () => {
    let curr = currentNode;
    while (curr.children && curr.children.length > 0) {
      curr = curr.children[0];
    }
    setCurrentNodeId(curr.id);
  };

  const handleFlip = () => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const lastMove = currentNode.from && currentNode.to ? [currentNode.from, currentNode.to] : undefined;
  const isAtRoot = currentNodeId === 'root';
  const hasNext = currentNode.children && currentNode.children.length > 0;

  return (
    <div className={styles.studyCard}>
      {/* Header bar */}
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <span>♟️</span>
          <span>{title || (boardOrientation === 'black' ? '黑方開局研究' : '白方開局研究')}</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.headerBtn}
            onClick={handleFlip}
            title="翻轉棋盤視角"
          >
            🔄 翻轉
          </button>
          <button
            className={styles.headerBtn}
            onClick={handleFirst}
            title="回到初始局面"
          >
            ⏮ 重設
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className={styles.studyBody}>
        {/* Left Column: Board & Navigation */}
        <div className={styles.boardCol}>
          <ChessgroundBoard
            fen={currentNode.fen || START_FEN}
            orientation={boardOrientation}
            lastMove={lastMove}
            shapes={currentNode.shapes || []}
          />

          <div className={styles.boardControls}>
            <div className={styles.navGroup}>
              <button
                className={styles.navBtn}
                onClick={handleFirst}
                disabled={isAtRoot}
                title="第一步 (起手盤面)"
              >
                |◀
              </button>
              <button
                className={styles.navBtn}
                onClick={handlePrev}
                disabled={isAtRoot}
                title="上一步 (方向鍵左)"
              >
                ◀
              </button>
              <button
                className={styles.navBtn}
                onClick={handleNext}
                disabled={!hasNext}
                title="下一步 (方向鍵右)"
              >
                ▶
              </button>
              <button
                className={styles.navBtn}
                onClick={handleLast}
                disabled={!hasNext}
                title="走到當前主線最後一步"
              >
                ▶|
              </button>
            </div>

            <div className={styles.stepIndicator}>
              {isAtRoot ? '起始' : `第 ${currentNode.ply} 著`}
            </div>
          </div>
        </div>

        {/* Right Column: Move Tree, Branches & Commentary */}
        <div className={styles.infoCol}>
          {/* Branch selector if multiple branches exist */}
          {currentNode.children && currentNode.children.length > 1 && (
            <div className={styles.branchesSection}>
              <div className={styles.sectionTitle}>隨後分支選擇：</div>
              <div className={styles.branchChips}>
                {currentNode.children.map((child, idx) => (
                  <button
                    key={child.id}
                    className={`${styles.branchChip} ${idx === 0 ? styles.branchChipMain : styles.branchChipVar}`}
                    onClick={() => setCurrentNodeId(child.id)}
                  >
                    {child.san}{child.nag} {idx === 0 ? '(主線)' : `(分支 ${idx})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full Move Tree view */}
          <div>
            <div className={styles.sectionTitle}>著法分支樹：</div>
            <div ref={moveTreeContainerRef} className={styles.moveTreeContainer}>
              {treeData.root.children.length === 0 ? (
                <span style={{ color: 'var(--ifm-color-emphasis-500)' }}>暫無棋步資料</span>
              ) : (
                treeData.root.children.map((rootChild) =>
                  renderBranch(rootChild, currentNodeId, setCurrentNodeId, true)
                )
              )}
            </div>
          </div>

          {/* Commentary & Tactical Notes */}
          {currentNode.comment && (
            <div className={styles.commentCard}>
              <div className={styles.commentHeader}>
                💡 戰術評註
              </div>
              <div className={styles.commentBody}>
                {currentNode.comment}
              </div>
              {currentNode.shapes && currentNode.shapes.length > 0 && (
                <div className={styles.shapesBadge}>
                  🎯 盤面已標記戰術箭頭與關鍵格
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChessStudy(props) {
  return (
    <BrowserOnly
      fallback={
        <div
          style={{
            height: '380px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--ifm-color-emphasis-100)',
            borderRadius: '12px',
            color: 'var(--ifm-color-emphasis-600)',
          }}
        >
          ♟️ 研究面板載入中...
        </div>
      }
    >
      {() => <ChessStudyLogic {...props} />}
    </BrowserOnly>
  );
}

export function ChessStudyWhite(props) {
  return <ChessStudy {...props} orientation="w" />;
}

export function ChessStudyBlack(props) {
  return <ChessStudy {...props} orientation="b" />;
}
