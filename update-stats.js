const fs = require('fs');
const path = require('path');

// --- 配置區 ---
const BLOG_DIR = './blog';                   // 文章存放的資料夾
const TEMPLATE_FILE = './src/pages/index.template.md'; // 模板檔案 (永遠保留標籤)
const OUTPUT_FILE = './src/pages/index.md';           // 生成的目標檔案 (Docusaurus 使用)
// --------------

/**
 * 數字轉千分位格式化函數
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 遞迴取得資料夾內所有 Markdown 檔案路徑
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
  // 1. 取得所有檔案與字數統計
  const allFiles = getAllMarkdownFiles(BLOG_DIR);
  const postCount = allFiles.length;

  let totalWords = 0;
  allFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    totalWords += content.length;
  });

  // 2. 格式化數字
  const formattedPostCount = formatNumber(postCount);
  const formattedWordCount = formatNumber(totalWords);

  // 3. 檢查模板檔案是否存在
  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(`找不到模板檔案：${TEMPLATE_FILE}\n請先將 index.md 改名為 index.template.md`);
  }

  // 4. 讀取模板內容並替換
  let templateContent = fs.readFileSync(TEMPLATE_FILE, 'utf8');

  let finalContent = templateContent
    .replace(/\{post_count\}|\[POST_COUNT\]/g, formattedPostCount)
    .replace(/\{word_count\}|\[WORD_COUNT\]/g, formattedWordCount);

  // 5. 寫入到正式的 index.md
  fs.writeFileSync(OUTPUT_FILE, finalContent);

  console.log(`✅ 自動更新完成！`);
  console.log(`來源模板: ${TEMPLATE_FILE}`);
  console.log(`生成檔案: ${OUTPUT_FILE} (文章: ${formattedPostCount}, 字數: ${formattedWordCount})`);

} catch (error) {
  console.error('❌ 執行失敗：', error.message);
}