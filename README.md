# Antrian Online — Queue Management System (MVP)

Single-organization, web-based queue management system with a Kiosk,
TV Display, and Staff Counter Dashboard, built with Next.js, TypeScript,
PostgreSQL, Prisma, and Tailwind CSS. Realtime updates are delivered via
[Pusher](https://pusher.com).

## Status

MVP in progress, built incrementally. Done so far:

- Project scaffold (Next.js App Router, TypeScript, Tailwind)
- Domain schema in `prisma/schema.prisma` (Service, Counter, Staff,
  CounterSession, Ticket, TicketSequence, TicketEvent)
- Prisma Client singleton (`src/lib/prisma.ts`) using the `pg` driver adapter
- Pusher plumbing: server trigger client (`src/lib/pusher/server.ts`),
  browser client (`src/lib/pusher/client.ts`), shared channel/event
  contracts (`src/lib/pusher/events.ts`), and a `useQueueEvents` hook for
  client components
- Seed script (`prisma/seed.ts`) with sample services/counters/admin
- Ticket lifecycle backend (`src/lib/tickets/*`) and its API routes:
  - `POST /api/tickets` — issue a ticket (atomic per-service/day numbering)
  - `GET /api/tickets` — list/filter tickets (for TV Display / Dashboard)
  - `POST /api/tickets/call-next` — atomically claim the next WAITING
    ticket for the caller's counter (`FOR UPDATE SKIP LOCKED`, priority
    then FIFO)
  - `POST /api/tickets/[id]/transition` — CANCELLED / SERVING / SKIPPED /
    NO_SHOW / DONE, with row-locked check-then-write and an
    owning-staff check
  - Every mutation publishes a `ticket-event` on the `queue-updates`
    Pusher channel and writes a `TicketEvent` audit row
  - Verified under concurrent load with a throwaway script: 40 parallel
    ticket creations produced 40 unique numbers, and 40 parallel
    call-next requests against the same counter each claimed a distinct
    ticket — no duplicates, no double-claims
- Staff auth: email/password login against `Staff.passwordHash`
  (bcrypt), a signed JWT session cookie (`src/lib/auth/session.ts`,
  edge-safe via `jose`), and `src/proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) protecting `/counter/*`. `call-next` and `transition`
  now derive `staffId`/`counterId` from the session — no longer trusted
  from the request body.
- Four pages, manually tested end-to-end in a browser:
  - `/` — landing page linking to the three surfaces
  - `/kiosk` — pick a service, get a ticket number
  - `/display` — TV Display: now-serving per counter + waiting counts,
    polls every 10s and refreshes instantly on Pusher events
  - `/login` + `/counter` — staff login, counter picker, then call
    next / start serving / skip / no-show / done
- Admin panel at `/admin` (ADMIN role only — `src/proxy.ts` redirects
  STAFF to `/counter`, and every `/api/admin/*` route re-checks the role
  server-side via `requireAdminSession`), covering the last "seed-only"
  gap:
  - `/admin/services` — create services, rename, change prefix, toggle
    active
  - `/admin/counters` — create counters, toggle active, assign which
    services each counter serves (checkboxes, saved immediately)
  - `/admin/staff` — create staff, change name/email/role/active status,
    set a new password. An admin can't deactivate or demote their own
    account (would lock everyone out).
  - Changes take effect immediately — e.g. a new service appears on
    `/kiosk` and a new counter-service assignment appears in a staff
    member's counter picker without a redeploy, since it's all just rows
    in Postgres now instead of `prisma/seed.ts`.

- A shared design system (`src/app/globals.css` design tokens +
  `src/components/ui/{Button,Card,Badge}.tsx`) applied across every page:
  a blue accent color, semantic status colors (waiting/called/serving/
  negative), and Geist Sans actually wired up (it was imported but never
  applied). Specific UX passes:
  - **Kiosk** — bigger touch targets, a colored prefix badge per
    service, shows "N orang mengantre sebelum Anda" on the confirmation
    screen, and auto-returns to the service picker after 15s (a public
    kiosk needs to reset itself for the next customer, not wait for a
    manual tap)
  - **TV Display** — a clock/date header, a "baru saja dipanggil" recent
    history list (for customers who missed hearing their number), and a
    brief highlight animation on a counter's card when it calls a new
    ticket
  - **Counter Dashboard** — a live elapsed-time readout ("dipanggil 42
    detik lalu"), a waiting-count badge for the counter's services, and
    color-coded status badges. Fixed a staleness bug found while
    screenshotting this: the waiting count showed 0 for a few seconds
    after picking a counter because it only refreshed on the next 5s
    poll tick — `select-counter` now triggers an immediate refetch.

Not built yet: a way for a customer to cancel their own ticket from the
Kiosk (deliberately out of scope — kiosks are walk-up-and-tap, no
customer identity to check ownership against), and reporting/analytics
on ticket history.

## Getting started

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, an
   `AUTH_SECRET` (see the comment in `.env.example` for how to generate
   one), and your [Pusher](https://dashboard.pusher.com) app credentials.
   Realtime gracefully degrades to polling-only if Pusher isn't
   configured yet — everything else works without it.
2. Install dependencies: `npm install`
3. Apply migrations: `npm run db:migrate`
4. Seed sample data: `npm run db:seed`
5. Run the dev server: `npm run dev`

Default seeded admin login: `admin@antrian.local` / `admin123` — change
this password via `/admin/staff` before any real deployment (this is
dev-only seed data, and the password has been shared in chat/commit
history, so treat it as already public).

## Deploying (Vercel + Supabase)

Realtime uses Pusher (not a self-hosted socket server), so this app runs
fine on Vercel's serverless functions — no persistent process needed.

1. **Database**: create a [Supabase](https://supabase.com) project, then
   from its dashboard's **Connect** button grab two connection strings:
   - **Transaction pooler** (port 6543) → set as `DATABASE_URL` in Vercel,
     with `?pgbouncer=true` appended. This is what the app uses at
     runtime; it's IPv4 and safe for many short-lived serverless
     invocations.
   - **Direct connection** (port 5432) → keep locally as `DIRECT_URL`,
     used only to run migrations from a machine with real network access
     to Postgres (Vercel's build step does not run migrations).
2. **Env vars**: in the Vercel project's Settings → Environment
   Variables, set `DATABASE_URL` and `AUTH_SECRET` (same value
   requirements as `.env.example`). Pusher vars are optional — the app
   polls instead of erroring if they're unset. `DIRECT_URL` is only used
   locally for migrations, not by the deployed app.
3. **Schema**: from a machine with Postgres network access, run
   migrations against the direct connection by pointing `DATABASE_URL`
   at it for just that command (`prisma.config.ts` always reads
   `DATABASE_URL`, so this swaps it in temporarily):
   `DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy`, then
   `DATABASE_URL="$DIRECT_URL" npx prisma db seed` for sample data.
4. Deploy (push to the repo's default branch, or trigger a deploy from
   the Vercel dashboard).

`@prisma/adapter-pg` doesn't cache named prepared statements unless you
opt in, so it's already safe against a transaction-mode pooler without
extra code — `pgbouncer=true` is still worth adding since Supabase's own
docs point at it as the standard, documented setting.

## Scripts

- `npm run dev` / `build` / `start` — Next.js app
- `npm run lint` — ESLint
- `npm run db:generate` — regenerate Prisma Client after schema changes
- `npm run db:migrate` — create/apply a migration in dev
- `npm run db:seed` — run `prisma/seed.ts`
- `npm run db:studio` — open Prisma Studio

## Architecture notes

- **No multi-tenancy** — single organization, no tenant scoping anywhere.
- **Realtime** — one global Pusher channel (`queue-updates`, see
  `src/lib/pusher/events.ts`) carrying ticket lifecycle events. Kiosk, TV
  Display, and Counter Dashboard all subscribe (`useQueueEvents`) and
  filter client-side. Every page also polls on an interval as a fallback,
  both for a missed event and for when Pusher isn't configured at all.
- **Ticket numbering** — `TicketSequence` is partitioned by
  `(serviceId, date)` so daily numbering resets happen implicitly (a new
  day is a new row) instead of via a scheduled reset job. The number
  itself comes from a single atomic `INSERT ... ON CONFLICT DO UPDATE
  ... RETURNING`, race-free under concurrent kiosk requests without
  explicit locking (see `src/lib/tickets/create.ts`).
- **Calling the next ticket** uses `SELECT ... FOR UPDATE SKIP LOCKED`
  inside a single `UPDATE` statement so two counters can never claim the
  same `WAITING` ticket (see `src/lib/tickets/call-next.ts`).
- **Staff sessions are stateless JWTs** (cookie `session`), not
  server-side sessions — simple for an MVP, but it means revoking a
  logged-in staff member before their 12h token expires isn't possible
  yet. `CounterSession` rows are still written to the DB for
  audit/reporting even though they aren't used for auth.
