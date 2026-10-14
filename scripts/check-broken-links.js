const fs = require('fs');
const path = require('path');

const WORKSPACE = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(WORKSPACE, 'blog');
const PHOTOBLOG_DIR = path.join(WORKSPACE, 'photoblog');
const DOCS_DIR = path.join(WORKSPACE, 'docs');
const PAGES_DIR = path.join(WORKSPACE, 'src', 'pages');

const STATIC_DIRS = ['static', 'photoblog'];
const OWN_DOMAINS = ['shuojen.com', 'www.shuojen.com', 'shuojen.site', 'www.shuojen.site'];

// CLI 參數：支援 --fix 自動修正網域與 localhost 為相對根路徑
const args = process.argv.slice(2);
const AUTO_FIX = args.includes('--fix');

// 嘗試載入 gray-matter
let matter;
try {
  matter = require('gray-matter');
} catch (e) {
  // 若無安裝則使用內建解析器
}

/**
 * 將字串內容替換為空白但保留換行符號，確保後續 Regex match.index 的行號與欄號 100% 精準
 */
function maskKeepNewlines(str) {
  return str.replace(/[^\r\n]/g, ' ');
}

/**
 * 安全解碼 URI（處理中文標籤、%20 空白檔名等）
 */
function safeDecodeURI(url) {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return url;
  }
}

/**
 * 正規化路由字串（轉小寫、解碼、去除結尾斜線）
 */
function normalizeRoute(route) {
  const decoded = safeDecodeURI(route).trim().toLowerCase().replace(/\/+$/, '');
  return decoded === '' ? '/' : decoded;
}

/**
 * 解析 Frontmatter（支援行內陣列與多行 YAML 清單）
 */
function parseFrontMatter(fileContent) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = fileContent.match(frontmatterRegex);
  const rawFrontmatter = match ? match[0] : '';

  if (matter) {
    try {
      const parsed = matter(fileContent);
      return {
        data: parsed.data || {},
        content: parsed.content || '',
        rawFrontmatter,
      };
    } catch (e) {
      // fallback
    }
  }

  if (!match) {
    return { data: {}, content: fileContent, rawFrontmatter: '' };
  }

  const yamlSection = match[1];
  const content = fileContent.substring(match[0].length);
  const data = {};

  const lines = yamlSection.split(/\r?\n/);
  let currentListKey = null;

  for (const line of lines) {
    // 處理多行 YAML list: "  - item"
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentListKey) {
      let itemVal = listMatch[1].trim().replace(/^['"]|['"]$/g, '');
      data[currentListKey].push(itemVal);
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let val = line.substring(colonIndex + 1).trim();

    if (val === '') {
      currentListKey = key;
      data[key] = [];
      continue;
    }

    currentListKey = null;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    data[key] = val;
  }

  return { data, content, rawFrontmatter };
}

/**
 * 遞迴取得指定副檔名的檔案
 */
function getFiles(dir, extRegex = /\.(md|mdx)$/i) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getFiles(res, extRegex));
    } else if (entry.isFile() && extRegex.test(entry.name)) {
      files.push(res);
    }
  }
  return files;
}

/**
 * 解析 Tags 欄位
 */
function parseTags(tagsField) {
  if (!tagsField) return [];
  if (Array.isArray(tagsField)) {
    return tagsField.map(t => (typeof t === 'object' && t.label ? String(t.label) : String(t)).trim());
  }
  if (typeof tagsField === 'string') {
    const val = tagsField.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      return val
        .slice(1, -1)
        .split(',')
        .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }
    return val.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * 去除 Docusaurus 檔案或資料夾的數字排序前綴（例如 "01-intro" -> "intro"）
 */
function stripNumberPrefix(segment) {
  return segment.replace(/^\d+[-_]/, '');
}

// ==========================================
// 1. 建立全站有效路由表 (Route Registry)
// ==========================================
const routeRegistry = new Set();

function addRoute(route) {
  routeRegistry.add(normalizeRoute(route));
}

// 系統預設路由
const systemRoutes = [
  '/',
  '/blog',
  '/blog/archive',
  '/blog/tags',
  '/photoblog',
  '/photoblog/photo-archive',
  '/photoblog/tags',
  '/photography',
  '/about',
  '/now',
  '/use',
  '/tool',
  '/blogroll',
  '/guestbook',
  '/random',
  '/sitemap.xml',
  '/blog/rss.xml',
  '/blog/atom.xml',
  '/photoblog/rss.xml',
  '/photoblog/atom.xml',
];
systemRoutes.forEach(addRoute);

/**
 * 註冊 Blog / Photoblog 路由與標籤
 */
function registerBlogStyleRoutes(dirPath, routeBasePath) {
  const files = getFiles(dirPath);
  const dirBaseName = path.basename(dirPath);

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const { data } = parseFrontMatter(content);

      const baseName = path.basename(file, path.extname(file));
      const parentDirName = path.basename(path.dirname(file));
      let nameToParse = baseName;
      if (baseName.toLowerCase() === 'index' && parentDirName !== dirBaseName) {
        nameToParse = parentDirName;
      }

      let route;
      if (data.slug) {
        const cleanSlug = String(data.slug).trim();
        if (cleanSlug.startsWith('/')) {
          route = cleanSlug.startsWith(`${routeBasePath}/`) || cleanSlug === routeBasePath
            ? cleanSlug
            : `${routeBasePath}${cleanSlug}`;
        } else {
          route = `${routeBasePath}/${cleanSlug}`;
        }
      } else {
        const dateMatch = nameToParse.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
        if (dateMatch) {
          const [, year, month, day, title] = dateMatch;
          route = `${routeBasePath}/${year}/${month}/${day}/${title}`;
        } else {
          route = `${routeBasePath}/${nameToParse}`;
        }
      }

      addRoute(route);

      // 註冊文章標籤路由
      const tags = parseTags(data.tags);
      tags.forEach(tag => {
        if (tag) {
          const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-');
          addRoute(`${routeBasePath}/tags/${normalizedTag}`);
          addRoute(`${routeBasePath}/tags/${tag}`);
        }
      });
    } catch (e) {
      console.error(`Error building route for ${file}:`, e.message);
    }
  });

  return files;
}

// 註冊 Blog 與 Photoblog
const blogFiles = registerBlogStyleRoutes(BLOG_DIR, '/blog');
const photoblogFiles = registerBlogStyleRoutes(PHOTOBLOG_DIR, '/photoblog');

// 註冊 Docs 路由
const docsFiles = getFiles(DOCS_DIR);
docsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { data } = parseFrontMatter(content);

    if (data.slug) {
      const slug = String(data.slug).trim();
      const route = slug.startsWith('/')
        ? (slug.startsWith('/docs/') || slug === '/docs' ? slug : `/docs${slug}`)
        : `/docs/${slug}`;
      addRoute(route);
    }

    const relativePath = path.relative(DOCS_DIR, file);
    const ext = path.extname(relativePath);
    let pagePath = relativePath.slice(0, -ext.length).replace(/\\/g, '/');

    if (/^(index|readme)$/i.test(pagePath)) {
      pagePath = '';
    } else if (/\/(index|readme)$/i.test(pagePath)) {
      pagePath = pagePath.replace(/\/(index|readme)$/i, '');
    }

    // 同時註冊原始路徑與去除數字前綴的 Docusaurus 預設路徑
    const rawRoute = pagePath ? `/docs/${pagePath}` : '/docs';
    const strippedPath = pagePath.split('/').map(stripNumberPrefix).join('/');
    const strippedRoute = strippedPath ? `/docs/${strippedPath}` : '/docs';

    addRoute(rawRoute);
    addRoute(strippedRoute);

    if (data.id) {
      const dirPart = path.dirname(relativePath).replace(/\\/g, '/');
      const idPrefix = dirPart === '.' ? '' : `${dirPart.split('/').map(stripNumberPrefix).join('/')}/`;
      addRoute(`/docs/${idPrefix}${data.id}`);
    }
  } catch (e) {
    console.error(`Error building route for doc file ${file}:`, e.message);
  }
});

// 註冊 Pages 路由
const pageAllFiles = getFiles(PAGES_DIR, /\.(md|mdx|js|jsx|ts|tsx)$/i);
pageAllFiles.forEach(file => {
  try {
    const relativePath = path.relative(PAGES_DIR, file);
    // 忽略以底線開頭的私有元件檔案
    if (path.basename(relativePath).startsWith('_')) return;

    const ext = path.extname(relativePath);
    let pagePath = relativePath.slice(0, -ext.length).replace(/\\/g, '/');

    if (pagePath.toLowerCase() === 'index') {
      pagePath = '';
    } else if (pagePath.toLowerCase().endsWith('/index')) {
      pagePath = pagePath.slice(0, -6);
    }

    addRoute(pagePath ? `/${pagePath}` : '/');
  } catch (e) {
    console.error(`Error building route for page file ${file}:`, e.message);
  }
});

// ==========================================
// 2. 掃描並驗證所有 Markdown / MDX 檔案中的連結
// ==========================================
const pageMarkdownFiles = getFiles(PAGES_DIR, /\.(md|mdx)$/i);
const allMarkdownFiles = [...blogFiles, ...photoblogFiles, ...docsFiles, ...pageMarkdownFiles];

const startTime = Date.now();
let totalLinksChecked = 0;
let errorCount = 0;
let warningCount = 0;
let fixedCount = 0;

console.log(`🔍 正在檢查 ${allMarkdownFiles.length} 個 Markdown/MDX 檔案中的連結...${AUTO_FIX ? ' (已啟用 --fix 自動修復模式)' : ''}`);

/**
 * 根據字元索引計算精確的 (line, column)
 */
function getPositionFromIndex(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineStarts[mid] <= index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const lineIdx = Math.max(0, low - 1);
  return {
    line: lineIdx + 1,
    col: index - lineStarts[lineIdx] + 1,
  };
}

/**
 * 清理 Markdown 連結中的 title 屬性與尖括號，例如：
 * `/path/to/img.webp "圖片標題"` -> `/path/to/img.webp`
 * `</path with spaces/img.webp>` -> `/path with spaces/img.webp`
 */
function extractCleanTarget(rawUrl) {
  let u = rawUrl.trim();
  if (u.startsWith('<') && u.endsWith('>')) {
    return u.slice(1, -1).trim();
  }
  const titleMatch = u.match(/^(\S+)\s+(?:["'][\s\S]*["']|\([\s\S]*\))$/);
  if (titleMatch) {
    return titleMatch[1];
  }
  return u;
}

/**
 * 檢查靜態檔案是否存在
 */
function checkStaticAssetExists(urlPath) {
  const decodedPath = safeDecodeURI(urlPath);
  const checkPaths = [decodedPath, urlPath];

  if (!decodedPath.endsWith('.html') && !path.extname(decodedPath)) {
    checkPaths.push(`${decodedPath}.html`);
    checkPaths.push(path.join(decodedPath, 'index.html'));
  }

  for (const staticDir of STATIC_DIRS) {
    for (const p of checkPaths) {
      const assetPath = path.join(WORKSPACE, staticDir, p);
      if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        return true;
      }
    }
  }
  return false;
}

allMarkdownFiles.forEach(file => {
  try {
    let rawContent = fs.readFileSync(file, 'utf8');
    let fileModified = false;
    const relativeFile = path.relative(WORKSPACE, file);

    // 建立每行起始 index 陣列，用於快速反查行號與欄號
    const lineStarts = [0];
    for (let i = 0; i < rawContent.length; i++) {
      if (rawContent[i] === '\n') {
        lineStarts.push(i + 1);
      }
    }

    const { data: frontmatterData, rawFrontmatter } = parseFrontMatter(rawContent);

    // 將 Frontmatter、Fenced Code Blocks、Inline Code 與 HTML 註解遮罩為空白（保留換行符號以維持精準座標）
    const maskedContent = rawContent
      .replace(/^---\r?\n[\s\S]*?\r?\n---/, maskKeepNewlines)
      .replace(/```[\s\S]*?```/g, maskKeepNewlines)
      .replace(/~~~[\s\S]*?~~~/g, maskKeepNewlines)
      .replace(/`[^`\r\n]+`/g, maskKeepNewlines)
      .replace(/<!--[\s\S]*?-->/g, maskKeepNewlines);

    const extractedLinks = [];

    // 1. 檢查 Frontmatter 中的封面圖欄位 (image / cover / thumbnail)
    ['image', 'cover', 'thumbnail'].forEach(field => {
      if (frontmatterData[field] && typeof frontmatterData[field] === 'string') {
        const fmUrl = frontmatterData[field].trim();
        const fmIdx = rawFrontmatter.indexOf(fmUrl);
        extractedLinks.push({
          rawUrl: fmUrl,
          index: fmIdx !== -1 ? fmIdx : 0,
          sourceType: `Frontmatter (${field})`,
        });
      }
    });

    // 2. Markdown 連結與圖片: [Text](URL) 或 ![Alt](URL)
    const markdownLinkRegex = /!?\[([^\]]*?)\]\(([^)\r\n]+)\)/g;
    // 3. HTML / MDX 標籤: <a href="...">, <img src="...">, <Link to="...">
    const jsxAttrRegex = /<(?:a|img|Link|source)\s+[^>]*?(?:href|src|to)=["']([^"']+)["']/gi;
    // 4. MDX require 語法: require('@site/static/...') 或 require('./...')
    const requireRegex = /require\(["']([^"']+)["']\)/g;

    let match;
    while ((match = markdownLinkRegex.exec(maskedContent)) !== null) {
      const urlOffsetInMatch = match[0].lastIndexOf(match[2]);
      extractedLinks.push({
        rawUrl: extractCleanTarget(match[2]),
        index: match.index + (urlOffsetInMatch !== -1 ? urlOffsetInMatch : 0),
        sourceType: 'Markdown',
      });
    }

    while ((match = jsxAttrRegex.exec(maskedContent)) !== null) {
      const urlOffsetInMatch = match[0].lastIndexOf(match[1]);
      extractedLinks.push({
        rawUrl: match[1].trim(),
        index: match.index + (urlOffsetInMatch !== -1 ? urlOffsetInMatch : 0),
        sourceType: 'JSX/HTML',
      });
    }

    while ((match = requireRegex.exec(maskedContent)) !== null) {
      const urlOffsetInMatch = match[0].lastIndexOf(match[1]);
      extractedLinks.push({
        rawUrl: match[1].trim(),
        index: match.index + (urlOffsetInMatch !== -1 ? urlOffsetInMatch : 0),
        sourceType: 'require()',
      });
    }

    // 逐一驗證擷取出的連結
    extractedLinks.forEach(({ rawUrl, index }) => {
      if (!rawUrl) return;
      if (/^(#|mailto:|tel:|javascript:|data:)/i.test(rawUrl)) return;

      totalLinksChecked++;
      const { line, col } = getPositionFromIndex(lineStarts, index);
      const locationTag = `${relativeFile}:${line}:${col}`;

      // 去除錨點 (#) 與查詢參數 (?)
      let cleanUrl = rawUrl.split('#')[0].split('?')[0].trim();
      if (cleanUrl.startsWith('pathname://')) {
        cleanUrl = cleanUrl.replace(/^pathname:\/\/?/, '/');
      }
      if (!cleanUrl) return;

      // 1. 檢查是否誤用 localhost / 127.0.0.1
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(cleanUrl)) {
        const expectedPath = rawUrl.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '') || '/';
        if (AUTO_FIX) {
          rawContent = rawContent.split(rawUrl).join(expectedPath);
          fileModified = true;
          fixedCount++;
          console.log(`🔧 \x1b[32m已自動修正\x1b[0m ${locationTag} -> 將 '${rawUrl}' 替換為 '${expectedPath}'`);
        } else {
          console.error(`❌ \x1b[31m錯誤\x1b[0m ${locationTag} -> 連結包含本地測試網址 '${rawUrl}' (建議改為 '${expectedPath}')`);
          errorCount++;
        }
        return;
      }

      // 2. 檢查外部絕對網址 (http:// 或 https://)
      if (/^https?:\/\//i.test(cleanUrl)) {
        try {
          const parsedUrl = new URL(rawUrl);
          if (OWN_DOMAINS.includes(parsedUrl.hostname.toLowerCase())) {
            const expectedPath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || '/';
            if (AUTO_FIX) {
              rawContent = rawContent.split(rawUrl).join(expectedPath);
              fileModified = true;
              fixedCount++;
              console.log(`🔧 \x1b[32m已自動修正\x1b[0m ${locationTag} -> 將自有網域 '${rawUrl}' 替換為 '${expectedPath}'`);
            } else {
              console.warn(`⚠️  \x1b[33m警告\x1b[0m ${locationTag} -> 建議使用相對根路徑 '${expectedPath}' 代替完整網址 '${rawUrl}' (可加 --fix 自動替換)`);
              warningCount++;
            }
          }
        } catch (e) {
          console.error(`❌ \x1b[31m錯誤\x1b[0m ${locationTag} -> 無效的 URL 格式 '${rawUrl}'`);
          errorCount++;
        }
        return;
      }

      // 3. 檢查 Docusaurus @site/ 別名路徑
      if (cleanUrl.startsWith('@site/')) {
        const siteRelPath = safeDecodeURI(cleanUrl.replace(/^@site\//, ''));
        const targetSitePath = path.join(WORKSPACE, siteRelPath);
        if (!fs.existsSync(targetSitePath)) {
          console.error(`❌ \x1b[31m錯誤\x1b[0m ${locationTag} -> 找不到 @site 檔案 '${rawUrl}'`);
          errorCount++;
        }
        return;
      }

      // 4. 檢查站內絕對路徑 (以 / 開頭)
      if (cleanUrl.startsWith('/')) {
        const searchRoute = normalizeRoute(cleanUrl);
        if (routeRegistry.has(searchRoute)) {
          return; // 命中有效頁面路由
        }

        if (checkStaticAssetExists(cleanUrl)) {
          return; // 命中有效靜態資源
        }

        console.error(`❌ \x1b[31m錯誤\x1b[0m ${locationTag} -> 找不到站內路由或靜態檔案 '${rawUrl}'`);
        errorCount++;
        return;
      }

      // 5. 檢查相對路徑 (例如 ./img/photo.webp, ../docs/intro.md)
      const currentDir = path.dirname(file);
      const decodedUrl = safeDecodeURI(cleanUrl);
      const targetFilePath = path.resolve(currentDir, decodedUrl);

      if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
        return;
      }

      // 支援省略 .md / .mdx 副檔名或目錄下 index.md / index.mdx 的相對連結
      const candidateExtensions = ['.md', '.mdx', '/index.md', '/index.mdx'];
      const foundRelativeDoc = candidateExtensions.some(ext => fs.existsSync(targetFilePath + ext));
      if (foundRelativeDoc) {
        return;
      }

      console.error(
        `❌ \x1b[31m錯誤\x1b[0m ${locationTag} -> 找不到相對檔案 '${rawUrl}' (解析路徑: ${path.relative(WORKSPACE, targetFilePath)})`
      );
      errorCount++;
    });

    if (fileModified) {
      fs.writeFileSync(file, rawContent, 'utf8');
    }
  } catch (e) {
    console.error(`Error reading or validating file ${file}:`, e.message);
  }
});

// ==========================================
// 3. 輸出檢查統計報告
// ==========================================
const elapsedMs = Date.now() - startTime;
console.log('─'.repeat(55));
console.log(
  `📊 檢查報告：共掃描 ${allMarkdownFiles.length} 個檔案、${totalLinksChecked} 個連結 (${elapsedMs}ms)`
);
if (fixedCount > 0) {
  console.log(`🔧 自動修正：${fixedCount} 處連結`);
}
if (warningCount > 0) {
  console.log(`⚠️  警告數量：${warningCount} 個`);
}

if (errorCount > 0) {
  console.error(`❌ 檢查失敗：共發現 ${errorCount} 個失效連結！`);
  process.exit(1);
} else {
  console.log('✅ 所有連結檢查無誤！');
  process.exit(0);
}