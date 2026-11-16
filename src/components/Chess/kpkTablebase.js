/**
 * 王兵對單王（KP vs K）殘局庫，在瀏覽器裡算出。
 *
 * 局面索引：((白王 * 64 + 白兵) * 64 + 黑王)，格子編號同 kqkTablebase（a1 = 0、h8 = 63）。
 * 兩張表分別記錄「白方走」與「黑方走」的局面：
 *   >= 0：白方在這麼多個半步（ply）後將死（升變後接單后／單車殺王的步數也算進去）
 *   DRAW：和棋
 *   ILLEGAL：不合法局面
 * 升變後的局面直接查王后（q）、王車（r）殘局庫，所以建表時要先把那兩份給進來。
 */
import { DRAW, ILLEGAL, idx } from './kqkTablebase';

const INF = 32767;
const N = 64 * 64 * 64;

const KING_MOVES = [];
const ADJ = new Uint8Array(64 * 64);
for (let s = 0; s < 64; s++) {
  const f = s & 7;
  const r = s >> 3;
  const list = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const nf = f + df;
      const nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        const t = nr * 8 + nf;
        list.push(t);
        ADJ[s * 64 + t] = 1;
      }
    }
  }
  KING_MOVES.push(list);
}
const adjacent = (a, b) => ADJ[a * 64 + b] === 1;

/** 白兵是否攻擊 target。 */
function pawnAttacks(wp, target) {
  const f = wp & 7;
  return (f > 0 && target === wp + 7) || (f < 7 && target === wp + 9);
}

/** 黑方的所有走法：回傳 { to, capture }。capture = 吃掉沒有保護的兵。 */
function blackMoves(wk, wp, bk) {
  const out = [];
  for (const t of KING_MOVES[bk]) {
    if (t === wk || adjacent(t, wk) || pawnAttacks(wp, t)) continue;
    out.push({ to: t, capture: t === wp });
  }
  return out;
}

/**
 * 建立殘局庫。q、r 是 kqkTablebase 的 buildTablebase('q')、buildTablebase('r') 結果。
 * 回傳 { w, b }，兩個長度 64³ 的 Int16Array。
 */
export function buildKpkTablebase(q, r) {
  const w = new Int16Array(N).fill(ILLEGAL);
  const b = new Int16Array(N).fill(ILLEGAL);

  for (let wk = 0; wk < 64; wk++) {
    for (let wp = 8; wp < 56; wp++) {
      if (wp === wk) continue;
      for (let bk = 0; bk < 64; bk++) {
        if (bk === wk || bk === wp || adjacent(wk, bk)) continue;
        const i = idx(wk, wp, bk);
        const check = pawnAttacks(wp, bk);
        // 白方走的時候黑王不能正被將軍
        if (!check) w[i] = INF;
        const moves = blackMoves(wk, wp, bk);
        if (moves.length === 0) b[i] = check ? 0 : DRAW;
        else if (moves.some((m) => m.capture)) b[i] = DRAW;
        else b[i] = INF;
      }
    }
  }

  /** 白方升變後（黑方走）的值：后、車挑比較快的。 */
  const promoted = (wk, sq, bk) => {
    let best = INF;
    for (const tb of [q, r]) {
      const v = tb.b[idx(wk, sq, bk)];
      if (v >= 0 && v < best) best = v;
    }
    return best;
  };

  // 反覆更新到不再變動：白方取最快的勝法，黑方要所有走法都輸才算輸，取拖最久的
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < N; i++) {
      if (w[i] < 0) continue;
      const bk = i & 63;
      const wp = (i >> 6) & 63;
      const wk = i >> 12;
      let best = INF;
      for (const t of KING_MOVES[wk]) {
        if (t === wp || t === bk || adjacent(t, bk)) continue;
        const v = b[idx(t, wp, bk)];
        if (v >= 0 && v < best) best = v;
      }
      const one = wp + 8;
      if (one !== wk && one !== bk) {
        const v = one >= 56 ? promoted(wk, one, bk) : b[idx(wk, one, bk)];
        if (v >= 0 && v < best) best = v;
        const two = wp + 16;
        if (wp < 16 && two !== wk && two !== bk) {
          const v2 = b[idx(wk, two, bk)];
          if (v2 >= 0 && v2 < best) best = v2;
        }
      }
      if (best < INF && best + 1 < w[i]) {
        w[i] = best + 1;
        changed = true;
      }
    }
    for (let i = 0; i < N; i++) {
      if (b[i] <= 0) continue;
      const bk = i & 63;
      const wp = (i >> 6) & 63;
      const wk = i >> 12;
      let worst = -1;
      for (const m of blackMoves(wk, wp, bk)) {
        const v = w[idx(wk, wp, m.to)];
        if (v < 0 || v === INF) {
          worst = INF;
          break;
        }
        if (v > worst) worst = v;
      }
      if (worst < INF && worst + 1 !== b[i]) {
        b[i] = worst + 1;
        changed = true;
      }
    }
  }

  for (let i = 0; i < N; i++) {
    if (w[i] === INF) w[i] = DRAW;
    if (b[i] === INF) b[i] = DRAW;
  }
  return { w, b };
}
