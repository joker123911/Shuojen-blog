// 建置時自動補 SEO 欄位（不改動 .md 檔）：
//  - frontmatter 缺 description → 取內文第一段有文字的段落，截 80 字
//  - frontmatter 缺 image       → 取內文第一張相對路徑圖片
//  - 圖片 alt 為 "img"（markdown 或 <img>）→ 改為「文章標題 圖 N」
// 手寫的 frontmatter 一律優先。

const MAX_DESC = 80;

function stripInline(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDescription(content) {
  const text = content
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '\n')
    .replace(/^(import|export)\s.*$/gm, '\n');
  for (const block of text.split(/\n\s*\n/)) {
    const t = block.trim();
    // 跳過 JSX / admonition / 表格 / 分隔線 / 純圖片區塊
    if (!t || /^(<|:::|\||---|\{)/.test(t)) continue;
    const plain = stripInline(t);
    if (plain.length < 4) continue;
    return plain.length > MAX_DESC ? `${plain.slice(0, MAX_DESC)}…` : plain;
  }
  return undefined;
}

function extractImage(content) {
  const m = content.match(/!\[[^\]]*\]\((\.\/[^)\s]+)\)/);
  return m ? m[1] : undefined;
}

/** 在 parseFrontMatter 內呼叫 */
function fillSeoFrontMatter(result) {
  const fm = result.frontMatter;
  const content = result.content || '';
  if (!fm.description) {
    const d = extractDescription(content);
    if (d) fm.description = d;
  }
  if (!fm.image) {
    const img = extractImage(content);
    if (img) fm.image = img;
  }
}

/** remark plugin：把 alt 為 "img" 的圖片補上有意義的 alt */
function remarkAutoAlt() {
  return (tree, file) => {
    const title = file?.data?.frontMatter?.title;
    if (!title) return;
    let n = 0;
    const walk = (node) => {
      if (node.type === 'image') {
        n += 1;
        if (!node.alt || node.alt.trim() === 'img') node.alt = `${title} 圖 ${n}`;
      } else if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        node.name === 'img'
      ) {
        // 手寫的 <img alt="img" />：與 markdown 圖片共用同一組編號
        n += 1;
        const attr = (node.attributes || []).find(
          (a) => a.type === 'mdxJsxAttribute' && a.name === 'alt',
        );
        if (attr && typeof attr.value === 'string' && attr.value.trim() === 'img') {
          attr.value = `${title} 圖 ${n}`;
        }
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
  };
}

module.exports = {fillSeoFrontMatter, remarkAutoAlt, extractDescription, extractImage};
