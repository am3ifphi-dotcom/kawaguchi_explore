#!/usr/bin/env python3
"""サイト用アセット一括生成スクリプト (PyMuPDF + Pillow)
実行: python3 build_assets.py
出力: img/ 以下の各種JPEG/PNG
"""
import os
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "img")
SHEETS = os.path.join(IMG, "sheets")
THUMBS = os.path.join(SHEETS, "thumbs")
PLANS = os.path.join(IMG, "plans")
GALLERY = os.path.join(IMG, "gallery")
CAMPUS = os.path.join(IMG, "campus")
for d in (SHEETS, THUMBS, PLANS, GALLERY, CAMPUS):
    os.makedirs(d, exist_ok=True)

S_PDF = os.path.join(ROOT, "27901siryou.pdf")   # 実施設計資料 (9p, A3横)
P_PDF = os.path.join(ROOT, "P02.pdf")           # 広報かわぐち 2015.9 (1p, A4縦)

sdoc = pymupdf.open(S_PDF)
pdoc = pymupdf.open(P_PDF)


def render(doc, pno, clip, zoom, path, quality=87):
    page = doc[pno]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(*clip))
    pix.save(path + ".tmp.png")
    im = Image.open(path + ".tmp.png").convert("RGB")
    im.save(path, quality=quality, optimize=True, progressive=True)
    os.remove(path + ".tmp.png")
    print(f"{path}  {im.size[0]}x{im.size[1]}  {os.path.getsize(path)//1024}KB")
    return path


def native(doc, xref, path, max_w=1400):
    pix = pymupdf.Pixmap(doc, xref)
    if pix.colorspace and pix.colorspace.n > 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    path = path + ".tmp.png"
    pix.save(path)
    im = Image.open(path).convert("RGB")
    if im.size[0] > max_w:
        im = im.resize((max_w, round(im.size[1] * max_w / im.size[0])), Image.LANCZOS)
    out = path.replace(".tmp.png", "")
    im.save(out, quality=90, optimize=True)
    os.remove(path)
    print(f"{out}  {im.size[0]}x{im.size[1]}  {os.path.getsize(out)//1024}KB")
    return out


# ---------------------------------------------------------------
# 1) 図面ビューア用: 9シート + 広報ページ の全体高解像度レンダリンク
# ---------------------------------------------------------------
sheet_names = [
    "01-image.jpg", "02-gaiyo.jpg", "03-haichi.jpg", "04-1f.jpg", "05-2f.jpg",
    "06-3f4f.jpg", "07-5rf.jpg", "08-ritsumen.jpg", "09-danmen.jpg",
]
for i, name in enumerate(sheet_names):
    render(sdoc, i, (0, 0, 1191, 842), 3.0, os.path.join(SHEETS, name), quality=85)
render(pdoc, 0, (0, 0, 596, 842), 3.0, os.path.join(SHEETS, "10-koho.jpg"), quality=85)

# サムネイル
for f in sorted(os.listdir(SHEETS)):
    if f.endswith(".jpg"):
        im = Image.open(os.path.join(SHEETS, f)).convert("RGB")
        im.thumbnail((420, 420))
        im.save(os.path.join(THUMBS, f), quality=78, optimize=True)
print("thumbs done:", len(os.listdir(THUMBS)))

# ---------------------------------------------------------------
# 2) インタラクティブ配置図 (ページ3の地図領域のみ)
#    地図画像 rect = (120, 42, 1085, 741)
# ---------------------------------------------------------------
render(sdoc, 2, (118, 40, 1087, 743), 2.6, os.path.join(CAMPUS, "haichizu.jpg"), quality=87)

# ---------------------------------------------------------------
# 3) フロアガイド用 平面図クロップ
# ---------------------------------------------------------------
plan_crops = {
    "1f": (sdoc, 3, (57, 96, 1164, 744)),    # 1階 (p4)
    "2f": (sdoc, 4, (57, 136, 1155, 757)),   # 2階 (p5)
    "3f": (sdoc, 5, (164, 411, 999, 791)),   # 3階 (p6 下段)
    "4f": (sdoc, 5, (164, 40, 999, 414)),    # 4階 (p6 上段)
    "5f": (sdoc, 6, (150, 436, 1070, 791)),  # 5階 (p7 下段)
    "rf": (sdoc, 6, (528, 40, 1078, 392)),   # R階 (p7 上段右)
}
for key, (doc, pno, clip) in plan_crops.items():
    render(doc, pno, clip, 3.3, os.path.join(PLANS, f"{key}.jpg"), quality=87)

# ---------------------------------------------------------------
# 4) 工事工程ミニマップ + 敷地案内図 (p2)
# ---------------------------------------------------------------
render(sdoc, 1, (740, 64, 1026, 307), 3.0, os.path.join(CAMPUS, "guide.jpg"))
render(sdoc, 1, (655, 350, 866, 543), 3.2, os.path.join(CAMPUS, "phase0-genkyo.jpg"))
render(sdoc, 1, (896, 350, 1110, 543), 3.2, os.path.join(CAMPUS, "phase1-kousha.jpg"))
render(sdoc, 1, (655, 571, 866, 759), 3.2, os.path.join(CAMPUS, "phase2-arena.jpg"))
render(sdoc, 1, (896, 571, 1110, 759), 3.2, os.path.join(CAMPUS, "phase3-ground.jpg"))

# ---------------------------------------------------------------
# 5) ギャラリー
# ---------------------------------------------------------------
# 実施設計 p1: イメージ図1(左:xref147) / イメージ図2(右:xref146)
native(sdoc, 147, os.path.join(GALLERY, "image1-toshinomon.jpg"))
native(sdoc, 146, os.path.join(GALLERY, "image2-learning.jpg"))
# 広報かわぐち: 完成イメージ(ラベル付きレンダリング)
render(pdoc, 0, (0, 0, 367, 244), 3.2, os.path.join(GALLERY, "completion.jpg"), quality=88)
# 広報かわぐち: ネイティブ写真 (CMYK→RGB)
native(pdoc, 53, os.path.join(GALLERY, "kousha-cg.jpg"))       # 校舎棟CG
native(pdoc, 39, os.path.join(GALLERY, "learning-inside.jpg")) # 校舎棟内部(ラーニングストリート)
native(pdoc, 44, os.path.join(GALLERY, "kousha-ext.jpg"))      # 校舎棟外観
native(pdoc, 40, os.path.join(GALLERY, "chem-lab.jpg"))        # 化学実験室
native(pdoc, 42, os.path.join(GALLERY, "daihall.jpg"))         # 大ホール
native(pdoc, 43, os.path.join(GALLERY, "classroom.jpg"))       # 普通教室
native(pdoc, 46, os.path.join(GALLERY, "dai-arena.jpg"))       # 大アリーナ
native(pdoc, 41, os.path.join(GALLERY, "ground.jpg"))          # 第1グラウンド

sdoc.close()
pdoc.close()
total = 0
for dirpath, _, files in os.walk(IMG):
    for f in files:
        total += os.path.getsize(os.path.join(dirpath, f))
print(f"\nTOTAL img/: {total/1024/1024:.1f} MB")
