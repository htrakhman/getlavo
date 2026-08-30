"""Generate the Lavo vinyl decal artwork.

Two lockups, each in colour, white and black:

  getlavo-vinyl-*   droplet mark + "getlavo.io"
  lavo-vinyl-*      droplet mark + "LAVO" with "getlavo.io" beneath it

Everything is vector: the mark is traced from public/lavo-mark.png (only 231px
wide, far too small to print) and the type is converted to outlines, so the
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

INK = "#191E2B"           # ink-100, the wordmark colour used on the site
BLUE = "#2B86D6"          # picked from the middle of the mark's own gradient
PNG_WIDTH = 6000          # ~20 in wide at 300 dpi

# Type: (text, weight, tracking in font units per 1000 em).
DOMAIN = ("getlavo.io", 800, -8)
NAME = ("LAVO", 800, 30)              # 30 ~= Tailwind tracking-wide, as on the site
DOMAIN_SUB = ("getlavo.io", 700, 120)  # second line of the stacked lockup, letterspaced

SUB_RATIO = 0.42          # sub-line size relative to LAVO
SUB_GAP = 0.16            # space between the two lines, relative to LAVO
BLOCK_FILL = 0.88         # how much of the mark's height the two lines span

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

def load_font(weight):
    os.makedirs(CACHE, exist_ok=True)
    ttf = os.path.join(CACHE, f"pjs-{weight}.ttf")
    if not os.path.exists(ttf):
        woff2 = os.path.join(CACHE, "pjs.woff2")
        if not os.path.exists(woff2):
            urllib.request.urlretrieve(FONT_URL, woff2)
        font = TTFont(woff2)
        font.flavor = None
        font = instancer.instantiateVariableFont(font, {"wght": weight})
        font.save(ttf)
    return ttf


def outline_text(spec):
    """Shape (text, weight, tracking) and return a Line: outlines plus metrics."""
    text, weight, tracking = spec
    with open(load_font(weight), "rb") as fh:
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
        x += pos.x_advance + tracking
    return dict(paths="\n    ".join(parts), advance=x - tracking,
                ink=(y_lo, y_hi), upem=tt["head"].unitsPerEm)


# ------------------------------------------------------------------------ lockup

def gradient_defs(grad, pad):
    if not grad:
        return ""
    stops = "\n      ".join(f'<stop offset="{o * 100:.0f}%" stop-color="{c}"/>'
                            for o, c in grad["stops"])
    return f"""
  <defs>
    <linearGradient id="lavoGrad" gradientUnits="userSpaceOnUse"
        x1="{grad['x1']:.2f}" y1="{grad['y1']:.2f}"
        x2="{grad['x2']:.2f}" y2="{grad['y2']:.2f}"
        gradientTransform="translate({pad:.2f} {pad:.2f})">
      {stops}
    </linearGradient>
  </defs>"""


def wrap(w, h, label, defs, body):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}"
     width="{w:.2f}" height="{h:.2f}" role="img" aria-label="{label}">{defs}
{body}
</svg>
"""


def text_group(line, size, x, baseline, fill):
    scale = size / line["upem"]
    return (f'  <g fill="{fill}" transform="translate({x:.2f} {baseline:.2f}) '
            f'scale({scale:.6f} -{scale:.6f})">\n    {line["paths"]}\n  </g>')


def build_inline(mark, domain, mark_fill, text_fill, grad=None):
    """Mark with the domain set beside it on one line."""
    mark_d, mw, mh, _ = mark

    # The mark stands 1.75x the type size, as in components/Logo.tsx.
    size = mh / 1.75
    scale = size / domain["upem"]

    # Sit the wordmark's ink box dead centre against the mark, so the ascenders
    # and the g descender balance around the droplet.
    baseline = mh / 2 + sum(domain["ink"]) / 2 * scale

    pad = 0.06 * mh
    text_x = pad + mw + 0.26 * mh
    w, h = text_x + domain["advance"] * scale + pad, mh + 2 * pad

    body = (f'  <g transform="translate({pad:.2f} {pad:.2f})">\n'
            f'    <path fill-rule="evenodd" fill="{mark_fill}" d="{mark_d}"/>\n  </g>\n'
            + text_group(domain, size, text_x, pad + baseline, text_fill))
    return wrap(w, h, "getlavo.io", gradient_defs(grad, pad), body)


def build_stacked(mark, name, sub, mark_fill, name_fill, sub_fill, grad=None):
    """Mark with LAVO beside it and the domain on a second line beneath."""
    mark_d, mw, mh, _ = mark

    # Size the two lines together so the block fills most of the mark's height.
    name_h = (name["ink"][1] - name["ink"][0]) / name["upem"]
    sub_h = (sub["ink"][1] - sub["ink"][0]) / sub["upem"] * SUB_RATIO
    size = BLOCK_FILL * mh / (name_h + SUB_GAP + sub_h)
    sub_size = size * SUB_RATIO

    name_scale, sub_scale = size / name["upem"], sub_size / sub["upem"]
    block_h = (name_h + SUB_GAP + sub_h) * size
    top = (mh - block_h) / 2

    name_baseline = top + name["ink"][1] * name_scale
    sub_baseline = (top + name_h * size + SUB_GAP * size + sub["ink"][1] * sub_scale)

    pad = 0.06 * mh
    text_x = pad + mw + 0.26 * mh
    text_w = max(name["advance"] * name_scale, sub["advance"] * sub_scale)
    w, h = text_x + text_w + pad, mh + 2 * pad

    body = (f'  <g transform="translate({pad:.2f} {pad:.2f})">\n'
            f'    <path fill-rule="evenodd" fill="{mark_fill}" d="{mark_d}"/>\n  </g>\n'
            + text_group(name, size, text_x, pad + name_baseline, name_fill) + "\n"
            + text_group(sub, sub_size, text_x, pad + sub_baseline, sub_fill))
    return wrap(w, h, "LAVO - getlavo.io", gradient_defs(grad, pad), body)


# (suffix, mark fill, name fill, sub fill, use gradient)
PALETTES = [
    ("color", "url(#lavoGrad)", INK, BLUE, True),
    ("white", "#FFFFFF", "#FFFFFF", "#FFFFFF", False),
    ("black", "#000000", "#000000", "#000000", False),
]


def write(name, svg):
    with open(os.path.join(OUT, name + ".svg"), "w") as fh:
        fh.write(svg)
    cairosvg.svg2png(bytestring=svg.encode(), output_width=PNG_WIDTH,
                     write_to=os.path.join(OUT, name + ".png"))
    print("wrote", name + ".svg", "+", name + ".png")


def main():
    os.makedirs(OUT, exist_ok=True)
    mark = trace_mark()
    grad = mark[3]
    domain, name, sub = (outline_text(DOMAIN), outline_text(NAME),
                         outline_text(DOMAIN_SUB))

    for suffix, mark_fill, name_fill, sub_fill, gradient in PALETTES:
        g = grad if gradient else None
        write(f"getlavo-vinyl-{suffix}",
              build_inline(mark, domain, mark_fill, name_fill, g))
        write(f"lavo-vinyl-{suffix}",
              build_stacked(mark, name, sub, mark_fill, name_fill, sub_fill, g))


if __name__ == "__main__":
    main()
