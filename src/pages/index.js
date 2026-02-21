import React, { useState, useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
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
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 終端機動畫的 State
  const [typedTitle, setTypedTitle] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fullTitle = "> cd shuojen.com";

  // 處理照片洗牌
  useEffect(() => {
    if (photosData && photosData.length > 0) {
      setPhotos(shuffleArray(photosData));
    }
  }, []);

  // 動畫第一階段：打字機效果
  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i <= fullTitle.length) {
        setTypedTitle(fullTitle.substring(0, i));
        i++;
      } else {
        clearInterval(typingInterval);
        // 打完字後，停頓 0.3 秒再開始載入條
        setTimeout(() => setShowLoading(true), 300);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, []);

  // 動畫第二階段：載入進度條
  useEffect(() => {
    if (showLoading && progress < 100) {
      const loadingInterval = setInterval(() => {
        setProgress((prev) => {
          // 每次隨機增加 5~20 的進度，看起來更真實
          const jump = Math.floor(Math.random() * 15) + 5; 
          if (prev + jump >= 100) {
            clearInterval(loadingInterval);
            return 100;
          }
          return prev + jump;
        });
      }, 150); // 進度條跳動的節奏
      return () => clearInterval(loadingInterval);
    }
  }, [showLoading, progress]);

  const nextPhoto = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  if (photos.length === 0) {
    return (
      <Layout>
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', justifyContent: 'center', alignItems: 'center' }}>
          Loading...
        </div>
      </Layout>
    );
  }

  const currentImageSrc = typeof photos[currentIndex] === 'string' 
    ? photos[currentIndex] 
    : photos[currentIndex].src;

  // 動態產生類似 [=====>      ] 45% 的字串
  const renderLoadingBar = () => {
    const barLength = 15; // 括號內的總格數
    const filledCount = Math.floor((progress / 100) * barLength);
    const emptyCount = barLength - filledCount;

    const filledStr = '='.repeat(filledCount);
    // 還沒 100% 前，前端給個箭頭
    const headStr = (progress < 100 && filledCount > 0) ? '>' : ''; 
    const emptyStr = ' '.repeat(Math.max(0, emptyCount - (headStr ? 1 : 0)));

    return `[${filledStr}${headStr}${emptyStr}] ${progress}%`;
  };

  return (
    <Layout description="Shuo-jen 的個人部落格與攝影集">
      <style>
        {`
          .gallery-wrapper {
            display: flex;
            flex-direction: row;
            height: calc(100vh - 60px);
            width: 100%;
            overflow: hidden;
          }
          
          .gallery-sidebar {
            width: 350px;
            padding: 60px 40px;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
          }
          
          .gallery-title {
            font-size: 1.8rem;
            font-weight: 500;
            font-family: 'Courier Prime', 'Consolas', 'Courier New', monospace; 
            line-height: 1.5;
            color: var(--ifm-font-color-base);
            margin: 0;
            white-space: pre; 
          }

          .gallery-loading {
            font-size: 1.5rem;
            margin-top: 10px;
          }

          .typewriter-cursor {
            display: inline-block;
            width: 10px;
            height: 1.1em;
            background-color: var(--ifm-font-color-base);
            vertical-align: text-bottom;
            margin-left: 6px;
            animation: blink 1s step-end infinite;
          }

          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }

          .gallery-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            padding: 40px;
            min-width: 0; 
          }

          .gallery-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            transition: opacity 0.3s ease-in-out;
          }

          .nav-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            font-size: 2.5rem;
            cursor: pointer;
            color: var(--ifm-font-color-base);
            padding: 20px;
            z-index: 10;
            opacity: 0.7;
            transition: opacity 0.2s;
          }

          .nav-btn:hover {
            opacity: 1;
          }

          .btn-prev { left: 10px; }
          .btn-next { right: 10px; }

          @media (max-width: 768px) {
            .gallery-wrapper {
              flex-direction: column;
              height: auto;
              min-height: calc(100vh - 60px);
            }
            .gallery-sidebar {
              width: 100%;
              padding: 30px 20px 10px 20px;
              text-align: left;
            }
            .gallery-content {
              padding: 10px;
              flex: 1;
              min-height: 60vh;
            }
            .nav-btn {
              padding: 10px;
              font-size: 2rem;
            }
            .btn-prev { left: 0px; }
            .btn-next { right: 0px; }
          }
        `}
      </style>

      <main className="gallery-wrapper">
        <div className="gallery-sidebar">
          {/* 第一行：打指令 */}
          <div className="gallery-title">
            {typedTitle}
            {/* 載入條還沒出現前，游標留在第一行 */}
            {!showLoading && <span className="typewriter-cursor"></span>}
          </div>
          
          {/* 第二行：進度條 */}
          {showLoading && (
            <div className="gallery-title gallery-loading">
              {renderLoadingBar()}
              {/* 游標移到第二行，並在進度達到 100% 後繼續閃爍，模擬系統閒置 */}
              <span className="typewriter-cursor"></span>
            </div>
          )}
        </div>

        {/* 右側：在 100% 之前維持透明度為 0 且不可點擊，100% 後淡入 */}
        <div 
          className="gallery-content"
          style={{
            opacity: progress === 100 ? 1 : 0,
            pointerEvents: progress === 100 ? 'auto' : 'none',
            transition: 'opacity 0.8s ease-in-out'
          }}
        >
          <img
            src={baseUrl + currentImageSrc.replace(/^\//, '')}
            alt={`Gallery artwork ${currentIndex + 1}`}
            className="gallery-image"
          />
          <button onClick={prevPhoto} aria-label="Previous photo" className="nav-btn btn-prev">‹</button>
          <button onClick={nextPhoto} aria-label="Next photo" className="nav-btn btn-next">›</button>
        </div>
      </main>
    </Layout>
  );
}