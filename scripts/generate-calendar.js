const fs = require('fs');
const path = require('path');

const blogDir = 'C:/Users/95193/Shuojen-blog/blog';
const photoblogDir = 'C:/Users/95193/Shuojen-blog/photoblog';
const outputJsonPath = 'C:/Users/95193/Shuojen-blog/src/data/contribution-data.json';

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

  // 3. 提取網址 (Slug)
  let url = '';
  const slugMatch = content.match(/^slug:\s*['"]?(.*?)['"]?$/m);
  if (slugMatch) {
    url = `${baseRoute}/${slugMatch[1].trim()}`.replace(/\/\/+/g, '/');
  } else {
    // 若沒有 slug，依照 Docusaurus 預設規則，以檔名（去掉日期前綴）作為網址
    const fileName = path.basename(filePath, path.extname(filePath));
    const nameWithoutDate = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    url = `${baseRoute}/${nameWithoutDate}`.replace(/\/\/+/g, '/');
  }

  return { date: dateStr, title, url };
}

console.log('開始掃描文章資料並提取標題與連結...');
const blogFiles = getFiles(blogDir).map(f => extractPostData(f, '/blog'));
const photoFiles = getFiles(photoblogDir).map(f => extractPostData(f, '/photoblog'));

const allPosts = [...blogFiles, ...photoFiles];
const dateData = {};

allPosts.forEach(post => {
  if (!dateData[post.date]) {
    dateData[post.date] = []; // 改為陣列來儲存當天的所有文章物件
  }
  dateData[post.date].push({ title: post.title, url: post.url });
});

const outputDir = path.dirname(outputJsonPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputJsonPath, JSON.stringify(dateData, null, 2));
console.log(`✅ 成功生成詳細寫作日曆資料！共統計了 ${Object.keys(dateData).length} 個有發文的日子。`);