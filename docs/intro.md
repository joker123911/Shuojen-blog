---
sidebar_position: 1
---

# 📚 興趣首頁

這個區塊是我個人興趣的索引，將我所有感興趣的事物分門別類地記錄。

:::info
可以利用左側的選單（手機用戶請按左上角的 ≡ 圖示）選取章節
:::

<style>{`
  .interest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 2rem;
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
  .interest-card:nth-child(9) { animation-delay: 0.9s; }
  .interest-card:nth-child(10) { animation-delay: 1.0s; }
`}</style>

<div class="interest-grid">

  <a href="/docs/movie_list" class="interest-card">
    <h3>🎬 電影推薦</h3>
    <p>記錄我看過而且很喜歡的電影列表，持續更新中。</p>
  </a>

  <a href="/docs/aqua" class="interest-card">
    <h3>🐠 水族造景</h3>
    <p>記錄我的一些水草造景，之後再補充一些個人的水族筆記。</p>
  </a>

  <a href="/docs/chess/introduce" class="interest-card">
    <h3>♟️ 西洋棋</h3>
    <p>記錄玩西洋棋的啟蒙還有一些分數成長史，之後想要詳細記錄我使用的開局系統。</p>
  </a>

  <a href="/docs/music/guitar" class="interest-card">
    <h3>🎸 吉他</h3>
    <p>記錄一些吉他演奏，之後再補充一些吉他啟蒙故事。</p>
  </a>

  <a href="/docs/music/piano" class="interest-card">
    <h3>🎹 鋼琴</h3>
    <p>記錄一些學鋼琴故事，有認真練好的曲子再放上來。</p>
  </a>

  <a href="/docs/rubiks_cube/start" class="interest-card">
    <h3>🧊 魔術方塊</h3>
    <p>記錄玩魔術方塊的故事還有 WCA 比賽，盲解學習停滯中。</p>
  </a>

  <a href="/docs/keyboard" class="interest-card">
    <h3>⌨️ 機械鍵盤</h3>
    <p>記錄一些機械鍵盤指南，還有跟大隊長、王胖一起玩鍵盤的過程。</p>
  </a>

  <a href="/docs/concert/" class="interest-card">
    <h3>🎙️ 演唱會</h3>
    <p>記錄參加過的各種演唱會。</p>
  </a>

  <a href="/docs/draw/" class="interest-card">
    <h3> 🖌️塗鴉</h3>
    <p>記錄一些隨筆塗鴉。</p>
  </a>
</div>