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

// 站長金鑰（跟留言板、草稿頁共用同一個 localStorage 鍵）；有的話 Worker 會多回今日人氣
function readAdminKey() {
  try {
    return window.localStorage.getItem('guestbook_admin_key');
  } catch {
    return null;
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
  const adminKey = readAdminKey();
  // 一般訪客：POST 不帶 body 和自訂標頭，屬於「簡單請求」，不會觸發 CORS 預檢
  // 站長：多帶 Authorization 拿今日人氣（會多一次預檢，只有站長自己會遇到）
  const init = { method: counted ? 'GET' : 'POST' };
  if (adminKey) init.headers = { Authorization: adminKey };
  countPromise = fetch(VISITS_URL, init)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (typeof data?.count !== 'number') throw new Error('回應格式不正確');
      if (!counted) markCounted();
      // today 只有站長金鑰正確、而且 Worker 已更新時才會有
      return { count: data.count, today: typeof data.today === 'number' ? data.today : null };
    });
  countPromise.catch(() => {
    countPromise = null;
  });
  return countPromise;
}

export default function VisitCounter() {
  const [count, setCount] = useState(null);
  const [today, setToday] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCount()
      .then((data) => {
        if (!alive) return;
        setCount(data.count);
        setToday(data.today);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // 連不上就整個不顯示，不要留一個壞掉的徽章
  if (failed) return null;

  return (
    <Link
      to="/"
      className={styles.badge}
      aria-label={
        count === null ? '瀏覽數載入中' : `瀏覽數 ${count}${today === null ? '' : `，今日 ${today}`}`
      }
    >
      <span className={styles.label}>Visits</span>
      <span className={styles.value}>{count === null ? '…' : count}</span>
      {today !== null && <span className={styles.today}>Today {today}</span>}
    </Link>
  );
}
