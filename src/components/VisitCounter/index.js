import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import commentsConfig from '@site/src/config/comments.json';
import styles from './styles.module.css';

// 全站瀏覽數：存在留言 API 同一支 Cloudflare Worker 的 D1（site_stats 表），不經過第三方
const VISITS_URL = `${commentsConfig.apiUrl}/visits`;
const COUNTED_KEY = 'site_visit_counted';
// 只有正式網域才加一；本機 npm start / serve 只讀數字
const COUNTED_HOSTS = ['shuojen.com', 'www.shuojen.com', 'shuojen.site', 'www.shuojen.site'];

// 同一個分頁（session）只算一次；之後換頁、重新整理只讀數字不加一
function alreadyCounted() {
  if (!COUNTED_HOSTS.includes(window.location.hostname)) return true;
  try {
    return window.sessionStorage.getItem(COUNTED_KEY) === '1';
  } catch {
    return false;
  }
}

function markCounted() {
  try {
    window.sessionStorage.setItem(COUNTED_KEY, '1');
  } catch {
    // 存不了就算了，頂多重新整理時多算一次
  }
}

// 模組層級快取：頁尾每次換頁都會重新掛載，這樣同一次瀏覽只打一次 API
let countPromise = null;

function loadCount() {
  if (countPromise) return countPromise;
  const counted = alreadyCounted();
  // POST 不帶 body 和自訂標頭，屬於「簡單請求」，不會觸發 CORS 預檢
  countPromise = fetch(VISITS_URL, counted ? undefined : { method: 'POST' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (typeof data?.count !== 'number') throw new Error('回應格式不正確');
      if (!counted) markCounted();
      return data.count;
    });
  countPromise.catch(() => {
    countPromise = null;
  });
  return countPromise;
}

export default function VisitCounter() {
  const [count, setCount] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCount()
      .then((n) => alive && setCount(n))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // 連不上就整個不顯示，不要留一個壞掉的徽章
  if (failed) return null;

  return (
    <Link to="/" className={styles.badge} aria-label={count === null ? '瀏覽數載入中' : `瀏覽數 ${count}`}>
      <span className={styles.label}>Visits</span>
      <span className={styles.value}>{count === null ? '…' : count}</span>
    </Link>
  );
}
