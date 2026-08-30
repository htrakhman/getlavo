# Lavo vinyl decal artwork

Two lockups, each print-ready for a custom vinyl decal.

**`lavo-vinyl-*`** — the droplet, `LAVO`, and `getlavo.io` beneath it, all in one
image. 6000 × 2077 px (20 in × 6.9 in at 300 dpi).

**`getlavo-vinyl-*`** — the droplet with `getlavo.io` beside it on a single line,
no `LAVO`. 6000 × 1608 px (20 in × 5.4 in at 300 dpi). Use this where the decal
is long and low.

Each comes in three colourways:

| Suffix | Use |
| --- | --- |
| `-color` | **Upload this for a printed (full-colour) decal.** |
| `-white` | White version for dark surfaces — car glass, dark walls. |
| `-black` | Single colour, for sellers who *cut* the vinyl rather than print it, since cut vinyl is one solid colour. |

`.png` is the file to upload; the matching `.svg` is the same artwork as vector,
worth sending instead if the seller accepts SVG since it scales to any size with
no quality loss.

Notes for ordering:

- Every file has a transparent background. If the listing insists on JPG, ask
  for PNG instead — a JPG will come back with a white box around the logo.
- Leave the proportions locked when resizing. The stacked lockup is about
  2.9 : 1, so a 12 in wide decal is roughly 4.2 in tall; the single-line one is
  about 3.7 : 1, so 12 in wide is roughly 3.2 in tall.

## Regenerating

```
pip install fonttools brotli uharfbuzz potracer pillow numpy cairosvg
python3 scripts/make-vinyl-logo.py
```

`public/lavo-mark.png` is only 231 px wide, far too small to print, so the
script vector-traces the droplet from it and refits its gradient from the source
pixels. The type is Plus Jakarta Sans (the site display face) converted to
outlines, so nothing in the output depends on a font being installed.
