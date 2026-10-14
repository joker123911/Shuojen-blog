import os
import sys
import requests
import threading
import re
import datetime
import json
import io
from urllib.parse import quote
from PIL import Image

# 確保 Windows 終端機正常輸出 UTF-8 字元
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import tkinter as tk
    from tkinter import ttk, messagebox
except ImportError:
    tk = None
    ttk = None
    messagebox = None

# ==========================================
# 自動偵測環境：檢查是否有真實的圖形介面顯示器
# ==========================================
def check_gui_support():
    """安全地檢查當前環境是否支援 GUI 顯示，僅在 Windows 下啟用 GUI 視窗模式"""
    if sys.platform != "win32" or tk is None:
        return False

    try:
        test_root = tk.Tk()
        test_root.withdraw()
        test_root.destroy()
        return True
    except Exception:
        return False


HAS_GUI = False

# ==========================================
# 檔案路徑設定（以腳本所在目錄為基準，從任何位置執行皆不會跑掉）
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "..", "docs"))

MOVIE_JS_PATH = os.path.join(BASE_DIR, "movies.js")
ANIME_JS_PATH = os.path.join(BASE_DIR, "anime.js")
SERIES_JS_PATH = os.path.join(BASE_DIR, "series.js")
RAMEN_JS_PATH = os.path.join(BASE_DIR, "ramen.js")

REQUEST_TIMEOUT = 12


def atomic_write_text(file_path, content):
    """原子寫入：先寫入暫存檔再替換原檔，避免寫入中斷造成檔案損毀"""
    tmp_path = f"{file_path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, file_path)


def sanitize_filename(name):
    """過濾檔案系統不允許的特殊字元（如 : / * ? " < > |），避免存圖失敗"""
    cleaned = re.sub(r'[\\/:*?"<>|]', "_", name).strip()
    return cleaned or "poster"


# ==========================================
# TMDB API Key (由 .env 或環境變數載入)
# ==========================================
def load_env_file():
    candidate_paths = [
        os.path.join(BASE_DIR, ".env"),
        os.path.join(BASE_DIR, "..", "..", ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for env_path in candidate_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
                break
            except Exception:
                pass


load_env_file()
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "").strip()

if not TMDB_API_KEY:
    print("\n⚠️ [警告] 未偵測到 TMDB_API_KEY！")
    print("👉 請在專案根目錄建立 .env 檔案，並寫入：TMDB_API_KEY=您的金鑰")
    print("👉 否則將無法自動搜尋電影年份與下載海報。\n")
else:
    print("✅ 已成功載入 TMDB_API_KEY")


# ==========================================
# JS 陣列與物件安全解析工具（忽略字串與註解內的括號）
# ==========================================
def extract_js_array_bounds(content, start_idx):
    """
    從 start_idx 開始尋找完整匹配的 [...] 陣列區間（忽略字串與註解內的括號），
    回傳 (open_bracket_idx, close_bracket_idx)
    """
    n = len(content)
    i = content.find("[", start_idx)
    if i == -1:
        return -1, -1

    open_idx = i
    depth = 0
    in_str = None
    escaped = False

    while i < n:
        ch = content[i]
        if in_str:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == in_str:
                in_str = None
            i += 1
            continue

        if ch == "/" and i + 1 < n and content[i + 1] == "/":
            nl = content.find("\n", i + 2)
            i = n if nl == -1 else nl + 1
            continue

        if ch == "/" and i + 1 < n and content[i + 1] == "*":
            end_comment = content.find("*/", i + 2)
            i = n if end_comment == -1 else end_comment + 2
            continue

        if ch in ('"', "'", "`"):
            in_str = ch
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return open_idx, i
        i += 1

    return -1, -1


def extract_top_level_objects(body_str):
    """
    從陣列內容字串中擷取所有頂層 { ... } 物件字串，
    即使 note 心得內文含有 { } 大括號也不會解析錯誤或遺失資料。
    """
    objects = []
    n = len(body_str)
    i = 0
    depth = 0
    obj_start = -1
    in_str = None
    escaped = False

    while i < n:
        ch = body_str[i]
        if in_str:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == in_str:
                in_str = None
            i += 1
            continue

        if ch == "/" and i + 1 < n and body_str[i + 1] == "/":
            nl = body_str.find("\n", i + 2)
            i = n if nl == -1 else nl + 1
            continue

        if ch == "/" and i + 1 < n and body_str[i + 1] == "*":
            end_comment = body_str.find("*/", i + 2)
            i = n if end_comment == -1 else end_comment + 2
            continue

        if ch in ('"', "'", "`"):
            in_str = ch
        elif ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and obj_start != -1:
                objects.append(body_str[obj_start : i + 1].strip())
                obj_start = -1
        i += 1

    return objects


# ==========================================
# 電影標題清理與候選清單搜尋
# ==========================================
def clean_title(title):
    """清理電影標題，過濾系列作與版本後綴以利精準搜尋"""
    t = title.replace("系列", "")
    # 修正原版 [\)傷] 的錯字為 [\)）]
    t = re.sub(r"[\(（][^）\)]+版[\)）]", "", t)
    t = re.sub(r"\s*\d+\s*[~～\-]\s*\d+", "", t)
    return t.strip()


def search_tmdb_movies_candidates(title):
    """從 TMDB 抓取前 4 筆候選電影資料"""
    if not TMDB_API_KEY:
        return []
    search_title = clean_title(title)
    url = "https://api.themoviedb.org/3/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": search_title,
        "language": "zh-TW",
    }
    try:
        resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            return resp.json().get("results", [])[:4]
        elif resp.status_code == 401:
            print("\n❌ [TMDB API 認證失敗] API Key 無效或未被授權 (HTTP 401)。請檢查 .env 中的金鑰。")
        else:
            print(f"\n⚠️ [TMDB API 回傳狀態異常] HTTP {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"\n[TMDB 連線錯誤] ({search_title}): {e}")
    return []


# ==========================================
# 核心邏輯處理函數（GUI 與終端機模式共用）
# ==========================================
def save_worker_logic(
    data_type,
    target_var,
    title,
    score,
    note,
    tier,
    tags,
    link,
    success_callback,
    error_callback,
    interactive_choice_func=None,
):
    # 將多行心得壓縮為單行或保留合法字串，去除前後空白
    title = title.strip()
    note = re.sub(r"\r?\n+", " ", note.strip())

    # 驗證並正規化電影評分
    score_num = 7.0
    if data_type == "movie":
        try:
            score_num = round(float(score), 1)
        except (ValueError, TypeError):
            error_callback(f"評分格式錯誤：'{score}'，請輸入有效的數字（例如 8.2）")
            return

    # 處理分季後綴（如 S1、S2 等），擷取主劇名進行搜尋與圖片命名
    base_title = re.sub(r"\s*[Ss]\d+$", "", title).strip() or title
    safe_file_title = sanitize_filename(base_title)

    # 處理標籤 (Tags) 格式（支援半形與全形逗號）
    if not tags:
        tags_list = []
    elif isinstance(tags, str):
        tags_list = [t.strip() for t in re.split(r"[,，]", tags) if t.strip()]
    elif isinstance(tags, list):
        tags_list = [str(t).strip() for t in tags if str(t).strip()]
    else:
        tags_list = []

    # 路徑與格式設定
    if data_type == "movie":
        js_file = MOVIE_JS_PATH
        js_poster_path = f"./img/movie/{safe_file_title}.webp"
        save_dir = os.path.join(DOCS_DIR, "img", "movie")
        search_type = "movie"
        poster_langs = "en,null,zh-TW"
    elif data_type == "anime":
        js_file = ANIME_JS_PATH
        js_poster_path = f"./img/anime/{safe_file_title}.webp"
        save_dir = os.path.join(DOCS_DIR, "img", "anime")
        target_var = "animeList"
        search_type = "multi"
        poster_langs = "en,ja,null,zh"
    elif data_type == "series":
        js_file = SERIES_JS_PATH
        js_poster_path = f"./img/series/{safe_file_title}.webp"
        save_dir = os.path.join(DOCS_DIR, "img", "series")
        target_var = "animeList"
        search_type = "tv"
        poster_langs = "en,null,zh-TW"
    else:  # ramen
        js_file = RAMEN_JS_PATH
        js_poster_path = ""
        save_dir = ""
        target_var = "ramenList"
        search_type = ""
        poster_langs = ""

    if not os.path.exists(js_file):
        error_callback(f"找不到目標檔案：{js_file}")
        return

    save_poster_path = os.path.join(save_dir, f"{safe_file_title}.webp") if save_dir else ""

    # TMDB 下載邏輯
    if TMDB_API_KEY and data_type != "ramen":
        try:
            os.makedirs(save_dir, exist_ok=True)

            chosen_res = None
            chosen_year = None
            search_data = {}

            if data_type == "movie":
                results = search_tmdb_movies_candidates(title)

                # 策略判定：長度 > 2 且第一筆完全命中片名 -> 自動通過
                if (
                    results
                    and len(title) > 2
                    and (results[0].get("title") == title or results[0].get("original_title") == title)
                ):
                    chosen_res = results[0]
                    release_date = chosen_res.get("release_date", "")
                    if "-" in release_date:
                        chosen_year = release_date.split("-")[0]
                        print(f"【自動通過】{title} -> {chosen_year}")
                else:
                    if interactive_choice_func:
                        chosen_res, chosen_year = interactive_choice_func(title, note, results)
                    elif results:
                        chosen_res = results[0]
                        release_date = chosen_res.get("release_date", "")
                        if "-" in release_date:
                            chosen_year = release_date.split("-")[0]

                if chosen_year and chosen_year not in tags_list:
                    tags_list.insert(0, chosen_year)

                m_id = chosen_res["id"] if chosen_res else None
                m_type = "movie"
            else:
                search_url = f"https://api.themoviedb.org/3/search/{search_type}"
                search_params = {"api_key": TMDB_API_KEY, "query": base_title, "language": "zh-TW"}
                search_resp = requests.get(search_url, params=search_params, timeout=REQUEST_TIMEOUT)
                search_data = search_resp.json() if search_resp.status_code == 200 else {}

                if search_data.get("results"):
                    res = search_data["results"][0]
                    m_id = res["id"]
                    m_type = res.get("media_type", search_type) if search_type == "multi" else search_type
                else:
                    m_id = None
                    m_type = search_type

            if m_id:
                img_api_url = f"https://api.themoviedb.org/3/{m_type}/{m_id}/images"
                img_params = {"api_key": TMDB_API_KEY, "include_image_language": poster_langs}
                img_resp = requests.get(img_api_url, params=img_params, timeout=REQUEST_TIMEOUT)
                img_data = img_resp.json() if img_resp.status_code == 200 else {}

                poster_path = None
                posters = img_data.get("posters", [])
                if posters:
                    en_posters = [p for p in posters if p.get("iso_639_1") == "en"]
                    if en_posters:
                        poster_path = en_posters[0]["file_path"]
                    else:
                        null_posters = [p for p in posters if p.get("iso_639_1") is None]
                        poster_path = (null_posters[0] if null_posters else posters[0])["file_path"]
                elif data_type == "movie" and chosen_res:
                    poster_path = chosen_res.get("poster_path")
                elif data_type != "movie" and search_data.get("results"):
                    poster_path = search_data["results"][0].get("poster_path")

                if poster_path:
                    img_resp = requests.get(
                        f"https://image.tmdb.org/t/p/w780{poster_path}",
                        timeout=REQUEST_TIMEOUT,
                    )
                    if img_resp.status_code == 200:
                        img_bytes = img_resp.content
                        try:
                            with Image.open(io.BytesIO(img_bytes)) as img:
                                img.save(save_poster_path, format="WEBP", quality=80)
                        except Exception as img_err:
                            print(f"Image conversion to WebP failed: {img_err}")
                            with open(save_poster_path, "wb") as f:
                                f.write(img_bytes)
        except Exception as e:
            print(f"Poster Error: {e}")

    # 使用 json.dumps 確保所有字串（含引號、斜線等）皆為合法 JS 字串
    title_js = json.dumps(title, ensure_ascii=False)
    note_js = json.dumps(note, ensure_ascii=False)
    poster_js = json.dumps(js_poster_path, ensure_ascii=False)
    tags_js = json.dumps(tags_list, ensure_ascii=False)
    tier_js = json.dumps(tier, ensure_ascii=False) if tier else '""'

    if data_type == "movie":
        new_entry = f"  {{ title: {title_js}, score: {score_num}, note: {note_js}, poster: {poster_js}, tags: {tags_js} }},"
    elif data_type in ("anime", "series"):
        new_entry = f"{{ title: {title_js}, note: {note_js}, poster: {poster_js}, tier: {tier_js}, tags: {tags_js} }}"
    else:  # ramen
        if not link:
            link = f"https://www.google.com/maps/search/?api=1&query={quote(f'{title} 拉麵')}"
        link_js = json.dumps(link, ensure_ascii=False)
        new_entry = f"{{ title: {title_js}, note: {note_js}, tier: {tier_js}, tags: {tags_js}, link: {link_js} }}"

    # 寫入檔案邏輯
    try:
        with open(js_file, "r", encoding="utf-8") as file:
            content = file.read()

        decl_match = re.search(rf"export\s+const\s+{re.escape(target_var)}\s*=", content)
        if not decl_match:
            error_callback(f"在 {os.path.basename(js_file)} 中找不到 'export const {target_var} ='")
            return

        open_bracket, close_bracket = extract_js_array_bounds(content, decl_match.end())
        if open_bracket == -1 or close_bracket == -1:
            error_callback(f"在 {os.path.basename(js_file)} 中找不到 '{target_var}' 的完整陣列 '[...]'")
            return

        if data_type == "movie":
            # 插入在該類別陣列開頭 '[' 之後的第一行
            insert_pos = open_bracket + 1
            new_content = content[:insert_pos] + f"\n{new_entry}" + content[insert_pos:]
        else:
            tier_priority = {"SSS": 0, "SS": 1, "S": 2, "A": 3, "B": 4}
            body = content[open_bracket + 1 : close_bracket]
            existing_items = extract_top_level_objects(body)
            existing_items.append(new_entry)

            def sort_key(item_str):
                m = re.search(r'["\']?\btier\b["\']?\s*:\s*["\'](SSS|SS|S|A|B)["\']', item_str)
                tier_val = m.group(1) if m else "B"
                return tier_priority.get(tier_val, 99)

            existing_items.sort(key=sort_key)
            new_body_content = "\n  " + ",\n  ".join(existing_items) + "\n"
            new_content = content[: open_bracket + 1] + new_body_content + content[close_bracket:]

        atomic_write_text(js_file, new_content)

        # 根據新增的類別，同步更新對應的 .md 檔最後更新日期
        try:
            today_str = datetime.date.today().strftime("%Y-%m-%d")
            md_map = {
                "movie": "movie_list.md",
                "anime": "anime.md",
                "series": "series.md",
                "ramen": "ramen.md",
            }
            target_file = md_map.get(data_type)

            if target_file:
                f_path = os.path.join(DOCS_DIR, "ranking", target_file)
                if os.path.exists(f_path):
                    with open(f_path, "r", encoding="utf-8") as f:
                        doc_content = f.read()

                    updated_doc_content = re.sub(
                        r"\*最後更新：\d{4}-\d{2}-\d{2}\*",
                        f"*最後更新：{today_str}*",
                        doc_content,
                    )
                    if updated_doc_content != doc_content:
                        atomic_write_text(f_path, updated_doc_content)
        except Exception as date_err:
            print(f"Date Update Error: {date_err}")

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
        self.mode_combobox = ttk.Combobox(
            self.root,
            values=["電影模式 (Movie)", "動漫模式 (Anime)", "影集模式 (Series)", "拉麵模式 (Ramen)"],
            state="readonly",
            width=25,
        )
        self.mode_combobox.place(x=120, y=20)
        self.mode_combobox.current(0)
        self.mode_combobox.bind("<<ComboboxSelected>>", self.on_mode_change)

        # 類別/等級選擇
        self.lbl_category = ttk.Label(self.root, text="選擇類別：")
        self.lbl_category.place(x=30, y=65)
        self.category_combobox = ttk.Combobox(
            self.root,
            values=[
                "歐美電影 (westernMovies)",
                "亞洲電影 (asiaMovies)",
                "童年港片 (hongkongMovies)",
                "動畫電影 (animeMovies)",
            ],
            state="readonly",
            width=25,
        )
        self.category_combobox.place(x=120, y=65)
        self.category_combobox.current(0)

        # 標題
        ttk.Label(self.root, text="標題名稱：").place(x=30, y=110)
        self.entry_title = ttk.Entry(self.root, width=27)
        self.entry_title.place(x=120, y=110)

        # 評分
        self.lbl_score = ttk.Label(self.root, text="評分(數字)：")
        self.lbl_score.place(x=30, y=150)
        self.entry_score = ttk.Entry(self.root, width=27)
        self.entry_score.place(x=120, y=150)

        # 標籤
        ttk.Label(self.root, text="標籤(Tags)：").place(x=30, y=190)
        self.entry_tags = ttk.Entry(self.root, width=27)
        self.entry_tags.place(x=120, y=190)

        # 心得
        ttk.Label(self.root, text="心得備註：").place(x=30, y=230)
        self.text_note = tk.Text(self.root, width=27, height=5, font=("微軟正黑體", 10))
        self.text_note.place(x=120, y=230)

        self.btn_submit = ttk.Button(self.root, text="寫入檔案", command=self.add_data_click)
        self.btn_submit.place(x=175, y=370)

    def on_mode_change(self, event):
        mode = self.mode_combobox.get()
        if mode == "電影模式 (Movie)":
            self.lbl_category.config(text="選擇類別：")
            self.category_combobox.config(
                values=[
                    "歐美電影 (westernMovies)",
                    "亞洲電影 (asiaMovies)",
                    "童年港片 (hongkongMovies)",
                    "動畫電影 (animeMovies)",
                ]
            )
            self.category_combobox.current(0)
            self.lbl_score.config(text="評分(數字)：")
            self.lbl_score.place(x=30, y=150)
            self.entry_score.place(x=120, y=150)
        elif mode == "拉麵模式 (Ramen)":
            self.lbl_category.config(text="選擇等級：")
            self.category_combobox.config(values=["SSS", "SS", "S", "A", "B"])
            self.category_combobox.current(0)
            self.lbl_score.config(text="Google 連結：")
            self.lbl_score.place(x=30, y=150)
            self.entry_score.place(x=120, y=150)
        else:
            self.lbl_category.config(text="選擇等級：")
            self.category_combobox.config(values=["SSS", "SS", "S", "A", "B"])
            self.category_combobox.current(0)
            self.lbl_score.place_forget()
            self.entry_score.place_forget()

    def gui_interactive_choice(self, t_title, t_note, results):
        """在背景執行緒需要確認 TMDB 電影候選清單時，安全地在主執行緒彈出選擇視窗"""
        done_event = threading.Event()
        outcome = {"res": None, "year": None}

        def show_dialog():
            dlg = tk.Toplevel(self.root)
            dlg.title(f"選擇 TMDB 電影候選 - {t_title}")
            dlg.geometry("520x380")
            dlg.transient(self.root)
            dlg.grab_set()

            tk.Label(
                dlg,
                text=f"片名【{t_title}】未完全命中，請選擇正確的 TMDB 項目或輸入年份：",
                font=("微軟正黑體", 10, "bold"),
                wraplength=480,
                justify="left",
            ).pack(padx=15, pady=(12, 6), anchor="w")

            listbox = tk.Listbox(dlg, font=("微軟正黑體", 10), height=8, width=65)
            listbox.pack(padx=15, pady=5, fill="both", expand=True)

            for i, r in enumerate(results, 1):
                t_name = r.get("title", "未知")
                o_name = r.get("original_title", "未知")
                r_date = r.get("release_date", "未知年份")
                yr = r_date.split("-")[0] if "-" in r_date else r_date
                listbox.insert(tk.END, f"[{i}] {t_name} ({o_name}) - {yr}")

            if results:
                listbox.selection_set(0)

            manual_frame = tk.Frame(dlg)
            manual_frame.pack(padx=15, pady=6, fill="x")
            tk.Label(manual_frame, text="或手動輸入 4 位數年份：", font=("微軟正黑體", 10)).pack(side="left")
            year_entry = ttk.Entry(manual_frame, width=12)
            year_entry.pack(side="left", padx=6)

            def on_confirm():
                manual_yr = year_entry.get().strip()
                if manual_yr.isdigit() and len(manual_yr) == 4:
                    outcome["res"] = None
                    outcome["year"] = manual_yr
                else:
                    sel = listbox.curselection()
                    if sel and sel[0] < len(results):
                        chosen = results[sel[0]]
                        outcome["res"] = chosen
                        r_date = chosen.get("release_date", "")
                        outcome["year"] = r_date.split("-")[0] if "-" in r_date else None
                dlg.destroy()
                done_event.set()

            def on_skip():
                dlg.destroy()
                done_event.set()

            dlg.protocol("WM_DELETE_WINDOW", on_skip)

            btn_bar = tk.Frame(dlg)
            btn_bar.pack(pady=10)
            ttk.Button(btn_bar, text="確認選擇", command=on_confirm).pack(side="left", padx=8)
            ttk.Button(btn_bar, text="跳過", command=on_skip).pack(side="left", padx=8)

        self.root.after(0, show_dialog)
        done_event.wait()
        return outcome["res"], outcome["year"]

    def add_data_click(self):
        mode = self.mode_combobox.get()
        title = self.entry_title.get().strip()
        note = self.text_note.get("1.0", tk.END).strip()

        if not title or not note:
            messagebox.showwarning("警告", "名稱與心得不可為空！")
            return

        tags = self.entry_tags.get().strip()
        link_val = None

        if mode == "電影模式 (Movie)":
            category_map = {
                "歐美電影 (westernMovies)": "westernMovies",
                "亞洲電影 (asiaMovies)": "asiaMovies",
                "童年港片 (hongkongMovies)": "hongkongMovies",
                "動畫電影 (animeMovies)": "animeMovies",
            }
            selected_cat = self.category_combobox.get()
            score = self.entry_score.get().strip() or "7.0"
            try:
                float(score)
            except ValueError:
                messagebox.showwarning("警告", "評分必須為數字（例如 8.0）！")
                return
            args = ("movie", category_map[selected_cat], title, score, note, None, tags)
        elif mode == "動漫模式 (Anime)":
            tier = self.category_combobox.get()
            args = ("anime", "animeList", title, None, note, tier, tags)
        elif mode == "影集模式 (Series)":
            tier = self.category_combobox.get()
            args = ("series", "animeList", title, None, note, tier, tags)
        else:  # 拉麵模式 (Ramen)
            tier = self.category_combobox.get()
            link_val = self.entry_score.get().strip()
            args = ("ramen", "ramenList", title, None, note, tier, tags)

        self.btn_submit.config(text="下載處理中...", state=tk.DISABLED)

        threading.Thread(
            target=save_worker_logic,
            args=(*args, link_val, self.gui_success, self.gui_error, self.gui_interactive_choice),
            daemon=True,
        ).start()

    def gui_success(self, title):
        self.root.after(
            0,
            lambda: messagebox.showinfo("成功", f"已成功將《{title}》新增！\n並已更新對應頁面的最後更新日期。"),
        )
        self.root.after(0, self.reset_ui)

    def gui_error(self, msg):
        self.root.after(0, lambda: messagebox.showerror("錯誤", msg))
        self.root.after(0, lambda: self.btn_submit.config(text="寫入檔案", state=tk.NORMAL))

    def reset_ui(self):
        self.entry_title.delete(0, tk.END)
        self.entry_score.delete(0, tk.END)
        self.entry_tags.delete(0, tk.END)
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
        print("4. 拉麵模式 (Ramen)")
        print("0. 離開程式")
        choice = input("請輸入數字 (0-4): ").strip()

        if choice == "0":
            print("程式已結束。")
            break
        elif choice not in ["1", "2", "3", "4"]:
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

        tags = input("請輸入標籤 (多個請用逗號隔開，可為空): ").strip()

        link_val = None
        if choice == "1":  # 電影
            print("\n[選擇電影類別]")
            print("1. 歐美電影 (westernMovies)")
            print("2. 亞洲電影 (asiaMovies)")
            print("3. 童年港片 (hongkongMovies)")
            print("4. 動畫電影 (animeMovies)")
            cat_choice = input("請輸入數字 (1-4): ").strip()
            cat_map = {
                "1": "westernMovies",
                "2": "asiaMovies",
                "3": "hongkongMovies",
                "4": "animeMovies",
            }
            if cat_choice not in cat_map:
                print("類別選擇錯誤，返回主選單。")
                continue
            score = input("請輸入評分 (預設 7.0): ").strip() or "7.0"
            try:
                float(score)
            except ValueError:
                print("警告: 評分必須為數字，返回主選單。")
                continue
            args = ("movie", cat_map[cat_choice], title, score, note, None, tags)
            mode_str = "電影模式"
        elif choice == "4":  # 拉麵
            tier = input("\n請輸入等級分區 (SSS/SS/S/A/B，預設 B): ").strip().upper()
            if tier not in ["SSS", "SS", "S", "A", "B"]:
                tier = "B"
            link_val = input("請輸入 Google 地圖/自訂連結 (可留空，自動生成): ").strip()
            args = ("ramen", "ramenList", title, None, note, tier, tags)
            mode_str = "拉麵模式"
        else:  # 動漫 或 影集
            tier = input("\n請輸入等級分區 (SSS/SS/S/A/B，預設 B): ").strip().upper()
            if tier not in ["SSS", "SS", "S", "A", "B"]:
                tier = "B"
            if choice == "2":
                args = ("anime", "animeList", title, None, note, tier, tags)
                mode_str = "動漫模式"
            else:
                args = ("series", "animeList", title, None, note, tier, tags)
                mode_str = "影集模式"

        def terminal_interactive_choice(t_title, t_note, results):
            print("\n" + "=" * 60)
            print(f"🎬 我的電影：【{t_title}】")
            print(f"📝 我的心得：{t_note}")
            print("-" * 60)

            if not results:
                print("❌ TMDB 找不到任何相關電影。")
            else:
                print("🤖 TMDB 智慧候選清單：")
                for i, res in enumerate(results, 1):
                    t_name = res.get("title", "未知")
                    o_name = res.get("original_title", "未知")
                    r_date = res.get("release_date", "未知年份")
                    year = r_date.split("-")[0] if "-" in r_date else r_date
                    overview = res.get("overview", "無簡介內容。")
                    if len(overview) > 60:
                        overview = overview[:60] + "..."
                    print(f"  [{i}] {t_name} ({o_name}) - 📅 {year}")
                    print(f"      📄 簡介: {overview}")

            print("-" * 60)
            while True:
                prompt = (
                    f"請選擇正確的項目 (1-{len(results)})，或直接輸入 4 位數年份，或按 Enter 跳過: "
                    if results
                    else "請直接輸入 4 位數年份，或按 Enter 跳過: "
                )
                user_input = input(prompt).strip()
                if not user_input:
                    print(f"➡️ 已選擇跳過 【{t_title}】")
                    return None, None
                if user_input.isdigit() and len(user_input) == 4:
                    print(f"✍️ 已手動設定年份：{user_input}")
                    return None, user_input
                if results and user_input.isdigit() and 1 <= int(user_input) <= len(results):
                    idx = int(user_input) - 1
                    res_item = results[idx]
                    r_date = res_item.get("release_date", "")
                    if "-" in r_date:
                        year = r_date.split("-")[0]
                        print(f"✅ 已選擇 [{user_input}] -> {year}")
                        return res_item, year
                    else:
                        print("⚠️ 該選項在 TMDB 上沒有對應年份，請手動輸入或跳過。")
                        continue
                print("❌ 輸入格式不正確，請重新輸入。")

        print("\n資料下載與寫入中，請稍候...")

        def term_success(t):
            print(f"\n>> 成功：已成功將《{t}》新增至 {mode_str}！")
            print(">> 提示：對應頁面的最後更新日期已同步更新。")

        def term_error(msg):
            print(f"\n>> 錯誤：{msg}")

        save_worker_logic(
            *args,
            link_val,
            term_success,
            term_error,
            interactive_choice_func=terminal_interactive_choice,
        )
        print("-" * 40)


# ==========================================
# 程式進入點
# ==========================================
if __name__ == "__main__":
    HAS_GUI = check_gui_support()
    if HAS_GUI:
        selector = tk.Tk()
        selector.title("選擇執行模式")
        selector.geometry("300x120")
        selector.resizable(False, False)

        # 預設為空字串，若使用者直接按右上角 X 關閉選擇視窗則安全退出程式
        selected_mode = tk.StringVar(value="")

        tk.Label(selector, text="請選擇啟動模式：", font=("微軟正黑體", 11)).pack(pady=10)

        frame = tk.Frame(selector)
        frame.pack()

        def choose_gui():
            selected_mode.set("gui")
            selector.destroy()

        def choose_term():
            selected_mode.set("term")
            selector.destroy()

        tk.Button(frame, text="Windows 視窗模式", font=("微軟正黑體", 10), command=choose_gui).pack(
            side=tk.LEFT, padx=10
        )
        tk.Button(frame, text="Terminal 終端機模式", font=("微軟正黑體", 10), command=choose_term).pack(
            side=tk.RIGHT, padx=10
        )

        selector.mainloop()

        if selected_mode.get() == "gui":
            app = AppGUI()
            app.run()
        elif selected_mode.get() == "term":
            run_terminal()
    else:
        run_terminal()