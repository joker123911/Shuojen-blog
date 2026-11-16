import { buildTablebase } from './kqkTablebase';
import { buildKpkTablebase } from './kpkTablebase';

const tablebasePromises = {};

function buildOnMainThread(kind) {
  if (kind !== 'p') return buildTablebase(kind);
  const q = buildTablebase('q');
  const r = buildTablebase('r');
  return { q, r, p: buildKpkTablebase(q, r) };
}

/**
 * 載入殘局庫（整個頁面每種共用一份）。優先在 Web Worker 計算，失敗就改在主執行緒算。
 * - 'q'：王后對單王 { w, b }
 * - 'r'：王車對單王 { w, b }
 * - 'p'：王兵對單王，連同升變後要用的后、車殘局庫一起回傳 { q, r, p }
 */
export function loadTablebase(kind = 'q') {
  if (tablebasePromises[kind]) return tablebasePromises[kind];
  tablebasePromises[kind] = new Promise((resolve) => {
    const fallback = () => setTimeout(() => resolve(buildOnMainThread(kind)), 30);
    try {
      const worker = new Worker(new URL('./kqk.worker.js', import.meta.url));
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        worker.terminate();
        fallback();
      };
      worker.postMessage(kind);
    } catch {
      fallback();
    }
  });
  return tablebasePromises[kind];
}
