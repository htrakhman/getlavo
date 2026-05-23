# NJ Cities Content Spec

Each municipality page (`CityPage` in `lib/seo/cities/content/`) must include:

| Field | Requirement |
|-------|-------------|
| `slug` | Matches `data/nj-municipalities.json` |
| `title` | `Mobile Car Wash for Apartment Buildings in {Name} \| Lavo` |
| `description` | 1–2 sentences mentioning `{Name}` and `{County} County` |
| `h1` | `Mobile Car Wash for Apartment Buildings in {Name}` |
| `opening` | 2+ sentences, unique to municipality |
| `mobileCarWash` | 3 paragraphs; at least one references local parking or corridors |
| `residents` | 3 paragraphs |
| `buildings` | 3 paragraphs |
| `propertyManagers` | 3 paragraphs |
| `operators` | 3 paragraphs; name 1–2 neighboring municipalities |
| `faqs` | 3 items; at least one municipality-specific question |
| `request` | 2 paragraphs |

## County batches

Add or edit one file under `lib/seo/cities/content/{county-slug}.ts` per county PR.

Hand-crafted overrides for priority markets live in `scripts/nj-city-overrides.json` and are applied by `scripts/generate-nj-city-content.py`.

## Validation

```bash
npx tsx scripts/nj-cities-slug-test.ts
npx tsx scripts/nj-cities-validate.ts
```
