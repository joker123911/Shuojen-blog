const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const BLOG_DIR = './blog';

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

function getWordCount(content) {
  let cleanContent = content || '';
  cleanContent = cleanContent.replace(/!\[.*?\]\(.*?\)/g, '');
  cleanContent = cleanContent.replace(/<[^>]+>/g, '');
  cleanContent = cleanContent.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  cleanContent = cleanContent.replace(/```[\s\S]*?```/g, '');
  cleanContent = cleanContent.replace(/`([^`]+)`/g, '$1');
  cleanContent = cleanContent.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
  
  const chineseChars = cleanContent.match(/[\u4e00-\u9fa5]/g) || [];
  const noChinese = cleanContent.replace(/[\u4e00-\u9fa5]/g, ' ');
  const englishWords = noChinese.match(/[a-zA-Z0-9_-]+/g) || [];
  
  return chineseChars.length + englishWords.length;
}

const allFiles = getAllMarkdownFiles(BLOG_DIR);

let sumMatter = 0;
let sumRegex = 0;

allFiles.forEach((filePath) => {
  const rawContent = fs.readFileSync(filePath, 'utf8');
  
  // 1. Using gray-matter (mimics Docusaurus parseFrontMatter)
  const matterParsed = matter(rawContent);
  sumMatter += getWordCount(matterParsed.content);
  
  // 2. Using regex replace
  let regexParsed = rawContent.replace(/\r\n/g, '\n');
  regexParsed = regexParsed.replace(/^---[\s\S]*?---/, '');
  sumRegex += getWordCount(regexParsed);
});

console.log('Sum using gray-matter:', sumMatter);
console.log('Sum using regex replace:', sumRegex);
console.log('Difference:', Math.abs(sumMatter - sumRegex));
