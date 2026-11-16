import { buildTablebase } from './kqkTablebase';

let tablebasePromise = null;

/** 載入王后對單王殘局庫（整個頁面共用一份）。優先在 Web Worker 計算，失敗就改在主執行緒算。 */
export function loadTablebase() {
  if (tablebasePromise) return tablebasePromise;
  tablebasePromise = new Promise((resolve) => {
    const buildOnMainThread = () => setTimeout(() => resolve(buildTablebase()), 30);
    try {
      const worker = new Worker(new URL('./kqk.worker.js', import.meta.url));
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        worker.terminate();
        buildOnMainThread();
      };
      worker.postMessage('build');
    } catch {
      buildOnMainThread();
    }
  });
  return tablebasePromise;
}
