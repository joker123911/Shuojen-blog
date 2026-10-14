const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const ROOT_DIR = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const PHOTOBLOG_DIR = path.join(ROOT_DIR, 'photoblog');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const OUTPUT_FILE = path.join(ROOT_DIR, 'static', 'search-index.json');
const WORKER_URL = 'https://blog-comments-api.joker123911.workers.dev';

function getMarkdownFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getMarkdownFiles(res));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      files.push(res);
    }
  }
  return files;
}

function cleanMarkdown(content) {
  return content
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '') // 移除 MDX import
    .replace(/^export\s+(?:default\s+)?(?:const|let|var|function)\s+[\s\S]*?$/gm, '') // 移除 MDX export
    .replace(/```[\s\S]*?```/g, '')    // 代碼塊
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // MDX 註解
    .replace(/!\[.*?\]\(.*?\)/g, '')   // 圖片
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')// 連結文字
    .replace(/^:::.*$/gm, '')          // Docusaurus Admonition 標記（保留內文）
    .replace(/<[^>]+>/g, '')           // HTML / JSX tags
    .replace(/[#*`~_>-]/g, ' ')        // Markdown 語法標記
    .replace(/\s+/g, ' ')              // 多餘空白合併
    .trim();
}

function formatDateSafe(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [_, y, m, d] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  const date = new Date(dateInput);
  if (!isNaN(date.getTime())) {
    // 若為 gray-matter 解析出的 Date 物件（預設為 UTC 00:00），直接取 ISO 日期；否則轉為台灣時區日期避免少一天
    if (dateInput instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    const twDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return twDate.toISOString().split('T')[0];
  }
  return String(dateInput);
}

async function fetchComments() {
  try {
    const res = await fetch(WORKER_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((c) => {
        const postName = c.title || (c.slug === '/guestbook' ? '留言板' : c.slug);
        const replyPart = c.replyContent ? ` (站長回覆: ${c.replyContent})` : '';
        return {
          id: `comment-${c.id}`,
          title: `💬 ${c.name} 於《${postName}》`,
          date: formatDateSafe(c.time),
          url: c.slug || '/guestbook',
          type: '留言',
          content: `${c.content || ''}${replyPart}`,
        };
      });
    }
  } catch (err) {
    console.warn('[gen-search-index] 無法擷取遠端留言 (可能處於離線環境):', err.message);
  }
  return [];
}

function parseBlogDirectory(dirPath, routePrefix, typeLabel) {
  const items = [];
  const dirBaseName = path.basename(dirPath);

  getMarkdownFiles(dirPath).forEach((file) => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);

      if (data.draft === true || data.unlisted === true) return;

      let baseName = path.basename(file, path.extname(file));
      let parentDirName = path.basename(path.dirname(file));
      let nameToParse = (baseName.toLowerCase() === 'index' && parentDirName !== dirBaseName) ? parentDirName : baseName;

      let url;
      if (data.slug) {
        const slug = String(data.slug).trim();
        url = slug.startsWith('/')
          ? (slug.startsWith(`/${routePrefix}/`) || slug === `/${routePrefix}` ? slug : `/${routePrefix}${slug}`)
          : `/${routePrefix}/${slug}`;
      } else {
        const dateMatch = nameToParse.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
        if (dateMatch) {
          const [_, year, month, day, title] = dateMatch;
          url = `/${routePrefix}/${year}/${month}/${day}/${title}`;
        } else {
          url = `/${routePrefix}/${nameToParse}`;
        }
      }

      let date = '';
      if (data.date) {
        date = formatDateSafe(data.date);
      } else {
        const dateMatch = nameToParse.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) date = dateMatch[1];
      }

      items.push({
        id: url,
        title: data.title || nameToParse,
        date,
        url,
        type: typeLabel,
        content: cleanMarkdown(content),
      });
    } catch (err) {
      console.error(`[gen-search-index] Error parsing ${routePrefix} file ${file}:`, err);
    }
  });

  return items;
}

async function main() {
  const articles = [];

  // 1. 處理 Blog (貼文)
  articles.push(...parseBlogDirectory(BLOG_DIR, 'blog', '貼文'));

  // 2. 處理 Photoblog (攝影集)
  articles.push(...parseBlogDirectory(PHOTOBLOG_DIR, 'photoblog', '攝影'));

  // 3. 處理 Docs (興趣清單與筆記)
  getMarkdownFiles(DOCS_DIR).forEach((file) => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);

      if (data.draft === true || data.unlisted === true) return;

      let url;
      if (data.slug) {
        const slug = String(data.slug).trim();
        if (slug === '/') {
          url = '/docs';
        } else {
          url = slug.startsWith('/') ? (slug.startsWith('/docs/') ? slug : `/docs${slug}`) : `/docs/${slug}`;
        }
      } else {
        const relativePath = path.relative(DOCS_DIR, file);
        const ext = path.extname(relativePath);
        let pagePath = relativePath.slice(0, -ext.length).replace(/\\/g, '/');
        if (/^(index|readme)$/i.test(pagePath)) {
          pagePath = '';
        } else {
          pagePath = pagePath.replace(/\/(index|readme)$/i, '');
        }
        url = pagePath ? `/docs/${pagePath}` : '/docs';
      }

      articles.push({
        id: url,
        title: data.title || path.basename(file, path.extname(file)),
        date: '',
        url,
        type: '興趣',
        content: cleanMarkdown(content),
      });
    } catch (err) {
      console.error(`[gen-search-index] Error parsing docs file ${file}:`, err);
    }
  });

  // 4. 處理留言區 (全站留言)
  const comments = await fetchComments();
  articles.push(...comments);

  // 確保 static 目錄存在
  const staticDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(staticDir)) {
    fs.mkdirSync(staticDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(articles), 'utf8');
  console.log(`[gen-search-index] 成功建立搜尋索引，共 ${articles.length} 篇內容（含 ${comments.length} 則留言），輸出至 ${OUTPUT_FILE}`);
}

main();