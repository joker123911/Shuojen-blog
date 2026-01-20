const fs = require('fs');
const path = require('path');

// --- 配置區 ---
const BLOG_DIR = './blog';                   // 文章存放的資料夾
const TEMPLATE_FILE = './src/pages/index.template.md'; // 模板檔案
const OUTPUT_FILE = './src/pages/index.md';           // 生成的目標檔案
// --------------

/**
 * 數字轉千分位格式化
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 遞迴取得資料夾內所有 Markdown 檔案
 */
function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllMarkdownFiles(filePath, arrayOfFiles);
    } else {
      if (file.endsWith('.md') || file.endsWith('.mdx')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

try {
  const allFiles = getAllMarkdownFiles(BLOG_DIR);
  const postCount = allFiles.length;

  let totalWords = 0;
  allFiles.forEach((filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. 統一換行符號：將 Windows 的 \r\n 轉為 \n，確保跨平台字數一致
    content = content.replace(/\r\n/g, '\n');

    // 2. 移除 YAML Front Matter (--- ... ---)
    content = content.replace(/^---[\s\S]*?---/, '');

    // 3. 移除所有空白與換行，只計算「實際文字內容」
    // 如果你想要包含標點符號，就用這行。如果連空白都不要，就用下面這行：
    const cleanContent = content.replace(/\s+/g, '');

    totalWords += cleanContent.length;
  });

  const formattedPostCount = formatNumber(postCount);
  const formattedWordCount = formatNumber(totalWords);

  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(`找不到模板檔案：${TEMPLATE_FILE}`);
  }

  let templateContent = fs.readFileSync(TEMPLATE_FILE, 'utf8');

  // 替換標籤
  let finalContent = templateContent
    .replace(/\{post_count\}|\[POST_COUNT\]/g, formattedPostCount)
    .replace(/\{word_count\}|\[WORD_COUNT\]/g, formattedWordCount);

  // 寫入正式檔案
  fs.writeFileSync(OUTPUT_FILE, finalContent);

  console.log(`✅ 統計更新完成！`);
  console.log(`文章數: ${formattedPostCount}`);
  console.log(`純文字字數: ${formattedWordCount}`);

} catch (error) {
  console.error('❌ 執行失敗：', error.message);
}