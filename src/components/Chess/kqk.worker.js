import { buildTablebase } from './kqkTablebase';
import { buildKpkTablebase } from './kpkTablebase';

/** 'q'、'r'：回傳該殘局庫 { w, b }；'p'：回傳 { q, r, p }（王兵殘局升變後要用到后、車的殘局庫）。 */
self.onmessage = (e) => {
  if (e.data === 'p') {
    const q = buildTablebase('q');
    const r = buildTablebase('r');
    const p = buildKpkTablebase(q, r);
    const buffers = [q, r, p].flatMap((t) => [t.w.buffer, t.b.buffer]);
    self.postMessage({ q, r, p }, buffers);
    return;
  }
  const { w, b } = buildTablebase(e.data === 'r' ? 'r' : 'q');
  self.postMessage({ w, b }, [w.buffer, b.buffer]);
};
