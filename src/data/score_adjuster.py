import re
import sys
import json
import os
import random
import math
import time
import statistics
from collections import deque
import tkinter as tk
from tkinter import messagebox

# 設定檔（以腳本所在資料夾為基準，從任何位置執行都找得到檔案）
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROGRESS_FILE = os.path.join(BASE_DIR, 'progress.json')
INPUT_JS = os.path.join(BASE_DIR, 'movies.js')
OUTPUT_JS = INPUT_JS

# 絕對固定的分數與 Elo 轉換權重（顯示分數 = Elo / 200，每 0.1 分 = 20 點 Elo）
ELO_MULTIPLIER = 200

# 固定的分數上下限：最頂的片就是 9.5、最爛的片就是 5.9（不再從資料推算，避免上下限越縮越小）
SCORE_MIN, SCORE_MAX = 5.9, 9.5
# 內部 Elo 最多允許超出邊界幾分：
#   顯示 9.5 的 Elo 區間是 [9.45, 9.5 + BUFFER] × 200（5.9 同理），一般每一格只有 20 點寬。
#   0   → 頂端區間 10 點寬：新片輸一場就掉到 9.4，比過 30 場的老片輸一場只扣約 4 點，仍是 9.5
#   0.3 → 頂端區間 70 點寬：比過 30 場的老片要對 9.4 的片連輸約 16 場才會掉到 9.4
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

# 鄰近對決的視窗大小（依 Elo 排名前後各幾部）
WINDOW_SIZE = 6

# 兩部都顯示 9.5（或都顯示 5.9）的對決被抽中的相對權重：
# 這種對決大多不會改變畫面分數，但能排出同分片的先後、也讓偏弱的 9.5 有機會掉回 9.4，所以降低機率而不完全禁止
SAME_BOUND_WEIGHT = 0.25

# 程式內部使用、不寫回 movies.js 的欄位
INTERNAL_KEYS = {'category', 'elo', 'games', 'exported_score'}

# Windows 上檔案被其他程式（Vite、防毒、編輯器）短暫開啟時，os.replace 會失敗，重試的次數
REPLACE_RETRIES = 8

# 現代化配色
COLOR_BG = "#F8F9FA"
COLOR_CARD = "#FFFFFF"
COLOR_CARD_HOVER = "#E9ECEF"
COLOR_PRIMARY = "#007AFF"
COLOR_SECONDARY = "#6C757D"
COLOR_TEXT = "#212529"
COLOR_SUBTEXT = "#6C757D"
COLOR_VS = "#ADB5BD"
COLOR_ERROR = "#D9480F"


def clamp_elo(elo):
    return max(ELO_FLOOR, min(ELO_CEIL, elo))


def k_factor(games):
    return max(K_MIN, K_MAX * K_HALF_LIFE / (K_HALF_LIFE + games))


def norm_title(title):
    """比對用的片名：去掉前後空白，之後手動修掉 movies.js 片名的空白也不會被當成新片"""
    return str(title).strip()


def atomic_write_text(file_path, content):
    """原子寫入：先寫入暫存檔再替換原檔，避免寫入中斷造成檔案損毀。
    Windows 上目標檔被其他程式短暫占用時會 PermissionError，稍等後重試。"""
    tmp_path = f"{file_path}.tmp"
    with open(tmp_path, 'w', encoding='utf-8') as f:
        f.write(content)
    for attempt in range(REPLACE_RETRIES):
        try:
            os.replace(tmp_path, file_path)
            return
        except PermissionError:
            if attempt == REPLACE_RETRIES - 1:
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
                raise
            time.sleep(0.05 * (attempt + 1))


# ---------------------------------------------------------------------------
# movies.js 解析
# ---------------------------------------------------------------------------

# 同時處理：雙引號字串、單引號字串、單行註解、多行註解、以及未加引號的 JS 屬性鍵名
_JS_TOKEN = re.compile(
    r'("(?:\\.|[^"\\])*")'
    r"|('(?:\\.|[^'\\])*')"
    r'|(//[^\r\n]*)'
    r'|(/\*[\s\S]*?\*/)'
    r'|\b([A-Za-z_$][\w$]*)\s*:'
)

# 字串內的跳脫字元，或單引號字串裡未跳脫的雙引號
_JS_STR_ESCAPE = re.compile(r'\\(x[0-9A-Fa-f]{2}|[\s\S])|"')
_JS_SIMPLE_ESCAPES = {'v': r'\u000b', '0': r'\u0000'}

# 轉換後的 JSON 字串，或「後面緊接 ] 或 } 的尾隨逗號」
_JSON_STR_OR_TRAILING_COMMA = re.compile(r'("(?:\\.|[^"\\])*")|,(\s*[\]}])')

# 字串／註解／title 鍵名（用來獨立核對解析出的電影數量）
_TITLE_KEY = re.compile(
    r'("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`)(\s*:)?'
    r'|(//[^\r\n]*|/\*[\s\S]*?\*/)'
    r'|(?<![\w$])(title)\s*:'
)

# 字串或註解（用來取出陣列內的註解）
_STR_OR_COMMENT = re.compile(
    r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`'
    r'|(//[^\r\n]*|/\*[\s\S]*?\*/)'
)

_EXPORT_DECL = re.compile(r'export\s+const\s+([A-Za-z_$][\w$]*)\s*=')


def _js_string_body_to_json(body):
    """把 JS 字串內容轉成合法的 JSON 字串內容（不含外層引號）"""
    def repl(m):
        esc = m.group(1)
        if esc is None:              # 單引號字串裡未跳脫的 "
            return '\\"'
        if esc == "'":               # JS 的 \' 在 JSON 不合法
            return "'"
        if esc in ('\n', '\r'):      # 行尾接續
            return ''
        if esc[0] == 'x' and len(esc) == 3:
            return '\\u00' + esc[1:]
        if esc in _JS_SIMPLE_ESCAPES:
            return _JS_SIMPLE_ESCAPES[esc]
        return m.group(0)
    return _JS_STR_ESCAPE.sub(repl, body)


def js_array_to_json(text):
    """將 JS 陣列語法安全轉換為合法 JSON 字串（字串內容不會被誤改）"""
    def repl(m):
        dbl_str, sgl_str, line_comment, block_comment, key = m.groups()
        if dbl_str is not None:
            return '"' + _js_string_body_to_json(dbl_str[1:-1]) + '"'
        if sgl_str is not None:
            return '"' + _js_string_body_to_json(sgl_str[1:-1]) + '"'
        if line_comment is not None or block_comment is not None:
            return ''
        if key is not None:
            return f'"{key}":'
        return m.group(0)

    jt = _JS_TOKEN.sub(repl, text)
    # 移除尾隨逗號時跳過字串，避免 note 內文的「, ]」被改掉
    jt = _JSON_STR_OR_TRAILING_COMMA.sub(
        lambda m: m.group(1) if m.group(1) is not None else m.group(2), jt)
    return jt


def count_title_keys(text):
    """數出物件中 title 鍵的數量（忽略字串內文與註解，例如 note 裡寫了 title: 或被註解掉的電影）"""
    count = 0
    for m in _TITLE_KEY.finditer(text):
        string, colon, comment, bare = m.groups()
        if string is not None:
            if colon and string[1:-1] == 'title':
                count += 1
        elif bare is not None:
            count += 1
    return count


def extract_js_comments(text):
    """取出一段 JS 中所有的註解（略過字串內文）"""
    return [m.group(1) for m in _STR_OR_COMMENT.finditer(text) if m.group(1)]


def skip_ws_and_comments(content, i):
    n = len(content)
    while i < n:
        if content[i].isspace():
            i += 1
        elif content.startswith('//', i):
            nl = content.find('\n', i + 2)
            i = n if nl == -1 else nl + 1
        elif content.startswith('/*', i):
            end_comment = content.find('*/', i + 2)
            i = n if end_comment == -1 else end_comment + 2
        else:
            break
    return i


def extract_js_array_span(content, start_idx):
    """
    從 start_idx（= 之後）尋找完整匹配的 [...] 陣列區間（自動忽略字串與註解內的括號）。
    = 之後（略過空白與註解）的第一個字元必須是 [，否則視為不是陣列並回傳 (None, -1, -1)，
    避免 export const xxx = 123; 之類的宣告誤抓到下一個分類的陣列。
    回傳 (array_str, span_start, span_end_including_semicolon)
    """
    n = len(content)
    i = skip_ws_and_comments(content, start_idx)
    if i >= n or content[i] != '[':
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


def find_array_exports(content):
    """
    找出所有「export const 名稱 = [ ... ]」宣告，回傳 [(名稱, 宣告起點, 陣列文字, 區間終點)]。
    值不是陣列的 export 會被略過；落在前一個陣列內部（例如 note 內文）的假宣告也會被略過。
    """
    results = []
    last_end = 0
    for m in _EXPORT_DECL.finditer(content):
        if m.start() < last_end:
            continue
        arr_text, _, span_end = extract_js_array_span(content, m.end())
        if arr_text is None:
            continue
        results.append((m.group(1), m.start(), arr_text, span_end))
        last_end = span_end
    return results


class MovieSorterApp:
    def __init__(self, root=None, mode="gui"):
        self.root = root
        self.mode = mode

        if self.mode == "gui" and self.root:
            self.root.title("電影二選一評分系統")
            self.root.geometry("680x480")
            self.root.minsize(580, 420)
            self.root.configure(bg=COLOR_BG)
            self.root.protocol("WM_DELETE_WINDOW", self.on_window_close)

        self.movies = []
        self.match_count = 0
        self.categories = []
        self.recent_pairs = deque(maxlen=RECENT_PAIRS_LIMIT)
        self.history = deque(maxlen=50)  # 支援復原上一步 (Undo)
        self.m1 = None
        self.m2 = None
        self.dirty = False        # 有沒有尚未寫回 movies.js 的變更
        self.save_error = None    # 最近一次寫入 progress.json 失敗的訊息

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
        """使用 (category, 去掉前後空白的 title) 作為唯一識別，避免不同分類出現同名作品時互相覆蓋"""
        return (m.get('category', ''), norm_title(m['title']))

    def parse_js_file(self, file_path):
        if not os.path.exists(file_path):
            self.fatal(f"找不到 {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        exports = find_array_exports(content)
        if not exports:
            self.fatal("在 movies.js 中找不到任何 'export const <名稱> = [ ... ]' 陣列宣告")

        names = [name for name, _, _, _ in exports]
        dup = {n for n in names if names.count(n) > 1}
        if dup:
            self.fatal(f"movies.js 中重複宣告了類別：{', '.join(sorted(dup))}，已中止（未修改任何檔案）")
        self.categories = names

        all_movies = []
        for cat, _, arr_text, _ in exports:
            try:
                data = json.loads(js_array_to_json(arr_text))
            except json.JSONDecodeError as e:
                self.fatal(f"類別 {cat} 解析失敗：{e}\n已中止（未修改任何檔案），請檢查 movies.js 格式"
                           f"（不支援 ` 樣板字串與運算式）")

            expected = count_title_keys(arr_text)
            if len(data) != expected:
                self.fatal(f"類別 {cat} 解析出 {len(data)} 部，但檔案中有 {expected} 個 title，已中止（未修改任何檔案）")

            for item in data:
                if not isinstance(item, dict) or not isinstance(item.get('title'), str):
                    self.fatal(f"類別 {cat} 中有一筆資料不是含 title 字串的物件：{item!r}")
                clash = INTERNAL_KEYS & set(item)
                if clash:
                    self.fatal(f"《{item['title']}》含有程式內部使用的欄位名稱 {sorted(clash)}，"
                               f"儲存時會被覆蓋或刪除，已中止（未修改任何檔案）")
                item['category'] = cat
                all_movies.append(item)

        return all_movies

    def load_data(self):
        js_movies = self.parse_js_file(INPUT_JS)
        js_keys = {self.movie_key(m) for m in js_movies}

        saved_by_full_key = {}
        saved_by_title = {}   # 正規化片名 → [紀錄, ...]
        saved_dirty = False

        if os.path.exists(PROGRESS_FILE):
            try:
                with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                    saved_data = json.load(f)
                if isinstance(saved_data, dict):
                    saved_movies = saved_data.get('movies', [])
                    self.match_count = saved_data.get('match_count', 0)
                    saved_dirty = bool(saved_data.get('dirty', False))
                else:
                    saved_movies = saved_data

                for sm in saved_movies:
                    if isinstance(sm, dict) and 'title' in sm:
                        t = norm_title(sm['title'])
                        saved_by_title.setdefault(t, []).append(sm)
                        if 'category' in sm:
                            saved_by_full_key[(sm['category'], t)] = sm
            except Exception as e:
                self.fatal(f"讀取進度檔 {PROGRESS_FILE} 失敗：{e}\n請檢查或移除損毀的 progress.json")

        total_saved = sum(len(v) for v in saved_by_title.values())
        est_games = round(2 * self.match_count / total_saved) if total_saved else 0

        # 沒填 score 的新片從現有分數的中位數起跳，而不是從 0（= 最底的 5.9）起跳
        scores = []
        for m in js_movies:
            if m.get('score') is not None:
                try:
                    scores.append(float(m['score']))
                except (TypeError, ValueError):
                    self.fatal(f"《{m['title']}》的 score 不是數字：{m['score']!r}")
        default_score = round(statistics.median(scores), 1) if scores else round((SCORE_MIN + SCORE_MAX) / 2, 1)

        missing_score = False
        claimed = set()  # 已被「片名 fallback」認領的舊紀錄，避免一筆紀錄被兩部片繼承
        final_list = []
        for m in js_movies:
            if m.get('score') is None:
                orig_score = default_score
                missing_score = True
            else:
                orig_score = float(m['score'])
            base_elo = clamp_elo(orig_score * ELO_MULTIPLIER)

            key = self.movie_key(m)
            saved = saved_by_full_key.get(key)
            if saved is None:
                # 只有在舊紀錄沒有分類（舊版進度檔），或舊紀錄的分類裡已經沒有這部片（被搬到別的分類）時，
                # 才用片名對回舊紀錄；另一個分類的同名片仍在時，視為不同作品
                candidates = [
                    sm for sm in saved_by_title.get(key[1], [])
                    if id(sm) not in claimed
                    and ('category' not in sm or (sm['category'], key[1]) not in js_keys)
                ]
                if len(candidates) == 1:
                    saved = candidates[0]
                    claimed.add(id(saved))

            if saved and 'elo' in saved:
                saved_elo = clamp_elo(float(saved['elo']))
                # 檔案分數與「上次匯出的分數」和「目前 Elo 對應的分數」都不同，才算手動改過。
                # （寫入 movies.js 成功、但 progress.json 沒寫成功時，檔案分數會等於 Elo 對應的分數，不會被誤判）
                differs_from_export = ('exported_score' not in saved
                                       or abs(float(saved['exported_score']) - orig_score) > 0.01)
                differs_from_elo = abs(self.get_display_score(saved_elo) - orig_score) > 0.01
                manually_edited = differs_from_export and differs_from_elo

                m['elo'] = base_elo if manually_edited else saved_elo
                m['games'] = 0 if manually_edited else int(saved.get('games', est_games))
            else:
                m['elo'] = base_elo
                m['games'] = 0

            m['exported_score'] = orig_score
            final_list.append(m)

        self.movies = final_list
        self.dirty = saved_dirty or missing_score or any(
            abs(self.get_display_score(m['elo']) - m['exported_score']) > 0.01 for m in self.movies
        )

    def get_display_score(self, elo):
        raw_score = elo / ELO_MULTIPLIER
        final_score = max(SCORE_MIN, min(SCORE_MAX, raw_score))
        # 四捨五入到小數一位（一律 .x5 進位；內建 round 對 9.45 這類浮點數會捨去）
        return math.floor(final_score * 10 + 0.5 + 1e-9) / 10

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
        tk.Button(btn_frame, text="💾 儲存並退出 (Esc)", command=self.save_and_quit, **primary_btn_style).pack(side="left", padx=6)

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

        # 只保留 Esc，避免單按 q 誤觸就存檔退出
        self.root.bind("<Escape>", lambda e: self.save_and_quit())

    # ------------------------------------------------------------------
    # 關閉與儲存
    # ------------------------------------------------------------------

    def export_or_ask(self):
        """寫回 movies.js；成功回傳 True。失敗時詢問是否仍要關閉（是 → True）。"""
        try:
            self.export_js()
            return True
        except OSError as e:
            return messagebox.askyesno(
                "儲存失敗",
                f"寫入 movies.js 失敗：{e}\n\n"
                "比對進度仍保存在 progress.json，下次開啟後可再儲存。\n仍要關閉視窗嗎？"
            )

    def progress_flushed_or_ask(self):
        """確認 progress.json 已寫入；之前寫入失敗且這次仍失敗時，詢問是否仍要關閉"""
        if not self.save_error:
            return True
        if self.save_progress_safe():
            return True
        return messagebox.askyesno(
            "進度未保存",
            f"progress.json 一直寫入失敗：{self.save_error}\n\n關閉後這次的比對結果會遺失。仍要關閉嗎？"
        )

    def save_and_quit(self):
        """Esc／「儲存並退出」：有變更才寫回 movies.js，成功就直接關閉（不再跳出提示窗）"""
        if self.dirty and not self.export_or_ask():
            return
        if not self.progress_flushed_or_ask():
            return
        self.root.destroy()

    def on_window_close(self):
        """右上角 X：有未儲存的變更時詢問要不要寫回 movies.js"""
        if self.dirty:
            ans = messagebox.askyesnocancel(
                "關閉",
                "要把目前的分數寫回 movies.js 嗎？\n\n"
                "是：儲存並關閉\n否：不寫回直接關閉（比對進度仍保留，下次可再儲存）\n取消：返回"
            )
            if ans is None:
                return
            if ans and not self.export_or_ask():
                return
        if not self.progress_flushed_or_ask():
            return
        self.root.destroy()

    # ------------------------------------------------------------------
    # 配對
    # ------------------------------------------------------------------

    def is_same_bound(self, a, b):
        """兩部都顯示 9.5（或都顯示 5.9）"""
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

    def pair_key(self, a, b):
        return frozenset((self.movie_key(a), self.movie_key(b)))

    def pick_pair(self):
        """鄰近對決（Proximity Matchmaking）並避開近期已比過的重複組合"""
        m1 = self.pick_first()

        def is_fresh_pair(m):
            return m is not m1 and self.pair_key(m1, m) not in self.recent_pairs

        # 同 Elo 時隨機排列，避免同分片永遠只跟 movies.js 中相鄰（同分類）的片對決
        sorted_movies = sorted(self.movies, key=lambda x: (x['elo'], random.random()))
        idx = next(i for i, m in enumerate(sorted_movies) if m is m1)
        window = sorted_movies[max(0, idx - WINDOW_SIZE): idx + WINDOW_SIZE + 1]

        candidates = [m for m in window if is_fresh_pair(m)]

        # 若視窗內都比過了，擴大找全體中 Elo 最接近且近期未對戰過的電影
        if not candidates:
            others = [m for m in self.movies if is_fresh_pair(m)] \
                     or [m for m in self.movies if m is not m1]
            others.sort(key=lambda m: abs(m['elo'] - m1['elo']))
            candidates = others[:WINDOW_SIZE]

        weights = [SAME_BOUND_WEIGHT if self.is_same_bound(m, m1) else 1.0 for m in candidates]
        m2 = random.choices(candidates, weights=weights)[0]
        return m1, m2

    def format_card_text(self, movie):
        score = self.get_display_score(movie['elo'])
        games = movie.get('games', 0)
        new_badge = " [新片]" if games < NEW_MOVIE_GAMES else ""
        return f"{movie['title']}\n\n★ {score}\n({games} 場{new_badge})"

    def update_ui_labels(self):
        if self.mode != "gui":
            return
        if len(self.movies) < 2:
            self.prog_label.config(text="movies.js 中少於 2 部電影，無法比對", fg=COLOR_ERROR)
            return
        if not self.m1 or not self.m2:
            return
        self.btn_left.config(text=self.format_card_text(self.m1))
        self.btn_right.config(text=self.format_card_text(self.m2))

        fresh_count = sum(1 for m in self.movies if m['games'] < NEW_MOVIE_GAMES)
        fresh_info = f"  |  待定位新片: {fresh_count} 部" if fresh_count > 0 else ""
        prog_text = f"已比對: {self.match_count} 次  |  建議目標: {self.target_matches} 次{fresh_info}"
        if self.save_error:
            prog_text += "  |  ⚠️ 進度寫入失敗，下一場會自動重試"
        self.prog_label.config(text=prog_text, fg=COLOR_ERROR if self.save_error else COLOR_TEXT)
        self.btn_undo.config(state="normal" if self.history else "disabled")

    def next_match(self):
        if len(self.movies) < 2:
            self.update_ui_labels()
            return

        self.m1, self.m2 = self.pick_pair()
        if random.random() < 0.5:
            self.m1, self.m2 = self.m2, self.m1

        self.update_ui_labels()

    def skip_match(self):
        """跳過目前組合，重新抽一組"""
        if self.m1 and self.m2:
            self.recent_pairs.append(self.pair_key(self.m1, self.m2))
        self.next_match()

    def handle_choice(self, winner):
        if not self.m1 or not self.m2:
            return

        pair = self.pair_key(self.m1, self.m2)

        # 紀錄狀態供 Undo 復原使用
        self.history.append({
            'm1': self.m1,
            'm2': self.m2,
            'elo1': self.m1['elo'],
            'elo2': self.m2['elo'],
            'games1': self.m1['games'],
            'games2': self.m2['games'],
            'match_count': self.match_count,
            'pair': pair,
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

        self.recent_pairs.append(pair)
        self.match_count += 1
        self.dirty = True

        # 存檔失敗也一定換下一組，避免同一組停在畫面上被重複計分；記憶體中的結果會在下一次存檔時一併寫入
        self.save_progress_safe()

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

        # 只移除「被復原的那一場」的紀錄，不會誤刪中間按「換一組」留下的組合
        pair = last.get('pair')
        for i in range(len(self.recent_pairs) - 1, -1, -1):
            if self.recent_pairs[i] == pair:
                del self.recent_pairs[i]
                break

        self.dirty = True
        self.save_progress_safe()
        if self.mode == "gui":
            self.update_ui_labels()
        return True

    def save_progress(self):
        payload = json.dumps(
            {'movies': self.movies, 'match_count': self.match_count, 'dirty': self.dirty},
            ensure_ascii=False, indent=2
        )
        atomic_write_text(PROGRESS_FILE, payload)

    def save_progress_safe(self):
        """寫入 progress.json；失敗時不中斷操作，只記下錯誤並提示（下次存檔會再寫入完整狀態）"""
        try:
            self.save_progress()
            self.save_error = None
            return True
        except OSError as e:
            self.save_error = str(e)
            if self.mode != "gui":
                print(f"⚠️ 進度寫入失敗（下一場會自動重試）：{e}", file=sys.stderr)
            return False

    # ------------------------------------------------------------------
    # 匯出
    # ------------------------------------------------------------------

    def format_category_block(self, cat, m_list, comments=()):
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
        # 陣列內原有的註解（例如被註解掉的電影）會因重新排序而無法留在原位，統一保留在陣列尾端
        for c in comments:
            lines.append(f"  {c}")
        lines.append("];")
        return "\n".join(lines)

    def export_js(self):
        """寫回 movies.js。寫入失敗時丟出 OSError（movies.js 不會被改動），由呼叫端處理。"""
        categories_output = {cat: [] for cat in self.categories}

        for m in self.movies:
            cat = m['category']
            m['score'] = self.get_display_score(m['elo'])
            if cat in categories_output:
                categories_output[cat].append(m)

        # 讀取原始 movies.js 進行原位替換，保留檔案內陣列以外的註解或其他程式碼
        with open(INPUT_JS, 'r', encoding='utf-8') as f:
            content = f.read()

        spans = {}
        for name, decl_start, arr_text, span_end in find_array_exports(content):
            if name in categories_output and name not in spans:
                spans[name] = (decl_start, span_end, extract_js_comments(arr_text))

        missing = [cat for cat in self.categories if cat not in spans]
        if missing:
            self.fatal(f"匯出時找不到類別 {', '.join(missing)} 的陣列宣告，已中止寫入")

        # 從檔案尾端往前替換，前面區段的位置就不會因為替換而偏移
        for cat in sorted(spans, key=lambda c: spans[c][0], reverse=True):
            decl_start, span_end, comments = spans[cat]
            new_block = self.format_category_block(cat, categories_output[cat], comments)
            content = content[:decl_start] + new_block + content[span_end:]

        atomic_write_text(OUTPUT_JS, content)

        # 記錄這次匯出的分數，下次啟動才能分辨「手動改過」與「沒按儲存就關掉／程式中斷」
        for m in self.movies:
            m['exported_score'] = m['score']
        self.dirty = False
        self.save_progress_safe()

        print(f"✅ [儲存成功] 分數已更新至 {OUTPUT_JS}（類別：{', '.join(self.categories)}）")

    def cli_save(self):
        if not self.dirty:
            print("沒有需要寫回 movies.js 的變更。")
            return
        try:
            self.export_js()
        except OSError as e:
            print(f"❌ 寫入 movies.js 失敗：{e}\n比對進度仍保存在 progress.json，下次開啟後可再儲存。", file=sys.stderr)

    def run_cli(self):
        print("\n" + "=" * 55)
        print(" 電影二選一評分系統 (Terminal 模式)")
        print(" 指令: [1/2] 選擇勝者 | [S] 換一組 | [Z] 復原 | [Q] 儲存退出")
        print("=" * 55)

        if len(self.movies) < 2:
            print("movies.js 中少於 2 部電影，無法比對。")
            return

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
                    self.cli_save()
                    print("已退出系統。")
                    return
                else:
                    print("無效輸入，請輸入 1, 2, S(跳過), Z(復原) 或 Q(儲存退出)。")
        except (KeyboardInterrupt, EOFError):
            print("\n\n偵測到中斷，正在為您自動儲存目前進度並匯出...")
            self.cli_save()


if __name__ == "__main__":
    cli_args = {arg.lower() for arg in sys.argv[1:]}
    # 用 pythonw 執行時 sys.stdin 是 None
    interactive = sys.stdin is not None and sys.stdin.isatty()
    if "--cli" in cli_args or "-c" in cli_args:
        mode_choice = "1"
    elif "--gui" in cli_args or "-g" in cli_args or not interactive:
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
