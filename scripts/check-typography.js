/**
 * scripts/check-typography.js
 *
 * 中文排版規範檢查與自動修正工具
 * 依據：《中文文案排版指北》(sparanoid/chinese-copywriting-guidelines)
 *
 * 功能特色：
 * 1. 支援「檢查模式」(預設) 與「自動修正模式」(--fix)
 * 2. 嚴格保護 Markdown / MDX 語法（Frontmatter 程式標籤、代碼塊、行內代碼、URL、KaTeX、JSX 元件等不被破壞）
 * 3. 準確回報違規檔名、行號與具體修改比對 (Diff)
 * 4. 支援自訂掃描目標路徑與單一檔案
 * 5. 終端機彩色輸出，並提供友善統計報表
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// 1. 命令列參數與設定 (CLI Arguments & Config)
// ==========================================
const args = process.argv.slice(2);
const AUTO_FIX = args.includes('--fix');
const SUMMARY_ONLY = args.includes('--summary') || args.includes('-s');
const FILES_ONLY = args.includes('--files-only') || args.includes('-l') || args.includes('--list');
const CHANGED_ONLY = args.includes('--changed') || args.includes('-c');
const NO_COLOR = args.includes('--no-color') || process.env.NO_COLOR != null;

// 自訂掃描路徑（過濾掉 flag 參數）
const customTargets = args.filter(a => !a.startsWith('-'));

const WORKSPACE = path.resolve(__dirname, '..');
const DEFAULT_TARGET_DIRS = ['blog', 'docs', 'photoblog'];

// 終端機顏色輸出輔助
const colors = {
  reset: NO_COLOR ? '' : '\x1b[0m',
  bold: NO_COLOR ? '' : '\x1b[1m',
  dim: NO_COLOR ? '' : '\x1b[2m',
  red: NO_COLOR ? '' : '\x1b[31m',
  green: NO_COLOR ? '' : '\x1b[32m',
  yellow: NO_COLOR ? '' : '\x1b[33m',
  cyan: NO_COLOR ? '' : '\x1b[36m',
  gray: NO_COLOR ? '' : '\x1b[90m',
};

// ==========================================
// 2. 排版核心格式化邏輯 (Typography Engine)
// ==========================================

/**
 * 常用專有名詞標準大小寫對照字典 (依據《中文文案排版指北》)
 */
const PROPER_NOUNS_MAP = {
  // 平台與服務
  'github': 'GitHub',
  'youtube': 'YouTube',
  'google': 'Google',
  'google map': 'Google Maps',
  'google maps': 'Google Maps',
  'lichess': 'Lichess',
  'steam': 'Steam',
  'spotify': 'Spotify',
  'netflix': 'Netflix',
  'disney+': 'Disney+',
  'kobo': 'Kobo',
  'feedly': 'Feedly',
  'freshrss': 'FreshRSS',
  // 作業系統與環境
  'ios': 'iOS',
  'macos': 'macOS',
  'iphone': 'iPhone',
  'ipad': 'iPad',
  'android': 'Android',
  'windows': 'Windows',
  'linux': 'Linux',
  'debian': 'Debian',
  'ubuntu': 'Ubuntu',
  'truenas': 'TrueNAS',
  // 軟體、工具與程式語言
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'markdown': 'Markdown',
  'docusaurus': 'Docusaurus',
  'vscodium': 'VSCodium',
  'vscode': 'VS Code',
  'docker': 'Docker',
  'syncthing': 'Syncthing',
  'tailscale': 'Tailscale',
  'autocad': 'AutoCAD',
  'excel': 'Excel',
  'powerpoint': 'PowerPoint',
  'chatgpt': 'ChatGPT',
  'gboard': 'Gboard',
  'musicbee': 'MusicBee',
  'retroarch': 'RetroArch',
  // 硬體與規格縮寫
  'bios': 'BIOS',
  'hdmi': 'HDMI',
  'm.2': 'M.2',
  'type-c': 'Type-C',
  'khz': 'kHz',
};

// 排除被誤用為頓號的漢字筆畫「丶」(U+4E36)，避免將其視為一般中文字而誤加空格
const HAN = '(?:(?!\\u4E36)[\\p{sc=Han}])';

/**
 * 針對純文字字串套用中文字型排版規則
 */
function applyTypographyRules(text) {
  let str = text;

  // 規則 1: 全形數字轉半形數字 (０-９ -> 0-9)
  str = str.replace(/[\uff10-\uff19]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xfee0));

  // 規則 2: 中文語境中的半形標點符號安全轉為全形
  // 3.1 中文之間的半形逗號 (中,中 -> 中，中)
  str = str.replace(new RegExp(`(${HAN}),[ \\t]*(?=${HAN})`, 'gu'), '$1，');
  // 2.2 中文後的單一半形驚嘆號 (中! -> 中！，保留 !!! 等重複標點原貌)
  str = str.replace(new RegExp(`(${HAN})!(?![!?])(?=[ \\t]*(?:[\\r\\n）」』》〉】]|${HAN}|$))`, 'gu'), '$1！');
  // 2.3 中文後的單一半形問號 (中? -> 中？，保留 ??? 等重複標點原貌)
  str = str.replace(new RegExp(`(${HAN})\\?(?![!?])(?=[ \\t]*(?:[\\r\\n）」』》〉】]|${HAN}|$))`, 'gu'), '$1？');
  // 3.4 中文後的半形冒號 (排除表情符號如 :-D, :P, :S, :3 及網址、時間數字)
  str = str.replace(
    new RegExp(`(${HAN}):(?![-\\/\\\\()3])[ \\t]*(?=[\\r\\n]|${HAN}|[A-Za-z]{2}|$)`, 'gu'),
    '$1：'
  );
  // 3.5 中文之間的半形分號 (中;中 -> 中；中)
  str = str.replace(new RegExp(`(${HAN});[ \\t]*(?=${HAN})`, 'gu'), '$1；');

  // 規則 4: 常用科技專有名詞大小寫規範 (例如 Github -> GitHub, Youtube -> YouTube)
  for (const [lower, correct] of Object.entries(PROPER_NOUNS_MAP)) {
    const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(`(?<![a-zA-Z0-9_\\-\\/.])(${escaped})(?![a-zA-Z0-9_\\-\\/.])`, 'gi');
    str = str.replace(reg, (m) => (m !== correct ? correct : m));
  }

  // 規則 5: 中文與英文字母、斜體標記之間加入空格 (CJK <-> English / *Italics*)
  // 5.1 由左至右完整識別成對的單星號斜體 (*...*)，確保空格永遠加在斜體星號外側，不破壞 *中文* 或 *English* 語法
  {
    const italicSpans = [];
    const ITALIC_BASE = 0xE000;
    str = str.replace(/(?<!\*)\*(?!\s)([^*\r\n]*?\S)\*(?!\*)/g, (m, inner) => {
      const id = italicSpans.length;
      italicSpans.push({ full: m, inner });
      return String.fromCodePoint(ITALIC_BASE + id);
    });
    if (italicSpans.length > 0) {
      const hanReg = new RegExp(`^${HAN}`, 'u');
      const hanEndReg = new RegExp(`${HAN}$`, 'u');
      str = str.replace(new RegExp(`(${HAN})([\\uE000-\\uF8FF])`, 'gu'), (m, cjk, tok) => {
        const span = italicSpans[tok.codePointAt(0) - ITALIC_BASE];
        return span && /^[a-zA-Z0-9]/.test(span.inner) ? `${cjk} ${tok}` : m;
      });
      str = str.replace(new RegExp(`([\\uE000-\\uF8FF])(${HAN})`, 'gu'), (m, tok, cjk) => {
        const span = italicSpans[tok.codePointAt(0) - ITALIC_BASE];
        return span && /[a-zA-Z0-9.!?'"’]$/.test(span.inner) ? `${tok} ${cjk}` : m;
      });
      str = str.replace(/([a-zA-Z0-9])([\uE000-\uF8FF])/gu, (m, eng, tok) => {
        const span = italicSpans[tok.codePointAt(0) - ITALIC_BASE];
        return span && hanReg.test(span.inner) ? `${eng} ${tok}` : m;
      });
      str = str.replace(/([\uE000-\uF8FF])([a-zA-Z0-9])/gu, (m, tok, eng) => {
        const span = italicSpans[tok.codePointAt(0) - ITALIC_BASE];
        return span && hanEndReg.test(span.inner) ? `${tok} ${eng}` : m;
      });
      for (let i = italicSpans.length - 1; i >= 0; i--) {
        str = str.replace(String.fromCodePoint(ITALIC_BASE + i), () => italicSpans[i].full);
      }
    }
  }
  // 5.2 一般中英文字母間距
  str = str.replace(new RegExp(`(${HAN})([a-zA-Z])`, 'gu'), '$1 $2');
  str = str.replace(new RegExp(`([a-zA-Z])(${HAN})`, 'gu'), '$1 $2');

  // 規則 6: 中文與數字之間加入空格 (CJK <-> Number)
  str = str.replace(new RegExp(`(${HAN})([0-9])`, 'gu'), '$1 $2');
  str = str.replace(new RegExp(`([0-9])(${HAN})`, 'gu'), '$1 $2');

  // 規則 6.1: 數字後接 %、℃、° 或前接貨幣符號 $ 與中文之間保持空格
  str = str.replace(new RegExp(`([0-9]+(?:%|℃|°))(${HAN})`, 'gu'), '$1 $2');
  str = str.replace(new RegExp(`(${HAN})(\\$[0-9])`, 'gu'), '$1 $2');

  // 規則 7: 全形標點符號前後不留空格 (Full-width punctuation spacing)
  // 全形逗號、句號、驚嘆號、問號、分號、冒號、頓號 (含 U+4E36 丶)
  str = str.replace(/([，。！？；：、\u4E36])\x20+/gu, '$1');
  str = str.replace(/\x20+([，。！？；：、\u4E36])/gu, '$1');

  // 全形括號、書名號、引號內部不留空格（保留選擇題/填空題如「（    ）」的空白括號）
  str = str.replace(/([（「『《〈【])\x20+(?![\x20]*[）」』》〉】])/gu, '$1');
  str = str.replace(/(?<![（「『《〈【][\x20]*)\x20+([）」』》〉】])/gu, '$1');

  // 行尾若有全形標點後接的多餘空白，予以清除
  str = str.replace(/([，。！？；：、\u4E36])[ \t]+$/gm, '$1');

  return str;
}

/**
 * 遮蔽 MDX 中的單行與多行 import / export 語句（如 export const Component = () => { ... }）
 */
function maskMdxImportsAndExports(text, addToken) {
  const lineStartRegex = /^(?:import|export)\s+/gm;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = lineStartRegex.exec(text)) !== null) {
    const startIdx = match.index;
    if (startIdx < lastIndex) continue;

    result += text.slice(lastIndex, startIdx);

    let i = startIdx;
    let braceDepth = 0;
    let bracketDepth = 0;
    let parenDepth = 0;
    let inString = null;
    const len = text.length;

    while (i < len) {
      const ch = text[i];
      const next = text[i + 1];

      if (inString) {
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === inString) {
          inString = null;
        }
        i++;
        continue;
      }

      if (ch === '/' && next === '/') {
        while (i < len && text[i] !== '\n') i++;
        continue;
      }

      if (ch === '/' && next === '*') {
        i += 2;
        while (i < len && !(text[i] === '*' && text[i + 1] === '/')) i++;
        i += 2;
        continue;
      }

      if (ch === "'" || ch === '"' || ch === '`') {
        inString = ch;
        i++;
        continue;
      }

      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

      if (ch === '\n' || i === len - 1) {
        if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          const stmt = text.slice(startIdx, i + 1);
          if (!/^import\s+\{[\s\S]*\}\s*$/.test(stmt.trim())) {
            if (ch === '\n') {
              // 不將結尾換行納入 Token，保留原始行結構
              if (text[i - 1] === '\r') i--;
            } else {
              i++;
            }
            break;
          }
        }
      }
      i++;
    }

    const block = text.slice(startIdx, i);
    result += addToken(block, 'opaque');
    lastIndex = i;
    lineStartRegex.lastIndex = i;
  }

  result += text.slice(lastIndex);
  return result;
}

/**
 * 遮蔽單行與多行 HTML / JSX 標籤 (<Tag ...> 或 </Tag>)，支援跨行屬性與 {...} 表達式
 */
function maskHtmlAndJsxTags(text, addToken) {
  const tagStartRegex = /<(?:[A-Za-z/]|>)/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = tagStartRegex.exec(text)) !== null) {
    const startIdx = match.index;
    if (startIdx < lastIndex) continue;

    let i = startIdx + 1;
    let braceDepth = 0;
    let inString = null;
    let foundEnd = false;
    const len = text.length;

    while (i < len) {
      const ch = text[i];

      if (inString) {
        if (ch === '\\' && braceDepth > 0) {
          i += 2;
          continue;
        }
        if (ch === inString) {
          inString = null;
        }
        i++;
        continue;
      }

      // 若在未閉合的標籤外遇到雙換行（空白行），視為非標籤（例如數學小於符號）
      if (ch === '\n' && braceDepth === 0 && /^\r?\n[ \t]*\r?\n/.test(text.slice(i))) {
        break;
      }

      if (ch === '"' || ch === "'" || (braceDepth > 0 && ch === '`')) {
        inString = ch;
        i++;
        continue;
      }

      if (ch === '{') {
        braceDepth++;
        i++;
        continue;
      }

      if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        i++;
        continue;
      }

      if (ch === '>' && braceDepth === 0) {
        foundEnd = true;
        i++;
        break;
      }

      i++;
    }

    if (foundEnd) {
      result += text.slice(lastIndex, startIdx);
      result += addToken(text.slice(startIdx, i), 'opaque');
      lastIndex = i;
      tagStartRegex.lastIndex = i;
    }
  }

  result += text.slice(lastIndex);
  return result;
}

/**
 * 安全格式化 Markdown / MDX 文件
 * 遮蔽所有程式碼、URL、元件標籤後再進行格式化
 */
function formatMarkdownContent(content) {
  let frontmatter = '';
  let body = content;

  // 1. 分離並安全處理 Frontmatter (支援 UTF-8 BOM 與有無引號之欄位)
  const fmMatch = content.match(/^(\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?)/);
  if (fmMatch) {
    frontmatter = fmMatch[0];
    body = content.slice(frontmatter.length);

    // 僅格式化 Frontmatter 中的 title 與 description 欄位，其餘欄位（如 date, tags, slug）完全不碰
    frontmatter = frontmatter.replace(
      /^([ \t]*(?:title|description):[ \t]*)(['"]?)(.+?)\2([ \t]*)$/gm,
      (m, prefix, quote, val, suffix) => {
        if (!quote && (/^[|>][ \t]*$/.test(val) || val.startsWith('#'))) return m;
        return prefix + quote + applyTypographyRules(val) + quote + suffix;
      }
    );
  }

  // 2. 建立 Token 容器以遮蔽受保護的 Markdown / MDX 結構
  // 使用補充私人使用區-A (U+F0000 .. U+FFFFD，可容納 65,534 個 Token，且不與一般圖示字體衝突)
  const TOKEN_BASE = 0xF0000;
  const tokens = [];
  function addToken(str, type = 'opaque') {
    const id = tokens.length;
    tokens.push({ id, str, type });
    return String.fromCodePoint(TOKEN_BASE + id);
  }

  // (1) 圍欄式程式碼區塊 (Fenced Code Blocks: 支援 3 個以上 ``` 或 ~~~)
  let masked = body.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, (m) => addToken(m, 'codeblock'));

  // (2) 行內程式碼 (`code` 或 `` `code` ``) — 必須優先於 KaTeX、HTML 與連結遮蔽，避免反引號內容被拆碎
  masked = masked.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (m) => {
    if (/\r?\n[ \t]*\r?\n/.test(m)) return m;
    return addToken(m, 'inlinecode');
  });

  // (3) HTML 註釋 (<!-- ... -->) 與 MDX 註釋 ({/* ... */})
  masked = masked.replace(/<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\}/g, (m) => addToken(m, 'opaque'));

  // (4) MDX import 與 export 語句 (含多行 export const 元件區塊)
  masked = maskMdxImportsAndExports(masked, addToken);

  // (5) KaTeX 數學公式 ($$ ... $$ 與 $ ... $，排除一般金錢數字如 $100)
  masked = masked.replace(/(\$\$[\s\S]*?\$\$|\$(?!\s)(?:[^$\r\n]*?\S)\$(?![0-9]))/g, (m) => addToken(m, 'opaque'));

  // (6) Markdown 腳註標記 ([^1], [^note])
  masked = masked.replace(/\[\^[^\]]+\]/g, (m) => addToken(m, 'opaque'));

  // (7) Markdown 任務清單核取方塊 (- [ ] 或 - [x]) — 保留原始勾選狀態字元
  masked = masked.replace(/^(\s*[-*+]\s+\[)([ xX])(\]\s+)/gm, (m, p1, check, p2) => p1 + addToken(check, 'opaque') + p2);

  // (8) HTML / JSX 標籤 (<tag ...> 或 </tag>，支援多行屬性)
  masked = maskHtmlAndJsxTags(masked, addToken);

  // (9) Markdown 圖片標籤全部保護 (![alt](url)，支援含括號之 URL)
  masked = masked.replace(/!\[[^\]]*\]\((?:[^()\r\n]|\([^()\r\n]*\))+\)/g, (m) => addToken(m, 'opaque'));

  // (10) Markdown 連結目標 URL ([link text](url) -> 僅保護 (url)，保留 [link text] 可被格式化，支援含括號之 URL)
  masked = masked.replace(/(\[[^\]]+\])(\((?:[^()\r\n]|\([^()\r\n]*\))+\))/g, (match, linkText, urlPart) => {
    return linkText + addToken(urlPart, 'linkurl');
  });

  // (11) Markdown 參照式連結定義 ([ref]: url)
  masked = masked.replace(/^\[[^\]]+\]:\s*\S+.*$/gm, (m) => addToken(m, 'opaque'));

  // (12) 裸露網址 (https://... 或 http://...)
  masked = masked.replace(/https?:\/\/[^\s)\]>"'<>]+/g, (m) => addToken(m, 'opaque'));

  // (13) Docusaurus 特殊容器提示語法 (:::note, :::tip, ::: 等)
  masked = masked.replace(/^:::[a-zA-Z0-9_\-]*(?:\[[^\]\r\n]*\])?\s*$/gm, (m) => addToken(m, 'opaque'));

  // (14) HTML 實體字元 (&nbsp;, &quot;, &#x20; 等)
  masked = masked.replace(/&[a-zA-Z0-9#]+;/g, (m) => addToken(m, 'opaque'));

  // 3. 套用主要中西文排版規則
  masked = applyTypographyRules(masked);

  // 4. 特殊處理：行內程式碼 (`code`) 與中文之排版間距
  const inlineCodeTokens = tokens
    .filter(t => t.type === 'inlinecode')
    .map(t => String.fromCodePoint(TOKEN_BASE + t.id));

  if (inlineCodeTokens.length > 0) {
    const inlineCodeSet = new Set(inlineCodeTokens);

    // 中文與行內程式碼之間補空格
    masked = masked.replace(new RegExp(`(${HAN})([\\u{F0000}-\\u{FFFFD}])`, 'gu'), (m, cjk, tok) => {
      return inlineCodeSet.has(tok) ? `${cjk} ${tok}` : m;
    });
    masked = masked.replace(new RegExp(`([\\u{F0000}-\\u{FFFFD}])(${HAN})`, 'gu'), (m, tok, cjk) => {
      return inlineCodeSet.has(tok) ? `${tok} ${cjk}` : m;
    });

    // 數字與行內程式碼之間補空格
    masked = masked.replace(/([0-9])([\u{F0000}-\u{FFFFD}])/gu, (m, num, tok) => {
      return inlineCodeSet.has(tok) ? `${num} ${tok}` : m;
    });
    masked = masked.replace(/([\u{F0000}-\u{FFFFD}])([0-9])/gu, (m, tok, num) => {
      return inlineCodeSet.has(tok) ? `${tok} ${num}` : m;
    });

    // 若行內程式碼緊鄰全形標點符號，則標點前/後不加空格
    masked = masked.replace(/([\u{F0000}-\u{FFFFD}])\x20+([，。！？；：、\u4E36）］」』》〉】])/gu, (m, tok, punc) => {
      return inlineCodeSet.has(tok) ? `${tok}${punc}` : m;
    });
    masked = masked.replace(/([（［「『《〈【])\x20+([\u{F0000}-\u{FFFFD}])/gu, (m, punc, tok) => {
      return inlineCodeSet.has(tok) ? `${punc}${tok}` : m;
    });
  }

  // 5. 反向還原被遮蔽的區塊
  let unmasked = masked;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tokenChar = String.fromCodePoint(TOKEN_BASE + i);
    unmasked = unmasked.replace(tokenChar, () => tokens[i].str);
  }

  return frontmatter + unmasked;
}

// ==========================================
// 3. 檔案遍歷與執行 (File Walker & Runner)
// ==========================================

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const stats = fs.statSync(dir);
  if (stats.isFile()) {
    if (dir.endsWith('.md') || dir.endsWith('.mdx')) {
      results.push(dir);
    }
    return results;
  }
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item === '.docusaurus' || item === '.git' || item === 'build') {
      continue;
    }
    const fullPath = path.join(dir, item);
    const itemStat = fs.statSync(fullPath);
    if (itemStat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (fullPath.endsWith('.md') || fullPath.endsWith('.mdx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getGitChangedFiles() {
  try {
    const output = execSync('git -c core.quotePath=false status --porcelain -u', {
      cwd: WORKSPACE,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const allowedDirs = DEFAULT_TARGET_DIRS.map(d => path.resolve(WORKSPACE, d) + path.sep);
    const files = [];
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const status = line.slice(0, 2);
      if (status.includes('D')) continue; // 忽略已刪除檔案
      let p = line.slice(3).trim();
      if (p.includes(' -> ')) p = p.split(' -> ')[1].trim();
      p = p.replace(/^"|"$/g, '');
      const full = path.resolve(WORKSPACE, p);
      if (
        fs.existsSync(full) &&
        (p.endsWith('.md') || p.endsWith('.mdx')) &&
        allowedDirs.some(dirPrefix => full.startsWith(dirPrefix))
      ) {
        files.push(full);
      }
    }
    return Array.from(new Set(files));
  } catch (e) {
    console.warn(`${colors.yellow}⚠️ 無法讀取 Git 變更狀態。${colors.reset}`);
    return [];
  }
}

function resolveTargetFiles() {
  if (CHANGED_ONLY) {
    return getGitChangedFiles();
  }

  if (customTargets.length === 0) {
    let allFiles = [];
    for (const t of DEFAULT_TARGET_DIRS) {
      allFiles = allFiles.concat(walkDir(path.join(WORKSPACE, t)));
    }
    return Array.from(new Set(allFiles));
  }

  let allFiles = [];
  const defaultFiles = [];
  let defaultFilesLoaded = false;

  for (const t of customTargets) {
    const full = path.isAbsolute(t) ? t : path.join(WORKSPACE, t);
    if (fs.existsSync(full)) {
      allFiles = allFiles.concat(walkDir(full));
    } else {
      // 若非明確路徑，則作為關鍵字或年份前綴過濾（例如: '2026'、'blog/2026'、'chess'）
      if (!defaultFilesLoaded) {
        for (const dir of DEFAULT_TARGET_DIRS) {
          defaultFiles.push(...walkDir(path.join(WORKSPACE, dir)));
        }
        defaultFilesLoaded = true;
      }
      const normalizedTarget = t.replace(/\\/g, '/');
      const matched = defaultFiles.filter(f => {
        const rel = path.relative(WORKSPACE, f).replace(/\\/g, '/');
        return rel.includes(normalizedTarget);
      });
      allFiles = allFiles.concat(matched);
    }
  }

  // 去除重複路徑並標準化
  return Array.from(new Set(allFiles));
}

function main() {
  const files = resolveTargetFiles();

  if (files.length === 0) {
    if (CHANGED_ONLY) {
      console.log(`\n${colors.green}✔ 未偵測到任何有變動的 Markdown / MDX 檔案，跳過排版檢查。${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️ 未找到任何 Markdown / MDX 檔案。${colors.reset}`);
    }
    process.exit(0);
  }

  const modeText = AUTO_FIX ? '自動修復模式' : '檢查模式';
  const targetScopeText = CHANGED_ONLY ? ' (僅限本次 Git 變動檔案)' : '';
  console.log(`\n${colors.bold}🔍 開始檢查中文文案排版格式 (${modeText}${targetScopeText})...${colors.reset}`);
  console.log(`${colors.dim}目標檔案數量: ${files.length}${colors.reset}\n`);

  let totalFilesWithIssues = 0;
  let totalIssuesCount = 0;
  let fixedFilesCount = 0;

  for (const file of files) {
    const relativePath = path.relative(WORKSPACE, file);
    let originalContent;
    try {
      originalContent = fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`${colors.red}無法讀取檔案: ${relativePath}${colors.reset}`);
      continue;
    }

    const formattedContent = formatMarkdownContent(originalContent);

    if (originalContent !== formattedContent) {
      totalFilesWithIssues++;

      const origLines = originalContent.split(/\r?\n/);
      const fixedLines = formattedContent.split(/\r?\n/);

      const fileDiffs = [];
      for (let i = 0; i < origLines.length; i++) {
        if (origLines[i] !== fixedLines[i]) {
          fileDiffs.push({
            lineNumber: i + 1,
            orig: origLines[i],
            fixed: fixedLines[i],
          });
        }
      }

      totalIssuesCount += fileDiffs.length;

      // 終端機輸出
      if (FILES_ONLY) {
        console.log(`  ${colors.cyan}${relativePath}${colors.reset} ${colors.gray}(${fileDiffs.length} 處待修正)${colors.reset}`);
      } else if (!SUMMARY_ONLY) {
        console.log(`${colors.cyan}${relativePath}${colors.reset} ${colors.gray}(${fileDiffs.length} 處待修正)${colors.reset}`);
        for (const diff of fileDiffs) {
          let displayOrig = diff.orig;
          let displayFixed = diff.fixed;

          // 若包含行尾多餘空白，將隱藏的空白鍵可視化
          if (/\x20+$/.test(displayOrig)) {
            displayOrig = displayOrig.replace(/\x20+$/, m => `${colors.yellow}␣`.repeat(m.length) + ` ${colors.dim}(清除行尾空白)${colors.reset}`);
          }

          console.log(`  ${colors.dim}第 ${diff.lineNumber} 行:${colors.reset}`);
          console.log(`    ${colors.red}- ${displayOrig}${colors.reset}`);
          console.log(`    ${colors.green}+ ${displayFixed}${colors.reset}`);
        }
        console.log('');
      }

      // 若啟用了 --fix，則將修正後的內容寫回檔案
      if (AUTO_FIX) {
        try {
          fs.writeFileSync(file, formattedContent, 'utf8');
          fixedFilesCount++;
        } catch (err) {
          console.error(`${colors.red}寫入檔案失敗: ${relativePath} (${err.message})${colors.reset}`);
        }
      }
    }
  }

  // 印出統計總結
  console.log(`${colors.bold}========================================${colors.reset}`);
  console.log(`${colors.bold}📊 排版檢查統計結果${colors.reset}`);
  console.log(`- 掃描檔案總數: ${files.length}`);
  console.log(`- 符合規範檔案: ${colors.green}${files.length - totalFilesWithIssues}${colors.reset}`);
  console.log(`- 需修正的檔案: ${totalFilesWithIssues > 0 ? colors.yellow + totalFilesWithIssues + colors.reset : '0'}`);
  console.log(`- 累計排版問題: ${totalIssuesCount > 0 ? colors.red + totalIssuesCount + colors.reset : '0'} 處`);

  if (AUTO_FIX) {
    console.log(`- ${colors.green}✔ 已成功修復 ${fixedFilesCount} 個檔案！${colors.reset}`);
    console.log(`${colors.bold}========================================\n${colors.reset}`);
    process.exit(0);
  } else {
    if (totalFilesWithIssues > 0) {
      console.log(`\n${colors.yellow}💡 提示：您可以執行下列指令進行一鍵自動修復：${colors.reset}`);
      if (CHANGED_ONLY) {
        console.log(`   ${colors.bold}npm run fix${colors.reset}`);
      } else {
        console.log(`   ${colors.bold}npm run fix:all${colors.reset}`);
      }
      console.log(`${colors.bold}========================================\n${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}🎉 太棒了！所有文章皆完全符合中文文案排版規範！${colors.reset}`);
      console.log(`${colors.bold}========================================\n${colors.reset}`);
      process.exit(0);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  applyTypographyRules,
  formatMarkdownContent,
};
