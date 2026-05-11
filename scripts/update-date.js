const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. 設定專案根目錄
const targetDirectory = path.join(__dirname, '..'); 

// 取得今天日期
const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const todayString = `${yyyy}-${mm}-${dd}`;

// === 核心防呆：取得「排除日期標籤」並「統一換行符號」後的乾淨內容 ===
// 這是為解決 Windows (CRLF) 與 Git (LF) 換行符號不同導致比對失敗的致命問題
function getCleanContent(content) {
  if (!content) return '';
  let clean = content.replace(/\*最後更新：.*?\*/g, ''); // 拔除日期行
  clean = clean.replace(/\r\n/g, '\n'); // 統一轉換為 LF
  return clean.trim(); // 拔除前後多餘空白
}

// 取得檔案應該要押上的正確日期
function getTargetDate(filePath) {
  const relativePath = path.relative(targetDirectory, filePath).replace(/\\/g, '/');

  let currentContent = '';
  try {
    currentContent = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return todayString;
  }

  let headContent = '';
  try {
    // 取得 Git 裡面最後一次 commit 的原始內容
    headContent = execSync(`git show HEAD:"${relativePath}"`, { cwd: targetDirectory, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (err) {
    // 找不到代表這是尚未加入 git 的全新檔案
    return todayString;
  }

  // 比對「拔除日期」與「統一換行」後的真實內容
  const cleanCurrent = getCleanContent(currentContent);
  const cleanHead = getCleanContent(headContent);

  if (cleanCurrent !== cleanHead) {
    // 實際內容真的有被改動（且還沒 commit） -> 就是今天！
    return todayString;
  } else {
    // 實際內容完全沒變 -> 抓取 Git 歷史的最後 commit 日期
    try {
      const gitDate = execSync(`git log -1 --format="%cd" --date=short "${relativePath}"`, { cwd: targetDirectory, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      if (gitDate) return gitDate;
    } catch (e) {}
  }

  // 終極備案：如果都失敗，退回系統檔案時間
  const dateObj = new Date(fs.statSync(filePath).mtime);
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

// === 取得 movies.js 的正確日期 ===
const moviesJsPath = path.join(targetDirectory, 'src', 'data', 'movies.js');
let moviesJsDate = '1970-01-01';
if (fs.existsSync(moviesJsPath)) {
  moviesJsDate = getTargetDate(moviesJsPath);
}

// 遞迴取得資料夾下所有 .md 與 .mdx 檔案
function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    // 排除不必要的資料夾
    if (file === 'node_modules' || file === '.docusaurus' || file === 'build' || file === '.git') return;

    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllMarkdownFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

function updateModifiedFiles() {
  const files = getAllMarkdownFiles(targetDirectory);
  let updatedCount = 0;

  files.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const regex = /\*最後更新：.*?\*/g;

      // 只有當檔案裡面真的有「最後更新」這行，才需要處理
      if (!regex.test(content)) return;

      let targetDate = getTargetDate(filePath);
      const isMovieMd = path.basename(filePath) === 'movie_list.md';

      // movie_list.md 的特殊連動邏輯
      let isSyncWithMoviesJs = false;
      if (isMovieMd && moviesJsDate > targetDate) {
        targetDate = moviesJsDate;
        isSyncWithMoviesJs = true;
      }

      // 抓出原本舊的日期
      const match = content.match(/\*最後更新：(.*?)\*/);
      const oldDate = match ? match[1] : '未知';

      // 如果舊日期跟算出來的目標日期不一樣，就執行替換
      if (oldDate !== targetDate) {
        const replacementText = `*最後更新：${targetDate}*`;
        const newContent = content.replace(regex, replacementText);
        fs.writeFileSync(filePath, newContent, 'utf8');
        
        const relativeDisplayPath = path.relative(__dirname, filePath);
        if (isSyncWithMoviesJs) {
          console.log(`✅ 已自動更新：${relativeDisplayPath} (${oldDate} -> ${targetDate}) (同步 movies.js 變更)`);
        } else {
          console.log(`✅ 已自動更新：${relativeDisplayPath} (${oldDate} -> ${targetDate})`);
        }
        updatedCount++;
      }
    } catch (err) {
      console.error(`❌ 處理檔案 ${filePath} 時發生錯誤：`, err);
    }
  });

  if (updatedCount === 0) {
    console.log('ℹ️ 所有檔案都已是正確日期，無需更新。');
  } else {
    console.log(`🎉 總共更新了 ${updatedCount} 個檔案的最後更新日期。`);
  }
}

// 執行主程式
updateModifiedFiles();