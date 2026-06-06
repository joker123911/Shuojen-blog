import os
import requests
import threading
import re

# ==========================================
# 自動偵測環境：檢查是否有真實的圖形介面顯示器
# ==========================================
HAS_GUI = False
try:
    import tkinter as tk
    from tkinter import ttk, messagebox
    # 嘗試初始化一個隱藏的 root 來測試環境是否真的支援 GUI 顯示
    test_root = tk.Tk()
    test_root.withdraw()
    test_root.destroy()
    HAS_GUI = True
except Exception:
    # 只要初始化失敗（不論是沒裝 tkinter 還是沒有 $DISPLAY 變數），都判定為純終端機環境
    HAS_GUI = False

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

# ==========================================
# 核心邏輯處理函數（兩種模式共用）
# ==========================================
def save_worker_logic(data_type, target_var, title, score, note, tier, success_callback, error_callback):
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
        js_poster_path = f"./img/series/{title}.jpg"
        # 修正：將原本的 Windows 絕對路徑改為相對路徑，讓手機 Termux 也能正確寫入專案資料夾
        save_dir = "../../docs/img/series"
        new_entry = f'  {{ title: "{title}", note: "{note}", poster: "{js_poster_path}", tier: "{tier}" }}'
        target_line = "export const animeList = ["
        search_type = "tv"
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
            if target_line not in content:
                error_callback(f"找不到 '{target_line}'")
                return
            new_content = content.replace(target_line, f"{target_line}\n{new_entry}")
        else:
            tier_priority = {"SSS": 0, "SS": 1, "S": 2, "A": 3, "B": 4}
            pattern = r"(export const animeList = \[)(.*?)(\];)"
            match = re.search(pattern, content, re.DOTALL)
            
            if not match:
                error_callback("找不到 'export const animeList = [];' 格式")
                return
            
            header, body, footer = match.groups()
            existing_items = re.findall(r'\{[^{}]*?\}', body, re.DOTALL)
            processed_items = [item.strip().rstrip(',') for item in existing_items]
            processed_items.append(new_entry.strip())
            
            def sort_key(item_str):
                m = re.search(r'tier:\s*"(SSS|SS|S|A|B)"', item_str)
                tier_val = m.group(1) if m else "B"
                return tier_priority.get(tier_val, 99)
            
            processed_items.sort(key=sort_key)
            new_body_content = "\n  " + ",\n  ".join(processed_items) + "\n"
            new_content = re.sub(pattern, f"{header}{new_body_content}{footer}", content, flags=re.DOTALL)

        with open(js_file, 'w', encoding='utf-8') as file:
            file.write(new_content)

        success_callback(title)
    except Exception as e:
        error_callback(str(e))

# ==========================================
# WINDOWS GUI 視窗模式
# ==========================================
class AppGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("多媒體資料新增工具")
        self.root.geometry("450x450")
        self.root.resizable(False, False)

        style = ttk.Style()
        style.configure("TLabel", font=("微軟正黑體", 11))
        style.configure("TButton", font=("微軟正黑體", 11))

        # 模式切換
        ttk.Label(self.root, text="操作模式：").place(x=30, y=20)
        self.mode_combobox = ttk.Combobox(self.root, values=["電影模式 (Movie)", "動漫模式 (Anime)", "影集模式 (Series)"], state="readonly", width=25)
        self.mode_combobox.place(x=120, y=20)
        self.mode_combobox.current(0)
        self.mode_combobox.bind("<<ComboboxSelected>>", self.on_mode_change)

        # 類別/等級選擇
        self.lbl_category = ttk.Label(self.root, text="選擇類別：")
        self.lbl_category.place(x=30, y=65)
        self.category_combobox = ttk.Combobox(self.root, values=[
            "歐美電影 (westernMovies)", "亞洲電影 (asiaMovies)", "童年港片 (hongkongMovies)", "動畫電影 (animeMovies)"
        ], state="readonly", width=25)
        self.category_combobox.place(x=120, y=65)
        self.category_combobox.current(0)

        # 標題
        ttk.Label(self.root, text="標題名稱：").place(x=30, y=110)
        self.entry_title = ttk.Entry(self.root, width=27)
        self.entry_title.place(x=120, y=110)

        # 評分
        self.lbl_score = ttk.Label(self.root, text="評分(數字)：")
        self.lbl_score.place(x=30, y=155)
        self.entry_score = ttk.Entry(self.root, width=27)
        self.entry_score.place(x=120, y=155)

        # 心得
        ttk.Label(self.root, text="心得備註：").place(x=30, y=200)
        self.text_note = tk.Text(self.root, width=27, height=6, font=("微軟正黑體", 10))
        self.text_note.place(x=120, y=200)

        self.btn_submit = ttk.Button(self.root, text="寫入檔案", command=self.add_data_click)
        self.btn_submit.place(x=175, y=360)

    def on_mode_change(self, event):
        mode = self.mode_combobox.get()
        if mode == "電影模式 (Movie)":
            self.lbl_category.config(text="選擇類別：")
            self.category_combobox.config(values=[
                "歐美電影 (westernMovies)", "亞洲電影 (asiaMovies)", "童年港片 (hongkongMovies)", "動畫電影 (animeMovies)"
            ])
            self.category_combobox.current(0)
            self.lbl_score.place(x=30, y=155)
            self.entry_score.place(x=120, y=155)
        else:
            self.lbl_category.config(text="選擇等級：")
            self.category_combobox.config(values=["SSS", "SS", "S", "A", "B"])
            self.category_combobox.current(0)
            self.lbl_score.place_forget()
            self.entry_score.place_forget()

    def add_data_click(self):
        mode = self.mode_combobox.get()
        title = self.entry_title.get().strip()
        note = self.text_note.get("1.0", tk.END).strip()

        if not title or not note:
            messagebox.showwarning("警告", "名稱與心得不可為空！")
            return

        self.btn_submit.config(text="下載處理中...", state=tk.DISABLED)

        if mode == "電影模式 (Movie)":
            category_map = {
                "歐美電影 (westernMovies)": "westernMovies", "亞洲電影 (asiaMovies)": "asiaMovies",
                "童年港片 (hongkongMovies)": "hongkongMovies", "動畫電影 (animeMovies)": "animeMovies"
            }
            selected_cat = self.category_combobox.get()
            score = self.entry_score.get().strip() or "7.0"
            args = ("movie", category_map[selected_cat], title, score, note, None)
        elif mode == "動漫模式 (Anime)":
            tier = self.category_combobox.get()
            args = ("anime", "animeList", title, None, note, tier)
        else:
            tier = self.category_combobox.get()
            args = ("series", "animeList", title, None, note, tier)

        threading.Thread(
            target=save_worker_logic, 
            args=(*args, self.gui_success, self.gui_error),
            daemon=True
        ).start()

    def gui_success(self, title):
        self.root.after(0, lambda: messagebox.showinfo("成功", f"已成功將《{title}》新增至 {self.mode_combobox.get()}！"))
        self.root.after(0, self.reset_ui)

    def gui_error(self, msg):
        self.root.after(0, lambda: messagebox.showerror("錯誤", msg))
        self.root.after(0, lambda: self.btn_submit.config(text="寫入檔案", state=tk.NORMAL))

    def reset_ui(self):
        self.entry_title.delete(0, tk.END)
        self.entry_score.delete(0, tk.END)
        self.text_note.delete("1.0", tk.END)
        self.btn_submit.config(text="寫入檔案", state=tk.NORMAL)

    def run(self):
        self.root.mainloop()

# ==========================================
# TERMINAL 終端機純文字模式
# ==========================================
def run_terminal():
    print("=" * 40)
    print("      多媒體資料新增工具 (終端機模式)      ")
    print("=" * 40)
    
    while True:
        print("\n[請選擇操作模式]")
        print("1. 電影模式 (Movie)")
        print("2. 動漫模式 (Anime)")
        print("3. 影集模式 (Series)")
        print("0. 離開程式")
        choice = input("請輸入數字 (0-3): ").strip()

        if choice == "0":
            print("程式已結束。")
            break
        elif choice not in ["1", "2", "3"]:
            print("輸入錯誤，請重新選擇。")
            continue

        title = input("\n請輸入標題名稱: ").strip()
        if not title:
            print("警告: 標題不可為空！")
            continue

        note = input("請輸入心得備註: ").strip()
        if not note:
            print("警告: 心得不可為空！")
            continue

        if choice == "1": # 電影
            print("\n[選擇電影類別]")
            print("1. 歐美電影 (westernMovies)")
            print("2. 亞洲電影 (asiaMovies)")
            print("3. 童年港片 (hongkongMovies)")
            print("4. 動畫電影 (animeMovies)")
            cat_choice = input("請輸入數字 (1-4): ").strip()
            cat_map = {"1": "westernMovies", "2": "asiaMovies", "3": "hongkongMovies", "4": "animeMovies"}
            if cat_choice not in cat_map:
                print("類別選擇錯誤，返回主選單。")
                continue
            score = input("請輸入評分 (預設 7.0): ").strip() or "7.0"
            args = ("movie", cat_map[cat_choice], title, score, note, None)
            mode_str = "電影模式"
        else: # 動漫 或 影集
            tier = input("\n請輸入等級分區 (SSS/SS/S/A/B，預設 B): ").strip().upper()
            if tier not in ["SSS", "SS", "S", "A", "B"]:
                tier = "B"
            if choice == "2":
                args = ("anime", "animeList", title, None, note, tier)
                mode_str = "動漫模式"
            else:
                args = ("series", "animeList", title, None, note, tier)
                mode_str = "影集模式"

        print("\n資料下載與寫入中，請稍候...")
        
        def term_success(t):
            print(f"\n>> 成功：已成功將《{t}》新增至 {mode_str}！")
        
        def term_error(msg):
            print(f"\n>> 錯誤：{msg}")

        save_worker_logic(*args, term_success, term_error)
        print("-" * 40)

# ==========================================
# 程式進入點
# ==========================================
if __name__ == "__main__":
    if HAS_GUI:
        # 只有在真正擁有視窗顯示器的 Windows 環境，才會彈出模式選擇視窗
        selector = tk.Tk()
        selector.title("選擇執行模式")
        selector.geometry("300x120")
        selector.resizable(False, False)
        
        selected_mode = tk.StringVar(value="gui")
        
        tk.Label(selector, text="請選擇啟動模式：", font=("微軟正黑體", 11)).pack(pady=10)
        
        frame = tk.Frame(selector)
        frame.pack()
        
        def choose_gui():
            selected_mode.set("gui")
            selector.destroy()
            
        def choose_term():
            selected_mode.set("term")
            selector.destroy()

        tk.Button(frame, text="Windows 視窗模式", font=("微軟正黑體", 10), command=choose_gui).pack(side=tk.LEFT, padx=10)
        tk.Button(frame, text="Terminal 終端機模式", font=("微軟正黑體", 10), command=choose_term).pack(side=tk.RIGHT, padx=10)
        
        selector.mainloop()
        
        if selected_mode.get() == "gui":
            app = AppGUI()
            app.run()
        else:
            run_terminal()
    else:
        # 手機 Termux 環境下，完全不碰任何視窗元件，自動直接進入終端機模式
        run_terminal()
