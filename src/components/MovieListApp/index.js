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

  // 合併原始資料
  const combinedMovies = useMemo(() => {
    return [
      ...westernMovies.map(m => ({ ...m, category: 'western' })),
      ...asiaMovies.map(m => ({ ...m, category: 'asia' })),
      ...animeMovies.map(m => ({ ...m, category: 'anime' })),
      ...hongkongMovies.map(m => ({ ...m, category: 'hongkong' }))
    ];
  }, []);

  // 依照評分排序的資料（供電影榜單與各分類使用）
  const scoreSortedMovies = useMemo(() => {
    return [...combinedMovies].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [combinedMovies]);

  // 依照年份排序的資料（供年份排序使用，新到舊；若年份相同則依評分排序）
  const yearSortedMovies = useMemo(() => {
    const getYear = (m) => {
      if (!m.tags) return 0;
      const tagsArray = Array.isArray(m.tags) 
        ? m.tags 
        : m.tags.split(',').map(t => t.trim());
      const yearTag = tagsArray.find(tag => /^\d{4}$/.test(tag));
      return yearTag ? parseInt(yearTag, 10) : 0;
    };

    return [...combinedMovies].sort((a, b) => {
      const yearA = getYear(a);
      const yearB = getYear(b);
      if (yearB !== yearA) {
        return yearB - yearA;
      }
      return (b.score || 0) - (a.score || 0);
    });
  }, [combinedMovies]);

  // 核心篩選與排序邏輯（分類 + 搜尋）
  const filteredMovies = useMemo(() => {
    let result = [];

    // 1. 處理分類與排序篩選
    if (filter === 'all') {
      result = yearSortedMovies; // 全部的排名改成年份排序
    } else if (filter === 'top100') {
      result = scoreSortedMovies.slice(0, 5000); // TOP100 改成電影榜單（評分排序）
    } else {
      result = scoreSortedMovies.filter(m => m.category === filter);
    }

    // 2. 處理搜尋關鍵字篩選
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(lowerSearch) || 
        (m.note && m.note.toLowerCase().includes(lowerSearch)) ||
        (m.tags && (
          Array.isArray(m.tags)
            ? m.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
            : m.tags.toLowerCase().includes(lowerSearch)
        ))
      );
    }

    return result;
  }, [yearSortedMovies, scoreSortedMovies, filter, searchTerm]);

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

  const handleTagClick = (tag, e) => {
    e.stopPropagation(); // 避免點擊標籤時觸發開窗效果
    setSearchTerm(tag);
    setVisibleCount(100);
  };

  const filterOptions = [
    { value: 'all', label: '📅 年份排序' },
    { value: 'top100', label: '🎬 評分排序' },
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
          收錄電影：{combinedMovies.length} 部
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
                <div className="list-badge-container">
                  <div className="list-rank-badge">#{rank}</div>
                  {movie.tags && (
                    <div className="list-tags">
                      {(Array.isArray(movie.tags) ? movie.tags : movie.tags.split(',').map(t => t.trim()).filter(Boolean)).map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="list-tag"
                          onClick={(e) => handleTagClick(tag, e)}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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