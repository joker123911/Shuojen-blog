import tkinter as tk
from tkinter import ttk, messagebox
import os
import requests  # 新增：用來向 TMDB 發送請求與下載圖片

# ==========================================
# 請確認這裡的檔名與您的目標 JS 檔案名稱一致
# ==========================================
JS_FILE_PATH = "movies.js" 

# ==========================================
# 請在這裡填入您的 TMDB API Key (v3 auth)
# ==========================================
TMDB_API_KEY = "728ef67fd1e7160cbe667eed11549e19"

def add_movie():
    # 類別對應表
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
    score = entry_score.get().strip()
    note = text_note.get("1.0", tk.END).strip()

    if not title or not note:
        messagebox.showwarning("警告", "電影名與心得不可為空！")
        return

    # 若未填寫評分，預設為 7.0
    if not score:
        score = "7.0"

    # ==========================================
    # 路徑分離設定
    # ==========================================
    # 1. 寫入 JS 檔給前端讀取的字串 (維持原樣)
    js_poster_path = f"./img/movie/{title}.jpg"
    new_entry = f'  {{ title: "{title}", score: {score}, note: "{note}", poster: "{js_poster_path}" }},'

    # 2. Python 實際下載存檔的路徑 (從 src/data 退兩層到根目錄，再進 docs/img/movie)
    save_dir = "../../docs/img/movie"
    save_poster_path = os.path.join(save_dir, f"{title}.jpg")

    # ==========================================
    # 新增功能：自動從 TMDB 下載對應語言海報
    # ==========================================
    if TMDB_API_KEY:
        try:
            # 建立存放圖片的實體資料夾 (如果還沒有的話)
            os.makedirs(save_dir, exist_ok=True)
            
            # 1. 用中文片名搜尋電影 ID，並取得該電影的原始語言
            search_url = "https://api.themoviedb.org/3/search/movie"
            search_params = {"api_key": TMDB_API_KEY, "query": title, "language": "zh-TW"}
            search_resp = requests.get(search_url, params=search_params)
            search_resp.raise_for_status()
            search_data = search_resp.json()
            
            if search_data.get("results"):
                first_result = search_data["results"][0]
                movie_id = first_result["id"]
                original_lang = first_result.get("original_language", "en") # 取得原始語言，預設 en
                
                # 決定海報的語言優先順序
                if category_var == "westernMovies":
                    # 歐美電影：強制只抓英文或無語言
                    target_langs = "en,null"
                else:
                    # 其他亞洲/港/日動畫：優先抓原始語言(ja, ko, zh等)，其次繁中，再來英文，最後無語言
                    target_langs = f"{original_lang},zh,en,null"
                
                # 2. 用電影 ID 指定獲取我們設定好語言的海報
                img_api_url = f"https://api.themoviedb.org/3/movie/{movie_id}/images"
                img_params = {"api_key": TMDB_API_KEY, "include_image_language": target_langs}
                img_resp = requests.get(img_api_url, params=img_params)
                img_resp.raise_for_status()
                img_data = img_resp.json()
                
                target_poster_path = None
                if img_data.get("posters") and len(img_data["posters"]) > 0:
                    # 取第一張符合條件的海報
                    target_poster_path = img_data["posters"][0]["file_path"]
                else:
                    # 如果真的都沒有，退一步使用預設搜尋結果的海報
                    target_poster_path = first_result.get("poster_path")

                # 3. 下載海報並依照電影名存放到指定的 docs/img/movie 資料夾
                if target_poster_path:
                    download_url = f"https://image.tmdb.org/t/p/w780{target_poster_path}"
                    img_bytes = requests.get(download_url).content
                    with open(save_poster_path, "wb") as f:
                        f.write(img_bytes)
                else:
                    messagebox.showwarning("海報提示", f"TMDB 上沒有《{title}》的海報圖片。")
            else:
                messagebox.showwarning("海報提示", f"在 TMDB 找不到名為《{title}》的電影，將跳過下載。")
        except Exception as e:
            messagebox.showerror("海報下載錯誤", f"下載海報時發生問題：\n{e}\n\n將跳過下載，繼續寫入文字資料。")
    else:
        messagebox.showinfo("海報提示", "尚未填寫 TMDB_API_KEY，將跳過海報下載功能。")
    # ==========================================

    # 以下為原本寫入 movies.js 的邏輯
    try:
        with open(JS_FILE_PATH, 'r', encoding='utf-8') as file:
            content = file.read()

        target_line = f"export const {category_var} = ["
        
        # 尋找目標陣列的開頭
        if target_line not in content:
            messagebox.showerror("錯誤", f"在檔案中找不到 '{target_line}'\n請確認 JS 檔案格式或檔名設定。")
            return

        # 將新電影插入到陣列的第一筆（放在 target_line 的正下方）
        new_content = content.replace(target_line, f"{target_line}\n{new_entry}")

        # 寫回檔案
        with open(JS_FILE_PATH, 'w', encoding='utf-8') as file:
            file.write(new_content)

        messagebox.showinfo("成功", f"已成功將《{title}》新增至 {category_var}！")

        # 成功後清空輸入框，方便接續輸入下一筆
        entry_title.delete(0, tk.END)
        entry_score.delete(0, tk.END)
        text_note.delete("1.0", tk.END)

    except FileNotFoundError:
        messagebox.showerror("錯誤", f"找不到檔案：{JS_FILE_PATH}\n請確認 Python 執行路徑與 JS 檔案是否在同一層資料夾。")
    except Exception as e:
        messagebox.showerror("錯誤", f"發生未知的錯誤：{e}")


# 建立主視窗
root = tk.Tk()
root.title("電影資料新增工具")
root.geometry("450x400")
root.resizable(False, False)

# 設定視窗樣式
style = ttk.Style()
style.configure("TLabel", font=("微軟正黑體", 11))
style.configure("TButton", font=("微軟正黑體", 11))

# --- UI 元件區 ---

# 類別選擇
ttk.Label(root, text="選擇類別：").place(x=30, y=30)
category_combobox = ttk.Combobox(root, values=[
    "歐美電影 (westernMovies)", 
    "亞洲電影 (asiaMovies)", 
    "童年港片 (hongkongMovies)", 
    "動畫電影 (animeMovies)"
], state="readonly", width=25, font=("微軟正黑體", 10))
category_combobox.place(x=120, y=30)
category_combobox.current(0)  # 預設選擇第一項

# 電影名輸入
ttk.Label(root, text="電影名：").place(x=30, y=80)
entry_title = ttk.Entry(root, width=27, font=("微軟正黑體", 10))
entry_title.place(x=120, y=80)

# 評分輸入
ttk.Label(root, text="評分(數字)：").place(x=30, y=130)
entry_score = ttk.Entry(root, width=27, font=("微軟正黑體", 10))
entry_score.place(x=120, y=130)

# 心得輸入
ttk.Label(root, text="心得：").place(x=30, y=180)
text_note = tk.Text(root, width=27, height=6, font=("微軟正黑體", 10))
text_note.place(x=120, y=180)

# 新增按鈕
btn_submit = ttk.Button(root, text="寫入檔案", command=add_movie)
btn_submit.place(x=175, y=330)

# 啟動主迴圈
root.mainloop()