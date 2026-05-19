const fs = require('fs');
const path = require('path');

const blogDir = path.join(process.cwd(), 'blog');
const photoblogDir = path.join(process.cwd(), 'photoblog');
const outputJsonPath = path.join(process.cwd(), 'src/data/contribution-data.json');

function getFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else if (filePath.endsWith('.md') || filePath.endsWith('.mdx')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

function extractPostData(filePath, baseRoute) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // 1. 提取日期
  let dateStr = '';
  const dateMatch = content.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
  if (dateMatch) {
    dateStr = dateMatch[1];
  } else {
    const fileName = path.basename(filePath);
    const fileDateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
    if (fileDateMatch) {
      dateStr = fileDateMatch[1];
    } else {
      const stats = fs.statSync(filePath);
      const d = new Date(stats.birthtime);
      dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    }
  }

  // 2. 提取標題
  let title = '未命名文章';
  const titleMatch = content.match(/^title:\s*['"]?(.*?)['"]?$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    title = path.basename(filePath, path.extname(filePath));
  }

  // 3. 提取網址 (修正為符合 Docusaurus 預設規則)
  let url = '';
  const slugMatch = content.match(/^slug:\s*['"]?(.*?)['"]?$/m);
  
  if (slugMatch) {
    // 如果文章有手動設定 slug，優先使用手動設定的
    let customSlug = slugMatch[1].trim();
    url = customSlug.startsWith('/') 
      ? `${baseRoute}${customSlug}` 
      : `${baseRoute}/${customSlug}`;
  } else {
    // 沒有 slug，使用 Docusaurus 預設規則： /blog/YYYY/MM/DD/檔名
    const fileName = path.basename(filePath, path.extname(filePath));
    let nameWithoutDate = fileName;
    
    // 把檔名前面的日期去掉 (例如 "2026-05-17-new_function" 變成 "new_function")
    if (/^\d{4}-\d{2}-\d{2}-/.test(fileName)) {
      nameWithoutDate = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    } else if (fileName === 'index') {
      // 處理資料夾形式 (例如 new_function/index.md)
      const parentDir = path.basename(path.dirname(filePath));
      nameWithoutDate = parentDir.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    }

    // 把 "2026-05-17" 轉換成 "2026/05/17"
    const datePath = dateStr.replace(/-/g, '/'); 
    
    // 組合出最終的 Docusaurus 網址
    url = `${baseRoute}/${datePath}/${nameWithoutDate}`;
  }

  // 清除可能出現的雙斜線 (//)
  url = url.replace(/\/\/+/g, '/'); 
  return { date: dateStr, title, url };
}

console.log('開始掃描文章資料並提取標題與連結...');
const blogFiles = getFiles(blogDir).map(f => extractPostData(f, '/blog'));
const photoFiles = getFiles(photoblogDir).map(f => extractPostData(f, '/photoblog'));

const allPosts = [...blogFiles, ...photoFiles];
const dateData = {};

allPosts.forEach(post => {
  if (!dateData[post.date]) {
    dateData[post.date] = [];
  }
  dateData[post.date].push({ title: post.title, url: post.url });
});

const outputDir = path.dirname(outputJsonPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputJsonPath, JSON.stringify(dateData, null, 2));
console.log(`✅ 成功生成詳細寫作日曆資料！共統計了 ${Object.keys(dateData).length} 個有發文的日子。`);