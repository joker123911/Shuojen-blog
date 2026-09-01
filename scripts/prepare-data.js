const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const PHOTOBLOG_DIR = path.join(ROOT_DIR, 'photoblog');
const OPML_FILE = path.join(ROOT_DIR, 'src/data/subscriptions.opml');
const BLOGROLL_OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/blogrollData.js');
const PHOTOS_OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/photosData.json');
const CALENDAR_OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/contribution-data.json');
const ABOUT_FILE = path.join(ROOT_DIR, 'src/pages/about.md');

const now = new Date();
const offset = 8;
const twNow = new Date(now.getTime() + offset * 3600 * 1000);
const todayStr = twNow.toISOString().split('T')[0];
const currentFullTime = twNow.toISOString().split('.')[0] + '+08:00';

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

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

    if (fullTag.startsWith('</') || fullTag.startsWith('</outline')) {
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

function getWordCount(content) {
  let cleanContent = content || '';
  cleanContent = cleanContent.replace(/!\[.*?\]\(.*?\)/g, '');
  cleanContent = cleanContent.replace(/<[^>]+>/g, '');
  cleanContent = cleanContent.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  cleanContent = cleanContent.replace(/```[\s\S]*?```/g, '');
  cleanContent = cleanContent.replace(/`([^`]+)`/g, '$1');
  cleanContent = cleanContent.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  const chineseChars = cleanContent.match(/[\u4e00-\u9fa5]/g) || [];
  const noChinese = cleanContent.replace(/[\u4e00-\u9fa5]/g, ' ');
  const englishWords = noChinese.match(/[a-zA-Z0-9_-]+/g) || [];

  return chineseChars.length + englishWords.length;
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

function saveFileWithYaml(filePath, content, data) {
  const newContent = matter.stringify(content, data, {
    engines: {
      yaml: {
        stringify: (obj) => {
          let yamlStr = yaml.dump(obj, {
            quotingType: "'",
            forceQuotes: true,
            flowLevel: 1,
          });
          return yamlStr.replace(/^date:\s*'(.+)'$/m, 'date: $1');
        },
      },
    },
  });

  fs.writeFileSync(filePath, newContent);
}

function runDataPreparation() {
  const startTime = Date.now();
  processOpml();

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
      if (!data.title && !file.replace(/\.mdx?$/, '')) {
        formatWarnings.push({
          file: relPath,
          message: '未設定文章標題 (title)',
          suggestion: '建議在 Frontmatter 中加入 title: "文章標題"'
        });
      }

      // 1. Sync build time / rss_date
      let targetDate = data.date;
      if (!targetDate) {
        const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) targetDate = dateMatch[1];
      }

      if (targetDate) {
        let datePart = '';
        let hasSpecificTime = false;

        if (targetDate instanceof Date) {
          const twDate = new Date(targetDate.getTime() + offset * 3600 * 1000);
          datePart = twDate.toISOString().slice(0, 10);
          hasSpecificTime = targetDate.getUTCHours() !== 0 || targetDate.getUTCMinutes() !== 0;
        } else {
          const dateStr = String(targetDate);
          datePart = dateStr.slice(0, 10);
          hasSpecificTime = dateStr.includes('T') || dateStr.includes(' ') || dateStr.length > 10;
        }

        if (data.rss_date) {
          hasSpecificTime = true;
        }

        if (hasSpecificTime && !data.rss_date) {
          let originalDateStr = '';
          if (data.date instanceof Date) {
            const twDate = new Date(data.date.getTime() + offset * 3600 * 1000);
            originalDateStr = twDate.toISOString().split('.')[0] + '+08:00';
          } else {
            originalDateStr = String(data.date).replace(' ', 'T');
          }
          data.rss_date = originalDateStr;
          data.date = datePart;
          saveFileWithYaml(filePath, parsed.content, data);
        } else if (datePart === todayStr && !hasSpecificTime) {
          data.date = datePart;
          data.rss_date = currentFullTime;
          saveFileWithYaml(filePath, parsed.content, data);
        } else if (datePart > todayStr && !hasSpecificTime) {
          data.date = datePart;
          data.rss_date = `${datePart}T00:00:01+08:00`;
          saveFileWithYaml(filePath, parsed.content, data);
        }
      }

      // 2. Count words
      let contentWithoutFrontmatter = rawContent.replace(/\r\n/g, '\n').replace(/^---[\s\S]*?---/, '');
      totalWords += getWordCount(contentWithoutFrontmatter);

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

  // Also read photoblog items for gen-photos structure
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

          currentPostImages.forEach((imgSrc) => {
            const cleanName = path.basename(imgSrc);
            const webSrc = `${rawSlug}/${cleanName}`;
            allPhotos.push({
              src: webSrc,
              link: link,
              title: data.title || rawSlug,
            });
          });

          // Sync build time for photoblog if needed
          let targetDate = data.date;
          if (!targetDate) {
            const dateMatch = path.basename(mdPath).match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) targetDate = dateMatch[1];
          }
          if (targetDate) {
            let datePart = '';
            let hasSpecificTime = false;
            if (targetDate instanceof Date) {
              const twDate = new Date(targetDate.getTime() + offset * 3600 * 1000);
              datePart = twDate.toISOString().slice(0, 10);
              hasSpecificTime = targetDate.getUTCHours() !== 0 || targetDate.getUTCMinutes() !== 0;
            } else {
              const dateStr = String(targetDate);
              datePart = dateStr.slice(0, 10);
              hasSpecificTime = dateStr.includes('T') || dateStr.includes(' ') || dateStr.length > 10;
            }
            if (data.rss_date) hasSpecificTime = true;

            if (hasSpecificTime && !data.rss_date) {
              let originalDateStr = data.date instanceof Date 
                ? new Date(data.date.getTime() + offset * 3600 * 1000).toISOString().split('.')[0] + '+08:00'
                : String(data.date).replace(' ', 'T');
              data.rss_date = originalDateStr;
              data.date = datePart;
              saveFileWithYaml(mdPath, content, data);
            } else if (datePart === todayStr && !hasSpecificTime) {
              data.date = datePart;
              data.rss_date = currentFullTime;
              saveFileWithYaml(mdPath, content, data);
            } else if (datePart > todayStr && !hasSpecificTime) {
              data.date = datePart;
              data.rss_date = `${datePart}T00:00:01+08:00`;
              saveFileWithYaml(mdPath, content, data);
            }
          }

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

  // Update Stats in about.md
  if (fs.existsSync(ABOUT_FILE)) {
    const postCount = blogFiles.length;
    const photoPostCount = photoFiles.length;
    const formattedPostCount = formatNumber(postCount);
    const formattedWordCount = formatNumber(totalWords);
    const formattedPhotoPostCount = formatNumber(photoPostCount);
    const formattedPhotoCount = formatNumber(totalPhotos);

    let aboutContent = fs.readFileSync(ABOUT_FILE, 'utf8');
    const regex = /貼文區目前共有 \*\*(.*?)\*\* 篇文章，共累積了 \*\*(.*?)\*\* 個字(?:；[\s\S]*?攝影區目前共有 \*\*(.*?)\*\* 篇文章，共累積了 \*\*(.*?)\*\* 張照片)?。/g;
    const newString = `貼文區目前共有 **${formattedPostCount}** 篇文章，共累積了 **${formattedWordCount}** 個字；<br />\n攝影區目前共有 **${formattedPhotoPostCount}** 篇文章，共累積了 **${formattedPhotoCount}** 張照片。`;

    if (regex.test(aboutContent)) {
      const finalAboutContent = aboutContent.replace(regex, newString);
      if (finalAboutContent !== aboutContent) {
        fs.writeFileSync(ABOUT_FILE, finalAboutContent, 'utf8');
      }
    }
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
  } else {
    console.log(`⚡ [prepare-data] 資料準備完成，全站格式檢查無誤，耗時 ${elapsed}ms！`);
  }
}

runDataPreparation();
