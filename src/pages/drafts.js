import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import { usePluginData } from '@docusaurus/useGlobalData';
import commentsConfig from '@site/src/config/comments.json';

// 跟留言板共用站長金鑰（src/components/Guestbook）
const ADMIN_KEY_STORAGE = 'guestbook_admin_key';

function readStoredAdminKey() {
  try {
    return window.localStorage.getItem(ADMIN_KEY_STORAGE);
  } catch {
    return null;
  }
}

function storeAdminKey(key) {
  try {
    window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
  } catch {
    // 存不了就只在這次瀏覽有效
  }
}

/**
 * 草稿列表（站長模式）。
 * 正式站的草稿跟一般文章一樣建置，但只有站長看得到（見 docusaurus.config.js 的 draft-index 外掛）。
 * 注意這只是隱藏，內容還是在網頁原始碼裡。
 */
export default function Drafts() {
  const { drafts } = usePluginData('draft-index');
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (readStoredAdminKey()) setIsAdmin(true);
  }, []);

  const login = async () => {
    const key = window.prompt('請輸入站長通關密語：');
    if (!key) return;
    try {
      const res = await fetch(`${commentsConfig.apiUrl}/verify`, { headers: { Authorization: key } });
      const result = await res.json();
      if (result.success) {
        storeAdminKey(key);
        // 讓側欄、列表裡的草稿馬上出現，不用重新整理
        document.documentElement.setAttribute('data-site-admin', '');
        setIsAdmin(true);
        setMessage('');
      } else {
        setMessage('通關密語不對。');
      }
    } catch {
      setMessage('連線失敗，請稍後再試。');
    }
  };

  return (
    <Layout title="草稿" description="站長的草稿列表">
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="container margin-vert--lg" style={{ maxWidth: 720 }}>
        <h1>草稿</h1>
        {!isAdmin ? (
          <>
            <p>這裡只給站長看。</p>
            <button type="button" className="button button--primary" onClick={login}>
              站長登入
            </button>
            {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
          </>
        ) : drafts.length === 0 ? (
          <p>目前沒有草稿。</p>
        ) : (
          <ul>
            {/* 草稿沒有日期，Docusaurus 給的日期是開發模式的假日期或 git 建檔日，不顯示 */}
            {drafts.map(([title, permalink]) => (
              <li key={permalink}>
                <Link to={permalink}>{title}</Link>
                <span style={{ opacity: 0.6, marginLeft: '0.5rem', fontSize: '0.9em' }}>未發佈</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Layout>
  );
}
