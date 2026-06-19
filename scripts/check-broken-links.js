const fs = require('fs');
const path = require('path');

const WORKSPACE = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(WORKSPACE, 'blog');
const PHOTOBLOG_DIR = path.join(WORKSPACE, 'photoblog');
const DOCS_DIR = path.join(WORKSPACE, 'docs');
const PAGES_DIR = path.join(WORKSPACE, 'src', 'pages');

const STATIC_DIRS = ['static', 'photoblog'];

// Try to load gray-matter for frontmatter parsing
let matter;
try {
  matter = require('gray-matter');
} catch (e) {
  // fallback parser will be used
}

function parseFrontMatter(fileContent) {
  if (matter) {
    try {
      const parsed = matter(fileContent);
      return { data: parsed.data || {}, content: parsed.content || '' };
    } catch (e) {
      // fallback
    }
  }
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = fileContent.match(frontmatterRegex);
  if (!match) {
    return { data: {}, content: fileContent };
  }
  
  const yamlSection = match[1];
  const content = fileContent.substring(match[0].length);
  const data = {};
  
  const lines = yamlSection.split(/\r?\n/);
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let val = line.substring(colonIndex + 1).trim();
    
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    
    data[key] = val;
  }
  
  return { data, content };
}

// Helper to recursively get markdown files
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

// Build set of valid routes
const routeRegistry = new Set();

// Hardcoded system routes
const systemRoutes = [
  '/',
  '/blog',
  '/blog/archive',
  '/photoblog',
  '/photoblog/photo-archive',
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
  '/photoblog/rss.xml'
];
systemRoutes.forEach(r => routeRegistry.add(r.toLowerCase()));

// Parse tags from frontmatter metadata
function parseTags(tagsField) {
  if (!tagsField) return [];
  if (Array.isArray(tagsField)) return tagsField;
  if (typeof tagsField === 'string') {
    const val = tagsField.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      return val.slice(1, -1).split(',').map(t => t.trim().replace(/^['"]|['"]$/g, ''));
    }
    return val.split(',').map(t => t.trim());
  }
  return [];
}

// 1. Process Blog files
const blogFiles = getMarkdownFiles(BLOG_DIR);
blogFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { data } = parseFrontMatter(content);
    
    let baseName = path.basename(file, path.extname(file));
    let parentDirName = path.basename(path.dirname(file));
    let nameToParse = baseName;
    if (baseName.toLowerCase() === 'index' && parentDirName !== 'blog') {
      nameToParse = parentDirName;
    }
    
    // Determine post route
    let postSlug = data.slug;
    let route;
    if (postSlug) {
      postSlug = postSlug.trim();
      route = postSlug.startsWith('/') ? (postSlug.startsWith('/blog/') ? postSlug : `/blog${postSlug}`) : `/blog/${postSlug}`;
    } else {
      const dateMatch = nameToParse.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
      if (dateMatch) {
        const [_, year, month, day, title] = dateMatch;
        route = `/blog/${year}/${month}/${day}/${title}`;
      } else {
        route = `/blog/${nameToParse}`;
      }
    }
    
    routeRegistry.add(route.toLowerCase());
    routeRegistry.add(route.toLowerCase() + '/');
    
    // Add tag routes
    const tags = parseTags(data.tags);
    tags.forEach(tag => {
      if (tag) {
        const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-');
        routeRegistry.add(`/blog/tags/${normalizedTag}`);
        routeRegistry.add(`/blog/tags/${tag.toLowerCase()}`);
      }
    });
  } catch (e) {
    console.error(`Error building route for blog file ${file}:`, e);
  }
});

// 2. Process Photoblog files
const photoblogFiles = getMarkdownFiles(PHOTOBLOG_DIR);
photoblogFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { data } = parseFrontMatter(content);
    
    let baseName = path.basename(file, path.extname(file));
    let parentDirName = path.basename(path.dirname(file));
    let nameToParse = baseName;
    if (baseName.toLowerCase() === 'index' && parentDirName !== 'photoblog') {
      nameToParse = parentDirName;
    }
    
    // Determine route
    let postSlug = data.slug;
    let route;
    if (postSlug) {
      postSlug = postSlug.trim();
      route = postSlug.startsWith('/') ? (postSlug.startsWith('/photoblog/') ? postSlug : `/photoblog${postSlug}`) : `/photoblog/${postSlug}`;
    } else {
      const dateMatch = nameToParse.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
      if (dateMatch) {
        const [_, year, month, day, title] = dateMatch;
        route = `/photoblog/${year}/${month}/${day}/${title}`;
      } else {
        route = `/photoblog/${nameToParse}`;
      }
    }
    
    routeRegistry.add(route.toLowerCase());
    routeRegistry.add(route.toLowerCase() + '/');
    
    // Add tag routes
    const tags = parseTags(data.tags);
    tags.forEach(tag => {
      if (tag) {
        const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-');
        routeRegistry.add(`/photoblog/tags/${normalizedTag}`);
        routeRegistry.add(`/photoblog/tags/${tag.toLowerCase()}`);
      }
    });
  } catch (e) {
    console.error(`Error building route for photoblog file ${file}:`, e);
  }
});

// 3. Process Docs files
const docsFiles = getMarkdownFiles(DOCS_DIR);
docsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { data } = parseFrontMatter(content);
    
    let route;
    if (data.slug) {
      const slug = data.slug.trim();
      route = slug.startsWith('/') ? (slug.startsWith('/docs/') ? slug : `/docs${slug}`) : `/docs/${slug}`;
    } else {
      const relativePath = path.relative(DOCS_DIR, file);
      const ext = path.extname(relativePath);
      let pagePath = relativePath.slice(0, -ext.length).replace(/\\/g, '/');
      
      // Handle index or README
      if (pagePath.toLowerCase() === 'index' || pagePath.toLowerCase() === 'readme') {
        pagePath = '';
      } else if (pagePath.toLowerCase().endsWith('/index') || pagePath.toLowerCase().endsWith('/readme')) {
        pagePath = pagePath.slice(0, -6);
      }
      
      route = pagePath ? `/docs/${pagePath}` : '/docs';
    }
    
    routeRegistry.add(route.toLowerCase());
    routeRegistry.add(route.toLowerCase() + '/');
  } catch (e) {
    console.error(`Error building route for doc file ${file}:`, e);
  }
});

// 4. Process Pages files
if (fs.existsSync(PAGES_DIR)) {
  const getPageFiles = (dir) => {
    let files = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of list) {
      const res = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getPageFiles(res));
      } else if (entry.isFile() && /\.(md|mdx|js|jsx|ts|tsx)$/.test(entry.name)) {
        files.push(res);
      }
    }
    return files;
  };
  
  const pageFiles = getPageFiles(PAGES_DIR);
  pageFiles.forEach(file => {
    try {
      const relativePath = path.relative(PAGES_DIR, file);
      const ext = path.extname(relativePath);
      let pagePath = relativePath.slice(0, -ext.length).replace(/\\/g, '/');
      
      if (pagePath.toLowerCase() === 'index') {
        pagePath = '';
      } else if (pagePath.toLowerCase().endsWith('/index')) {
        pagePath = pagePath.slice(0, -6);
      }
      
      const route = pagePath ? `/${pagePath}` : '/';
      routeRegistry.add(route.toLowerCase());
      routeRegistry.add(route.toLowerCase() + '/');
    } catch (e) {
      console.error(`Error building route for page file ${file}:`, e);
    }
  });
}

// Scan and Validate Links in all Markdown Files
let errorCount = 0;
const allMarkdownFiles = [...blogFiles, ...photoblogFiles, ...docsFiles];
// Also check markdown pages in pages directory
const pageMarkdownFiles = getMarkdownFiles(PAGES_DIR);
allMarkdownFiles.push(...pageMarkdownFiles);

console.log(`🔍 正在檢查 ${allMarkdownFiles.length} 個 Markdown 檔案中的連結...`);

allMarkdownFiles.forEach(file => {
  try {
    const rawContent = fs.readFileSync(file, 'utf8');
    const { content } = parseFrontMatter(rawContent);
    
    // Remove code blocks and inline code to prevent false positives in code snippets
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`\n]*`/g, '');
      
    // Find markdown links: [Text](URL) or ![Alt](URL)
    const markdownLinkRegex = /!?\[([^\]]*?)\]\(([^)]+?)\)/g;
    // Find HTML links: <a href="URL"> and <img src="URL">
    const htmlHrefRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
    const htmlSrcRegex = /<img\s+[^>]*src=["']([^"']+)["']/gi;
    
    const links = [];
    let match;
    
    // Find lines of matches for reporting line numbers
    const lines = rawContent.split(/\r?\n/);
    const findLineNumber = (url) => {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(url)) {
          return i + 1;
        }
      }
      return 1;
    };
    
    while ((match = markdownLinkRegex.exec(cleanContent)) !== null) {
      links.push({ url: match[2], text: match[1] });
    }
    
    while ((match = htmlHrefRegex.exec(cleanContent)) !== null) {
      links.push({ url: match[1], text: 'HTML A' });
    }
    
    while ((match = htmlSrcRegex.exec(cleanContent)) !== null) {
      links.push({ url: match[1], text: 'HTML IMG' });
    }
    
    links.forEach(({ url, text }) => {
      url = url.trim();
      if (!url) return;
      if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) return;
      
      let cleanUrl = url.split('#')[0].split('?')[0];
      if (cleanUrl.startsWith('pathname://')) {
        cleanUrl = cleanUrl.replace(/^pathname:\/\/?/, '/');
      }
      if (!cleanUrl) return;
      
      const lineNumber = findLineNumber(url);
      const relativeFile = path.relative(WORKSPACE, file);
      
      // 1. Check for localhost / 127.0.0.1
      if (cleanUrl.toLowerCase().includes('localhost') || cleanUrl.includes('127.0.0.1')) {
        console.error(`❌ \x1b[31m錯誤\x1b[0m 於 [${relativeFile}:${lineNumber}]: 連結包含 localhost (${url})`);
        errorCount++;
        return;
      }
      
      // 2. Check absolute external URLs (skip check if they are valid URLs, just print info for push check)
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        // Option to verify if they used hardcoded domain instead of root-relative
        if (cleanUrl.startsWith('https://shuojen.com') || cleanUrl.startsWith('http://shuojen.com')) {
          const expectedPath = cleanUrl.replace(/^https?:\/\/shuojen\.com/, '');
          console.warn(`⚠️  \x1b[33m警告\x1b[0m 於 [${relativeFile}:${lineNumber}]: 建議使用相對根路徑 '${expectedPath || '/'}' 代替完整網址 '${url}'`);
        }
        return;
      }
      
      // 3. Check local absolute paths (starts with /)
      if (cleanUrl.startsWith('/')) {
        const normalizedUrl = cleanUrl.toLowerCase().replace(/\/$/, '');
        const searchUrl = normalizedUrl === '' ? '/' : normalizedUrl;
        
        if (routeRegistry.has(searchUrl)) {
          return; // Valid route!
        }
        
        // If not in routeRegistry, check static assets (with optional .html fallback)
        let assetFound = false;
        const checkPaths = [cleanUrl];
        if (!cleanUrl.endsWith('.html') && !cleanUrl.includes('.')) {
          checkPaths.push(cleanUrl + '.html');
        }
        
        for (const staticDir of STATIC_DIRS) {
          for (const p of checkPaths) {
            const assetPath = path.join(WORKSPACE, staticDir, p);
            if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
              assetFound = true;
              break;
            }
          }
          if (assetFound) break;
        }
        
        if (!assetFound) {
          console.error(`❌ \x1b[31m錯誤\x1b[0m 於 [${relativeFile}:${lineNumber}]: 找不到本地路徑 '${url}'`);
          errorCount++;
        }
        return;
      }
      
      // 4. Check relative paths (e.g., ./img/photo.webp, ../docs/intro.md)
      const currentDir = path.dirname(file);
      // Clean up URL-encoded spaces etc.
      const decodedUrl = decodeURIComponent(cleanUrl);
      const targetFilePath = path.resolve(currentDir, decodedUrl);
      
      if (fs.existsSync(targetFilePath)) {
        return; // Valid relative path!
      }
      
      // Try with .md or .mdx extensions
      if (fs.existsSync(targetFilePath + '.md') || fs.existsSync(targetFilePath + '.mdx')) {
        return; // Valid relative markdown link!
      }
      
      console.error(`❌ \x1b[31m錯誤\x1b[0m 於 [${relativeFile}:${lineNumber}]: 找不到相對檔案 '${url}' (解析為: ${path.relative(WORKSPACE, targetFilePath)})`);
      errorCount++;
    });
  } catch (e) {
    console.error(`Error reading or validating file ${file}:`, e);
  }
});

if (errorCount > 0) {
  console.error(`\n❌ 檢查完成，共發現 ${errorCount} 個錯誤的連結！`);
  process.exit(1);
} else {
  console.log('\n✅ 所有連結檢查無誤！');
  process.exit(0);
}
