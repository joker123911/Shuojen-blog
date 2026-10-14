const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const BLOG_DIR = path.join(__dirname, '../photoblog');
const OUTPUT_FILE = path.join(__dirname, '../src/data/photosData.json');

function normalizeImgPath(rawPath) {
  if (!rawPath) return '';
  // 移除前後空白，若帶有 Markdown title (如: pic.jpg "title") 則只取前半部路徑
  let cleaned = String(rawPath).trim().replace(/^<|>$/g, '').split(/\s+/)[0];
  // 移除開頭的 ./ 或 /
  cleaned = cleaned.replace(/^(\.\/|\/)+/, '');
  return cleaned;
}

function generatePhotosData() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌ 找不到目錄: ${BLOG_DIR}`);
    return;
  }

  const items = fs.readdirSync(BLOG_DIR).sort();
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

      // 過濾草稿與隱藏文章
      if (data.draft === true || data.unlisted === true) return;

      // 處理文章連結（優先支援 frontmatter 的 slug）
      let link;
      if (data.slug) {
        const slug = String(data.slug).trim();
        link = slug.startsWith('/')
          ? (slug.startsWith('/photoblog/') || slug === '/photoblog' ? slug : `/photoblog${slug}`)
          : `/photoblog/${slug}`;
      } else {
        const formattedSlug = rawSlug.replace(/^(\d{4})-(\d{2})-(\d{2})-/, '$1/$2/$3/');
        link = `/photoblog/${formattedSlug}`;
      }

      const currentPostImages = new Set();

      if (data.image) {
        const normCover = normalizeImgPath(data.image);
        if (normCover) currentPostImages.add(normCover);
      }

      // 先移除 HTML/MDX 註解與程式碼區塊，避免抓到註解掉的圖片
      const cleanContent = content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

      const imgRegex = /!\[.*?\]\((.*?)\)/g;
      const matches = cleanContent.matchAll(imgRegex);

      for (const match of matches) {
        const normImg = normalizeImgPath(match[1]);
        if (normImg) currentPostImages.add(normImg);
      }

      currentPostImages.forEach((cleanName) => {
        const isExternal = /^https?:\/\//i.test(cleanName);
        const webSrc = isExternal ? cleanName : `${rawSlug}/${cleanName}`;

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