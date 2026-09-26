import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { useLocation, useHistory } from '@docusaurus/router';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const [selectedType, setSelectedType] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const inputRef = useRef(null);

function formatCommentDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  const match = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [_, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateStr;
}

  // 1. 載入靜態索引，並背景非同步更新即時留言
  useEffect(() => {
    fetch(searchIndexUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Search index response was not ok');
        return res.json();
      })
      .then((data) => {
        setIndexData(data);
        setLoadingIndex(false);

        // 背景向 Worker 抓取最新留言進行即時增量更新
        fetch('https://blog-comments-api.joker123911.workers.dev')
          .then((r) => r.json())
          .then((comments) => {
            if (Array.isArray(comments)) {
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
            }
          })
          .catch(() => {});
      })
      .catch((err) => {
        console.error('無法載入搜尋索引:', err);
        setLoadingIndex(false);
      });
  }, [searchIndexUrl]);

  // 2. 當 URL query 改變時同步 input 狀態
  useEffect(() => {
    setInputVal(urlQuery);
    setPage(1);
  }, [urlQuery]);

  // 3. 焦點鎖定
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 4. 計算檢索結果
  const matchedResults = useMemo(() => {
    if (!urlQuery || indexData.length === 0) return [];

    const keywords = urlQuery
      .toLowerCase()
      .split(/\s+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) return [];

    return indexData.filter((article) => {
      // 類別篩選
      if (selectedType !== 'ALL' && article.type !== selectedType) {
        return false;
      }

      // 標題與內文比對（必須包含所有關鍵字）
      const fullText = `${article.title || ''} ${article.content || ''}`.toLowerCase();
      return keywords.every((kw) => fullText.includes(kw));
    });
  }, [urlQuery, indexData, selectedType]);

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
    history.replace(location.pathname);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const activeKeywords = useMemo(() => {
    return urlQuery.toLowerCase().split(/\s+/).filter(Boolean);
  }, [urlQuery]);

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

    const start = Math.max(0, firstIndex - 30);
    const end = Math.min(content.length, start + 140);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < content.length) snippet = snippet + '…';

    const escapedKeywords = activeKeywords.map(escapeRegExp).filter(Boolean);
    if (escapedKeywords.length === 0) return snippet;

    const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');
    return snippet.split(regex).map((part, i) =>
      regex.test(part) ? (
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
  };

  return (
    <Layout
      title={urlQuery ? `搜尋「${urlQuery}」` : '站內搜尋'}
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
              type="search"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
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
          {[
            { id: 'ALL', label: '全部' },
            { id: '貼文', label: '貼文' },
            { id: '攝影', label: '攝影' },
            { id: '興趣', label: '興趣' },
            { id: '留言', label: '留言區' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`button button--sm ${selectedType === cat.id ? 'button--secondary' : 'button--outline button--secondary'}`}
              onClick={() => {
                setSelectedType(cat.id);
                setPage(1);
              }}
              style={{
                borderRadius: '16px',
                fontWeight: selectedType === cat.id ? 'bold' : 'normal',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 提示訊息 */}
        {loadingIndex && <p style={{ color: 'var(--ifm-color-emphasis-600)' }}>搜尋索引載入中……</p>}

        {!loadingIndex && urlQuery && (
          <div
            style={{
              padding: '0.6rem 0',
              borderBottom: '1px solid var(--ifm-color-emphasis-200)',
              marginBottom: '1rem',
              color: 'var(--ifm-color-emphasis-700)',
            }}
          >
            {matchedResults.length === 0 ? (
              <span>找不到包含「<strong>{urlQuery}</strong>」的內容。</span>
            ) : (
              <span>
                找到 <strong>{matchedResults.length}</strong> 筆包含「<strong>{urlQuery}</strong>」的結果：
              </span>
            )}
          </div>
        )}

        {/* 搜尋結果清單 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {visibleResults.map((item) => (
            <article
              key={item.id}
              style={{
                padding: '1rem 0',
                borderBottom: '1px solid var(--ifm-color-emphasis-200)',
              }}
            >
              <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem' }}>
                <Link to={item.url} style={{ textDecoration: 'none' }}>
                  {item.title}
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
                    backgroundColor: item.type === '留言' ? 'rgba(0, 112, 243, 0.12)' : 'var(--ifm-color-emphasis-200)',
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

        {!urlQuery && !loadingIndex && (
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
