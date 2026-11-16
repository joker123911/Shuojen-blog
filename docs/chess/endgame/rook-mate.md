---
slug: /chess/rook-mate
title: '單車殺王'
sidebar_position: 10
description: '王車對單王的基本殺法，附可以直接對弈的互動棋盤。'
draft: true
---
import RookMateBoard from '@site/src/components/Chess/RookMateBoard';
import { White } from '@site/src/components/Chess/ChessGame';

*最後更新：2026-11-16*

王＋車對單王是[單后殺王](./queen-mate.md)之後的下一個基本殺法，車只能走直線，步數會比較多，但只要照著方法來，16 步內一定能殺。

來試試看吧！

<RookMateBoard />


## 殺法說明

- **車先切一條線**，把黑王關在棋盤的一邊。
- **王走上來**，跟黑王面對面（中間隔一格），這叫**對王**。
- 對王時**車將軍**，黑王就被逼退一排，車再往前切。
- 黑王不肯對王時，**車沿同一條線走一步等著**，逼黑王自己走進對王的位置。
- 黑王靠近車時，**把車移到另一邊遠一點**，不要被吃掉。
- 黑王被逼到邊線，對王時車將軍就是殺棋。

<White pgn={`[FEN "8/8/2k5/7R/3K4/8/8/8 w - - 0 1"]
1. Rg5 Kd6 2. Rg6+ Kd7 3. Kd5 Ke7 4. Ke5 Kf7 5. Ra6 Ke7 6. Ra7+ Kd8 7. Kd6 Ke8 8. Rh7 Kd8 9. Rh8#`} />

:::tip[無子可動平手]
當對手無子可動時，有被將軍就是**殺棋**，沒有被將軍就是**和棋**喔！
:::
