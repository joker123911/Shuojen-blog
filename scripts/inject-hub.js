const fs = require('fs');
const path = require('path');

// 因為檔案在 scripts/ 夾內，所以要用 '..' 回到根目錄再進到 build
const rssPath = path.join(__dirname, '..', 'build', 'blog', 'rss.xml');

console.log(`🔍 正在檢查路徑: ${rssPath}`);

if (fs.existsSync(rssPath)) {
  let content = fs.readFileSync(rssPath, 'utf8');
  
  // 定義 Hub 標籤
  const hubTag = '<link href="https://pubsubhubbub.appspot.com/" rel="hub"/>';
  
  if (!content.includes(hubTag)) {
    // 尋找 <channel> 標籤並在後面插入
    // 使用正則表達式確保精確匹配
    const updatedContent = content.replace('<channel>', `<channel>\n    ${hubTag}`);
    
    fs.writeFileSync(rssPath, updatedContent);
    console.log('✅ 成功將 WebSub Hub 標籤注入 RSS 檔案！');
  } else {
    console.log('ℹ️ RSS 中已經存在 Hub 標籤，跳過修改。');
  }
} else {
  console.log('❌ 錯誤：找不到 rss.xml。');
  console.log('   請確認：1. 是否執行過 npm run build？ 2. docusaurus.config.js 是否開啟了 RSS 功能？');
}