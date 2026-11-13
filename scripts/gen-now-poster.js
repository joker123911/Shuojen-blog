const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const matter = require('gray-matter');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'blog');
const PHOTOBLOG_DIR = path.join(ROOT_DIR, 'photoblog');
const NOW_MD_FILE = path.join(ROOT_DIR, 'src/pages/now.md');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/generated/nowPosterData.json');

const WINDOW_DAYS = 90;

// 僅保留具體有實質意義的領域標籤（移除「器物工具、生活隨筆、日常紀事、近期精選」等空泛分類詞）
const CONCRETE_TAG_MAP = {
  chess: { label: '西洋棋', weight: 10.0 },
  blogparty: { label: '格友見面會', weight: 9.0 },
  bike: { label: '老野狼檔車', weight: 8.0 },
  type: { label: '嘸蝦米', weight: 7.5 },
  高雄: { label: '高雄小琉球', weight: 7.0 },
  小琉球: { label: '高雄小琉球', weight: 7.0 },
};

// 內文具體實體詞庫（當文章內文提及時加權，不含空泛分類詞）
const ENTITY_DICT = [
  { match: '西洋棋', text: '西洋棋', weight: 6.5 },
  { match: '桌球', text: '桌球拉下旋', weight: 6.0 },
  { match: '野狼', text: '老野狼', weight: 5.5 },
  { match: '閱星瞳', text: '閱星瞳X4', weight: 7.0 },
  { match: '自動鉛筆', text: '自動鉛筆短評', weight: 6.5 },
  { match: '踩地雷', text: '踩地雷', weight: 6.5 },
  { match: 'GBA', text: 'GBA掌機', weight: 6.0 },
  { match: '貝果', text: '超美味貝果', weight: 6.0 },
  { match: '牛肉麵', text: '穆記牛肉麵', weight: 5.5 },
  { match: '林家乾麵', text: '林家乾麵', weight: 5.5 },
  { match: '倫敦開局', text: '倫敦開局', weight: 5.5 },
  { match: '吉伊卡哇', text: '吉伊卡哇', weight: 6.0 },
  { match: '節奏醫生', text: '節奏醫生', weight: 5.8 },
  { match: '活俠傳', text: '活俠傳', weight: 5.8 },
];

// 停用詞與空泛標題過濾表
const STOP_TERMS = new Set([
  '後記',
  '後記的後記',
  '前言',
  '總結',
  '心得',
  '結語',
  '比賽',
  '棋譜',
  '介紹',
  '開箱',
  '目錄',
  '其他',
  '參考資料',
  '補充',
  '更新',
  '週末雜記',
  '近期雜記',
  '日常紀事',
  '生活隨筆',
  '器物工具',
  '遊戲體驗',
  '電影鑑賞',
  '近期精選',
  '好友相聚',
  '故事紀實',
  '腦洞隨筆',
  '部落格寫作',
  '寫部落格',
  '閱讀',
  '健身',
  '鋼琴',
  '吉他',
  '恐怖片',
  '第一篇部落格文章',
  '投稿文章',
  '會中毒請小心服用',
  '低成本的好作品',
  '跟風 LQ7 大大',
  'nownownow.com',
  'Erik',
  'ikuka',
  '読書ノート',
  '小事系列',
  '物語',
  '蒙古旅行記',
  '非典型旅行記',
  '徒然日記',
  '反省：句讀之不知',
]);

function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllMarkdownFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      arrayOfFiles.push(filePath);
    }
  });
  return arrayOfFiles;
}

function extractPostDate(filePath, data, rawContent) {
  if (data && data.date) {
    if (data.date instanceof Date) {
      return data.date.toISOString().slice(0, 10);
    }
    const str = String(data.date).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  }
  const dateMatch = rawContent.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
  if (dateMatch) return dateMatch[1];

  const fileName = path.basename(filePath);
  const parentDir = path.basename(path.dirname(filePath));
  const m1 = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m1) return m1[1];
  const m2 = parentDir.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];
  return null;
}

function getDecayFactor(daysAgo) {
  if (daysAgo <= 30) return 1.0;
  if (daysAgo <= 60) return 0.72;
  return 0.48;
}

// 統一正規化與同義詞合併，徹底避免近似詞重複出現
function normalizeTerm(raw) {
  if (!raw) return '';
  let t = String(raw)
    .replace(/^[《〈「『【\s]+|[》〉」』】\s]+$/g, '')
    .replace(/\*\*|__|`/g, '')
    .trim();
  if (t.includes('──')) {
    const parts = t.split('──').map((s) => s.trim());
    t = parts[parts.length - 1].replace(/[《》（）()]/g, '').trim();
  }
  t = t.replace(/（[A-Za-z0-9\s:.-]+）|\([A-Za-z0-9\s:.-]+\)$/g, '').trim();

  // 同義詞與長短詞標準化
  if (t.startsWith('蠟筆小新：')) return '蠟筆小新劇場版';
  if (t === '殭屍100～在成為殭屍前要做的100件事～') return '殭屍100';
  if (t === '北海道札幌拉麵羽畠食堂') return '羽畠食堂拉麵';
  if (t === '怪物：麗茲波頓的故事') return '麗茲波頓的故事';
  if (t === '怪物：艾德蓋恩的故事') return '艾德蓋恩的故事';
  if (t === '名偵探麻里子最悲慘的一天') return '名偵探麻里子';
  if (t === '全國棋藝智力運動技能競賽') return '全國棋藝競賽';
  if (t === '不吝嗇展現自己的低品味') return '低品味運動';
  if (t === '承認吧，你其實根本不愛看書' || t === '承认吧，你其实根本不爱看书') return '其實不愛看書';
  if (t === '吉伊卡哇人魚島的秘密') return '吉伊卡哇';
  if (t.startsWith('格友見面會')) return '格友見面會';
  if (t.startsWith('我推的部落格')) return '我推的部落格';
  if (t.startsWith('嘸蝦米')) return '嘸蝦米打字';
  if (t === 'FX 戰士韭留美' || t === 'FX戰士韭留美') return 'FX戰士韭留美';
  if (t === 'Debussy Arabesque No.1' || t === 'Debussy') return '德布西華麗曲';
  if (t === '太聰明') return '陳綺貞太聰明';
  if (t === '五十嵐' || t === '阿華田' || t === '阿華田微糖微冰') return '五十嵐阿華田';
  if (t === '茶山謎路' || t === '桑葚紅烏' || t === '茶山謎路桑葚紅烏') return '茶山謎路';
  if (t === '桌球' || t === '拉下旋') return '桌球拉下旋';
  if (t === '天魔：惡之初') return '天魔惡之初';
  if (t === '大魚吃小魚：Shark' || t === '大魚吃小魚') return '大魚吃小魚';
  return t;
}

function getRecentRankingAdditions(cutoffDateStr) {
  const results = [];
  const summaryCounts = { 電影: 0, 動畫: 0, 影集: 0, 拉麵: 0, 金庸: 0 };

  try {
    const oldCommit = execSync(`git rev-list -n 1 --before="${cutoffDateStr}" HEAD`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!oldCommit) return { results, summaryCounts };

    const targetFiles = [
      { file: 'src/data/movies.js', type: '電影' },
      { file: 'src/data/anime.js', type: '動畫' },
      { file: 'src/data/series.js', type: '影集' },
      { file: 'src/data/ramen.js', type: '拉麵' },
      { file: 'src/data/jinyung.js', type: '金庸' },
    ];

    const tierScoreMap = { SSS: 9.6, SS: 9.1, S: 8.5, A: 7.7, B: 6.5 };
    let hasShinChanBatch = false;

    for (const { file, type } of targetFiles) {
      const fullPath = path.join(ROOT_DIR, file);
      if (!fs.existsSync(fullPath)) continue;

      let oldRaw = '';
      try {
        oldRaw = execSync(`git show ${oldCommit}:${file}`, {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      } catch (e) {
        oldRaw = '';
      }

      const newRaw = fs.readFileSync(fullPath, 'utf8');
      const oldTitles = new Set(
        [...oldRaw.matchAll(/title:\s*["']([^"']+)["']/g)].map((m) => m[1].trim())
      );

      for (const line of newRaw.split('\n')) {
        const titleMatch = line.match(/title:\s*["']([^"']+)["']/);
        if (!titleMatch) continue;
        const rawTitle = titleMatch[1].trim();
        if (oldTitles.has(rawTitle)) continue;

        summaryCounts[type] = (summaryCounts[type] || 0) + 1;

        if (rawTitle.startsWith('蠟筆小新：')) {
          if (!hasShinChanBatch) {
            hasShinChanBatch = true;
            results.push({
              title: '蠟筆小新劇場版',
              type: '電影',
              score: 8.5,
              note: '童年經典劇場版補完計畫',
              isRecentRelease: false,
            });
          }
          continue;
        }

        const scoreMatch = line.match(/score:\s*([\d.]+)/);
        const tierMatch = line.match(/tier:\s*["']([A-Z]+)["']/);
        const noteMatch = line.match(/note:\s*["']([^"']+)["']/);
        const score = scoreMatch
          ? parseFloat(scoreMatch[1])
          : tierMatch
            ? tierScoreMap[tierMatch[1]] || 7.8
            : 7.8;
        const yearMatch = line.match(/tags:\s*\[[^\]]*["'](202[456])["']/);

        results.push({
          title: normalizeTerm(rawTitle),
          type,
          score,
          note: noteMatch ? noteMatch[1].trim() : '',
          isRecentRelease: Boolean(yearMatch),
        });
      }
    }
  } catch (err) {
    // 無 git 環境下安全略過
  }
  return { results, summaryCounts };
}

function generateNowPosterData() {
  const now = new Date();
  const twNow = new Date(now.getTime() + 8 * 3600 * 1000);
  const todayStr = twNow.toISOString().slice(0, 10);
  const cutoffDate = new Date(twNow.getTime() - WINDOW_DAYS * 24 * 3600 * 1000);
  const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);

  const termMap = new Map();

  function addTerm(rawTerm, weight, category = 'general', sourceType = 'post') {
    const term = normalizeTerm(rawTerm);
    if (!term || term.length < 2 || term.length > 9) return;
    if (STOP_TERMS.has(term)) return;
    if (/^\d+$/.test(term)) return;
    // 排除過長的純英文標題以維持 EVA 漢字排版密度
    if (/^[A-Za-z0-9\s:.-]{8,}$/.test(term)) return;

    const existing = termMap.get(term);
    if (existing) {
      existing.weight += weight;
      existing.count += 1;
    } else {
      termMap.set(term, {
        text: term,
        weight,
        count: 1,
        category,
        sourceType,
      });
    }
  }

  // 1. 深度剖析 now.md（最高優先級，讓 /now 頁面改寫立即反映在最顯眼位置）
  const nowQuotes = [];
  if (fs.existsSync(NOW_MD_FILE)) {
    const nowRaw = fs.readFileSync(NOW_MD_FILE, 'utf8');

    // 逐行解析 now.md，同一行內同一個正規化詞彙不重複疊加
    for (const line of nowRaw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('*')) continue;

      const lineTerms = new Map();
      const registerLineTerm = (rawText, w, src) => {
        const norm = normalizeTerm(rawText);
        if (!norm || STOP_TERMS.has(norm)) return;
        const prev = lineTerms.get(norm);
        if (!prev || w > prev.weight) {
          lineTerms.set(norm, { weight: w, src });
        }
      };

      // 1A: 書名號《...》
      for (const m of trimmed.matchAll(/《([^》\n]{2,10})》/g)) {
        registerLineTerm(m[1].trim(), 42.0, 'now-book');
      }

      // 1B: Markdown 連結 [文字](url)
      for (const m of trimmed.matchAll(/\[([^\]]{2,26})\]\([^)]+\)/g)) {
        const linkText = m[1].trim();
        if (!linkText.includes('Derek')) {
          registerLineTerm(linkText, 38.0, 'now-link');
        }
      }

      // 1C: 清單標題與細節實體
      const bulletMatch = trimmed.match(/^\*\s+(?:\[([^\]]+)\]\([^)]+\)|([^：:\n]+))[：:](.+)$/);
      if (bulletMatch) {
        const itemTitle = (bulletMatch[1] || bulletMatch[2] || '').trim();
        const itemDesc = bulletMatch[3].trim();

        if (itemTitle && !STOP_TERMS.has(itemTitle) && !itemTitle.includes('Derek')) {
          registerLineTerm(itemTitle, 36.0, 'now-bullet');
        }

        const nowEntities = [
          { match: '王兵殘局', text: '王兵車兵殘局', weight: 40.0 },
          { match: '陳思宏', text: '陳思宏小說', weight: 36.0 },
          { match: '峻寶寶', text: '峻寶寶雙料冠軍', weight: 33.0 },
          { match: '阿華田', text: '五十嵐阿華田', weight: 35.0 },
          { match: '桑葚紅烏', text: '桑葚紅烏冷泡茶', weight: 35.0 },
          { match: '鍾成虎', text: '陳綺貞太聰明', weight: 36.0 },
        ];
        for (const ent of nowEntities) {
          if (itemDesc.includes(ent.match)) {
            registerLineTerm(ent.text, ent.weight, 'now-detail');
          }
        }

        if (itemDesc.includes('自立自強一個人健身')) {
          nowQuotes.push('中午只能自立自強一個人健身');
        }
        if (itemDesc.includes('止損')) {
          nowQuotes.push('拜託上保護止損吧求你了看的背脊發涼');
        }
        if (itemDesc.includes('大笑出來')) {
          nowQuotes.push('好久沒有看劇看到大笑出來，且看且珍惜');
        }
      }

      for (const [term, info] of lineTerms.entries()) {
        addTerm(term, info.weight, 'now', info.src);
      }
    }
  }

  // 2. 掃描近 90 天的 Blog 與 Photoblog 文章
  const allFiles = [
    ...getAllMarkdownFiles(BLOG_DIR).map((f) => ({ file: f, isPhoto: false })),
    ...getAllMarkdownFiles(PHOTOBLOG_DIR).map((f) => ({ file: f, isPhoto: true })),
  ];

  let recentBlogCount = 0;
  let recentPhotoCount = 0;
  let recentTotalWords = 0;
  let latestPostDate = cutoffDateStr;
  const extractedQuotes = [];

  for (const { file, isPhoto } of allFiles) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const { data, content } = matter(raw);
      if (data.draft || data.unlisted) continue;

      const dateStr = extractPostDate(file, data, raw);
      if (!dateStr || dateStr < cutoffDateStr || dateStr > todayStr) continue;

      if (dateStr > latestPostDate) {
        latestPostDate = dateStr;
      }

      const daysAgo = Math.max(
        0,
        Math.floor((new Date(todayStr) - new Date(dateStr)) / (1000 * 3600 * 24))
      );
      const decay = getDecayFactor(daysAgo);

      if (isPhoto) recentPhotoCount++;
      else recentBlogCount++;

      const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
      recentTotalWords += chineseChars;

      // 提取文章內的真實引號金句「...」
      for (const qm of content.matchAll(/「([^」\n]{7,34})」/g)) {
        const cleanQ = qm[1].replace(/\*\*|__|\[|\]|\([^)]*\)|`/g, '').trim();
        if (
          cleanQ.length >= 7 &&
          /[\u4e00-\u9fa5]{5,}/.test(cleanQ) &&
          !cleanQ.includes('http') &&
          !cleanQ.includes('/albums') &&
          !cleanQ.includes('在再') &&
          !cleanQ.includes('中杯')
        ) {
          extractedQuotes.push({ text: cleanQ, date: dateStr, daysAgo });
        }
      }

      const postTerms = new Map();
      const registerPostTerm = (rawTerm, w, cat, src) => {
        const norm = normalizeTerm(rawTerm);
        if (!norm || STOP_TERMS.has(norm)) return;
        const prev = postTerms.get(norm);
        if (!prev || w > prev.weight) {
          postTerms.set(norm, { weight: w, category: cat, sourceType: src });
        }
      };

      // 2A. 文章標題（具體事件/主題）
      if (data.title) {
        const cleanTitle = normalizeTerm(data.title);
        if (cleanTitle.length >= 2 && cleanTitle.length <= 8) {
          registerPostTerm(cleanTitle, 16.0 * decay, isPhoto ? 'photo' : 'post', 'title');
        }
      }

      // 2B. 具體標籤
      const tags = Array.isArray(data.tags) ? data.tags : [];
      for (const tag of tags) {
        const mapped = CONCRETE_TAG_MAP[tag];
        if (mapped) {
          registerPostTerm(mapped.label, mapped.weight * decay, 'tag', 'tag');
        }
      }

      // 2C. 內文書名號《...》與〈...〉
      const isBlogRecommendPost = file.includes('blog_recommend');
      if (!isBlogRecommendPost) {
        for (const m of content.matchAll(/[《〈]([^》〉]{2,10})[》〉]/g)) {
          registerPostTerm(m[1], 10.0 * decay, 'media', 'work');
        }
      }

      // 2D. 內文具體專有名詞
      for (const item of ENTITY_DICT) {
        if (content.includes(item.match)) {
          registerPostTerm(item.text, item.weight * decay, 'entity', 'entity');
        }
      }

      for (const [term, info] of postTerms.entries()) {
        addTerm(term, info.weight, info.category, info.sourceType);
      }
    } catch (e) {
      // ignore malformed file
    }
  }

  // 3. 處理 /docs 與 src/data/ 近 90 天新增的電影、動漫、影集、拉麵等項目
  const { results: rankingAdditions, summaryCounts } = getRecentRankingAdditions(cutoffDateStr);
  const sortedRankings = rankingAdditions.sort((a, b) => b.score - a.score);
  let movieAddedToTerms = 0;

  for (const item of sortedRankings) {
    if (item.type === '電影') {
      if (item.score >= 8.3 || item.isRecentRelease) {
        if (movieAddedToTerms < 14) {
          movieAddedToTerms++;
          const rankWeight = Math.max(11.0, (item.score - 7.0) * 8.0 + (item.isRecentRelease ? 3.0 : 0));
          addTerm(item.title, rankWeight, 'ranking', `ranking-${item.type}`);
        }
      }
    } else {
      const rankWeight = Math.max(13.0, (item.score - 6.8) * 8.5);
      addTerm(item.title, rankWeight, 'ranking', `ranking-${item.type}`);
    }
  }

  // 4. 子字串去重（若同時存在「西洋棋」與「西洋棋殘局」則保留各自代表性，但若為純重複前綴如「陳思宏老師」與「陳思宏小說」則合併）
  const rawTerms = Array.from(termMap.values()).sort((a, b) => b.weight - a.weight);
  const sortedTerms = rawTerms.slice(0, 60).map((item, idx) => ({
    ...item,
    weight: Math.round(item.weight * 10) / 10,
    rank: idx + 1,
  }));

  // 5. 金句去重（若兩句互為子字串，僅保留較完整的一句）
  extractedQuotes.sort((a, b) => a.daysAgo - b.daysAgo);
  const allCandidateQuotes = [...nowQuotes, ...extractedQuotes.map((q) => q.text)];
  const uniqueQuotes = [];

  for (const cand of allCandidateQuotes) {
    const isDuplicateOrSubstring = uniqueQuotes.some(
      (existing) => existing.includes(cand) || cand.includes(existing)
    );
    if (!isDuplicateOrSubstring) {
      uniqueQuotes.push(cand);
    }
  }

  const payload = {
    generatedAt: todayStr,
    latestPostDate,
    windowDays: WINDOW_DAYS,
    cutoffDate: cutoffDateStr,
    stats: {
      blogCount: recentBlogCount,
      photoCount: recentPhotoCount,
      totalPosts: recentBlogCount + recentPhotoCount,
      totalWords: recentTotalWords,
      rankingAdded: summaryCounts,
    },
    quotes: uniqueQuotes.slice(0, 15),
    topRankings: sortedRankings.slice(0, 16).map((x) => ({
      title: x.title,
      type: x.type,
      score: x.score,
      note: x.note,
    })),
    terms: sortedTerms,
  };

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const jsonContent = JSON.stringify(payload, null, 2) + '\n';
  if (!fs.existsSync(OUTPUT_FILE) || fs.readFileSync(OUTPUT_FILE, 'utf8') !== jsonContent) {
    fs.writeFileSync(OUTPUT_FILE, jsonContent, 'utf8');
  }

  // 同步更新 now.md 頂部的最後更新日期為當天
  if (fs.existsSync(NOW_MD_FILE)) {
    const nowContent = fs.readFileSync(NOW_MD_FILE, 'utf8');
    const updatedNow = nowContent.replace(/\*最後更新：\d{4}-\d{2}-\d{2}\*/, `*最後更新：${todayStr}*`);
    if (updatedNow !== nowContent) {
      fs.writeFileSync(NOW_MD_FILE, updatedNow, 'utf8');
    }
  }

  return payload;
}

if (require.main === module) {
  const data = generateNowPosterData();
  console.log(
    `✅ 已生成 Now 海報資料 (${data.stats.totalPosts} 篇近況文章，共提取 ${data.terms.length} 組具體詞彙與 ${data.quotes.length} 句不重複金句)`
  );
}

module.exports = { generateNowPosterData };
