const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 設定路徑
const BLOG_DIR = path.join(__dirname, '../photoblog');
const IMG_SRC_DIR = path.join(__dirname, '../photoblog', 'img');
const IMG_DEST_DIR = path.join(__dirname, '../static', 'img');
const OUTPUT_FILE = path.join(__dirname, '../src/data/photosData.json');

function syncImages() {
  console.log('🔄 正在同步圖片...');
  if (!fs.existsSync(IMG_SRC_DIR)) {
    console.warn(`⚠️ 找不到圖片來源目錄: ${IMG_SRC_DIR}，跳過同步。`);
    return;
  }

  // 確保目標資料夾存在
  if (!fs.existsSync(IMG_DEST_DIR)) {
    fs.mkdirSync(IMG_DEST_DIR, { recursive: true });
  }

  // 將 photoblog/img 同步至 static/img
  // 使用 cpSync (Node.js 16.7+ 支援) 進行遞迴複製
  try {
    fs.cpSync(IMG_SRC_DIR, IMG_DEST_DIR, { recursive: true, force: true });
    console.log(`✅ 圖片已同步至: ${IMG_DEST_DIR}`);
  } catch (err) {
    console.error(`❌ 圖片同步失敗: ${err.message}`);
  }
}

function generatePhotosData() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌ 找不到目錄: ${BLOG_DIR}`);
    return;
  }

  const files = fs.readdirSync(BLOG_DIR);
  let allPhotos = [];

  files.forEach((file) => {
    // 確保只處理 .md 或 .mdx
    if (file.endsWith('.md') || file.endsWith('.mdx')) {
      const filePath = path.join(BLOG_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');

      // 解析 Frontmatter 與內容
      const { data, content } = matter(fileContent);

      // 1. 處理 Slug 並轉換格式 (2019-05-21-trip -> 2019/05/21/trip)
      const rawSlug = data.slug || file.replace(/\.mdx?$/, '');
      const formattedSlug = rawSlug.replace(/^(\d{4})-(\d{2})-(\d{2})-/, '$1/$2/$3/');

      const link = `/photoblog/${formattedSlug}`;

      // 2. 準備此文章的圖片清單
      const currentPostImages = new Set();

      // 優先加入 Frontmatter 中的主圖 (data.image)
      if (data.image) {
        currentPostImages.add(data.image);
      }

      // 3. 使用正則表達式抓取內文所有圖片 ![](/path/to/img)
      const imgRegex = /!\[.*?\]\((.*?)\)/g;
      const matches = content.matchAll(imgRegex);

      for (const match of matches) {
        currentPostImages.add(match[1]);
      }

      // 4. 將抓到的所有圖片轉換為物件格式並推入總清單
      currentPostImages.forEach((imgSrc) => {
        allPhotos.push({
          src: imgSrc,
          link: link,
          title: data.title || rawSlug
        });
      });
    }
  });

  // 寫入 JSON 檔案
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPhotos, null, 2));

  console.log('--------------------------------------------------');
  console.log(`✅ 資料處理完成！`);
  console.log(`📝 總共掃描到 ${allPhotos.length} 張照片`);
  console.log(`輸出路徑：${OUTPUT_FILE}`);
  console.log('--------------------------------------------------');
}

// 執行流程
syncImages();
generatePhotosData();