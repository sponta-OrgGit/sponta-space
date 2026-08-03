# sponta-space

The venue-facing landing page. Lives at **sponta.space** / **www.sponta.space**.

This README replaces the default `create-next-app` boilerplate that was here before — that
one was never actually updated for this project and doesn't reflect the current setup
(different font stack, different file locations, no deploy notes). If anything below
conflicts with what you see in the code, trust the code and fix this file.

## What this is (and isn't)

This repo is **one surface only**: the venue-side landing page. It captures interest from
venue owners and sends them into the onboarding flow. It is not:

- `app.sponta.space` — the venue application (login, panel, lunch list, photos). That's a
  separate repo (`venue-sponta`), separate deploy, separate owner (Khang).
- `sponta.social` — the consumer-facing product (cluster discovery, swipe cards). Different
  domain, different app, not related to anything in this repo.

If a "consumer card" or "login form" idea ever seems like it belongs in this codebase, it's
the wrong surface — this is confirmed as a recurring source of confusion, worth double-checking
before building.

The interest form here and the future login on `app.sponta.space` are **parallel entry
points**, not sequential phases — see the Phase B section below.

## Stack

- **Next.js 15** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS v4** — CSS-first config. All design tokens live in `src/app/globals.css`
  under `@theme { ... }`. There is no `tailwind.config.*` file — don't add one back; a
  previous version of this repo had two conflicting ones and neither did anything.
- **lucide-react** for icons (2px stroke, matches the brand icon spec)
- Deployed on **Vercel**, zero-config (no `vercel.json` — see the gotchas section for why
  that matters)

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run generate:og   # regenerates public/og-image.png
```

## Environment variables

See `.env.example`. Both are optional with safe fallbacks:

- `NEXT_PUBLIC_FORM_ENDPOINT` — where the interest form POSTs. **Currently unset in
  production**, so the form falls back to a prefilled `mailto:` link. There's a ticket
  written for Mubi/Doan to build a real storage endpoint (independent of the main venue
  table — sales/CRM data, not operational data). Once that exists, set this in Vercel
  (Project Settings → Environment Variables) and redeploy. No code changes needed on
  either end — the frontend already reads this at runtime.
- `NEXT_PUBLIC_CONTACT_EMAIL` — shown in the footer, the form's privacy note, and used as
  the mailto fallback target. Defaults to `hello@sponta.space`.

## Project structure

```
src/app/
  layout.tsx          Root layout — fonts (next/font/google) + all SEO/OG metadata
  page.tsx             Assembles the page from the components below, in order
  globals.css          Design tokens (@theme) + base styles — see "Design system" below
  icon.svg             Favicon — a simple mark, not the script logo (doesn't read at 16px)
  components/
    Header.tsx         Top bar with the "Kirjaudu" button — see Phase B, below
    Hero.tsx            Logo, headline, warm glow, hosts LiveReadout
    LiveReadout.tsx     Real client-side time + rotating example match signal
    WhatSpontaIs.tsx    The three-problem pitch (context fit / group decisions / community)
    WhatVenueGets.tsx   Concrete deal terms (free to join, no hidden costs, you own your data)
    HowDataWorks.tsx    Data-sourcing transparency (own site only, no aggregators)
    InterestForm.tsx    The actual lead-capture form — see "The form" below
    Footer.tsx          Legal/company footer
src/lib/
  constants.ts          SITE object — company name, business ID, contact email, env var reads
scripts/
  generate-og.mjs       Rasterizes public/og-image.png from an inline SVG (see below)
public/
  logo.png / logo.svg   Original brand assets — opaque black background baked in, not
                         transparent. Don't use these directly on any background other than
                         pure black; the edges will show a seam.
  logo-transparent.png  The actual asset used everywhere on this site. Same artwork, black
                         background flood-filled to transparent (scripted, corner-based fill —
                         see git history if you need to regenerate it from a new source file).
  og-image.png           Generated, not hand-made — see scripts/generate-og.mjs.
```

## Design system

Colors, type, radii, spacing, and voice/copy rules come from the Sponta brand design system
(built separately, not in this repo). The short version, as implemented in `globals.css`:

- Matte near-black scale (`bg-0` → `bg-4`), **never pure `#000`, never blue-tinted**
- Orange `#FF7A1A` primary/CTA, teal `#35DAD4` accent, gold `#F4B740` highlight (unused on
  this page so far — nothing here is a rating/pick badge)
- Type: **Bricolage Grotesque** (display/headings, 700–800), **Hanken Grotesk** (body,
  400–700), **Space Mono** (metadata only — the live time readout is the only real use of it
  on this page; don't reach for it as a general-purpose "techy" label font)
- Radii: `rounded-lg` (22px) / `rounded-xl` (30px) / `rounded-pill`. Nothing on this page has
  a sharp 90° corner — that's a deliberate brand rule, not an oversight if you see it enforced
  somewhere that looks inconsistent with a "normal" design system.
- Voice: sentence case on headings/buttons (never Title Case, never uppercase except the
  small overline labels, which are a distinct documented style). Direct, short, second-person
  where natural. No marketing filler ("discover", "curated", "unlock").

## Gotchas that already cost real time — read before touching build config

1. **Vercel's Framework Preset must be "Next.js", not "Other."** This project had it set to
   "Other" at some point (probably while someone was fighting the `vercel.json` issue below),
   which silently makes Vercel serve only `public/` as static files and 404 on everything
   else — including a perfectly working Next.js build. If the site ever 404s in production
   again despite a green build, check **Project Settings → General → Framework Preset**
   before anything else.
2. **Don't add a `vercel.json` with a `builds` array.** Same failure mode as above, different
   cause — declaring `builds` manually disables Vercel's framework auto-detection entirely.
   Zero-config is correct here; there's no reason to override it.
3. **`next/font/google` validates against a *bundled* list, not a live Google Fonts lookup.**
   A font can be real and on Google Fonts and still fail with "Unknown font X" if it's not in
   the specific list shipped with your installed Next.js version. Before adding a new font,
   check directly:
   ```bash
   node -e "console.log('Font Name' in require('next/dist/compiled/@next/font/dist/google/font-data.json'))"
   ```
   This bit us with "Big Shoulders Display" (real font, not in the bundled list at the time) —
   don't assume, check.
4. **`npm run build` will fail in some sandboxed/offline environments** because
   `next/font/google` fetches font files at build time. That's expected there and not a bug —
   it works fine on Vercel's build servers, which have normal internet access.

## The form

`InterestForm.tsx` sends this exact JSON shape via `fetch` (or falls back to `mailto:` if
`NEXT_PUBLIC_FORM_ENDPOINT` is unset):

```json
{
  "venueName": "string",
  "venueTypes": ["Lounas", "Baari"],
  "lounastaja": "Kyllä | En vielä | En osaa sanoa | \"\"",
  "contactPerson": "string",
  "email": "string"
}
```

`venueTypes` is a multi-select (a venue can offer several services). `lounastaja` is a
conditional sub-question that only renders — and is only meaningful — when `"Lounas"` is
among the selected types.

## Phase B — the login button

`Header.tsx` currently renders a **placeholder**: clicking "Kirjaudu" shows a dismissible
"Tulossa" (coming soon) message instead of linking anywhere, since `app.sponta.space/login`
doesn't exist yet. This is intentionally a placeholder, not a stub someone forgot to finish.

When Ticket 2 ships and the venue app has a real login:

1. In `Header.tsx`, swap the button's `onClick` (which toggles the "Tulossa" message) for a
   real `<a href="https://app.sponta.space/login">`.
2. Per the original Ticket 1 spec: once login exists, it should become the **primary** CTA,
   with the interest form demoted to secondary (not removed — venues captured before login
   existed still need a path in). This wasn't built as a fully separate primary/secondary
   visual treatment yet — right now they're just both present (login in the header, interest
   form as the main page CTA). Worth a proper pass on visual hierarchy once login is real,
   not just a link swap.
3. `SITE.loginUrl` in `src/lib/constants.ts` already holds `https://app.sponta.space/login` —
   use that constant rather than hardcoding the URL again in `Header.tsx`.

## Current status

Live in production. Commission messaging, the three-problem explanation, and the venue-type
question have all been through at least one round of real feedback and revision — worth
treating as "current best understanding," not "finished and untouchable." Known open items:
lead storage (ticketed, unbuilt), a second round of comprehension testing on the three-problem
section with someone unfamiliar with the project, and the primary/secondary CTA rework once
Phase B login is real.
