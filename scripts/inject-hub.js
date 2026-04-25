const fs = require('fs');
const path = require('path');

// 指向 build 後的 RSS 路徑
const rssPath = path.join(__dirname, '..', 'build', 'blog', 'rss.xml');

console.log(`🔍 正在修正 RSS 格式: ${rssPath}`);

if (fs.existsSync(rssPath)) {
  let content = fs.readFileSync(rssPath, 'utf8');

  // 1. 檢查並注入 Atom 命名空間 (xmlns:atom)
  // 這是解決 "Unexpected attribute" 的關鍵
  if (!content.includes('xmlns:atom="http://www.w3.org/2005/Atom"')) {
    content = content.replace(
      '<rss version="2.0"',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"'
    );
  }

  // 2. 定義要注入的正確標籤 (使用 atom:link)
  const hubTag = '    <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub"/>';
  const selfTag = '    <atom:link href="https://shuojen.com/blog/rss.xml" rel="self" type="application/rss+xml"/>';

  // 3. 移除舊的錯誤標籤 (如果有手動改過的殘留)
  content = content.replace(/<link href="https:\/\/pubsubhubbub\.appspot\.com\/" rel="hub"\/>/g, '');

  // 4. 注入標籤到 <channel> 內
  // 檢查是否已經存在，避免重複注入
  if (!content.includes('rel="hub"')) {
    content = content.replace('<channel>', `<channel>\n${hubTag}`);
    console.log('✅ 已注入 WebSub Hub 標籤');
  }

  if (!content.includes('rel="self"')) {
    content = content.replace('<channel>', `<channel>\n${selfTag}`);
    console.log('✅ 已注入 rel="self" 標籤');
  }

  // 5. 寫回檔案
  fs.writeFileSync(rssPath, content);
  console.log('✨ RSS 修正完成！');

} else {
  console.log('❌ 錯誤：找不到 rss.xml，請確認是否已執行 npm run build。');
}