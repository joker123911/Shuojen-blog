---
title: 'Gboard-patches 使用指南'
tags: ['tool']
date: 2026-09-18
rss_date: '2026-09-18T21:54:31+08:00'
---

由 jasonwu1994 大大開源的[「Gboard-patches」](https://github.com/jasonwu1994/Gboard-patches)是我最近發現[^1]的好用 android 輸入法。

以往我都是使用下面這款，早已沒在更新的舊版注音輸入法，只為了注音上下滑動輸入英文的功能，直到我發現了這個專案，保留了過去好用的滑動輸入，並且有了更多新功能，它的安裝使用是基於 Morphe（類似 ReVanced 的應用修補框架）所開發的一組官方 Gboard 增強補丁。

<img src={require('./apk.png').default} width="50" alt="img" />
▲舊版注音輸入法

## 先介紹我最愛的幾個功能

1. 上下滑動輸入英文

<video controls width="320">
    <source src="https://media.shuojen.com/video/english.mp4" type="video/mp4" />

    抱歉，您的瀏覽器不支援內嵌影片。
</video>

2. 「ㄥ」往上滑簡繁轉換  

<video controls width="320">
    <source src="https://media.shuojen.com/video/chinese.mp4" type="video/mp4" />

    抱歉，您的瀏覽器不支援內嵌影片。
</video>

3. 即時打字翻譯

<video controls width="320">
    <source src="https://media.shuojen.com/video/translate.mp4" type="video/mp4" />

    抱歉，您的瀏覽器不支援內嵌影片。
</video>

4. 語音輸入自動判斷標點

<video controls width="320">
    <source src="https://media.shuojen.com/video/voice.mp4" type="video/mp4" />

    抱歉，您的瀏覽器不支援內嵌影片。
</video>

5. 海量 emoji 與 GIF

<img src={require('./001.webp').default} width="320" alt="img" />


## 簡易安裝流程

這個專案遵循 GPL-3.0 開源協議，完全免費且代碼透明

1. 首先準備好[ Morphe 修補工具](https://morphe.software/)，這個工具的使用邏輯是安裝官方的 APK 程式，再以作者寫好的補丁新增各種新功能。

2. 下載官方 Gboard APK，為了使用語音輸入功能，我下載的版本是這個 [Gboard](https://www.apkmirror.com/apk/google-inc/gboard/gboard-the-google-keyboard-18-0-3-954559732-release/gboard-the-google-keyboard-18-0-3-954559732-release-arm64-v8a-2-android-apk-download/)，語音需要下載標記為 bundle 的 APKM，下載後先不要安裝。

3. 打開 jasonwu 大大的[ github 專案 ](https://github.com/jasonwu1994/Gboard-patches)，點 README 裡的[ Open in Morphe](https://morphe.software/add-source?github=jasonwu1994/Gboard-patches)。

4. 選擇剛才下載的 Gboard 開始修補

修補完就可以使用了，關於語音功能的設定，可以詳見註腳的第二篇文章，照原作者的說明操作，雖然我沒有成功，進階功能一樣是反灰的狀態，但是其實使用起來已經有標點符號了。

不過我很少用語音，總覺得思考太慢跟不上語音，打字的節奏比較剛好。

[^1]:感謝 jasonwu 大大在 ptt 上的推廣，[這篇](https://www.ptt.cc/bbs/MobileComm/M.1775598237.A.888.html)還有[這篇](https://www.ptt.cc/bbs/MobileComm/M.1785803475.A.292.html)幫助很大。
