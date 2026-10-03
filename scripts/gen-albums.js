const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const COVERS_DIR = path.join(ROOT_DIR, 'static/Music_Covers');
const STATIC_JSON_FILE = path.join(ROOT_DIR, 'static/Music_Covers/albums.json');
const SRC_JSON_FILE = path.join(ROOT_DIR, 'src/data/albumsData.json');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function loadExistingAlbums() {
  const map = new Map();

  const candidateFiles = [STATIC_JSON_FILE, SRC_JSON_FILE];
  for (const jsonPath of candidateFiles) {
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.filename && !map.has(item.filename)) {
              map.set(item.filename, {
                artist: String(item.artist || '').trim(),
                album: String(item.album || '').trim(),
                filename: item.filename,
              });
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️ 讀取 ${jsonPath} 失敗:`, err.message);
      }
    }
  }

  return map;
}

function generateAlbumsData() {
  if (!fs.existsSync(COVERS_DIR)) {
    console.error(`❌ 找不到音樂封面目錄: ${COVERS_DIR}`);
    return;
  }

  const existingMap = loadExistingAlbums();
  const dirFiles = fs.readdirSync(COVERS_DIR);
  const diskImages = new Set();

  let addedCount = 0;
  let deletedCount = 0;

  dirFiles.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      return;
    }

    diskImages.add(file);

    if (!existingMap.has(file)) {
      const baseName = path.parse(file).name;
      let artist = 'Unknown';
      let album = baseName;

      if (baseName.includes(' - ')) {
        const sepIndex = baseName.indexOf(' - ');
        artist = baseName.substring(0, sepIndex).trim();
        album = baseName.substring(sepIndex + 3).trim();
      }

      existingMap.set(file, {
        artist,
        album,
        filename: file,
      });
      console.log(`➕ 新增專輯: ${artist} - ${album} (${file})`);
      addedCount++;
    }
  });

  // 檢查是否有多餘的項目（檔案已被刪除）
  for (const [filename, item] of existingMap.entries()) {
    if (!diskImages.has(filename)) {
      existingMap.delete(filename);
      console.log(`🗑️ 移除已不存在的封面: ${item.artist} - ${item.album} (${filename})`);
      deletedCount++;
    }
  }

  // 排序：符合既有的 Unicode 字典序
  const albumsList = Array.from(existingMap.values()).sort((a, b) => {
    if (a.artist < b.artist) return -1;
    if (a.artist > b.artist) return 1;
    if (a.album < b.album) return -1;
    if (a.album > b.album) return 1;
    return 0;
  });

  const formattedJson = JSON.stringify(albumsList, null, 2) + '\n';

  // 寫入 src/data/albumsData.json
  const srcDir = path.dirname(SRC_JSON_FILE);
  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(SRC_JSON_FILE, formattedJson, 'utf8');

  // 寫入 static/Music_Covers/albums.json（保持兩者一致）
  fs.writeFileSync(STATIC_JSON_FILE, formattedJson, 'utf8');

  console.log('--------------------------------------------------');
  console.log(`🎵 專輯資料處理完成！`);
  console.log(`📝 目前共掃描到 ${albumsList.length} 張專輯封面 (新增: ${addedCount}, 移除: ${deletedCount})`);
  console.log(`輸出路徑：`);
  console.log(`  - ${SRC_JSON_FILE}`);
  console.log(`  - ${STATIC_JSON_FILE}`);
  console.log('--------------------------------------------------');
}

if (require.main === module) {
  generateAlbumsData();
}

module.exports = { generateAlbumsData };
