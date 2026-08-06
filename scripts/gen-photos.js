const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const BLOG_DIR = path.join(__dirname, '../photoblog');
const OUTPUT_FILE = path.join(__dirname, '../src/data/photosData.json');

function generatePhotosData() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌ 找不到目錄: ${BLOG_DIR}`);
    return;
  }

  const items = fs.readdirSync(BLOG_DIR);
  let allPhotos = [];

  items.forEach((item) => {
    const itemPath = path.join(BLOG_DIR, item);
    const stat = fs.statSync(itemPath);

    let mdPath = null;
    let rawSlug = item;

    if (stat.isDirectory()) {
      const indexPath = path.join(itemPath, 'index.md');
      const indexMdxPath = path.join(itemPath, 'index.mdx');
      if (fs.existsSync(indexPath)) mdPath = indexPath;
      else if (fs.existsSync(indexMdxPath)) mdPath = indexMdxPath;
    } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
      mdPath = itemPath;
      rawSlug = item.replace(/\.mdx?$/, '');
    }

    if (mdPath) {
      const fileContent = fs.readFileSync(mdPath, 'utf8');
      const { data, content } = matter(fileContent);

      const formattedSlug = rawSlug.replace(/^(\d{4})-(\d{2})-(\d{2})-/, '$1/$2/$3/');
      const link = `/photoblog/${formattedSlug}`;

      const currentPostImages = new Set();

      if (data.image) {
        currentPostImages.add(data.image);
      }

      const imgRegex = /!\[.*?\]\((.*?)\)/g;
      const matches = content.matchAll(imgRegex);

      for (const match of matches) {
        currentPostImages.add(match[1]);
      }

      currentPostImages.forEach((imgSrc) => {
        // Clean leading ./ or /
        const cleanName = path.basename(imgSrc);
        const webSrc = `photoblog/${rawSlug}/${cleanName}`;

        allPhotos.push({
          src: webSrc,
          link: link,
          title: data.title || rawSlug
        });
      });
    }
  });

  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPhotos, null, 2));

  console.log('--------------------------------------------------');
  console.log(`✅ 資料處理完成！`);
  console.log(`📝 總共掃描到 ${allPhotos.length} 張照片`);
  console.log(`輸出路徑：${OUTPUT_FILE}`);
  console.log('--------------------------------------------------');
}

generatePhotosData();