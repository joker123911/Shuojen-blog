import React, { useState, useMemo } from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
// 匯入拆分出去的資料與 CSS
import { westernMovies, asiaMovies, animeMovies } from '@site/src/data/movies';
import './styles.css';

// 建立一個洗牌函數 (Fisher-Yates Shuffle)，讓陣列隨機排序
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const MovieGrid = ({ movies, onImageClick }) => (
  <div className="movie-grid">
    {movies.map((movie, idx) => (
      <div 
        key={idx} 
        className="movie-card" 
        onClick={() => onImageClick(movie.poster, movie.title)}
        style={{ cursor: 'pointer' }}
      >
        <span className="movie-title">{movie.title}</span>
        <p className="movie-note">{movie.note}</p>
      </div>
    ))}
  </div>
);

export default function MovieListApp() {
  const [activePoster, setActivePoster] = useState(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  
  const [visibleCounts, setVisibleCounts] = useState({
    western: 50,
    asia: 50,
    anime: 50
  });

  // 使用 useMemo 確保每次組件載入時只洗牌一次，避免點擊 LOAD MORE 時重新洗牌
  const randomizedWestern = useMemo(() => shuffleArray(westernMovies), []);
  const randomizedAsia = useMemo(() => shuffleArray(asiaMovies), []);
  const randomizedAnime = useMemo(() => shuffleArray(animeMovies), []);

  const handleOpen = (url, title) => {
    setIsImgLoaded(false);
    setActivePoster(url);
    setActiveTitle(title);
  };

  const handleClose = () => {
    setActivePoster(null);
  };

  const loadMore = (category) => {
    setVisibleCounts(prev => ({
      ...prev,
      [category]: prev[category] + 50
    }));
  };

  return (
    <div className="tabs-container">
      <Tabs>
        <TabItem value="western" label="🌎 歐美電影" default>
          <MovieGrid movies={randomizedWestern.slice(0, visibleCounts.western)} onImageClick={handleOpen} />
          {visibleCounts.western < randomizedWestern.length && (
            <button className="load-more-btn" onClick={() => loadMore('western')}>LOAD MORE</button>
          )}
        </TabItem>
        <TabItem value="asia" label="🥢 華語日韓">
          <MovieGrid movies={randomizedAsia.slice(0, visibleCounts.asia)} onImageClick={handleOpen} />
          {visibleCounts.asia < randomizedAsia.length && (
            <button className="load-more-btn" onClick={() => loadMore('asia')}>LOAD MORE</button>
          )}
        </TabItem>
        <TabItem value="anime" label="🎨 動畫電影">
          <MovieGrid movies={randomizedAnime.slice(0, visibleCounts.anime)} onImageClick={handleOpen} />
          {visibleCounts.anime < randomizedAnime.length && (
            <button className="load-more-btn" onClick={() => loadMore('anime')}>LOAD MORE</button>
          )}
        </TabItem>
      </Tabs>

      {activePoster && (
        <div className="poster-modal-overlay" onClick={handleClose}>
          <div className="poster-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{activeTitle}</span>
              <button className="close-btn" onClick={handleClose}>×</button>
            </div>
            
            <div className={`poster-frame ${isImgLoaded ? 'loaded' : 'loading'}`}>
              <img 
                // 將 "./img/movie/..." 轉換為 Docusaurus 可識別的絕對路徑
                // 假設你的 md 檔放在 docs/ 資料夾內
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