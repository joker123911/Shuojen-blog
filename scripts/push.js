// 提交並推送部落格變更。
//
// 只 stage 下列白名單路徑，避免 scratch/、暫存截圖、.env 之類的檔案被誤提交。
// 白名單外的變更會列出來提醒，但不會被提交；需要時請手動 git add。
//
// 用法：
//   npm run push         檢查 → 完整建置 → 提交 → 推送
//   npm run push:fast    跳過建置（只做檢查與資料生成）
//   node scripts/push.js -m "訊息"   直接指定 commit 訊息
const fs = require('fs');
const { spawnSync } = require('child_process');
const readline = require('readline');

const STAGE_PATHS = [
  'blog',
  'photoblog',
  'docs',
  'src',
  'static',
  'scripts',
  '.github',
  'docusaurus.config.js',
  'sidebars.js',
  'package.json',
  'package-lock.json',
  'frontmatter.json',
  '.frontmatter',
  '.gitignore',
  '.gitattributes',
  '.node-version',
];

function git(args, { capture = false } = {}) {
  const res = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (res.status !== 0) {
    console.error(`❌ git ${args.join(' ')} 失敗（代碼 ${res.status}）`);
    process.exit(res.status || 1);
  }
  return capture ? res.stdout : '';
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function isWhitelisted(file) {
  return STAGE_PATHS.some((p) => file === p || file.startsWith(p + '/'));
}

// git status --porcelain=v1 -z：每筆為 "XY path"，rename 時後面多一筆原路徑
function listChanges() {
  const out = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], { capture: true });
  const entries = out.split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i < entries.length; i++) {
    const status = entries[i].slice(0, 2);
    files.push({ status, path: entries[i].slice(3) });
    if (status[0] === 'R' || status[0] === 'C') i++;
  }
  return files;
}

async function main() {
  const msgFlag = process.argv.indexOf('-m');
  let message = msgFlag !== -1 ? (process.argv[msgFlag + 1] || '').trim() : '';

  const changes = listChanges();
  // 已經手動 stage 的檔案會照常提交（下方「即將提交」清單會列出），這裡只提醒還沒 stage 的
  const outside = changes.filter(
    (c) => !isWhitelisted(c.path) && (c.status[0] === ' ' || c.status[0] === '?')
  );

  if (outside.length > 0) {
    console.log('\n⚠️  以下變更不在白名單內，這次不會提交：');
    for (const c of outside) console.log(`   ${c.status} ${c.path}`);
  }

  git(['add', '-A', '--', ...STAGE_PATHS.filter((p) => fs.existsSync(p) || isTracked(p))]);

  const staged = git(['diff', '--cached', '--name-status'], { capture: true }).trim();
  if (!staged) {
    console.log('\nℹ️  白名單內沒有可提交的變更，結束。');
    return;
  }

  console.log('\n📋 即將提交：');
  console.log(staged.split('\n').map((l) => '   ' + l).join('\n'));

  if (!message) message = await ask('\n輸入 commit 訊息（留空取消）：');
  if (!message) {
    console.log('已取消。變更仍在暫存區，可用 git restore --staged . 撤銷。');
    process.exit(1);
  }

  git(['commit', '-m', message]);
  git(['push']);
  console.log('\n✅ 推送完成！');
}

function isTracked(p) {
  const res = spawnSync('git', ['ls-files', '--error-unmatch', p], { stdio: 'ignore' });
  return res.status === 0;
}

main();
