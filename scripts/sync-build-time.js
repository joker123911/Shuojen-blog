const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml');

const targets = [
  path.join(__dirname, '../blog'),
  path.join(__dirname, '../photoblog'),
];

// 將任意 Date 物件格式化為台灣時間 (UTC+8) 的部件
function formatToTaiwanISO(dateObj) {
  const twTime = new Date(dateObj.getTime() + 8 * 3600 * 1000);
  const iso = twTime.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  return {
    datePart: iso.slice(0, 10),
    fullTime: `${iso.slice(0, 19)}+08:00`,
  };
}

// 取得台灣目前時間 (UTC+8)
const { datePart: todayStr, fullTime: currentFullTime } = formatToTaiwanISO(new Date());

/**
 * 從原始檔案內容中擷取未經 js-yaml 轉換的 date 原始字串
 */
function extractRawDateLiteral(fileContent) {
  const fmMatch = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const dateLineMatch = fmMatch[1].match(/^date\s*:\s*(.+)$/m);
  if (!dateLineMatch) return null;

  let raw = dateLineMatch[1].trim();
  // 若未加引號，移除行尾可能存在的 YAML 註解
  if (!raw.startsWith("'") && !raw.startsWith('"')) {
    raw = raw.replace(/\s+#.*$/, '').trim();
  }
  // 去除外層單雙引號
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1).trim();
  }
  return raw || null;
}

/**
 * 解析日期字串，精確判斷是否包含時間，並正規化為 YYYY-MM-DD 與 YYYY-MM-DDTHH:mm:ss+08:00
 */
function parseAndNormalizeDate(rawDateStr, fallbackDateObj) {
  if (rawDateStr) {
    // 1. 純日期格式: YYYY-MM-DD
    const pureDateMatch = rawDateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (pureDateMatch) {
      const [, y, m, d] = pureDateMatch;
      return {
        datePart: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
        hasSpecificTime: false,
        normalizedFullTime: null,
      };
    }

    // 2. 含有時間的格式: YYYY-MM-DD[T ]HH:mm(:ss)?(.sss)?(Z|+08:00)?
    const dtMatch = rawDateStr.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i
    );
    if (dtMatch) {
      const [, y, m, d, hh, mm, ss = '00', tz] = dtMatch;
      const datePart = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const timePart = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;

      // 若無時區標記或已經是 +08:00，直接視為台灣本地時間，避免被當成 UTC 多加 8 小時
      if (!tz || tz === '+08:00' || tz === '+0800') {
        return {
          datePart,
          hasSpecificTime: true,
          normalizedFullTime: `${datePart}T${timePart}+08:00`,
        };
      }

      // 若明確標註為 Z (UTC) 或其他時區，才透過 Date 換算為台灣時間 (+08:00)
      const parsed = new Date(rawDateStr);
      if (!isNaN(parsed.getTime())) {
        const tw = formatToTaiwanISO(parsed);
        return {
          datePart: tw.datePart,
          hasSpecificTime: true,
          normalizedFullTime: tw.fullTime,
        };
      }
    }
  }

  // Fallback: 若無法由原始字串解析但有 Date 物件
  if (fallbackDateObj instanceof Date && !isNaN(fallbackDateObj.getTime())) {
    const tw = formatToTaiwanISO(fallbackDateObj);
    const hasTime =
      fallbackDateObj.getUTCHours() !== 0 ||
      fallbackDateObj.getUTCMinutes() !== 0 ||
      fallbackDateObj.getUTCSeconds() !== 0;
    return {
      datePart: tw.datePart,
      hasSpecificTime: hasTime,
      normalizedFullTime: hasTime ? tw.fullTime : null,
    };
  }

  return null;
}

function processFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processFiles(filePath);
      return;
    }

    if (!entry.isFile() || (!entry.name.endsWith('.md') && !entry.name.endsWith('.mdx'))) {
      return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(fileContent);
    const data = parsed.data;

    // 跳過草稿文章，避免草稿在正式發布前就先被鎖死 rss_date
    if (data.draft === true) return;

    let rawDateLiteral = extractRawDateLiteral(fileContent);
    if (!rawDateLiteral && !data.date) {
      // 支援從檔名 (2026-10-14-xxx.md) 或父資料夾名 (2026-10-14-xxx/index.md) 擷取日期
      const baseName = path.basename(filePath, path.extname(filePath));
      const parentDirName = path.basename(path.dirname(filePath));
      const nameToCheck = baseName.toLowerCase() === 'index' ? parentDirName : entry.name;
      const dateMatch = nameToCheck.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        rawDateLiteral = dateMatch[1];
      }
    }

    const dateInfo = parseAndNormalizeDate(rawDateLiteral, data.date);
    if (!dateInfo) return;

    const { datePart, normalizedFullTime } = dateInfo;
    let hasSpecificTime = dateInfo.hasSpecificTime;

    // 如果 front matter 已經有 rss_date，代表已經設定過精確發布時間
    if (data.rss_date) {
      hasSpecificTime = true;
    }

    const relLabel = path.relative(path.join(__dirname, '..'), filePath);

    // 1. 如果原本的 date 包含精確時間，但尚未設定 rss_date，則進行分開
    if (hasSpecificTime && !data.rss_date) {
      data.rss_date = normalizedFullTime || `${datePart}T00:00:01+08:00`;
      data.date = datePart;
      saveFile(filePath, fileContent, parsed.content, data, relLabel, `分開 date 和 rss_date (${data.rss_date})`);
    }
    // 2. 如果是今天且尚未設定精確的 RSS 發布時間
    else if (datePart === todayStr && !hasSpecificTime) {
      data.date = datePart;
      data.rss_date = currentFullTime;
      saveFile(filePath, fileContent, parsed.content, data, relLabel, `初次設定今日發布時間: ${currentFullTime}`);
    }
    // 3. 如果是未來日期且尚未設定精確的 RSS 發布時間
    else if (datePart > todayStr && !hasSpecificTime) {
      data.date = datePart;
      data.rss_date = `${datePart}T00:00:01+08:00`;
      saveFile(filePath, fileContent, parsed.content, data, relLabel, `補上預排發布時間 (${data.rss_date})`);
    }
  });
}

/**
 * 儲存檔案並強制套用 YAML 格式（保留原檔換行風格與內文排版）
 */
function saveFile(filePath, rawFileContent, bodyContent, data, label, msg) {
  const lineEnding = rawFileContent.includes('\r\n') ? '\r\n' : '\n';

  let yamlStr = yaml
    .dump(data, {
      quotingType: "'",
      forceQuotes: true,
      flowLevel: 1,
      lineWidth: -1, // 防止長標題或摘要在 80 字元處被自動斷行
    })
    .trimEnd();

  // 移除 date 欄位的引號，保持 YAML 時間格式相容性
  yamlStr = yamlStr.replace(/^date:\s*'(.+)'$/m, 'date: $1');

  const frontmatterBlock = `---${lineEnding}${yamlStr.replace(/\r?\n/g, lineEnding)}${lineEnding}---`;

  let newContent;
  if (/^---\r?\n[\s\S]*?\r?\n---/.test(rawFileContent)) {
    // 原位替換 Frontmatter，100% 保留內文原有的空行與格式
    newContent = rawFileContent.replace(/^---\r?\n[\s\S]*?\r?\n---/, () => frontmatterBlock);
  } else {
    const cleanBody = bodyContent.startsWith('\n') || bodyContent.startsWith('\r\n')
      ? bodyContent
      : `${lineEnding}${bodyContent}`;
    newContent = `${frontmatterBlock}${cleanBody}`;
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ [RSS 補完] ${label} -> ${msg}`);
}

console.log(`🔍 正在檢查文章... (今日: ${todayStr})`);
targets.forEach((target) => processFiles(target));