"""Generate the getlavo.io vinyl lockup: Lavo droplet mark + "getlavo.io" wordmark.

Everything is vector: the mark is traced from public/lavo-mark.png (only 231px
wide, far too small to print) and the wordmark is converted to outlines, so the
files stay sharp at any decal size and need no fonts installed.

    pip install fonttools brotli uharfbuzz potracer pillow numpy cairosvg
    python3 scripts/make-vinyl-logo.py

Outputs to design/vinyl/: colour, white and black variants as SVG plus
transparent PNGs sized for print.
"""
import io
import os
import urllib.request

import cairosvg
import numpy as np
import potrace
from PIL import Image, ImageFilter
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
import uharfbuzz as hb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "design", "vinyl")
CACHE = os.path.join(OUT, ".cache")
MARK_SRC = os.path.join(ROOT, "public", "lavo-mark.png")

# Plus Jakarta Sans latin subset (variable, wght 200-800), the site display face.
FONT_URL = ("https://fonts.gstatic.com/s/plusjakartasans/v12/"
            "LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2")

WORDMARK = "getlavo.io"
WEIGHT = 800
LETTER_SPACING = -8       # font units per 1000 em; a touch tighter than default
INK = "#191E2B"           # ink-100, the wordmark colour used on the site
PNG_WIDTH = 6000          # ~20 in wide at 300 dpi

# Tracing: upscale, blur away the 231px staircase, threshold, trace.
TRACE_SCALE = 8
TRACE_BLUR = 8
TRACE_OPT = 1.2


# --------------------------------------------------------------------------- mark

def trace_mark():
    """Return (path data, width, height, gradient spec) for the droplet mark."""
    im = Image.open(MARK_SRC).convert("RGBA")
    s = TRACE_SCALE
    big = im.getchannel("A").resize((im.width * s, im.height * s), Image.LANCZOS)
    solid = np.array(big.filter(ImageFilter.GaussianBlur(TRACE_BLUR))) > 128

    # potrace fills its "on" region; invert so the mark itself is the shape.
    path = potrace.Bitmap(~solid).trace(turdsize=40, alphamax=1.0,
                                        opttolerance=TRACE_OPT)
    pt = lambda p: (p.x / s, p.y / s)
    d = []
    for curve in path:
        x, y = pt(curve.start_point)
        d.append(f"M{x:.2f},{y:.2f}")
        for seg in curve:
            if seg.is_corner:
                cx, cy = pt(seg.c)
                ex, ey = pt(seg.end_point)
                d.append(f"L{cx:.2f},{cy:.2f}L{ex:.2f},{ey:.2f}")
            else:
                a1, b1 = pt(seg.c1)
                a2, b2 = pt(seg.c2)
                ex, ey = pt(seg.end_point)
                d.append(f"C{a1:.2f},{b1:.2f} {a2:.2f},{b2:.2f} {ex:.2f},{ey:.2f}")
        d.append("Z")

    return "".join(d), im.width, im.height, fit_gradient(im)


def fit_gradient(im, bins=10):
    """Recover the mark's linear gradient: best axis, then per-band mean colour."""
    px = np.array(im).astype(float)
    opaque = px[..., 3] > 230
    ys, xs = np.nonzero(opaque)
    cols = px[..., :3][opaque]

    best_deg, best_err = 0, None
    for deg in range(0, 180, 2):
        th = np.radians(deg)
        t = xs * np.cos(th) + ys * np.sin(th)
        idx = np.clip(((t - t.min()) / (t.max() - t.min()) * 24).astype(int), 0, 23)
        err = sum(((cols[idx == i] - cols[idx == i].mean(0)) ** 2).sum()
                  for i in range(24) if (idx == i).sum() > 5)
        if best_err is None or err < best_err:
            best_deg, best_err = deg, err

    th = np.radians(best_deg)
    dx, dy = np.cos(th), np.sin(th)
    t = xs * dx + ys * dy
    t0, t1 = t.min(), t.max()
    idx = np.clip(((t - t0) / (t1 - t0) * bins).astype(int), 0, bins - 1)

    stops = []
    for i in range(bins):
        sel = idx == i
        if sel.sum() > 5:
            r, g, b = cols[sel].mean(0).round().astype(int)
            stops.append(((i + 0.5) / bins, f"#{r:02X}{g:02X}{b:02X}"))
    return dict(x1=t0 * dx, y1=t0 * dy, x2=t1 * dx, y2=t1 * dy, stops=stops)


# ----------------------------------------------------------------------- wordmark

def load_font():
    os.makedirs(CACHE, exist_ok=True)
    ttf = os.path.join(CACHE, f"pjs-{WEIGHT}.ttf")
    if not os.path.exists(ttf):
        woff2 = os.path.join(CACHE, "pjs.woff2")
        if not os.path.exists(woff2):
            urllib.request.urlretrieve(FONT_URL, woff2)
        font = TTFont(woff2)
        font.flavor = None
        font = instancer.instantiateVariableFont(font, {"wght": WEIGHT})
        font.save(ttf)
    return ttf


def outline_text(text):
    """Shape the text with HarfBuzz and return (path markup, advance, ink box, upem)."""
    with open(load_font(), "rb") as fh:
        data = fh.read()
    hb_font = hb.Font(hb.Face(data))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf, {"kern": True, "liga": True})

    tt = TTFont(io.BytesIO(data))
    glyphs, order = tt.getGlyphSet(), tt.getGlyphOrder()

    parts, x, y_lo, y_hi = [], 0, None, None
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        glyph = glyphs[order[info.codepoint]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        d = pen.getCommands()
        if d:
            parts.append(f'<path d="{d}" transform="translate({x + pos.x_offset} '
                         f'{pos.y_offset})"/>')
            bounds = BoundsPen(glyphs)
            glyph.draw(bounds)
            if bounds.bounds:
                lo, hi = bounds.bounds[1] + pos.y_offset, bounds.bounds[3] + pos.y_offset
                y_lo = lo if y_lo is None else min(y_lo, lo)
                y_hi = hi if y_hi is None else max(y_hi, hi)
        x += pos.x_advance + LETTER_SPACING
    return ("\n    ".join(parts), x - LETTER_SPACING, (y_lo, y_hi),
            tt["head"].unitsPerEm)


# ------------------------------------------------------------------------ lockup

def build_svg(mark, text_path, advance, ink, upem, mark_fill, text_fill, grad=None):
    mark_d, mw, mh, _ = mark

    # The mark stands 1.75x the type size, as in components/Logo.tsx.
    font_size = mh / 1.75
    scale = font_size / upem
    text_w = advance * scale

    # Sit the wordmark's ink box dead centre against the mark, so the ascenders
    # and the g descender balance around the droplet.
    baseline = mh / 2 + (ink[0] + ink[1]) / 2 * scale

    gap = 0.26 * mh
    pad = 0.06 * mh
    text_x = pad + mw + gap
    w, h = text_x + text_w + pad, mh + 2 * pad

    defs = ""
    if grad:
        stops = "\n      ".join(
            f'<stop offset="{o * 100:.0f}%" stop-color="{c}"/>' for o, c in grad["stops"])
        defs = f'''
  <defs>
    <linearGradient id="lavoGrad" gradientUnits="userSpaceOnUse"
        x1="{grad['x1']:.2f}" y1="{grad['y1']:.2f}"
        x2="{grad['x2']:.2f}" y2="{grad['y2']:.2f}"
        gradientTransform="translate({pad:.2f} {pad:.2f})">
      {stops}
    </linearGradient>
  </defs>'''

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}"
     width="{w:.2f}" height="{h:.2f}" role="img" aria-label="getlavo.io">{defs}
  <g transform="translate({pad:.2f} {pad:.2f})">
    <path fill-rule="evenodd" fill="{mark_fill}" d="{mark_d}"/>
  </g>
  <g fill="{text_fill}" transform="translate({text_x:.2f} {pad + baseline:.2f}) scale({scale:.6f} -{scale:.6f})">
    {text_path}
  </g>
</svg>
'''


VARIANTS = [
    ("getlavo-vinyl-color", "url(#lavoGrad)", INK, True),
    ("getlavo-vinyl-white", "#FFFFFF", "#FFFFFF", False),
    ("getlavo-vinyl-black", "#000000", "#000000", False),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    mark = trace_mark()
    text_path, advance, ink, upem = outline_text(WORDMARK)

    for name, mark_fill, text_fill, gradient in VARIANTS:
        svg = build_svg(mark, text_path, advance, ink, upem, mark_fill, text_fill,
                        mark[3] if gradient else None)
        svg_path = os.path.join(OUT, name + ".svg")
        with open(svg_path, "w") as fh:
            fh.write(svg)
        cairosvg.svg2png(bytestring=svg.encode(), output_width=PNG_WIDTH,
                         write_to=os.path.join(OUT, name + ".png"))
        print("wrote", name + ".svg", "+", name + ".png")


if __name__ == "__main__":
    main()
