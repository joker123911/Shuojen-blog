import os
import re
import requests

TMDB_API_KEY = "728ef67fd1e7160cbe667eed11549e19"
JS_FILE_PATH = "movies.js"

def clean_title(title):
    """清理電影標題，過濾系列作後綴以利精準搜尋"""
    t = title.replace("系列", "")
    t = re.sub(r'[\(（][^）\)]+版[\)傷]', '', t)
    t = re.sub(r'\s*\d+\s*[~～\-]\s*\d+', '', t)
    return t.strip()

def search_tmdb_movies(title):
    """從 TMDB 抓取前 4 筆候選電影資料"""
    search_title = clean_title(title)
    url = "https://api.themoviedb.org/3/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": search_title,
        "language": "zh-TW"
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("results", [])[:4]
    except Exception as e:
        print(f"\n[TMDB 連線錯誤] ({search_title}): {e}")
    return []

def main():
    if not os.path.exists(JS_FILE_PATH):
        print(f"錯誤：找不到 {JS_FILE_PATH} 檔案！")
        return

    print(f"正在讀取 {JS_FILE_PATH} 進行全量年份精準比對與校正...")
    with open(JS_FILE_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # 精準抓取每一個包含 { title: ... tags: [...] } 的完整物件區塊
    entry_pattern = r'(\{\s*title:\s*"([^"]+)"[\s\S]*?\})'
    
    def object_replacer(match):
        full_block = match.group(1)
        title = match.group(2)
        
        # 擷取心得備註以供對照
        note_match = re.search(r'note:\s*"([^"]+)"', full_block)
        note = note_match.group(1) if note_match else "無備註"
        
        # 擷取並剖析標籤
        tags_match = re.search(r'tags:\s*\[([^\]]*?)\]', full_block)
        if not tags_match:
            return full_block # 若無 tags 欄位則不變動
            
        existing_tags_str = tags_match.group(1)
        tags = re.findall(r'"([^"]+)"', existing_tags_str)
        
        # 移除既有的 4 位數舊年份（不論對錯，後面重新安插到最前面）
        tags = [t for t in tags if not re.match(r'^\d{4}$', t)]
        
        results = search_tmdb_movies(title)
        chosen_year = None
        
        # 策略判定：長度 > 2 且第一筆完全命中片名 -> 自動通過
        if results and len(title) > 2 and (results[0].get("title") == title or results[0].get("original_title") == title):
            release_date = results[0].get("release_date")
            if release_date and "-" in release_date:
                chosen_year = release_date.split("-")[0]
                print(f"【自動通過】{title} -> {chosen_year}")
        else:
            # 觸發互動比對模式
            print("\n" + "="*60)
            print(f"🎬 我的電影：【{title}】")
            print(f"📝 我的心得：{note}")
            print("-"*60)
            
            if not results:
                print("❌ TMDB 找不到任何相關電影。")
            else:
                print("🤖 TMDB 智慧候選清單：")
                for i, res in enumerate(results, 1):
                    t_title = res.get("title", "未知")
                    o_title = res.get("original_title", "未知")
                    r_date = res.get("release_date", "未知年份")
                    year = r_date.split("-")[0] if "-" in r_date else r_date
                    overview = res.get("overview", "無簡介內容。")
                    if len(overview) > 60:
                        overview = overview[:60] + "..."
                    print(f"  [{i}] {t_title} ({o_title}) - 📅 {year}")
                    print(f"      📄 簡介: {overview}")
            
            print("-"*60)
            while True:
                user_input = input(f"請選擇正確的項目 (1-{len(results)})，或直接輸入 4 位數年份，或按 Enter 跳過: ").strip()
                if not user_input:
                    print(f"➡️ 已選擇跳過 【{title}】")
                    break
                if user_input.isdigit() and len(user_input) == 4:
                    chosen_year = user_input
                    print(f"✍️ 已手動設定年份：{chosen_year}")
                    break
                if user_input.isdigit() and 1 <= int(user_input) <= len(results):
                    idx = int(user_input) - 1
                    r_date = results[idx].get("release_date")
                    if r_date and "-" in r_date:
                        chosen_year = r_date.split("-")[0]
                        print(f"✅ 已選擇 [{user_input}] -> {chosen_year}")
                    else:
                        print("⚠️ 該選項在 TMDB 上沒有對應年份，請手動輸入或跳過。")
                        continue
                    break
                print("❌ 輸入格式不正確，請重新輸入。")

        # 若有確認的年份，安插至最前端
        if chosen_year:
            tags.insert(0, chosen_year)
            
        # 重構該物件的 tags 區塊
        new_tags_str = f'tags: [{", ".join([f'"{t}"' for t in tags])}]'
        updated_block = re.sub(r'tags:\s*\[[^\]]*?\]', new_tags_str, full_block)
        return updated_block

    # 全局比對替換
    updated_content = re.sub(entry_pattern, object_replacer, content)

    # 寫回檔案
    with open(JS_FILE_PATH, "w", encoding="utf-8") as f:
        f.write(updated_content)

    print("\n🎉 恭喜！全量電影年份校正與比對流程已處理完畢！")

if __name__ == "__main__":
    main()