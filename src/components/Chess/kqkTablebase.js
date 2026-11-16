/**
 * 王后對單王（KQ vs K）、王車對單王（KR vs K）殘局庫，在瀏覽器裡用逆推法即時算出。
 * piece：'q'＝后（8 個方向）、'r'＝車（4 個直線方向）；以下變數名稱的 wq 指的就是這隻白子。
 *
 * 局面索引：((白王 * 64 + 白后) * 64 + 黑王)，格子編號 = 橫線 * 8 + 直線（a1 = 0、h8 = 63）。
 * 兩張表分別記錄「白方走」與「黑方走」的局面：
 *   >= 0：白方在這麼多個半步（ply）後將死
 *   DRAW：和棋（逼和、后被吃）
 *   ILLEGAL：不合法局面
 * 白方走：值越小越好；黑方走：黑方挑值最大的走法，拖最久。
 */

export const DRAW = -1;
export const ILLEGAL = -2;
const UNKNOWN = -3;

const N = 64 * 64 * 64;
const FILES = 'abcdefgh';

// 前 4 個是直線方向（車），8 個全部是后
const KING_STEPS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const KING_MOVES = [];
const ADJ = new Uint8Array(64 * 64);
for (let s = 0; s < 64; s++) {
  const f = s & 7;
  const r = s >> 3;
  const list = [];
  for (const [df, dr] of KING_STEPS) {
    const nf = f + df;
    const nr = r + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      const t = nr * 8 + nf;
      list.push(t);
      ADJ[s * 64 + t] = 1;
    }
  }
  KING_MOVES.push(list);
}

/** 從 from 出發的 8 條射線，每條依距離排列。 */
const RAYS = [];
for (let s = 0; s < 64; s++) {
  const f = s & 7;
  const r = s >> 3;
  const rays = [];
  for (const [df, dr] of KING_STEPS) {
    const ray = [];
    let nf = f + df;
    let nr = r + dr;
    while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      ray.push(nr * 8 + nf);
      nf += df;
      nr += dr;
    }
    rays.push(ray);
  }
  RAYS.push(rays);
}

export const sqName = (s) => FILES[s & 7] + ((s >> 3) + 1);
export const sqIndex = (name) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
export const idx = (wk, wq, bk) => (wk * 64 + wq) * 64 + bk;

const adjacent = (a, b) => ADJ[a * 64 + b] === 1;

const ROOK_RAYS = RAYS.map((rays) => rays.slice(0, 4));
const raysOf = (s, piece) => (piece === 'r' ? ROOK_RAYS[s] : RAYS[s]);

/** 后／車（被白王擋住）是否攻擊到 target。黑王不算阻擋，因為它正要離開原本的格子。 */
function queenAttacks(wq, wk, target, piece) {
  if (wq === target) return false;
  for (const ray of raysOf(wq, piece)) {
    for (const t of ray) {
      if (t === target) return true;
      if (t === wk) break;
    }
  }
  return false;
}

/** 黑方的所有走法：回傳 { to, capture }。capture = 吃掉沒有保護的后。 */
export function blackMoves(wk, wq, bk, piece = 'q') {
  const out = [];
  for (const t of KING_MOVES[bk]) {
    if (t === wk || adjacent(t, wk)) continue;
    if (t === wq) {
      out.push({ to: t, capture: true });
      continue;
    }
    if (queenAttacks(wq, wk, t, piece)) continue;
    out.push({ to: t, capture: false });
  }
  return out;
}

/** 白方的所有走法：回傳 { piece: 'k' | 'q', from, to }。 */
export function whiteMoves(wk, wq, bk, piece = 'q') {
  const out = [];
  for (const t of KING_MOVES[wk]) {
    if (t === wq || t === bk || adjacent(t, bk)) continue;
    out.push({ piece: 'k', from: wk, to: t });
  }
  for (const ray of raysOf(wq, piece)) {
    for (const t of ray) {
      if (t === wk || t === bk) break;
      out.push({ piece: 'q', from: wq, to: t });
    }
  }
  return out;
}

export function blackInCheck(wk, wq, bk, piece = 'q') {
  return queenAttacks(wq, wk, bk, piece);
}

function legalBase(wk, wq, bk) {
  return wk !== wq && wk !== bk && wq !== bk && !adjacent(wk, bk);
}

/**
 * 建立殘局庫。回傳 { w, b }，兩個長度 64³ 的 Int8Array。
 * 在一般電腦上約幾百毫秒。
 */
export function buildTablebase(piece = 'q') {
  const w = new Int8Array(N).fill(ILLEGAL);
  const b = new Int8Array(N).fill(ILLEGAL);

  // 初始化：標出不合法、將死、逼和
  for (let wk = 0; wk < 64; wk++) {
    for (let wq = 0; wq < 64; wq++) {
      for (let bk = 0; bk < 64; bk++) {
        if (!legalBase(wk, wq, bk)) continue;
        const i = idx(wk, wq, bk);
        const check = blackInCheck(wk, wq, bk, piece);
        if (!check) w[i] = UNKNOWN;
        const moves = blackMoves(wk, wq, bk, piece);
        if (moves.length === 0) {
          b[i] = check ? 0 : DRAW;
        } else if (moves.some((m) => m.capture)) {
          b[i] = DRAW;
        } else {
          b[i] = UNKNOWN;
        }
      }
    }
  }

  // 一個半步一個半步往回推
  let quiet = 0;
  for (let ply = 1; quiet < 2 && ply < 127; ply++) {
    let changed = false;
    if (ply % 2 === 1) {
      // 白方走：只要有一步走到「黑方 ply-1 半步後被將死」的局面
      const target = ply - 1;
      for (let i = 0; i < N; i++) {
        if (w[i] !== UNKNOWN) continue;
        const bk = i & 63;
        const wq = (i >> 6) & 63;
        const wk = i >> 12;
        for (const m of whiteMoves(wk, wq, bk, piece)) {
          const j = m.piece === 'k' ? idx(m.to, wq, bk) : idx(wk, m.to, bk);
          if (b[j] === target) {
            w[i] = ply;
            changed = true;
            break;
          }
        }
      }
    } else {
      // 黑方走：所有走法都通往白勝局面
      for (let i = 0; i < N; i++) {
        if (b[i] !== UNKNOWN) continue;
        const bk = i & 63;
        const wq = (i >> 6) & 63;
        const wk = i >> 12;
        let allWon = true;
        for (const m of blackMoves(wk, wq, bk, piece)) {
          if (w[idx(wk, wq, m.to)] < 0) {
            allWon = false;
            break;
          }
        }
        if (allWon) {
          b[i] = ply;
          changed = true;
        }
      }
    }
    quiet = changed ? 0 : quiet + 1;
  }

  // 剩下的都是和棋（例如白方無論怎麼走都會送后／車或逼和，實際上 KQK、KRK 不會出現）
  for (let i = 0; i < N; i++) {
    if (w[i] === UNKNOWN) w[i] = DRAW;
    if (b[i] === UNKNOWN) b[i] = DRAW;
  }
  return { w, b };
}

/** 從 FEN 讀出白王、白后（或白車）、黑王的位置；不是 KQK／KRK 局面時回傳 null。 */
export function kqkFromFen(fen) {
  const board = fen.split(' ')[0];
  let wk = -1;
  let wq = -1;
  let bk = -1;
  let extra = false;
  const rows = board.split('/');
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        f += Number(ch);
        continue;
      }
      const s = (7 - r) * 8 + f;
      if (ch === 'K') wk = s;
      else if ((ch === 'Q' || ch === 'R') && wq < 0) wq = s;
      else if (ch === 'k') bk = s;
      else extra = true;
      f++;
    }
  }
  if (extra || wk < 0 || wq < 0 || bk < 0) return null;
  return { wk, wq, bk };
}

/** 組出 FEN（不含易位、吃過路兵）。 */
export function kqkToFen(wk, wq, bk, turn = 'w', pieceType = 'q') {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const s = r * 8 + f;
      const piece = s === wk ? 'K' : s === wq ? pieceType.toUpperCase() : s === bk ? 'k' : null;
      if (piece) {
        if (empty) row += empty;
        empty = 0;
        row += piece;
      } else {
        empty++;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${turn} - - 0 1`;
}
