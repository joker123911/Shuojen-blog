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
    .replace(/^---[\s\S]*?---/g, '') // Frontmatter
    .replace(/```[\s\S]*?```/g, '')    // 代碼塊
    .replace(/!\[.*?\]\(.*?\)/g, '')   // 圖片
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')// 連結文字
    .replace(/:::[\s\S]*?:::/g, '')    // Docusaurus Admonition
    .replace(/<[^>]+>/g, '')           // HTML tags
    .replace(/[#*`~_>-]/g, ' ')        // Markdown 語法標記
    .replace(/\s+/g, ' ')              // 多餘空白合併
    .trim();
}

function formatCommentDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  const match = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [_, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateStr;
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
          date: formatCommentDate(c.time),
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

async function main() {
  const articles = [];

  // 1. 處理 Blog (貼文)
  getMarkdownFiles(BLOG_DIR).forEach((file) => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);

      if (data.draft === true) return;

      let baseName = path.basename(file, path.extname(file));
      let parentDirName = path.basename(path.dirname(file));
      let nameToParse = (baseName.toLowerCase() === 'index' && parentDirName !== 'blog') ? parentDirName : baseName;

      let url;
      if (data.slug) {
        const slug = data.slug.trim();
        url = slug.startsWith('/') ? (slug.startsWith('/blog/') ? slug : `/blog${slug}`) : `/blog/${slug}`;
      } else {
        const dateMatch = nameToParse.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
        if (dateMatch) {
          const [_, year, month, day, title] = dateMatch;
          url = `/blog/${year}/${month}/${day}/${title}`;
        } else {
          url = `/blog/${nameToParse}`;
        }
      }

      let date = '';
      if (data.date) {
        date = new Date(data.date).toISOString().split('T')[0];
      } else {
        const dateMatch = nameToParse.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) date = dateMatch[1];
      }

      articles.push({
        id: url,
        title: data.title || nameToParse,
        date,
        url,
        type: '貼文',
        content: cleanMarkdown(content),
      });
    } catch (err) {
      console.error(`[gen-search-index] Error parsing blog file ${file}:`, err);
    }
  });

  // 2. 處理 Photoblog (攝影集)
  getMarkdownFiles(PHOTOBLOG_DIR).forEach((file) => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);

      if (data.draft === true) return;

      let baseName = path.basename(file, path.extname(file));
      let parentDirName = path.basename(path.dirname(file));
      let nameToParse = (baseName.toLowerCase() === 'index' && parentDirName !== 'photoblog') ? parentDirName : baseName;

      let url;
      if (data.slug) {
        const slug = data.slug.trim();
        url = slug.startsWith('/') ? (slug.startsWith('/photoblog/') ? slug : `/photoblog${slug}`) : `/photoblog/${slug}`;
      } else {
        const dateMatch = nameToParse.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
        if (dateMatch) {
          const [_, year, month, day, title] = dateMatch;
          url = `/photoblog/${year}/${month}/${day}/${title}`;
        } else {
          url = `/photoblog/${nameToParse}`;
        }
      }

      let date = '';
      if (data.date) {
        date = new Date(data.date).toISOString().split('T')[0];
      } else {
        const dateMatch = nameToParse.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) date = dateMatch[1];
      }

      articles.push({
        id: url,
        title: data.title || nameToParse,
        date,
        url,
        type: '攝影',
        content: cleanMarkdown(content),
      });
    } catch (err) {
      console.error(`[gen-search-index] Error parsing photoblog file ${file}:`, err);
    }
  });

  // 3. 處理 Docs (興趣清單與筆記)
  getMarkdownFiles(DOCS_DIR).forEach((file) => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);

      if (data.draft === true) return;

      let url;
      if (data.slug) {
        const slug = data.slug.trim();
        url = slug.startsWith('/') ? (slug.startsWith('/docs/') ? slug : `/docs${slug}`) : `/docs/${slug}`;
      } else {
        const relativePath = path.relative(DOCS_DIR, file);
        const ext = path.extname(relativePath);
        let pagePath = relativePath.slice(0, -ext.length).replace(/\\/g, '/');
        if (pagePath.toLowerCase() === 'index' || pagePath.toLowerCase() === 'readme') {
          pagePath = '';
        } else if (pagePath.toLowerCase().endsWith('/index') || pagePath.toLowerCase().endsWith('/readme')) {
          pagePath = pagePath.slice(0, -6);
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
