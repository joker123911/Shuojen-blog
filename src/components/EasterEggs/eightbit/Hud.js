import React, {useEffect, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import {PROGRESS_STORAGE_KEY} from '../constants';
import {useEasterEggMode} from '../modeStore';

/**
 * 8-bit 模式導覽列下方的遊戲 HUD：分數、金幣（逛過幾個頁面）、目前區塊、時間。
 * 由 src/theme/Navbar 掛在導覽列後面，只有 8-bit 模式開著時才會渲染。
 */

// 路徑開頭 → 區塊名稱
const STAGES = [
  ['/blog', '貼文'],
  ['/photoblog', '攝影'],
  ['/photography', '攝影'],
  ['/docs', '興趣'],
  ['/albums', '專輯'],
  ['/random', '隨機'],
  ['/about', '關於'],
  ['/now', '近況'],
  ['/use', '愛用'],
  ['/tool', '工具'],
  ['/blogroll', '部落卷'],
  ['/guestbook', '留言板'],
  ['/search', '搜尋'],
];

const POINTS_PER_PAGE = 100;

function stageOf(pathname) {
  if (pathname === '/') return '首頁';
  const found = STAGES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return found ? found[1] : '???';
}

/** 記錄走過的頁面，回傳走過幾個不同的頁面 */
function recordVisit(pathname) {
  try {
    const visited = new Set(JSON.parse(sessionStorage.getItem(PROGRESS_STORAGE_KEY) || '[]'));
    visited.add(pathname);
    sessionStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify([...visited]));
    return visited.size;
  } catch {
    return 1;
  }
}

function clock() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function HudBar() {
  const {pathname} = useLocation();
  const [coins, setCoins] = useState(0);
  const [time, setTime] = useState(clock);

  useEffect(() => setCoins(recordVisit(pathname)), [pathname]);

  useEffect(() => {
    const timer = setInterval(() => setTime(clock()), 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="eightbit-hud" aria-hidden="true">
      <div>
        <div>SHUOJEN</div>
        <div>{String(coins * POINTS_PER_PAGE).padStart(6, '0')}</div>
      </div>
      <div className="eightbit-hud__coins">
        <div>&nbsp;</div>
        <div>
          <span className="eightbit-coin" />×{String(coins).padStart(2, '0')}
        </div>
      </div>
      <div>
        <div>STAGE</div>
        <div>{stageOf(pathname)}</div>
      </div>
      <div>
        <div>TIME</div>
        <div>{time}</div>
      </div>
    </div>
  );
}

export default function Hud() {
  const mode = useEasterEggMode();
  return mode === 'eightbit' ? <HudBar /> : null;
}
