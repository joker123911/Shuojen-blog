import React from 'react';
import stats from '@site/src/data/generated/siteStats.json';

// 數字由 scripts/prepare-data.js 在 npm start / build 前產生，about.md 不再被改寫
const fmt = (n) => n.toLocaleString('en-US');

export default function SiteStats() {
  return (
    <p>
      貼文區目前共有 <strong>{fmt(stats.postCount)}</strong> 篇文章，共累積了{' '}
      <strong>{fmt(stats.wordCount)}</strong> 個字；
      <br />
      攝影區目前共有 <strong>{fmt(stats.photoPostCount)}</strong> 篇文章，共累積了{' '}
      <strong>{fmt(stats.photoCount)}</strong> 張照片。
    </p>
  );
}
