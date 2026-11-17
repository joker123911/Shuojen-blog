---
slug: /chess/queen-mate
title: '殘局練習系列 01 -單后殺王'
sidebar_position: 9
description: '王后對單王的基本殺法，附可以直接對弈的互動棋盤。'
---
import ChessStudy from '@site/src/components/Chess/ChessStudy';
import QueenMateBoard from '@site/src/components/Chess/QueenMateBoard';
import { White } from '@site/src/components/Chess/ChessGame';

*最後更新：2026-11-16*

王＋后對單王是西洋棋最基本的殺法，學會後只要最後比對手多一隻兵升變，就可以單后殺王了。

來試試看吧！

<QueenMateBoard />


## 殺法說明

- **不要一直將軍**，后放在離黑王一個馬步的位置，限制它的範圍。
- 后跟著黑王，**把方框縮小**，逼到邊線。
- 黑王剩邊線兩格時，**后停下來，換王上來**。
- 每走一步后之前，先確認黑王**還有空格可以走**，避免逼和。

<White pgn={`[FEN "3k4/8/8/8/8/8/4Q3/3K4 w - - 0 1"]
1. Qb5 Ke7 2. Kd2 Kd6 3. Kd3 Ke7 4. Qc6 Kf7 5. Qd6 Ke8 6. Qc7 Kf8 7. Qd7 Kg8 8. Qe7 Kh8 9. Ke4 Kg8 10. Kf5 Kh8 11. Kf6 Kg8 12. Qg7#`} />

:::tip[無子可動平手]
當對手無子可動時，有被將軍就是**殺棋**，沒有被將軍就是**和棋**喔！
:::


