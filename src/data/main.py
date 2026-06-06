import tkinter as tk
from tkinter import ttk, messagebox
import os
import requests
import threading
import re  # 新增：用於解析與排序 JS 內容

# ==========================================
# 檔案路徑設定
# ==========================================
MOVIE_JS_PATH = "movies.js" 
ANIME_JS_PATH = "anime.js"
SERIES_JS_PATH = "series.js"

# ==========================================
# TMDB API Key
# ==========================================
TMDB_API_KEY = "728ef67fd1e7160cbe667eed11549e19"

def on_mode_change(event):
    """當切換模式時，調整 UI 顯示"""
    mode = mode_combobox.get()
    if mode == "電影模式 (Movie)":
        lbl_category.config(text="選擇類別：")
        category_combobox.config(values=[
            "歐美電影 (westernMovies)", 
            "亞洲電影 (asiaMovies)", 
            "童年港片 (hongkongMovies)", 
            "動畫電影 (animeMovies)"
        ])
        category_combobox.current(0)
        lbl_score.place(x=30, y=155)
        entry_score.place(x=120, y=155)
    elif mode == "動漫模式 (Anime)":
        lbl_category.config(text="選擇等級：")
        category_combobox.config(values=["SSS", "SS", "S", "A", "B"])
        category_combobox.current(0)
        # 動漫模式隱藏評分
        lbl_score.place_forget()
        entry_score.place_forget()
    elif mode == "影集模式 (Series)":
        lbl_category.config(text="選擇等級：")
        category_combobox.config(values=["SSS", "SS", "S", "A", "B"])
        category_combobox.current(0)
        # 影集模式隱藏評分
        lbl_score.place_forget()
        entry_score.place_forget()

def add_data_click():
    mode = mode_combobox.get()
    
    if mode == "電影模式 (Movie)":
        process_movie()
    elif mode == "動漫模式 (Anime)":
        process_anime()
    elif mode == "影集模式 (Series)":
        process_series()

def process_movie():
    category_map = {
        "歐美電影 (westernMovies)": "westernMovies",
        "亞洲電影 (asiaMovies)": "asiaMovies",
        "童年港片 (hongkongMovies)": "hongkongMovies",
        "動畫電影 (animeMovies)": "animeMovies"
    }
    selected_cat = category_combobox.get()
    if selected_cat not in category_map:
        messagebox.showwarning("警告", "請選擇有效的電影類別！")
        return

    category_var = category_map[selected_cat]
    title = entry_title.get().strip()
    score = entry_score.get().strip() or "7.0"
    note = text_note.get("1.0", tk.END).strip()

    if not title or not note:
        messagebox.showwarning("警告", "電影名與心得不可為空！")
        return

    btn_submit.config(text="下載處理中...", state=tk.DISABLED)
    threading.Thread(
        target=save_worker, 
        args=("movie", category_var, title, score, note, None),
        daemon=True
    ).start()

def process_anime():
    tier = category_combobox.get()
    title = entry_title.get().strip()
    note = text_note.get("1.0", tk.END).strip()

    if not title or not note:
        messagebox.showwarning("警告", "動畫名與心得不可為空！")
        return

    btn_submit.config(text="下載處理中...", state=tk.DISABLED)
    threading.Thread(
        target=save_worker, 
        args=("anime", "animeList", title, None, note, tier),
        daemon=True
    ).start()

def process_series():
    tier = category_combobox.get()
    title = entry_title.get().strip()
    note = text_note.get("1.0", tk.END).strip()

    if not title or not note:
        messagebox.showwarning("警告", "影集名與心得不可為空！")
        return

    btn_submit.config(text="下載處理中...", state=tk.DISABLED)
    threading.Thread(
        target=save_worker, 
        args=("series", "animeList", title, None, note, tier),
        daemon=True
    ).start()

def save_worker(data_type, target_var, title, score, note, tier):
    # 路徑與格式設定
    if data_type == "movie":
        js_file = MOVIE_JS_PATH
        js_poster_path = f"./img/movie/{title}.jpg"
        save_dir = "../../docs/img/movie"
        new_entry = f'  {{ title: "{title}", score: {score}, note: "{note}", poster: "{js_poster_path}" }},'
        target_line = f"export const {target_var} = ["
        search_type = "movie"
        poster_langs = "zh-TW,en,null"
    elif data_type == "anime":
        js_file = ANIME_JS_PATH
        js_poster_path = f"./img/anime/{title}.jpg"
        save_dir = "../../docs/img/anime"
        new_entry = f'  {{ title: "{title}", note: "{note}", poster: "{js_poster_path}", tier: "{tier}" }}'
        target_line = "export const animeList = ["
        search_type = "multi"
        poster_langs = "ja,zh,en,null"
    else:  # series
        js_file = SERIES_JS_PATH
        # 注意：你的 series.js 範例是用 .webp，若要配合 TMDB 下載轉存，這裡統一先用 .jpg 格式，或可維持原樣
        js_poster_path = f"./img/series/{title}.jpg"
        save_dir = r"C:\Users\shuojen\Desktop\Shuojen-blog\docs\img\series"
        new_entry = f'  {{ title: "{title}", note: "{note}", poster: "{js_poster_path}", tier: "{tier}" }}'
        target_line = "export const animeList = ["
        search_type = "tv"  # TMDB 搜尋影集使用 tv 類型
        poster_langs = "zh-TW,en,null"

    save_poster_path = os.path.join(save_dir, f"{title}.jpg")

    # TMDB 下載邏輯
    if TMDB_API_KEY:
        try:
            os.makedirs(save_dir, exist_ok=True)
            search_url = f"https://api.themoviedb.org/3/search/{search_type}"
            search_params = {"api_key": TMDB_API_KEY, "query": title, "language": "zh-TW"}
            search_resp = requests.get(search_url, params=search_params)
            search_data = search_resp.json()
            
            if search_data.get("results"):
                res = search_data["results"][0]
                m_id = res["id"]
                m_type = res.get("media_type", search_type) if search_type == "multi" else search_type
                
                img_api_url = f"https://api.themoviedb.org/3/{m_type}/{m_id}/images"
                img_params = {"api_key": TMDB_API_KEY, "include_image_language": poster_langs}
                img_data = requests.get(img_api_url, params=img_params).json()
                
                poster_path = None
                if img_data.get("posters"):
                    poster_path = img_data["posters"][0]["file_path"]
                else:
                    poster_path = res.get("poster_path")

                if poster_path:
                    img_bytes = requests.get(f"https://image.tmdb.org/t/p/w780{poster_path}").content
                    with open(save_poster_path, "wb") as f:
                        f.write(img_bytes)
        except Exception as e:
            print(f"Poster Error: {e}")

    # 寫入檔案邏輯
    try:
        with open(js_file, 'r', encoding='utf-8') as file:
            content = file.read()

        if data_type == "movie":
            # 電影模式：維持原樣，直接在 array 開頭插入
            if target_line not in content:
                root.after(0, lambda: messagebox.showerror("錯誤", f"找不到 '{target_line}'"))
                root.after(0, reset_ui_on_error)
                return
            new_content = content.replace(target_line, f"{target_line}\n{new_entry}")
        
        else:
            # 動漫與影集模式：執行 Tier 排序邏輯
            tier_priority = {"SSS": 0, "SS": 1, "S": 2, "A": 3, "B": 4}
            
            # 使用 Regex 抓取 export const animeList = [ ... ]; 之間的內容
            pattern = r"(export const animeList = \[)(.*?)(\];)"
            match = re.search(pattern, content, re.DOTALL)
            
            if not match:
                root.after(0, lambda: messagebox.showerror("錯誤", "找不到 'export const animeList = [];' 格式"))
                root.after(0, reset_ui_on_error)
                return
            
            header, body, footer = match.groups()
            
            # 抓取現有的所有物件 { ... }
            existing_items = re.findall(r'\{[^{}]*?\}', body, re.DOTALL)
            
            # 移除舊物件尾巴的逗號，統一格式
            processed_items = [item.strip().rstrip(',') for item in existing_items]
            processed_items.append(new_entry.strip())
            
            # 排序函數：依照 tier_priority 排序
            def sort_key(item_str):
                m = re.search(r'tier:\s*"(SSS|SS|S|A|B)"', item_str)
                tier_val = m.group(1) if m else "B"
                return tier_priority.get(tier_val, 99)
            
            processed_items.sort(key=sort_key)
            
            # 重新組合成 JS 格式字串
            new_body_content = "\n  " + ",\n  ".join(processed_items) + "\n"
            new_content = re.sub(pattern, f"{header}{new_body_content}{footer}", content, flags=re.DOTALL)

        with open(js_file, 'w', encoding='utf-8') as file:
            file.write(new_content)

        root.after(0, lambda: reset_ui_on_success(title, mode_combobox.get()))
    except Exception as e:
        root.after(0, lambda e=e: messagebox.showerror("錯誤", str(e)))
        root.after(0, reset_ui_on_error)

def reset_ui_on_success(title, mode):
    messagebox.showinfo("成功", f"已成功將《{title}》新增至 {mode}！")
    entry_title.delete(0, tk.END)
    entry_score.delete(0, tk.END)
    text_note.delete("1.0", tk.END)
    btn_submit.config(text="寫入檔案", state=tk.NORMAL)

def reset_ui_on_error():
    btn_submit.config(text="寫入檔案", state=tk.NORMAL)

# --- UI 建立 ---
root = tk.Tk()
root.title("多媒體資料新增工具")
root.geometry("450x450")
root.resizable(False, False)

style = ttk.Style()
style.configure("TLabel", font=("微軟正黑體", 11))
style.configure("TButton", font=("微軟正黑體", 11))

# 模式切換
ttk.Label(root, text="操作模式：").place(x=30, y=20)
mode_combobox = ttk.Combobox(root, values=["電影模式 (Movie)", "動漫模式 (Anime)", "影集模式 (Series)"], state="readonly", width=25)
mode_combobox.place(x=120, y=20)
mode_combobox.current(0)
mode_combobox.bind("<<ComboboxSelected>>", on_mode_change)

# 類別/等級選擇
lbl_category = ttk.Label(root, text="選擇類別：")
lbl_category.place(x=30, y=65)
category_combobox = ttk.Combobox(root, values=[
    "歐美電影 (westernMovies)", "亞洲電影 (asiaMovies)", "童年港片 (hongkongMovies)", "動畫電影 (animeMovies)"
], state="readonly", width=25)
category_combobox.place(x=120, y=65)
category_combobox.current(0)

# 標題
ttk.Label(root, text="標題名稱：").place(x=30, y=110)
entry_title = ttk.Entry(root, width=27)
entry_title.place(x=120, y=110)

# 評分 (動漫、影集模式會隱藏)
lbl_score = ttk.Label(root, text="評分(數字)：")
lbl_score.place(x=30, y=155)
entry_score = ttk.Entry(root, width=27)
entry_score.place(x=120, y=155)

# 心得
ttk.Label(root, text="心得備註：").place(x=30, y=200)
text_note = tk.Text(root, width=27, height=6, font=("微軟正黑體", 10))
text_note.place(x=120, y=200)

btn_submit = ttk.Button(root, text="寫入檔案", command=add_data_click)
btn_submit.place(x=175, y=360)

root.mainloop()