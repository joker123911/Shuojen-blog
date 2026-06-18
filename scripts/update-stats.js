const fs = require('fs');
const path = require('path');
const matter = require('gray-matter'); // 引入 gray-matter 解析 Frontmatter

// --- 配置區 ---
const BLOG_DIR = './blog';                   // 文章存放的資料夾
const PHOTOBLOG_DIR = './photoblog';         // 攝影文章存放的資料夾
const TARGET_FILE = './src/pages/about.md';  // 目標檔案
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

/**
 * 計算字數（中文字元數 + 英文單字數），過濾掉代碼與標籤
 */
function getWordCount(content) {
  let cleanContent = content || '';
  
  // 移除 Markdown 圖片: ![alt](url)
  cleanContent = cleanContent.replace(/!\[.*?\]\(.*?\)/g, '');
  // 移除 HTML/JSX 標籤: <img ... />
  cleanContent = cleanContent.replace(/<[^>]+>/g, '');
  // 將 Markdown 連結轉為純文字: [文字](連結) -> 文字
  cleanContent = cleanContent.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  // 移除程式碼區塊: ```js ... ```
  cleanContent = cleanContent.replace(/```[\s\S]*?```/g, '');
  // 移除行內程式碼: `code`
  cleanContent = cleanContent.replace(/`([^`]+)`/g, '$1');
  // 移除水平分割線: ---
  cleanContent = cleanContent.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
  
  // 中文字數:
  const chineseChars = cleanContent.match(/[\u4e00-\u9fa5]/g) || [];
  // 英文單字數:
  const noChinese = cleanContent.replace(/[\u4e00-\u9fa5]/g, ' ');
  const englishWords = noChinese.match(/[a-zA-Z0-9_-]+/g) || [];
  
  return chineseChars.length + englishWords.length;
}

try {
  // --- 1. 計算貼文區 (Blog) 統計 ---
  const allFiles = getAllMarkdownFiles(BLOG_DIR);
  const postCount = allFiles.length;

  let totalWords = 0;
  allFiles.forEach((filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\r\n/g, '\n');
    content = content.replace(/^---[\s\S]*?---/, '');
    totalWords += getWordCount(content);
  });

  // --- 2. 計算攝影區 (Photoblog) 統計 ---
  const photoFiles = getAllMarkdownFiles(PHOTOBLOG_DIR);
  const photoPostCount = photoFiles.length;
  let totalPhotos = 0;

  photoFiles.forEach((filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    const currentPostImages = new Set();

    // 優先加入 Frontmatter 中的主圖 (data.image)
    if (data.image) {
      currentPostImages.add(data.image);
    }

    // 抓取內文所有圖片 ![](/path/to/img)
    const imgRegex = /!\[.*?\]\((.*?)\)/g;
    const matches = content.matchAll(imgRegex);

    for (const match of matches) {
      currentPostImages.add(match[1]);
    }

    totalPhotos += currentPostImages.size;
  });

  // --- 3. 格式化輸出資料 ---
  const formattedPostCount = formatNumber(postCount);
  const formattedWordCount = formatNumber(totalWords);
  const formattedPhotoPostCount = formatNumber(photoPostCount);
  const formattedPhotoCount = formatNumber(totalPhotos);

  // --- 4. 更新檔案內容 ---
  if (!fs.existsSync(TARGET_FILE)) {
    throw new Error(`找不到目標檔案：${TARGET_FILE}`);
  }

  let fileContent = fs.readFileSync(TARGET_FILE, 'utf8');

  // 正則表達式：使用 [\s\S]*? 來相容中間可能出現的換行符號或 <br />
  const regex = /貼文區目前共有 \*\*(.*?)\*\* 篇文章，共累積了 \*\*(.*?)\*\* 個字(?:；[\s\S]*?攝影區目前共有 \*\*(.*?)\*\* 篇文章，共累積了 \*\*(.*?)\*\* 張照片)?。/g;
  
  // 使用 <br /> 確保在 Markdown / Docusaurus 中正確換行
  const newString = `貼文區目前共有 **${formattedPostCount}** 篇文章，共累積了 **${formattedWordCount}** 個字；<br />\n攝影區目前共有 **${formattedPhotoPostCount}** 篇文章，共累積了 **${formattedPhotoCount}** 張照片。`;

  if (!regex.test(fileContent)) {
    console.warn(`⚠️ 警告：在 ${TARGET_FILE} 中找不到用來替換的句子，請確認檔案內文字格式。`);
  } else {
    // 執行替換
    const finalContent = fileContent.replace(regex, newString);
    // 將更新後的內容寫回同一個檔案
    fs.writeFileSync(TARGET_FILE, finalContent, 'utf8');
  }

  console.log(`✅ 統計更新完成！`);
  console.log(`📝 貼文區: ${formattedPostCount} 篇文章, ${formattedWordCount} 個字`);
  console.log(`📸 攝影區: ${formattedPhotoPostCount} 篇文章, ${formattedPhotoCount} 張照片`);

} catch (error) {
  console.error('❌ 執行失敗：', error.message);
}