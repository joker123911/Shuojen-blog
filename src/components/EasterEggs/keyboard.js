/** 把按鍵轉成比對用的代號；輸入法攔截時（key 為 Process）改看實體按鍵位置 */
export function keyName(e) {
  if (e.key && e.key.startsWith('Arrow')) return e.key;
  if (e.key && e.key.length === 1) return e.key.toLowerCase();
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  return e.key;
}

/** 焦點在可輸入的元素上時，不攔截按鍵 */
export function isEditable(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/** 是否按著 Ctrl、Cmd、Alt 等修飾鍵（這些組合留給瀏覽器與網站原本的快捷鍵） */
export function hasModifier(e) {
  return e.ctrlKey || e.metaKey || e.altKey;
}
