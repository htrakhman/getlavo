# getlavo.io vinyl lockup

The Lavo droplet with `getlavo.io` set beside it, sized and prepared for a
printed or cut vinyl decal.

| File | Use |
| --- | --- |
| `getlavo-vinyl-color.png` | **Upload this one for a printed (full-colour) decal.** 6000 × 1608 px, transparent background — 20 in × 5.4 in at 300 dpi. |
| `getlavo-vinyl-white.png` | White version for dark surfaces (car glass, dark walls). |
| `getlavo-vinyl-black.png` | Single-colour version — use this if the seller is cutting the vinyl rather than printing it, since cut vinyl is one solid colour. |
| `*.svg` | The same three as vector. Send an SVG if the seller accepts one; it scales to any decal size with no quality loss. |

Notes for ordering:

- Every file has a transparent background. If the listing insists on JPG, ask
  for PNG instead — a JPG will come back with a white box around the logo.
- The aspect ratio is roughly 3.7 : 1. A 12 in wide decal is about 3.2 in tall.
- Leave the proportions locked when resizing.

## Regenerating

```
pip install fonttools brotli uharfbuzz potracer pillow numpy cairosvg
python3 scripts/make-vinyl-logo.py
```

`public/lavo-mark.png` is only 231 px wide, far too small to print, so the
script vector-traces the droplet from it and converts the wordmark
(Plus Jakarta Sans ExtraBold, the site display face) to outlines. Nothing in
the output depends on a font being installed.
