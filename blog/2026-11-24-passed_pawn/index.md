---
title: '殘局練習系列 06 -創造通路兵'
tags: ["chess"]
date: 2026-11-24
rss_date: '2026-11-24T21:19:32+08:00'
---
import { White } from '@site/src/components/Chess/ChessGame';
import ChessDiagram from '@site/src/components/Chess/ChessDiagram';
import PassedPawnBoard from '@site/src/components/Chess/PassedPawnBoard';

:::info
此文章同步到[興趣區](/docs/chess/passed-pawn)。
:::

下面這個局面，黑王走到 e4 攻擊 f4 兵。

<ChessDiagram fen="8/8/p5p1/3k4/1K3PP1/P7/8/8 b - - 0 1" arrows="Gd5e4" squares="Rf4" caption="黑先：1... Ke4 攻擊 f4" />


你執白，想辦法把兵升變再[單后殺王](/blog/2026/11/16/queen_mate)，試試看吧！

<PassedPawnBoard />

## 勝法說明

黑王走到 e4 之後，白方只有**一步**能贏，其他走法都是和棋。白方在王翼是 **2 對 1**，這一側就能**創造出通路兵**（前面和左右兩條直線都沒有敵兵擋的兵）。通路兵本身不一定要升變，只要把黑王引過去，白王就能去另一邊吃兵。

- **候選兵先走**：王翼的 f 兵前面沒有黑兵擋（g 兵前面有 g6 擋），f 兵就是「候選兵」，要由它先往前推。
- **2.f5**：f4 兵本來就要被吃，乾脆推上去換掉 g6 兵，3.gxf5 吃回之後，f5 就是一隻**通路兵**。
- **通路兵當誘餌**：黑王只能去吃 f5 兵，但這樣就離后翼很遠了。
- **白王吃后翼的兵**：趁黑王在王翼，白王 Ka5、Kxa6 吃掉 a6 兵，再護送 a 兵升變。

<White pgn={`[FEN "8/8/p5p1/3k4/1K3PP1/P7/8/8 b - - 0 1"]
1... Ke4 2. f5 gxf5 3. gxf5 Kxf5 4. Ka5 Ke4 5. Kxa6 Kd5 6. Kb6 Kd6 7. a4 Kd7 8. Kb7 Kd6 9. a5 Kc5 10. a6 Kb4 11. a7 Kb3 12. a8=Q`} />

:::tip[黑方不吃 f5]
如果黑方不走 gxf5，白方就 fxg6 吃掉 g6 兵，這隻 g 兵一樣是通路兵，黑王去追它，白王照樣去吃 a6；黑方走 g5 的話，f5 兵有 g4 兵保護，變成黑王吃不掉的通路兵。
:::

## 錯誤示範一：推錯兵

如果推的是 g 兵，2.g5? 之後 g5、g6 兩個兵互相擋住，**王翼再也做不出通路兵**，黑王吃掉 f4、g5 兩個兵，反而是黑方的 g 兵變成通路兵，最後雙方都升后，和棋。

<White pgn={`[FEN "8/8/p5p1/3k4/1K3PP1/P7/8/8 b - - 0 1"]
1... Ke4 2. g5 Kxf4 3. a4 Kxg5 4. a5 Kf4 5. Kc5 g5 6. Kb6 g4 7. Kxa6 g3 8. Kb7 g2 9. a6 g1=Q`} />

## 錯誤示範二：沒有吃回

2.f5 gxf5 之後，如果貪心走 3.g5? 想讓 g 兵往前衝，黑方的 f5 兵也變成通路兵了，雙方各自升后，又是和棋。**換兵之後要記得吃回**，讓黑方的兵消失。

<White pgn={`[FEN "8/8/p5p1/3k4/1K3PP1/P7/8/8 b - - 0 1"]
1... Ke4 2. f5 gxf5 3. g5 f4 4. g6 f3 5. a4 f2 6. g7 f1=Q`} />

:::tip[白先也一樣]
回到一開始的局面，如果輪到白方走，1.f5 一樣能贏；1.g5? 一樣把兵型鎖死，只能和棋。
:::
