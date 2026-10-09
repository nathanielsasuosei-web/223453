# BeatForge — beat storefront for a music producer

A complete storefront where a producer publishes beats and videos, artists create
accounts, pay with **mobile money** or **bank transfer**, and receive their
purchased files **by email** with a private download link. Artists and the
producer also exchange **messages through email** (contact form → producer,
replies emailed back to the artist). The landing page has an **animated hero**.

Built with Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4 and a
dependency-free JSON data store — no database server required.

## Quick start

```bash
npm install
npm run seed      # generates demo beats (real audio), artwork, videos + demo orders
npm run dev       # http://localhost:3000
```

### Demo accounts (created by `npm run seed`)

| Role     | Email                    | Password    |
| -------- | ------------------------ | ----------- |
| Producer | `admin@beatforge.studio` | `Admin123!` |
| Artist   | `artist@beatforge.studio`| `Artist123!` |

Sample data includes a delivered order (`BF-DEMO01`) with a working download token.

### Producer accounts

A **producer account** controls everything on the website from `/admin`:
beats, videos, orders & payments, messages, licenses, email outbox, studio
settings (profile, currency, mobile money lines, bank details, socials) and
**accounts** (`/admin/users` — promote artists to producers, demote producers,
delete accounts).

From the dashboard the producer can also:

- **Edit the website itself** (`/admin/site`): brand name, announcement banner, homepage
  hero (headline, sub-headline, buttons, stats), beats/videos section text and visibility,
  contact page text and footer note.
- **Add accounts directly** and **reset any account's password** (`/admin/users`).

Producer accounts can be created three ways:

1. **Signup** — on `/signup`, pick **Producer** as the account type and enter the
   producer access code. The code defaults to `beatforge-producer`; set the
   `PRODUCER_SIGNUP_CODE` env var to change it.
2. **First signup** — on a fresh database, the very first account created
   automatically becomes a producer account.
3. **From the dashboard** — an existing producer adds a producer or artist account in
   `/admin/users` (no access code needed).

> **Security:** set `PRODUCER_SIGNUP_CODE` in production. The built-in default is public
> (it's in this README), and anyone who knows the code can open a producer account.

## How the store works

1. **Browse** `/beats` → every listed beat has its own inline waveform preview (play
   it or scrub through it right in the list; the beat page has a larger player) →
   pick a license.
2. **Checkout** `/checkout/[orderId]` → pay with mobile money (enter provider + phone)
   or bank transfer (enter a reference, optionally attach a receipt).
3. **Admin confirms** the payment in `/admin/orders` (manual confirmation — the
   producer verifies the money landed, then confirms).
4. **Delivery** — the order becomes `DELIVERED`, a private, non-expiring
   `/download/<token>` link is issued, and the files are emailed to the buyer
   (attached when SMTP is configured, otherwise queued in the visible outbox).

Buying **Exclusive Rights** automatically unpublishes the beat and increments its
sales counter.

Artists can also **pay half now**: pick "Pay 50% now" at checkout and the deposit
locks the licence — the files are released when the balance lands (payable from the
checkout page with the order code plus `-BAL`, or marked paid by the producer).

## Studio bookings

`/studio` is a booking page modelled on the meetbeatz flow — artists pick a
service, date, duration and start time, then pay a deposit to lock the slot:

1. **Service** — Recording, Mixing or Mastering, priced per hour (`/admin/studio`).
2. **Date & duration** — the next N bookable days (closed days and the booking
   horizon are set by the producer).
3. **Start time** — slots come from the studio's opening hours; times that are
   already booked, in the past or inside the minimum notice are greyed out, so two
   artists can never take the same slot.
4. **Notes + details** — anything the engineer should know.
5. **Pay the deposit** — 50% by mobile money or bank transfer (configurable in
   `/admin/studio`). Confirming the deposit moves the booking to **Confirmed** and
   emails the artist; the balance is payable at the studio.

Bookings live in `/admin/bookings` (confirm deposits, mark balances paid, complete
or cancel a session and release its slot) and in the artist's account under
**Studio bookings**.

## Features

- **Producer** (`/admin`): upload beats (audio + artwork, per-file license tiers),
  upload videos (with poster + duration), manage orders (confirm/cancel, settle
  50/50 balances), studio bookings (deposits, balances, calendar), studio setup
  (opening hours, services, rates, deposit %, policy), messages (reply → emailed),
  email outbox, settings (producer profile, currency, mobile money numbers, bank
  account, payment instructions, socials), license tiers, and accounts (role
  changes, deletions).
- **Artist accounts**: signup/login, order history, downloads, message threads.
- **Payments**: mobile money + bank transfer with proof upload; optional Paystack
  hook if env keys are present. Supports **50% deposits** on beat licences and
  studio bookings, with the balance tracked to delivery.
- **Previews everywhere**: every listed beat (store list, homepage, related beats)
  shows its own scrubbable waveform, decoded from the real audio file once and
  cached in the browser.
- **Email**: nodemailer when `SMTP_*` env vars are set; otherwise every email is
  logged to `/admin/emails` so the flow is fully testable offline.
- **Animated hero** on the landing page (blob gradients, scroll reveals, marquee).

## Configuration (optional)

Copy to `.env` — everything works without it (secrets fall back to `/data/.secret`,
emails fall back to the outbox):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@example.com
SMTP_PASS=your-password
SMTP_FROM="BeatForge <no-reply@beatforge.studio>"
PAYSTACK_SECRET_KEY=sk_test_...      # optional card payments
```

## Project layout

```
src/lib/          store (JSON DB), auth (JWT cookie), email, uploads, payments, notifications
src/components/   UI + admin managers (BeatManager, VideoManager, OrderManager, …)
src/app/          public pages, account, download, admin, and all API routes
scripts/          seed + media generators (synthesised beats, SVG artwork, demo videos)
data/             runtime JSON collections, uploads and the dev session secret (git-ignored)
```

Key API routes: `POST /api/auth/{signup,login,logout}`, `POST /api/checkout`,
`POST /api/orders/:id/pay/{mobile-money,bank}`, `GET /api/orders/:id`,
`GET /api/download/:token`, `GET /api/files/[...path]` (range-capable),
`POST /api/contact`, and the `/api/admin/*` family (all return 401/403 unless admin).

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | dev server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | production build / server |
| `npm run seed` | regenerate demo content (uses ffmpeg if available; skips video encoding otherwise) |
| `npm run typecheck` | `tsc --noEmit` |

`npm run seed` needs `ffmpeg` only to render the demo videos; set `FFMPEG_BIN` if
it is not on `PATH`.
