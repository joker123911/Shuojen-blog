---
title: 小工具
description: 乾淨自由又無廣告的網頁小工具和小遊戲
---

# 小工具&小遊戲 `/tool`

這個區塊整理了一些自用的小工具與網頁小遊戲，特色是介面乾淨且完全無廣告。

<style>{`
  .interest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 1rem;
    margin-bottom: 3rem;
  }

  .interest-card {
    border: 1px solid var(--ifm-color-emphasis-200);
    border-radius: 12px;
    padding: 1.5rem;
    background: var(--ifm-card-background-color);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    text-decoration: none !important;
    color: inherit !important;
    display: flex;
    flex-direction: column;
    height: 100%;
    animation: fadeInUp 0.6s ease forwards;
    opacity: 0;
  }

  .interest-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    border-color: var(--ifm-color-primary);
  }

  .interest-card h3 {
    margin-top: 0;
    color: var(--ifm-color-primary);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .interest-card p {
    margin-bottom: 0;
    font-size: 0.95rem;
    color: var(--ifm-font-color-base);
    opacity: 0.8;
    line-height: 1.5;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 設定依序出現的延遲時間 */
  .interest-card:nth-child(1) { animation-delay: 0.1s; }
  .interest-card:nth-child(2) { animation-delay: 0.2s; }
  .interest-card:nth-child(3) { animation-delay: 0.3s; }
  .interest-card:nth-child(4) { animation-delay: 0.4s; }
  .interest-card:nth-child(5) { animation-delay: 0.5s; }
  .interest-card:nth-child(6) { animation-delay: 0.6s; }
  .interest-card:nth-child(7) { animation-delay: 0.7s; }
  .interest-card:nth-child(8) { animation-delay: 0.8s; }
`}</style>

## 🎮 休閒遊戲

<div class="interest-grid">

  <a href="https://shuojen.com/game.html" class="interest-card">
    <h3>成語迷宮</h3>
    <p>考驗成語敏感度的文字遊戲</p>
  </a>

  <a href="https://shuojen.com/guestname.html" class="interest-card">
    <h3>猜人名遊戲</h3>
    <p>看完《惡棍特工》就會想玩的派對小遊戲，兩人以上進行</p>
  </a>

  <a href="https://shuojen.com/sticker.html" class="interest-card">
    <h3>貼紙模擬器</h3>
    <p>使用 Shuyu 創作的可愛 icon，在畫布上自由拼貼的療癒小玩具</p>
  </a>

</div>

## 🛠️ 實用工具

<div class="interest-grid">

  <a href="https://shuojen.com/calculator" class="interest-card">
    <h3>投資報酬試算表</h3>
    <p>快速計算投資報酬率與複利成長，理財規劃的好幫手</p>
  </a>

  <a href="https://shuojen.com/calories" class="interest-card">
    <h3>營養攝取終結者</h3>
    <p>計算每日營養素攝取量，輕鬆管理飲食目標</p>
  </a>

  <a href="https://shuojen.com/food" class="interest-card">
    <h3>吃什麼都可以終結者</h3>
    <p>選擇困難症救星！隨機決定下一餐的落腳處</p>
  </a>

  <a href="https://shuojen.com/resize.html" class="interest-card">
    <h3>圖片批次處理工具</h3>
    <p>在瀏覽器內快速完成圖片的壓縮與格式轉換</p>
  </a>

  <a href="https://shuojen.com/color_picker.html" class="interest-card">
    <h3>網頁取色器</h3>
    <p>快速吸取並複製螢幕上的十六進位色碼</p>
  </a>

  <a href="https://shuojen.com/random.html" class="interest-card">
    <h3>隨機轉盤</h3>
    <p>活動抽獎、分組或日常決策都適用的自訂轉盤工具</p>
  </a>

  <a href="https://shuojen.com/boshiamy" class="interest-card">
    <h3>嘸蝦米兩碼字練習器</h3>
    <p>專為嘸蝦米輸入法設計，強化兩碼字肌肉記憶的打字練習器</p>
  </a>

</div>