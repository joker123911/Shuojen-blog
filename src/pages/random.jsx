import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import { useHistory } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import generatedRoutes from '@generated/routes';

/**
 * 判斷路徑是否為目標的「部落格文章」或「攝影集作品」
 */
function isTargetPostUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  let pathname = rawUrl.trim();
  try {
    if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
      pathname = new URL(pathname).pathname;
    }
  } catch {
    return false;
  }

  // 排除靜態資源與訂閱源 (如 rss.xml / atom.xml)
  if (/\.(xml|json|atom|txt)$/i.test(pathname)) return false;

  const cleanPath = pathname.replace(/\/+$/, '');

  // 1. 處理一般部落格貼文
  const isBlog =
    cleanPath.startsWith('/blog/') &&
    !cleanPath.startsWith('/blog/tags') &&
    !cleanPath.startsWith('/blog/archive') &&
    !cleanPath.startsWith('/blog/authors') &&
    !cleanPath.startsWith('/blog/page');

  // 2. 處理攝影集作品頁面
  const isPhotoBlog =
    cleanPath.startsWith('/photoblog/') &&
    !cleanPath.startsWith('/photoblog/tags') &&
    !cleanPath.startsWith('/photoblog/photo-archive') &&
    !cleanPath.startsWith('/photoblog/authors') &&
    !cleanPath.startsWith('/photoblog/page');

  return isBlog || isPhotoBlog;
}

/**
 * 遞迴從 Docusaurus 內建的 @generated/routes 擷取所有有效文章路徑
 * （在 localhost 開發模式與正式環境皆可同步取得，不需等待網路請求）
 */
function getPostUrlsFromGeneratedRoutes(routeList) {
  const collected = new Set();

  function traverse(routes) {
    if (!Array.isArray(routes)) return;
    for (const route of routes) {
      if (!route) continue;
      if (typeof route.path === 'string' && isTargetPostUrl(route.path)) {
        collected.add(route.path);
      }
      if (Array.isArray(route.routes)) {
        traverse(route.routes);
      }
    }
  }

  traverse(routeList);
  return Array.from(collected);
}

export default function RandomPost() {
  const history = useHistory();
  const searchIndexUrl = useBaseUrl('/search-index.json');
  const sitemapUrl = useBaseUrl('/sitemap.xml');
  const [status, setStatus] = useState('> 正在隨機挑選文章...');

  useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;

    const redirectToRandom = (urls) => {
      if (!isMounted || urls.length === 0) return false;
      const randomIndex = Math.floor(Math.random() * urls.length);
      let targetPath = urls[randomIndex];
      try {
        if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
          targetPath = new URL(targetPath).pathname;
        }
      } catch {
        // 維持原路徑
      }
      history.replace(targetPath);
      return true;
    };

    async function resolveAndRedirect() {
      // 第一順位：直接從 Docusaurus 內建路由表讀取（支援 localhost 且 0 延遲）
      const builtInUrls = getPostUrlsFromGeneratedRoutes(generatedRoutes);
      if (redirectToRandom(builtInUrls)) {
        return;
      }

      // 第二順位備援：從站內搜尋索引 /search-index.json 讀取
      try {
        const res = await fetch(searchIndexUrl);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const indexUrls = data
              .map((item) => item && item.url)
              .filter(isTargetPostUrl);
            if (redirectToRandom(indexUrls)) {
              return;
            }
          }
        }
      } catch {
        // 忽略並繼續嘗試 sitemap
      }

      // 第三順位備援：從正式環境的 /sitemap.xml 讀取
      try {
        const response = await fetch(sitemapUrl);
        if (response.ok) {
          const text = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          const sitemapUrls = Array.from(xmlDoc.querySelectorAll('loc'))
            .map((loc) => loc.textContent || '')
            .filter(isTargetPostUrl);

          if (redirectToRandom(sitemapUrls)) {
            return;
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
      }

      if (isMounted) {
        setStatus('> 找不到文章，即將跳轉回部落格首頁...');
        fallbackTimer = setTimeout(() => {
          if (isMounted) history.replace('/blog');
        }, 1500);
      }
    }

    resolveAndRedirect();

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [history, searchIndexUrl, sitemapUrl]);

  return (
    <Layout title="隨機貼文">
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          fontSize: '1.2rem',
          fontFamily: 'monospace',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <span>{status}</span>
      </div>
    </Layout>
  );
}