import React, { useState, useMemo, useCallback } from 'react';
import { blogrollLinks } from '@site/src/data/blogrollData.js';

function getDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return urlStr ? urlStr.replace(/^https?:\/\//, '').split('/')[0] : '';
  }
}

function cleanDescription(desc) {
  if (!desc) return '';
  return desc
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function BlogrollGrid() {
  const [search, setSearch] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(null);

  // 搜尋過濾
  const filteredLinks = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return blogrollLinks;

    return blogrollLinks.filter(link => {
      return (
        (link.title && link.title.toLowerCase().includes(q)) ||
        (link.url && link.url.toLowerCase().includes(q)) ||
        (link.description && link.description.toLowerCase().includes(q))
      );
    });
  }, [search]);

  // 複製 RSS 連結
  const handleCopyRss = useCallback((xmlUrl, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!xmlUrl) return;
    navigator.clipboard.writeText(xmlUrl).then(() => {
      setCopiedUrl(xmlUrl);
      setTimeout(() => setCopiedUrl(null), 2000);
    }).catch(() => {
      window.open(xmlUrl, '_blank');
    });
  }, []);

  return (
    <div style={{ marginTop: '20px' }}>
      <style>{`
        .blogroll-controls {
          margin-bottom: 25px;
        }

        .blogroll-search-wrapper {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .blogroll-search-input {
          width: 100%;
          padding: 14px 48px 14px 20px;
          font-size: 1rem;
          border-radius: 30px;
          border: 1px solid var(--ifm-color-emphasis-300);
          background: var(--ifm-background-surface-color);
          color: var(--ifm-font-color-base);
          outline: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .blogroll-search-input:focus {
          border-color: var(--ifm-color-primary);
          box-shadow: 0 4px 16px rgba(var(--ifm-color-primary-rgb), 0.2);
        }

        .blogroll-search-clear {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--ifm-color-emphasis-500);
          cursor: pointer;
          font-size: 1.2rem;
          padding: 4px;
        }

        .blogroll-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .blogroll-card {
          background: var(--ifm-background-surface-color);
          border: 1px solid var(--ifm-color-emphasis-200);
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .blogroll-card:hover {
          transform: translateY(-4px);
          border-color: var(--ifm-color-primary);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
        }

        .blogroll-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .blogroll-favicon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          object-fit: cover;
          background: var(--ifm-color-emphasis-100);
          padding: 2px;
          flex-shrink: 0;
          border: 1px solid var(--ifm-color-emphasis-200);
        }

        .blogroll-card-title-group {
          flex: 1;
          min-width: 0;
        }

        .blogroll-card-title {
          margin: 0 0 4px 0;
          font-size: 1.05rem;
          font-weight: 700;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .blogroll-card-title a {
          color: var(--ifm-font-color-base);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .blogroll-card-title a:hover {
          color: var(--ifm-color-primary);
        }

        .blogroll-domain {
          font-size: 0.8rem;
          color: var(--ifm-color-emphasis-600);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .blogroll-card-body {
          flex: 1;
          margin-bottom: 16px;
        }

        .blogroll-description {
          font-size: 0.88rem;
          color: var(--ifm-color-emphasis-700);
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .blogroll-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid var(--ifm-color-emphasis-100);
          gap: 8px;
        }

        .blogroll-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none !important;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .blogroll-btn-visit {
          background: var(--ifm-color-emphasis-100);
          color: var(--ifm-font-color-base);
        }
        .blogroll-btn-visit:hover {
          background: var(--ifm-color-primary);
          color: #fff;
        }

        .blogroll-btn-rss {
          background: rgba(255, 128, 0, 0.1);
          color: #e67300;
          border: 1px solid rgba(255, 128, 0, 0.2);
        }
        .blogroll-btn-rss:hover {
          background: #e67300;
          color: #fff;
        }

        .blogroll-stats {
          text-align: center;
          margin-bottom: 20px;
          font-size: 0.9rem;
          color: var(--ifm-color-emphasis-600);
        }

        /* 📱 手機版響應式優化 */
        @media (max-width: 600px) {
          .blogroll-controls {
            margin-bottom: 20px;
          }
          .blogroll-search-input {
            padding: 12px 40px 12px 16px;
            font-size: 16px;
          }
          .blogroll-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .blogroll-card {
            padding: 16px;
            border-radius: 12px;
          }
          .blogroll-card-footer {
            gap: 8px;
          }
          .blogroll-btn {
            flex: 1;
            justify-content: center;
            padding: 8px 10px;
            font-size: 0.8rem;
          }
        }
      `}</style>

      {/* 控制列：搜尋 */}
      <div className="blogroll-controls">
        <div className="blogroll-search-wrapper">
          <input
            type="text"
            className="blogroll-search-input"
            placeholder="🔍 搜尋部落格名稱、網址或簡介..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="blogroll-search-clear" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* 收錄統計標籤 */}
      <div className="blogroll-stats">
        共收錄 {blogrollLinks.length} 個部落格
        {filteredLinks.length !== blogrollLinks.length && `（目前顯示 ${filteredLinks.length} 個）`}
      </div>

      {/* 卡片網格 */}
      <div className="blogroll-grid">
        {filteredLinks.map((link, idx) => {
          const domain = getDomain(link.url);
          const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
          const desc = cleanDescription(link.description);

          return (
            <div key={idx} className="blogroll-card">
              <div>
                <div className="blogroll-card-header">
                  <img
                    src={faviconUrl}
                    alt=""
                    className="blogroll-favicon"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌐</text></svg>';
                    }}
                  />
                  <div className="blogroll-card-title-group">
                    <h3 className="blogroll-card-title">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.title}
                      </a>
                    </h3>
                    <span className="blogroll-domain">{domain}</span>
                  </div>
                </div>

                <div className="blogroll-card-body">
                  <p className="blogroll-description">
                    {desc || '這是一個值得探索的個人網站記錄。'}
                  </p>
                </div>
              </div>

              <div className="blogroll-card-footer">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blogroll-btn blogroll-btn-visit"
                >
                  🌐 開啟網站
                </a>
                {link.xmlUrl && (
                  <button
                    className="blogroll-btn blogroll-btn-rss"
                    onClick={(e) => handleCopyRss(link.xmlUrl, e)}
                    title={link.xmlUrl}
                  >
                    {copiedUrl === link.xmlUrl ? '✅ 已複製 RSS' : '📡 複製 RSS'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredLinks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ifm-color-emphasis-600)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>😢 找不到符合條件的部落格</p>
          <p style={{ fontSize: '0.9rem' }}>嘗試清除搜尋關鍵字</p>
        </div>
      )}
    </div>
  );
}
