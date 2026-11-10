// Tier 制排名（動畫、影集、拉麵、金庸）共用的篩選選項與邏輯
export const TIER_FILTER_OPTIONS = [
  { value: 'all', label: '🌈 全部等級' },
  { value: 'SSS', label: '💎 SSS Tier' },
  { value: 'SS', label: '🔥 SS Tier' },
  { value: 'S', label: '✨ S Tier' },
  { value: 'A', label: '👍 A Tier' },
  { value: 'B', label: '🆗 B Tier' },
];

// 維持資料原始順序，只依 Tier 篩選
export const getTierList = (filter, items) =>
  filter === 'all' ? items : items.filter((m) => m.tier === filter);

export const tierBadge = (fallback) => (item) => (item.tier ? `${item.tier} Tier` : fallback);
