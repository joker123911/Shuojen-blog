// 文章字數統計：中文字逐字計算，英文與數字以「詞」計算。
// docusaurus.config.js（單篇字數）與 scripts/prepare-data.js（about 頁總字數）共用，確保兩邊算法一致。

function countWords(content) {
  const cleanContent = (content || '')
    .replace(/^(import|export)\s.*$/gm, '') // MDX import / export 不算字數
    .replace(/!\[.*?\]\(.*?\)/g, '') // 圖片
    .replace(/<[^>]+>/g, '') // HTML / JSX 標籤
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 連結只留文字
    .replace(/```[\s\S]*?```/g, '') // 程式碼區塊
    .replace(/`([^`]+)`/g, '$1') // 行內程式碼只留內容
    .replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, ''); // 分隔線

  const chineseChars = cleanContent.match(/[一-龥]/g) || [];
  const noChinese = cleanContent.replace(/[一-龥]/g, ' ');
  const englishWords = noChinese.match(/[a-zA-Z0-9_-]+/g) || [];

  return chineseChars.length + englishWords.length;
}

module.exports = {countWords};
