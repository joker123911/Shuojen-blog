import React, { useMemo, useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 直接匯入產出的 JSON 檔案
import photosData from '@site/src/data/photosData.json';

// 洗牌算法放在組件外
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
    container: {
      maxWidth: '1600px',
      margin: '40px auto',
      padding: '0 10px',
      columnCount: 3,
      columnGap: '10px',
    },
    photoItem: {
      display: 'inline-block',
      width: '100%',
      marginBottom: '20px',
      // 這裡設定微圓角作為預設值
      borderRadius: '6px',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    img: {
      width: '100%',
      display: 'block',
      // 移除這裡的 transition，統一在 CSS 中管理
      // 圖片本身也設定微圓角
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
  // 使用 useEffect 確保在客戶端只洗牌一次，解決 SSR 不一致和 Load More 跳動問題
  const [shuffledPhotos, setShuffledPhotos] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const randomized = shuffleArray(photosData).map((photo, idx) => ({
      ...photo,
      // 產生穩定的唯一 ID
      stableId: `photo-${idx}-${photo.src}`
    }));
    setShuffledPhotos(randomized);
  }, []);

  // 根據當前數量切割
  const visiblePhotos = useMemo(() => {
    return shuffledPhotos.slice(0, visibleCount);
  }, [shuffledPhotos, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 12);
  };

  return (
    <Layout title="攝影作品集" description="我的攝影作品展示">
      <main style={{ padding: '3rem 0', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
          <h1 style={galleryTheme.headerTitle}>Photograph</h1>
          <p style={galleryTheme.headerSub}>Since 2019 • by Shuo Jen</p>
        </div>

        {/* 瀑布流容器 */}
        <div className="masonry-container" style={galleryTheme.container}>
          {visiblePhotos.map((photo) => {
            const photoSrc = `${baseUrl}${photo.src}`.replace(/\/+/g, '/');
            return (
              // 使用穩定的 stableId 作為 key
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
        /* 設定微圓角，並使用 !important 確保覆蓋全域設定 */
        .photo-card,
        .photo-card img {
          border-radius: 6px !important;
        }

        /* --- 修改後的滑動特效 --- */
        .photo-card {
          /* 改用更平滑緩慢的 transition */
          transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          position: relative;
          z-index: 1;
        }

        /* 圖片本身也要加上 transition 才能平滑縮放 */
        .photo-card img {
           transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), filter 0.6s ease;
        }

        .photo-card:hover {
          /* 減少上浮距離，從 -7px 改為 -4px，更穩重 */
          transform: translateY(-4px);
          /* 加深陰影，營造浮起感 */
          box-shadow: 0 12px 24px rgba(0,0,0,0.2);
          z-index: 2;
        }

        .photo-card:hover img {
          /* 緩慢放大 */
          transform: scale(1.03);
          /* 稍微增加一點亮度，讓焦點更突出 */
          filter: brightness(1.08);
        }
        /* ----------------------- */

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

        @media (max-width: 1024px) {
          .masonry-container { column-count: 2 !important; }
        }
        @media (max-width: 640px) {
          .masonry-container { column-count: 1 !important; }
          h1 { font-size: 2.5rem !important; }
        }
      `}</style>
    </Layout>
  );
}