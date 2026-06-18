const fs = require('fs');

const fileContent = fs.readFileSync('c:/Users/shuojen/Desktop/Shuojen-blog/blog/2026-06-13-tower.md', 'utf8');

// Mimic parseFrontMatter logic
const content = fileContent.replace(/^---[\s\S]*?---/, '');
let cleanContent = content;

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

console.log('Chinese characters matched (' + chineseChars.length + '):', chineseChars);
console.log('English words matched (' + englishWords.length + '):', englishWords);
console.log('Total:', chineseChars.length + englishWords.length);
