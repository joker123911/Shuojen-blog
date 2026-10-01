---
title: 開局研究功能測試
---

import { ChessStudyBlack } from '@site/src/components/Chess/ChessStudy';

這篇文章記錄我對抗 1.e4 的核心武器：**法蘭西防禦 (French Defense)**。我依據對手的不同回應，拆解成以下幾個主要變化分支。

> 💡 **操作指南**：
> - 點擊右側**著法樹中的任一步驟**可直接跳轉局面。
> - 支援點擊下方按鈕或使用鍵盤 **◀（左方向鍵）** 與 **▶（右方向鍵）** 步進。
> - 棋盤原生支援 Lichess 戰術箭頭與高亮方格，並可點擊右上角 **🔄 翻轉** 視角。

---

## 第一章：交換變化 (Exchange Variation)
當白棋選擇 3.exd5，局面會變得極度對稱。我們的目標是在穩固中尋找反擊，靈活調動輕子。

<ChessStudyBlack
  title="法蘭西防禦：交換變化"
  pgn="1. e4 e6 2. d4 d5 3. exd5 exd5 4. Nf3 Nf6 {此處一定要注意出動王翼子力，控制 e4 關鍵格 [%cal Gf6e4,Gf6d5] [%csl Ge4]} (4... Bd6 5. Bd3 Ne7 {黑方出象準備後續快速短易位 [%cal Ge7g8,Gd6f4]}) 5. Bd3"
/>

---

## 第二章：進兵變化 (Advance Variation)
當白棋走 3.e5 試圖封鎖中心。這是法蘭西防禦最經典的戰場！我們的核心戰略是**瘋狂進攻白棋的 d4 兵鏈基底**。

<ChessStudyBlack
  title="法蘭西防禦：進兵變化"
  pgn="1. e4 e6 2. d4 d5 3. e5 c5! {立刻反擊中心，破壞白棋的兵鏈結構！ [%cal Gc5d4] [%csl Gd4]} 4. c3 Nc6 {馬出動，第二重施壓 d4 弱點 [%cal Gc6d4]} 5. Nf3 Qb6! {后出動，形成標準的法蘭西施壓三角陣型！后、馬、兵三重集火 d4 格！ [%cal Gb6d4,Gc6d4,Gc5d4] [%csl Rd4,Gb6]}"
/>

---

## 第三章：塔拉什變化 (Tarrasch Variation)
白棋走 3.Nd2 是為了避免象被牽制，但同時也阻擋了白后對 d4 的防守，這條線考驗黑棋對中心動態的反擊時機。

<ChessStudyBlack
  title="法蘭西防禦：塔拉什變化"
  pgn="1. e4 e6 2. d4 d5 3. Nd2 c5! {立刻反擊中心！趁白棋馬在 d2 擋住后視線時敲開中心 [%cal Gc5d4] [%csl Gd4]} 4. exd5 Qxd5 {后來到中心，且白棋短時間內無法走出 Nc3 來抓后（因為馬在 d2） [%csl Gd5,Rd2]}"
/>