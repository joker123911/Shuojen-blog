import React, { useState, useEffect, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
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

  // Lightbox 相關 State
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // 滑動/拖曳 相關 State
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

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
        setTimeout(() => setShowLoading(true), 300);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, []);

  // 動畫第二階段：載入進度條
  useEffect(() => {
    if (showLoading && progress < 100) {
      const loadingInterval = setInterval(() => {
        setProgress((prev) => {
          const jump = Math.floor(Math.random() * 15) + 5; 
          if (prev + jump >= 100) {
            clearInterval(loadingInterval);
            return 100;
          }
          return prev + jump;
        });
      }, 150);
      return () => clearInterval(loadingInterval);
    }
  }, [showLoading, progress]);

  // Lightbox 開關邏輯
  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };

  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'auto';
    }
  }, []);

  // 監聽 Esc 鍵關閉 Lightbox
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
    }
  }, [selectedPhoto, closeLightbox]);

  const nextPhoto = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  // 處理滑動/拖曳邏輯
  const handleStart = (clientX) => {
    setTouchStartX(clientX);
    setTouchEndX(0);
  };

  const handleMove = (clientX) => {
    if (touchStartX) {
      setTouchEndX(clientX);
    }
  };

  const handleEnd = () => {
    if (!touchStartX || !touchEndX) {
      setTouchStartX(0);
      return;
    }
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextPhoto();
    } else if (distance < -minSwipeDistance) {
      prevPhoto();
    }
    
    setTimeout(() => {
      setTouchStartX(0);
      setTouchEndX(0);
    }, 50); 
  };

  const handleImageClick = (e, photo) => {
    // 判定如果是滑動操作，就不觸發 Lightbox
    if (touchStartX && touchEndX && Math.abs(touchStartX - touchEndX) > 10) {
      return;
    }
    openLightbox(photo);
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

  const currentPhoto = photos[currentIndex];
  
  const getPhotoSrc = (photoItem) => {
    if (!photoItem) return '';
    const src = typeof photoItem === 'string' ? photoItem : photoItem.src;
    return baseUrl + src.replace(/^\//, '');
  };

  const renderLoadingBar = () => {
    const barLength = 15;
    const filledCount = Math.floor((progress / 100) * barLength);
    const emptyCount = barLength - filledCount;

    const filledStr = '='.repeat(filledCount);
    const headStr = (progress < 100 && filledCount > 0) ? '>' : ''; 
    const emptyStr = ' '.repeat(Math.max(0, emptyCount - (headStr ? 1 : 0)));

    return `[${filledStr}${headStr}${emptyStr}] ${progress}%`;
  };

  return (
    <Layout description="Shuo-jen 的個人部落格與攝影集">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap');

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
            font-family: 'Courier Prime', Consolas, Menlo, Monaco, 'Courier New', monospace; 
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
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .gallery-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            padding: 40px;
            min-width: 0; 
            cursor: grab;
          }
          
          .gallery-content:active {
            cursor: grabbing;
          }

          .gallery-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            transition: opacity 0.3s ease-in-out;
            cursor: pointer;
          }
          
          .gallery-image:hover {
            transform: scale(1.01);
            transition: transform 0.3s ease;
          }

          .lightbox-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(0, 0, 0, 0.92);
            display: flex; justify-content: center; align-items: center;
            z-index: 2000;
            opacity: 0; animation: fadeInLightbox 0.3s forwards;
          }
          .lightbox-content {
            position: relative; max-width: 90vw; max-height: 90vh;
            display: flex; flex-direction: column; align-items: center;
            transform: scale(0.95); animation: zoomIn 0.3s forwards 0.1s;
          }
          .lightbox-image {
            max-width: 100%; max-height: 80vh;
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
            margin-top: 20px;
          }
          .lightbox-link-btn {
            display: inline-block;
            padding: 10px 24px;
            background-color: rgba(255,255,255,0.2);
            color: #fff !important;
            text-decoration: none !important;
            border-radius: 30px;
            font-size: 1rem;
            transition: background-color 0.3s;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255,255,255,0.1);
          }
          .lightbox-link-btn:hover {
            background-color: rgba(255,255,255,0.4);
          }

          @keyframes fadeInLightbox { to { opacity: 1; } }
          @keyframes zoomIn { to { transform: scale(1); } }

          @media (max-width: 768px) {
            .gallery-wrapper {
              flex-direction: column;
              height: calc(100vh - 60px);
            }
            .gallery-sidebar {
              width: 100%;
              padding: 20px 20px 10px 20px;
              text-align: left;
              flex-shrink: 0;
            }
            .gallery-title {
              font-size: 1.2rem;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .gallery-loading {
              font-size: 1.2rem;
            }
            .gallery-content {
              padding: 0 10px;
              flex: 1;
              min-height: unset;
            }
            .lightbox-close-btn { top: 10px; right: 15px; font-size: 2.5rem; }
          }
        `}
      </style>

      <main className="gallery-wrapper">
        <div className="gallery-sidebar">
          <div className="gallery-title">
            {typedTitle}
            {!showLoading && <span className="typewriter-cursor"></span>}
          </div>
          
          <div className="gallery-title gallery-loading">
            {showLoading ? (
              <>
                {renderLoadingBar()}
                <span className="typewriter-cursor"></span>
              </>
            ) : (
              <span style={{ visibility: 'hidden' }}>&nbsp;</span>
            )}
          </div>
        </div>

        <div 
          className="gallery-content"
          onTouchStart={(e) => handleStart(e.targetTouches[0].clientX)}
          onTouchMove={(e) => handleMove(e.targetTouches[0].clientX)}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
        >
          {progress < 100 ? (
            <img 
              src={baseUrl + 'img/knight_5x.gif'}
              alt="Loading..."
              className="gallery-image"
              style={{ cursor: 'default' }}
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <img
              key={currentIndex} 
              src={getPhotoSrc(currentPhoto)}
              alt={`Gallery artwork ${currentIndex + 1}`}
              className="gallery-image"
              style={{ animation: 'fadeIn 0.8s ease-in-out' }}
              onClick={(e) => handleImageClick(e, currentPhoto)}
              onDragStart={(e) => e.preventDefault()} 
            />
          )}
        </div>

        {selectedPhoto && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close">
              ×
            </button>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img
                src={getPhotoSrc(selectedPhoto)}
                alt="Enlarged view"
                className="lightbox-image"
              />
              {typeof selectedPhoto !== 'string' && selectedPhoto.link && (
                <div className="lightbox-caption">
                  <Link to={selectedPhoto.link} className="lightbox-link-btn">
                    查看原文記事
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}