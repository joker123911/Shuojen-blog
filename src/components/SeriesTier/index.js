import React, { useState, useMemo } from 'react';
// 請確保資料路徑正確，且資料包含 tier 屬性
import { animeList } from '@site/src/data/series';
import './styles.css';

export default function AnimeTierApp({ initialFilter = 'all', hideFilterBar = false }) {
  const [activePoster, setActivePoster] = useState(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [visibleCount, setVisibleCount] = useState(100); 

  // 現在不需要依分數排序，僅保持原始資料順序
  const processedAnime = useMemo(() => {
    return [...animeList];
  }, []);

  // 核心篩選邏輯（僅 Tier 分類 + 搜尋）
  const filteredAnime = useMemo(() => {
    let result = processedAnime;

    // 1. 處理 Tier 篩選
    if (filter !== 'all') {
      result = processedAnime.filter(m => m.tier === filter);
    }

    // 2. 處理搜尋關鍵字
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
  }, [processedAnime, filter, searchTerm]);

  const displayedAnime = filteredAnime.slice(0, visibleCount);

  const handleOpen = (url, title) => {
    setIsImgLoaded(false);
    setActivePoster(url);
    setActiveTitle(title);
  };
  
  const handleClose = () => setActivePoster(null);
  const loadMore = () => setVisibleCount(prev => prev + 100);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSearchTerm('');
    setVisibleCount(100);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setVisibleCount(100);
  };

  const handleTagClick = (tag, e) => {
    e.stopPropagation();
    setSearchTerm(tag);
    setVisibleCount(100);
  };

  // 移除 C Tier 的選項
  const filterOptions = [
    { value: 'all', label: '🌈 全部等級' },
    { value: 'SSS', label: '💎 SSS Tier' },
    { value: 'SS', label: '🔥 SS Tier' },
    { value: 'S', label: '✨ S Tier' },
    { value: 'A', label: '👍 A Tier' },
    { value: 'B', label: '🆗 B Tier' }
  ];

  return (
    <div className="movie-app-container">
      <div className="search-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="搜尋劇集標題或心得..." 
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
        <div className="movie-count-badge">
          收錄作品：{processedAnime.length} 部
        </div>
      </div>

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

      {filteredAnime.length === 0 && (
        <div className="no-results">
          <p>找不到符合「{searchTerm}」的動畫 📺</p>
        </div>
      )}

      <div className="imdb-list">
        {displayedAnime.map((anime, index) => {
          return (
            <div 
              key={`${anime.title}-${index}`} 
              className="list-item"
              onClick={() => handleOpen(anime.poster, anime.title)}
            >
              <div className="list-poster">
                <img 
                  src={require(`@site/docs/${anime.poster.replace('./', '')}`).default} 
                  alt={anime.title} 
                />
              </div>
              
              <div className="list-info">
                <div className="list-badge-container">
                  <div className="list-rank-badge">
                     {anime.tier ? `${anime.tier} Tier` : 'Anime'}
                  </div>
                  {anime.tags && (
                    <div className="list-tags">
                      {(Array.isArray(anime.tags) ? anime.tags : anime.tags.split(',').map(t => t.trim()).filter(Boolean)).map((tag, idx) => (
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
                <h3 className="list-title">{anime.title}</h3>
                <p className="list-note">{anime.note}</p>
                {/* 移除 list-actions 分數列，讓版面更清爽 */}
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < filteredAnime.length && (
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