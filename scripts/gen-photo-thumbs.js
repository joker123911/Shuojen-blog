// 為 /photography 照片牆產生縮圖，並把每張照片的寬高寫回 photosData.json。
//
// - 必須在 prepare-data.js 之後執行（它負責產生 src/data/generated/photosData.json）。
// - 縮圖輸出到 static/photo-thumbs/<同原路徑>.webp（已列入 .gitignore，build 時重新產生）。
// - 增量處理：縮圖已存在且比原圖新就跳過，只讀取尺寸。
// - 寬高供照片牆做「等高排版」，避免直幅照片被裁切。
// - 縮圖寬度（tw）供照片牆組 srcset：一般螢幕載縮圖，高解析螢幕改載原圖。
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.join(__dirname, '..');
const PHOTOBLOG_DIR = path.join(ROOT_DIR, 'photoblog');
const THUMB_DIR = path.join(ROOT_DIR, 'static', 'photo-thumbs');
const PHOTOS_FILE = path.join(ROOT_DIR, 'src/data/generated/photosData.json');

const THUMB_HEIGHT = 480; // 照片牆列高約 240～320px，2 倍密度螢幕也夠用
const QUALITY = 78;
const CONCURRENCY = 8;

async function processPhoto(photo, stats) {
  const srcPath = path.join(PHOTOBLOG_DIR, photo.src);
  if (!fs.existsSync(srcPath)) {
    stats.missing++;
    return photo;
  }
  const thumbRel = photo.src.replace(/\.[^.]+$/, '.webp');
  const thumbPath = path.join(THUMB_DIR, thumbRel);

  const meta = await sharp(srcPath).metadata();
  // EXIF 方向 5～8 代表旋轉 90 度，寬高需對調
  const rotated = meta.orientation >= 5;
  const w = rotated ? meta.height : meta.width;
  const h = rotated ? meta.width : meta.height;

  const upToDate =
    fs.existsSync(thumbPath) &&
    fs.statSync(thumbPath).mtimeMs >= fs.statSync(srcPath).mtimeMs;

  if (!upToDate) {
    fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
    await sharp(srcPath)
      .rotate()
      .resize({ height: THUMB_HEIGHT, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(thumbPath);
    stats.generated++;
  } else {
    stats.skipped++;
  }

  // 縮圖實際寬度（withoutEnlargement：原圖比縮圖矮時維持原尺寸），供照片牆 srcset 使用
  const tw = h > THUMB_HEIGHT ? Math.round((w * THUMB_HEIGHT) / h) : w;

  return { ...photo, w, h, tw, thumb: `photo-thumbs/${thumbRel}` };
}

async function main() {
  const start = Date.now();
  if (!fs.existsSync(PHOTOS_FILE)) {
    console.warn('[照片縮圖] 警告：找不到 photosData.json，請先執行 prepare-data');
    return;
  }
  const photos = JSON.parse(fs.readFileSync(PHOTOS_FILE, 'utf8'));
  const stats = { generated: 0, skipped: 0, missing: 0 };
  const result = new Array(photos.length);

  let next = 0;
  async function worker() {
    while (next < photos.length) {
      const i = next++;
      try {
        result[i] = await processPhoto(photos[i], stats);
      } catch (err) {
        console.warn(`[照片縮圖] 警告：${photos[i].src}：${err.message}`);
        result[i] = photos[i];
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const content = JSON.stringify(result, null, 2);
  if (fs.readFileSync(PHOTOS_FILE, 'utf8') !== content) {
    fs.writeFileSync(PHOTOS_FILE, content);
  }
  console.log(
    `[照片縮圖] 完成：新產生 ${stats.generated} 張、沿用 ${stats.skipped} 張` +
      (stats.missing ? `、找不到原圖 ${stats.missing} 張` : '') +
      `，耗時 ${Date.now() - start} ms`,
  );
}

main().catch((err) => {
  console.error('[照片縮圖] 錯誤：', err);
  process.exitCode = 1;
});
