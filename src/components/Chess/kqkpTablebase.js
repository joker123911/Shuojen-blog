/**
 * 王后對王兵（KQ vs KP，兵是黑兵）殘局庫，在瀏覽器裡算出。
 *
 * 黑兵只有吃子時才會換直線，而它能吃的只有白后（吃了就是和棋），所以一條直線算一份就好。
 * 局面索引：slice * 64³ + ((白王 * 64 + 白后) * 64 + 黑王)，slice = 黑兵所在橫線 - 1（0～5，對應第 2～7 橫線），
 * 格子編號同 kqkTablebase（a1 = 0、h8 = 63）。
 *   >= 0：白方在這麼多個半步（ply）後將死（吃兵後接單后殺王的步數也算進去）
 *   DRAW：和棋
 *   ILLEGAL：不合法局面
 *
 * 近似：黑兵升后之後，白方能立刻吃掉新后就照單后殺王算，吃不到就當和棋（后對后絕大多數是和棋）。
 * 黑方只考慮升后，不考慮升車、象、馬。
 */
import { DRAW, ILLEGAL, idx } from './kqkTablebase';

const INF = 32767;
const SLICE = 64 * 64 * 64;
const N = 6 * SLICE;

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const KING_MOVES = [];
const ADJ = new Uint8Array(64 * 64);
const RAYS = [];
for (let s = 0; s < 64; s++) {
  const f = s & 7;
  const r = s >> 3;
  const list = [];
  const rays = [];
  for (const [df, dr] of DIRS) {
    if (f + df >= 0 && f + df < 8 && r + dr >= 0 && r + dr < 8) {
      const t = (r + dr) * 8 + f + df;
      list.push(t);
      ADJ[s * 64 + t] = 1;
    }
    const ray = [];
    for (let nf = f + df, nr = r + dr; nf >= 0 && nf < 8 && nr >= 0 && nr < 8; nf += df, nr += dr) ray.push(nr * 8 + nf);
    rays.push(ray);
  }
  KING_MOVES.push(list);
  RAYS.push(rays);
}
const adjacent = (a, b) => ADJ[a * 64 + b] === 1;

/** 黑兵（在 bp）是否攻擊 target。 */
function pawnAttacks(bp, target) {
  const f = bp & 7;
  return (f > 0 && target === bp - 9) || (f < 7 && target === bp - 7);
}

// ALIGNED[a * 64 + b]：a、b 在同一條直線／斜線上；BETWEEN[(a * 64 + b) * 64 + c]：c 在 a、b 中間
const ALIGNED = new Uint8Array(64 * 64);
const BETWEEN = new Uint8Array(64 * 64 * 64);
for (let a = 0; a < 64; a++) {
  for (const ray of RAYS[a]) {
    for (let k = 0; k < ray.length; k++) {
      ALIGNED[a * 64 + ray[k]] = 1;
      for (let m = 0; m < k; m++) BETWEEN[(a * 64 + ray[k]) * 64 + ray[m]] = 1;
    }
  }
}

/** 白后是否攻擊 target；擋路的子是 a、b（白王、黑兵）。 */
function queenAttacks(wq, target, a, b) {
  if (wq === target || !ALIGNED[wq * 64 + target]) return false;
  const base = (wq * 64 + target) * 64;
  return !(a >= 0 && BETWEEN[base + a]) && !(b >= 0 && BETWEEN[base + b]);
}

/**
 * 建立某一條直線的殘局庫。q 是 kqkTablebase 的 buildTablebase('q') 結果（吃兵之後要查）。
 * 回傳 { file, w, b }，兩個 Int16Array。
 */
export function buildKqkpTablebase(q, file) {
  const w = new Int16Array(N).fill(ILLEGAL);
  const b = new Int16Array(N).fill(ILLEGAL);
  const left = new Uint8Array(SLICE); // 黑方局面還沒確定是輸棋的王步數
  const worst = new Int16Array(SLICE); // 黑方目前已知最久的輸法

  /** 黑兵升后（新后在 s）、輪白方走的局面值：白方能立刻吃掉新后才算贏。 */
  const promoted = (wk, wq, bk, s) => {
    let best = INF;
    if (adjacent(wk, s) && !adjacent(s, bk)) {
      const v = q.b[idx(s, wq, bk)];
      if (v >= 0) best = v;
    }
    if (queenAttacks(wq, s, wk, bk)) {
      const v = q.b[idx(wk, s, bk)];
      if (v >= 0 && v < best) best = v;
    }
    return best === INF ? INF : best + 1;
  };

  // 兵往前走過的橫線（較低的 slice）先算好，所以從靠近升變的那一層開始
  for (let slice = 0; slice < 6; slice++) {
    const bp = (slice + 1) * 8 + file;
    const base = slice * SLICE;
    const buckets = []; // buckets[d]：值可能是 d 的局面；白方存 local，黑方存 local + SLICE
    const push = (d, x) => {
      while (buckets.length <= d) buckets.push([]);
      buckets[d].push(x);
    };

    // 初始化：先處理離開這一層的走法（吃兵、兵前進、升變、吃后），留下同一層裡的王、后步再逆推
    for (let wk = 0; wk < 64; wk++) {
      if (wk === bp) continue;
      for (let wq = 0; wq < 64; wq++) {
        if (wq === wk || wq === bp) continue;
        for (let bk = 0; bk < 64; bk++) {
          if (bk === wk || bk === wq || bk === bp || adjacent(wk, bk)) continue;
          const local = idx(wk, wq, bk);
          const i = base + local;
          const blackChecked = queenAttacks(wq, bk, wk, bp);

          // 白方走：吃兵就接單后殺王
          if (!blackChecked) {
            w[i] = INF;
            let best = INF;
            if (adjacent(wk, bp) && !adjacent(bp, bk)) best = Math.min(best, q.b[idx(bp, wq, bk)] >= 0 ? q.b[idx(bp, wq, bk)] : INF);
            if (queenAttacks(wq, bp, wk, bk)) best = Math.min(best, q.b[idx(wk, bp, bk)] >= 0 ? q.b[idx(wk, bp, bk)] : INF);
            if (best < INF) {
              w[i] = best + 1;
              push(best + 1, local);
            }
          }

          // 黑方走（白王不能正被將軍）
          if (pawnAttacks(bp, wk)) continue;
          let kingMoves = 0;
          let drawn = false;
          let exitWorst = -1;
          for (const t of KING_MOVES[bk]) {
            if (t === wk || t === bp || adjacent(t, wk)) continue;
            if (t === wq) drawn = true; // 吃后
            else if (!queenAttacks(wq, t, wk, bp)) kingMoves++;
          }
          if (pawnAttacks(bp, wq)) drawn = true; // 兵吃后
          let pawnMoves = 0;
          const one = bp - 8;
          if (!drawn && one !== wk && one !== wq && one !== bk && !queenAttacks(wq, bk, wk, one)) {
            pawnMoves++;
            const vs = [one < 8 ? promoted(wk, wq, bk, one) : w[base - SLICE + local]];
            const two = bp - 16;
            if (slice === 5 && two !== wk && two !== wq && two !== bk && !queenAttacks(wq, bk, wk, two)) {
              pawnMoves++;
              vs.push(w[base - 2 * SLICE + local]);
            }
            for (const v of vs) {
              if (v < 0 || v === INF) drawn = true;
              else exitWorst = Math.max(exitWorst, v);
            }
          }
          if (kingMoves + pawnMoves === 0 && !drawn) b[i] = blackChecked ? 0 : DRAW;
          else if (drawn) b[i] = DRAW;
          else {
            b[i] = INF;
            left[local] = kingMoves;
            worst[local] = exitWorst;
            if (kingMoves === 0) {
              b[i] = exitWorst + 1;
              push(exitWorst + 1, local + SLICE);
            }
          }
          if (b[i] === 0) push(0, local + SLICE);
        }
      }
    }

    // 依值由小到大逆推
    for (let d = 0; d < buckets.length; d++) {
      for (const x of buckets[d]) {
        if (x >= SLICE) {
          // 黑方局面確定是 d：找白方上一步（王或后走到現在的位置）
          const local = x - SLICE;
          const bk = local & 63;
          const wq = (local >> 6) & 63;
          const wk = local >> 12;
          for (const u of KING_MOVES[wk]) {
            if (u === wq || u === bp || adjacent(u, bk)) continue;
            const p = idx(u, wq, bk);
            if (w[base + p] > d + 1) {
              w[base + p] = d + 1;
              push(d + 1, p);
            }
          }
          if (pawnAttacks(bp, wk)) continue; // 白王被將軍時不能走后
          for (const ray of RAYS[wq]) {
            for (const u of ray) {
              if (u === wk || u === bk || u === bp) break;
              const p = idx(wk, u, bk);
              if (w[base + p] > d + 1) {
                w[base + p] = d + 1;
                push(d + 1, p);
              }
            }
          }
        } else {
          // 白方局面確定是 d：找黑方上一步（黑王走到現在的位置）
          if (w[base + x] !== d) continue; // 已經有更快的勝法
          const bk = x & 63;
          const wq = (x >> 6) & 63;
          const wk = x >> 12;
          for (const u of KING_MOVES[bk]) {
            if (u === wk || u === wq || u === bp || adjacent(u, wk)) continue;
            const p = idx(wk, wq, u);
            if (b[base + p] !== INF) continue;
            if (d > worst[p]) worst[p] = d;
            if (--left[p] === 0) {
              b[base + p] = worst[p] + 1;
              push(worst[p] + 1, p + SLICE);
            }
          }
        }
      }
      buckets[d] = null;
    }
  }

  for (let i = 0; i < N; i++) {
    if (w[i] === INF) w[i] = DRAW;
    if (b[i] === INF) b[i] = DRAW;
  }
  return { file, w, b };
}

/** 查表：黑兵在 bp（必須是這份表的直線）。 */
export function kqkpIndex(wk, wq, bk, bp) {
  return ((bp >> 3) - 1) * SLICE + idx(wk, wq, bk);
}
