import React, { useState, useMemo, useEffect, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

/*
 * 排名清單共用元件（電影、動畫、影集、拉麵、金庸）
 *
 * - 海報列表顯示縮圖（scripts/gen-poster-thumbs.js 產生於 static/poster-thumbs/），
 *   點開燈箱才載入原圖；縮圖不存在時自動改載原圖。
 * - 名次以「目前分類的排序位置」計算，搜尋不會改變名次。
 * - 樣式為 CSS Module，不會影響其他頁面。
 */

const PAGE_SIZE = 100;
const THUMB_W = 70;
const THUMB_H = 102;

// poster 欄位格式為 "./img/movie/xxx.webp"（相對於 docs/）
const posterKey = (poster) => poster.replace(/^\.\//, '').replace(/^img\//, '');
const posterOriginal = (poster) => require(`@site/docs/img/${posterKey(poster)}`).default;
const posterThumb = (baseUrl, poster) =>
  `${baseUrl}poster-thumbs/${posterKey(poster).replace(/\.[^.]+$/, '.webp')}`;

const normalizeTags = (tags) =>
  !tags ? [] : Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean);

function matchesSearch(item, lowerSearch) {
  return (
    item.title.toLowerCase().includes(lowerSearch) ||
    (item.note && item.note.toLowerCase().includes(lowerSearch)) ||
    normalizeTags(item.tags).some((tag) => tag.toLowerCase().includes(lowerSearch))
  );
}

function Poster({ item, baseUrl }) {
  return (
    <img
      src={posterThumb(baseUrl, item.poster)}
      alt=""
      width={THUMB_W}
      height={THUMB_H}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        // 縮圖不存在（例如本機尚未產生）時改載原圖
        const original = posterOriginal(item.poster);
        if (!e.currentTarget.src.endsWith(original)) e.currentTarget.src = original;
      }}
    />
  );
}

function PosterModal({ item, onClose }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
      >
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{item.title}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="關閉" autoFocus>
            ×
          </button>
        </div>
        <div className={`${styles.posterFrame} ${loaded ? styles.loaded : ''}`}>
          <img
            src={posterOriginal(item.poster)}
            alt={item.title}
            className={styles.posterImg}
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array} props.items 全部資料
 * @param {Array<{value: string, label: string}>} props.filterOptions 篩選按鈕
 * @param {(filter: string, items: Array) => Array} props.getList 依篩選回傳「排序後」的清單
 * @param {(item: object, rank: number, filter: string) => string} props.badge 左上角徽章文字
 * @param {(item: object) => string} [props.linkOf] 有值時整張卡片為外部連結（例如 Google 地圖）
 * @param {boolean} [props.showScore] 是否顯示分數
 * @param {string} props.searchPlaceholder
 * @param {string} props.countLabel 例如「收錄電影」
 * @param {string} props.unit 例如「部」「間」
 * @param {string} props.emptyNoun 搜尋無結果時的名詞，例如「電影 🎬」
 */
export default function RankingList({
  items,
  filterOptions,
  getList,
  badge,
  linkOf,
  showScore = false,
  searchPlaceholder,
  countLabel,
  unit,
  emptyNoun,
  initialFilter,
  hideFilterBar = false,
  initialSearch = '',
}) {
  const { siteConfig: { baseUrl } } = useDocusaurusContext();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filter, setFilter] = useState(initialFilter ?? filterOptions[0].value);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeItem, setActiveItem] = useState(null);

  // 目前分類的完整清單（已排序）；名次以此為準，搜尋不影響名次
  const rankedList = useMemo(
    () => getList(filter, items).map((item, i) => ({ item, rank: i + 1 })),
    [getList, filter, items],
  );

  const filtered = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    if (!lowerSearch) return rankedList;
    return rankedList.filter(({ item }) => matchesSearch(item, lowerSearch));
  }, [rankedList, searchTerm]);

  const displayed = filtered.slice(0, visibleCount);
  const isFiltered = filtered.length !== items.length;

  const updateSearch = (value) => {
    setSearchTerm(value);
    setVisibleCount(PAGE_SIZE);
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    updateSearch(''); // 切換分類時清空搜尋，避免找不到東西
  };

  const closeModal = useCallback(() => setActiveItem(null), []);

  return (
    <div className={styles.container}>
      {/* 搜尋列與數量 */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => updateSearch(e.target.value)}
            className={styles.searchInput}
            aria-label={searchPlaceholder}
          />
          {searchTerm && (
            <button className={styles.searchClear} onClick={() => updateSearch('')} aria-label="清除搜尋">
              ×
            </button>
          )}
        </div>
        <div className={styles.countBadge}>
          {isFiltered
            ? `顯示 ${filtered.length} / ${items.length} ${unit}`
            : `${countLabel}：${items.length} ${unit}`}
        </div>
      </div>

      {/* 篩選按鈕 */}
      {!hideFilterBar && (
        <div className={styles.filterBar}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.filterBtn} ${filter === opt.value ? styles.active : ''}`}
              onClick={() => handleFilterChange(opt.value)}
              aria-pressed={filter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className={styles.noResults}>
          <p>找不到符合「{searchTerm}」的{emptyNoun}</p>
        </div>
      )}

      <ul className={styles.list}>
        {displayed.map(({ item, rank }) => {
          const tags = normalizeTags(item.tags);
          const href = linkOf?.(item);
          const hasPoster = Boolean(item.poster);
          const isInteractive = Boolean(href) || hasPoster;
          return (
            <li
              key={`${item.title}-${rank}`}
              className={`${styles.item} ${isInteractive ? styles.interactive : ''}`}
            >
              {hasPoster && (
                <div className={styles.poster}>
                  <Poster item={item} baseUrl={baseUrl} />
                </div>
              )}

              <div className={styles.info}>
                <div className={styles.badgeRow}>
                  <span className={styles.rankBadge}>{badge(item, rank, filter)}</span>
                  {tags.length > 0 && (
                    <div className={styles.tags}>
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          className={styles.tag}
                          onClick={() => updateSearch(tag)}
                          aria-label={`搜尋標籤 ${tag}`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <h3 className={styles.title}>
                  {/* 標題是卡片的主要動作，用 ::after 撐滿整張卡片，讓整張可點、鍵盤也能操作 */}
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.stretched}>
                      {item.title}
                    </a>
                  ) : hasPoster ? (
                    <button
                      className={`${styles.stretched} ${styles.titleBtn}`}
                      onClick={() => setActiveItem(item)}
                      aria-label={`查看《${item.title}》海報`}
                    >
                      {item.title}
                    </button>
                  ) : (
                    item.title
                  )}
                </h3>

                {item.note && <p className={styles.note}>{item.note}</p>}

                {showScore && (
                  <div className={styles.score}>
                    <span className={styles.star} aria-hidden="true">★</span>{' '}
                    {item.score ? item.score.toFixed(1) : 'N/A'}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {visibleCount < filtered.length && (
        <button className={styles.loadMore} onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
          LOAD MORE
        </button>
      )}

      {activeItem && <PosterModal item={activeItem} onClose={closeModal} />}
    </div>
  );
}
