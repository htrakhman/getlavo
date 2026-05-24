# NJ Cities Content Spec

City pages are built at runtime from `data/nj-municipalities.json`, `data/city-tiers.json`, `data/city-enrichment.json`, and templates in `lib/seo/cities/templates/`.

## Routes

| Route | Builder |
|-------|---------|
| `/cities` | Index page |
| `/cities/new-jersey` | `buildStatePage()` |
| `/cities/[slug]` | `buildCityPage(municipality)` |
| `/cities/counties/[countySlug]` | `buildCountyPage(countySlug)` |

## Tier rules

| Tier | Slugs | Min words | FAQs |
|------|-------|-----------|------|
| 1 | `data/city-tiers.json` | 1,000 | 12 |
| 2 | `type: city` (not tier 1) | 750 | 10 |
| 3 | borough, township, town, village | 750 | 8 |

## Metadata

- **Title:** `Mobile Car Wash for Apartments in {seoName}, NJ | Lavo`
- **Description:** mentions `{localName}` and `{county} County, NJ` (≤160 chars)
- **H1:** `Mobile Car Wash for Apartment Buildings in {localName}`

Duplicate municipality names use type labels (e.g. `Bordentown City` vs `Bordentown Township`). Colliding display names add county to the SEO title.

## Enrichment

Tier 1 hand-tuned copy lives in `data/city-enrichment.json` (`overviewExtra`, `neighborhoods`, `nearbyTransit`, etc.).

## Validation

```bash
npx tsx scripts/nj-cities-slug-test.ts
npx tsx scripts/nj-cities-validate.ts
npx tsx scripts/preview-city-page.ts jersey-city atlantic-city absecon
```

## Regenerating enrichment (optional)

Legacy overrides are in `scripts/nj-city-overrides.json`. Edit `data/city-enrichment.json` directly for tier 1 updates.
