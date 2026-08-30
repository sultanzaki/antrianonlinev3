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

Not built yet: an admin UI for managing services/counters/staff (currently
only seedable via `prisma/seed.ts`), and a way for a customer to cancel
their own ticket from the Kiosk.

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

Default seeded admin login: `admin@antrian.local` / `admin123` (change
before any real deployment — this is dev-only seed data).

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
