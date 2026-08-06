const fs = require('fs');
const path = require('path');
const readline = require('readline');
const matter = require(path.join(__dirname, '../node_modules/gray-matter'));

function getLocalDateTimeISO() {
  const now = new Date();
  const tzo = -now.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num) => String(Math.floor(Math.abs(num))).padStart(2, '0');

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  const dateStr = `${year}-${month}-${day}`;
  return { dateStr };
}

async function promptInput(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const promptText = defaultValue !== undefined && defaultValue !== '' ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || String(defaultValue));
    });
  });
}

// Dynamically scan photoblog directory for all unique tags used across articles
function scanPhotoblogTags() {
  const pbDir = path.join(__dirname, '../photoblog');
  const tagCounts = {};

  if (fs.existsSync(pbDir)) {
    function scan(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          scan(fullPath);
        } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const { data } = matter(content);
            if (Array.isArray(data.tags)) {
              data.tags.forEach(t => {
                const tag = String(t).trim();
                if (tag) {
                  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
              });
            }
          } catch(e) {}
        }
      }
    }
    scan(pbDir);
  }

  function categorize(tag) {
    const l = tag.toLowerCase();

    // 1. 先判斷底片 (Film Stock)
    if (l.includes('kodak') || l.includes('fuji') || l.includes('agfa') || l.includes('foma') || l.includes('ilford') || l.includes('cinestill') || l.includes('film') || l.includes('底片') || l.includes('vista') || l.includes('protra') || l.includes('ektar')) {
      return '底片';
    }

    // 2. 再判斷鏡頭 (Lens)
    if (l.includes('mm') || l.includes('takumar') || l.includes('viltrox') || l.includes('sigma') || l.includes('tamron') || l.includes('nikkor') || l.includes('voigtlander')) {
      return '鏡頭';
    }

    // 3. 再判斷機身 (Camera Body)
    if (l.includes('xt') || l.includes('gm') || l.includes('gf') || l.includes('ae-1') || l.includes('auto') || l.includes('sony') || l.includes('nikon') || l.includes('canon') || l.includes('leica') || l.includes('ricoh') || l.includes('gr') || l.includes('phone') || l.includes('camera') || l.includes('konica')) {
      return '機身';
    }

    return '地點';
  }

  const categorized = {
    '機身': [],
    '鏡頭': [],
    '底片': [],
    '地點': []
  };

  Object.entries(tagCounts).forEach(([name, count]) => {
    const cat = categorize(name);
    categorized[cat].push({ name, count });
  });

  // Sort each category by frequency
  Object.keys(categorized).forEach(cat => {
    categorized[cat].sort((a, b) => b.count - a.count);
  });

  return categorized;
}

async function selectCategoryTags(categoryTitle, tagList) {
  if (!tagList || tagList.length === 0) {
    const custom = await promptInput(`--- ${categoryTitle} (請直接輸入標籤名稱，按 Enter 跳過)`, '');
    return custom ? custom.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
  }

  console.log(`\n--- ${categoryTitle} ---`);
  tagList.forEach((item, idx) => {
    const padNum = String(idx + 1).padStart(2, ' ');
    console.log(`  [${padNum}] ${item.name} (${item.count}次)`);
  });

  const input = await promptInput(`請選擇編號 (如 1,2，或直接輸入新名稱如 1,新標籤；按 Enter 跳過)`, '');
  if (!input) return [];

  const result = [];
  const parts = input.split(/[,，]/).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 1 && num <= tagList.length) {
      result.push(tagList[num - 1].name);
    } else {
      result.push(part);
    }
  }

  return result;
}

async function selectPhotoblogTagsWizard() {
  const dynamicTags = scanPhotoblogTags();

  console.log('\n📷 === 選擇要設定的 Tag 類別 ===\n');
  console.log('  [1] 📷 機身 (Body)');
  console.log('  [2] 🔍 鏡頭 (Lens)');
  console.log('  [3] 🎞️ 底片 (Film)');
  console.log('  [4] 📍 地點與主題 (Location & Theme)');
  console.log('');

  const catChoice = await promptInput('請選擇要設定的類別編號 (可複選如 1,2,4；按 Enter 代表全部設定)', '1,2,3,4');
  
  const chosenCats = new Set();
  const choiceParts = catChoice.split(/[,，]/).map(p => p.trim());

  for (const part of choiceParts) {
    if (part === '1') chosenCats.add('機身');
    if (part === '2') chosenCats.add('鏡頭');
    if (part === '3') chosenCats.add('底片');
    if (part === '4') chosenCats.add('地點');
  }

  if (chosenCats.size === 0) {
    chosenCats.add('機身');
    chosenCats.add('鏡頭');
    chosenCats.add('底片');
    chosenCats.add('地點');
  }

  const finalTags = [];

  if (chosenCats.has('機身')) {
    const tags = await selectCategoryTags('📷 機身 (Body)', dynamicTags['機身']);
    finalTags.push(...tags);
  }

  if (chosenCats.has('鏡頭')) {
    const tags = await selectCategoryTags('🔍 鏡頭 (Lens)', dynamicTags['鏡頭']);
    finalTags.push(...tags);
  }

  if (chosenCats.has('底片')) {
    const tags = await selectCategoryTags('🎞️ 底片 (Film)', dynamicTags['底片']);
    finalTags.push(...tags);
  }

  if (chosenCats.has('地點')) {
    const tags = await selectCategoryTags('📍 地點與主題 (Location & Theme)', dynamicTags['地點']);
    finalTags.push(...tags);
  }

  return finalTags.length > 0 ? finalTags : ['Fujifilm-XT20', 'xf1855mmf2.8'];
}

async function createNewPost() {
  const rawArgs = process.argv.slice(2);
  let targetUnit = null; // 'blog' or 'photoblog'
  let slug = null;
  let title = null;
  let tagInput = null;

  if (rawArgs.length > 0) {
    const firstArg = rawArgs[0].toLowerCase();
    if (firstArg === 'photo' || firstArg === 'photoblog' || firstArg === 'p') {
      targetUnit = 'photoblog';
      rawArgs.shift();
    } else if (firstArg === 'blog' || firstArg === 'b') {
      targetUnit = 'blog';
      rawArgs.shift();
    }
  }

  if (rawArgs.length > 0) slug = rawArgs[0];
  if (rawArgs.length > 1) title = rawArgs[1];
  if (rawArgs.length > 2) tagInput = rawArgs[2];

  console.log('\n📝 === 新文章建立精靈 ===\n');

  if (!targetUnit) {
    const unitChoice = await promptInput('1. 請選擇目標單元 [1: blog (文章), 2: photoblog (攝影集)]', '1');
    targetUnit = unitChoice.trim() === '2' || unitChoice.toLowerCase() === 'photoblog' ? 'photoblog' : 'blog';
  }

  const isPhoto = targetUnit === 'photoblog';
  const unitName = isPhoto ? '攝影集 (photoblog)' : '文字貼文 (blog)';

  if (!slug) {
    slug = await promptInput(`2. 請輸入 ${unitName} 英文 Slug (例如: my-new-post)`, 'new-post');
  }

  slug = slug.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'new-post';

  if (!title) {
    title = await promptInput(`3. 請輸入 ${unitName} 中文標題`, slug);
  }

  let tagsArray = [];

  if (tagInput) {
    tagsArray = tagInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
  } else if (isPhoto) {
    // Two-stage category wizard for photoblog
    tagsArray = await selectPhotoblogTagsWizard();
  } else {
    const inputStr = await promptInput(`4. 請輸入文章標籤 Tags (多個標籤以逗號分隔)`, 'life');
    tagsArray = inputStr.split(/[,，]/).map(t => t.trim()).filter(Boolean);
  }

  const formattedTags = JSON.stringify(tagsArray);

  const { dateStr } = getLocalDateTimeISO();
  const dirName = `${dateStr}-${slug}`;
  const baseDir = path.join(__dirname, '..', targetUnit);
  const targetDir = path.join(baseDir, dirName);
  const targetFile = path.join(targetDir, 'index.md');

  if (fs.existsSync(targetDir)) {
    console.error(`\n❌ 錯誤：資料夾 [${dirName}] 已經存在於 ${targetUnit}/ 目錄下！`);
    process.exit(1);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  let content = '';

  if (isPhoto) {
    content = `---
title: '${title}'
tags: ${formattedTags}
---

在這裡寫下攝影集的紀錄與簡介...

![img](./001.webp)
`;
  } else {
    content = `---
title: '${title}'
tags: ${formattedTags}
date: ${dateStr}
---

在這裡寫下你的文章內容...


{/* 圖片引用範例（將圖片放在同一個資料夾內）： */}
{/* <img src={require('./001.webp').default} width="600" alt="img" /> */}
`;
  }

  fs.writeFileSync(targetFile, content, 'utf8');

  const fileUri = `file:///${targetFile.replace(/\\/g, '/')}`;

  console.log(`\n🎉 ${unitName} 文章資料夾與檔案建立成功！`);
  console.log(`--------------------------------------------------`);
  console.log(`📁 目錄位置: ${targetUnit}/${dirName}/`);
  console.log(`🏷️  文章標籤: ${tagsArray.join(', ')}`);
  console.log(`📄 檔案路徑: ${fileUri}`);
  console.log(`--------------------------------------------------\n`);
}

createNewPost();
