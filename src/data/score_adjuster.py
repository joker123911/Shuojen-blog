import re
import sys
import json
import os
import random
import math
from collections import deque
import tkinter as tk
from tkinter import messagebox

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

# 避免短時間內重複出現相同對戰組合的記憶長度
RECENT_PAIRS_LIMIT = 20

# 程式內部使用、不寫回 movies.js 的欄位
INTERNAL_KEYS = {'category', 'elo', 'games', 'exported_score'}

# 現代化配色
COLOR_BG = "#F8F9FA"
COLOR_CARD = "#FFFFFF"
COLOR_CARD_HOVER = "#E9ECEF"
COLOR_PRIMARY = "#007AFF"
COLOR_SECONDARY = "#6C757D"
COLOR_TEXT = "#212529"
COLOR_SUBTEXT = "#6C757D"
COLOR_VS = "#ADB5BD"


def clamp_elo(elo):
    return max(ELO_FLOOR, min(ELO_CEIL, elo))


def k_factor(games):
    return max(K_MIN, K_MAX * K_HALF_LIFE / (K_HALF_LIFE + games))


def atomic_write_text(file_path, content):
    """原子寫入：先寫入暫存檔再替換原檔，避免寫入中斷造成檔案損毀"""
    tmp_path = f"{file_path}.tmp"
    with open(tmp_path, 'w', encoding='utf-8') as f:
        f.write(content)
    os.replace(tmp_path, file_path)


# 同時處理：雙引號字串、單引號字串、單行註解、多行註解、以及未加引號的 JS 屬性鍵名
_JS_TOKEN = re.compile(
    r'("(?:\\.|[^"\\])*")'
    r"|('(?:\\.|[^'\\])*')"
    r'|(//[^\r\n]*)'
    r'|(/\*[\s\S]*?\*/)'
    r'|\b([A-Za-z_]\w*)\s*:'
)


def js_array_to_json(text):
    """將 JS 陣列語法安全轉換為合法 JSON 字串"""
    def repl(m):
        dbl_str, sgl_str, line_comment, block_comment, key = m.groups()
        if dbl_str is not None:
            return dbl_str
        if sgl_str is not None:
            # 將單引號字串轉為合法 JSON 雙引號字串
            inner = sgl_str[1:-1].replace(r"\'", "'").replace('"', r'\"')
            return f'"{inner}"'
        if line_comment is not None or block_comment is not None:
            return ''
        if key is not None:
            return f'"{key}":'
        return m.group(0)

    jt = _JS_TOKEN.sub(repl, text)
    jt = re.sub(r',\s*([\]}])', r'\1', jt)
    return jt


def extract_js_array_span(content, start_idx):
    """
    從 start_idx 開始尋找完整匹配的 [...] 陣列區間（自動忽略字串與註解內的括號），
    解決 note 內文含有 '];' 時會導致正則表達式提早截斷的 Bug。
    回傳 (array_str, span_start, span_end_including_semicolon)
    """
    n = len(content)
    i = content.find('[', start_idx)
    if i == -1:
        return None, -1, -1

    arr_start = i
    depth = 0
    in_str = None
    escaped = False

    while i < n:
        ch = content[i]

        if in_str:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == in_str:
                in_str = None
            i += 1
            continue

        # 跳過單行註解
        if ch == '/' and i + 1 < n and content[i + 1] == '/':
            nl = content.find('\n', i + 2)
            i = n if nl == -1 else nl + 1
            continue

        # 跳過多行註解
        if ch == '/' and i + 1 < n and content[i + 1] == '*':
            end_comment = content.find('*/', i + 2)
            i = n if end_comment == -1 else end_comment + 2
            continue

        if ch in ('"', "'", '`'):
            in_str = ch
        elif ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                arr_end = i + 1
                # 檢查後方是否有分號
                rest_idx = arr_end
                while rest_idx < n and content[rest_idx] in (' ', '\t'):
                    rest_idx += 1
                if rest_idx < n and content[rest_idx] == ';':
                    rest_idx += 1
                return content[arr_start:arr_end], arr_start, rest_idx
        i += 1

    return None, -1, -1


class MovieSorterApp:
    def __init__(self, root=None, mode="gui"):
        self.root = root
        self.mode = mode

        if self.mode == "gui" and self.root:
            self.root.title("電影二選一評分系統")
            self.root.geometry("680x480")
            self.root.minsize(580, 420)
            self.root.configure(bg=COLOR_BG)
            self.root.protocol("WM_DELETE_WINDOW", self.on_gui_close)

        self.movies = []
        self.match_count = 0
        self.categories = []
        self.recent_pairs = deque(maxlen=RECENT_PAIRS_LIMIT)
        self.history = deque(maxlen=50)  # 支援復原上一步 (Undo)
        self.m1 = None
        self.m2 = None

        self.load_data()

        self.target_matches = int(len(self.movies) * math.log2(max(2, len(self.movies))))

        if self.mode == "gui":
            self.setup_ui()
            self.bind_shortcuts()
            self.next_match()

    def fatal(self, msg):
        """遇到無法安全處理的錯誤時直接中止，絕不寫入 movies.js，避免資料遺失"""
        if self.mode == "gui" and self.root:
            messagebox.showerror("錯誤", msg)
        else:
            print(f"❌ 錯誤: {msg}", file=sys.stderr)
        sys.exit(1)

    @staticmethod
    def movie_key(m):
        """使用 (category, title) 作為唯一識別，避免不同分類出現同名作品時互相覆蓋"""
        return (m.get('category', ''), m['title'])

    def parse_js_file(self, file_path):
        if not os.path.exists(file_path):
            self.fatal(f"找不到 {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        export_matches = list(re.finditer(r'export\s+const\s+(\w+)\s*=', content))
        if not export_matches:
            self.fatal("在 movies.js 中找不到任何 'export const <名稱> =' 宣告")

        self.categories = [m.group(1) for m in export_matches]

        all_movies = []
        for m in export_matches:
            cat = m.group(1)
            arr_text, _, _ = extract_js_array_span(content, m.end())
            if not arr_text:
                self.fatal(f"無法在 movies.js 找到類別 {cat} 的完整陣列 '[...]'，已中止（未修改任何檔案）")

            try:
                data = json.loads(js_array_to_json(arr_text))
            except json.JSONDecodeError as e:
                self.fatal(f"類別 {cat} 解析失敗：{e}\n已中止（未修改任何檔案），請檢查 movies.js 格式")

            # 相容未加引號與已加引號的 title 鍵名檢查
            expected = len(re.findall(r'["\']?\btitle\b["\']?\s*:', arr_text))
            if len(data) != expected:
                self.fatal(f"類別 {cat} 解析出 {len(data)} 部，但檔案中有 {expected} 個 title，已中止（未修改任何檔案）")

            for item in data:
                item['category'] = cat
                all_movies.append(item)

        return all_movies

    def load_data(self):
        js_movies = self.parse_js_file(INPUT_JS)

        saved_by_full_key = {}
        saved_by_title = {}

        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                    saved_data = json.load(f)
                if isinstance(saved_data, dict):
                    saved_movies = saved_data.get('movies', [])
                    self.match_count = saved_data.get('match_count', 0)
                else:
                    saved_movies = saved_data

                for sm in saved_movies:
                    if 'title' in sm:
                        saved_by_title[sm['title']] = sm
                        if 'category' in sm:
                            saved_by_full_key[(sm['category'], sm['title'])] = sm
            except Exception as e:
                self.fatal(f"讀取進度檔 {PROGRESS_FILE} 失敗：{e}\n請檢查或移除損毀的 progress.json")

        total_saved = len(saved_by_full_key) or len(saved_by_title)
        est_games = round(2 * self.match_count / max(1, total_saved)) if total_saved else 0

        final_list = []
        for m in js_movies:
            orig_score = float(m.get('score', 0))
            base_elo = clamp_elo(orig_score * ELO_MULTIPLIER)
            saved = saved_by_full_key.get(self.movie_key(m)) or saved_by_title.get(m['title'])

            if saved and 'elo' in saved:
                if 'exported_score' in saved:
                    manually_edited = abs(float(saved['exported_score']) - orig_score) > 0.01
                else:
                    manually_edited = abs(self.get_display_score(saved['elo']) - orig_score) > 0.01

                m['elo'] = base_elo if manually_edited else clamp_elo(float(saved['elo']))
                m['games'] = 0 if manually_edited else int(saved.get('games', est_games))
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
        self.prog_label = tk.Label(
            self.root, text="", font=("Segoe UI", 10),
            bg=COLOR_BG, fg=COLOR_TEXT
        )
        self.prog_label.pack(pady=(18, 4))

        hint_label = tk.Label(
            self.root,
            text="快捷鍵：[← / 1] 選左邊   [→ / 2] 選右邊   [Space / S] 換一組   [Z / BackSpace] 復原   [Esc] 儲存退出",
            font=("微軟正黑體", 9), bg=COLOR_BG, fg=COLOR_SUBTEXT
        )
        hint_label.pack(pady=(0, 10))

        frame = tk.Frame(self.root, bg=COLOR_BG)
        frame.pack(expand=True, fill="both", padx=30, pady=5)

        self.btn_left = tk.Button(
            frame, text="", wraplength=220, font=("微軟正黑體", 13, "bold"),
            command=lambda: self.handle_choice(1), height=8, width=22,
            bg=COLOR_CARD, fg=COLOR_TEXT, relief="flat",
            activebackground=COLOR_CARD_HOVER, bd=0, cursor="hand2"
        )
        self.btn_left.pack(side="left", expand=True, fill="both", padx=10)

        tk.Label(
            frame, text="VS", font=("Segoe UI", 18, "italic bold"),
            bg=COLOR_BG, fg=COLOR_VS
        ).pack(side="left", padx=5)

        self.btn_right = tk.Button(
            frame, text="", wraplength=220, font=("微軟正黑體", 13, "bold"),
            command=lambda: self.handle_choice(2), height=8, width=22,
            bg=COLOR_CARD, fg=COLOR_TEXT, relief="flat",
            activebackground=COLOR_CARD_HOVER, bd=0, cursor="hand2"
        )
        self.btn_right.pack(side="left", expand=True, fill="both", padx=10)

        btn_frame = tk.Frame(self.root, bg=COLOR_BG)
        btn_frame.pack(pady=20)

        sub_btn_style = {
            "font": ("微軟正黑體", 10), "bg": "#E9ECEF", "fg": COLOR_TEXT,
            "relief": "flat", "padx": 14, "pady": 6, "cursor": "hand2"
        }
        primary_btn_style = {
            "font": ("微軟正黑體", 10, "bold"), "bg": COLOR_PRIMARY, "fg": "white",
            "relief": "flat", "padx": 20, "pady": 6, "cursor": "hand2"
        }

        self.btn_undo = tk.Button(btn_frame, text="↩ 復原上一步 (Z)", command=self.undo_last_match, state="disabled", **sub_btn_style)
        self.btn_undo.pack(side="left", padx=6)

        tk.Button(btn_frame, text="🔀 換一組 (Space)", command=self.skip_match, **sub_btn_style).pack(side="left", padx=6)
        tk.Button(btn_frame, text="💾 儲存並退出 (Esc)", command=self.on_gui_close, **primary_btn_style).pack(side="left", padx=6)

    def bind_shortcuts(self):
        self.root.bind("<Left>", lambda e: self.handle_choice(1))
        self.root.bind("1", lambda e: self.handle_choice(1))
        self.root.bind("<KP_1>", lambda e: self.handle_choice(1))

        self.root.bind("<Right>", lambda e: self.handle_choice(2))
        self.root.bind("2", lambda e: self.handle_choice(2))
        self.root.bind("<KP_2>", lambda e: self.handle_choice(2))

        self.root.bind("<space>", lambda e: self.skip_match())
        self.root.bind("s", lambda e: self.skip_match())
        self.root.bind("S", lambda e: self.skip_match())

        self.root.bind("z", lambda e: self.undo_last_match())
        self.root.bind("Z", lambda e: self.undo_last_match())
        self.root.bind("<BackSpace>", lambda e: self.undo_last_match())
        self.root.bind("<Control-z>", lambda e: self.undo_last_match())

        self.root.bind("<Escape>", lambda e: self.on_gui_close())
        self.root.bind("q", lambda e: self.on_gui_close())
        self.root.bind("Q", lambda e: self.on_gui_close())

    def on_gui_close(self):
        self.export_js()
        if self.root:
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
        """鄰近對決（Proximity Matchmaking）並避開近期已比過的重複組合"""
        m1 = self.pick_first()
        key1 = self.movie_key(m1)

        sorted_movies = sorted(self.movies, key=lambda x: x['elo'])
        idx = next(i for i, m in enumerate(sorted_movies) if m is m1)

        window_size = 6
        start = max(0, idx - window_size)
        end = min(len(sorted_movies) - 1, idx + window_size)

        # 優先挑選：視窗內 + 非同邊界 + 近期未對戰過
        candidates = [
            m for i, m in enumerate(sorted_movies)
            if start <= i <= end
            and m is not m1
            and not self.is_same_bound(m, m1)
            and frozenset((key1, self.movie_key(m))) not in self.recent_pairs
        ]

        # 若視窗內都比過了，擴大找全體中 Elo 最接近且近期未對戰過的非同邊界電影
        if not candidates:
            others = [
                m for m in self.movies
                if m is not m1
                and not self.is_same_bound(m, m1)
                and frozenset((key1, self.movie_key(m))) not in self.recent_pairs
            ]
            if not others:
                others = [m for m in self.movies if m is not m1 and not self.is_same_bound(m, m1)] \
                         or [m for m in self.movies if m is not m1]
            others.sort(key=lambda m: abs(m['elo'] - m1['elo']))
            candidates = others[:window_size]

        m2 = random.choice(candidates)
        return m1, m2

    def format_card_text(self, movie):
        score = self.get_display_score(movie['elo'])
        games = movie.get('games', 0)
        new_badge = " [新片]" if games < NEW_MOVIE_GAMES else ""
        return f"{movie['title']}\n\n★ {score}\n({games} 場{new_badge})"

    def update_ui_labels(self):
        if self.mode != "gui" or not self.m1 or not self.m2:
            return
        self.btn_left.config(text=self.format_card_text(self.m1))
        self.btn_right.config(text=self.format_card_text(self.m2))

        fresh_count = sum(1 for m in self.movies if m['games'] < NEW_MOVIE_GAMES)
        fresh_info = f"  |  待定位新片: {fresh_count} 部" if fresh_count > 0 else ""
        prog_text = f"已比對: {self.match_count} 次  |  建議目標: {self.target_matches} 次{fresh_info}"
        self.prog_label.config(text=prog_text)
        self.btn_undo.config(state="normal" if self.history else "disabled")

    def next_match(self):
        if len(self.movies) < 2:
            return

        self.m1, self.m2 = self.pick_pair()
        if random.random() < 0.5:
            self.m1, self.m2 = self.m2, self.m1

        self.update_ui_labels()

    def skip_match(self):
        """跳過目前組合，重新抽一組"""
        if self.m1 and self.m2:
            self.recent_pairs.append(frozenset((self.movie_key(self.m1), self.movie_key(self.m2))))
        self.next_match()

    def handle_choice(self, winner):
        if not self.m1 or not self.m2:
            return

        # 紀錄狀態供 Undo 復原使用
        self.history.append({
            'm1': self.m1,
            'm2': self.m2,
            'elo1': self.m1['elo'],
            'elo2': self.m2['elo'],
            'games1': self.m1['games'],
            'games2': self.m2['games'],
            'match_count': self.match_count,
        })

        k1, k2 = k_factor(self.m1['games']), k_factor(self.m2['games'])
        r1, r2 = self.m1['elo'], self.m2['elo']

        exp1 = 1 / (1 + 10 ** ((r2 - r1) / 400))
        exp2 = 1 - exp1

        score1 = 1 if winner == 1 else 0
        self.m1['elo'] = clamp_elo(r1 + k1 * (score1 - exp1))
        self.m2['elo'] = clamp_elo(r2 + k2 * ((1 - score1) - exp2))
        self.m1['games'] += 1
        self.m2['games'] += 1

        self.recent_pairs.append(frozenset((self.movie_key(self.m1), self.movie_key(self.m2))))
        self.match_count += 1
        self.save_progress()

        if self.mode == "gui":
            self.next_match()

    def undo_last_match(self):
        """復原上一場比對結果"""
        if not self.history:
            return False

        last = self.history.pop()
        last['m1']['elo'] = last['elo1']
        last['m2']['elo'] = last['elo2']
        last['m1']['games'] = last['games1']
        last['m2']['games'] = last['games2']
        self.match_count = last['match_count']
        self.m1, self.m2 = last['m1'], last['m2']

        if self.recent_pairs:
            self.recent_pairs.pop()

        self.save_progress()
        if self.mode == "gui":
            self.update_ui_labels()
        return True

    def save_progress(self):
        payload = json.dumps(
            {'movies': self.movies, 'match_count': self.match_count},
            ensure_ascii=False, indent=2
        )
        atomic_write_text(PROGRESS_FILE, payload)

    def format_category_block(self, cat, m_list):
        lines = [f"export const {cat} = ["]
        # 匯出時按內部 Elo 由高到低排序，同分時維持穩定順序
        for m in sorted(m_list, key=lambda x: x['elo'], reverse=True):
            parts = []
            for key in ['title', 'score', 'note', 'poster']:
                if key in m:
                    parts.append(f'{key}: {json.dumps(m[key], ensure_ascii=False)}')
            for key, val in m.items():
                if key not in ['title', 'score', 'note', 'poster'] and key not in INTERNAL_KEYS:
                    parts.append(f'{key}: {json.dumps(val, ensure_ascii=False)}')
            lines.append(f"  {{ {', '.join(parts)} }},")
        lines.append("];")
        return "\n".join(lines)

    def export_js(self):
        categories_output = {cat: [] for cat in self.categories}

        for m in self.movies:
            cat = m['category']
            m['score'] = self.get_display_score(m['elo'])
            if cat in categories_output:
                categories_output[cat].append(m)

        # 讀取原始 movies.js 進行原位替換，保留檔案內可能存在的註解或其他程式碼
        with open(INPUT_JS, 'r', encoding='utf-8') as f:
            content = f.read()

        for cat, m_list in categories_output.items():
            decl_match = re.search(rf'export\s+const\s+{re.escape(cat)}\s*=', content)
            if not decl_match:
                self.fatal(f"匯出時找不到類別 {cat} 的宣告，已中止寫入")
            _, _, span_end = extract_js_array_span(content, decl_match.end())
            if span_end == -1:
                self.fatal(f"匯出時無法定位類別 {cat} 的陣列結尾，已中止寫入")

            new_block = self.format_category_block(cat, m_list)
            content = content[:decl_match.start()] + new_block + content[span_end:]

        atomic_write_text(OUTPUT_JS, content)

        # 記錄這次匯出的分數，下次啟動才能分辨「手動改過」與「沒按儲存就關掉」
        for m in self.movies:
            m['exported_score'] = m['score']
        self.save_progress()

        msg = f"分數已安全更新至 {OUTPUT_JS}\n已偵測並保留類別：{', '.join(self.categories)}"
        if self.mode == "gui" and self.root:
            messagebox.showinfo("儲存成功", msg)
        else:
            print(f"\n✅ [儲存成功] {msg}\n")

    def run_cli(self):
        print("\n" + "=" * 55)
        print(" 電影二選一評分系統 (Terminal 模式)")
        print(" 指令: [1/2] 選擇勝者 | [S] 換一組 | [Z] 復原 | [Q] 儲存退出")
        print("=" * 55)

        try:
            self.next_match()
            while True:
                s1 = self.get_display_score(self.m1['elo'])
                s2 = self.get_display_score(self.m2['elo'])

                print(f"\n[已比對: {self.match_count} 次 | 建議目標: {self.target_matches} 次]")
                print(f" 1. {self.m1['title']} (★ {s1} | {self.m1['games']} 場)")
                print(f" 2. {self.m2['title']} (★ {s2} | {self.m2['games']} 場)")

                choice = input("請選擇 (1/2/S/Z/Q): ").strip().lower()
                if choice == '1':
                    self.handle_choice(1)
                    self.next_match()
                elif choice == '2':
                    self.handle_choice(2)
                    self.next_match()
                elif choice == 's':
                    self.skip_match()
                elif choice == 'z':
                    if self.undo_last_match():
                        print("↩ 已復原上一場比對。")
                    else:
                        print("⚠️ 目前沒有可復原的紀錄。")
                elif choice == 'q':
                    self.export_js()
                    print("已儲存並退出系統。")
                    return
                else:
                    print("無效輸入，請輸入 1, 2, S(跳過), Z(復原) 或 Q(儲存退出)。")
        except KeyboardInterrupt:
            print("\n\n偵測到 Ctrl+C 中斷，正在為您自動儲存目前進度並匯出...")
            self.export_js()


if __name__ == "__main__":
    cli_args = {arg.lower() for arg in sys.argv[1:]}
    if "--cli" in cli_args or "-c" in cli_args:
        mode_choice = "1"
    elif "--gui" in cli_args or "-g" in cli_args or not sys.stdin.isatty():
        mode_choice = "2"
    else:
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