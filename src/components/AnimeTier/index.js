import React from 'react';
import RankingList from '@site/src/components/RankingList';
import { TIER_FILTER_OPTIONS, getTierList, tierBadge } from '@site/src/components/RankingList/tiers';
import { animeList } from '@site/src/data/anime';

const badge = tierBadge('Anime');

export default function AnimeTierApp({ initialFilter = 'all', hideFilterBar = false, initialSearch = '' }) {
  return (
    <RankingList
      items={animeList}
      filterOptions={TIER_FILTER_OPTIONS}
      getList={getTierList}
      badge={badge}
      searchPlaceholder="搜尋動畫標題或心得..."
      countLabel="收錄作品"
      unit="部"
      emptyNoun="動畫 📺"
      initialFilter={initialFilter}
      hideFilterBar={hideFilterBar}
      initialSearch={initialSearch}
    />
  );
}
