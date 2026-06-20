---
title: 部落卷
description: 個人網頁名冊
---
import React, { useState, useMemo } from 'react';
import { blogrollLinks } from './blogrollData.js';

export const BlogrollSearch = () => {
  const [search, setSearch] = useState('');
  
  const filteredLinks = useMemo(() => {
    return blogrollLinks.filter(link => 
      link.title.toLowerCase().includes(search.toLowerCase()) || 
      link.url.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '15px', 
        marginBottom: '25px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="🔍 搜尋部落格名稱或網址..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            maxWidth: '500px',
            width: '100%',
            padding: '12px 20px',
            borderRadius: '25px',
            border: '1px solid var(--ifm-color-emphasis-300)',
            backgroundColor: 'var(--ifm-background-color)',
            color: 'var(--ifm-font-color-base)',
            fontSize: '16px',
            outline: 'none',
            boxShadow: 'var(--ifm-global-shadow-lw)',
          }}
        />
        <div style={{ 
          padding: '8px 16px', 
          borderRadius: '20px', 
          border: '1px solid var(--ifm-color-emphasis-300)',
          backgroundColor: 'var(--ifm-color-emphasis-200)',
          color: 'var(--ifm-font-color-base)',
          fontSize: '0.9rem',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          boxShadow: 'var(--ifm-global-shadow-lw)'
        }}>
          收錄部落格：{blogrollLinks.length} 個
        </div>
      </div>
      <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
        {filteredLinks.map((link, idx) => (
          <li key={idx} style={{ marginBottom: '6px' }}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
          </li>
        ))}
      </ul>
      {filteredLinks.length === 0 && (
        <p style={{ color: 'var(--ifm-color-danger)', marginTop: '10px' }}>找不到相符的部落格 😢</p>
      )}
    </div>
  );
};


# 部落卷 `/blogroll`

*最後更新：2026-06-20*

<img src="/img/blogroll_logo.png" style={{ borderRadius: '0' }} alt="logo" />


```
![shuojen的徽章](https://shuojen.com/logo.png)
```

▲ 我的部落格徽章，歡迎自行取用或直連

:::info
本頁面收錄我的 [RSS](/blog/2025/09/16/rss) 訂閱清單（隨機順序）。來源就是到處在各個網站連來連去，只要看到有趣的就加進來；讀著讀著，那些令人驚豔的文章總會讓我不知不覺記住作者，然後忍不住也寫一篇帶原文連結的文章來表達支持，對我來說，這就是部落格最純粹丶迷人之處吧。
:::

<BlogrollSearch />