// 為排名清單（電影、動畫、影集）產生海報縮圖。
//
// - 來源：docs/img/{movie,anime,series}/ 下的海報原圖（約 800×1170）
// - 輸出：static/poster-thumbs/<同子路徑>.webp（已列入 .gitignore，build 時重新產生）
// - 列表只顯示 70px 寬，縮圖寬 140px（2 倍密度螢幕也清晰）；點開燈箱才載入原圖
// - 增量處理：縮圖比原圖新就跳過
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_ROOT = path.join(ROOT_DIR, 'docs', 'img');
const SOURCE_DIRS = ['movie', 'anime', 'series'];
const THUMB_ROOT = path.join(ROOT_DIR, 'static', 'poster-thumbs');

const THUMB_WIDTH = 140;
const QUALITY = 75;
const CONCURRENCY = 8;
const IMAGE_RE = /\.(webp|jpe?g|png|avif)$/i;

async function main() {
  const start = Date.now();
  const jobs = [];
  for (const dir of SOURCE_DIRS) {
    const srcDir = path.join(SOURCE_ROOT, dir);
    if (!fs.existsSync(srcDir)) continue;
    for (const file of fs.readdirSync(srcDir)) {
      if (!IMAGE_RE.test(file)) continue;
      jobs.push({
        src: path.join(srcDir, file),
        dest: path.join(THUMB_ROOT, dir, file.replace(/\.[^.]+$/, '.webp')),
      });
    }
  }

  const stats = { generated: 0, skipped: 0, failed: 0 };
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const { src, dest } = jobs[next++];
      try {
        if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
          stats.skipped++;
          continue;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        await sharp(src)
          .rotate()
          .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(dest);
        stats.generated++;
      } catch (err) {
        stats.failed++;
        console.warn(`⚠️ [gen-poster-thumbs] ${path.relative(ROOT_DIR, src)}：${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(
    `🎞️  [gen-poster-thumbs] 新產生 ${stats.generated}、沿用 ${stats.skipped}` +
      (stats.failed ? `、失敗 ${stats.failed}` : '') +
      ` 張，耗時 ${Date.now() - start}ms`,
  );
}

main().catch((err) => {
  console.error('❌ [gen-poster-thumbs]', err);
  process.exitCode = 1;
});
