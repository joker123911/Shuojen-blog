---
title: '人生流水事紀'
tags: ['life']
date: 2026-07-01
rss_date: '2026-07-01T17:50:48+08:00'
---

瑣碎、沒人在乎，但卻對我很重要的一些人、一些時刻。
<img src={require('./img202607/001.jpg').default} width="300" alt="img" />

import Link from '@docusaurus/Link';

export const renderDesc = (desc) => {
  const parts = [];
  let lastIndex = 0;
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(desc)) !== null) {
    const textBefore = desc.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(textBefore);
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <Link key={match.index} to={linkUrl}>
        {linkText}
      </Link>
    );
    lastIndex = regex.lastIndex;
  }
  const textAfter = desc.substring(lastIndex);
  if (textAfter) {
    parts.push(textAfter);
  }
  return parts.length > 0 ? parts : desc;
};

export const timelineData = [
  { year: "1998", desc: "出生於臺北" },
  { year: "2004", desc: "上小學，第一次搬家\n認識[王胖](/photoblog/2026/05/16/tamsui)、[翁伯伯](/blog/2026/06/26/hobby) \n開始學[鋼琴](/docs/music/piano)" },
  { year: "2008", desc: "解開人生第一顆[魔術方塊](/docs/rubiks_cube/competition)" },
  { year: "2010", desc: "上國中，認識[大隊長、盧董](/photoblog/2023/11/30/trip)、[築雅](/photoblog/2023/02/28/trip)" },
  { year: "2013", desc: "上[高中](/blog/2026/05/20/highschool)，認識[蒜頭](/photoblog/2020/09/25/wolf)、[肥凱](/blog/2016/08/29/friend)、雅婷" },
  { year: "2014", desc: "學烏克麗麗之後加入[吉他](/docs/music/guitar)社，第一首學會的曲子是「痛哭的人」" },
  { year: "2016", desc: "上大學，認識[咩咩、阿楷、嘉琪](/photoblog/2025/02/18/korea)、[阿簡、家豪](/photoblog/2020/08/01/trip)" },
  { year: "2017", desc: "開始喜歡看[電影](/docs/movie_list)。每天晚上跟家豪一起熬夜刷 imdb 榜上的電影" },
  { year: "2018", desc: "開始玩[水族](/docs/aqua)。跟咩咩、阿楷一起在租房處養魚，阿楷養海水缸，我跟咩咩玩孔雀魚" },
  { year: "2019", desc: "從[底片相機](/blog/2026/03/20/camera)開始[喜歡上攝影](/blog/2019/05/11/friend)\n入手人生第一臺[檔車](/blog/2026/06/18/motorcycle)" },
  { year: "2020", desc: "畢業後[登出斗六](/blog/2020/06/30/goodbye)，回台北重考研究所" },
  { year: "2021", desc: "上研究所，認識峻寶寶、[冠宏](/photoblog/2023/03/07/trip)、倪哥、蕭告、競賽\n看了[《后翼棄兵》](/docs/chess/chess_start)後開始學[西洋棋](/docs/chess/chess_start)" },
  { year: "2022", desc: "魔術方塊官方紀錄單次 8.81，達到目標後半退坑\n入手人生第一張滑板\n參加人生第一場[西洋棋比賽](/docs/chess/competition)" },
  { year: "2023", desc: "[離校](/photoblog/2023/08/03/417)後當兵，開始人生第一份正式工作" },
  { year: "2024", desc: "與[蝦波](/photoblog/2025/02/19/bo)開始交往\n年底開始人生第二份正式工作" },
  { year: "2025", desc: "開始寫[部落格](/blog/2025/12/31/blog)，發現自己的人生除了自己，沒有人會幫你回顧" },
  { year: "2026", desc: "與蝦波和[嗶寶](/blog/2026/02/12/bpo)同居" }
];

<style>{`
  .timeline-wrapper {
    position: relative;
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
    box-sizing: border-box;
  }
  .timeline-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 2rem;
    width: 4px;
    background: linear-gradient(to bottom, var(--ifm-color-primary) 0%, var(--ifm-color-primary-light) 100%);
    transform: scaleY(0);
    transform-origin: top;
    animation: drawLine 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .timeline-node {
    position: relative;
    margin-bottom: 2rem;
    padding-left: 3.5rem;
    opacity: 0;
    transform: translateY(20px);
    animation: fadeInNode 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .timeline-node::before {
    content: '';
    position: absolute;
    left: calc(2rem - 6px);
    top: 1.5rem;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--ifm-background-color, #fff);
    border: 4px solid var(--ifm-color-primary);
    z-index: 2;
    transition: transform 0.2s ease, background-color 0.2s ease;
  }
  .timeline-node:hover::before {
    background: var(--ifm-color-primary);
    transform: scale(1.3);
  }
  .timeline-card {
    background: var(--ifm-background-surface-color, #f5f6f7);
    border: 1px solid var(--ifm-color-emphasis-200, #ebedf0);
    border-radius: 8px;
    padding: 1.25rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  }
  .timeline-card:hover {
    transform: translateX(6px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-color: var(--ifm-color-primary);
  }
  .timeline-year-badge {
    display: inline-block;
    font-weight: bold;
    font-size: 1.15rem;
    color: var(--ifm-color-primary);
    margin-bottom: 0.5rem;
  }
  .timeline-desc {
    margin: 0;
    font-size: 0.95rem;
    color: var(--ifm-font-color-base);
    line-height: 1.6;
    white-space: pre-line;
  }
  @keyframes drawLine {
    to { transform: scaleY(1); }
  }
  @keyframes fadeInNode {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>

<div className="timeline-wrapper">
  {timelineData.map((item, index) => (
    <div className="timeline-node" key={index} style={{ animationDelay: `${(index + 1) * 0.1}s` }}>
      <div className="timeline-card">
        <div className="timeline-year-badge">{item.year}</div>
        <p className="timeline-desc">{renderDesc(item.desc)}</p>
      </div>
    </div>
  ))}
</div>
