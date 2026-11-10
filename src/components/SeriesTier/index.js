import React from 'react';
import RankingList from '@site/src/components/RankingList';
import { TIER_FILTER_OPTIONS, getTierList, tierBadge } from '@site/src/components/RankingList/tiers';
import { animeList as seriesList } from '@site/src/data/series';

const badge = tierBadge('Series');

export default function SeriesTierApp({ initialFilter = 'all', hideFilterBar = false, initialSearch = '' }) {
  return (
    <RankingList
      items={seriesList}
      filterOptions={TIER_FILTER_OPTIONS}
      getList={getTierList}
      badge={badge}
      searchPlaceholder="搜尋劇集標題或心得..."
      countLabel="收錄作品"
      unit="部"
      emptyNoun="劇集 📺"
      initialFilter={initialFilter}
      hideFilterBar={hideFilterBar}
      initialSearch={initialSearch}
    />
  );
}
