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

# 絕對固定的分數與 Elo 轉換權重
ELO_MULTIPLIER = 200

# 現代化配色
COLOR_BG = "#F8F9FA"       
COLOR_CARD = "#FFFFFF"     
COLOR_PRIMARY = "#007AFF"  
COLOR_TEXT = "#212529"     
COLOR_VS = "#ADB5BD"      

class MovieSorterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("電影二選一評分系統 - 快速收斂版")
        self.root.geometry("600x450")
        self.root.configure(bg=COLOR_BG)
        
        self.movies = []
        self.match_count = 0
        self.categories = [] # 動態儲存偵測到的類別名稱
        
        # 動態區間，用於限制顯示分數的上下限
        self.min_score = 0.0
        self.max_score = 10.0
        
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
        
        found_categories = re.findall(r'export const (\w+) =', content)
        self.categories = found_categories
        
        all_movies = []
        for cat in self.categories:
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
        js_movies = self.parse_js_file(INPUT_JS)
        
        scores = [m.get('score', 0) for m in js_movies]
        if scores:
            self.min_score = min(scores)
            self.max_score = max(scores)
            
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
            orig_score = m.get('score', 0)
            base_elo = orig_score * ELO_MULTIPLIER
            
            if m['title'] in saved_movies_map and 'elo' in saved_movies_map[m['title']]:
                saved_elo = saved_movies_map[m['title']]['elo']
                raw_saved_score = saved_elo / ELO_MULTIPLIER
                clamped_saved_score = max(self.min_score, min(self.max_score, raw_saved_score))
                expected_js_score = round(clamped_saved_score, 1)
                
                if abs(expected_js_score - orig_score) > 0.01:
                    m['elo'] = base_elo
                else:
                    m['elo'] = saved_elo
            else:
                m['elo'] = base_elo
            
            final_list.append(m)
            
        self.movies = final_list

    def get_display_score(self, elo):
        raw_score = elo / ELO_MULTIPLIER
        final_score = max(self.min_score, min(self.max_score, raw_score))
        return round(final_score, 1)

    def setup_ui(self):
        self.prog_label = tk.Label(self.root, text="", font=("Segoe UI", 10), 
                                   bg=COLOR_BG, fg=COLOR_TEXT)
        self.prog_label.pack(pady=(20, 10))

        frame = tk.Frame(self.root, bg=COLOR_BG)
        frame.pack(expand=True, fill="both", padx=30)

        self.btn_left = tk.Button(frame, text="", wraplength=180, font=("微軟正黑體", 13, "bold"),
                                  command=lambda: self.handle_choice(1), height=8, width=18,
                                  bg=COLOR_CARD, fg=COLOR_TEXT, relief="flat", 
                                  activebackground="#E9ECEF", bd=0, cursor="hand2")
        self.btn_left.pack(side="left", expand=True, padx=10)

        tk.Label(frame, text="VS", font=("Segoe UI", 18, "italic bold"), 
                 bg=COLOR_BG, fg=COLOR_VS).pack(side="left", padx=5)

        self.btn_right = tk.Button(frame, text="", wraplength=180, font=("微軟正黑體", 13, "bold"),
                                   command=lambda: self.handle_choice(2), height=8, width=18,
                                   bg=COLOR_CARD, fg=COLOR_TEXT, relief="flat", 
                                   activebackground="#E9ECEF", bd=0, cursor="hand2")
        self.btn_right.pack(side="left", expand=True, padx=10)

        btn_frame = tk.Frame(self.root, bg=COLOR_BG)
        btn_frame.pack(pady=30)
        
        save_style = {"font": ("微軟正黑體", 10), "bg": COLOR_PRIMARY, "fg": "white", 
                      "relief": "flat", "padx": 15, "pady": 5, "cursor": "hand2"}
        exit_style = {"font": ("微軟正黑體", 10), "bg": "#6C757D", "fg": "white", 
                      "relief": "flat", "padx": 15, "pady": 5, "cursor": "hand2"}

        tk.Button(btn_frame, text="儲存並更新 JS 檔案", command=self.export_js, **save_style).pack(side="left", padx=10)
        tk.Button(btn_frame, text="關閉退出", command=self.root.quit, **exit_style).pack(side="left", padx=10)

    def next_match(self):
        """改進的挑選邏輯：鄰近對決（Proximity Matchmaking）"""
        if len(self.movies) < 2: return
        
        # 1. 隨機選出第一個對手
        self.m1 = random.choice(self.movies)
        
        # 2. 將所有電影按目前的 Elo 排序
        sorted_movies = sorted(self.movies, key=lambda x: x['elo'])
        idx = sorted_movies.index(self.m1)
        
        # 3. 定義搜尋區間（挑選附近的 6 部電影），這能讓勝負更具懸念，收斂更快
        window_size = 6
        start = max(0, idx - window_size)
        end = min(len(sorted_movies) - 1, idx + window_size)
        
        # 排除掉自己
        candidates = [m for i, m in enumerate(sorted_movies) if start <= i <= end and m != self.m1]
        
        # 如果候選人不足（極端情況），則退回全隨機
        if not candidates:
            self.m2 = random.choice([m for m in self.movies if m != self.m1])
        else:
            self.m2 = random.choice(candidates)
        
        s1 = self.get_display_score(self.m1['elo'])
        s2 = self.get_display_score(self.m2['elo'])
        
        self.btn_left.config(text=f"{self.m1['title']}\n\n★ {s1}")
        self.btn_right.config(text=f"{self.m2['title']}\n\n★ {s2}")
        
        prog_text = f"已比對: {self.match_count} 次  |  建議目標: {self.target_matches} 次"
        self.prog_label.config(text=prog_text)

    def handle_choice(self, winner):
        # 增加 K 值可以加速前期收斂，這裡維持 32 是一個穩健的選擇
        k = 32
        r1, r2 = self.m1['elo'], self.m2['elo']
        
        # Elo 期望勝率公式
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
        categories_output = {cat: [] for cat in self.categories}
        
        for m in self.movies:
            cat = m['category']
            m['score'] = self.get_display_score(m['elo'])
            if cat in categories_output:
                categories_output[cat].append(m)

        with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
            for cat, m_list in categories_output.items():
                f.write(f"export const {cat} = [\n")
                # 匯出時按分數由高到低排序，保持檔案整潔
                for m in sorted(m_list, key=lambda x: x['elo'], reverse=True):
                    parts = []
                    # 指定順序：title, score, note, poster
                    for key in ['title', 'score', 'note', 'poster']:
                        if key in m:
                            parts.append(f'{key}: {json.dumps(m[key], ensure_ascii=False)}')
                    # 其他動態欄位（排除已被特別處理與內部欄位）
                    for key, val in m.items():
                        if key not in ['title', 'score', 'note', 'poster', 'category', 'elo']:
                            parts.append(f'{key}: {json.dumps(val, ensure_ascii=False)}')
                    
                    item_str = ", ".join(parts)
                    f.write(f'  {{ {item_str} }},\n')
                f.write("];\n\n")
        
        messagebox.showinfo("儲存成功", f"分數已更新至 {OUTPUT_JS}\n已偵測並保留類別：{', '.join(self.categories)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = MovieSorterApp(root)
    root.mainloop()