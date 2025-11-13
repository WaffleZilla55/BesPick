# BESPICK Dashboard

BESPICK is an internal communications hub for morale updates, announcements, and polls. Admins can schedule and automate posts, collect votes, and audit participation, while teammates view live and archived activities from a clean Next.js interface backed by Convex and Clerk.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Application Features](#application-features)
4. [Architecture & Data Flow](#architecture--data-flow)
5. [Getting Started](#getting-started)
6. [Directory Layout](#directory-layout)
7. [Convex API Surface](#convex-api-surface)
8. [Authentication & Roles](#authentication--roles)
9. [Deployment Notes](#deployment-notes)

---

## Overview

- **Core concept**: Activities are either announcements or polls. Both can be scheduled, auto-archived, or auto-deleted. Polls may accept new options, limit selections, close automatically, and (optionally) remain anonymous.
- **Surfaces**:
  - `/dashboard` – blended feed of published activities with poll voting.
  - `/archive` – read-only history for archived items.
  - `/admin/create` – unified form for creating or editing announcements/polls.
  - `/admin/scheduled` – list of upcoming items waiting to be published.
  - `/admin/roster` – Clerk-backed role management for the admin team.
- **Data backend**: Convex stores activities (`announcements`) and individual ballots (`pollVotes`) and exposes typed queries/mutations that the client consumes through `convex/react`.

## Tech Stack

- **UI**: Next.js 16 (App Router) + React 19 + TypeScript + TailwindCSS utilities.
- **State & Data**: Convex (`convex/announcements.ts`) for all CRUD, scheduling, voting, and analytics logic.
- **Auth**: Clerk for sign-in, session management, and role metadata.
- **Icons & UI polish**: `lucide-react`, `tailwind-merge`, `tailwind-variants`.
- **Tooling**: ESLint 9, TypeScript 5, PostCSS/Tailwind 4 pipeline.

## Application Features

### Activity Timeline & Archive

- Published announcements show titles, descriptions, publish/edited timestamps, and optional auto-delete/archive badges.
- Archive view filters to items whose status is `archived`.
- Scheduled view shows future posts with quick links to edit/delete before publication.

### Polling Engine

- Supports multi-select polls with configurable max selections.
- Optional anonymous mode hides aggregate results from non-admin voters.
- Admins can enable participant-submitted options; suggestions are deduplicated and added to the canonical option list.
- Polls can specify close dates/times; once closed or archived, votes become read-only.
- Results pane displays per-option counts and percentages.

### Admin Workspace

- Announcement form handles create and edit flows, including:
  - switching between announcement/poll/voting event types;
  - scheduling future publish times via human-friendly time-slot pickers;
  - auto-delete or auto-archive guards to prevent conflicts or invalid timestamps;
  - poll settings (anonymous, allow new options, selection limits, closing time).
- Validation is mirrored in Convex to ensure client/server parity.

### Automation & Background Tasks

- `publishDue` mutation promotes scheduled announcements whose `publishAt` has arrived.
- The dashboard periodically calls `publishDue` and refreshes `list`/`nextPublishAt` feeds; no separate cron job is required for local testing.
- Auto-delete and auto-archive enforcement happens inside the same mutation.

### Voting Insights

- Voters can revise their ballot until a poll closes; submissions are idempotent per user.
- Admins see an additional “View voter breakdown” toggle inside the poll modal. This surfaces every option with the list of users (name or fallback ID) who chose it, powered by the `getPollVoteBreakdown` query.

### Roster & Role Management

- `/admin/roster` lets admins search Clerk users, view their primary email, and promote/demote roles via the `updateUserRole` server action.
- Roles are persisted in `publicMetadata.role` and mirrored in JWT session claims for server protection.

## Architecture & Data Flow

```text"
Next.js (App Router)  <--convex/react-->  Convex Functions  <---> Convex Storage
         |                                      |
   Clerk Frontend                        Clerk JWT / Identity
```

- Client components call `useQuery`/`useMutation` with references from `convex/_generated/api`.
- Convex functions validate payloads with `convex/values` validators, enforce scheduling rules, and persist data to:
  - `announcements` table: titles, descriptions, timestamps, poll metadata, automation fields.
  - `pollVotes` table: per-user selections plus cached `userName` for admin reporting.
- Authentication:
  - Next.js middleware (`src/proxy.ts`) blocks `/admin/*` unless the Clerk session metadata role is `admin`.
  - Convex `ctx.auth.getUserIdentity()` ensures mutations like `votePoll`, `create`, `update`, `remove`, and `archive` are only called by authenticated users.
- UI state (dismissed headers, active poll modals, etc.) is stored client-side, often persisted to `localStorage`.

## Getting Started

### Prerequisites

- Node.js ≥ 18.18 (Next.js 16 requirement).
- npm 9+ (or pnpm/bun/yarn if you prefer).
- Clerk application (publishable + secret keys, JWT issuer).
- Convex deployment (either hosted or local `npx convex dev`).

### Installation

```bash
git clone <repo-url>
cd bespick
npm install
```

### Environment Variables

Duplicate `.env.example` to `.env.local` and populate:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Frontend key from your Clerk instance. |
| `CLERK_SECRET_KEY` | Server-side Clerk secret. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` / `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Routes for auth flows (defaults already match `/sign-*`). |
| `CLERK_JWT_ISSUER_DOMAIN` | Issuer domain for JWT templates (used by Convex). |
| `CONVEX_DEPLOYMENT` | Convex deployment identifier (e.g., `dev:my-team`). Required for CLI commands. |
| `NEXT_PUBLIC_CONVEX_URL` | Public endpoint of your Convex deployment (e.g., `https://<slug>.convex.site`). |

### Run the app locally

1. **Start Convex**  
   - Remote deployment: ensure `NEXT_PUBLIC_CONVEX_URL` points to it and you are logged in via `npx convex login`.  
   - Local deployment: run `npx convex dev` in a separate terminal; it prints a `CONVEX_URL` to use for `NEXT_PUBLIC_CONVEX_URL`.
2. **Boot Next.js**  

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Clerk-hosted auth pages will be proxied automatically.
3. **Optional linting/type checks**  

   ```bash
   npm run lint
   ```

### Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server with React Fast Refresh. |
| `npm run build` | Production build output in `.next`. |
| `npm run start` | Run the production build locally. |
| `npm run lint` | ESLint (includes React, TypeScript, and hook rules). |
| `npx convex dev` | Local Convex backend (also regenerates `convex/_generated/*`). |

## Directory Layout

```text"
bespick/
├─ convex/                # Convex schema + serverless functions
│  ├─ _generated/         # Auto-generated Convex client bindings
│  ├─ announcements.ts    # All queries/mutations for activities & votes
│  └─ schema.ts           # Data model definition
├─ src/
│  ├─ app/                # Next.js App Router routes
│  │  ├─ dashboard/       # Main feed
│  │  ├─ archive/         # Archive view
│  │  └─ admin/           # Create, scheduled, roster pages
│  ├─ components/         # Shared UI (forms, poll modal, headers, etc.)
│  ├─ server/             # Server actions (role updates, auth helpers)
│  └─ types/              # Global TypeScript definitions
├─ public/                # Static assets
└─ README.md              # You are here
```

## Convex API Surface

| Function | Type | Purpose |
| --- | --- | --- |
| `announcements.create` | mutation | Create announcement/poll, validate scheduling + poll settings. |
| `announcements.update` | mutation | Edit existing activity with same validations. |
| `announcements.list` | query | Published feed filtered for dashboard. |
| `announcements.listArchived` | query | Archived activities. |
| `announcements.listScheduled` | query | Future publish queue for admins. |
| `announcements.get` | query | Fetch single activity (editing). |
| `announcements.getPoll` | query | Poll details for voters (options, totals, closures). |
| `announcements.getPollVoteBreakdown` | query | Admin-only per-option voter list. |
| `announcements.votePoll` | mutation | Cast or update a ballot; handles new options + validation. |
| `announcements.publishDue` | mutation | Promote due activities and enforce auto delete/archive. |
| `announcements.nextPublishAt` | query | Next scheduled publish timestamp (for timers). |
| `announcements.remove` | mutation | Delete an activity (and related votes). |
| `announcements.archive` | mutation | Mark an activity archived. |

Call signatures and generated hooks live in `convex/_generated/api`. Regenerate after schema changes with `npx convex dev` or `npx convex codegen`.

## Authentication & Roles

- **Clerk middleware** (`src/proxy.ts`) forces authentication for every route except `/sign-in` and `/sign-up`, and blocks `/admin/*` unless `sessionClaims.metadata.role === 'admin'`.
- **Role values** are defined in `src/types/globals.d.ts` (`'admin' | 'moderator' | ''`). Only admins currently unlock admin routes.
- **Granting roles** can be done via `/admin/roster` (which uses the `updateUserRole` server action) or directly in the Clerk dashboard by editing a user’s `publicMetadata.role`.
- **Convex enforcement**: mutations call `ctx.auth.getUserIdentity()` and error if the user is not logged in. Client routes rely on Clerk hooks (`useUser`) for conditional rendering.

## Deployment Notes

- **Next.js**: Deploy on Vercel (recommended) or any Node-compatible host. Ensure build environment has the same environment variables listed above.
- **Convex**: Use `npx convex deploy` (or the Convex dashboard) to push functions/schema. Update `CONVEX_DEPLOYMENT` to the production identifier and `NEXT_PUBLIC_CONVEX_URL` to the production endpoint.
- **Clerk**: Configure production URLs for sign-in/sign-up. Copy the live publishable + secret keys into your production environment.
- **Automation**: In production, keep the dashboard (or a scheduled job) calling `announcements.publishDue` so scheduled posts, auto-deletes, and auto-archives stay accurate. A simple approach is to configure a Vercel Cron task that hits a lightweight API route invoking the mutation at a fixed cadence.

With these pieces in place, you can onboard admins, schedule polls, and keep your team up to date through BESPICK. Contributions and refinements are welcome—open an issue or PR with your proposed improvements.
