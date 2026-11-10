import React from 'react';
import RankingList from '@site/src/components/RankingList';
import { westernMovies, asiaMovies, animeMovies, hongkongMovies } from '@site/src/data/movies';

// 合併原始資料並標記分類
const MOVIES = [
  ...westernMovies.map((m) => ({ ...m, category: 'western' })),
  ...asiaMovies.map((m) => ({ ...m, category: 'asia' })),
  ...animeMovies.map((m) => ({ ...m, category: 'anime' })),
  ...hongkongMovies.map((m) => ({ ...m, category: 'hongkong' })),
];

const yearOf = (m) => {
  const tags = Array.isArray(m.tags) ? m.tags : (m.tags || '').split(',').map((t) => t.trim());
  const yearTag = tags.find((tag) => /^\d{4}$/.test(tag));
  return yearTag ? parseInt(yearTag, 10) : 0;
};

// 依評分排序（同分維持資料原順序）
const SCORE_SORTED = [...MOVIES].sort((a, b) => (b.score || 0) - (a.score || 0));
// 依年份排序（新到舊；同年依評分）
const YEAR_SORTED = [...MOVIES].sort(
  (a, b) => yearOf(b) - yearOf(a) || (b.score || 0) - (a.score || 0),
);
// 全部電影的評分名次（年份排序時顯示這個，而不是列表位置）
const OVERALL_RANK = new Map(SCORE_SORTED.map((m, i) => [m, i + 1]));

const FILTER_OPTIONS = [
  { value: 'top100', label: '🎬 評分排序' }, // value 沿用舊名，文章內嵌時會用到
  { value: 'all', label: '📅 年份排序' },
  { value: 'western', label: '🌎 歐美電影' },
  { value: 'asia', label: '🥢 華語日韓' },
  { value: 'hongkong', label: '🎞️ 童年港片' },
  { value: 'anime', label: '🎨 動畫電影' },
];

function getList(filter) {
  if (filter === 'top100') return SCORE_SORTED;
  if (filter === 'all') return YEAR_SORTED;
  return SCORE_SORTED.filter((m) => m.category === filter);
}

const badge = (movie, rank, filter) =>
  `#${filter === 'all' ? OVERALL_RANK.get(movie) : rank}`;

export default function MovieListApp({ initialFilter = 'top100', hideFilterBar = false, initialSearch = '' }) {
  return (
    <RankingList
      items={MOVIES}
      filterOptions={FILTER_OPTIONS}
      getList={getList}
      badge={badge}
      showScore
      searchPlaceholder="搜尋電影標題或心得..."
      countLabel="收錄電影"
      unit="部"
      emptyNoun="電影 🎬"
      initialFilter={initialFilter}
      hideFilterBar={hideFilterBar}
      initialSearch={initialSearch}
    />
  );
}
