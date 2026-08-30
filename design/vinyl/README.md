# Lavo vinyl decal artwork

Two lockups, each print-ready for a custom vinyl decal.

**`getlavo-vinyl-*`** — the droplet with `getlavo.io` beside it on a single line.
20 × 5.4 in.

**`lavo-vinyl-*`** — the droplet, `LAVO`, and `getlavo.io` beneath it. 20 × 6.9 in.

## Colourways

| Suffix | Use |
| --- | --- |
| `-color` | The full-colour logo, for a printed decal. |
| `-white` | White, for dark surfaces — car glass, dark walls. |
| `-black` | Single colour, for sellers who *cut* the vinyl rather than print it, since cut vinyl is one solid colour. |

## Formats

| Extension | Use |
| --- | --- |
| `.png` | The usual upload. Transparent background, 6000 px wide, stamped 300 dpi so uploaders read it as 20 in rather than assuming 72 dpi and reporting 83 in. |
| `.svg` | Vector. Best choice when the seller accepts it — scales to any decal size with no quality loss. |
| `.pdf` | Vector, page sized to the real print dimensions. What most print shops mean by "send a vector file". |
| `.eps` | Vector, for older print workflows and sign cutters that ask for EPS specifically. |
| `.jpg` | Colour lockups only. Flattened onto white, since JPEG cannot hold transparency. Use only if the listing refuses everything else. |

Everything is generated from the same vector source, so all formats are the same
artwork at the same size. Text is outlined, so there are no missing-font
problems, and nothing is embedded as a raster.

Notes for ordering:

- Prefer PNG or a vector format. A JPEG will come back with a white box around
  the logo unless the seller knocks it out by hand.
- Leave proportions locked when resizing. The single-line lockup is about
  3.7 : 1, so 12 in wide is roughly 3.2 in tall; the stacked one is about
  2.9 : 1, so 12 in wide is roughly 4.2 in tall.
- Every file is well under 5 MB, the usual upload cap.

## Regenerating

```
pip install fonttools brotli uharfbuzz potracer pillow numpy cairosvg
python3 scripts/make-vinyl-logo.py
```

`public/lavo-mark.png` is only 231 px wide, far too small to print, so the
script vector-traces the droplet from it and refits its gradient from the source
pixels. The type is Plus Jakarta Sans (the site display face) converted to
outlines. Change `PRINT_WIDTH` in the script to render at a different size.
