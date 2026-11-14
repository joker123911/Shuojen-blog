// 彩蛋的共用常數：元件與 docusaurus.config.js（head 內的還原腳本）都從這裡取值，避免兩邊不同步。

/**
 * 開啟彩蛋模式時加在 <html> 上的屬性，值為模式名稱，該模式的全站樣式都掛在這個屬性底下。
 */
export const MODE_ATTR = 'data-easter-egg';

/** 可用的模式 */
export const MODES = ['eightbit'];

/** 狀態存在 sessionStorage：同一個分頁內換頁、重新整理都維持，關掉分頁再來就回到原本樣子 */
export const MODE_STORAGE_KEY = 'easter-egg-mode';

/** 8-bit 模式 HUD 的分數與走過的頁面，每次開啟模式時重新計算 */
export const PROGRESS_STORAGE_KEY = 'easter-egg-progress';

/**
 * 各模式需要額外載入的字型（只在該模式開啟時才載入，一般訪客不會多下載任何東西）。
 * 8-bit：俐方體11號（Cubic 11，SIL OFL 1.1），與粉圓同一個 emfont CDN，依 unicode-range 分片載入。
 */
export const MODE_FONTS = {
  eightbit: {id: 'easter-egg-font-eightbit', href: 'https://font.emtech.cc/css/Cubic11/400'},
};

/**
 * 放進 <head> 的內嵌腳本：重新整理時在畫面繪製前就套上模式屬性並載入字型，避免先閃一下原本的樣式。
 */
export const EASTER_EGG_RESTORE_SCRIPT = `try{var m=sessionStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(${JSON.stringify(MODES)}.indexOf(m)>-1){document.documentElement.setAttribute(${JSON.stringify(MODE_ATTR)},m);var f=${JSON.stringify(MODE_FONTS)}[m];if(f){var l=document.createElement('link');l.id=f.id;l.rel='stylesheet';l.href=f.href;document.head.appendChild(l);}}}catch(e){}`;
