import re
import json
import os
import random
import tkinter as tk
from tkinter import messagebox, ttk
import math

# 設定檔
PROGRESS_FILE = 'progress.json'
INPUT_JS = 'movies.js'
OUTPUT_JS = 'movies.js' 

# Elo 轉換分數的權重設定 (適配 5.9 ~ 9.5 區間)
BASE_ELO = 1400      
BASE_SCORE = 7.7     
POINTS_PER_SCORE = 200 
MIN_SCORE = 5.9
MAX_SCORE = 9.5

# 現代化配色
COLOR_BG = "#F8F9FA"       # 淺灰色背景
COLOR_CARD = "#FFFFFF"     # 純白卡片
COLOR_PRIMARY = "#007AFF"  # 蘋果藍 (儲存按鈕)
COLOR_TEXT = "#212529"     # 深灰色文字
COLOR_VS = "#ADB5BD"      # VS 文字顏色

class MovieSorterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("電影二選一評分系統")
        self.root.geometry("600x450")
        self.root.configure(bg=COLOR_BG)
        
        self.movies = []
        self.match_count = 0
        self.load_data()
        
        self.target_matches = int(len(self.movies) * math.log2(max(2, len(self.movies))))
        
        self.setup_ui()
        self.next_match()

    def parse_js_file(self, file_path):
        if not os.path.exists(file_path):
            messagebox.showerror("錯誤", f"找不到 {file_path}")
            exit()
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        categories = ['westernMovies', 'asiaMovies', 'animeMovies']
        all_movies = []
        for cat in categories:
            pattern = rf'export const {cat} = (\[.*?\]);'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                jt = re.sub(r'(\w+):', r'"\1":', match.group(1))
                jt = re.sub(r',\s*]', ']', jt)
                try:
                    data = json.loads(jt)
                    for m in data:
                        m['category'] = cat
                        all_movies.append(m)
                except:
                    continue
        return all_movies

    def load_data(self):
        """同步 JS 資料與進度檔，確保初始 Elo 完全照原始分數"""
        js_movies = self.parse_js_file(INPUT_JS)
        
        saved_movies_map = {}
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                saved_data = json.load(f)
                if isinstance(saved_data, dict):
                    saved_movies = saved_data.get('movies', [])
                    self.match_count = saved_data.get('match_count', 0)
                else:
                    saved_movies = saved_data
                saved_movies_map = {m['title']: m for m in saved_movies}

        final_list = []
        for m in js_movies:
            # 如果進度檔有紀錄則讀取，若無則從原始分數反推 Elo
            if m['title'] in saved_movies_map:
                m['elo'] = saved_movies_map[m['title']].get('elo')
            
            # 確保初始 Elo 與 JS 裡的 score 一致
            if 'elo' not in m or m['elo'] is None:
                orig_score = m.get('score', BASE_SCORE)
                m['elo'] = BASE_ELO + (orig_score - BASE_SCORE) * POINTS_PER_SCORE
            
            final_list.append(m)
            
        self.movies = final_list

    def get_display_score(self, elo):
        raw_score = BASE_SCORE + (elo - BASE_ELO) / POINTS_PER_SCORE
        final_score = max(MIN_SCORE, min(MAX_SCORE, raw_score))
        return round(final_score, 1)

    def setup_ui(self):
        # 頂部進度文字
        self.prog_label = tk.Label(self.root, text="", font=("Segoe UI", 10), 
                                   bg=COLOR_BG, fg=COLOR_TEXT)
        self.prog_label.pack(pady=(20, 10))

        # 核心對戰區域
        frame = tk.Frame(self.root, bg=COLOR_BG)
        frame.pack(expand=True, fill="both", padx=30)

        # 左側電影按鈕 (卡片樣式)
        self.btn_left = tk.Button(frame, text="", wraplength=180, font=("微軟正黑體", 13, "bold"),
                                 command=lambda: self.handle_choice(1), height=8, width=18,
                                 bg=COLOR_CARD, fg=COLOR_TEXT, relief="flat", 
                                 activebackground="#E9ECEF", bd=0, cursor="hand2")
        self.btn_left.pack(side="left", expand=True, padx=10)

        # VS 標籤
        tk.Label(frame, text="VS", font=("Segoe UI", 18, "italic bold"), 
                 bg=COLOR_BG, fg=COLOR_VS).pack(side="left", padx=5)

        # 右側電影按鈕
        self.btn_right = tk.Button(frame, text="", wraplength=180, font=("微軟正黑體", 13, "bold"),
                                  command=lambda: self.handle_choice(2), height=8, width=18,
                                  bg=COLOR_CARD, fg=COLOR_TEXT, relief="flat", 
                                  activebackground="#E9ECEF", bd=0, cursor="hand2")
        self.btn_right.pack(side="left", expand=True, padx=10)

        # 底部功能按鈕區
        btn_frame = tk.Frame(self.root, bg=COLOR_BG)
        btn_frame.pack(pady=30)
        
        save_style = {"font": ("微軟正黑體", 10), "bg": COLOR_PRIMARY, "fg": "white", 
                      "relief": "flat", "padx": 15, "pady": 5, "cursor": "hand2"}
        exit_style = {"font": ("微軟正黑體", 10), "bg": "#6C757D", "fg": "white", 
                      "relief": "flat", "padx": 15, "pady": 5, "cursor": "hand2"}

        tk.Button(btn_frame, text="儲存並更新 JS 檔案", command=self.export_js, **save_style).pack(side="left", padx=10)
        tk.Button(btn_frame, text="關閉退出", command=self.root.quit, **exit_style).pack(side="left", padx=10)

    def next_match(self):
        if len(self.movies) < 2: return
        self.m1, self.m2 = random.sample(self.movies, 2)
        
        s1 = self.get_display_score(self.m1['elo'])
        s2 = self.get_display_score(self.m2['elo'])
        
        self.btn_left.config(text=f"{self.m1['title']}\n\n★ {s1}")
        self.btn_right.config(text=f"{self.m2['title']}\n\n★ {s2}")
        
        prog_text = f"已比對: {self.match_count} 次  |  建議目標: {self.target_matches} 次"
        self.prog_label.config(text=prog_text)

    def handle_choice(self, winner):
        k = 32
        r1, r2 = self.m1['elo'], self.m2['elo']
        exp1 = 1 / (1 + 10 ** ((r2 - r1) / 400))
        exp2 = 1 - exp1
        
        if winner == 1:
            self.m1['elo'] = r1 + k * (1 - exp1)
            self.m2['elo'] = r2 + k * (0 - exp2)
        else:
            self.m1['elo'] = r1 + k * (0 - exp1)
            self.m2['elo'] = r2 + k * (1 - exp2)
            
        self.match_count += 1
        self.save_progress()
        self.next_match()

    def save_progress(self):
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump({'movies': self.movies, 'match_count': self.match_count}, 
                      f, ensure_ascii=False, indent=2)

    def export_js(self):
        categories = {'westernMovies': [], 'asiaMovies': [], 'animeMovies': []}
        
        for m in self.movies:
            cat = m['category']
            m['score'] = self.get_display_score(m['elo'])
            categories[cat].append(m)

        with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
            for cat, m_list in categories.items():
                f.write(f"export const {cat} = [\n")
                for m in sorted(m_list, key=lambda x: x['elo'], reverse=True):
                    f.write(f'  {{ title: "{m["title"]}", score: {m["score"]}, note: "{m["note"]}", poster: "{m["poster"]}" }},\n')
                f.write("];\n\n")
        
        messagebox.showinfo("儲存成功", f"分數已更新至 {OUTPUT_JS}\n範圍：{MIN_SCORE} ~ {MAX_SCORE}")

if __name__ == "__main__":
    root = tk.Tk()
    app = MovieSorterApp(root)
    root.mainloop()