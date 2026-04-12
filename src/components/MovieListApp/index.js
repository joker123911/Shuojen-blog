import React, { useState, useMemo } from 'react';
// 匯入拆分出去的資料
import { westernMovies, asiaMovies, animeMovies, hongkongMovies } from '@site/src/data/movies';
import './styles.css';

// 這裡加入了 initialFilter 和 hideFilterBar 兩個參數
export default function MovieListApp({ initialFilter = 'all', hideFilterBar = false }) {
  const [activePoster, setActivePoster] = useState(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  
  // 初始分類由外部傳入
  const [filter, setFilter] = useState(initialFilter);
  const [visibleCount, setVisibleCount] = useState(100); 

  const sortedMovies = useMemo(() => {
    const combined = [
      ...westernMovies.map(m => ({ ...m, category: 'western' })),
      ...asiaMovies.map(m => ({ ...m, category: 'asia' })),
      ...animeMovies.map(m => ({ ...m, category: 'anime' })),
      ...hongkongMovies.map(m => ({ ...m, category: 'hongkong' }))
    ];
    return combined.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, []);

  const filteredMovies = useMemo(() => {
    if (filter === 'top100') return sortedMovies.slice(0, 100);
    if (filter === 'all') return sortedMovies;
    return sortedMovies.filter(m => m.category === filter);
  }, [sortedMovies, filter]);

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
    setVisibleCount(100);
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