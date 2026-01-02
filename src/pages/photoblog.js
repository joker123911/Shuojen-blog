import React, { useMemo, useState, useEffect } from 'react';
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
    // 外層容器改用 flex
    flexContainer: {
      maxWidth: '1600px',
      margin: '40px auto',
      padding: '0 10px',
      display: 'flex',
      gap: '15px', // 欄位間距
      alignItems: 'flex-start',
    },
    // 每一欄的樣式
    column: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '15px', // 圖片上下間距
    },
    photoItem: {
      width: '100%',
      borderRadius: '6px',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.05)',
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

  // 初始化只洗牌一次
  useEffect(() => {
    const randomized = shuffleArray(photosData).map((photo, idx) => ({
      ...photo,
      stableId: `photo-${idx}-${photo.src}`
    }));
    setShuffledPhotos(randomized);
  }, []);

  // 取得目前要顯示的圖片
  const visiblePhotos = useMemo(() => {
    return shuffledPhotos.slice(0, visibleCount);
  }, [shuffledPhotos, visibleCount]);

  // 【核心修正】將圖片手動分配到三個欄位，這保證了圖片順序永遠穩定
  const columns = useMemo(() => {
    const cols = [[], [], []];
    visiblePhotos.forEach((photo, index) => {
      cols[index % 3].push(photo); // 依照索引分配到 0, 1, 2 欄
    });
    return cols;
  }, [visiblePhotos]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  return (
    <Layout title="攝影作品集" description="我的攝影作品展示">
      <main style={{ padding: '3rem 0', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
          <h1 style={galleryTheme.headerTitle}>Photography</h1>
          <p style={galleryTheme.headerSub}>Since 2019 • by Shuo Jen</p>
        </div>

        {/* 修正後的瀑布流：使用 Flex 分欄 */}
        <div className="masonry-flex-container" style={galleryTheme.flexContainer}>
          {columns.map((colPhotos, colIdx) => (
            <div key={`col-${colIdx}`} className={`masonry-column col-${colIdx}`} style={galleryTheme.column}>
              {colPhotos.map((photo) => {
                const photoSrc = `${baseUrl}${photo.src}`.replace(/\/+/g, '/');
                return (
                  <div key={photo.stableId} style={galleryTheme.photoItem} className="photo-card">
                    <Link to={photo.link} style={{ display: 'block' }}>
                      <img
                        src={photoSrc}
                        alt={photo.title || 'Photo'}
                        style={galleryTheme.img}
                        loading="lazy"
                      />
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 載入更多按鈕 */}
        {visibleCount < shuffledPhotos.length && (
          <div style={{ textAlign: 'center', margin: '3rem 0' }}>
            <button className="load-more-btn" onClick={handleLoadMore}>
              Load More
            </button>
          </div>
        )}
      </main>

      <style>{`
        .photo-card,
        .photo-card img {
          border-radius: 6px !important;
        }

        .photo-card {
          transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          position: relative;
        }

        .photo-card img {
           transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), filter 0.6s ease;
        }

        .photo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2);
          z-index: 10;
        }

        .photo-card:hover img {
          transform: scale(1.03);
          filter: brightness(1.08);
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

        /* 響應式處理：平板與手機的欄位調整 */
        @media (max-width: 1024px) {
          .col-2 { display: none !important; } /* 隱藏第三欄 */
        }
        @media (max-width: 640px) {
          .col-1 { display: none !important; } /* 隱藏第二欄 */
          .masonry-flex-container { padding: 0 20px !important; }
          h1 { font-size: 2.5rem !important; }
        }
      `}</style>
    </Layout>
  );
}