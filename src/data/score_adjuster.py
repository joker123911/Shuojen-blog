import re
import json
import os
import random
import tkinter as tk
from tkinter import messagebox
import math

# 設定檔
PROGRESS_FILE = 'progress.json'
INPUT_JS = 'movies.js'
OUTPUT_JS = 'movies_updated.js'

class MovieSorterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("電影二選一評分系統 (同步模式)")
        self.root.geometry("600x450")
        
        self.movies = []
        self.match_count = 0
        self.load_data()
        
        # 計算建議場次 (N * log2(N))，會隨電影總數動態增加
        self.target_matches = int(len(self.movies) * math.log2(max(2, len(self.movies))))
        
        self.setup_ui()
        self.next_match()

    def parse_js_file(self, file_path):
        """解析最新的 movies.js 檔案"""
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
                for m in json.loads(jt):
                    m['category'] = cat
                    all_movies.append(m)
        return all_movies

    def load_data(self):
        """同步 JS 資料與進度檔"""
        js_movies = self.parse_js_file(INPUT_JS)
        
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                saved_data = json.load(f)
                # 處理舊版格式相容性
                if isinstance(saved_data, list):
                    saved_movies = saved_data
                    self.match_count = 0
                else:
                    saved_movies = saved_data.get('movies', [])
                    self.match_count = saved_data.get('match_count', 0)
            
            # 以 title 為 Key 建立索引，保留舊有的 Elo 戰績
            progress_map = {m['title']: m for m in saved_movies}
            
            final_list = []
            new_count = 0
            for m in js_movies:
                if m['title'] in progress_map:
                    # 已存在的電影：保留 Elo 分數，但同步最新的 note/poster
                    existing = progress_map[m['title']]
                    m['elo'] = existing.get('elo', 1200)
                    final_list.append(m)
                else:
                    # 新電影：給予初始 Elo (依據原始 score 微調)
                    m['elo'] = 1200 + (m.get('score', 8.0) - 7.0) * 200
                    final_list.append(m)
                    new_count += 1
            
            self.movies = final_list
            if new_count > 0:
                print(f"--- 同步完成：發現 {new_count} 部新電影 ---")
        else:
            # 初次執行，直接使用 JS 資料
            self.movies = js_movies
            self.match_count = 0
            for m in self.movies:
                m['elo'] = 1200 + (m.get('score', 8.0) - 7.0) * 200
            print("--- 初次執行：已載入原始清單 ---")

    def get_display_score(self, elo):
        """將 Elo 映射為顯示用的 6.5 - 9.5 分"""
        all_elo = [m['elo'] for m in self.movies]
        min_e, max_e = min(all_elo), max(all_elo)
        if max_e == min_e: return 8.0
        return round(6.5 + (elo - min_e) * (3.0 / (max_e - min_e)), 1)

    def setup_ui(self):
        self.prog_label = tk.Label(self.root, text="", font=("Arial", 10))
        self.prog_label.pack(pady=10)

        frame = tk.Frame(self.root)
        frame.pack(expand=True, fill="both", padx=20)

        self.btn_left = tk.Button(frame, text="", wraplength=200, font=("微軟正黑體", 14, "bold"),
                                 command=lambda: self.handle_choice(1), height=8, width=20, bg="#f0f0f0")
        self.btn_left.pack(side="left", expand=True, padx=10)

        tk.Label(frame, text="VS", font=("Arial", 16, "italic")).pack(side="left")

        self.btn_right = tk.Button(frame, text="", wraplength=200, font=("微軟正黑體", 14, "bold"),
                                  command=lambda: self.handle_choice(2), height=8, width=20, bg="#f0f0f0")
        self.btn_right.pack(side="left", expand=True, padx=10)

        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=20)
        
        tk.Button(btn_frame, text="儲存並導出 JS", command=self.export_js, bg="#e1f5fe").pack(side="left", padx=10)
        tk.Button(btn_frame, text="退出", command=self.root.quit).pack(side="left", padx=10)

    def next_match(self):
        """選擇 Elo 較接近的兩部，比較更有意義"""
        # 簡單隨機挑選
        self.m1, self.m2 = random.sample(self.movies, 2)
        
        s1 = self.get_display_score(self.m1['elo'])
        s2 = self.get_display_score(self.m2['elo'])
        
        self.btn_left.config(text=f"{self.m1['title']}\n\n(目前: {s1})")
        self.btn_right.config(text=f"{self.m2['title']}\n\n(目前: {s2})")
        
        prog_text = f"已比對: {self.match_count} 次 | 建議目標: {self.target_matches} 次"
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
        all_elo = [m['elo'] for m in self.movies]
        min_e, max_e = min(all_elo), max(all_elo)
        
        categories = {'westernMovies': [], 'asiaMovies': [], 'animeMovies': []}
        for m in self.movies:
            cat = m['category']
            new_score = round(6.5 + (m['elo'] - min_e) * (3.0 / (max_e - min_e)), 1)
            m['score'] = new_score
            categories[cat].append(m)

        with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
            for cat, m_list in categories.items():
                f.write(f"export const {cat} = [\n")
                for m in sorted(m_list, key=lambda x: x['score'], reverse=True):
                    f.write(f'  {{ title: "{m["title"]}", score: {m["score"]}, note: "{m["note"]}", poster: "{m["poster"]}" }},\n')
                f.write("];\n\n")
        
        messagebox.showinfo("成功", f"新資料已導出至 {OUTPUT_JS}")

if __name__ == "__main__":
    root = tk.Tk()
    app = MovieSorterApp(root)
    root.mainloop()