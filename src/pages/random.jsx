import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';

export default function RandomPost() {
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function fetchAndRedirect() {
      try {
        const response = await fetch('/sitemap.xml');
        
        // 判斷 sitemap 是否存在
        if (!response.ok) {
           if (window.location.hostname === 'localhost') {
             setStatus('> 錯誤：本地開發模式不會產生 sitemap.xml，請編譯後測試。');
             return;
           } else {
             window.location.replace('/blog');
             return;
           }
        }

        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        const urls = Array.from(xmlDoc.querySelectorAll('loc'))
          .map(loc => loc.textContent || '')
          .filter(url => {
            // 處理一般部落格貼文
            const isBlog = url.includes('/blog/') && 
              !url.includes('/blog/tags') && 
              !url.includes('/blog/archive') && 
              !url.includes('/blog/authors') && 
              !url.includes('/blog/page') &&
              !url.endsWith('/blog') &&
              !url.endsWith('/blog/');

            // 處理攝影集作品頁面
            const isPhotoBlog = url.includes('/photoblog/') &&
              !url.includes('/photoblog/tags') &&
              !url.includes('/photoblog/photo-archive') &&
              !url.includes('/photoblog/authors') &&
              !url.includes('/photoblog/page') &&
              !url.endsWith('/photoblog') &&
              !url.endsWith('/photoblog/');

            return isBlog || isPhotoBlog;
          });

        if (urls.length > 0) {
          const randomIndex = Math.floor(Math.random() * urls.length);
          const randomUrl = urls[randomIndex];
          
          const urlObj = new URL(randomUrl);
          window.location.replace(urlObj.pathname);
        } else {
          setStatus('> 找不到文章，即將跳轉回部落格首頁...');
          setTimeout(() => window.location.replace('/blog'), 1500);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setStatus('> 發生錯誤，即將跳轉回部落格首頁...');
        setTimeout(() => window.location.replace('/blog'), 1500);
      }
    }

    fetchAndRedirect();
  }, []);

  return (
    <Layout title="隨機貼文">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '60vh', 
        fontSize: '1.2rem', 
        fontFamily: 'monospace',
        padding: '20px',
        textAlign: 'center'
      }}>
        <span>{status}</span>
      </div>
    </Layout>
  );
}