import React from 'react';
import Head from '@docusaurus/Head';
import posterData from '@site/src/data/generated/nowPosterData.json';
import styles from './styles.module.css';

// 單欄直書文字均勻分佈於 [yStart, yEnd] 區間，頂底完全貼齊
// 內建防擠碰撞保護：如果文字長度或字級過大，自動平滑調適字級，確保字與字之間絕不重疊
function VerticalColumn({ x, yStart, yEnd, text, fontSize, className, scaleX = 1 }) {
  const chars = Array.from(text || '');
  if (chars.length === 0) return null;
  const totalHeight = yEnd - yStart;

  // 防擠碰撞保護：確保每個字都有充足高度，絕不上下黏在一起
  const maxSafeFontSize = chars.length > 1
    ? totalHeight / (chars.length * 1.05)
    : Math.min(fontSize, totalHeight * 0.9);
  const safeFontSize = Math.min(fontSize, maxSafeFontSize);

  const step = chars.length > 1
    ? (totalHeight - safeFontSize * 0.85) / (chars.length - 1)
    : 0;

  return (
    <g className={className}>
      {chars.map((ch, idx) => {
        const cy = yStart + safeFontSize * 0.78 + idx * step;
        const isPunct = /[、，。！？：；「」『』（）—…]/.test(ch);
        return (
          <text
            key={idx}
            x={x}
            y={cy}
            fontSize={safeFontSize}
            textAnchor="middle"
            transform={
              scaleX !== 1
                ? `translate(${x}, ${cy}) scale(${scaleX}, 1) translate(${-x}, ${-cy})`
                : undefined
            }
            dy={isPunct ? -safeFontSize * 0.1 : 0}
          >
            {ch}
          </text>
        );
      })}
    </g>
  );
}

// 橫排雙端貼齊區塊（支援垂直拉伸，呈現經典 EVA 粗長宋體字形）
function StretchedLine({ x, y, width, fontSize, scaleY = 1, text }) {
  if (!text) return null;
  return (
    <g transform={scaleY !== 1 ? `translate(0, ${y}) scale(1, ${scaleY}) translate(0, ${-y})` : undefined}>
      <text
        x={x}
        y={y}
        fontSize={fontSize}
        textLength={width}
        lengthAdjust="spacingAndGlyphs"
      >
        {text}
      </text>
    </g>
  );
}

function formatEvaDate(dateStr) {
  const m = String(dateStr || '2026-10-20').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '10月20日,西曆2026年';
  const year = m[1];
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  return `${month}月${day}日,西曆${year}年`;
}

// 單詞挑選器：嚴格不重複，且避免子字串碰撞
function createTermPicker(terms = []) {
  const used = [];
  return function pick(minLen, maxLen, fallback = '') {
    for (const item of terms) {
      const text = item?.text;
      if (!text) continue;
      if (text.length < minLen || text.length > maxLen) continue;
      const hasOverlap = used.some((u) => u === text || u.includes(text) || text.includes(u));
      if (!hasOverlap) {
        used.push(text);
        return text;
      }
    }
    if (fallback && !used.includes(fallback)) {
      used.push(fallback);
    }
    return fallback;
  };
}

// 金句挑選器：嚴格不重複，確保每句話全圖唯一
function createQuotePicker(quotes = []) {
  const used = [];
  return function pickQuote(predicate, fallback = '') {
    for (const q of quotes) {
      if (!q) continue;
      const hasOverlap = used.some((u) => u === q || u.includes(q) || q.includes(u));
      if (!hasOverlap && predicate(q)) {
        used.push(q);
        return q;
      }
    }
    if (fallback && !used.includes(fallback)) {
      used.push(fallback);
    }
    return fallback;
  };
}

export default function NowEvaPoster() {
  const terms = posterData?.terms || [];
  const quotes = posterData?.quotes || [];
  const latestDateHeader = formatEvaDate(posterData?.generatedAt || posterData?.latestPostDate);

  const pick = createTermPicker(terms);
  const pickQuote = createQuotePicker(quotes);

  // ============================================================================
  // 嚴格依照「視覺字級由大到小」的權重順序挑選詞彙，確保最重要的近況永遠在最高視線！
  // ============================================================================

  // 【第 1 級：中央雙行核心巨字 (fontSize 112)】 -> 最高權重的 4~6 字核心近況
  const centerHero1 = pick(4, 6, '陳思宏小說');
  const centerHero2 = pick(4, 6, '滿血復活');

  // 【第 2 級：左下雙行橫排巨字 (fontSize 88)】 -> 取前兩名 3 字代表性近況（限定 3 字，避免拉伸變形）
  const bottomLeftBig1 = pick(3, 3, '鬼地方');
  const bottomLeftBig2 = pick(3, 3, '西洋棋');

  // 【第 3 級：右上雙行大標 (fontSize 58)】 -> 次高權重的 4~6 字近況
  const topRight1 = pick(4, 6, '桌球拉下旋');
  const topRight2 = pick(4, 6, '格友見面會');

  // 【第 4 級：右側四行大字疊塊 (fontSize 50)】 -> 取 4~6 字高權重重要作品或事件
  const rightStack1 = pick(4, 6, '王兵車兵殘局');
  const rightStack2 = pick(4, 6, '德布西華麗曲');
  const rightStack3 = pick(4, 6, '陳綺貞太聰明');
  const rightStack4 = pick(4, 6, '茶山謎路');

  // 【第 5 級：右上單直列 (fontSize 32)】
  const topVert1 = pick(4, 5, '野生狂廚');

  // 【第 6 級：中上寬幅作品四連單詞 (fontSize 36)】
  const upperMidLine1 = `${pick(2, 6, '六人行')}・${pick(2, 6, '宿劫')}・${pick(2, 6, '凶器')}・${pick(4, 7, 'FX戰士韭留美')}`;

  // 【第 7 級：左中四行標題清單 (fontSize 34 & 28)】
  const midLeft1 = pick(5, 7, '峻寶寶雙料冠軍');
  const midLeft2 = pick(5, 7, '畫完這個再去死');
  const midLeft3 = pick(4, 6, '穹廬下的魔女');
  const midLeft4 = pick(4, 6, '麗茲波頓的故事');

  // 【第 8 級：右上雙行作品組 (fontSize 23)】
  const upperRightNote1 = `${pick(3, 6, '道楽製麵所')}・${pick(3, 6, '自動鉛筆短評')}`;
  const upperRightNote2 = `${pick(3, 6, '我推的部落格')}・${pick(3, 6, '羽畠食堂拉麵')}`;

  // 【第 9 級：左下橫排單詞組 (fontSize 22)】（總長控制在約 14 字內，避免被壓扁）
  const bottomLeftHorizontal = `${pick(3, 5, '超美味貝果')}・${pick(3, 5, '藍色監獄')}・${pick(2, 4, '踩地雷')}`;

  // 【第 10 級：右下中段作品四連單詞 (fontSize 32)】
  const bottomMidLine = `${pick(3, 5, '藍色監獄')}・${pick(3, 5, '黑暗智宅')}・${pick(3, 5, '臺灣漫遊錄')}・${pick(3, 5, '檔車推發記')}`;

  // 【第 11 級：最底部五連單詞基座 (fontSize 23)】
  const bottomDense = `${pick(2, 6, '老野狼')}・${pick(2, 6, '野獸之心')}・${pick(2, 6, '飛躍奇蹟')}・${pick(2, 6, '吉伊卡哇')}・${pick(2, 6, '活俠傳')}`;

  // ============================================================================
  // 金句挑選（依區塊寬高精準配對字數，確保長句放寬橫幅、短句放直欄與巨字）
  // ============================================================================
  const quoteTopLong = pickQuote(
    (q) => q.length >= 18 && q.length <= 28,
    '原來有些事怎麼樣努力都是不可能達成的，退一步尋找別的解法才是正確策略'
  );
  const bottomMidQuoteLong = pickQuote(
    (q) => q.length >= 16 && q.length <= 26,
    '好久沒有看劇看到大笑出來，且看且珍惜'
  );
  const upperMidQuote = pickQuote(
    (q) => q.length >= 14 && q.length <= 22,
    '拜託上保護止損吧求你了看的背脊發涼'
  );
  const bottomRightGiant = pickQuote(
    (q) => q.length >= 8 && q.length <= 12,
    '騎完車要記得拔鑰匙！'
  );
  const leftWingVert = pickQuote(
    (q) => q.length >= 9 && q.length <= 13,
    '中午只能自立自強一個人健身'
  );
  const centerRightVert = pickQuote(
    (q) => q.length >= 10 && q.length <= 16,
    '人太執著，心盲無明，是會殺人的。'
  );

  return (
    <>
    {/* 海報專用字體，只在有海報的頁面載入 */}
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700;900&display=swap" />
    </Head>
    <div className={styles.posterContainer} aria-label="近90天部落格與興趣清單文字雲海報">
      <svg
        viewBox="0 0 1200 840"
        className={styles.posterSvg}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ================= ZONE 1: 頂部日期大標 + 右上直書 + 右上雙行大標 ================= */}
        {/* 1A: 更新當天日期 */}
        <StretchedLine
          x={28}
          y={126}
          width={812}
          fontSize={92}
          scaleY={1.3}
          text={latestDateHeader}
        />
        {/* 1A-sub: 【金句 1】頂部長句哲理 */}
        <StretchedLine
          x={28}
          y={176}
          width={812}
          fontSize={21}
          scaleY={1.1}
          text={quoteTopLong}
        />

        {/* 1B: 右上單直列作品 */}
        <VerticalColumn x={872} yStart={32} yEnd={186} text={topVert1} fontSize={32} scaleX={0.95} />

        {/* 1C: 右上雙行大標單詞 */}
        <StretchedLine x={912} y={104} width={260} fontSize={58} scaleY={1.18} text={topRight1} />
        <StretchedLine x={912} y={182} width={260} fontSize={58} scaleY={1.18} text={topRight2} />

        {/* ================= ZONE 2: 中上寬幅作品橫帶與金句 ================= */}
        {/* 2A: 中上寬幅作品串聯單詞 + 【金句 2】引號金句 */}
        <StretchedLine
          x={28}
          y={244}
          width={812}
          fontSize={36}
          scaleY={1.15}
          text={upperMidLine1}
        />
        <StretchedLine
          x={28}
          y={292}
          width={812}
          fontSize={28}
          scaleY={1.08}
          text={`「${upperMidQuote.replace(/[「」]/g, '')}」`}
        />

        {/* 2B: 右上雙行單詞組 */}
        <StretchedLine x={880} y={244} width={292} fontSize={23} scaleY={1.08} text={upperRightNote1} />
        <StretchedLine x={880} y={288} width={292} fontSize={23} scaleY={1.08} text={upperRightNote2} />

        {/* ================= ZONE 3: 中央核心巨字與左右側翼 ================= */}
        {/* 3A: 左側直書【金句 3】 */}
        <VerticalColumn
          x={50}
          yStart={326}
          yEnd={540}
          text={leftWingVert}
          fontSize={22}
        />

        {/* 3B: 左翼四行精選作品清單（間距充足、閱讀清晰） */}
        <StretchedLine x={84} y={358} width={236} fontSize={34} scaleY={1.1} text={midLeft1} />
        <StretchedLine x={84} y={416} width={236} fontSize={34} scaleY={1.1} text={midLeft2} />
        <StretchedLine x={84} y={474} width={236} fontSize={30} scaleY={1.08} text={midLeft3} />
        <StretchedLine x={84} y={530} width={236} fontSize={30} scaleY={1.08} text={midLeft4} />

        {/* 3D: 【中央雙行最高權重核心巨字】 */}
        <StretchedLine
          x={352}
          y={444}
          width={492}
          fontSize={112}
          scaleY={1.16}
          text={centerHero1}
        />
        <StretchedLine
          x={352}
          y={574}
          width={492}
          fontSize={112}
          scaleY={1.16}
          text={centerHero2}
        />

        {/* 3E: 中央巨字右側細直柱【金句 4】 */}
        <VerticalColumn
          x={868}
          yStart={326}
          yEnd={604}
          text={centerRightVert}
          fontSize={22}
        />

        {/* 3F: 右側四行大字疊塊（間距舒展、醒目） */}
        <StretchedLine x={896} y={362} width={276} fontSize={50} scaleY={1.12} text={rightStack1} />
        <StretchedLine x={896} y={432} width={276} fontSize={50} scaleY={1.12} text={rightStack2} />
        <StretchedLine x={896} y={502} width={276} fontSize={50} scaleY={1.12} text={rightStack3} />
        <StretchedLine x={896} y={572} width={276} fontSize={50} scaleY={1.12} text={rightStack4} />

        {/* ================= ZONE 4: 底部區（防擠優化、絕無碰撞） ================= */}
        {/* 4A-頂: 左下橫排單詞組（位於清單與巨字之間） */}
        <StretchedLine
          x={28}
          y={584}
          width={292}
          fontSize={22}
          scaleY={1.08}
          text={bottomLeftHorizontal}
        />

        {/* 4A: 左下雙行橫排巨字（填滿左下角，與中央巨字呼應） */}
        <StretchedLine
          x={28}
          y={700}
          width={292}
          fontSize={84}
          scaleY={1.12}
          text={bottomLeftBig1}
        />
        <StretchedLine
          x={28}
          y={806}
          width={292}
          fontSize={84}
          scaleY={1.12}
          text={bottomLeftBig2}
        />

        {/* 4B: 右下頂部【金句 5】 */}
        <StretchedLine
          x={352}
          y={640}
          width={820}
          fontSize={28}
          scaleY={1.1}
          text={`「${bottomMidQuoteLong.replace(/[「」]/g, '')}」`}
        />

        {/* 4C: 右下中段四連單詞 */}
        <StretchedLine
          x={352}
          y={688}
          width={820}
          fontSize={30}
          scaleY={1.1}
          text={bottomMidLine}
        />

        {/* 4D: 【右下最大壓軸金句 6】（與上方單詞帶保留 ≥14px 間隙） */}
        <StretchedLine
          x={352}
          y={772}
          width={820}
          fontSize={60}
          scaleY={1.18}
          text={`「${bottomRightGiant.replace(/[「」]/g, '')}」`}
        />

        {/* 4E: 底部基座五連單詞 */}
        <StretchedLine
          x={352}
          y={816}
          width={820}
          fontSize={22}
          scaleY={1.08}
          text={bottomDense}
        />
      </svg>
    </div>
    </>
  );
}
