import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// 直接匯入產出的 JSON 檔案（prepare-data.js 產生，gen-photo-thumbs.js 補上寬高與縮圖路徑）
import photosData from '@site/src/data/photosData.json';

const BATCH_SIZE = 24;
const SKELETON_COUNT = 12;
const SWIPE_THRESHOLD = 50;

// 洗牌算法
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 器材篩選：依文章標籤判斷（標籤格式統一為「品牌-型號」全小寫）
// 新增器材時在這裡加一行即可
const FILM_RE = /^(kodak|fujicolor|agfa|foma|ilford)-|^底片$|^canon-ae1$|^konica-/;
const hasTag = (tag) => (tags) => tags.includes(tag);
const CAMERA_FILTERS = [
  { id: 'xt20', label: 'X-T20', test: hasTag('fujifilm-xt20') },
  { id: 'gm1', label: 'GM1', test: hasTag('panasonic-gm1') },
  { id: 'gf3', label: 'GF3', test: hasTag('panasonic-gf3') },
  { id: 'film', label: '底片', test: (tags) => tags.some((t) => FILM_RE.test(t)) },
];

const yearOf = (photo) => (photo.date || '').slice(0, 4);

// 篩選列的選項與張數（以全部照片計算，固定不變）
const YEAR_OPTIONS = (() => {
  const counts = {};
  photosData.forEach((p) => {
    const y = yearOf(p);
    if (y) counts[y] = (counts[y] || 0) + 1;
  });
  return Object.keys(counts)
    .sort((a, b) => b.localeCompare(a))
    .map((y) => ({ id: y, label: y, count: counts[y] }));
})();

const CAMERA_OPTIONS = CAMERA_FILTERS.map((c) => ({
  id: c.id,
  label: c.label,
  count: photosData.filter((p) => c.test(p.tags || [])).length,
}));

function FilterRow({ label, options, value, onChange }) {
  return (
    <div className="filter-row">
      <span className="filter-label">{label}</span>
      <div className="filter-chips">
        <button
          className={`filter-chip${value === null ? ' is-active' : ''}`}
          onClick={() => onChange(null)}
        >
          全部
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            className={`filter-chip${value === o.id ? ' is-active' : ''}`}
            onClick={() => onChange(value === o.id ? null : o.id)}
          >
            {o.label}
            <span className="filter-count">{o.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 寬高比；缺資料時退回相機標準 3:2
const aspectOf = (photo) => (photo.w && photo.h ? photo.w / photo.h : 1.5);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
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
    fontFamily: 'var(--ifm-font-family-base)',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '3px',
    fontWeight: '500',
    color: 'var(--ifm-color-content-secondary)',
    opacity: 0.85,
  }
};

// 等高排版的單一格：flex-grow 與 flex-basis 都依寬高比分配，同一列的照片高度會一致
function justifiedItemStyle(aspect) {
  return {
    flexGrow: aspect,
    flexBasis: `calc(var(--row-h) * ${aspect})`,
  };
}

export default function PhotoGallery() {
  const { siteConfig: { baseUrl } } = useDocusaurusContext();

  const [allShuffled, setShuffledPhotos] = useState([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [yearFilter, setYearFilter] = useState(null);
  const [cameraFilter, setCameraFilter] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // 收合時顯示目前套用中的條件
  const activeLabels = [
    yearFilter,
    CAMERA_FILTERS.find((c) => c.id === cameraFilter)?.label,
  ].filter(Boolean);
  const clearFilters = () => {
    setYearFilter(null);
    setCameraFilter(null);
  };

  // 套用篩選後的照片（之後的無限滾動、燈箱都以這個陣列為準）
  const shuffledPhotos = useMemo(() => {
    const camera = CAMERA_FILTERS.find((c) => c.id === cameraFilter);
    return allShuffled.filter(
      (p) =>
        (!yearFilter || yearOf(p) === yearFilter) &&
        (!camera || camera.test(p.tags || [])),
    );
  }, [allShuffled, yearFilter, cameraFilter]);

  // 切換篩選時從頭開始顯示
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    setSelectedIdx(null);
  }, [yearFilter, cameraFilter]);

  const getFullPath = useCallback((src) => `${baseUrl}${src}`.replace(/\/+/g, '/'), [baseUrl]);
  const getThumbPath = useCallback(
    (photo) => getFullPath(photo.thumb || photo.src),
    [getFullPath],
  );

  // 初始化洗牌（只在瀏覽器端執行；伺服器端先輸出骨架佔位，避免整頁空白）
  useEffect(() => {
    const randomized = shuffleArray(photosData).map((photo, idx) => ({
      ...photo,
      stableId: `photo-${idx}-${photo.src}`
    }));
    setShuffledPhotos(randomized);
  }, []);

  // 自動預載下一批次的縮圖
  useEffect(() => {
    if (shuffledPhotos.length === 0) return;
    const nextBatch = shuffledPhotos.slice(visibleCount, visibleCount + BATCH_SIZE);
    nextBatch.forEach((photo) => {
      const img = new Image();
      img.src = getThumbPath(photo);
    });
  }, [visibleCount, shuffledPhotos, getThumbPath]);

  // 取得目前需要顯示的扁平化照片陣列
  const visiblePhotos = useMemo(() => {
    return shuffledPhotos.slice(0, visibleCount);
  }, [shuffledPhotos, visibleCount]);

  const observerTarget = useRef(null);

  // 無限滾動監聽（IntersectionObserver）
  useEffect(() => {
    if (visibleCount >= shuffledPhotos.length || shuffledPhotos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, shuffledPhotos.length));
        }
      },
      {
        rootMargin: '600px', // 提早預載，滑動體驗無縫流暢
        threshold: 0,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, shuffledPhotos.length]);

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
        setVisibleCount((prev) => prev + BATCH_SIZE);
      }
    }
  }, [selectedIdx, shuffledPhotos.length, visibleCount]);

  // 燈箱開啟時，預載前後各一張原圖，切換時不用等待
  useEffect(() => {
    if (selectedIdx === null) return;
    [selectedIdx - 1, selectedIdx + 1].forEach((i) => {
      const photo = shuffledPhotos[i];
      if (photo) {
        const img = new Image();
        img.src = getFullPath(photo.src);
      }
    });
  }, [selectedIdx, shuffledPhotos, getFullPath]);

  // 手機左右滑動切換照片
  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) showNextPhoto();
    else showPrevPhoto();
  };

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

  const isLoading = allShuffled.length === 0;

  return (
    <Layout title="攝影集" description="我的攝影作品展示">
      <main style={{ padding: '3rem 0', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '2rem' }}>
          <h1 className="gallery-title" style={galleryTheme.headerTitle}>Photography</h1>
          <p style={galleryTheme.headerSub}>Since 2019 • by Shuo Jen</p>
        </div>

        {/* 篩選列：年份、器材（預設收合，點「篩選」展開） */}
        <div className="gallery-filters">
          <div className="gallery-filter-bar">
            <button
              className={`filter-toggle${filtersOpen ? ' is-open' : ''}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="gallery-filter-panel"
            >
              篩選
              <span className="filter-toggle-arrow" aria-hidden="true">▾</span>
            </button>
            {activeLabels.length > 0 && (
              <>
                <span className="filter-active">{activeLabels.join(' · ')}</span>
                <button className="filter-clear" onClick={clearFilters} aria-label="清除篩選">
                  ×
                </button>
              </>
            )}
            <span className="filter-result">
              {isLoading ? '' : `共 ${shuffledPhotos.length} 張`}
            </span>
          </div>
          <div
            id="gallery-filter-panel"
            className={`filter-panel${filtersOpen ? ' is-open' : ''}`}
            inert={!filtersOpen}
          >
            <div className="filter-panel-inner">
              <FilterRow label="年份" options={YEAR_OPTIONS} value={yearFilter} onChange={setYearFilter} />
              <FilterRow label="器材" options={CAMERA_OPTIONS} value={cameraFilter} onChange={setCameraFilter} />
            </div>
          </div>
        </div>

        {!isLoading && shuffledPhotos.length === 0 && (
          <p className="gallery-empty">這個條件下沒有照片，換個篩選試試。</p>
        )}

        {/* 等高排版（justified rows）：保留每張照片原始比例，直幅照片不再被裁切 */}
        <div className="gallery-grid">
          {isLoading
            ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <div key={i} className="photo-item" style={justifiedItemStyle(1.5)}>
                  <div className="photo-ratio" style={{ paddingBottom: `${100 / 1.5}%` }}>
                    <span className="photo-skeleton" />
                  </div>
                </div>
              ))
            : visiblePhotos.map((photo, index) => {
                const aspect = aspectOf(photo);
                return (
                  <div
                    key={photo.stableId}
                    className="photo-item"
                    style={{
                      ...justifiedItemStyle(aspect),
                      animationDelay: `${(index % BATCH_SIZE) * 40}ms`,
                    }}
                  >
                    <button
                      className="photo-card"
                      onClick={() => openLightbox(index)}
                      aria-label={`放大觀看照片：${photo.title || '無標題'}`}
                    >
                      <div className="photo-ratio" style={{ paddingBottom: `${100 / aspect}%` }}>
                        <img
                          src={getThumbPath(photo)}
                          alt={photo.title || 'Photo'}
                          className="photo-card-img"
                          loading={index < 8 ? 'eager' : 'lazy'}
                          decoding="async"
                          onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                          onError={(e) => {
                            // 縮圖不存在時（例如本機尚未產生）改載原圖
                            const original = getFullPath(photo.src);
                            if (!e.currentTarget.src.endsWith(original)) {
                              e.currentTarget.src = original;
                            }
                          }}
                        />
                      </div>
                    </button>
                  </div>
                );
              })}
        </div>

        {/* 無限滾動觸發目標 */}
        {visibleCount < shuffledPhotos.length && (
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
        {selectedPhoto && (
          <div
            className="lightbox-overlay"
            onClick={closeLightbox}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close">
              ×
            </button>

            {/* 左右導覽按鈕（手機版隱藏，改用左右滑動） */}
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
                key={selectedPhoto.src}
                src={getFullPath(selectedPhoto.src)}
                alt={selectedPhoto.title}
                className="lightbox-image"
              />
              <div className="lightbox-caption">
                <div className="lightbox-meta">
                  <span className="lightbox-title">{selectedPhoto.title}</span>
                  {selectedPhoto.date && (
                    <span className="lightbox-date">{formatDate(selectedPhoto.date)}</span>
                  )}
                </div>
                {selectedPhoto.tags?.length > 0 && (
                  <div className="lightbox-tags">{selectedPhoto.tags.join(' · ')}</div>
                )}
                <Link to={selectedPhoto.link} className="lightbox-link-btn">
                  查看原文記事
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        /* --- 等高排版（justified rows） --- */
        .gallery-grid {
          --row-h: 280px;          /* 目標列高，實際列高會略為拉伸以填滿整列 */
          display: flex;
          flex-wrap: wrap;
          gap: 10px;               /* 窄間距、直角，讓照片本身當主角 */
          max-width: 1600px;
          margin: 24px auto 40px;
          padding: 0 15px;
        }

        /* --- 篩選列 --- */
        .gallery-filters {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 15px;
        }
        .gallery-filter-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
        }
        .filter-toggle {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 4px;
          border: none;
          background: none;
          color: var(--ifm-color-emphasis-700);
          font-family: inherit;
          font-size: 0.85rem;
          letter-spacing: 1px;
          cursor: pointer;
        }
        .filter-toggle:hover { color: var(--ifm-font-color-base); }
        /* 滑鼠點擊不顯示焦點框，鍵盤操作才顯示 */
        .filter-toggle:focus:not(:focus-visible) { outline: none; }
        .filter-toggle:focus-visible {
          outline: 2px solid var(--ifm-color-emphasis-600);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .filter-toggle-arrow {
          display: inline-block;
          transition: transform 0.25s ease;
        }
        .filter-toggle.is-open .filter-toggle-arrow { transform: rotate(180deg); }
        .filter-active {
          padding: 1px 10px;
          border-radius: 999px;
          background: var(--ifm-font-color-base);
          color: var(--ifm-background-color);
          font-size: 0.8rem;
        }
        .filter-clear {
          border: none;
          background: none;
          padding: 0 2px;
          color: var(--ifm-color-emphasis-600);
          font-size: 1.1rem;
          line-height: 1;
          cursor: pointer;
        }
        .filter-clear:hover { color: var(--ifm-font-color-base); }

        /* 展開／收合：用 grid 列高 0fr → 1fr 做平滑動畫 */
        .filter-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s ease;
        }
        .filter-panel.is-open { grid-template-rows: 1fr; }
        .filter-panel-inner {
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 10px;
          /* 收合後完全隱藏：避免高度四捨五入殘留不到 1px，透出按鈕上框線。
             收合時等動畫跑完（0.3s）才隱藏，展開時立即顯示 */
          visibility: hidden;
          transition: visibility 0s linear 0.3s;
        }
        .filter-panel.is-open .filter-panel-inner {
          padding-top: 10px;
          visibility: visible;
          transition-delay: 0s;
        }
        .filter-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .filter-label {
          flex-shrink: 0;
          font-size: 0.85rem;
          color: var(--ifm-color-emphasis-600);
          letter-spacing: 1px;
        }
        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .filter-chip {
          display: inline-flex;
          align-items: baseline;
          gap: 5px;
          padding: 3px 11px;
          border: 1px solid var(--ifm-color-emphasis-300);
          border-radius: 999px;
          background: transparent;
          color: var(--ifm-font-color-base);
          font-family: inherit;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background-color 0.15s, border-color 0.15s, color 0.15s;
        }
        .filter-chip:hover {
          border-color: var(--ifm-color-emphasis-600);
        }
        .filter-chip.is-active {
          background: var(--ifm-font-color-base);
          border-color: var(--ifm-font-color-base);
          color: var(--ifm-background-color);
        }
        .filter-count {
          font-size: 0.72rem;
          opacity: 0.6;
          font-variant-numeric: tabular-nums;
        }
        .filter-result {
          font-size: 0.8rem;
          color: var(--ifm-color-emphasis-600);
        }
        .gallery-empty {
          text-align: center;
          color: var(--ifm-color-emphasis-600);
          margin: 3rem 0;
        }
        /* 最後一列不要被拉伸到滿版 */
        .gallery-grid::after {
          content: '';
          flex-grow: 999999;
        }

        .photo-item {
          position: relative;
          animation: cardEntrance 0.5s ease-out both;
        }

        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .photo-ratio {
          position: relative;
          width: 100%;
          height: 0;
        }

        .photo-card {
          display: block;
          width: 100%;
          border: none;
          background: var(--ifm-color-emphasis-200);
          padding: 0;
          border-radius: 2px;
          overflow: hidden;
          cursor: pointer;
        }

        .photo-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.4s ease-out, transform 0.4s ease-out, filter 0.3s ease;
        }

        /* 當圖片實際載入完成時，浮現 */
        .photo-card-img.is-loaded {
          opacity: 1;
        }

        .photo-card:hover .photo-card-img {
          transform: scale(1.02);
          filter: brightness(1.05);
        }
        .photo-card:focus-visible {
          outline: 2px solid var(--ifm-color-primary);
          outline-offset: 3px;
        }

        /* 載入前的骨架佔位 */
        .photo-skeleton {
          position: absolute;
          inset: 0;
          border-radius: 2px;
          background: var(--ifm-color-emphasis-200);
          animation: skeletonPulse 1.4s ease-in-out infinite;
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
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
          animation: fadeIn 0.3s forwards;
          touch-action: pan-y;
        }
        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: scale(0.97);
          animation: zoomIn 0.3s forwards 0.05s;
        }
        .lightbox-image {
          max-width: 100%;
          max-height: 76vh;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: fadeIn 0.25s ease-out;
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
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          color: #fff;
        }
        .lightbox-meta {
          display: flex;
          align-items: baseline;
          gap: 0.8rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .lightbox-title {
          font-size: 1rem;
          font-weight: 600;
        }
        .lightbox-date {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.65);
          font-variant-numeric: tabular-nums;
        }
        .lightbox-tags {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.55);
        }
        .lightbox-link-btn {
          display: inline-block;
          margin-top: 4px;
          padding: 6px 18px;
          background-color: rgba(255,255,255,0.2);
          color: #fff !important;
          text-decoration: none !important;
          border-radius: 20px;
          font-size: 0.85rem;
          transition: background-color 0.3s;
          backdrop-filter: blur(5px);
        }
        .lightbox-link-btn:hover {
          background-color: rgba(255,255,255,0.4);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { to { transform: scale(1); } }

        /* --- 響應式列高控制 --- */
        @media (max-width: 1024px) {
          .gallery-grid {
            --row-h: 220px;
            gap: 8px;
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
            --row-h: 150px;
            gap: 6px;
            padding: 0 16px;
          }
          .gallery-filters { padding: 0 16px; }
          .filter-row { flex-direction: column; gap: 6px; }
          .gallery-title { font-size: 1.8rem !important; letter-spacing: 1px !important; }
          .lightbox-close-btn { top: 10px; right: 15px; font-size: 2.5rem; }
          .lightbox-nav-btn {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .photo-item, .photo-skeleton, .lightbox-overlay, .lightbox-content, .lightbox-image {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </Layout>
  );
}
