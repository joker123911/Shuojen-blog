---
title: 留言板
---
import Guestbook from '@site/src/components/Guestbook';

<style>{`
  .guestbook-hero-title {
    font-size: 3.5rem;
    font-weight: 400;
    font-family: "Rock Salt", cursive;
    letter-spacing: 2px;
    margin-bottom: 0.8rem;
    color: var(--ifm-font-color-base);
    white-space: nowrap;
  }
  .guestbook-hero-sub {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 500;
    color: var(--ifm-color-content-secondary);
    opacity: 0.85;
  }
  @media (max-width: 600px) {
    .guestbook-hero-title {
      font-size: 2.3rem;
    }
  }
`}</style>

<div style={{ textAlign: 'center', marginBottom: '3.5rem', marginTop: '2rem' }}>
  <h1 className="guestbook-hero-title">Guestbook</h1>
  <p className="guestbook-hero-sub">Say Hello • Leave a Message</p>
</div>

:::info[**支援簡單的 Markdown 語法！**]
- 超連結：`[顯示的文字](網址)`
- 內嵌程式碼：`` `code` ``
- 粗體：`**bold**`
- 斜體：`*italic*`
- 刪除線：`~~strike~~`

:::

留言板功能已開放，不需登入、不限字數，歡迎路過留言！ 

(◍•ᴗ•◍)ゝ

<Guestbook />