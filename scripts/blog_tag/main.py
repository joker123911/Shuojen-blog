import os
import re
import tkinter as tk
from tkinter import messagebox, ttk

# 設定目標資料夾路徑選單
DIRECTORIES = {
    "Blog": r"C:\Users\shuojen\Desktop\Shuojen-blog\blog",
    "PhotoBlog": r"C:\Users\shuojen\Desktop\Shuojen-blog\photoblog"
}

class TagManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("✨ Markdown Tag 管理器")
        self.root.geometry("1000x720")
        self.root.configure(bg="#F0F4F8") # 現代淺灰藍背景

        # 設定 ttk 主題為 clam (比預設主題更適合扁平化)
        self.style = ttk.Style()
        if 'clam' in self.style.theme_names():
            self.style.theme_use('clam')

        # 初始化當前路徑
        self.current_dir_name = "Blog"
        self.current_dir_path = DIRECTORIES[self.current_dir_name]

        self.files = []
        self.displayed_files = [] 
        self.all_tags = set()
        self.tag_file_map = {}    
        self.file_titles = {} # 儲存檔案對應的標題
        self.current_file = None

        self.setup_ui()
        self.load_data()

    def create_hover_effect(self, widget, normal_bg, hover_bg):
        """為按鈕建立滑鼠懸停變色效果"""
        widget.bind("<Enter>", lambda e: widget.config(bg=hover_bg))
        widget.bind("<Leave>", lambda e: widget.config(bg=normal_bg))

    def setup_ui(self):
        # 主容器 (增加外距，讓畫面有呼吸空間)
        main_container = tk.Frame(self.root, bg="#F0F4F8", padx=25, pady=25)
        main_container.pack(fill=tk.BOTH, expand=True)

        # ================= 頂部：資料夾切換 =================
        top_frame = tk.Frame(main_container, bg="#F0F4F8")
        top_frame.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(top_frame, text="📂 目前管理的資料夾：", bg="#F0F4F8", fg="#2D3748", font=("微軟正黑體", 12, "bold")).pack(side=tk.LEFT)
        
        self.dir_combo = ttk.Combobox(top_frame, values=list(DIRECTORIES.keys()), state="readonly", font=("微軟正黑體", 11), width=15)
        self.dir_combo.set(self.current_dir_name)
        self.dir_combo.pack(side=tk.LEFT, padx=10)
        self.dir_combo.bind("<<ComboboxSelected>>", self.on_dir_change)

        self.dir_path_label = tk.Label(top_frame, text="(自動載入對應路徑)", bg="#F0F4F8", fg="#718096", font=("Consolas", 10))
        self.dir_path_label.pack(side=tk.LEFT)

        # ================= 左右分割視窗 =================
        paned = ttk.PanedWindow(main_container, orient=tk.HORIZONTAL)
        paned.pack(fill=tk.BOTH, expand=True)

        # ================= 左側：檔案列表卡片 =================
        # 使用 Frame 模擬現代網頁的 Card 視圖
        left_card = tk.Frame(paned, bg="#FFFFFF", padx=20, pady=20, highlightthickness=1, highlightbackground="#E2E8F0")
        paned.add(left_card, weight=3) # 左側分配多一點空間給路徑
        
        tk.Label(left_card, text="📄 Markdown 檔案列表", bg="#FFFFFF", fg="#2D3748", font=("微軟正黑體", 14, "bold")).pack(anchor=tk.W, pady=(0, 15))
        
        # 篩選區塊
        filter_frame = tk.Frame(left_card, bg="#FFFFFF")
        filter_frame.pack(fill=tk.X, pady=(0, 15))
        
        tk.Label(filter_frame, text="🔍 篩選標籤:", bg="#FFFFFF", fg="#4A5568", font=("微軟正黑體", 11)).pack(side=tk.LEFT)
        
        self.filter_combo = ttk.Combobox(filter_frame, state="readonly", font=("微軟正黑體", 11))
        self.filter_combo.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=10)
        self.filter_combo.bind("<<ComboboxSelected>>", self.on_filter_change)
        
        # 篇數標籤 (做成 Badge 徽章樣式)
        count_frame = tk.Frame(filter_frame, bg="#EBF8FF", padx=10, pady=4, highlightthickness=1, highlightbackground="#BEE3F8")
        count_frame.pack(side=tk.RIGHT)
        self.file_count_label = tk.Label(count_frame, text="共 0 篇", bg="#EBF8FF", fg="#2B6CB0", font=("微軟正黑體", 10, "bold"))
        self.file_count_label.pack()

        # 檔案列表捲動區
        list_frame1 = tk.Frame(left_card, bg="#FFFFFF")
        list_frame1.pack(fill=tk.BOTH, expand=True)

        file_scroll = ttk.Scrollbar(list_frame1)
        file_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 扁平化 Listbox
        self.file_listbox = tk.Listbox(list_frame1, yscrollcommand=file_scroll.set, 
                                       bg="#F8FAFC", fg="#2D3748", font=("微軟正黑體", 11),
                                       selectbackground="#3182CE", selectforeground="#FFFFFF",
                                       activestyle="none", relief="flat", highlightthickness=1, highlightbackground="#E2E8F0",
                                       exportselection=False)
        self.file_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        file_scroll.config(command=self.file_listbox.yview)
        self.file_listbox.bind("<<ListboxSelect>>", self.on_file_select)

        # ================= 右側：Tag 管理卡片 =================
        right_card = tk.Frame(paned, bg="#FFFFFF", padx=20, pady=20, highlightthickness=1, highlightbackground="#E2E8F0")
        paned.add(right_card, weight=2)

        tk.Label(right_card, text="🏷️ Tag 管理", bg="#FFFFFF", fg="#2D3748", font=("微軟正黑體", 14, "bold")).pack(anchor=tk.W)
        tk.Label(right_card, text="按住 Ctrl 點擊可多選", bg="#FFFFFF", fg="#A0AEC0", font=("微軟正黑體", 10)).pack(anchor=tk.W, pady=(0, 15))

        # Tag 列表區
        list_frame2 = tk.Frame(right_card, bg="#FFFFFF")
        list_frame2.pack(fill=tk.BOTH, expand=True, pady=(0, 15))

        tag_scroll = ttk.Scrollbar(list_frame2)
        tag_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 扁平化 Tag Listbox (使用不同選取顏色區分)
        self.tag_listbox = tk.Listbox(list_frame2, selectmode=tk.MULTIPLE, yscrollcommand=tag_scroll.set, 
                                      bg="#F8FAFC", fg="#2D3748", font=("微軟正黑體", 12),
                                      selectbackground="#38B2AC", selectforeground="#FFFFFF",
                                      activestyle="none", relief="flat", highlightthickness=1, highlightbackground="#E2E8F0",
                                      exportselection=False)
        self.tag_listbox.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        tag_scroll.config(command=self.tag_listbox.yview)

        # 新增 Tag 區塊
        add_frame = tk.Frame(right_card, bg="#FFFFFF")
        add_frame.pack(fill=tk.X, pady=(0, 20))
        
        self.new_tag_entry = ttk.Entry(add_frame, font=("微軟正黑體", 12))
        self.new_tag_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        
        # 現代化按鈕
        add_btn = tk.Button(add_frame, text="＋ 新增 Tag", command=self.add_tag,
                            bg="#EDF2F7", fg="#2D3748", font=("微軟正黑體", 11, "bold"),
                            relief="flat", cursor="hand2", padx=12, pady=4,
                            activebackground="#E2E8F0", activeforeground="#2D3748")
        add_btn.pack(side=tk.RIGHT)
        self.create_hover_effect(add_btn, "#EDF2F7", "#E2E8F0")

        # 儲存按鈕 (顯眼的品牌成功色)
        save_btn = tk.Button(right_card, text="💾 儲存此檔案的 Tag 變更", command=self.save_file_tags, 
                             bg="#48BB78", fg="white", font=("微軟正黑體", 13, "bold"), 
                             relief="flat", cursor="hand2", pady=12,
                             activebackground="#38A169", activeforeground="white")
        save_btn.pack(fill=tk.X)
        self.create_hover_effect(save_btn, "#48BB78", "#38A169")

    # ================= 邏輯層 =================

    def on_dir_change(self, event=None):
        selected_dir_name = self.dir_combo.get()
        if selected_dir_name != self.current_dir_name:
            self.current_dir_name = selected_dir_name
            self.current_dir_path = DIRECTORIES[self.current_dir_name]
            self.current_file = None
            self.filter_combo.set('顯示全部')
            self.load_data()

    def load_data(self):
        self.dir_path_label.config(text=f"({self.current_dir_path})")

        if not os.path.exists(self.current_dir_path):
            messagebox.showwarning("找不到資料夾", f"目前找不到這個資料夾：\n{self.current_dir_path}\n請確認路徑是否正確。")
            self.files = []
            self.all_tags = set()
            self.tag_file_map = {}
            self.file_titles = {}
        else:
            self.files = []
            self.all_tags = set()
            self.tag_file_map = {}
            self.file_titles = {}

            for root_dir, _, filenames in os.walk(self.current_dir_path):
                for filename in filenames:
                    if filename.endswith(('.md', '.mdx')):
                        filepath = os.path.join(root_dir, filename)
                        self.files.append(filepath)
                        
                        _, tags, _, title = self.parse_frontmatter(filepath)
                        self.file_titles[filepath] = title
                        
                        for t in tags:
                            self.all_tags.add(t)
                            if t not in self.tag_file_map:
                                self.tag_file_map[t] = []
                            self.tag_file_map[t].append(filepath)

        self.update_filter_combo()
        self.refresh_file_list()
        self.refresh_tag_listbox()

    def update_filter_combo(self):
        current_sel = self.filter_combo.get()
        options = ['顯示全部']
        for t in sorted(list(self.all_tags)):
            count = len(self.tag_file_map.get(t, []))
            options.append(f"{t} ({count} 篇)")
            
        self.filter_combo['values'] = options
        if current_sel in options:
            self.filter_combo.set(current_sel)
        else:
            self.filter_combo.set('顯示全部')

    def on_filter_change(self, event=None):
        self.current_file = None 
        self.tag_listbox.selection_clear(0, tk.END)
        self.refresh_file_list()

    def refresh_file_list(self):
        self.file_listbox.delete(0, tk.END)
        self.displayed_files = []
        
        sel = self.filter_combo.get()
        if sel == '顯示全部' or not sel:
            self.displayed_files = self.files
        else:
            match = re.match(r'^(.*) \(\d+ 篇\)$', sel)
            if match:
                tag_name = match.group(1)
                self.displayed_files = self.tag_file_map.get(tag_name, [])
            else:
                self.displayed_files = self.files

        for f in self.displayed_files:
            title = self.file_titles.get(f, os.path.basename(f))
            self.file_listbox.insert(tk.END, title)
            
        self.file_count_label.config(text=f"共 {len(self.displayed_files)} 篇")

    def refresh_tag_listbox(self):
        self.tag_listbox.delete(0, tk.END)
        for tag in sorted(list(self.all_tags)):
            self.tag_listbox.insert(tk.END, tag)

    def parse_frontmatter(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            return None, [], content, os.path.basename(filepath)

        match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
        if not match:
            return None, [], content, os.path.basename(filepath)

        fm_text = match.group(1)
        body = match.group(2)

        tags = []
        tags_match = re.search(r'^tags:\s*(.*?)(?=\n[a-zA-Z0-9_-]+:|\Z)', fm_text, re.DOTALL | re.MULTILINE)

        if tags_match:
            tags_str = tags_match.group(1).strip()
            if tags_str.startswith('['):
                tags_raw = tags_str.strip('[]').split(',')
                tags = [t.strip().strip('"\'') for t in tags_raw if t.strip()]
            else:
                tags_raw = tags_str.split('\n')
                tags = [t.strip().lstrip('-').strip().strip('"\'') for t in tags_raw if t.strip().startswith('-')]
                
        title = os.path.basename(filepath)
        title_match = re.search(r'^title:\s*(.*?)$', fm_text, re.MULTILINE)
        if title_match:
            extracted_title = title_match.group(1).strip().strip('"\'')
            if extracted_title:
                title = extracted_title
                
        return fm_text, tags, body, title

    def on_file_select(self, event):
        selection = self.file_listbox.curselection()
        if not selection:
            return
            
        index = selection[0]
        self.current_file = self.displayed_files[index]
        
        _, tags, _, _ = self.parse_frontmatter(self.current_file)
        
        self.tag_listbox.selection_clear(0, tk.END)
        all_tags_list = sorted(list(self.all_tags))
        
        for t in tags:
            if t in all_tags_list:
                idx = all_tags_list.index(t)
                self.tag_listbox.selection_set(idx)

    def add_tag(self):
        new_tag = self.new_tag_entry.get().strip()
        if not new_tag:
            return
            
        if new_tag not in self.all_tags:
            self.all_tags.add(new_tag)
            self.refresh_tag_listbox()
            self.update_filter_combo() 
            
        all_tags_list = sorted(list(self.all_tags))
        idx = all_tags_list.index(new_tag)
        self.tag_listbox.selection_set(idx)
        self.tag_listbox.see(idx) 
            
        self.new_tag_entry.delete(0, tk.END)

    def save_file_tags(self):
        if not self.current_file:
            messagebox.showwarning("警告", "請先選擇左側的一個檔案！")
            return

        # 取得下一個檔案，以便儲存後自動選取
        next_file = None
        try:
            current_idx = self.displayed_files.index(self.current_file)
            if current_idx + 1 < len(self.displayed_files):
                next_file = self.displayed_files[current_idx + 1]
        except ValueError:
            pass

        selected_indices = self.tag_listbox.curselection()
        selected_tags = [self.tag_listbox.get(i) for i in selected_indices]

        fm_text, old_tags, body, _ = self.parse_frontmatter(self.current_file)
        
        if fm_text is None:
            messagebox.showerror("錯誤", "此檔案沒有 YAML Frontmatter (---) 區塊，無法寫入！")
            return

        tags_match = re.search(r'^tags:\s*(.*?)(?=\n[a-zA-Z0-9_-]+:|\Z)', fm_text, re.DOTALL | re.MULTILINE)
        is_inline = True
        if tags_match:
            tags_str = tags_match.group(1).strip()
            if not tags_str.startswith('['):
                is_inline = False

        if is_inline:
            new_tags_str = "tags: [" + ", ".join(selected_tags) + "]"
        else:
            if not selected_tags:
                new_tags_str = "tags: []"
            else:
                new_tags_str = "tags:\n" + "\n".join([f"  - {t}" for t in selected_tags])

        if tags_match:
            new_fm = fm_text[:tags_match.start()] + new_tags_str + fm_text[tags_match.end():]
        else:
            new_fm = fm_text.strip() + "\n" + new_tags_str

        try:
            with open(self.current_file, 'w', encoding='utf-8') as f:
                f.write(f"---\n{new_fm}\n---\n{body}")
            
            # 重新載入左側列表資料
            self.load_data()

            # 自動選取下一篇
            if next_file and next_file in self.displayed_files:
                new_idx = self.displayed_files.index(next_file)
                self.file_listbox.selection_clear(0, tk.END)
                self.file_listbox.selection_set(new_idx)
                self.file_listbox.see(new_idx) # 讓左側列表自動滾動到下一篇的位置
                self.on_file_select(None) # 觸發讀取，更新右側 Tag 區塊
            else:
                # 如果已經是最後一篇了，清空狀態
                self.current_file = None
                self.tag_listbox.selection_clear(0, tk.END)
            
        except Exception as e:
            messagebox.showerror("錯誤", f"儲存失敗：{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = TagManagerApp(root)
    root.mainloop()