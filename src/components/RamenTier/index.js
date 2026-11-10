import React from 'react';
import RankingList from '@site/src/components/RankingList';
import { TIER_FILTER_OPTIONS, getTierList, tierBadge } from '@site/src/components/RankingList/tiers';
import { ramenList } from '@site/src/data/ramen';

const badge = tierBadge('Ramen');

// 整張卡片連到 Google 地圖（沒有指定連結時用店名搜尋）
const linkOf = (ramen) =>
  ramen.link ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ramen.title} 拉麵`)}`;

export default function RamenTierApp({ initialFilter = 'all', hideFilterBar = false, initialSearch = '' }) {
  return (
    <RankingList
      items={ramenList}
      filterOptions={TIER_FILTER_OPTIONS}
      getList={getTierList}
      badge={badge}
      linkOf={linkOf}
      searchPlaceholder="搜尋拉麵店名、地區或短評..."
      countLabel="收錄店鋪"
      unit="間"
      emptyNoun="拉麵店 🍜"
      initialFilter={initialFilter}
      hideFilterBar={hideFilterBar}
      initialSearch={initialSearch}
    />
  );
}
