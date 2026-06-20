import React, { useState, useMemo } from 'react';
import { jinyungList } from '@site/src/data/jinyung';
import './styles.css';

export default function JinYungTierApp({ initialFilter = 'all', hideFilterBar = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [visibleCount, setVisibleCount] = useState(100); 

  const processedJinyung = useMemo(() => {
    return [...jinyungList];
  }, []);

  // 篩選邏輯
  const filteredJinyung = useMemo(() => {
    let result = processedJinyung;

    // 1. Tier 篩選
    if (filter !== 'all') {
      result = processedJinyung.filter(m => m.tier === filter);
    }

    // 2. 搜尋關鍵字（包含標題、短評）
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(lowerSearch) || 
        (m.note && m.note.toLowerCase().includes(lowerSearch))
      );
    }

    return result;
  }, [processedJinyung, filter, searchTerm]);

  const displayedJinyung = filteredJinyung.slice(0, visibleCount);

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
            placeholder="搜尋小說書名或簡評..." 
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
        <div className="movie-count-badge">
          收錄作品：{processedJinyung.length} 部
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

      {filteredJinyung.length === 0 && (
        <div className="no-results">
          <p>找不到符合「{searchTerm}」的金庸小說 📖</p>
        </div>
      )}

      <div className="imdb-list">
        {displayedJinyung.map((jinyung, index) => {
          return (
            <div 
              key={`${jinyung.title}-${index}`} 
              className="list-item jinyung-item"
            >
              <div className="list-info">
                <div className="list-badge-container">
                  <div className="list-rank-badge">
                     {jinyung.tier ? `${jinyung.tier} Tier` : 'Novel'}
                  </div>
                </div>
                <h3 className="list-title">{jinyung.title}</h3>
                <p className="list-note">{jinyung.note}</p>
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < filteredJinyung.length && (
        <button className="load-more-btn" onClick={loadMore}>LOAD MORE</button>
      )}
    </div>
  );
}
