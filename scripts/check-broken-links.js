const fs = require('fs');
const path = require('path');

// 設定專案根目錄
const targetDirectory = path.join(__dirname, '..'); 

// 設定要掃描的資料夾 (這裡涵蓋了 Docusaurus 預設的大部分內容區)
const TARGET_DIRS = [
  path.join(targetDirectory, 'blog'),
  path.join(targetDirectory, 'photoblog'),
  path.join(targetDirectory, 'docs'),
  path.join(targetDirectory, 'src/pages')
];

// 擷取 http / https 網址的正則表達式
const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;

// 遞迴取得所有 Markdown 檔案
function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    // 略過 node_modules 等不需要掃描的資料夾
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

// 檢查單一連結的健康狀態
async function checkLink(url) {
  try {
    // 設定 8 秒的 Timeout，避免腳本被死網址卡住
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // 先嘗試極輕量的 HEAD 請求
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    
    // 如果伺服器不支援 HEAD，或是回傳無權限 (防爬蟲)，改用標準的 GET 請求再試一次
    if (res.status === 405 || res.status === 403 || res.status === 404) {
      res = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    
    clearTimeout(timeoutId);

    if (res.ok) {
      return { url, status: 'OK', code: res.status };
    } else {
      return { url, status: 'BROKEN', code: res.status };
    }
  } catch (error) {
    return { url, status: 'ERROR', code: error.name === 'AbortError' ? 'TIMEOUT (超時)' : '無法連線' };
  }
}

// 分批執行請求 (避免一次發出太多請求導致記憶體耗盡或被伺服器封鎖 IP)
async function checkLinksInBatches(links, batchSize = 10) {
  const results = [];
  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize);
    // 等待這一批次的 10 個網址全部檢查完，再進入下一批
    const batchResults = await Promise.all(
      batch.map(item => checkLink(item.url).then(res => ({ ...item, ...res })))
    );
    results.push(...batchResults);
    
    // 在終端機顯示進度
    process.stdout.write(`\r⏳ 檢查進度：${Math.min(i + batchSize, links.length)} / ${links.length}`);
  }
  console.log('\n'); // 換行
  return results;
}

async function main() {
  console.log('🔍 開始掃描 Markdown 檔案中的外部連結...\n');
  
  const allFiles = [];
  TARGET_DIRS.forEach(dir => getAllMarkdownFiles(dir, allFiles));

  const foundLinks = [];
  const seenUrls = new Set(); // 用於過濾重複網址，避免同一個網站檢查好幾次

  // 1. 讀取並收集所有網址
  allFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(URL_REGEX);
    
    if (matches) {
      matches.forEach(url => {
        // 略過本地端測試網址與 Docusaurus 的路由 (如 localhost)
        if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) return;
        
        // 移除網址尾巴可能因為 Markdown 語法不小心黏到的標點符號
        let cleanUrl = url.replace(/[.,:;)]$/, '');

        if (!seenUrls.has(cleanUrl)) {
          seenUrls.add(cleanUrl);
          const relativeFilePath = path.relative(targetDirectory, filePath);
          foundLinks.push({ url: cleanUrl, file: relativeFilePath });
        }
      });
    }
  });

  if (foundLinks.length === 0) {
    console.log('ℹ️ 沒有找到任何外部連結。');
    return;
  }

  console.log(`📡 共找到 ${foundLinks.length} 個不重複的外部連結，開始進行健康檢查...\n`);

  // 2. 開始分批檢查 (一次 10 個)
  const checkedLinks = await checkLinksInBatches(foundLinks, 10);

  // 3. 過濾出有問題的連結
  const brokenLinks = checkedLinks.filter(l => l.status !== 'OK');

  console.log('==================================================');
  if (brokenLinks.length === 0) {
    console.log('🎉 太棒了！你的部落格裡所有的外部連結都健康存活！');
  } else {
    console.log(`⚠️ 發現 ${brokenLinks.length} 個失效或可能有問題的連結：\n`);
    brokenLinks.forEach(item => {
      console.log(`❌ [${item.code}] ${item.url}`);
      console.log(`   📝 位於檔案: ${item.file}\n`);
    });
    console.log('💡 溫馨提醒：有些網站 (如 Twitter, 巴哈姆特) 設有嚴格的防爬蟲機制，可能腳本連不上去但手動點擊是正常的，遇到 403 或無法連線的網址請稍微手動確認一下喔！');
  }
  console.log('==================================================');
}

main();