const fs = require('fs');
const path = require('path');

const OPML_FILE = path.join(__dirname, '../src/data/subscriptions.opml');
const OUTPUT_FILE = path.join(__dirname, '../src/data/blogrollData.js');

function decodeEntities(encodedString) {
  if (!encodedString) return '';
  return encodedString
    .replace(/&#13;/g, '')
    .replace(/&#10;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function isMyBlog(title, url, xmlUrl) {
  const t = (title || '').toLowerCase();
  const u = (url || '').toLowerCase();
  const x = (xmlUrl || '').toLowerCase();
  return u.includes('shuojen.com') || x.includes('shuojen.com') || t.includes('shuo-jen');
}

const strokeCollator = new Intl.Collator('zh-Hant-TW-u-co-stroke', { numeric: true, sensitivity: 'base' });
const asciiCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function isChinese(str) {
  return /^[\u4e00-\u9fa5\u3400-\u4dbf]/.test(str);
}

function sortBlogroll(a, b) {
  const isA = isChinese(a.title);
  const isB = isChinese(b.title);

  if (!isA && isB) return -1;
  if (isA && !isB) return 1;
  if (!isA && !isB) return asciiCollator.compare(a.title, b.title);
  return strokeCollator.compare(a.title, b.title);
}

function parseOpml() {
  if (!fs.existsSync(OPML_FILE)) {
    console.error(`❌ 找不到 OPML 檔案: ${OPML_FILE}`);
    return;
  }

  const content = fs.readFileSync(OPML_FILE, 'utf8');
  const blogroll = [];

  const tokenRegex = /<\/?outline\b[^>]*>/gi;
  const attrRegex = /([a-zA-Z:]+)="([^"]*)"/g;

  let stack = [];
  let tokenMatch;

  while ((tokenMatch = tokenRegex.exec(content)) !== null) {
    const fullTag = tokenMatch[0];

    if (fullTag.startsWith('</') || fullTag.startsWith('</outline')) {
      if (stack.length > 0) stack.pop();
    } else {
      const attrs = {};
      let attrMatch;
      while ((attrMatch = attrRegex.exec(fullTag)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      const isSelfClosing = fullTag.endsWith('/>');
      const isRss = attrs.type === 'rss' || attrs.xmlUrl;

      if (isRss) {
        const rawTitle = decodeEntities(attrs.text || attrs.title || '無標題');
        let url = attrs.htmlUrl || '';
        if (!url && attrs.xmlUrl) {
          url = attrs.xmlUrl.replace(/\/feed\/?.*$/, '').replace(/\/rss\.xml.*$/, '').replace(/\/index\.xml.*$/, '').replace(/\/atom\.xml.*$/, '');
        }

        const xmlUrl = attrs.xmlUrl || '';
        const description = decodeEntities(attrs.description || '');

        // 過濾掉作者自己的網站 (my blog)
        if (!isMyBlog(rawTitle, url, xmlUrl)) {
          blogroll.push({
            title: rawTitle,
            url: url || '#',
            xmlUrl: xmlUrl,
            description: description
          });
        }
      } else {
        if (!isSelfClosing) {
          stack.push({ text: attrs.text || attrs.title || '分類' });
        }
      }
    }
  }

  // 排序：英/數字 A-Z 在前，中文筆劃少到多在後
  blogroll.sort(sortBlogroll);

  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileContent = `// 本檔案由 parse-opml.js 自動生成，請勿手動修改\nexport const blogrollLinks = ${JSON.stringify(blogroll, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf8');

  console.log('--------------------------------------------------');
  console.log(`✅ 部落卷 OPML 資料解析完成！`);
  console.log(`📝 共處理 ${blogroll.length} 個訂閱網站（已過濾自己的 Blog，並完成 A-Z + 筆畫排序）`);
  console.log(`輸出路徑：${OUTPUT_FILE}`);
  console.log('--------------------------------------------------');
}

parseOpml();
