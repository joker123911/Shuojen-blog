const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 設定路徑 (移除了不需要的靜態資料夾路徑)
const BLOG_DIR = path.join(__dirname, '../photoblog');
const OUTPUT_FILE = path.join(__dirname, '../src/data/photosData.json');

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

// 執行流程 (只需產生 JSON，不再複製圖片)
generatePhotosData();