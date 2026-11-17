// 發佈時間戳記：只在 npm run push 提交前執行，build / start 不會改寫任何 md。
//
//  1. 新文章（這次提交新增的 blog/、photoblog/ md）若沒有 rss_date，補上「上線時間」：
//     - 一般情況：push 當下的台灣時間
//     - 文章日期在未來：該日 00:00:01（避免 RSS 時間早於文章日期）
//     - date 帶有時間（例如 Front Matter CMS 產生的 2026-11-14T10:00:00）會改成只留日期，
//       避免 UTC 換算讓文章頁顯示成前一天
//     已提交過的舊文不會被補，修改舊文也不會讓它在 RSS 裡變成新文章。
//     例外：先以 draft: true 提交、這次才拿掉 draft 正式發佈的文章，視同新文章；
//     若 rss_date 已被刪除就補上發佈時間（保留著的 rss_date 不會被改動）。
//  2. src/pages/now.md 內容有改動（與 HEAD 相比，忽略日期行）才把「最後更新」改成今天。
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..');
const NOW_MD = 'src/pages/now.md';
const POST_PATH = /^(blog|photoblog)\/.+\.mdx?$/;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;
const NOW_DATE_LINE = /\*最後更新：\d{4}-\d{2}-\d{2}\*/;

/** 轉成台灣時間（+08:00）的日期與完整時間字串 */
function taiwanTime(date) {
  const iso = new Date(date.getTime() + 8 * 3600 * 1000).toISOString();
  return { day: iso.slice(0, 10), full: `${iso.slice(0, 19)}+08:00` };
}

/**
 * 替單篇文章內容補上 rss_date。
 * @returns {{content: string, rssDate: string} | null} 不需要修改時回傳 null
 */
function stampPostContent(content, { folderName = '', now = new Date() } = {}) {
  const fmMatch = content.match(FRONT_MATTER);
  if (!fmMatch) return null;
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = fmMatch[1].split(/\r?\n/);
  if (lines.some((l) => /^rss_date:/.test(l))) return null;

  let datePart = (folderName.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
  const dateIdx = lines.findIndex((l) => /^date:/.test(l));
  if (dateIdx >= 0) {
    const raw = lines[dateIdx].replace(/^date:\s*/, '').trim().replace(/^['"]|['"]$/g, '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      datePart = raw;
    } else {
      const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
      const parsed = new Date(raw.replace(' ', 'T'));
      if (Number.isNaN(parsed.getTime())) throw new Error(`無法解析 date：${raw}`);
      // 有時區就換算成台灣日期；沒有時區的時間本來就是台灣時間，直接取日期
      datePart = hasZone ? taiwanTime(parsed).day : raw.slice(0, 10);
      lines[dateIdx] = `date: ${datePart}`;
    }
  }

  const nowTw = taiwanTime(now);
  const rssDate = datePart && datePart > nowTw.day ? `${datePart}T00:00:01+08:00` : nowTw.full;
  const rssLine = `rss_date: '${rssDate}'`;
  if (dateIdx >= 0) lines.splice(dateIdx + 1, 0, rssLine);
  else lines.push(rssLine);

  const newHead = `---${eol}${lines.join(eol)}${eol}---${fmMatch[2]}`;
  return { content: newHead + content.slice(fmMatch[0].length), rssDate };
}

/** frontmatter 是否為 draft: true（沒有 frontmatter 或內容為 null 時回傳 false） */
function isDraft(content) {
  const fmMatch = content == null ? null : content.match(FRONT_MATTER);
  if (!fmMatch) return false;
  return fmMatch[1].split(/\r?\n/).some((l) => /^draft:\s*['"]?true['"]?\s*$/.test(l));
}

/** HEAD 版本是草稿、目前版本不是草稿 → 這次是正式發佈 */
function isDraftPublished(current, committed) {
  return isDraft(committed) && !isDraft(current);
}

/**
 * now.md 內容有改動才更新「最後更新」日期。
 * @returns {string | null} 更新後內容；不需更新時回傳 null
 */
function stampNowContent(current, committed, { now = new Date() } = {}) {
  if (committed == null) return null;
  const strip = (t) => t.replace(/\r\n/g, '\n').replace(NOW_DATE_LINE, '');
  if (strip(committed) === strip(current)) return null;
  const updated = current.replace(NOW_DATE_LINE, `*最後更新：${taiwanTime(now).day}*`);
  return updated === current ? null : updated;
}

/**
 * 依暫存區內容蓋上發佈時間，回傳被修改的檔案（相對路徑）。
 * @param {{addedFiles: string[], changedFiles: string[], now?: Date, root?: string}} opts
 */
function stampBeforeCommit({ addedFiles, changedFiles, now = new Date(), root = ROOT_DIR }) {
  const touched = [];
  const headContent = (rel) => {
    const res = spawnSync('git', ['show', `HEAD:${rel}`], { cwd: root, encoding: 'utf8' });
    return res.status === 0 ? res.stdout : null;
  };

  const added = new Set(addedFiles);
  for (const rel of changedFiles.concat(addedFiles).filter((f) => POST_PATH.test(f))) {
    if (touched.some((t) => t.file === rel)) continue;
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    // 修改的舊文只有「草稿轉正式發佈」才補
    const fromDraft = !added.has(rel) && isDraftPublished(content, headContent(rel));
    if (!added.has(rel) && !fromDraft) continue;
    const folderName = path.basename(path.dirname(abs));
    const result = stampPostContent(content, { folderName, now });
    if (result) {
      fs.writeFileSync(abs, result.content, 'utf8');
      touched.push({ file: rel, note: `rss_date ${result.rssDate}${fromDraft ? '，草稿轉發佈' : ''}` });
    }
  }

  if (changedFiles.includes(NOW_MD)) {
    const abs = path.join(root, NOW_MD);
    const updated = stampNowContent(fs.readFileSync(abs, 'utf8'), headContent(NOW_MD), { now });
    if (updated) {
      fs.writeFileSync(abs, updated, 'utf8');
      touched.push({ file: NOW_MD, note: `最後更新 ${taiwanTime(now).day}` });
    }
  }

  return touched;
}

module.exports = {
  stampBeforeCommit,
  stampPostContent,
  stampNowContent,
  isDraftPublished,
  taiwanTime,
};
