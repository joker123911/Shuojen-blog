const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { generateAlbumsData } = require('./gen-albums');
const { generateNowPosterData } = require('./gen-now-poster');
const { countWords } = require('../plugins/word-count');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const PHOTOBLOG_DIR = path.join(ROOT_DIR, 'photoblog');
const OPML_FILE = path.join(ROOT_DIR, 'src/data/subscriptions.opml');
const BLOGROLL_OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/generated/blogrollData.js');
const PHOTOS_OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/generated/photosData.json');
const CALENDAR_OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/generated/contribution-data.json');
// about 頁的「即時數據」由 src/components/SiteStats 讀取這份 JSON 顯示
const STATS_OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/generated/siteStats.json');

function decodeEntities(encodedString) {
  if (!encodedString) return '';
  return encodedString
    .replace(/&#13;/g, '')
    .replace(/&#10;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function isMyBlog(title, url, xmlUrl) {
  const t = (title || '').toLowerCase();
  const u = (url || '').toLowerCase();
  const x = (xmlUrl || '').toLowerCase();
  return u.includes('shuojen.com') || x.includes('shuojen.com') || t.includes('shuo-jen');
}

const strokeCollator = new Intl.Collator('zh-Hant-TW-u-co-stroke', { numeric: true, sensitivity: 'base' });
const asciiCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function isChinese(str) {
  return /^[\u4e00-\u9fa5\u3400-\u4dbf]/.test(str);
}

function sortBlogroll(a, b) {
  const isA = isChinese(a.title);
  const isB = isChinese(b.title);

  if (!isA && isB) return -1;
  if (isA && !isB) return 1;
  if (!isA && !isB) return asciiCollator.compare(a.title, b.title);
  return strokeCollator.compare(a.title, b.title);
}

function processOpml() {
  if (!fs.existsSync(OPML_FILE)) return;
  const content = fs.readFileSync(OPML_FILE, 'utf8');
  const blogroll = [];
  const tokenRegex = /<\/?outline\b[^>]*>/gi;
  const attrRegex = /([a-zA-Z:]+)="([^"]*)"/g;

  let stack = [];
  let tokenMatch;

  while ((tokenMatch = tokenRegex.exec(content)) !== null) {
    const fullTag = tokenMatch[0];

    if (fullTag.startsWith('</')) {
      if (stack.length > 0) stack.pop();
    } else {
      const attrs = {};
      let attrMatch;
      while ((attrMatch = attrRegex.exec(fullTag)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const isSelfClosing = fullTag.endsWith('/>');
      const isRss = attrs.type === 'rss' || attrs.xmlUrl;

      if (isRss) {
        const rawTitle = decodeEntities(attrs.text || attrs.title || '無標題');
        let url = attrs.htmlUrl || '';
        if (!url && attrs.xmlUrl) {
          url = attrs.xmlUrl
            .replace(/\/feed\/?.*$/, '')
            .replace(/\/rss\.xml.*$/, '')
            .replace(/\/index\.xml.*$/, '')
            .replace(/\/atom\.xml.*$/, '');
        }

        const xmlUrl = attrs.xmlUrl || '';
        const description = decodeEntities(attrs.description || '');

        if (!isMyBlog(rawTitle, url, xmlUrl)) {
          blogroll.push({
            title: rawTitle,
            url: url || '#',
            xmlUrl: xmlUrl,
            description: description,
          });
        }
      } else {
        if (!isSelfClosing) {
          stack.push({ text: attrs.text || attrs.title || '分類' });
        }
      }
    }
  }

  blogroll.sort(sortBlogroll);
  const dir = path.dirname(BLOGROLL_OUTPUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileContent = `// 本檔案由 prepare-data.js 自動生成，請勿手動修改\nexport const blogrollLinks = ${JSON.stringify(blogroll, null, 2)};\n`;
  if (!fs.existsSync(BLOGROLL_OUTPUT_FILE) || fs.readFileSync(BLOGROLL_OUTPUT_FILE, 'utf8') !== fileContent) {
    fs.writeFileSync(BLOGROLL_OUTPUT_FILE, fileContent, 'utf8');
  }
}


function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllMarkdownFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function runDataPreparation() {
  const startTime = Date.now();
  processOpml();
  generateAlbumsData();
  generateNowPosterData();

  // Single-pass scan for blog and photoblog
  const blogFiles = getAllMarkdownFiles(BLOG_DIR);
  const photoFiles = getAllMarkdownFiles(PHOTOBLOG_DIR);

  let totalWords = 0;
  const dateData = {};

  const formatWarnings = [];

  // Process Blog Files
  blogFiles.forEach((filePath) => {
    const relPath = path.relative(ROOT_DIR, filePath);
    try {
      const file = path.basename(filePath);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      
      let parsed;
      try {
        parsed = matter(rawContent);
      } catch (yamlErr) {
        formatWarnings.push({
          file: relPath,
          message: `YAML Frontmatter 語法解析失敗: ${yamlErr.message}`,
          suggestion: '請檢查文章頂部 --- 之間的 YAML 縮排或單雙引號是否閉合。'
        });
        return;
      }

      const data = parsed.data || {};

      // 檢查必填項目
      if (!data.title) {
        formatWarnings.push({
          file: relPath,
          message: '未設定文章標題 (title)',
          suggestion: '建議在 Frontmatter 中加入 title: "文章標題"'
        });
      }

      // 2. Count words
      let contentWithoutFrontmatter = rawContent.replace(/\r\n/g, '\n').replace(/^---[\s\S]*?---/, '');
      totalWords += countWords(contentWithoutFrontmatter);

      // 3. Calendar Data
      let calDate = '';
      const dateMatch = rawContent.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
      if (dateMatch) {
        calDate = dateMatch[1];
      } else {
        const fileName = path.basename(filePath);
        const parentDir = path.basename(path.dirname(filePath));
        const fileDateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
        const parentDateMatch = parentDir.match(/^(\d{4}-\d{2}-\d{2})/);
        if (fileDateMatch) calDate = fileDateMatch[1];
        else if (parentDateMatch) calDate = parentDateMatch[1];
        else {
          const stats = fs.statSync(filePath);
          const d = new Date(stats.birthtime);
          calDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        }
      }

      let title = data.title || path.basename(filePath, path.extname(filePath));
      let url = '';
      if (data.slug) {
        let customSlug = String(data.slug).trim();
        url = customSlug.startsWith('/') ? `/blog${customSlug}` : `/blog/${customSlug}`;
      } else {
        const fileName = path.basename(filePath, path.extname(filePath));
        let nameWithoutDate = fileName;
        if (/^\d{4}-\d{2}-\d{2}-/.test(fileName)) {
          nameWithoutDate = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        } else if (fileName === 'index') {
          const parentDir = path.basename(path.dirname(filePath));
          nameWithoutDate = parentDir.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        }
        const datePath = calDate.replace(/-/g, '/');
        url = `/blog/${datePath}/${nameWithoutDate}`;
      }
      url = url.replace(/\/\/+/g, '/');

      if (!dateData[calDate]) dateData[calDate] = [];
      dateData[calDate].push({ title, url });
    } catch (err) {
      formatWarnings.push({
        file: relPath,
        message: err.message,
        suggestion: '請檢查檔案是否損毀或存在不相容字元。'
      });
    }
  });

  // Process Photoblog Files
  let totalPhotos = 0;
  const allPhotos = [];

  // Also read photoblog items for photosData.json
  if (fs.existsSync(PHOTOBLOG_DIR)) {
    const items = fs.readdirSync(PHOTOBLOG_DIR);
    items.forEach((item) => {
      const relItemPath = path.relative(ROOT_DIR, path.join(PHOTOBLOG_DIR, item));
      try {
        const itemPath = path.join(PHOTOBLOG_DIR, item);
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
          let parsed;
          try {
            parsed = matter(fileContent);
          } catch (yamlErr) {
            formatWarnings.push({
              file: path.relative(ROOT_DIR, mdPath),
              message: `攝影集 YAML 解析失敗: ${yamlErr.message}`,
              suggestion: '請檢查 Frontmatter 格式'
            });
            return;
          }

          const { data, content } = parsed;
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

          totalPhotos += currentPostImages.size;

          // 給攝影集燈箱顯示的日期與標籤（相機、底片、地點）
          const slugDate = (rawSlug.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
          const photoDate = data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : (data.date ? String(data.date).slice(0, 10) : slugDate);
          const photoTags = Array.isArray(data.tags)
            ? data.tags.map((t) => (typeof t === 'string' ? t : t?.label)).filter(Boolean)
            : [];

          currentPostImages.forEach((imgSrc) => {
            const cleanName = path.basename(imgSrc);
            const webSrc = `${rawSlug}/${cleanName}`;
            allPhotos.push({
              src: webSrc,
              link: link,
              title: data.title || rawSlug,
              date: photoDate,
              tags: photoTags,
            });
          });

          // Calendar for photoblog
          let calDate = '';
          const dateMatch = fileContent.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
          if (dateMatch) calDate = dateMatch[1];
          else {
            const fileName = path.basename(mdPath);
            const parentDir = path.basename(path.dirname(mdPath));
            const fileDateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
            const parentDateMatch = parentDir.match(/^(\d{4}-\d{2}-\d{2})/);
            if (fileDateMatch) calDate = fileDateMatch[1];
            else if (parentDateMatch) calDate = parentDateMatch[1];
            else {
              const stats = fs.statSync(mdPath);
              const d = new Date(stats.birthtime);
              calDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            }
          }

          let photoblogTitle = data.title || path.basename(mdPath, path.extname(mdPath));
          if (!dateData[calDate]) dateData[calDate] = [];
          dateData[calDate].push({ title: photoblogTitle, url: link });
        }
      } catch (err) {
        formatWarnings.push({
          file: relItemPath,
          message: err.message,
          suggestion: '請檢查攝影集資料夾或檔案內容'
        });
      }
    });
  }

  // Update Photos Data JSON
  const photosJsonDir = path.dirname(PHOTOS_OUTPUT_FILE);
  if (!fs.existsSync(photosJsonDir)) fs.mkdirSync(photosJsonDir, { recursive: true });
  const newPhotosContent = JSON.stringify(allPhotos, null, 2);
  if (!fs.existsSync(PHOTOS_OUTPUT_FILE) || fs.readFileSync(PHOTOS_OUTPUT_FILE, 'utf8') !== newPhotosContent) {
    fs.writeFileSync(PHOTOS_OUTPUT_FILE, newPhotosContent);
  }

  // Update Calendar Data JSON
  const calJsonDir = path.dirname(CALENDAR_OUTPUT_FILE);
  if (!fs.existsSync(calJsonDir)) fs.mkdirSync(calJsonDir, { recursive: true });
  const newCalContent = JSON.stringify(dateData, null, 2);
  if (!fs.existsSync(CALENDAR_OUTPUT_FILE) || fs.readFileSync(CALENDAR_OUTPUT_FILE, 'utf8') !== newCalContent) {
    fs.writeFileSync(CALENDAR_OUTPUT_FILE, newCalContent);
  }

  // 站內統計（about 頁顯示）
  const newStatsContent = JSON.stringify(
    {
      postCount: blogFiles.length,
      wordCount: totalWords,
      photoPostCount: photoFiles.length,
      photoCount: totalPhotos,
    },
    null,
    2
  );
  if (!fs.existsSync(STATS_OUTPUT_FILE) || fs.readFileSync(STATS_OUTPUT_FILE, 'utf8') !== newStatsContent) {
    fs.writeFileSync(STATS_OUTPUT_FILE, newStatsContent);
  }

  const elapsed = Date.now() - startTime;
  
  if (formatWarnings.length > 0) {
    console.log('\n' + '='.repeat(75));
    console.log(`🚨 \x1b[31m\x1b[1m【Localhost 文章格式異常警報】共發現 ${formatWarnings.length} 篇檔案有異常！\x1b[0m`);
    console.log('='.repeat(75));
    formatWarnings.forEach((w, i) => {
      console.log(`\n\x1b[33m[${i + 1}] 📄 檔案：\x1b[0m \x1b[1m${w.file}\x1b[0m`);
      console.log(`    \x1b[31m⚠️ 原因：\x1b[0m ${w.message}`);
      if (w.suggestion) {
        console.log(`    \x1b[36m💡 建議：\x1b[0m ${w.suggestion}`);
      }
    });
    console.log('\n' + '='.repeat(75) + '\n');
    // --strict（push 時使用）：有格式異常就以失敗結束，擋下推送；資料檔仍照常寫出
    if (process.argv.includes('--strict')) {
      console.error('❌ [prepare-data --strict] 文章格式有異常，已中止。請修正上列檔案後再推送。');
      process.exitCode = 1;
    }
  } else {
    console.log(`⚡ [prepare-data] 資料準備完成，全站格式檢查無誤，耗時 ${elapsed}ms！`);
  }
}

runDataPreparation();
