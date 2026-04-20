import React, { useState, useMemo } from 'react';
// 匯入拆分出去的資料
import { westernMovies, asiaMovies, animeMovies, hongkongMovies } from '@site/src/data/movies';
import './styles.css';

// 這裡加入了 initialFilter 和 hideFilterBar 兩個參數
export default function MovieListApp({ initialFilter = 'all', hideFilterBar = false }) {
  const [activePoster, setActivePoster] = useState(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  
  // 新增：搜尋關鍵字狀態
  const [searchTerm, setSearchTerm] = useState('');
  
  // 初始分類由外部傳入
  const [filter, setFilter] = useState(initialFilter);
  const [visibleCount, setVisibleCount] = useState(100); 

  // 合併並排序原始資料
  const sortedMovies = useMemo(() => {
    const combined = [
      ...westernMovies.map(m => ({ ...m, category: 'western' })),
      ...asiaMovies.map(m => ({ ...m, category: 'asia' })),
      ...animeMovies.map(m => ({ ...m, category: 'anime' })),
      ...hongkongMovies.map(m => ({ ...m, category: 'hongkong' }))
    ];
    return combined.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, []);

  // 核心篩選邏輯（分類 + 搜尋）
  const filteredMovies = useMemo(() => {
    let result = sortedMovies;

    // 1. 處理分類篩選
    if (filter === 'top100') {
      result = sortedMovies.slice(0, 100);
    } else if (filter !== 'all') {
      result = sortedMovies.filter(m => m.category === filter);
    }

    // 2. 處理搜尋關鍵字篩選
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(lowerSearch) || 
        (m.note && m.note.toLowerCase().includes(lowerSearch))
      );
    }

    return result;
  }, [sortedMovies, filter, searchTerm]);

  const displayedMovies = filteredMovies.slice(0, visibleCount);

  const handleOpen = (url, title) => {
    setIsImgLoaded(false);
    setActivePoster(url);
    setActiveTitle(title);
  };
  
  const handleClose = () => setActivePoster(null);

  const loadMore = () => setVisibleCount(prev => prev + 100);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSearchTerm(''); // 切換分類時清空搜尋，避免找不到東西
    setVisibleCount(100);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setVisibleCount(100); // 搜尋時重置顯示數量
  };

  const filterOptions = [
    { value: 'all', label: '🏆 全部排名' },
    { value: 'top100', label: '💯 Top 100' },
    { value: 'western', label: '🌎 歐美電影' },
    { value: 'asia', label: '🥢 華語日韓' },
    { value: 'hongkong', label: '🎞️ 童年港片' },    
    { value: 'anime', label: '🎨 動畫電影' }
  ];

  return (
    <div className="movie-app-container">
      {/* 搜尋欄區域：包含電影總數顯示 */}
      <div className="search-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="搜尋電影標題或心得..." 
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
        <div className="movie-count-badge">
          收錄電影：{sortedMovies.length} 部
        </div>
      </div>

      {/* 只有在 hideFilterBar 為 false 時才顯示按鈕列 */}
      {!hideFilterBar && (
        <div className="filter-bar">
          {filterOptions.map(opt => (
            <button 
              key={opt.value}
              className={`filter-btn ${filter === opt.value ? 'active' : ''}`}
              onClick={() => handleFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 搜尋無結果提示 */}
      {filteredMovies.length === 0 && (
        <div className="no-results">
          <p>找不到符合「{searchTerm}」的電影 🎬</p>
        </div>
      )}

      <div className="imdb-list">
        {displayedMovies.map((movie, index) => {
          const rank = index + 1;
          
          return (
            <div 
              key={`${movie.title}-${index}`} 
              className="list-item"
              onClick={() => handleOpen(movie.poster, movie.title)}
            >
              <div className="list-poster">
                <img 
                  src={require(`@site/docs/${movie.poster.replace('./', '')}`).default} 
                  alt={movie.title} 
                />
              </div>
              
              <div className="list-info">
                <div className="list-rank-badge">#{rank}</div>
                <h3 className="list-title">{movie.title}</h3>
                <p className="list-note">{movie.note}</p>
                <div className="list-actions">
                  <span className="list-score">
                    <span className="star-icon">★</span> {movie.score ? movie.score.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < filteredMovies.length && (
        <button className="load-more-btn" onClick={loadMore}>LOAD MORE</button>
      )}

      {activePoster && (
        <div className="poster-modal-overlay" onClick={handleClose}>
          <div className="poster-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{activeTitle}</span>
              <button className="close-btn" onClick={handleClose}>×</button>
            </div>
            
            <div className={`poster-frame ${isImgLoaded ? 'loaded' : 'loading'}`}>
              <img 
                src={require(`@site/docs/${activePoster.replace('./', '')}`).default} 
                alt={activeTitle} 
                className="poster-img" 
                onLoad={() => setIsImgLoaded(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}