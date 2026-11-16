// 彩蛋模式的狀態與切換：狀態本身就是 <html data-easter-egg="...">，這裡負責讀寫、通知訂閱者、播放轉場。
import {useSyncExternalStore} from 'react';
import {MODE_ATTR, MODES, MODE_STORAGE_KEY, MODE_FONTS, PROGRESS_STORAGE_KEY} from './constants';
import {playEightBitTransition, ENTER_LINES, EXIT_LINES} from './eightbit/transition';
import {playChiptune, POWER_UP, POWER_DOWN} from './eightbit/chiptune';

const listeners = new Set();
let busy = false;

/** @returns {'eightbit' | null} */
export function getMode() {
  if (typeof document === 'undefined') return null;
  const mode = document.documentElement.getAttribute(MODE_ATTR);
  return MODES.includes(mode) ? mode : null;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 目前的彩蛋模式（伺服器端與 hydration 時為 null，之後才讀到實際狀態） */
export function useEasterEggMode() {
  return useSyncExternalStore(subscribe, getMode, () => null);
}

function applyMode(mode) {
  const root = document.documentElement;
  if (mode) root.setAttribute(MODE_ATTR, mode);
  else root.removeAttribute(MODE_ATTR);
  try {
    // 每次開關模式都重新開始計分
    sessionStorage.removeItem(PROGRESS_STORAGE_KEY);
    if (mode) sessionStorage.setItem(MODE_STORAGE_KEY, mode);
    else sessionStorage.removeItem(MODE_STORAGE_KEY);
  } catch {
    // 無痕模式等情況存不了也沒關係，只是重新整理後不會保留
  }
  listeners.forEach((listener) => listener());
}

/** 載入模式需要的字型；回傳 stylesheet 載入完成的 Promise（不需要字型或已載入過就立即完成） */
function loadModeFont(mode) {
  const font = MODE_FONTS[mode];
  if (!font) return null;
  let link = document.getElementById(font.id);
  if (!link) {
    link = document.createElement('link');
    link.id = font.id;
    link.rel = 'stylesheet';
    link.href = font.href;
    document.head.appendChild(link);
  }
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    link.addEventListener('load', resolve, {once: true});
    link.addEventListener('error', resolve, {once: true});
  });
}

/** 等 stylesheet 載完、新樣式排版過一次、頁面上用到的字型分片下載完 */
async function waitForFont(stylesheetLoaded) {
  if (!stylesheetLoaded) return;
  await stylesheetLoaded;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (document.fonts?.ready) await document.fonts.ready;
}

/**
 * 切換彩蛋模式：目前就是 target 時關閉，否則切換過去。
 * @param {'eightbit'} target
 * @param {{restoreScrollY?: number}} [options] restoreScrollY：切換時捲回這個位置（方向鍵秘技會捲動頁面）
 */
export async function toggleMode(target, {restoreScrollY} = {}) {
  if (busy) return;
  busy = true;
  const current = getMode();
  const next = current === target ? null : target;
  const stylesheetLoaded = next ? loadModeFont(next) : null;
  if (next) window.umami?.track?.(`easter-egg-${next}`);

  const swap = async () => {
    if (typeof restoreScrollY === 'number') window.scrollTo({top: restoreScrollY, behavior: 'instant'});
    applyMode(next);
    await waitForFont(stylesheetLoaded);
  };

  try {
    playChiptune(next ? POWER_UP : POWER_DOWN);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) await swap();
    else await playEightBitTransition({lines: next ? ENTER_LINES : EXIT_LINES, onCovered: swap});
  } finally {
    busy = false;
  }
}
