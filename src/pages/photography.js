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

export default function PhotoGallery() {
  const { siteConfig: { baseUrl } } = useDocusaurusContext();

  // --- 1. 定義樣式 ---
  const galleryTheme = {
    flexContainer: {
      maxWidth: '1600px',
      margin: '40px auto',
      padding: '0 10px',
      display: 'flex',
      gap: '15px',
      alignItems: 'flex-start',
    },
    column: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
    },
    photoItem: {
      width: '100%',
      borderRadius: '6px',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.05)',
      cursor: 'pointer', // 改為手指鼠標
    },
    img: {
      width: '100%',
      display: 'block',
      borderRadius: '6px',
    },
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

  // --- 2. 狀態與邏輯 ---
  const [shuffledPhotos, setShuffledPhotos] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  // [新增] 記錄當前選中要放大的照片
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // 初始化洗牌
  useEffect(() => {
    const randomized = shuffleArray(photosData).map((photo, idx) => ({
      ...photo,
      stableId: `photo-${idx}-${photo.src}`
    }));
    setShuffledPhotos(randomized);
  }, []);

  const visiblePhotos = useMemo(() => {
    return shuffledPhotos.slice(0, visibleCount);
  }, [shuffledPhotos, visibleCount]);

  // 分欄邏輯
  const columns = useMemo(() => {
    const cols = [[], [], []];
    visiblePhotos.forEach((photo, index) => {
      cols[index % 3].push(photo);
    });
    return cols;
  }, [visiblePhotos]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  // [新增] 關閉 Lightbox 的函數
  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null);
    document.body.style.overflow = 'auto'; // 恢復背景滾動
  }, []);

  // [新增] 開啟 Lightbox 的函數
  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
    document.body.style.overflow = 'hidden'; // 鎖定背景滾動
  };

  // [新增] 監聽鍵盤事件 (Esc 關閉)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    };
    if (selectedPhoto) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhoto, closeLightbox]);

  // 輔助函數：產生完整圖片路徑
  const getFullPath = (src) => `${baseUrl}${src}`.replace(/\/+/g, '/');

  return (
    <Layout title="攝影作品集" description="我的攝影作品展示">
      <main style={{ padding: '3rem 0', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
          <h1 style={galleryTheme.headerTitle}>Photography</h1>
          <p style={galleryTheme.headerSub}>Since 2019 • by Shuo Jen</p>
        </div>

        <div className="masonry-flex-container" style={galleryTheme.flexContainer}>
          {columns.map((colPhotos, colIdx) => (
            <div key={`col-${colIdx}`} className={`masonry-column col-${colIdx}`} style={galleryTheme.column}>
              {colPhotos.map((photo) => {
                const photoSrc = getFullPath(photo.src);
                return (
                  // [修改] 將 Link 改為 div，並加入 onClick 事件
                  <div
                    key={photo.stableId}
                    style={galleryTheme.photoItem}
                    className="photo-card"
                    onClick={() => openLightbox(photo)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && openLightbox(photo)}
                  >
                    <img
                      src={photoSrc}
                      alt={photo.title || 'Photo'}
                      style={galleryTheme.img}
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {visibleCount < shuffledPhotos.length && (
          <div style={{ textAlign: 'center', margin: '3rem 0' }}>
            <button className="load-more-btn" onClick={handleLoadMore}>
              Load More
            </button>
          </div>
        )}

        {/* [新增] Lightbox 模態框結構 */}
        {selectedPhoto && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close">
              ×
            </button>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img
                src={getFullPath(selectedPhoto.src)}
                alt={selectedPhoto.title}
                className="lightbox-image"
              />
              <div className="lightbox-caption">
                 {/* 在燈箱中提供前往原文的按鈕 */}
                <Link to={selectedPhoto.link} className="lightbox-link-btn">
                  查看原文記事
                </Link>
              </div>
            </div>
          </div>
        )}

      </main>

      <style>{`
        /* --- 原有樣式 --- */
        .photo-card, .photo-card img { border-radius: 6px !important; }
        .photo-card {
          transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          position: relative;
        }
        .photo-card img { transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), filter 0.6s ease; }
        .photo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2);
          z-index: 10;
        }
        .photo-card:hover img { transform: scale(1.03); filter: brightness(1.08); }
        .load-more-btn {
          padding: 12px 40px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; font-weight: 500;
          background: transparent; border: 1px solid var(--ifm-font-color-base); color: var(--ifm-font-color-base);
          border-radius: 4px; cursor: pointer; transition: all 0.3s ease; opacity: 0.7;
        }
        .load-more-btn:hover {
          opacity: 1; background: var(--ifm-font-color-base); color: var(--ifm-background-color); transform: translateY(-2px);
        }

        /* --- [新增] Lightbox 樣式 --- */
        .lightbox-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background-color: rgba(0, 0, 0, 0.92); /* 深色半透明背景 */
          display: flex; justify-content: center; align-items: center;
          z-index: 2000; /* 確保在最上層 (比 navbar 高) */
          opacity: 0; animation: fadeIn 0.3s forwards;
        }
        .lightbox-content {
          position: relative; max-width: 90vw; max-height: 90vh;
          display: flex; flex-direction: column; align-items: center;
          transform: scale(0.95); animation: zoomIn 0.3s forwards 0.1s;
        }
        .lightbox-image {
          max-width: 100%; max-height: 85vh; /* 留點空間給下方的按鈕 */
          object-fit: contain; border-radius: 4px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .lightbox-close-btn {
          position: absolute; top: 20px; right: 30px;
          background: none; border: none; color: #fff; font-size: 3rem; line-height: 1;
          cursor: pointer; z-index: 2001; opacity: 0.7; transition: opacity 0.2s;
        }
        .lightbox-close-btn:hover { opacity: 1; }
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

        /* 動畫定義 */
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes zoomIn { to { transform: scale(1); } }

        /* RWD 調整 */
        @media (max-width: 1024px) { .col-2 { display: none !important; } }
        @media (max-width: 640px) {
          .col-1 { display: none !important; }
          .masonry-flex-container { padding: 0 20px !important; }
          h1 { font-size: 1.8rem !important; letter-spacing: 1px !important; }
          .lightbox-close-btn { top: 10px; right: 15px; font-size: 2.5rem; }
        }
      `}</style>
    </Layout>
  );
}