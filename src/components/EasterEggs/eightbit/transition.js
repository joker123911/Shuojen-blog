// 8-bit 轉場動畫：方塊斜向鋪滿畫面 → 中央秀出點陣大字 → 方塊再斜向退開。
// 全部畫在一張臨時的全螢幕 canvas 上，播完就移除，不經過 React。

// 紅白機色盤，與 eightbit.css 的配色一致：黑幕、磚紅、金幣、草綠、天空藍
const COVER_COLOR = '#000000';
const SPARK_COLORS = ['#c84c0c', '#fca044', '#f8b800', '#00a800', '#58d854', '#5c94fc', '#3cbcfc', '#fcfcfc'];
const TEXT_SHADOW_COLOR = '#c84c0c';

const COVER_MS = 520; // 方塊鋪滿所需時間
const UNCOVER_MS = 520; // 方塊退開所需時間
const POP_MS = 150; // 單一方塊從無到滿（或從滿到無）的時間
const SPARK_MS = 90; // 方塊剛出現時先閃一下彩色，形成一道彩色波前
const HOLD_MIN_MS = 750; // 大字至少停留這麼久
const HOLD_MAX_MS = 1800; // 等字型最多等這麼久，網路慢也不會卡住

// 5×7 點陣字，只收錄轉場文字會用到的字元
const GLYPHS = {
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
};
const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPH_ADVANCE = GLYPH_W + 1; // 字距 1 點

/** 進入、離開 8-bit 時中央顯示的大字 */
export const ENTER_LINES = [
  {text: '8-BIT MODE', color: '#fcfcfc'},
  {text: 'START!', color: '#fca044'},
];
export const EXIT_LINES = [{text: 'GAME OVER', color: '#fcfcfc'}];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 把幾行文字畫成置中的點陣大字，帶一點陣寬的硬陰影 */
function drawPixelText(ctx, lines, width, height) {
  const longest = Math.max(...lines.map((l) => l.text.length));
  const dotsWide = longest * GLYPH_ADVANCE - 1;
  // 每一「點」的大小：文字最寬佔畫面 80%，最小 3px、最大 12px
  const dot = Math.max(3, Math.min(12, Math.floor((width * 0.8) / dotsWide)));
  const lineGap = dot * 4;
  const blockH = lines.length * GLYPH_H * dot + (lines.length - 1) * lineGap;
  const top = Math.round((height - blockH) / 2);

  lines.forEach(({text, color}, li) => {
    const lineW = (text.length * GLYPH_ADVANCE - 1) * dot;
    const left = Math.round((width - lineW) / 2);
    const y = top + li * (GLYPH_H * dot + lineGap);
    // 先畫陰影再畫本體
    for (const [fill, offset] of [[TEXT_SHADOW_COLOR, dot], [color, 0]]) {
      ctx.fillStyle = fill;
      [...text].forEach((ch, ci) => {
        const glyph = GLYPHS[ch];
        if (!glyph) return;
        glyph.forEach((row, ry) => {
          for (let rx = 0; rx < GLYPH_W; rx++) {
            if (row[rx] === '#') {
              ctx.fillRect(left + (ci * GLYPH_ADVANCE + rx) * dot + offset, y + ry * dot + offset, dot, dot);
            }
          }
        });
      });
    }
  });
}

/**
 * 播放轉場。
 * @param {object} opts
 * @param {{text: string, color: string}[]} opts.lines 中央顯示的文字（只能用 GLYPHS 收錄的字元）
 * @param {() => Promise<void> | void} opts.onCovered 畫面全被蓋住時呼叫，在這裡切換樣式；回傳的 Promise 會被等待（例如等字型下載）
 * @returns {Promise<void>} 動畫結束後 resolve
 */
export async function playEightBitTransition({lines, onCovered}) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.createElement('canvas');
  canvas.className = 'eightbit-transition';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;

  // 切成方格；每格出現的時間 = 由左上往右下的斜向進度 + 一點隨機，看起來像像素溶解
  const size = width < 600 ? 28 : 40;
  const cols = Math.ceil(width / size);
  const rows = Math.ceil(height / size);
  const maxDiag = Math.max(cols + rows - 2, 1);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: c * size,
        y: r * size,
        t: ((c + r) / maxDiag) * 0.8 + Math.random() * 0.2,
        spark: SPARK_COLORS[(c * 7 + r * 3) % SPARK_COLORS.length],
      });
    }
  }

  // 依時間畫一格：scale 0~1 決定方塊大小（從中心長大/縮小）
  const drawCell = (cell, scale, color) => {
    if (scale <= 0) return;
    const s = Math.ceil(size * Math.min(scale, 1));
    const offset = Math.floor((size - s) / 2);
    ctx.fillStyle = color;
    ctx.fillRect(cell.x + offset, cell.y + offset, s, s);
  };

  const animate = (duration, drawFrame) =>
    new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const elapsed = now - start;
        ctx.clearRect(0, 0, width, height);
        drawFrame(elapsed);
        if (elapsed < duration) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

  try {
    // 1. 鋪滿
    await animate(COVER_MS, (elapsed) => {
      for (const cell of cells) {
        const local = elapsed - cell.t * (COVER_MS - POP_MS);
        if (local <= 0) continue;
        drawCell(cell, local / POP_MS, local < POP_MS + SPARK_MS ? cell.spark : COVER_COLOR);
      }
    });

    // 2. 全黑時切換樣式，同時秀出大字；等切換完成（字型下載）但有上限
    ctx.fillStyle = COVER_COLOR;
    ctx.fillRect(0, 0, width, height);
    drawPixelText(ctx, lines, width, height);
    await Promise.all([
      sleep(HOLD_MIN_MS),
      Promise.race([Promise.resolve().then(onCovered), sleep(HOLD_MAX_MS)]),
    ]);

    // 3. 退開，露出新樣式
    await animate(UNCOVER_MS, (elapsed) => {
      for (const cell of cells) {
        const local = elapsed - cell.t * (UNCOVER_MS - POP_MS);
        if (local <= 0) drawCell(cell, 1, COVER_COLOR);
        else drawCell(cell, 1 - local / POP_MS, local < SPARK_MS ? cell.spark : COVER_COLOR);
      }
    });
  } finally {
    canvas.remove();
  }
}
