---
title: 關於
hide_table_of_contents: true
---
import { Black } from '/src/components/Chess/ChessGame';
import Marquee from "react-fast-marquee";
import ContributionCalendar from '@site/src/components/ContributionCalendar/ContributionCalendar';
import SiteStats from '@site/src/components/SiteStats';
import Link from '@docusaurus/Link';

<style>{`
  /* 先放名片（照片、自我介紹、聯絡），再放說明、棋局與細框格子 */
  .abC { max-width: 820px; margin: 0 auto; }
  .abC .abC-muted { color: var(--ifm-color-emphasis-700); }

  .abC .abC-card {
    display: grid; grid-template-columns: 180px 1fr; gap: 2rem; align-items: center;
    padding: 2rem; border: 1px solid var(--ifm-color-emphasis-300); border-radius: 14px;
  }
  .abC .abC-card img { width: 180px; height: 180px; object-fit: cover; border-radius: 50%; display: block; }
  .abC .abC-card p { margin: 0 0 0.6rem; }
  .abC .abC-card .abC-mail { font-family: var(--ifm-font-family-monospace); font-size: 0.9rem; user-select: all; margin: 0; }

  .abC .abC-intro { margin: 2.5rem 0 0; line-height: 1.9; font-size: 1.05rem; }

  .abC .abC-title {
    font-size: 1.15rem !important; font-weight: 600 !important;
    margin: 3.5rem 0 1.2rem !important;
  }

  /* 主要內容：編號細框卡片 */
  .abC .abC-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .abC .abC-tile {
    display: block; padding: 1.4rem 1.3rem; border-radius: 12px;
    border: 1px solid var(--ifm-color-emphasis-300);
    color: inherit !important; text-decoration: none !important;
    transition: border-color .2s, background-color .2s;
  }
  .abC .abC-tile:hover { border-color: var(--ifm-font-color-base); background: var(--ifm-color-emphasis-100); }
  .abC .abC-tile small { display: block; font-family: var(--ifm-font-family-monospace); color: var(--ifm-color-emphasis-500); margin-bottom: 0.8rem; }
  .abC .abC-tile strong { display: block; margin-bottom: 0.4rem; }
  .abC .abC-tile span { font-size: 0.9rem; line-height: 1.7; color: var(--ifm-color-emphasis-700); }

  /* 其他頁面：分類後排成雙欄目錄，右邊附路徑 */
  .abC .abC-groups { columns: 2; column-gap: 2.5rem; }
  .abC .abC-group { break-inside: avoid; margin-bottom: 1.6rem; }
  .abC .abC-group h3 {
    font-size: 0.8rem !important; font-weight: 400 !important; letter-spacing: 0.2em;
    color: var(--ifm-color-emphasis-600) !important; margin: 0 0 0.2rem !important;
  }
  .abC .abC-index { list-style: none; padding: 0; margin: 0; }
  .abC .abC-index li { margin: 0; }
  .abC .abC-index a {
    display: flex; justify-content: space-between; gap: 1rem;
    padding: 0.45rem 0;
    border-bottom: 1px dotted var(--ifm-color-emphasis-300);
    color: inherit !important; text-decoration: none !important;
  }
  .abC .abC-index a code {
    background: none; border: none; padding: 0;
    font-size: 0.8rem; color: var(--ifm-color-emphasis-600);
  }
  .abC .abC-index a:hover code { color: var(--ifm-font-color-base); }

  .abC .abC-feeds { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
  .abC .abC-feeds div { padding: 1rem 1.2rem; border-radius: 12px; background: var(--ifm-color-emphasis-100); }
  .abC .abC-feeds span { display: block; font-size: 0.85rem; color: var(--ifm-color-emphasis-700); margin-bottom: 0.2rem; }
  .abC .abC-feeds code { background: none; border: none; padding: 0; font-size: 0.88rem; user-select: all; word-break: break-all; }

  .abC .abC-marquee { margin-top: 2.5rem; padding: 0.6rem 0; border-top: 1px solid var(--ifm-color-emphasis-200); border-bottom: 1px solid var(--ifm-color-emphasis-200); font-size: 0.95rem; }

  @media (max-width: 700px) {
    .abC .abC-card { grid-template-columns: 1fr; justify-items: center; text-align: center; padding: 1.6rem 1.2rem; }
    .abC .abC-card img { width: 130px; height: 130px; }
    .abC .abC-tiles, .abC .abC-feeds { grid-template-columns: 1fr; }
    .abC .abC-groups { columns: 1; }
  }
`}</style>

<div className="site-hero-wrapper">
  <h1 className="site-hero-title">About</h1>
</div>

<div className="abC">

<div className="abC-card">
  <img src="/img/me.webp" alt="me" />
  <div>
    <p>黃碩人，出生於西元 1998 年。</p>
	<p>現居臺北，土木工程師，女朋友綽號是蝦波。</p>
    <p className="abC-muted">歡迎到<Link to="/guestbook">留言板</Link>逛逛，有任何想說的，也可以聯絡我的信箱。</p>
    <p className="abC-mail">me@shuojen.com</p>
  </div>
</div>

<p className="abC-intro">這裡是我記錄生活和興趣的地方，我支持開放自由的數位世界，大家應該享受沒有<strong>商業廣告</strong>、沒有<strong>演算法</strong>、沒有<strong>登入限制</strong>的社群自由，而不是限縮在大公司的框架下，等著它們隨時對你予取予求。</p>

<p className="abC-muted">不知道該怎麼開始嗎？請看<a href="https://blogblog.club/resources/">這裡</a>架設一個屬於自己的網站吧。</p>

<div className="abC-marquee">
  <Marquee gradient={false} speed={50}>
    <span style={{paddingRight: '4rem'}}>我直接放一盤 <a href="https://www.youtube.com/watch?v=oH-txHzE4jA">Bill Gates vs Magnus Carlsen</a> 九步就被將殺的對局，沒有為什麼，因為個人網頁很<strong><em>自由</em></strong>！</span>
  </Marquee>
</div>
<Black pgn="1. e4 Nc6 2. Nf3 d5 3. Bd3 Nf6 4. exd5 Qxd5 5. Nc3 Qh5 6. O-O Bg4 7. h3 Ne5 8. hxg4 Nfxg4 9. Nxe5 Qh2#" />

<h2 className="abC-title">主要內容</h2>
<div className="abC-tiles">
  <Link to="/docs/intro" className="abC-tile"><small>01</small><strong>興趣分享</strong><span>常駐的興趣分享區塊，包含西洋棋、魔術方塊等。</span></Link>
  <Link to="/blog" className="abC-tile"><small>02</small><strong>貼文紀錄</strong><span>部落格式的不定時紀錄， 2025 以前的內容是從社群媒體搬運過來的。</span></Link>
  <Link to="/photography" className="abC-tile"><small>03</small><strong>攝影作品</strong><span>偶爾出遊時心血來潮拍攝的作品紀錄，2019 年從底片相機開始入攝影坑。</span></Link>
</div>

<h2 className="abC-title">其他頁面</h2>
<div className="abC-groups">
  <div className="abC-group">
    <h3>關於</h3>
    <ul className="abC-index">
      <li><Link to="/use">我在用什麼<code>/use</code></Link></li>
      <li><Link to="/now">我在做什麼<code>/now</code></Link></li>
      <li><Link to="/tool">小工具<code>/tool</code></Link></li>
    </ul>
  </div>
  <div className="abC-group">
    <h3>瀏覽</h3>
    <ul className="abC-index">
      <li><Link to="/blog/archive">貼文列表<code>/blog/archive</code></Link></li>
      <li><Link to="/photoblog/photo-archive">攝影列表<code>/photoblog/photo-archive</code></Link></li>
      <li><Link to="/albums">專輯牆<code>/albums</code></Link></li>
      <li><Link to="/random">隨機貼文<code>/random</code></Link></li>
      <li><Link to="/search">站內搜尋<code>/search</code></Link></li>
    </ul>
  </div>
  <div className="abC-group">
    <h3>排名</h3>
    <ul className="abC-index">
      <li><Link to="/docs/movie_list">電影清單<code>/docs/movie_list</code></Link></li>
      <li><Link to="/docs/anime">動漫清單<code>/docs/anime</code></Link></li>
      <li><Link to="/docs/series">劇集清單<code>/docs/series</code></Link></li>
      <li><Link to="/docs/ramen">拉麵清單<code>/docs/ramen</code></Link></li>
      <li><Link to="/docs/jinyung">金庸清單<code>/docs/jinyung</code></Link></li>
    </ul>
  </div>
  <div className="abC-group">
    <h3>交流</h3>
    <ul className="abC-index">
      <li><Link to="/blogroll">部落卷<code>/blogroll</code></Link></li>
      <li><Link to="/guestbook">留言板<code>/guestbook</code></Link></li>
    </ul>
  </div>
</div>

<p className="abC-muted" style={{marginTop: '2rem', marginBottom: 0}}>歡迎在下方使用 RSS 連結訂閱我的文章（ <Link to="/blog/2025/09/16/rss#%E8%AA%8D%E8%AD%98-rss">那是什麼？</Link>）</p>
<div className="abC-feeds">
  <div><span>Blog 貼文 RSS</span><code>https://shuojen.com/blog/rss.xml</code></div>
  <div><span>攝影貼文 RSS</span><code>https://shuojen.com/photoblog/rss.xml</code></div>
</div>

<h2 className="abC-title">即時數據</h2>
<SiteStats />
<ContributionCalendar />

</div>
