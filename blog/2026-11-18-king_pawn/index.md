---
title: '殘局練習系列 03 -王兵殘局'
tags: ["chess"]
date: 2026-11-18
rss_date: '2026-11-18T10:22:42+08:00'
---
import { White, Black } from '@site/src/components/Chess/ChessGame';
import PawnEndgameBoard from '@site/src/components/Chess/PawnEndgameBoard';

:::info
此文章同步到[興趣區](/docs/chess/king-pawn)。
:::

王＋兵對單王是所有兵殘局的基礎，同一個局面，**輪到誰走**就可能決定勝負。下面這個局面白先可以贏，黑先卻可以守和。

來試試看吧！

**進攻**：你執白，把兵送到底線並殺王。

<PawnEndgameBoard mode="attack" />

**守和**：你執黑，守成和棋。

<PawnEndgameBoard mode="defend" />


## 進攻方：怎麼贏

- 兵在第 2～4 橫線時，兵前面兩格和它的左右兩格叫做**關鍵格**，白王只要站上關鍵格就一定能贏，例如 c2 兵的關鍵格是 b4、c4、d4。
- **王走在兵前面**，不要急著推兵。
- 跟黑王**對王**，逼黑王讓路，王再往前走。
- 王卡進第 7 橫線，就能順利把兵推進升變。

<White pgn={`[FEN "8/8/8/1k6/8/4K3/2P5/8 w - - 0 1"]
1. Kd4 Kc6 2. Kc4 Kd6 3. Kb5 Kc7 4. Kc5 Kd7 5. Kb6 Kc8 6. c4 Kb8 7. c5 Kc8 8. Kc6 Kd8 9. Kb7 Kd7 10. c6+ Kd6 11. c7 Ke7 12. c8=Q`} />


## 守和方：怎麼守和

- 黑王**搶先站上關鍵格**，擋在兵前面。
- 一直**擋在兵的正前方**，白王靠近時就跟它**對王**。
- 被將軍要後退時，**直直往後退**，不要往旁邊躲，才能在底線搶回對王。
- 撐到最後，白方只能逼和，或是放棄兵。

<Black pgn={`[FEN "8/8/8/1k6/8/4K3/2P5/8 b - - 0 1"]
1... Kc4 2. Kd2 Kd4 3. c3+ Kc4 4. Kc2 Kc5 5. Kd3 Kd5 6. c4+ Kc5 7. Kc3 Kc6 8. Kd4 Kd6 9. c5+ Kc6 10. Kc4 Kc7 11. Kd5 Kd7 12. c6+ Kc7 13. Kc5 Kc8 14. Kd6 Kd8 15. c7+ Kc8 16. Kc6`} />

:::tip[邊兵例外]
a、h 線的兵（邊兵）只要黑王能躲進兵前面的角落，就算白王在前面也贏不了，幾乎都是和棋。
:::

