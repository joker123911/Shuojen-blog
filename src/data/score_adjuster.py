import re
import sys
import json
import os
import random
import tkinter as tk
from tkinter import messagebox, ttk
import math

# 設定檔（以腳本所在資料夾為基準，從任何位置執行都找得到檔案）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROGRESS_FILE = os.path.join(BASE_DIR, 'progress.json')
INPUT_JS = os.path.join(BASE_DIR, 'movies.js')
OUTPUT_JS = INPUT_JS

# 絕對固定的分數與 Elo 轉換權重
ELO_MULTIPLIER = 200

# 固定的分數上下限：最頂的片就是 9.5、最爛的片就是 5.9（不再從資料推算，避免上下限越縮越小）
SCORE_MIN, SCORE_MAX = 5.9, 9.5
# 內部 Elo 最多允許超出邊界幾分：
#   0   → 頂端的片輸一場就掉到 9.4
#   越大 → 頂端／底端越「黏」，但沉到底的片也要贏越多場才爬得回來
BUFFER = 0.3
ELO_FLOOR = (SCORE_MIN - BUFFER) * ELO_MULTIPLIER
ELO_CEIL = (SCORE_MAX + BUFFER) * ELO_MULTIPLIER

# K 值隨每部電影的比對次數遞減：新片調整快，比過很多次的片趨於穩定，不會一直亂飄
#   0 場 → 32、10 場 → 16、30 場以上 → 8
K_MAX, K_MIN, K_HALF_LIFE = 32, 8, 10

# 新加入的電影前幾場會優先被排出來比對，盡快找到自己的位置
NEW_MOVIE_GAMES = 8

# 程式內部使用、不寫回 movies.js 的欄位
INTERNAL_KEYS = {'category', 'elo', 'games', 'exported_score'}

# 現代化配色
COLOR_BG = "#F8F9FA"       
COLOR_CARD = "#FFFFFF"     
COLOR_PRIMARY = "#007AFF"  
COLOR_TEXT = "#212529"     
COLOR_VS = "#ADB5BD"      


def clamp_elo(elo):
    return max(ELO_FLOOR, min(ELO_CEIL, elo))


def k_factor(games):
    return max(K_MIN, K_MAX * K_HALF_LIFE / (K_HALF_LIFE + games))


# 只替換「字串外面」的物件鍵名（title: → "title":），字串內容（例如 note 裡的 "Mission: Impossible"）保持原樣
_JS_TOKEN = re.compile(r'"(?:\\.|[^"\\])*"|\b([A-Za-z_]\w*)\s*:')


def js_array_to_json(text):
    def repl(m):
        if m.group(1) is None:
            return m.group(0)
        return f'"{m.group(1)}":'
    jt = _JS_TOKEN.sub(repl, text)
    jt = re.sub(r',\s*([\]}])', r'\1', jt)
    return jt


class MovieSorterApp:
    def __init__(self, root=None, mode="gui"):
        self.root = root
        self.mode = mode
        
        if self.mode == "gui" and self.root:
            self.root.title("電影二選一評分系統")
            self.root.geometry("600x450")
            self.root.configure(bg=COLOR_BG)
            # 監聽 GUI 視窗右上角 X 關閉事件，執行自動儲存並退出
            self.root.protocol("WM_DELETE_WINDOW", self.on_gui_close)
        
        self.movies = []
        self.match_count = 0
        self.categories = [] # 動態儲存偵測到的類別名稱
        
        self.load_data()
        
        self.target_matches = int(len(self.movies) * math.log2(max(2, len(self.movies))))
        
        if self.mode == "gui":
            self.setup_ui()
            self.next_match()

    def fatal(self, msg):
        """遇到無法安全處理的錯誤時直接中止，絕不寫入 movies.js，避免資料遺失"""
        if self.mode == "gui":
            messagebox.showerror("錯誤", msg)
        else:
            print(f"錯誤: {msg}")
        sys.exit(1)

    def parse_js_file(self, file_path):
        if not os.path.exists(file_path):
            self.fatal(f"找不到 {file_path}")
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        found_categories = re.findall(r'export const (\w+) =', content)
        self.categories = found_categories
        
        all_movies = []
        for cat in self.categories:
            pattern = rf'export const {cat} = (\[.*?\]);'
            match = re.search(pattern, content, re.DOTALL)
            if not match:
                self.fatal(f"無法在 movies.js 找到類別 {cat} 的陣列結尾 '];'，已中止（未修改任何檔案）")
            try:
                data = json.loads(js_array_to_json(match.group(1)))
            except json.JSONDecodeError as e:
                # 以前這裡會 continue 跳過，匯出時整個類別就會從 movies.js 消失
                self.fatal(f"類別 {cat} 解析失敗：{e}\n已中止（未修改任何檔案），請檢查 movies.js 格式")
            expected = len(re.findall(r'\{\s*title\s*:', match.group(1)))
            if len(data) != expected:
                self.fatal(f"類別 {cat} 解析出 {len(data)} 部，但檔案中有 {expected} 個 title，已中止（未修改任何檔案）")
            for m in data:
                m['category'] = cat
                all_movies.append(m)
        return all_movies

    def load_data(self):
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

        # 舊版進度檔沒有記錄每部片的比對次數，用平均值估計
        est_games = round(2 * self.match_count / max(1, len(saved_movies_map))) if saved_movies_map else 0

        final_list = []
        for m in js_movies:
            orig_score = m.get('score', 0)
            base_elo = clamp_elo(orig_score * ELO_MULTIPLIER)
            saved = saved_movies_map.get(m['title'])
            
            if saved and 'elo' in saved:
                if 'exported_score' in saved:
                    # 新版：拿 movies.js 的分數跟「上次匯出的分數」比，不同才代表你手動改過
                    # （沒按儲存就關掉時兩者相同，進度會保留）
                    manually_edited = abs(saved['exported_score'] - orig_score) > 0.01
                else:
                    # 舊版進度檔：退回用 Elo 換算分數來判斷
                    manually_edited = abs(self.get_display_score(saved['elo']) - orig_score) > 0.01
                
                m['elo'] = base_elo if manually_edited else clamp_elo(saved['elo'])
                m['games'] = saved.get('games', est_games)
            else:
                m['elo'] = base_elo
                m['games'] = 0
            
            m['exported_score'] = orig_score
            final_list.append(m)
            
        self.movies = final_list

    def get_display_score(self, elo):
        raw_score = elo / ELO_MULTIPLIER
        final_score = max(SCORE_MIN, min(SCORE_MAX, raw_score))
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
        
        exit_style = {"font": ("微軟正黑體", 10), "bg": COLOR_PRIMARY, "fg": "white", 
                      "relief": "flat", "padx": 20, "pady": 6, "cursor": "hand2"}

        tk.Button(btn_frame, text="儲存並關閉退出", command=self.on_gui_close, **exit_style).pack()

    def on_gui_close(self):
        self.export_js()
        self.root.destroy()

    def is_same_bound(self, a, b):
        """兩部都顯示 9.5（或都顯示 5.9）時，比完畫面分數也不會變"""
        sa, sb = self.get_display_score(a['elo']), self.get_display_score(b['elo'])
        return sa == sb and sa in (SCORE_MIN, SCORE_MAX)

    def pick_first(self):
        """新片（比不到 NEW_MOVIE_GAMES 場）優先上場；其餘依比對次數加權，比得少的較常被抽到"""
        fresh = [m for m in self.movies if m['games'] < NEW_MOVIE_GAMES]
        if fresh:
            fewest = min(m['games'] for m in fresh)
            return random.choice([m for m in fresh if m['games'] == fewest])
        weights = [1 / (1 + m['games']) for m in self.movies]
        return random.choices(self.movies, weights=weights)[0]

    def pick_pair(self):
        """改進的挑選邏輯：鄰近對決（Proximity Matchmaking）"""
        # 1. 選出第一個對手（新片、比得少的片優先）
        m1 = self.pick_first()
        
        # 2. 將所有電影按目前的 Elo 排序
        sorted_movies = sorted(self.movies, key=lambda x: x['elo'])
        idx = next(i for i, m in enumerate(sorted_movies) if m is m1)
        
        # 3. 定義搜尋區間（挑選附近的 6 部電影），這能讓勝負更具懸念，收斂更快
        window_size = 6
        start = max(0, idx - window_size)
        end = min(len(sorted_movies) - 1, idx + window_size)
        
        # 排除掉自己，以及比了也不會改變畫面分數的同邊界對手
        candidates = [m for i, m in enumerate(sorted_movies)
                      if start <= i <= end and m is not m1 and not self.is_same_bound(m, m1)]
        
        # 附近都是同邊界的片（例如一群 5.9 擠在一起）時，改找 Elo 最接近的非同邊界電影
        if not candidates:
            others = [m for m in self.movies if m is not m1 and not self.is_same_bound(m, m1)] \
                     or [m for m in self.movies if m is not m1]
            others.sort(key=lambda m: abs(m['elo'] - m1['elo']))
            candidates = others[:window_size]
        return m1, random.choice(candidates)

    def next_match(self):
        if len(self.movies) < 2: return
        
        self.m1, self.m2 = self.pick_pair()
        # 隨機左右，避免新片永遠出現在同一邊
        if random.random() < 0.5:
            self.m1, self.m2 = self.m2, self.m1
        s1 = self.get_display_score(self.m1['elo'])
        s2 = self.get_display_score(self.m2['elo'])
        
        if self.mode == "gui":
            self.btn_left.config(text=f"{self.m1['title']}\n\n★ {s1}")
            self.btn_right.config(text=f"{self.m2['title']}\n\n★ {s2}")
            
            prog_text = f"已比對: {self.match_count} 次  |  建議目標: {self.target_matches} 次"
            self.prog_label.config(text=prog_text)

    def handle_choice(self, winner):
        # 每部片依自己的比對次數決定 K 值（新片調整快、老片穩定）
        k1, k2 = k_factor(self.m1['games']), k_factor(self.m2['games'])
        r1, r2 = self.m1['elo'], self.m2['elo']
        
        # Elo 期望勝率公式
        exp1 = 1 / (1 + 10 ** ((r2 - r1) / 400))
        exp2 = 1 - exp1
        
        score1 = 1 if winner == 1 else 0
        self.m1['elo'] = clamp_elo(r1 + k1 * (score1 - exp1))
        self.m2['elo'] = clamp_elo(r2 + k2 * ((1 - score1) - exp2))
        self.m1['games'] += 1
        self.m2['games'] += 1
            
        self.match_count += 1
        self.save_progress()
        if self.mode == "gui":
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
                        if key not in ['title', 'score', 'note', 'poster'] and key not in INTERNAL_KEYS:
                            parts.append(f'{key}: {json.dumps(val, ensure_ascii=False)}')
                    
                    item_str = ", ".join(parts)
                    f.write(f'  {{ {item_str} }},\n')
                f.write("];\n\n")
        
        # 記錄這次匯出的分數，下次啟動才能分辨「手動改過」與「沒按儲存就關掉」
        for m in self.movies:
            m['exported_score'] = m['score']
        self.save_progress()
        
        msg = f"分數已更新至 {OUTPUT_JS}\n已偵測並保留類別：{', '.join(self.categories)}"
        if self.mode == "gui":
            messagebox.showinfo("儲存成功", msg)
        else:
            print(f"\n[儲存成功] {msg}\n")

    def run_cli(self):
        print("\n" + "="*50)
        print(" 電影二選一評分系統 (Terminal 模式)")
        print("="*50)
        
        while True:
            self.next_match()
            s1 = self.get_display_score(self.m1['elo'])
            s2 = self.get_display_score(self.m2['elo'])
            
            print(f"\n[已比對: {self.match_count} 次 | 建議目標: {self.target_matches} 次]")
            print(f" 1. {self.m1['title']} (★ {s1})")
            print(f" 2. {self.m2['title']} (★ {s2})")
            print(" Q. 儲存並關閉退出")
            
            while True:
                choice = input("請選擇 (1/2/Q): ").strip().lower()
                if choice == '1':
                    self.handle_choice(1)
                    break
                elif choice == '2':
                    self.handle_choice(2)
                    break
                elif choice == 'q':
                    self.export_js()
                    print("已儲存並退出系統。")
                    return
                else:
                    print("無效輸入，請輸入 1, 2 或 Q。")

if __name__ == "__main__":
    print("請選擇執行模式：")
    print("1. Terminal 模式 (命令行)")
    print("2. GUI 模式 (圖形介面)")
    mode_choice = input("請輸入選項 (1 或 2，預設為 2): ").strip()
    
    if mode_choice == "1":
        app = MovieSorterApp(mode="cli")
        app.run_cli()
    else:
        root = tk.Tk()
        app = MovieSorterApp(root, mode="gui")
        root.mainloop()