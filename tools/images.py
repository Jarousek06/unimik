"""Build responsive photo variants, the self-hosted font and the OG image.

Usage (from the project root):  python tools/images.py

Inputs live in img-src/ (originals, not deployed). Outputs go to
src/assets/img/ and src/assets/fonts/. To replace a stock photo with a
client photo, overwrite the file in img-src/ with the same name and rerun.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img-src"
OUT = ROOT / "src" / "assets" / "img"
FONTS = ROOT / "src" / "assets" / "fonts"

INK = (22, 24, 27)
SIGNAL = (255, 106, 19)
PAPER = (244, 242, 237)

# name: (aspect w/h, focus x 0..1, focus y 0..1, widths)
PHOTOS = {
    "tanks": (4 / 3, 0.55, 0.45, [480, 800, 1200]),
    "railcar": (3 / 2, 0.62, 0.45, [480, 800, 1200]),
    "tanker": (3 / 2, 0.55, 0.6, [480, 800, 1200]),
    "valves": (3 / 2, 0.5, 0.5, [480, 800, 1200]),
    "pump": (3 / 2, 0.35, 0.62, [480, 800, 1200]),
}


def crop_to(im: Image.Image, aspect: float, fx: float, fy: float) -> Image.Image:
    w, h = im.size
    if w / h > aspect:
        nw, nh = int(h * aspect), h
    else:
        nw, nh = w, int(w / aspect)
    left = min(max(int(fx * w - nw / 2), 0), w - nw)
    top = min(max(int(fy * h - nh / 2), 0), h - nh)
    return im.crop((left, top, left + nw, top + nh))


def mono(im: Image.Image) -> Image.Image:
    """Grayscale with a slight contrast lift, kept as RGB for broad support."""
    g = ImageOps.grayscale(im)
    g = ImageOps.autocontrast(g, cutoff=1)
    return g.convert("RGB")


def build_photos() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (aspect, fx, fy, widths) in PHOTOS.items():
        src = SRC / f"{name}.jpg"
        im = mono(crop_to(Image.open(src).convert("RGB"), aspect, fx, fy))
        for w in widths:
            h = round(w / aspect)
            v = im.resize((w, h), Image.LANCZOS)
            base = OUT / f"{name}-{w}"
            v.save(f"{base}.avif", quality=50, speed=4)
            v.save(f"{base}.webp", quality=72, method=6)
            v.save(f"{base}.jpg", quality=76, optimize=True, progressive=True)
            print(f"{name}-{w}: {w}x{h}")


def build_og() -> None:
    aspect = 1200 / 630
    im = mono(crop_to(Image.open(SRC / "tanks.jpg").convert("RGB"), aspect, 0.55, 0.4))
    im = im.resize((1200, 630), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 560, 630), fill=INK)
    d.rectangle((0, 560, 560, 630), fill=SIGNAL)
    font = SRC / "BarlowCondensed-Bold.ttf"
    big = ImageFont.truetype(str(font), 120)
    mid = ImageFont.truetype(str(font), 46)
    small = ImageFont.truetype(str(font), 36)
    d.text((56, 80), "UNIMIK", font=big, fill=PAPER)
    d.text((56, 240), "Čištění a revize nádrží", font=mid, fill=PAPER)
    d.text((56, 300), "Havarijní služba non-stop", font=mid, fill=SIGNAL)
    d.text((56, 572), "+420 603 416 025", font=small, fill=INK)
    im.save(OUT / "og-image.jpg", quality=82, optimize=True)
    print("og-image: 1200x630")


def build_font() -> None:
    """Subset Barlow Condensed Bold to Latin + Czech and save as woff2."""
    from fontTools import subset

    FONTS.mkdir(parents=True, exist_ok=True)
    text = (
        "".join(chr(c) for c in range(0x20, 0x7F))
        + "ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž–—„“‚‘’…·×→↗€§°«»ÄÖÜäöüßĹĽŔĺľŕôÔ"
        + chr(0xA0)  # no-break space
    )
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga"]
    opts.name_IDs = ["*"]
    f = subset.load_font(str(SRC / "BarlowCondensed-Bold.ttf"), opts)
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(f)
    subset.save_font(f, str(FONTS / "barlow-condensed-700.woff2"), opts)
    print("font:", (FONTS / "barlow-condensed-700.woff2").stat().st_size, "B")


if __name__ == "__main__":
    build_font()
    build_photos()
    build_og()
