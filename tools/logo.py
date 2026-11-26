"""Generate logo SVGs (text outlined from Barlow Condensed) and favicon PNGs.

Usage (from the project root):  python tools/logo.py
Outputs: brand/logo.svg, src/assets/logo-light.svg, src/favicon.svg,
src/apple-touch-icon.png, src/icon-192.png, src/icon-512.png,
src/assets/logo-mark.png (for schema/social), src/partials/logo-inline.svg
"""
import re
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
INK = "#16181B"
PAPER = "#F4F2ED"
SIGNAL = "#FF6A13"

# Mark geometry in a 48-unit-high box: a vessel ("U") with a liquid level line.
MARK = (
    '<path d="M7 5V25a11 11 0 0 0 22 0V5" fill="none" stroke="{c}" stroke-width="6"/>'
    '<rect x="13" y="21" width="10" height="4" fill="{s}"/>'
)


def outlined_text(text: str, cap: float, x0: float, top: float) -> tuple[str, float]:
    font = TTFont(str(ROOT / "img-src" / "BarlowCondensed-Bold.ttf"))
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    cap_height = font["OS/2"].sCapHeight
    scale = cap / cap_height
    pen = SVGPathPen(gs)
    x = 0.0
    tracking = 30  # font units of extra letter spacing
    for ch in text:
        g = gs[cmap[ord(ch)]]
        # flip y: font units are y-up, SVG is y-down
        tp = TransformPen(pen, (scale, 0, 0, -scale, x0 + x * scale, top + cap))
        g.draw(tp)
        x += g.width + tracking
    width = (x - tracking) * scale
    d = re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), pen.getCommands())
    return d, width


def write_logos() -> None:
    d, tw = outlined_text("UNIMIK", cap=36, x0=42, top=5)
    w = round(42 + tw + 2)
    for name, color in (("logo.svg", INK), ("logo-light.svg", PAPER)):
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 48" width="{w}" height="48" '
            f'role="img" aria-label="UNIMIK s.r.o.">'
            + MARK.format(c=color, s=SIGNAL)
            + f'<path d="{d}" fill="{color}"/></svg>\n'
        )
        target = ROOT / "brand" / name if name == "logo.svg" else SRC / "assets" / name
        target.parent.mkdir(exist_ok=True)
        target.write_text(svg, encoding="utf-8")
    # Inline variant for the header: colors inherit from CSS.
    inline = (
        f'<svg class="logo-svg" viewBox="0 0 {w} 48" width="{w}" height="48" aria-hidden="true" focusable="false">'
        + MARK.format(c="currentColor", s="var(--signal)")
        + f'<path d="{d}" fill="currentColor"/></svg>'
    )
    (SRC / "partials").mkdir(exist_ok=True)
    (SRC / "partials" / "logo-inline.svg").write_text(inline, encoding="utf-8")
    fav = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">'
        f'<rect width="36" height="36" fill="{INK}"/>'
        f'<g transform="translate(0 2)">{MARK.format(c=PAPER, s=SIGNAL)}</g></svg>\n'
    )
    (SRC / "favicon.svg").write_text(fav, encoding="utf-8")
    print("logo width", w)


def png_icon(size: int, path: Path, pad: float = 0.0) -> None:
    """Raster the favicon mark with PIL (supersampled)."""
    ss = 8
    S = size * ss
    im = Image.new("RGB", (S, S), INK)
    dr = ImageDraw.Draw(im)
    inner = S * (1 - 2 * pad)
    off = S * pad
    u = inner / 36  # unit in px

    def P(x: float, y: float) -> tuple[float, float]:
        return off + x * u, off + (y + 2) * u

    sw = 6 * u
    # legs
    dr.rectangle([*P(7 - 3, 5), *P(7 + 3, 25)], fill=PAPER)
    dr.rectangle([*P(29 - 3, 5), *P(29 + 3, 25)], fill=PAPER)
    # bowl: half ring centered at (18, 25), radius 11 (stroke centre)
    cx, cy = P(18, 25)
    r_out, r_in = 11 * u + sw / 2, 11 * u - sw / 2
    dr.pieslice([cx - r_out, cy - r_out, cx + r_out, cy + r_out], 0, 180, fill=PAPER)
    dr.pieslice([cx - r_in, cy - r_in, cx + r_in, cy + r_in], 0, 180, fill=INK)
    dr.rectangle([cx - r_in, cy - 1, cx + r_in, cy], fill=INK)
    dr.rectangle([*P(13, 21), *P(23, 25)], fill=SIGNAL)
    im = im.resize((size, size), Image.LANCZOS)
    im.save(path, optimize=True)


if __name__ == "__main__":
    write_logos()
    png_icon(180, SRC / "apple-touch-icon.png", pad=0.1)
    png_icon(192, SRC / "icon-192.png", pad=0.12)
    png_icon(512, SRC / "icon-512.png", pad=0.12)
    png_icon(512, SRC / "assets" / "logo-mark.png", pad=0.12)
    png_icon(32, SRC / "favicon-32.png")
    print("icons done")
