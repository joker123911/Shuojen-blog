const assert = require('assert/strict');
// 執行：npm test
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { stampPostContent, stampNowContent, isDraftPublished, stampBeforeCommit, addDateLine, frontMatterDay } = require('./publish-stamp');

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

// 10. 草稿轉正式發佈：HEAD 是 draft: true、目前拿掉 draft → 視為發佈；其他情況都不是
const draftPost = "---\ntitle: A\ndate: 2026-11-17\nrss_date: '2026-11-17T00:00:01+08:00'\ndraft: true\n---\nx";
const publishedPost = '---\ntitle: A\ndate: 2026-11-17\n---\nx';
assert.equal(isDraftPublished(publishedPost, draftPost), true);
assert.equal(isDraftPublished(publishedPost.replace(/\n/g, '\r\n'), draftPost.replace(/\n/g, '\r\n')), true);
assert.equal(isDraftPublished(draftPost, draftPost), false); // 還是草稿
assert.equal(isDraftPublished(publishedPost, publishedPost), false); // 本來就不是草稿
assert.equal(isDraftPublished(publishedPost, null), false); // HEAD 沒有這個檔案
assert.equal(isDraftPublished(publishedPost, draftPost.replace('draft: true', 'draft: false')), false);
// 刪掉 rss_date 的草稿轉發佈 → 補 push 時間
r = stampPostContent(publishedPost, { now: new Date('2026-11-17T06:00:00Z') });
assert.ok(r.content.includes("date: 2026-11-17\nrss_date: '2026-11-17T14:00:00+08:00'"));

// 11. addDateLine / frontMatterDay
assert.equal(addDateLine("---\ntitle: A\ndraft: true\n---\nx", '2026-11-20'), "---\ntitle: A\ndraft: true\ndate: 2026-11-20\n---\nx");
assert.equal(frontMatterDay('---\ntitle: A\n---\nx', now), null);
assert.equal(frontMatterDay('---\ndate: 2026-12-25\n---\nx', now), '2026-12-25');

// 12. 沒日期的草稿資料夾：草稿不動；拿掉 draft 發佈 → 資料夾改名、補 date 與 rss_date
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  const g = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, encoding: 'utf8' });
  g('init', '-q');
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const draft = "---\ntitle: A\ntags: [\"life\"]\ndraft: true\n---\nx\n";
  write('blog/my-post/index.md', draft);
  write('blog/my-post/001.webp', 'img');
  write('photoblog/trip/index.md', "---\ntitle: P\ndraft: true\n---\n![img](./001.webp)\n");

  // 新增的草稿 → 不蓋時間、不改名
  assert.deepEqual(stampBeforeCommit({ addedFiles: ['blog/my-post/index.md'], changedFiles: ['blog/my-post/index.md'], now, root }), []);
  g('add', '-A'); g('commit', '-qm', 'draft');

  // blog 草稿轉發佈（沒寫 date）→ 用今天
  write('blog/my-post/index.md', draft.replace('draft: true\n', ''));
  let t = stampBeforeCommit({ addedFiles: [], changedFiles: ['blog/my-post/index.md'], now, root });
  assert.ok(!fs.existsSync(path.join(root, 'blog/my-post')));
  assert.ok(fs.existsSync(path.join(root, 'blog/2026-11-14-my-post/001.webp')));
  assert.equal(fs.readFileSync(path.join(root, 'blog/2026-11-14-my-post/index.md'), 'utf8'),
    "---\ntitle: A\ntags: [\"life\"]\ndate: 2026-11-14\n" + PUSH + "\n---\nx\n");
  assert.deepEqual(t.find((s) => s.removed), { file: 'blog/my-post', to: 'blog/2026-11-14-my-post', removed: true });

  // photoblog 新增（非草稿）、自己寫了未來日期 → 用那天，不加 date 行以外的東西
  write('photoblog/trip/index.md', "---\ntitle: P\ndate: 2026-12-25\n---\nx\n");
  t = stampBeforeCommit({ addedFiles: [], changedFiles: ['photoblog/trip/index.md'], now, root });
  assert.equal(fs.readFileSync(path.join(root, 'photoblog/2026-12-25-trip/index.md'), 'utf8'),
    "---\ntitle: P\ndate: 2026-12-25\nrss_date: '2026-12-25T00:00:01+08:00'\n---\nx\n");
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('發佈時間戳記測試全部通過（24 組情境）');
