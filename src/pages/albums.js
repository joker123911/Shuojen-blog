import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 匯入音樂專輯資料
import rawAlbumsData from '@site/src/data/albumsData.json';

// 洗牌算法（Fisher-Yates Shuffle）
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 樣式主題（維持 /photography 同款手寫風格）
const albumsTheme = {
  headerTitle: {
    fontSize: '3.5rem',
    fontWeight: '400',
    fontFamily: '"Rock Salt", cursive',
    letterSpacing: '2px',
    marginBottom: '0.8rem',
    color: 'var(--ifm-font-color-base)',
    whiteSpace: 'nowrap',
  },
  headerSub: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '3px',
    fontWeight: '500',
    color: 'var(--ifm-color-content-secondary)',
    opacity: 0.85,
  }
};

const BATCH_SIZE = 24; // 6 欄佈局下，每批加載 24 張（4 整排）

export default function AlbumsPage() {
  const { siteConfig: { baseUrl } } = useDocusaurusContext();

  const [shuffledAlbums, setShuffledAlbums] = useState([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [selectedIdx, setSelectedIdx] = useState(null);

  // 取得封面靜態資源完整路徑
  const getCoverUrl = useCallback((filename) => {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${cleanBase}Music_Covers/${encodeURIComponent(filename)}`;
  }, [baseUrl]);

  // 初始化洗牌
  useEffect(() => {
    const randomized = shuffleArray(rawAlbumsData).map((album, idx) => ({
      ...album,
      stableId: `album-${idx}-${album.filename}`
    }));
    setShuffledAlbums(randomized);
  }, []);

  // 自動預先加載下一批次的圖片
  useEffect(() => {
    if (shuffledAlbums.length === 0) return;
    const nextBatch = shuffledAlbums.slice(visibleCount, visibleCount + BATCH_SIZE);
    nextBatch.forEach((item) => {
      const img = new Image();
      img.src = getCoverUrl(item.filename);
    });
  }, [visibleCount, shuffledAlbums, getCoverUrl]);

  // 目前需顯示的專輯清單
  const visibleAlbums = useMemo(() => {
    return shuffledAlbums.slice(0, visibleCount);
  }, [shuffledAlbums, visibleCount]);

  const observerTarget = useRef(null);

  // 無限滾動監聽（IntersectionObserver）
  useEffect(() => {
    if (visibleCount >= shuffledAlbums.length || shuffledAlbums.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, shuffledAlbums.length));
        }
      },
      {
        rootMargin: '400px', // 提早 400px 預載，滑動體驗無縫流暢
        threshold: 0.1,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      observer.disconnect();
    };
  }, [visibleCount, shuffledAlbums.length]);

  const closeLightbox = useCallback(() => {
    setSelectedIdx(null);
  }, []);

  const openLightbox = (index) => {
    setSelectedIdx(index);
  };

  const selectedAlbum = selectedIdx !== null ? shuffledAlbums[selectedIdx] : null;

  const showPrevAlbum = useCallback(() => {
    if (selectedIdx > 0) {
      setSelectedIdx(selectedIdx - 1);
    }
  }, [selectedIdx]);

  const showNextAlbum = useCallback(() => {
    if (selectedIdx < shuffledAlbums.length - 1) {
      setSelectedIdx(selectedIdx + 1);
      if (selectedIdx + 1 >= visibleCount) {
        setVisibleCount((prev) => prev + BATCH_SIZE);
      }
    }
  }, [selectedIdx, shuffledAlbums.length, visibleCount]);

  // 鎖定/解鎖背景滾動
  useEffect(() => {
    if (selectedAlbum) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedAlbum]);

  // 鍵盤導覽（Esc 關閉、左右鍵切換）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showPrevAlbum();
      } else if (e.key === 'ArrowRight') {
        showNextAlbum();
      }
    };
    if (selectedAlbum) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAlbum, closeLightbox, showPrevAlbum, showNextAlbum]);

  return (
    <Layout title="專輯" description="我的個人專輯封面牆與音樂收藏">
      <main style={{ padding: '3rem 0', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem', marginTop: '2rem' }}>
          <h1 style={albumsTheme.headerTitle}>Albums</h1>
          <p style={albumsTheme.headerSub}>{rawAlbumsData.length} Albums • From My Shelf</p>
        </div>

        {/* 6 欄高密度黑膠/唱片封面牆 */}
        <div className="album-wall-grid">
          {visibleAlbums.map((item, index) => {
            const coverSrc = getCoverUrl(item.filename);
            return (
              <div 
                key={item.stableId} 
                className="album-card-wrapper"
                style={{ animationDelay: `${(index % BATCH_SIZE) * 35}ms` }}
              >
                <button
                  className="album-card"
                  onClick={() => openLightbox(index)}
                  aria-label={`查看專輯：${item.album} - ${item.artist}`}
                  title={`${item.album} - ${item.artist}`}
                >
                  <img
                    src={coverSrc}
                    alt={`${item.album} - ${item.artist}`}
                    className="album-card-img"
                    loading={index < 12 ? "eager" : "lazy"}
                    ref={(img) => {
                      if (img && img.complete) {
                        img.classList.add('is-loaded');
                      }
                    }}
                    onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* 無限滾動觸發目標 */}
        {visibleCount < shuffledAlbums.length && (
          <div 
            ref={observerTarget} 
            style={{ 
              height: '60px', 
              margin: '2rem 0',
              pointerEvents: 'none',
              visibility: 'hidden'
            }} 
          />
        )}


        {/* Lightbox 模態框 */}
        {selectedAlbum && (
          <div className="album-lightbox-overlay" onClick={closeLightbox}>
            <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="關閉">
              ×
            </button>
            
            {/* 左右導覽按鈕 */}
            {selectedIdx > 0 && (
              <button 
                className="lightbox-nav-btn prev-btn" 
                onClick={(e) => { e.stopPropagation(); showPrevAlbum(); }}
                aria-label="上一張"
              >
                ‹
              </button>
            )}
            {selectedIdx < shuffledAlbums.length - 1 && (
              <button 
                className="lightbox-nav-btn next-btn" 
                onClick={(e) => { e.stopPropagation(); showNextAlbum(); }}
                aria-label="下一張"
              >
                ›
              </button>
            )}

            <div className="album-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <div className="lightbox-image-container">
                <img
                  src={getCoverUrl(selectedAlbum.filename)}
                  alt={selectedAlbum.album}
                  className="lightbox-album-cover"
                />
              </div>

              {/* 專輯資訊區塊 */}
              <div className="lightbox-info">
                <h2 className="album-info-title">{selectedAlbum.album}</h2>
                <div className="album-info-artist">{selectedAlbum.artist}</div>

                {/* 選填中繼資料（若存在才顯示） */}
                {(selectedAlbum.year || selectedAlbum.score) && (
                  <div className="album-meta-row">
                    {selectedAlbum.year && (
                      <span className="album-meta-tag year-tag">{selectedAlbum.year}</span>
                    )}
                    {selectedAlbum.score && (
                      <span className="album-meta-tag score-tag">★ {selectedAlbum.score}</span>
                    )}
                  </div>
                )}

                {selectedAlbum.note && (
                  <p className="album-info-note">{selectedAlbum.note}</p>
                )}

                {selectedAlbum.spotify && (
                  <div className="album-actions">
                    <a 
                      href={selectedAlbum.spotify} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="lightbox-spotify-btn"
                    >
                      在 Spotify 聆聽 ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        /* --- 6 欄高密度唱片封面牆 CSS Grid 佈局 --- */
        .album-wall-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          max-width: 1600px;
          margin: 30px auto;
          padding: 0 20px;
        }

        .album-card-wrapper {
          width: 100%;
          animation: cardEntrance 0.8s ease-out both;
        }

        /* 漸入與上滑登場動畫 */
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .album-card {
          display: block;
          width: 100%;
          border: none;
          background: rgba(255, 255, 255, 0.04);
          padding: 0;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
          transition: transform 0.35s ease-out, box-shadow 0.35s ease-out;
        }

        .album-card-img {
          width: 100%;
          display: block;
          aspect-ratio: 1 / 1; /* 正方形黑膠/CD封面標準比例 */
          object-fit: cover;
          border-radius: 6px;
          opacity: 0;
          transition: opacity 0.8s ease-out, transform 0.35s ease-out, filter 0.35s ease;
        }
        
        .album-card-img.is-loaded {
          opacity: 1;
        }

        .album-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
        }
        .album-card:hover .album-card-img {
          transform: scale(1.025);
          filter: brightness(1.04);
        }

        /* Load More 按鈕（比照 /photography） */
        .load-more-btn {
          padding: 12px 42px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 0.85rem;
          font-weight: 500;
          background: transparent;
          border: 1px solid var(--ifm-font-color-base);
          color: var(--ifm-font-color-base);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          opacity: 0.75;
        }
        .load-more-btn:hover {
          opacity: 1;
          background: var(--ifm-font-color-base);
          color: var(--ifm-background-color);
          transform: translateY(-2px);
        }

        /* --- Lightbox 燈箱模態框 --- */
        .album-lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.92);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          opacity: 0;
          animation: fadeIn 0.3s forwards;
          backdrop-filter: blur(8px);
        }

        .album-lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: scale(0.96);
          animation: zoomIn 0.3s forwards 0.05s;
          text-align: center;
        }

        .lightbox-image-container {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .lightbox-album-cover {
          width: min(72vw, 65vh, 480px);
          height: min(72vw, 65vh, 480px);
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 6px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }

        .lightbox-info {
          margin-top: 18px;
          max-width: 500px;
          padding: 0 15px;
        }

        .album-info-title {
          color: #fff;
          font-size: 1.35rem;
          font-weight: 600;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
          line-height: 1.3;
        }

        .album-info-artist {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.05rem;
          font-weight: 400;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }

        .album-meta-row {
          display: flex;
          gap: 8px;
          justify-content: center;
          align-items: center;
          margin-bottom: 12px;
        }

        .album-meta-tag {
          font-size: 0.75rem;
          padding: 2px 10px;
          border-radius: 12px;
          font-weight: 600;
        }
        .year-tag {
          background: rgba(255, 255, 255, 0.15);
          color: #e0e0e0;
        }
        .score-tag {
          background: rgba(255, 193, 7, 0.2);
          color: #ffc107;
        }

        .album-info-note {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 14px;
        }

        .lightbox-spotify-btn {
          display: inline-block;
          padding: 8px 24px;
          background-color: rgba(29, 185, 84, 0.85);
          color: #fff !important;
          text-decoration: none !important;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          transition: background-color 0.25s, transform 0.2s;
        }
        .lightbox-spotify-btn:hover {
          background-color: rgba(29, 185, 84, 1);
          transform: scale(1.04);
        }

        .lightbox-close-btn {
          position: absolute;
          top: 20px;
          right: 30px;
          background: none;
          border: none;
          color: #fff;
          font-size: 3rem;
          line-height: 1;
          cursor: pointer;
          z-index: 2001;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .lightbox-close-btn:hover { opacity: 1; }

        .lightbox-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.35);
          border: none;
          color: white;
          font-size: 4rem;
          padding: 10px 20px;
          cursor: pointer;
          z-index: 2005;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, opacity 0.2s;
          opacity: 0.6;
        }
        .lightbox-nav-btn:hover {
          background: rgba(0, 0, 0, 0.65);
          opacity: 1;
        }
        .prev-btn { left: 30px; }
        .next-btn { right: 30px; }

        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes zoomIn { to { transform: scale(1); } }

        /* --- 響應式欄位控制 --- */
        @media (max-width: 1400px) {
          .album-wall-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        @media (max-width: 1100px) {
          .album-wall-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .lightbox-nav-btn {
            font-size: 3rem;
            width: 50px;
            height: 50px;
          }
          .prev-btn { left: 15px; }
          .next-btn { right: 15px; }
        }
        @media (max-width: 768px) {
          .album-wall-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            padding: 0 15px;
          }
        }
        @media (max-width: 480px) {
          .album-wall-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            padding: 0 12px;
          }
          h1 { font-size: 2.2rem !important; letter-spacing: 1px !important; }
          .lightbox-close-btn { top: 10px; right: 15px; font-size: 2.5rem; }
          .lightbox-nav-btn { display: none; }
        }
      `}</style>
    </Layout>
  );
}
