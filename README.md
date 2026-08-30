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
  browser client (`src/lib/pusher/client.ts`), and shared channel/event
  contracts (`src/lib/pusher/events.ts`)
- Seed script (`prisma/seed.ts`) with sample services/counters/admin
- Ticket lifecycle backend (`src/lib/tickets/*`) and its API routes:
  - `POST /api/tickets` — issue a ticket (atomic per-service/day numbering)
  - `GET /api/tickets` — list/filter tickets (for TV Display / Dashboard)
  - `POST /api/tickets/call-next` — atomically claim the next WAITING
    ticket for a counter (`FOR UPDATE SKIP LOCKED`, priority then FIFO)
  - `POST /api/tickets/[id]/transition` — CANCELLED / SERVING / SKIPPED /
    NO_SHOW / DONE, with row-locked check-then-write and an
    owning-staff check
  - Every mutation publishes a `ticket-event` on the `queue-updates`
    Pusher channel and writes a `TicketEvent` audit row.
  - Verified under concurrent load with a throwaway script: 40 parallel
    ticket creations produced 40 unique numbers, and 40 parallel
    call-next requests against the same counter each claimed a distinct
    ticket — no duplicates, no double-claims.

Not built yet: Kiosk/Counter/TV pages and staff auth (the
`staffId`/`counterId` fields are accepted directly in request bodies for
now — see the `TODO` comments in the API routes).

## Getting started

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and your
   [Pusher](https://dashboard.pusher.com) app credentials.
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
  Display, and Counter Dashboard all subscribe and filter client-side.
  Clients should still poll/refetch periodically as a fallback in case a
  realtime event is missed.
- **Ticket numbering** — `TicketSequence` is partitioned by
  `(serviceId, date)` so daily numbering resets happen implicitly (a new
  day is a new row) instead of via a scheduled reset job. Number
  generation must use an atomic `UPDATE ... RETURNING` (or equivalent) to
  avoid duplicate numbers under concurrent kiosk requests — not yet
  implemented.
- **Calling the next ticket** must use row-locking
  (`SELECT ... FOR UPDATE SKIP LOCKED`) so two counters can never claim
  the same `WAITING` ticket — not yet implemented.
