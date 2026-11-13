const assert = require('assert/strict');
// 執行：npm test
const { stampPostContent, stampNowContent } = require('./publish-stamp');

// 2026-11-14 10:30:00 台灣時間
const now = new Date('2026-11-14T02:30:00Z');
const PUSH = "rss_date: '2026-11-14T10:30:00+08:00'";

// 1. new-post 產生的 blog 文章（只有日期）→ 補 push 時間，插在 date 後面
let r = stampPostContent("---\ntitle: 'A'\ntags: [\"life\"]\ndate: 2026-11-14\n---\n\n內文\n", { now });
assert.equal(r.content, "---\ntitle: 'A'\ntags: [\"life\"]\ndate: 2026-11-14\n" + PUSH + "\n---\n\n內文\n");

// 2. 寫好幾天才發：date 是前天，rss_date 仍是 push 時間
r = stampPostContent('---\ntitle: A\ndate: 2026-11-12\n---\nx', { now });
assert.ok(r.content.includes('date: 2026-11-12\n' + PUSH));

// 3. Front Matter CMS 帶時間的 date → date 只留日期（不帶時區視為台灣時間）
r = stampPostContent('---\ntitle: A\ndate: 2026-11-14T01:15:00\n---\nx', { now });
assert.ok(r.content.includes('date: 2026-11-14\n' + PUSH));
// 帶時區：台灣 11/14 01:15 = UTC 11/13 17:15，日期要是 11/14
r = stampPostContent("---\ntitle: A\ndate: '2026-11-13T17:15:00.000Z'\n---\nx", { now });
assert.ok(r.content.includes('date: 2026-11-14\n' + PUSH));

// 4. 未來日期 → 該日 00:00:01
r = stampPostContent('---\ntitle: A\ndate: 2026-12-25\n---\nx', { now });
assert.ok(r.content.includes("date: 2026-12-25\nrss_date: '2026-12-25T00:00:01+08:00'"));

// 5. 攝影集（沒有 date，日期來自資料夾名）→ rss_date 加在 frontmatter 最後
r = stampPostContent("---\ntitle: '小琉球'\ntags: [\"trip\"]\n---\n\n![img](./001.webp)\n", { now, folderName: '2026-11-14-trip' });
assert.equal(r.content, "---\ntitle: '小琉球'\ntags: [\"trip\"]\n" + PUSH + "\n---\n\n![img](./001.webp)\n");

// 6. 已有 rss_date → 不動
assert.equal(stampPostContent("---\ntitle: A\ndate: 2026-11-14\nrss_date: '2026-11-14T08:00:00+08:00'\n---\nx", { now }), null);

// 7. CRLF 檔案保持 CRLF，內文含 $ 也不受影響
r = stampPostContent('---\r\ntitle: A\r\ndate: 2026-11-14\r\n---\r\n$$x$$ 與 $&\r\n', { now });
assert.equal(r.content, '---\r\ntitle: A\r\ndate: 2026-11-14\r\n' + PUSH + '\r\n---\r\n$$x$$ 與 $&\r\n');

// 8. 沒有 frontmatter → 不動；date 無法解析 → 丟錯擋下提交
assert.equal(stampPostContent('沒有 frontmatter', { now }), null);
assert.throws(() => stampPostContent('---\ndate: 某天\n---\n', { now }), /無法解析 date/);

// 9. now.md：只改日期行 → 不更新；內容有改 → 更新成今天；HEAD 沒有 → 不動
const nowMd = (body, d = '2026-11-11') => `# 近況\n\n*最後更新：${d}*\n\n${body}\n`;
assert.equal(stampNowContent(nowMd('一樣', '2026-11-12'), nowMd('一樣'), { now }), null);
assert.equal(stampNowContent(nowMd('新內容'), nowMd('舊內容'), { now }), nowMd('新內容', '2026-11-14'));
assert.equal(stampNowContent(nowMd('新內容'), null, { now }), null);

console.log('發佈時間戳記測試全部通過（11 組情境）');
