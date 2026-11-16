import { buildTablebase } from './kqkTablebase';

self.onmessage = () => {
  const { w, b } = buildTablebase();
  self.postMessage({ w, b }, [w.buffer, b.buffer]);
};
