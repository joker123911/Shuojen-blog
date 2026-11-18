import { buildTablebase } from './kqkTablebase';
import { buildKpkTablebase } from './kpkTablebase';
import { buildKqkpTablebase } from './kqkpTablebase';

/**
 * 'q'、'r'：回傳該殘局庫 { w, b }；'p'：回傳 { q, r, p }（王兵殘局升變後要用到后、車的殘局庫）；
 * 'qp0'～'qp7'：回傳 { q, qp }（后對某條直線的黑兵，吃兵後要用到單后殺王）。
 */
self.onmessage = (e) => {
  if (typeof e.data === 'string' && e.data.startsWith('qp')) {
    const q = buildTablebase('q');
    const qp = buildKqkpTablebase(q, Number(e.data.slice(2)));
    self.postMessage({ q, qp }, [q.w.buffer, q.b.buffer, qp.w.buffer, qp.b.buffer]);
    return;
  }
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
