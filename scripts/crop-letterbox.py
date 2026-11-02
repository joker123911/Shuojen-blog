import os
import sys
import argparse
from PIL import Image
import numpy as np

# 解決 Windows 主控台編碼問題
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def detect_letterbox(img_path):
    """
    檢測圖片是否為 16:9 畫框內嵌 2.39:1 黑邊（Letterboxing）。
    將「黑邊核心區偵測」與「抗鋸齒邊界精修」分離，避免夜景暗部誤判與 WebP 振鈴殘留。
    回傳裁切資訊 dict 或 None。
    """
    try:
        with Image.open(img_path) as img:
            rgb = img.convert('RGB')
            w, h = rgb.size
            if w < 100 or h < 100:
                return None

            ratio = w / h
            # 必須為典型 16:9 比例 (約 1.70 ~ 1.85)
            if not (1.70 <= ratio <= 1.85):
                return None

            # 2.39:1 嵌入 16:9 時理論單側黑邊高度
            expected_bar = (h - w / 2.39) / 2.0
            if expected_bar < 20:
                return None

            arr = np.array(rgb)

            # 1. 偵測階段：檢查上下黑邊的「核心區」（避開交界處 6px 的 WebP 8x8 區塊振鈴噪點與縮圖抗鋸齒）
            #    不採用無上限向內掃描，徹底解決夜景/暗部照片被過度掃描而漏抓或誤切的問題
            core_limit = max(10, int(expected_bar) - 6)
            top_core = arr[:core_limit]
            bot_core = arr[h - core_limit:]

            if top_core.mean() > 3.0 or bot_core.mean() > 3.0:
                return None
            if np.percentile(top_core, 98) > 10 or np.percentile(bot_core, 98) > 10:
                return None

            # 確認圖片中央區域有實質內容（排除全黑圖片）
            margin = int(expected_bar) + 10
            center_region = arr[margin : h - margin]
            if center_region.size == 0 or center_region.max() <= 15:
                return None

            # 2. 邊界精修階段：以理論 2.39:1 邊界為基準，清除縮圖非整數像素造成的 1px 半黑抗鋸齒灰線
            ceil_bar = int(np.ceil(expected_bar))
            max_trim = ceil_bar + 1

            top = int(expected_bar)
            ref_top_mean = arr[min(h - 1, max_trim + 2)].mean()
            while top < max_trim:
                row_mean = arr[top].mean()
                is_black_edge = (top < ceil_bar and row_mean <= 8.0)
                is_aa_gray_line = (ref_top_mean > 15.0 and row_mean < ref_top_mean * 0.82)
                if is_black_edge or is_aa_gray_line:
                    top += 1
                else:
                    break

            bot = int(expected_bar)
            ref_bot_mean = arr[max(0, h - 1 - (max_trim + 2))].mean()
            while bot < max_trim:
                row_idx = h - 1 - bot
                row_mean = arr[row_idx].mean()
                is_black_edge = (bot < ceil_bar and row_mean <= 8.0)
                is_aa_gray_line = (ref_bot_mean > 15.0 and row_mean < ref_bot_mean * 0.82)
                if is_black_edge or is_aa_gray_line:
                    bot += 1
                else:
                    break

            content_h = h - top - bot
            if content_h <= 0:
                return None

            new_ratio = w / content_h
            return {
                'path': img_path,
                'orig_w': w,
                'orig_h': h,
                'top': top,
                'bot': bot,
                'crop_box': (0, top, w, h - bot),
                'new_w': w,
                'new_h': content_h,
                'new_ratio': new_ratio,
                'format': img.format or os.path.splitext(img_path)[1][1:].upper()
            }
    except Exception:
        pass
    return None


def save_cropped_safely(fp, crop_box, fmt, quality):
    """
    安全裁切並以原子寫入（Atomic Write）覆蓋原檔，同時完整保留 ICC 色彩描述檔與 EXIF。
    """
    with Image.open(fp) as img:
        icc_profile = img.info.get('icc_profile')
        exif = img.info.get('exif')
        cropped = img.crop(crop_box)
        cropped.load()

    save_kwargs = {}
    if icc_profile:
        save_kwargs['icc_profile'] = icc_profile
    if exif:
        save_kwargs['exif'] = exif

    tmp_path = f"{fp}.crop_tmp"
    try:
        if fmt == 'WEBP':
            cropped.save(tmp_path, 'WEBP', quality=quality, method=6, **save_kwargs)
        elif fmt in ['JPEG', 'JPG']:
            cropped.save(tmp_path, 'JPEG', quality=quality, subsampling=0, **save_kwargs)
        elif fmt == 'PNG':
            cropped.save(tmp_path, 'PNG', optimize=True, **save_kwargs)
        else:
            cropped.save(tmp_path, format=fmt, **save_kwargs)

        os.replace(tmp_path, fp)
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        raise


def resolve_target_dirs(dirs):
    resolved = []
    for d in dirs:
        if os.path.isabs(d) or os.path.exists(d):
            resolved.append(d)
        else:
            candidate = os.path.join(PROJECT_ROOT, d)
            resolved.append(candidate if os.path.exists(candidate) else d)
    return resolved


def process_images(target_dirs, dry_run=True, quality=90):
    resolved_dirs = resolve_target_dirs(target_dirs)
    print(f"[+] 正在掃描目錄: {resolved_dirs}...")
    found = []

    for d in resolved_dirs:
        if not os.path.exists(d):
            print(f"[!] 找不到目錄，已略過: {d}")
            continue
        for root, _, files in os.walk(d):
            for f in sorted(files):
                ext = os.path.splitext(f)[1].lower()
                if ext in ['.webp', '.jpg', '.jpeg', '.png']:
                    fp = os.path.join(root, f)
                    info = detect_letterbox(fp)
                    if info:
                        found.append(info)

    print(f"\n[i] 掃描完成！共偵測到 {len(found)} 張含有上下黑邊（2.39:1 電影寬幅）的照片。\n")

    if not found:
        print("[*] 沒有找到需要裁切的黑邊照片！")
        return

    if dry_run:
        print("[DRY-RUN 模式] 僅列出偵測結果，不會更動任何檔案：")
        print("-" * 75)
        for i, item in enumerate(found[:15], 1):
            print(f"{i:3d}. {item['path']}")
            print(f"     原解析度: {item['orig_w']}x{item['orig_h']} (16:9)")
            print(f"     上下黑邊: 上 {item['top']}px / 下 {item['bot']}px")
            print(f"     裁切後:   {item['new_w']}x{item['new_h']} ({item['new_ratio']:.2f}:1)")
        if len(found) > 15:
            print(f"... 還有其餘 {len(found) - 15} 張照片未展開顯示。")
        print("-" * 75)
        print("[提示] 若要實際執行裁切，請加上 --execute 參數：python scripts/crop-letterbox.py --execute")
    else:
        print("[EXECUTE 模式] 開始執行批次自動裁切覆蓋...")
        success_count = 0
        for item in found:
            fp = item['path']
            try:
                save_cropped_safely(fp, item['crop_box'], item['format'], quality)
                success_count += 1
                if success_count % 50 == 0 or success_count == len(found):
                    print(f"  進度: [{success_count}/{len(found)}] 已處理完成")
            except Exception as e:
                print(f"[!] 處理失敗 {fp}: {e}")

        print(f"\n[OK] 全部處理完畢！成功裁切 {success_count} 張照片。")
        print("[提示] 建議重新執行 node scripts/gen-photos.js 刷新相簿資料。")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="自動偵測並裁切照片的 2.39:1 上下黑邊 (Letterbox)")
    parser.add_argument('--execute', action='store_true', help="實際執行檔案裁切覆蓋 (預設為 dry-run)")
    parser.add_argument('--dirs', nargs='+', default=['photoblog', 'blog'], help="掃描目錄 (預設: photoblog blog)")
    parser.add_argument('--quality', type=int, default=90, help="儲存品質 (預設: 90)")
    args = parser.parse_args()

    process_images(args.dirs, dry_run=not args.execute, quality=args.quality)
