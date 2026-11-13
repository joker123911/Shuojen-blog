# 🛠️ 部落格維護腳本工具指南 (Scripts Manual)

本目錄存放用於本部落格（Docusaurus）日常寫作、排版校對、資料索引生成與自動化發布的各項腳本工具。

---

## 📑 目錄

1. [中文文案排版檢查與修復工具 (`check-typography.js`)](#1-中文文案排版檢查與修復工具-check-typographyjs)
   * [只看有差異的檔案清單 (不印出大量細節)](#-只看有差異的檔案清單-不印出大量細節)
   * [單篇新文章檢查與修復 (保留舊文原始風味)](#-單篇新文章檢查與修復-保留舊文原始風味)
   * [依年份/月份篩選檢查](#-依年份月份篩選檢查)
   * [全站檢查與總結](#-全站檢查與總結)
   * [配合 Git 安全操作建議](#-配合-git-安全操作建議)
2. [日常寫作與發布工具](#2-日常寫作與發布工具)
   * [連結失效檢查 (`check-broken-links.js`)](#連結失效檢查-check-broken-linksjs)
   * [新增文章範本 (`new-post.js`)](#新增文章範本-new-postjs)
   * [全自動推送發布 (`push.js`)](#全自動推送發布-pushjs)
3. [資料生成與靜態索引腳本](#3-資料生成與靜態索引腳本)

---

## 1. 中文文案排版檢查與修復工具 (`check-typography.js`)

依據《[中文文案排版指北](https://github.com/sparanoid/chinese-copywriting-guidelines)》標準設計，支援完整的排版自動化檢查與修正：

* **中英文空格**：中文與英文字母之間自動加空格（如 `在 LeanCloud 上`）。
* **中數空格**：中文與數字之間自動加空格（如 `花了 5000 元`），並支援 `%` 與 `°C` 等單位例外。
* **全形中文標點**：中文句中的半形逗號、問號、驚嘆號、冒號安全轉為全形（`，` `？` `！` `：`），並智慧保護表情符號（如 `:-D`、`:P`）與小數點/版號。
* **全形數字轉半形**：將 `０-９` 自動轉為標準半形 `0-9`。
* **全形標點不加多餘空格**：自動清除全形標點符號前後誤打的空格及行尾多餘空白。
* **專有名詞標準大小寫**：自動校正常見名詞（如 `GitHub`、`YouTube`、`JavaScript`、`iOS`、`macOS` 等）。
* **行內程式碼間隔**：在行內代碼 `` `code` `` 與中文之間保持適當空格。

> 💡 **核心原則**：若您希望**保留早期歷史文章的原始格式**，請避免直接執行全站 `--fix`，而是利用**路徑篩選**或**只修復特定檔案**。

---

### 🚀 Push 前的自動檢查與 `--changed` 模式

在執行 `npm run push` 時，系統會自動依序執行：
1. **連結有效性檢查** (`check-broken-links.js`)
2. **本次變動文章排版檢查** (`check-typography.js --changed`)

> 🌟 **無痛發布設計**：
> * 系統會自動檢查連結（死連結、localhost 測試網址、絕對網域）與本次新寫/變動文章的中文排版！
> * 沒動到的歷史舊文章**完全不受影響**，絕不會中斷您的發布流程。
> * 若檢查發現任何問題（例如誤留 localhost 測試連結、或新文章缺少空格），只需輸入極簡指令：
>   ```bash
>   npm run fix
>   ```
>   一秒自動完成**修正 localhost 連結**與**修復新文章中文排版**！

---

### 🔍 只看有差異的檔案清單 (不印出大量細節)

若全站有許多舊文章有微小差異，但您只想快速知道「到底是哪些檔案不符規範」，可以使用 `--files-only`（簡寫 `-l`）：

```bash
# 方法 1：使用 npm script
npm run check:text:list

# 方法 2：直接執行 node
node scripts/check-typography.js --files-only

# 或簡寫
node scripts/check-typography.js -l
```

**輸出範例：**
```text
🔍 開始檢查中文文案排版格式 (檢查模式)...
目標檔案數量: 372

  blog/2026-10-02-attachment-to-goodness/index.md (1 處待修正)
  blog/2026-10-04-phone/index.md (2 處待修正)
  blog/2026-10-09-meetup/index.md (1 處待修正)
  ...
```

---

### ✍️ 單篇新文章檢查與修復 (保留舊文原始風味)

當您剛寫完一篇新文章，只想針對該篇進行檢查與排版修復時：

#### 步驟 1：檢查該篇文章排版
```bash
# 指定文章資料夾或檔案路徑
node scripts/check-typography.js blog/2026-10-18-chess
```

#### 步驟 2：只修復該篇文章（舊文完全不受影響）
```bash
node scripts/check-typography.js --fix blog/2026-10-18-chess
```

---

### 📅 依年份/月份篩選檢查

腳本支援智慧關鍵字過濾，可快速限定只掃描某一時期：

```bash
# 只掃描 2026 年的所有文章
node scripts/check-typography.js 2026

# 只掃描 2026 年 10 月份的文章
node scripts/check-typography.js 2026-10

# 搭配只列出檔案清單
node scripts/check-typography.js 2026 -l

# 僅自動修復 2026 年的文章（更早的歷史文章保持原樣）
node scripts/check-typography.js --fix 2026
```

---

### 📊 全站檢查與總結

```bash
# 檢查全站並印出彩色修改前後對照 (Diff)
npm run check:text

# 僅印出全站統計數據摘要（不印出任何文章內容）
npm run check:text -- --summary
```

> ⚠️ **慎用指令**：
> ```bash
> npm run fix:all
> ```
> 此指令會**一次性修復全站所有 372 篇檔案**。若您確定想保留歷史舊文的原汁原味，請不要執行此指令。

---

### 🛡️ 配合 Git 安全操作建議

如果您在測試時不小心更動到想要保留原狀的舊檔案：

```bash
# 1. 檢視目前有哪些檔案被修改
git status -s

# 2. 僅列出有變動的檔案名稱
git diff --name-only

# 3. 檢視某一篇文章具體被改了什麼
git diff blog/2026-10-04-phone/index.md

# 4. 若不小心誤改了早期文章，一秒還原它：
git checkout -- blog/2012-05-20-friend/

# 5. 還原整個資料夾（例如還原 2012~2024 年的所有文章）：
git checkout -- blog/2012* blog/2013* blog/2014*
```

---

## 2. 日常寫作與發布工具

### 連結失效檢查 (`check-broken-links.js`)
檢查全站內部相對連結、圖片參照、靜態資源路由是否存在，避免出現 404。
```bash
npm run check
# 或自動修正 localhost 與內部絕對網域為相對路徑：
node scripts/check-broken-links.js --fix
```

### 新增文章範本 (`new-post.js`)
快速互動式建立符合規範的 Markdown 文章目錄與 Frontmatter 標頭。
```bash
npm run new
```

### 推送發布 (`push.js`)
依序執行連結與排版檢查、文章格式嚴格檢查（`prepare-data.js --strict`，有格式異常就中止）、完整建置（`npm run build`），全部通過後才提交並 push 到遠端。

* **發佈時間**：輸入 commit 訊息確認後，會替這次**新增**的 `blog/`、`photoblog/` 文章補上 `rss_date`（push 當下的台灣時間；文章日期在未來則為該日 00:00:01），`now.md` 內容有改動時也會更新「最後更新」日期。已提交過的舊文不會被補，取消提交時不會改動任何檔案。`npm start` / `npm run build` 不會改寫任何 md。
* 只會 stage 白名單內的路徑（`blog/`、`photoblog/`、`docs/`、`src/`、`static/`、`scripts/`、`.github/` 與根目錄設定檔）；其他變更會列出提醒，但不會被提交。
* 提交前會列出完整的檔案清單，再詢問 commit 訊息（留空即取消）。
* 建置太久時可用 `npm run push:fast` 跳過建置（仍會做檢查、更新資料檔與棋局評估）；GitHub Actions 仍會在推送後跑一次完整建置。

```bash
npm run push
npm run push:fast
node scripts/push.js -m "訊息"   # 不跑檢查，直接提交推送
```

---

## 3. 資料生成與靜態索引腳本

資料生成由 npm 的 pre 鉤子自動串起來，平常不需手動呼叫：

* `npm start`：先跑 `npm run data`（`prepare-data` → 照片縮圖 → 海報縮圖 → 搜尋索引），再啟動開發伺服器；不跑棋局評估。
* `npm run build`（Cloudflare 與 CI 也是跑這個）：先跑 `npm run data`，再跑棋局評估，最後才 `docusaurus build`。
* `npm run push` 會包含 build；`push:fast` 跳過 build。

也可單獨執行：

| 指令 / 腳本 | 說明 |
| :--- | :--- |
| `npm run data` | 產生前台所需資料、縮圖與搜尋索引（輸出到 `src/data/generated/`、`static/`） |
| `npm run gen-chess` | 西洋棋局 evaluation 靜態分析計算 (`scripts/gen-chess-eval.js`) |
| `node scripts/gen-search-index.js` | 產生搜尋引擎靜態索引檔案 |
| `node scripts/optimize-images.js` | 圖片批次無損壓縮最佳化 |

### 排名清單維護工具（Python，`scripts/rankings/`）

手動維護電影 / 動漫 / 劇集 / 拉麵清單用，**不屬於 build 管線**，不會被 `npm run build` 呼叫。它們會讀寫 `src/data/` 下的 `movies.js`、`anime.js`、`series.js`、`ramen.js`，並把海報存到 `docs/img/`。

| 腳本 | 說明 |
| :--- | :--- |
| `rankings/main.py` | 從 TMDB 補齊清單資料與海報（需在根目錄 `.env` 設定 `TMDB_API_KEY`） |
| `rankings/score_adjuster.py` | 以 Elo 兩兩比對調整電影分數（視窗介面，進度存在 `rankings/progress.json`） |
| `rankings/year.py` | 補齊 `movies.js` 的年份 |

依賴安裝：`pip install -r scripts/requirements.txt`（`score_adjuster.py` 另需系統內建的 tkinter）。

> RSS 發佈時間（`rss_date`）由 `npm run push` 自動補上（見上方「推送發布」），原本的手動工具 `sync-build-time.js` 已移除。
