import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useHistory, useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function SearchBar() {
  const history = useHistory();
  const location = useLocation();
  const searchIndexUrl = useBaseUrl('/search-index.json');

  const [inputVal, setInputVal] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [indexData, setIndexData] = useState([]);
  const [modifierKey, setModifierKey] = useState('ctrl');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const hasFetchedRef = useRef(false);

  // 1. 檢測作業系統修飾鍵 (Mac 顯示 ⌘)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || '')) {
      setModifierKey('⌘');
    }
  }, []);

  // 2. 載入索引檔 (初次 focus 或有輸入時觸發)
  const loadIndex = () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetch(searchIndexUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => setIndexData(data))
      .catch((err) => console.error('無法載入搜尋索引:', err));
  };

  // 3. 全域快捷鍵監聽
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isSearchShortcut = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');
      const isSlashShortcut = e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

      if (isSearchShortcut || isSlashShortcut) {
        e.preventDefault();
        loadIndex();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 4. 點擊外部自動收合下拉選單
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 5. 換頁時收起選單
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // 6. 關鍵字快搜比對與排序
  const keywords = useMemo(() => {
    return inputVal
      .toLowerCase()
      .split(/\s+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [inputVal]);

  const searchResults = useMemo(() => {
    if (keywords.length === 0 || indexData.length === 0) return [];

    const matched = [];
    for (const article of indexData) {
      const titleLower = (article.title || '').toLowerCase();
      const contentLower = (article.content || '').toLowerCase();
      const fullText = `${titleLower} ${contentLower}`;

      if (keywords.every((kw) => fullText.includes(kw))) {
        // 計算優先級：標題有匹配者優先
        const inTitle = keywords.some((kw) => titleLower.includes(kw));
        matched.push({
          ...article,
          inTitle,
        });
      }
    }

    // 排序：標題符合者在前，接著日期由新到舊
    matched.sort((a, b) => {
      if (a.inTitle && !b.inTitle) return -1;
      if (!a.inTitle && b.inTitle) return 1;
      return (b.date || '').localeCompare(a.date || '');
    });

    return matched.slice(0, 5);
  }, [keywords, indexData]);

  // 7. 前後文摘要與高亮
  const renderSnippet = (content) => {
    if (!content) return '';
    if (keywords.length === 0) return content.slice(0, 100);

    const lower = content.toLowerCase();
    let firstPos = -1;
    for (const kw of keywords) {
      const pos = lower.indexOf(kw);
      if (pos !== -1 && (firstPos === -1 || pos < firstPos)) {
        firstPos = pos;
      }
    }

    const start = Math.max(0, firstPos - 30);
    const end = Math.min(content.length, start + 120);
    let snippet = content.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < content.length) snippet = snippet + '…';

    const escaped = keywords.map(escapeRegExp).filter(Boolean);
    if (escaped.length === 0) return snippet;

    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    return snippet.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className={styles.highlight}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // 8. 導航至完整搜尋頁
  const goToSearchPage = (customQuery) => {
    const q = (customQuery !== undefined ? customQuery : inputVal).trim();
    setIsOpen(false);
    if (q) {
      history.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      history.push('/search');
    }
  };

  // 9. 鍵盤事件處理 (上下移動與 Enter)
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter') {
        goToSearchPage();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > -1 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < searchResults.length) {
        const target = searchResults[activeIndex];
        setIsOpen(false);
        history.push(target.url);
      } else {
        goToSearchPage();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInputVal('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div className={styles.searchBarWrapper} onClick={() => inputRef.current?.focus()}>
        <svg
          className={styles.searchIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder="Search"
          value={inputVal}
          onFocus={() => {
            loadIndex();
            setIsOpen(true);
          }}
          onChange={(e) => {
            setInputVal(e.target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        {inputVal ? (
          <button type="button" className={styles.clearButton} onClick={handleClear} aria-label="Clear">
            ✕
          </button>
        ) : (
          <div className={styles.keysContainer}>
            <kbd className={styles.keyBadge}>{modifierKey}</kbd>
            <kbd className={styles.keyBadge}>K</kbd>
          </div>
        )}
      </div>

      {/* 搜尋結果下拉選單 */}
      {isOpen && inputVal.trim() && (
        <div className={styles.dropdown}>
          {searchResults.length > 0 ? (
            <>
              {searchResults.map((item, index) => (
                <div
                  key={item.id}
                  className={`${styles.dropdownItem} ${activeIndex === index ? styles.dropdownItemActive : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    setIsOpen(false);
                    history.push(item.url);
                  }}
                >
                  <div className={styles.itemHeader}>
                    <h4 className={styles.itemTitle}>{item.title}</h4>
                    <span className={styles.itemMeta}>
                      {item.type}
                      {item.date ? ` · ${item.date}` : ''}
                    </span>
                  </div>
                  <p className={styles.itemSnippet}>{renderSnippet(item.content)}</p>
                </div>
              ))}

              <div
                className={styles.dropdownFooter}
                onClick={() => goToSearchPage()}
              >
                看全部結果 ( Enter )
              </div>
            </>
          ) : (
            <div className={styles.noResult}>
              找不到包含「<strong>{inputVal}</strong>」的內容
            </div>
          )}
        </div>
      )}
    </div>
  );
}
