import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useLocation, useHistory } from '@docusaurus/router';

const PAGE_SIZE = 15;
const CATEGORIES = [
  { id: 'ALL', label: '全部' },
  { id: '貼文', label: '貼文' },
  { id: '攝影', label: '攝影' },
  { id: '興趣', label: '興趣' },
  { id: '留言', label: '留言區' },
];

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatCommentDate(dateStr) {
  if (!dateStr) return '';
  const match = String(dateStr).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

function highlightText(text, escapedKeywords) {
  if (!text) return '';
  if (!escapedKeywords || escapedKeywords.length === 0) return text;

  const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
  return text.split(regex).map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        style={{
          backgroundColor: 'rgba(255, 214, 0, 0.45)',
          color: 'inherit',
          padding: '0 2px',
          borderRadius: '2px',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function SearchPage() {
  const location = useLocation();
  const history = useHistory();
  const searchIndexUrl = useBaseUrl('/search-index.json');

  const urlQuery = useMemo(() => {
    return (new URLSearchParams(location.search).get('q') || '').trim();
  }, [location.search]);

  const [inputVal, setInputVal] = useState(urlQuery);
  const [indexData, setIndexData] = useState([]);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedType, setSelectedType] = useState('ALL');
  const [page, setPage] = useState(1);
  const inputRef = useRef(null);

  // 1. 載入靜態索引，並背景非同步更新即時留言
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setLoadingIndex(true);
    setLoadError(false);

    fetch(searchIndexUrl, { signal })
      .then((res) => {
        if (!res.ok) throw new Error('Search index response was not ok');
        return res.json();
      })
      .then((data) => {
        if (signal.aborted) return;
        setIndexData(Array.isArray(data) ? data : []);
        setLoadingIndex(false);

        // 背景向 Worker 抓取最新留言進行即時增量更新
        fetch('https://blog-comments-api.joker123911.workers.dev', { signal })
          .then((r) => (r.ok ? r.json() : null))
          .then((comments) => {
            if (signal.aborted || !Array.isArray(comments)) return;
            const liveComments = comments.map((c) => {
              const postName = c.title || (c.slug === '/guestbook' ? '留言板' : c.slug);
              const replyPart = c.replyContent ? ` (站長回覆: ${c.replyContent})` : '';
              return {
                id: `comment-${c.id}`,
                title: `💬 ${c.name} 於《${postName}》`,
                date: formatCommentDate(c.time),
                url: c.slug || '/guestbook',
                type: '留言',
                content: `${c.content || ''}${replyPart}`,
              };
            });

            setIndexData((prev) => {
              const nonComments = prev.filter((item) => item.type !== '留言');
              return [...nonComments, ...liveComments];
            });
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (signal.aborted) return;
        console.error('無法載入搜尋索引:', err);
        setLoadError(true);
        setLoadingIndex(false);
      });

    return () => controller.abort();
  }, [searchIndexUrl]);

  // 2. 當瀏覽器上一頁/下一頁改變 URL query 時，同步回 input 狀態
  useEffect(() => {
    setInputVal(urlQuery);
    setPage(1);
  }, [urlQuery]);

  // 3. 輸入防抖（Debounce）：打字停頓 250ms 後自動同步 URL 並觸發搜尋
  useEffect(() => {
    const trimmed = inputVal.trim();
    if (trimmed === urlQuery) return;

    const timer = setTimeout(() => {
      if (trimmed) {
        history.replace(`${location.pathname}?q=${encodeURIComponent(trimmed)}`);
      } else {
        history.replace(location.pathname);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputVal, urlQuery, history, location.pathname]);

  // 4. 初始焦點鎖定
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 使用目前有效關鍵字（優先採用即時輸入值，讓打字與切換分類零延遲）
  const activeQuery = inputVal.trim();

  const activeKeywords = useMemo(() => {
    if (!activeQuery) return [];
    return activeQuery
      .toLowerCase()
      .split(/\s+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [activeQuery]);

  const escapedKeywords = useMemo(() => {
    return activeKeywords.map(escapeRegExp).filter(Boolean);
  }, [activeKeywords]);

  // 5. 先依關鍵字篩選並計算相關性權重排序（供各分類統計數量與最終顯示共用）
  const allKeywordMatches = useMemo(() => {
    if (activeKeywords.length === 0 || indexData.length === 0) return [];

    const scored = [];
    for (const article of indexData) {
      const titleLower = (article.title || '').toLowerCase();
      const contentLower = (article.content || '').toLowerCase();
      const fullText = `${titleLower} ${contentLower}`;

      if (!activeKeywords.every((kw) => fullText.includes(kw))) {
        continue;
      }

      // 計算相關性分數：標題完整命中 > 標題含關鍵字 > 內文命中
      let score = 0;
      if (titleLower === activeQuery.toLowerCase()) {
        score += 100;
      }
      for (const kw of activeKeywords) {
        if (titleLower.includes(kw)) score += 25;
        if (contentLower.includes(kw)) score += 5;
      }

      scored.push({ article, score });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.article.date || '').localeCompare(a.article.date || '');
    });

    return scored.map((item) => item.article);
  }, [activeKeywords, activeQuery, indexData]);

  // 各分類命中筆數統計
  const categoryCounts = useMemo(() => {
    const counts = { ALL: allKeywordMatches.length };
    for (const item of allKeywordMatches) {
      if (item.type) {
        counts[item.type] = (counts[item.type] || 0) + 1;
      }
    }
    return counts;
  }, [allKeywordMatches]);

  // 依目前選擇的分類過濾結果
  const matchedResults = useMemo(() => {
    if (selectedType === 'ALL') return allKeywordMatches;
    return allKeywordMatches.filter((item) => item.type === selectedType);
  }, [allKeywordMatches, selectedType]);

  const visibleResults = useMemo(() => {
    return matchedResults.slice(0, page * PAGE_SIZE);
  }, [matchedResults, page]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const q = inputVal.trim();
    if (q) {
      history.replace(`${location.pathname}?q=${encodeURIComponent(q)}`);
    } else {
      history.replace(location.pathname);
    }
  };

  const handleClear = () => {
    setInputVal('');
    setPage(1);
    history.replace(location.pathname);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // 產生摘要與標記高亮
  const renderSnippet = (content) => {
    if (!content) return '';
    if (activeKeywords.length === 0) {
      return content.slice(0, 140) + (content.length > 140 ? '…' : '');
    }

    const lowerContent = content.toLowerCase();
    let firstIndex = -1;
    for (const kw of activeKeywords) {
      const idx = lowerContent.indexOf(kw);
      if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
        firstIndex = idx;
      }
    }

    const start = firstIndex === -1 ? 0 : Math.max(0, firstIndex - 30);
    const end = Math.min(content.length, start + 140);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < content.length) snippet = snippet + '…';

    return highlightText(snippet, escapedKeywords);
  };

  return (
    <Layout
      title={activeQuery ? `搜尋「${activeQuery}」` : '站內搜尋'}
      description="站內全文搜尋文章、攝影集與筆記"
    >
      <div className="container margin-vert--lg" style={{ maxWidth: '820px' }}>
        <h1 style={{ marginBottom: '1.2rem' }}>站內搜尋</h1>

        {/* 搜尋列 */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && inputVal) {
                  handleClear();
                }
              }}
              placeholder="輸入關鍵字（空白分隔多個詞進行比對）..."
              style={{
                width: '100%',
                padding: '0.65rem 2.2rem 0.65rem 1rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--ifm-color-emphasis-300)',
                backgroundColor: 'var(--ifm-background-color)',
                color: 'var(--ifm-font-color-base)',
                outline: 'none',
              }}
            />
            {inputVal && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ifm-color-emphasis-500)',
                  fontSize: '1.1rem',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="button button--primary" style={{ padding: '0.65rem 1.4rem' }}>
            搜尋
          </button>
        </form>

        {/* 分類標籤過濾 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                className={`button button--sm ${
                  selectedType === cat.id ? 'button--secondary' : 'button--outline button--secondary'
                }`}
                onClick={() => {
                  setSelectedType(cat.id);
                  setPage(1);
                }}
                style={{
                  borderRadius: '16px',
                  fontWeight: selectedType === cat.id ? 'bold' : 'normal',
                }}
              >
                {activeQuery ? `${cat.label} (${count})` : cat.label}
              </button>
            );
          })}
        </div>

        {/* 提示訊息 */}
        {loadingIndex && <p style={{ color: 'var(--ifm-color-emphasis-600)' }}>搜尋索引載入中……</p>}

        {loadError && (
          <p style={{ color: 'var(--ifm-color-danger)' }}>
            ⚠️ 搜尋索引載入失敗，請重新整理頁面再試一次。
          </p>
        )}

        {!loadingIndex && !loadError && activeQuery && (
          <div
            style={{
              padding: '0.6rem 0',
              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
              marginBottom: '1rem',
              color: 'var(--ifm-color-emphasis-700)',
            }}
          >
            {matchedResults.length === 0 ? (
              <span>
                在目前分類中找不到包含「<strong>{activeQuery}</strong>」的內容
                {selectedType !== 'ALL' && allKeywordMatches.length > 0 && (
                  <>
                    （其他分類共有 <strong>{allKeywordMatches.length}</strong> 筆結果，點選「
                    <button
                      type="button"
                      onClick={() => setSelectedType('ALL')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--ifm-color-primary)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: 'inherit',
                      }}
                    >
                      全部
                    </button>
                    」查看）
                  </>
                )}
                。
              </span>
            ) : (
              <span>
                找到 <strong>{matchedResults.length}</strong> 筆包含「<strong>{activeQuery}</strong>」的結果：
              </span>
            )}
          </div>
        )}

        {/* 搜尋結果清單 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {visibleResults.map((item) => (
            <article
              key={item.id || item.url}
              style={{
                padding: '1rem 0',
                borderBottom: '1px solid var(--ifm-color-emphasis-200)',
              }}
            >
              <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem' }}>
                <Link to={item.url} style={{ textDecoration: 'none' }}>
                  {highlightText(item.title, escapedKeywords)}
                </Link>
              </h3>
              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--ifm-color-emphasis-600)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    backgroundColor:
                      item.type === '留言' ? 'rgba(0, 112, 243, 0.12)' : 'var(--ifm-color-emphasis-200)',
                    color: item.type === '留言' ? 'var(--ifm-color-primary)' : 'inherit',
                    fontWeight: item.type === '留言' ? '600' : 'normal',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}
                >
                  {item.type}
                </span>
                {item.date && <span>{item.date}</span>}
                <span>·</span>
                <span style={{ opacity: 0.7 }}>{item.url}</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  color: 'var(--ifm-color-emphasis-800)',
                }}
              >
                {renderSnippet(item.content)}
              </p>
            </article>
          ))}
        </div>

        {/* 載入更多按鈕 */}
        {visibleResults.length < matchedResults.length && (
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={handleLoadMore}
              style={{ minWidth: '160px' }}
            >
              載入更多（已顯示 {visibleResults.length} / {matchedResults.length}）
            </button>
          </div>
        )}

        {!activeQuery && !loadingIndex && !loadError && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--ifm-color-emphasis-500)',
            }}
          >
            <p style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>
              💡 中文全文逐字檢索，支援多關鍵字（用空白隔開）
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              可檢索全站部落格貼文、攝影集、興趣清單與讀者留言。
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}