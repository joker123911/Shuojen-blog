import React from 'react';
import RankingList from '@site/src/components/RankingList';
import { TIER_FILTER_OPTIONS, getTierList, tierBadge } from '@site/src/components/RankingList/tiers';
import { jinyungList } from '@site/src/data/jinyung';

const badge = tierBadge('Novel');

export default function JinYungTierApp({ initialFilter = 'all', hideFilterBar = false, initialSearch = '' }) {
  return (
    <RankingList
      items={jinyungList}
      filterOptions={TIER_FILTER_OPTIONS}
      getList={getTierList}
      badge={badge}
      searchPlaceholder="搜尋小說書名或簡評..."
      countLabel="收錄作品"
      unit="部"
      emptyNoun="金庸小說 📖"
      initialFilter={initialFilter}
      hideFilterBar={hideFilterBar}
      initialSearch={initialSearch}
    />
  );
}
