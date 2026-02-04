---
title: '電影推薦清單'
sidebar_position: 2
---

import React, { useState } from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 電影推薦清單

*最後更新：2026-02-04*

:::info 持續更新中
如果有什麼電影想要補充歡迎留言或寫信大力推薦我。
:::

這是一份適合週日夜晚的電影推薦，每一部都是我的誠意之選。

export const MovieGrid = ({ movies, onImageClick }) => (
  <div className="movie-grid">
    {movies.map((movie, idx) => (
      <div 
        key={idx} 
        className="movie-card" 
        onClick={() => onImageClick(movie.poster, movie.title)}
        style={{ cursor: 'pointer' }}
      >
        <span className="movie-title">{movie.title}</span>
        <p className="movie-note">{movie.note}</p>
      </div>
    ))}
  </div>
);

export const MovieListApp = () => {
  const [activePoster, setActivePoster] = useState(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  
  const [visibleCounts, setVisibleCounts] = useState({
    western: 10,
    asia: 10,
    anime: 10
  });

  const westernMovies = [
    { title: "刺激1995", note: "監獄劇情神片，很療癒，就連電影名也是個神奇的傳說", poster: "./img/movie/刺激1995.jpg" },
    { title: "頂尖對決", note: "心中最佳的諾蘭神片，絕對不能被劇透，看第二次體驗更佳", poster: "./img/movie/頂尖對決.jpg" },
    { title: "星際效應", note: "畫面劇情演員都無可挑剔，重映又去美麗華 imax 體驗感動", poster: "./img/movie/星際效應.jpg" },
    { title: "全面啟動", note: "原來小學的我就是諾蘭粉了，只是當年的我不知道導演是誰", poster: "./img/movie/全面啟動.jpg" },
    { title: "黑暗騎士", note: "希斯萊傑篡位主角的最神英雄片", poster: "./img/movie/黑暗騎士.jpg" },
    { title: "小丑", note: "醉後大丈夫導演是真的有兩把刷子，第一次看真的很震驚", poster: "./img/movie/小丑.jpg" },
    { title: "醉後大丈夫", note: "續集公式化但第一集真的有趣的搞笑片", poster: "./img/movie/醉後大丈夫.jpg" },
    { title: "絕殺令", note: "心中最佳的昆丁，就是很昆丁風格，血腥黑色幽默", poster: "./img/movie/絕殺令.jpg" },
    { title: "惡棍特工", note: "小布超級帥，我還記得國中的時候帶女孩子回家一起看（合法嗎？）", poster: "./img/movie/惡棍特工.jpg" },
    { title: "同盟鶼鰈", note: "超棒的愛情諜戰片", poster: "./img/movie/同盟鶼鰈.jpg" },
    { title: "魔球", note: "喜歡這種真實故事改編的傳奇片", poster: "./img/movie/魔球.jpg" },
    { title: "鬥陣俱樂部", note: "抱歉，第一條規則", poster: "./img/movie/鬥陣俱樂部.jpg" },
    { title: "火線追緝令", note: "心中最佳的大衛芬奇，百看不厭凱文史貝西的神演技", poster: "./img/movie/火線追緝令.jpg" },
    { title: "控制", note: "抽絲剝繭的懸疑片，喜歡到借了原著來讀，還原度很高", poster: "./img/movie/控制.jpg" },
    { title: "社群網站", note: "很流暢的臉書起源故事，商業鬥爭的佳片", poster: "./img/movie/社群網站.jpg" },
    { title: "幸福綠皮書", note: "最愛的公路片，輕鬆又溫暖", poster: "./img/movie/幸福綠皮書.jpg" },
    { title: "康斯坦丁", note: "基努李維最佳，超酷炫的驅魔爽片", poster: "./img/movie/康斯坦丁.jpg" },
    { title: "瘋狂麥斯憤怒道", note: "流暢刺激，直球對決的爽片", poster: "./img/movie/瘋狂麥斯憤怒道.jpg" },
    { title: "阿甘正傳", note: "不管從頭從中間從哪裡都可以超順的看完", poster: "./img/movie/阿甘正傳.jpg" },
    { title: "神鬼交鋒", note: "很有意思的劇情片，輕鬆流暢，也是真實原型改編的人物", poster: "./img/movie/神鬼交鋒.jpg" },
    { title: "靈異第六感", note: "絕對不能被暴雷系列，趕快把它看掉以防萬一吧", poster: "./img/movie/靈異第六感.jpg" },
    { title: "意外", note: "黑色犯罪劇情片，看演技就很值得了，淡淡的惆悵類型", poster: "./img/movie/意外.jpg" },
    { title: "不", note: "喬登皮爾作品之中最喜歡的，題材就是很對到我的電波", poster: "./img/movie/不.jpg" },
    { title: "回到未來系列", note: "經典老片，意猶未盡", poster: "./img/movie/回到未來系列.jpg" },
    { title: "發條橘子", note: "最喜歡的庫柏力克電影，腦洞大開", poster: "./img/movie/發條橘子.jpg" },
    { title: "楚門的世界", note: "很經典的哲學電影，非常值得看", poster: "./img/movie/楚門的世界.jpg" },
    { title: "北非諜影", note: "經典老片，1942 年的電影但完全不覺得過時", poster: "./img/movie/北非諜影.webp" },
    { title: "進擊的鼓手", note: "不瘋魔不成活的代表片", poster: "./img/movie/進擊的鼓手.jpg" },
    { title: "彗星來的那一夜", note: "小成本但懸疑感滿滿，絕對不輸大片", poster: "./img/movie/彗星來的那一夜.jpg" },
    { title: "K星異客", note: "超有趣的科幻小品", poster: "./img/movie/K星異客.jpg" },
    { title: "型男飛行日誌", note: "憂鬱型男喬治克隆尼的療癒電影", poster: "./img/movie/型男飛行日誌.jpg" },
    { title: "捍衛戰士獨行俠", note: "簡單流暢直球對決的爽片卻不出戲，完美續作", poster: "./img/movie/捍衛戰士獨行俠.jpg" },
    { title: "鬼手鬼手請開口", note: "A24 恐怖小品，有照公式但是滿有意思，值得一看", poster: "./img/movie/鬼手鬼手請開口.jpg" },
    { title: "明日邊界", note: "流暢有趣，題材有意思的科幻爽片", poster: "./img/movie/明日邊界.jpg" },
    { title: "賭王之王", note: "德州撲克邪典電影，喜歡決勝 21 點類型的會很愛", poster: "./img/movie/賭王之王.jpg" },
    { title: "異星入境", note: "喜歡這種引起觀眾好奇心的科幻電影", poster: "./img/movie/異星入境.jpg" },
    { title: "一級玩家", note: "中規中矩的科幻爽片，值得一看", poster: "./img/movie/一級玩家.jpg" },
    { title: "科洛弗10號地窖", note: "小成本的懸疑作品，女主角好漂亮", poster: "./img/movie/科洛弗10號地窖.jpg" },
    { title: "龍捲風暴", note: "很棒的災難片，流暢也夠爽", poster: "./img/movie/龍捲風暴.jpg" },
    { title: "美麗境界", note: "經典的天才傳記片，描寫天才人性的部分", poster: "./img/movie/美麗境界.jpg" },
    { title: "天才的禮物", note: "天才傳記片，光看小妹妹的美顏就值得了", poster: "./img/movie/天才的禮物.jpg" },
    { title: "雨人", note: "天才傳記片，溫暖類型", poster: "./img/movie/雨人.jpg" },
    { title: "模仿遊戲", note: "天才傳記類型的戰爭片，看完也是淡淡的惆悵", poster: "./img/movie/模仿遊戲.jpg" },
    { title: "站在我這邊", note: "很棒的史蒂芬金原作電影，青少年冒險類型", poster: "./img/movie/站在我這邊.jpg" },
    { title: "末代武士", note: "背景在 19 世紀的戰爭武士片", poster: "./img/movie/末代武士.jpg" },
    { title: "帝國浩劫：美國內戰", note: "由記者視角演繹的戰爭片，很特別", poster: "./img/movie/帝國浩劫：美國內戰.jpg" },
    { title: "扭轉奇蹟", note: "經典的凱吉溫馨電影", poster: "./img/movie/扭轉奇蹟.jpg" },
    { title: "這個男人來自地球", note: "小成本哲學電影，只有聊天畫面但是會覺得很有趣", poster: "./img/movie/這個男人來自地球.jpg" },
    { title: "懼裂", note: "血腥驚悚電影，講述容貌焦慮的電影，風格刺激大膽", poster: "./img/movie/懼裂.jpg" },
    { title: "完美伴侶", note: "驚悚電影，有一點黑鏡的科幻感，故事流暢有趣", poster: "./img/movie/完美伴侶.jpg" },
    { title: "終極追殺令", note: "非常經典的電影，充滿衝突矛盾的複雜情感", poster: "./img/movie/終極追殺令.jpg" },
    { title: "變人", note: "羅賓威廉斯的經典電影，溫馨感人的科幻愛情電影", poster: "./img/movie/變人.jpg" },
    { title: "睡人", note: "節奏偏慢的老電影，男女主角跳舞的那段非常淒美", poster: "./img/movie/睡人.jpg" },
    { title: "高年級實習生", note: "溫暖有趣的職場電影", poster: "./img/movie/高年級實習生.jpg" },
    { title: "美國心玫瑰情", note: "完全猜不到劇情的發展，很邪門的好看", poster: "./img/movie/美國心玫瑰情.jpg" },
    { title: "滯留生", note: "互相治癒的師生電影，輕鬆溫暖", poster: "./img/movie/滯留生.jpg" },
    { title: "屍樂園", note: "喪屍題材結合公路電影，好看的輕鬆小品", poster: "./img/movie/屍樂園.jpg" },
    { title: "登峰造擊", note: "Morgan Freeman 的旁白，像拳擊版刺激 1995", poster: "./img/movie/登峰造擊.jpg" },
    { title: "小太陽的願望", note: "溫暖的公路電影，富有童趣又發人深省", poster: "./img/movie/小太陽的願望.jpg" },
    { title: "豪情四兄弟", note: "美國少年監獄片，沉重但非常精采", poster: "./img/movie/豪情四兄弟.jpg" },
    { title: "戀夏 500 日", note: "PTT 戰男女神片，拍的很美，很真實", poster: "./img/movie/戀夏 500 日.jpg" },
    { title: "海灘", note: "皮卡丘的老電影，有意思的反烏托邦驚悚片", poster: "./img/movie/海灘.jpg" },
    { title: "芬奇的旅程", note: "Tom Hank 獨挑大樑的末日公路電影", poster: "./img/movie/芬奇的旅程.jpg" },
    { title: "F1", note: "小布的賽車爽片，畫面美，流暢過癮", poster: "./img/movie/F1.webp" },
    { title: "八惡人", note: "昆丁很流暢的一部，角色慢慢登場最後大混戰很過癮", poster: "./img/movie/八惡人.webp" },
    { title: "險路勿近", note: "犯罪驚悚片，柯恩兄弟最有名的一部，全片無配樂但壓迫感超強", poster: "./img/movie/險路勿近.webp" },
    { title: "波斯語課", note: "納粹時代背景的劇情片，為了生存，主角虛構了一門不存在的語言，非常值得一看", poster: "./img/movie/波斯語課.webp" },
    { title: "再見列寧", note: "柏林圍牆倒下為背景的電影，以喜劇作為呈現方式非常生動有趣，很喜歡", poster: "./img/movie/再見列寧.webp" },
    { title: "落日殺神", note: "超級好看的公路動作電影，阿湯哥和傑米福克斯之間的交談和對手戲都很有韻味", poster: "./img/movie/落日殺神.webp" },
  ];

  const asiaMovies = [
    { title: "寄生上流", note: "奉導集大成神作，節奏與寓意完美結合", poster: "./img/movie/寄生上流.jpg" },
    { title: "霸王別姬", note: "時代悲歌，哥哥張國榮的巔峰之作", poster: "./img/movie/霸王別姬.jpg" },
    { title: "投名狀", note: "對戰爭片無感的我都覺得很棒，李連杰演技巔峰", poster: "./img/movie/投名狀.jpg" },
    { title: "海闊天空", note: "最喜歡的中國電影，歡樂輕鬆也感人", poster: "./img/movie/海闊天空.jpg" },
    { title: "無間道", note: "香港警匪片巔峰，經典必看", poster: "./img/movie/無間道.jpg" },
    { title: "門徒", note: "經典的香港犯罪片", poster: "./img/movie/門徒.jpg" },
    { title: "大隻佬", note: "小時候有陰影，哲學懸疑電影", poster: "./img/movie/大隻佬.jpg" },
    { title: "新宿事件", note: "認真演戲的成龍黑道片", poster: "./img/movie/新宿事件.jpg" },
    { title: "盲探", note: "心中最佳的劉德華電影，人物塑造劇情都滿分", poster: "./img/movie/盲探.jpg" },
    { title: "破地獄", note: "近期最喜歡的香港電影，感動人心的殯葬題材", poster: "./img/movie/破地獄.jpg" },
    { title: "陽光普照", note: "鍾孟宏的集大成作品，台灣電影中不俗的存在", poster: "./img/movie/陽光普照.jpg" },
    { title: "大佛普拉斯", note: "我最喜歡的台灣電影，黑白畫面的荒謬感極佳", poster: "./img/movie/大佛普拉斯.jpg" },
    { title: "孤味", note: "平淡順暢有餘韻的故事", poster: "./img/movie/孤味.jpg" },
    { title: "老狐狸", note: "有趣的故事，流暢的劇情片", poster: "./img/movie/老狐狸.jpg" },
    { title: "目擊者", note: "我覺得台灣最好的懸疑電影", poster: "./img/movie/目擊者.jpg" },
    { title: "怪物", note: "是枝裕和作品，看完會有淡淡的惆悵感", poster: "./img/movie/怪物.jpg" },
    { title: "小偷家族", note: "最愛的是枝裕和電影，喜歡每個人物的描繪", poster: "./img/movie/小偷家族.jpg" },
    { title: "情書", note: "經典愛情日片，劇情設計滿有巧思", poster: "./img/movie/情書.jpg" },
    { title: "一屍到底", note: "一定要撐到最後，驚喜反轉搞笑片", poster: "./img/movie/一屍到底.jpg" },
    { title: "屍速列車", note: "我個人最喜歡的殭屍片，沒有之一", poster: "./img/movie/屍速列車.jpg" },
    { title: "葉問", note: "流暢好看的香港武打片", poster: "./img/movie/葉問.jpg" },
    { title: "霍元甲", note: "人物成長刻劃極佳，有深度的武打片", poster: "./img/movie/霍元甲.jpg" },
    { title: "功夫", note: "周星馳經典搞笑片，不只有純荒謬", poster: "./img/movie/功夫.jpg" },
    { title: "原罪犯", note: "腦洞大開的復仇片，長鏡頭畫面很厲害", poster: "./img/movie/原罪犯.jpg" },
    { title: "花束般的戀愛", note: "寫實好看的日本愛情片，不撒狗血", poster: "./img/movie/花束般的戀愛.jpg" }
  ];

  const animeMovies = [
    { title: "玩具總動員 1～3", note: "我最愛的皮克斯電影，純真又可愛的冒險", poster: "./img/movie/玩具總動員 1～3.jpg" },
    { title: "海底總動員", note: "有趣流暢的故事，美好的童年回憶", poster: "./img/movie/海底總動員.jpg" },
    { title: "可可夜總會", note: "感人有轉折畫面又漂亮", poster: "./img/movie/可可夜總會.jpg" },
    { title: "動物方城市", note: "很天才的描寫種族主義的可愛故事", poster: "./img/movie/動物方城市.jpg" },
    { title: "神隱少女", note: "最喜歡的宮崎駿作品，音樂劇情都無敵", poster: "./img/movie/神隱少女.jpg" },
    { title: "無敵破壞王", note: "有創意又溫暖的冒險故事", poster: "./img/movie/無敵破壞王.jpg" },
    { title: "大英雄天團", note: "角色可愛劇情流暢", poster: "./img/movie/大英雄天團.jpg" },
    { title: "你的名字", note: "新海誠畫面絢麗，純愛劇情", poster: "./img/movie/你的名字.jpg" },
    { title: "跳躍吧時空少女", note: "最喜歡的細田守作品", poster: "./img/movie/跳躍吧時空少女.jpg" },
    { title: "驀然回首", note: "藤本樹招牌畫風，讓你意猶未盡一整天", poster: "./img/movie/驀然回首.jpg" },
    { title: "鏈鋸人-蕾潔篇", note: "文藝電影感跟戰鬥畫面都超級棒", poster: "./img/movie/鏈鋸人-蕾潔篇.jpg" },
    { title: "荒野機器人", note: "夢工廠佳作，畫面精緻漂亮，劇情也是上乘的好電影", poster: "./img/movie/荒野機器人.jpg" },
    { title: "100公尺", note: "雨中的那場比賽，一鏡到底配上手繪線條太強了，教科書等級", poster: "./img/movie/100公尺.webp" },
    { title: "再見機器人", note: "沒有一句台詞但是會讓人想到前任的好動畫", poster: "./img/movie/再見機器人.webp" },
  ];

  const handleOpen = (url, title) => {
    setIsImgLoaded(false); // 重置載入狀態
    setActivePoster(url);
    setActiveTitle(title);
  };

  const handleClose = () => {
    setActivePoster(null);
  };

  const loadMore = (category) => {
    setVisibleCounts(prev => ({
      ...prev,
      [category]: prev[category] + 20
    }));
  };

  return (
    <div className="tabs-container">
      <Tabs>
        <TabItem value="western" label="🌎 歐美電影" default>
          <MovieGrid movies={westernMovies.slice(0, visibleCounts.western)} onImageClick={handleOpen} />
          {visibleCounts.western < westernMovies.length && (
            <button className="load-more-btn" onClick={() => loadMore('western')}>LOAD MORE</button>
          )}
        </TabItem>
        <TabItem value="asia" label="🥢 華語日韓">
          <MovieGrid movies={asiaMovies.slice(0, visibleCounts.asia)} onImageClick={handleOpen} />
          {visibleCounts.asia < asiaMovies.length && (
            <button className="load-more-btn" onClick={() => loadMore('asia')}>LOAD MORE</button>
          )}
        </TabItem>
        <TabItem value="anime" label="🎨 動畫電影">
          <MovieGrid movies={animeMovies.slice(0, visibleCounts.anime)} onImageClick={handleOpen} />
          {visibleCounts.anime < animeMovies.length && (
            <button className="load-more-btn" onClick={() => loadMore('anime')}>LOAD MORE</button>
          )}
        </TabItem>
      </Tabs>

      {activePoster && (
        <div className="poster-modal-overlay" onClick={handleClose}>
          <div className="poster-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{activeTitle}</span>
              <button className="close-btn" onClick={handleClose}>×</button>
            </div>
            
            {/* 圖片容器：處理載入動畫 */}
            <div className={`poster-frame ${isImgLoaded ? 'loaded' : 'loading'}`}>
              <img 
                src={require(`${activePoster}`).default} 
                alt={activeTitle} 
                className="poster-img" 
                onLoad={() => setIsImgLoaded(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

<MovieListApp />

<style>{`
  /* --- 標籤分頁優化 --- */
  .tabs {
    display: flex !important;
    overflow-x: auto !important;
    white-space: nowrap !important;
    flex-wrap: nowrap !important;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tabs::-webkit-scrollbar { display: none; }

  /* --- 電影卡片網格 --- */
  .movie-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-top: 1.5rem;
  }

  /* 手機版網格調整：讓卡片在窄螢幕也能適當顯示 */
  @media (max-width: 480px) {
    .movie-grid {
      grid-template-columns: 1fr;
    }
  }

  .movie-card {
    border: 1px solid var(--ifm-color-emphasis-200);
    border-radius: 12px;
    padding: 1.25rem;
    background: var(--ifm-card-background-color);
    transition: all 0.25s ease;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .movie-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.12);
    border-color: var(--ifm-color-primary);
  }

  .movie-title {
    font-weight: 800;
    font-size: 1.1rem;
    color: var(--ifm-color-primary);
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--ifm-color-emphasis-100);
  }

  .movie-note {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--ifm-font-color-base);
    opacity: 0.9;
  }

  .load-more-btn {
    display: block;
    margin: 3rem auto;
    padding: 12px 40px;
    font-size: 0.8rem;
    font-weight: 500;
    background: transparent;
    border: 1px solid var(--ifm-font-color-base);
    color: var(--ifm-font-color-base);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    opacity: 0.7;
  }

  .load-more-btn:hover {
    opacity: 1;
    background: var(--ifm-font-color-base);
    color: var(--ifm-background-color);
  }

  /* --- Modal 彈窗核心修正 --- */
  .poster-modal-overlay {
    position: fixed; 
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex; 
    justify-content: center; 
    align-items: center;
    z-index: 1000; 
    backdrop-filter: blur(5px);
    padding: 20px; /* 防止邊緣貼齊螢幕 */
  }

  .poster-modal-content {
    background: var(--ifm-card-background-color);
    border-radius: 12px;
    width: 100%;
    max-width: 450px; /* 限制電腦版寬度，避免海報過大 */
    max-height: 90vh;
    padding: 1.25rem;
    animation: zoomIn 0.2s ease-out;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  }

  @keyframes zoomIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .modal-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 12px; 
  }

  .modal-title { 
    font-weight: bold; 
    color: var(--ifm-color-primary);
    font-size: 1.1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 80%;
  }

  .close-btn { 
    background: none; 
    border: none; 
    font-size: 1.8rem; 
    cursor: pointer; 
    color: var(--ifm-font-color-base);
    line-height: 1;
  }

  /* --- 圖片載入容器修正 --- */
  .poster-frame {
    position: relative;
    width: 100%;
    min-height: 200px; /* 降低最小高度初始值 */
    border-radius: 8px;
    overflow: hidden;
    background: var(--ifm-color-emphasis-200);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* 骨架屏閃爍 */
  .poster-frame.loading::after {
    content: "";
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    animation: skeleton-shimmer 1.5s infinite;
  }

  @keyframes skeleton-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .poster-img {
    width: 100%;
    height: auto;
    max-height: 70vh;
    border-radius: 8px;
    display: block;
    object-fit: contain; /* 確保不變形 */
    opacity: 0;
    transition: opacity 0.4s ease-in-out;
  }

  .poster-frame.loaded .poster-img {
    opacity: 1;
  }
  
  .poster-frame.loaded {
    background: transparent;
  }

  /* --- 手機版微調 --- */
  @media (max-width: 768px) {
    .poster-modal-overlay {
      padding: 10px;
    }
    .poster-modal-content {
      padding: 1rem;
      max-width: 95%; /* 手機版佔用較寬比例 */
    }
    .modal-title {
      font-size: 1rem;
    }
    .poster-img {
      max-height: 65vh; /* 給標題留點空間 */
    }
  }
`}</style>
