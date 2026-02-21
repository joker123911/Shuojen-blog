const fs = require('fs');
const path = require('path');

// --- 配置區 ---
const BLOG_DIR = './blog';                   // 文章存放的資料夾
const TARGET_FILE = './src/pages/homepage.md';  
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
    const cleanContent = content.replace(/\s+/g, '');

    totalWords += cleanContent.length;
  });

  const formattedPostCount = formatNumber(postCount);
  const formattedWordCount = formatNumber(totalWords);

  // 確認目標檔案是否存在
  if (!fs.existsSync(TARGET_FILE)) {
    throw new Error(`找不到目標檔案：${TARGET_FILE}`);
  }

  // 讀取目前真實的 Markdown 檔案
  let fileContent = fs.readFileSync(TARGET_FILE, 'utf8');

  // 使用正則表達式尋找那句特定的話，並替換裡面的數字
  // (.*? 會匹配原本裡面的任何數字或千分位符號)
  const regex = /貼文區目前共有 \*\*(.*?)\*\* 篇文章，共累積了 \*\*(.*?)\*\* 個字。/g;
  const newString = `貼文區目前共有 **${formattedPostCount}** 篇文章，共累積了 **${formattedWordCount}** 個字。`;

  // 執行替換
  const finalContent = fileContent.replace(regex, newString);

  // 如果找不到這句話，可能是不小心被刪除了，給個警告
  if (!regex.test(fileContent)) {
    console.warn(`⚠️ 警告：在 ${TARGET_FILE} 中找不到用來替換的句子，請確認檔案內是否有「${newString}」類似的格式。`);
  }

  // 將更新後的內容寫回同一個檔案
  fs.writeFileSync(TARGET_FILE, finalContent, 'utf8');

  console.log(`✅ 統計更新完成！`);
  console.log(`文章數: ${formattedPostCount}`);
  console.log(`純文字字數: ${formattedWordCount}`);

} catch (error) {
  console.error('❌ 執行失敗：', error.message);
}