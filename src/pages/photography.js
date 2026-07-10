import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 直接匯入產出的 JSON 檔案
import photosData from '@site/src/data/photosData.json';

// 洗牌算法
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// --- 1. 定義靜態樣式 ---
const galleryTheme = {
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

export default function PhotoGallery() {
  const { siteConfig: { baseUrl } } = useDocusaurusContext();

  const [shuffledPhotos, setShuffledPhotos] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const getFullPath = useCallback((src) => `${baseUrl}${src}`.replace(/\/+/g, '/'), [baseUrl]);

  // 初始化洗牌
  useEffect(() => {
    const randomized = shuffleArray(photosData).map((photo, idx) => ({
      ...photo,
      stableId: `photo-${idx}-${photo.src}`
    }));
    setShuffledPhotos(randomized);
  }, []);

  // 自動預載下一批次的圖片
  useEffect(() => {
    if (shuffledPhotos.length === 0) return;
    const nextBatch = shuffledPhotos.slice(visibleCount, visibleCount + 12);
    nextBatch.forEach((photo) => {
      const img = new Image();
      img.src = getFullPath(photo.src);
    });
  }, [visibleCount, shuffledPhotos, getFullPath]);

  // 取得目前需要顯示的扁平化照片陣列
  const visiblePhotos = useMemo(() => {
    return shuffledPhotos.slice(0, visibleCount);
  }, [shuffledPhotos, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  const closeLightbox = useCallback(() => {
    setSelectedIdx(null);
  }, []);

  const openLightbox = (index) => {
    setSelectedIdx(index);
  };

  const selectedPhoto = selectedIdx !== null ? shuffledPhotos[selectedIdx] : null;

  const showPrevPhoto = useCallback(() => {
    if (selectedIdx > 0) {
      setSelectedIdx(selectedIdx - 1);
    }
  }, [selectedIdx]);

  const showNextPhoto = useCallback(() => {
    if (selectedIdx < shuffledPhotos.length - 1) {
      setSelectedIdx(selectedIdx + 1);
      if (selectedIdx + 1 >= visibleCount) {
        setVisibleCount((prev) => prev + 12);
      }
    }
  }, [selectedIdx, shuffledPhotos.length, visibleCount]);

  // 鎖定/解鎖背景滾動
  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPhoto]);

  // 鍵盤導覽
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showPrevPhoto();
      } else if (e.key === 'ArrowRight') {
        showNextPhoto();
      }
    };
    if (selectedPhoto) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhoto, closeLightbox, showPrevPhoto, showNextPhoto]);

  return (
    <Layout title="攝影集" description="我的攝影作品展示">
      <main style={{ padding: '3rem 0', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
          <h1 style={galleryTheme.headerTitle}>Photography</h1>
          <p style={galleryTheme.headerSub}>Since 2019 • by Shuo Jen</p>
        </div>

        {/* 改用穩定的 CSS Grid 結構，保證加載時上方照片位置絕不動搖 */}
        <div className="gallery-grid">
          {visiblePhotos.map((photo, index) => {
            const photoSrc = getFullPath(photo.src);
            return (
              <div 
                key={photo.stableId} 
                className="photo-card-wrapper"
                style={{ animationDelay: `${(index % 12) * 80}ms` }} // 新批次照片享有每張 80ms 的優雅交錯登場延遲
              >
                <button
                  className="photo-card"
                  onClick={() => openLightbox(index)}
                  aria-label={`放大觀看照片：${photo.title || '無標題'}`}
                >
                  <img
                    src={photoSrc}
                    alt={photo.title || 'Photo'}
                    className="photo-card-img"
                    loading={index < 4 ? "eager" : "lazy"}
                    onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {visibleCount < shuffledPhotos.length && (
          <div style={{ textAlign: 'center', margin: '3rem 0' }}>
            <button className="load-more-btn" onClick={handleLoadMore}>
              Load More
            </button>
          </div>
        )}

        {/* Lightbox 模態框 */}
        {selectedPhoto && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close">
              ×
            </button>
            
            {/* 左右導覽按鈕 */}
            {selectedIdx > 0 && (
              <button 
                className="lightbox-nav-btn prev-btn" 
                onClick={(e) => { e.stopPropagation(); showPrevPhoto(); }}
                aria-label="上一張"
              >
                ‹
              </button>
            )}
            {selectedIdx < shuffledPhotos.length - 1 && (
              <button 
                className="lightbox-nav-btn next-btn" 
                onClick={(e) => { e.stopPropagation(); showNextPhoto(); }}
                aria-label="下一張"
              >
                ›
              </button>
            )}

            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img
                src={getFullPath(selectedPhoto.src)}
                alt={selectedPhoto.title}
                className="lightbox-image"
              />
              <div className="lightbox-caption">
                <Link to={selectedPhoto.link} className="lightbox-link-btn">
                  查看原文記事
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        /* --- 穩定的 CSS Grid 佈局 --- */
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr); /* 預設三欄 */
          gap: 20px;
          max-width: 1600px;
          margin: 40px auto;
          padding: 0 15px;
        }

        .photo-card-wrapper {
          width: 100%;
          /* 採用平滑的 1 秒 ease-out 淡入向上動畫，配合動態延遲，打造高級感 */
          animation: cardEntrance 1s ease-out both; 
        }

        /* 漸入與上滑入場動畫 */
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(25px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .photo-card {
          display: block;
          width: 100%;
          border: none;
          background: rgba(255,255,255,0.05);
          padding: 0;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          transition: transform 0.4s ease-out, box-shadow 0.4s ease-out;
        }

        .photo-card-img {
          width: 100%;
          display: block;
          aspect-ratio: 3 / 2; /* 採用相機標準 3:2 比例，讓網格極度整齊且不跳動 */
          object-fit: cover;
          border-radius: 6px;
          opacity: 0;
          /* 圖片載入完成後的流暢轉場設定 */
          transition: opacity 1s ease-out, transform 0.4s ease-out, filter 0.4s ease;
        }
        
        /* 當圖片實際載入完成時，緩緩浮現 */
        .photo-card-img.is-loaded {
          opacity: 1;
        }

        .photo-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2);
        }
        .photo-card:hover .photo-card-img {
          transform: scale(1.03);
          filter: brightness(1.05);
        }

        .load-more-btn {
          padding: 12px 40px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 0.8rem;
          font-weight: 500;
          background: transparent;
          border: 1px solid var(--ifm-font-color-base);
          color: var(--ifm-font-color-base);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          opacity: 0.7;
        }
        .load-more-btn:hover {
          opacity: 1;
          background: var(--ifm-font-color-base);
          color: var(--ifm-background-color);
          transform: translateY(-2px);
        }

        /* --- Lightbox 樣式 --- */
        .lightbox-overlay {
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
          animation: fadeIn 0.4s forwards;
        }
        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: scale(0.95);
          animation: zoomIn 0.4s forwards 0.1s;
        }
        .lightbox-image {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
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
          background: rgba(0, 0, 0, 0.3);
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
          background: rgba(0, 0, 0, 0.6);
          opacity: 1;
        }
        .prev-btn { left: 30px; }
        .next-btn { right: 30px; }

        .lightbox-caption {
          margin-top: 15px;
        }
        .lightbox-link-btn {
          display: inline-block;
          padding: 8px 20px;
          background-color: rgba(255,255,255,0.2);
          color: #fff !important;
          text-decoration: none !important;
          border-radius: 20px;
          font-size: 0.9rem;
          transition: background-color 0.3s;
          backdrop-filter: blur(5px);
        }
        .lightbox-link-btn:hover {
          background-color: rgba(255,255,255,0.4);
        }

        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes zoomIn { to { transform: scale(1); } }

        /* --- 響應式欄位控制 --- */
        @media (max-width: 1024px) { 
          .gallery-grid {
            grid-template-columns: repeat(2, 1fr); /* 平板雙欄 */
          }
          .lightbox-nav-btn {
            font-size: 3rem;
            width: 50px;
            height: 50px;
          }
          .prev-btn { left: 15px; }
          .next-btn { right: 15px; }
        }
        @media (max-width: 640px) {
          .gallery-grid {
            grid-template-columns: 1fr; /* 手機單欄 */
            padding: 0 20px !important;
          }
          h1 { font-size: 1.8rem !important; letter-spacing: 1px !important; }
          .lightbox-close-btn { top: 10px; right: 15px; font-size: 2.5rem; }
          .lightbox-nav-btn {
            display: none;
          }
        }
      `}</style>
    </Layout>
  );
}