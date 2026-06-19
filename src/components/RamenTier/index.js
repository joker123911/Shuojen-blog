import React, { useState, useMemo } from 'react';
import { ramenList } from '@site/src/data/ramen';
import './styles.css';

export default function RamenTierApp({ initialFilter = 'all', hideFilterBar = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [visibleCount, setVisibleCount] = useState(100); 

  const processedRamen = useMemo(() => {
    return [...ramenList];
  }, []);

  // 篩選邏輯
  const filteredRamen = useMemo(() => {
    let result = processedRamen;

    // 1. Tier 篩選
    if (filter !== 'all') {
      result = processedRamen.filter(m => m.tier === filter);
    }

    // 2. 搜尋關鍵字（包含標題、短評及地區標籤）
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(lowerSearch) || 
        (m.note && m.note.toLowerCase().includes(lowerSearch)) ||
        (m.tags && m.tags.some(tag => tag.toLowerCase().includes(lowerSearch)))
      );
    }

    return result;
  }, [processedRamen, filter, searchTerm]);

  const displayedRamen = filteredRamen.slice(0, visibleCount);

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
    e.preventDefault(); // 阻止 <a> 的跳轉行為
    setSearchTerm(tag);
    setVisibleCount(100);
  };

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
            placeholder="搜尋拉麵店名、地區或短評..." 
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
        <div className="movie-count-badge">
          收錄店鋪：{processedRamen.length} 間
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

      {filteredRamen.length === 0 && (
        <div className="no-results">
          <p>找不到符合「{searchTerm}」的拉麵店 🍜</p>
        </div>
      )}

      <div className="imdb-list">
        {displayedRamen.map((ramen, index) => {
          const googleSearchUrl = ramen.link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ramen.title + ' 拉麵')}`;
          return (
            <a 
              key={`${ramen.title}-${index}`} 
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="list-item ramen-item"
            >
              <div className="list-info">
                <div className="list-badge-container">
                  <div className="list-rank-badge">
                     {ramen.tier ? `${ramen.tier} Tier` : 'Ramen'}
                  </div>
                  {ramen.tags && (
                    <div className="list-tags">
                      {ramen.tags.map((tag, idx) => (
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
                <h3 className="list-title">{ramen.title}</h3>
                <p className="list-note">{ramen.note}</p>
              </div>
            </a>
          );
        })}
      </div>

      {visibleCount < filteredRamen.length && (
        <button className="load-more-btn" onClick={loadMore}>LOAD MORE</button>
      )}
    </div>
  );
}
