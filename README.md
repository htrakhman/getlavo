# Lavo

Premium B2B2C SaaS for mobile car wash in apartment garages.

## Stack
Next.js 14 · Tailwind CSS · Supabase (Postgres + Auth + RLS) · Stripe · TypeScript

## Setup
```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
# Push the schema to your Supabase project:
supabase db push   # or paste supabase/migrations/0001_init.sql in SQL editor
npm run dev
```

## Architecture

Three role-based portals share a single Next.js app, gated by Supabase auth + RLS:

```
app/
  page.tsx                 # marketing landing (getlavo.io)
  signup, login            # role-aware auth
  (building)/building/*    # property managers
  (operator)/operator/*    # car wash crews
  (resident)/resident/*    # residents (locked until building has signed contract)
  api/                     # Stripe checkout, signout
```

### Schema highlights (`supabase/migrations/0001_init.sql`)
- `profiles` 1:1 with `auth.users`, role enum (`building_manager | resident | operator | admin`)
- `buildings → floors → parking_spots` for garage layout
- `operators` + `operator_addons` for the marketplace
- `contracts` (term enum: trial_1, trial_3, month_3, month_6, year_1) — one active per building enforced via partial unique index
- `wash_days → washes → wash_reviews` flow, with per-row RLS so residents only see their own washes, operators only their contracted buildings, managers only their building
- `addon_orders`, `payouts`, `issues`, `notifications`

### Design system (`app/globals.css`, `tailwind.config.ts`)
- Deep ink palette (`#0A0B0D` base) + electric teal `gleam` accent (`#19F0D8`)
- Display font: **Space Grotesk** (Google Fonts) — explicitly not Inter/Roboto
- Reusable `.card`, `.btn-primary`, `.btn-ghost`, `.field`, `.chip`, `.gleam-text` (animated shine) classes
- Glass-morphism via `bg-glass` gradient + `backdrop-blur`; subtle dot grain overlay; `shadow-glow` for the brand accent

## What's built

| Portal | Status |
|---|---|
| Building: onboarding wizard (3 steps), dashboard, marketplace, contract signer with all 5 terms, residents table, garage map, issues | ✅ |
| Operator: application form, overview, contracted buildings, wash-days list, **floor-by-floor crew tool** (start day, mark done per car, flag, complete day), earnings, profile | ✅ |
| Resident: locked-state screen (waiting on building contract), onboarding (building, unit, spot, vehicle), next-wash hero, vehicle, add-ons (Stripe Checkout), history with star reviews | ✅ |

## Next milestones (not in this scaffold)
- Stripe Connect operator onboarding flow + webhook to mark `addon_orders.paid_at`
- Cron job to auto-generate `wash_days` from contract `wash_frequency_days`
- Email/SMS notifications on `wash complete` (Supabase function + Resend/Twilio)
- Photo upload to Supabase Storage from crew tool
- Admin portal for operator approval queue
