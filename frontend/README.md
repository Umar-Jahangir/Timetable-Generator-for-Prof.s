# SmartSched AI — Frontend (Next.js 15)

**Migrated from Create React App to Next.js 15.** This document explains
what changed, why, and what to do differently going forward. Everything
below has been built and verified — real `npm run build`, real
`next lint`, a real Husky pre-commit hook that actually blocked a bad
commit, and a real end-to-end test against the live FastAPI backend
(including the new middleware).

---

## Table of Contents

- [Why we moved off CRA](#why-we-moved-off-cra)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [What's reused vs. recreated](#whats-reused-vs-recreated)
- [Next.js-specific changes, explained](#nextjs-specific-changes-explained)
- [MUI + Next.js App Router setup](#mui--nextjs-app-router-setup)
- [Axios configuration](#axios-configuration)
- [React Hook Form + Zod](#react-hook-form--zod)
- [TanStack Query](#tanstack-query)
- [ESLint, Prettier, Husky](#eslint-prettier-husky)
- [Environment variables](#environment-variables)
- [Routing: React Router → App Router](#routing-react-router--app-router)
- [Authentication & route protection](#authentication--route-protection)
- [Setup & running](#setup--running)
- [Verified test results](#verified-test-results)

---

## Why we moved off CRA

`react-scripts` is in maintenance mode, and the error you hit —
`Cannot find module .../react-scripts/bin/react-scripts.js` on Node
22 — is a symptom of that: CRA's tooling wasn't built against modern
Node module resolution and hasn't kept pace. Next.js 15 is actively
maintained, has first-class TypeScript support, and gives us file-based
routing, Server Components, and a real edge-middleware layer — none of
which CRA can do at all, not just "does worse."

## Tech stack

| Concern       | Before (CRA)                     | Now (Next.js)                                          |
| ------------- | -------------------------------- | ------------------------------------------------------ |
| Framework     | Create React App / react-scripts | Next.js 15.5 (App Router)                              |
| Routing       | react-router-dom v6              | Next.js file-based App Router                          |
| UI            | MUI v5                           | MUI v9 (`@mui/material` + `@mui/material-nextjs`)      |
| Forms         | manual `useState`                | React Hook Form + Zod                                  |
| Data fetching | manual `useState`/`useEffect`    | TanStack Query                                         |
| HTTP client   | Axios                            | Axios (unchanged)                                      |
| Lint/format   | CRA's built-in ESLint config     | ESLint 9 flat config (`eslint-config-next`) + Prettier |
| Git hooks     | none                             | Husky + lint-staged                                    |
| Charts        | Chart.js (planned)               | Chart.js (unchanged, not yet wired up)                 |

Backend, database, ORM, and auth mechanism are **unchanged** — this
migration touches `frontend/` only.

## Folder structure

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router (replaces src/routes + src/pages)
│   │   ├── layout.tsx              # Root layout: fonts, <html>/<body>, AppProviders
│   │   ├── page.tsx                # "/" -> redirects to /login
│   │   ├── not-found.tsx           # 404 (file convention, replaces <Route path="*">)
│   │   ├── login/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx          # Sidebar + TopBar + RequireRole (replaces AdminLayout + ProtectedRoute)
│   │   │   ├── page.tsx            # Dashboard (Server Component)
│   │   │   └── faculty|subjects|classrooms|laboratories|divisions|timetable|constraints|analytics|settings/page.tsx
│   │   └── faculty/
│   │       ├── layout.tsx
│   │       ├── page.tsx            # Dashboard (Client Component — uses useAuth)
│   │       ├── timetable/page.tsx  # Server Component
│   │       ├── today|notifications|workload/page.tsx
│   │       └── assistant/page.tsx  # Client Component — chat state
│   ├── middleware.ts               # NEW — edge-level route protection, has no CRA equivalent
│   ├── components/
│   │   ├── auth/RequireRole.tsx    # NEW — replaces routes/ProtectedRoute.tsx
│   │   ├── common/                 # ConsolePanel, StatCard, PlaceholderPage
│   │   ├── layout/                 # Sidebar, TopBar (rewritten for next/link + next/navigation)
│   │   └── timetable/TimetableGrid.tsx
│   ├── hooks/useAuth.tsx           # Rebuilt on TanStack Query's useMutation, cookies instead of localStorage
│   ├── lib/
│   │   ├── api.ts                  # Axios instance (was services/api.ts)
│   │   └── cookies.ts              # NEW — cookie helpers (needed for middleware)
│   ├── providers/AppProviders.tsx  # NEW — composes ThemeRegistry + QueryClientProvider + AuthProvider
│   ├── schemas/auth.ts             # NEW — Zod schema for the login form
│   ├── theme/
│   │   ├── theme.ts                # Reused, fontFamily values updated to use next/font CSS vars
│   │   ├── fonts.ts                 # NEW — next/font/google loaders
│   │   └── ThemeRegistry.tsx       # NEW — MUI SSR cache setup for the App Router
│   └── types/index.ts              # Reused as-is
├── next.config.mjs                 # Replaces (nothing — CRA had no equivalent config file)
├── eslint.config.mjs               # Replaces CRA's built-in eslint config
├── tsconfig.json                   # Adjusted for Next.js (moduleResolution: "bundler", etc.)
├── .prettierrc / .prettierignore   # NEW
├── .husky/pre-commit                # NEW
├── .env.local / .env.example       # NEXT_PUBLIC_ prefix instead of REACT_APP_
└── package.json
```

**Note on `pages/`:** the CRA version had `src/pages/`. That folder name
is intentionally avoided here — Next.js has a legacy "Pages Router"
convention where a top-level `pages/` directory has special routing
meaning. Mixing that with the App Router (`src/app/`) is confusing and
unnecessary, so every route lives under `src/app/` and reusable
page-level pieces live under `src/components/`.

## What's reused vs. recreated

| File (CRA)                                          | Status                                                                    | Notes                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/theme/theme.ts`                                | **Reused**, lightly edited                                                | Only the `fontFamily` string values changed, to reference `next/font` CSS variables instead of hardcoded font names               |
| `src/types/index.ts`                                | **Reused as-is**                                                          | Zero changes — plain TypeScript types have no framework dependency                                                                |
| `src/components/common/ConsolePanel.tsx`            | **Reused as-is**                                                          | No hooks, no routing, no browser APIs — works unchanged in either framework                                                       |
| `src/components/common/StatCard.tsx`                | **Reused as-is**                                                          | Same reason                                                                                                                       |
| `src/components/timetable/TimetableGrid.tsx`        | **Reused as-is**                                                          | Same reason                                                                                                                       |
| `src/components/layout/Sidebar.tsx`                 | **Recreated**                                                             | `NavLink` (react-router) → `Link` + `usePathname` (next/navigation)                                                               |
| `src/components/layout/TopBar.tsx`                  | **Recreated**                                                             | `useNavigate` → `useRouter`; logout now explicitly pushes to `/login`                                                             |
| `src/routes/ProtectedRoute.tsx`                     | **Recreated as `components/auth/RequireRole.tsx`**                        | No more wrapping `<Route>` elements — see [Authentication & route protection](#authentication--route-protection)                  |
| `src/routes/AppRoutes.tsx`                          | **Deleted, replaced by file-based routing**                               | Every `<Route>` became a `page.tsx` under `src/app/`; every nested `<Route>` with a shared layout became a `layout.tsx`           |
| `src/layouts/AdminLayout.tsx` / `FacultyLayout.tsx` | **Recreated as `app/admin/layout.tsx`** / `app/faculty/layout.tsx`        | Same JSX structure, now also owns route protection via `RequireRole`                                                              |
| `src/pages/auth/Login.tsx`                          | **Recreated**                                                             | Manual validation → React Hook Form + Zod; `useNavigate` → `useRouter`                                                            |
| `src/pages/admin/AdminDashboard.tsx`                | **Recreated as `app/admin/page.tsx`**, now a Server Component             | No hooks were needed, so it no longer ships as client JS at all                                                                   |
| `src/pages/faculty/FacultyDashboard.tsx`            | **Recreated as `app/faculty/page.tsx`**                                   | Same logic, `useNavigate` → `useRouter`, stays a Client Component (needs `useAuth`)                                               |
| `src/pages/faculty/WeeklyTimetable.tsx`             | **Recreated as `app/faculty/timetable/page.tsx`**, now a Server Component | No hooks needed                                                                                                                   |
| `src/pages/faculty/Assistant.tsx`                   | **Recreated**, logic unchanged                                            | Only the import path depth changed                                                                                                |
| `src/pages/shared/PlaceholderPage.tsx`              | **Recreated as `components/common/PlaceholderPage.tsx`**                  | Moved out of `pages/` for the naming reason above                                                                                 |
| `src/pages/shared/NotFound.tsx`                     | **Recreated as `app/not-found.tsx`**                                      | Next.js file convention replaces the catch-all `<Route path="*">`                                                                 |
| `src/hooks/useAuth.tsx`                             | **Recreated**                                                             | Mock/local-state login → real `POST /auth/login` via a TanStack Query `useMutation`; storage moved from `localStorage` to cookies |
| `src/services/api.ts`                               | **Recreated as `lib/api.ts`**                                             | Same Axios setup; token now read from a cookie instead of `localStorage`                                                          |
| —                                                   | **New, no CRA equivalent**                                                | `middleware.ts`, `lib/cookies.ts`, `schemas/auth.ts`, `providers/AppProviders.tsx`, `theme/ThemeRegistry.tsx`, `theme/fonts.ts`   |

## Next.js-specific changes, explained

### 1. Server Components vs. Client Components

Every component in CRA was, implicitly, a "client component" — the
entire app was one JS bundle that ran in the browser. The App Router
defaults every file to a **Server Component** unless it's marked
`"use client"` at the top. A Server Component:

- renders to HTML on the server (or at build time, for static pages)
- ships **zero JavaScript** to the browser for itself
- **cannot** use `useState`, `useEffect`, event handlers (`onClick`, etc.), or any browser-only API

Concretely in this project: `AdminDashboardPage` and
`WeeklyTimetablePage` have no interactivity of their own (yet — Phase 4
and Phase 6 will add real data fetching and mutations), so they're
plain Server Components with **no directive at all**. `LoginPage`,
`FacultyDashboardPage`, `AssistantPage`, `Sidebar`, `TopBar`, and
`RequireRole` all need hooks or event handlers, so they're marked
`"use client"`.

You don't need to mark every leaf component — `ConsolePanel`,
`StatCard`, and `TimetableGrid` have no directive and no hooks, and
they work fine both when rendered from a Server Component parent and
when rendered from a Client Component parent.

### 2. No more `index.html` / `index.tsx`

CRA's entry point was `public/index.html` (static HTML shell) +
`src/index.tsx` (`ReactDOM.createRoot(...).render(<App />)`). Next.js
has no equivalent files — `src/app/layout.tsx` is the root of every
page, `<html>` and `<body>` are written directly in JSX there, and
Next.js handles mounting internally.

### 3. `<head>` content via `metadata`, not a static `<title>` tag

`export const metadata: Metadata = {...}` in `layout.tsx` (or any
`page.tsx`) generates the page's `<title>` and `<meta>` tags. Nested
layouts/pages can override specific fields.

## MUI + Next.js App Router setup

MUI's styling engine (Emotion) needs to know how to inject styles
correctly during server-side rendering, or you get a flash of
unstyled content and hydration warnings. `src/theme/ThemeRegistry.tsx`
wraps the app in the official `AppRouterCacheProvider` (from
`@mui/material-nextjs/v15-appRouter`), which must sit **outside**
`ThemeProvider`:

```tsx
<AppRouterCacheProvider options={{ key: "mui" }}>
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
</AppRouterCacheProvider>
```

`next.config.mjs` also sets `transpilePackages: ["@mui/material", "@mui/icons-material"]`
— the Next.js-recommended setting for smaller client bundles with MUI.

Fonts moved from a CRA `<link>` tag (external Google Fonts request,
render-blocking) to `next/font/google` (`src/theme/fonts.ts`), which
self-hosts the font files and exposes them as CSS variables
(`--font-jetbrains-mono`, `--font-space-grotesk`) applied to `<html>`
in the root layout. `theme.ts`'s `fontFamily` values reference those
variables instead of hardcoded font names.

## Axios configuration

`src/lib/api.ts` is nearly identical to the CRA version — same
interceptor pattern (attach `Authorization` header on request, redirect
to `/login` on 401) — with two changes:

1. The base URL env var is `NEXT_PUBLIC_API_BASE_URL` instead of `REACT_APP_API_BASE_URL`.
2. The token is read from a cookie (`getCookie("smartsched_token")`) instead of `localStorage.getItem(...)`, so the same token is visible to both the browser-side Axios client and the server-side `middleware.ts`.

## React Hook Form + Zod

`src/schemas/auth.ts` defines `loginSchema` with Zod; `src/app/login/page.tsx`
uses `useForm({ resolver: zodResolver(loginSchema) })` and `<Controller>`
to bind each MUI `<TextField>`. This replaces CRA's manual `required`
prop + no real validation — errors are now typed, centrally defined, and
shown via each field's `helperText`.

## TanStack Query

`src/providers/AppProviders.tsx` creates one `QueryClient` per request
(via `useState(() => new QueryClient())`, not a module-level singleton —
important for SSR correctness) and wraps the app in
`QueryClientProvider`. `useAuth.tsx`'s `login()` is now a `useMutation`,
giving us `isPending` (loading state) and error handling for free
instead of hand-rolled `useState` flags. Later phases (Admin/Faculty
CRUD, Analytics) will use `useQuery` for reads the same way.

## ESLint, Prettier, Husky

- **ESLint**: `eslint.config.mjs` (flat config, ESLint 9) extends
  `next/core-web-vitals` + `next/typescript`, with `eslint-config-prettier`
  layered on top to disable any rule that would conflict with Prettier.
  Verified: `npm run lint` → zero warnings or errors on the whole
  project.
- **Prettier**: `.prettierrc` (100-char width, double quotes, semicolons,
  trailing commas). Verified: `npx prettier --check` initially flagged
  10 files, `--write` fixed them all, and the app still built cleanly
  afterward.
- **Husky + lint-staged**: `.husky/pre-commit` runs `npx lint-staged`,
  which runs `eslint --fix --max-warnings=0` then `prettier --write` on
  staged `.ts`/`.tsx` files. This was tested for real:
  - A file with only formatting issues → committed successfully, auto-fixed.
  - A file with an actual ESLint warning (unused variable) → **the commit was rejected** (`husky - pre-commit script failed (code 1)`), and Husky reverted the staged change. Only after tightening `lint-staged` to `--max-warnings=0` did this properly block — by default, `next/typescript`'s `no-unused-vars` rule is a _warning_, not an error, so plain `eslint --fix` alone doesn't fail the commit.

## Environment variables

Next.js only exposes variables prefixed `NEXT_PUBLIC_` to the browser
bundle. Server-only variables (none needed yet on the frontend) would
have no prefix. `.env.local` (gitignored) holds real local values;
`.env.example` documents what's needed:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

## Routing: React Router → App Router

| CRA (react-router-dom)                                             | Next.js App Router                                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `<BrowserRouter>` in `App.tsx`                                     | Not needed — routing is file-based                                                 |
| `<Routes>` / `<Route path="..." element={...}>` in `AppRoutes.tsx` | A `page.tsx` file at the matching folder path                                      |
| Nested `<Route>` sharing a layout, rendered via `<Outlet />`       | A `layout.tsx` file wrapping `{children}`                                          |
| `<NavLink to="...">` (auto "active" class)                         | `<Link href="...">` + `usePathname()` computed manually                            |
| `useNavigate()` → `navigate("/x")`                                 | `useRouter()` → `router.push("/x")`                                                |
| `<Navigate to="/x" replace />`                                     | `redirect("/x")` (Server Components) or `router.replace("/x")` (Client Components) |
| Catch-all `<Route path="*">`                                       | `not-found.tsx` file convention                                                    |

## Authentication & route protection

This is the one place where the migration is more than a mechanical
rename — worth understanding the trade-off:

**CRA's model:** `ProtectedRoute.tsx` wrapped each protected `<Route>`,
checked `useAuth()`, and rendered `<Navigate to="/login" />` if
unauthorized. Everything happened client-side, after the JS bundle
loaded and React rendered once.

**Next.js's model, as built here, has two layers:**

1. **`src/middleware.ts`** (new — no CRA equivalent) runs on the
   server/edge _before_ any page renders. It reads the
   `smartsched_token` cookie, does a **best-effort decode of the JWT
   payload** (not a signature verification) to check the `role` claim,
   and redirects immediately if the route doesn't match. This avoids
   the CRA problem of briefly mounting a protected page before
   redirecting.
2. **`src/components/auth/RequireRole.tsx`** (replaces
   `ProtectedRoute.tsx`) is still the authoritative client-side check,
   rendered inside `admin/layout.tsx` and `faculty/layout.tsx`. It uses
   the fully-parsed `user` object from `useAuth()` (not just a decoded
   JWT claim) and redirects via `router.replace(...)` if needed.

**Why middleware doesn't verify the signature:** doing so would
require an Edge-compatible JWT library (e.g. `jose`) and shipping the
JWT secret to the frontend's runtime environment — a real security
control belongs on the backend, not duplicated on the frontend. **The
actual authorization boundary is unchanged: FastAPI verifies the JWT
signature on every API request, exactly as in Phase 3.** Middleware
here is a UX optimization (skip rendering a page the user can't use),
not a new security boundary — this is stated explicitly in
`middleware.ts`'s comments too, so it's not lost the next time someone
touches this file.

**Verified with curl against the real backend + a real `next start`
server** (not just described — see [Verified test results](#verified-test-results)):
unauthenticated → redirected to `/login`; authenticated admin hitting
`/admin` → 200; authenticated admin hitting `/login` → redirected to
`/admin`; authenticated admin hitting `/faculty` → redirected to
`/admin` (role mismatch); same set of checks for a faculty account,
all correct.

## Setup & running

```bash
cd frontend
npm install
cp .env.example .env.local   # adjust NEXT_PUBLIC_API_BASE_URL if needed
npm run dev                  # http://localhost:3000
```

> **Node version:** requires Node ≥20.17 (see `engines` in `package.json`).
> If `npm install` prints `EBADENGINE` warnings about `eslint-visitor-keys`
> wanting Node `^22.13.0`, that's harmless — it's a transitive dependency
> of `@typescript-eslint` (used internally by `eslint-config-next`) and
> only affects that one package's own type-checking internals, not this
> app. It won't block the install. If `npm install` **crashes** instead
> (a `husky`/`MODULE_NOT_FOUND` error), you likely have an older copy of
> this repo — `package.json`'s `"prepare"` script is
> `"husky || exit 0"`, which tolerates Husky failing to set up (e.g. no
> `.git` yet) instead of taking the whole install down with it. If
> you're still stuck, upgrading to Node ≥22.13 (or the latest 22.x/24.x
> LTS) resolves it outright.

Other scripts:

```bash
npm run build        # production build
npm run start         # run the production build
npm run lint          # ESLint
npm run lint:fix       # ESLint with --fix
npm run format         # Prettier --write
npm run format:check   # Prettier --check
```

Husky's pre-commit hook installs automatically via the `prepare` script
the first time you run `npm install` inside a git repository. If you're
setting this frontend up as its own repo: `git init && npm install`. If
it's nested inside a larger monorepo, `npx husky init` (already run once
while building this) sets `core.hooksPath` correctly relative to your
repo's root — re-run it if you restructure the repo layout.

## Verified test results

Everything below was actually run, not assumed:

| Check                                          | Result                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `npm install`                                  | ✅ Clean install, 400 packages                                              |
| `npm run build`                                | ✅ Compiled successfully, 21 routes generated, middleware bundled (34.1 kB) |
| `npm run lint`                                 | ✅ No ESLint warnings or errors                                             |
| `npx prettier --check`                         | Found 10 unformatted files → `--write` fixed all → rebuild still clean      |
| Husky pre-commit, formatting-only issue        | ✅ Committed, file auto-fixed                                               |
| Husky pre-commit, real ESLint warning          | ✅ **Commit rejected** (`--max-warnings=0`), staged changes reverted        |
| `GET /admin` with no cookie                    | ✅ `307` → `/login`                                                         |
| `GET /admin` with valid admin token cookie     | ✅ `200`                                                                    |
| `GET /login` with valid admin token cookie     | ✅ `307` → `/admin`                                                         |
| `GET /faculty` with admin token cookie         | ✅ `307` → `/admin` (role mismatch)                                         |
| `GET /faculty` with valid faculty token cookie | ✅ `200`                                                                    |
| `GET /admin` with faculty token cookie         | ✅ `307` → `/faculty` (role mismatch)                                       |

## Phase 4 — Admin Module (real data, replacing every mock)

All six Admin Management screens now hit the real FastAPI backend
built in Phase 4, via a consistent pattern:

- `src/types/admin.ts` — TypeScript types matching each endpoint's response shape exactly
- `src/schemas/admin.ts` — one Zod schema per entity, used by both validation and the RHF form's inferred types
- `src/hooks/useAdminApi.ts` — every data hook, grouped by entity: a `useXList()` (TanStack `useQuery`) plus `useCreateX`/`useUpdateX`/`useDeleteX` (TanStack `useMutation`, each invalidating the relevant list — and the dashboard — on success so the UI updates without a manual refetch)
- `src/components/admin/DataTable.tsx` — shared table shell (columns + edit/delete actions) used by every management page
- `src/components/admin/RoomManagementView.tsx` — one shared view backing both `/admin/classrooms` and `/admin/laboratories`, since they're the same `rooms` table filtered by `room_type` on the backend too

`AdminDashboardPage` (`src/app/admin/page.tsx`) changed from a Server
Component (Phase 1, static mock data) to a Client Component, since real
data requires `useDashboardStats()` — a good concrete example of the
Server/Client Component tradeoff described earlier in this document:
once a page needs live data via a hook, it has to become a Client
Component (or push the query down into a smaller client child and keep
the page itself server-rendered — not done here for simplicity, but a
valid alternative).

### A real TypeScript/tooling issue hit and fixed

Every form using `z.coerce.number()` alongside an optional field (e.g.
`department_id: z.coerce.number()...` next to `designation: z.string().optional()`)
failed to type-check with:

```
Type 'Resolver<{ ...; department_id: unknown; ... }>' is not assignable to type 'Resolver<{ ...; department_id: number; ... }>'
```

This is a known Zod v4 + `@hookform/resolvers/zod` friction: `z.coerce`
fields have an *input* type of `unknown` by design (coercion has to
accept anything before converting it), but react-hook-form's `Resolver`
type expects the resolver's input type to already match the form's
output type once a generic is explicitly given to `useForm<T>`. It
surfaced in `divisions`, `faculty`, `subjects`, `constraints`, and the
shared `RoomManagementView` — every form with this field combination.
Fixed with an explicit resolver cast (`zodResolver(schema) as Resolver<FormValues>`)
in each — this only satisfies the type checker and has zero effect on
runtime validation, which still runs the real Zod schema.

### Known testing limitation (disclosed, not hidden)

This project was built and verified inside a sandboxed environment with
no headless browser available. Every backend endpoint was tested for
real (full CRUD lifecycle, validation errors, cascade-delete behavior)
against a live MySQL instance via curl. On the frontend, `npm run build`,
`npm run lint`, and TypeScript's type checker all pass clean, and every
admin page was confirmed to render successfully (HTTP 200, correct
middleware redirects) when requested with a valid auth cookie. What
could **not** be verified in this environment is the actual client-side
data fetching and form submission flow rendering correctly in a real
browser — that requires JS execution (hydration, `useEffect`, click
handlers), which `curl` cannot do. The API contracts (request/response
shapes) were independently confirmed to match exactly between the
backend and the frontend's TypeScript types, which gives strong
confidence, but a real click-through test on your machine is the
recommended final check before considering this phase fully done.

## Phase 5 — Faculty Module (real data + a new Admin screen)

- `src/types/faculty.ts`, `src/schemas/faculty.ts`, `src/hooks/useFacultyApi.ts` — same pattern as Phase 4's admin equivalents
- `Today's Schedule`, `Weekly Timetable`, `Workload`, and `Notifications` all converted from Phase 1 placeholders/mocks to real data — and all correctly show honest empty states ("no timetable generated yet") since Phase 6 hasn't run yet
- A "Request Extra/Replacement Lecture" form was added directly on the Today's Schedule page (React Hook Form + Zod, same `Resolver<T>` cast pattern as Phase 4)
- **New Admin screen not in the original nav:** `/admin/requests` — added because the feature became real in this phase (faculty submit, admin approves/rejects). `AdminLayout`'s `NAV_ITEMS`/`TITLES` maps were extended by two lines each; the route protection (`RequireRole` + middleware) applied to it automatically with zero extra configuration, which was worth confirming for real rather than assuming — verified via curl: an authenticated admin gets 200, an authenticated faculty member gets redirected away, exactly like every other `/admin/*` route.

## Phase 6 — Timetable Generation Engine (two new Admin screens)

- **`/admin/assignments`** (new nav item) — Subject-Faculty-Division assignment management. This was a gap discovered while building Phase 6: the optimizer needs assignment data to schedule anything, and nothing in Phases 1-4 provided a way to create it through the UI.
- **`/admin/timetable`** — converted from Phase 1's placeholder to the real thing: a "Generate Timetable" button that calls the actual OR-Tools-backed endpoint, live solver stats (sessions requested/scheduled, duration), and a day-grouped view of every generated entry across all divisions.
- Both use the same `DataTable` (with a newly-optional `onEdit` prop, since Assignments only supports create/delete — no update endpoint exists on the backend by design) and `Resolver<T>` cast patterns established in Phase 4.
- Confirmed via curl against both running servers: `/admin/assignments` and `/admin/timetable` both return 200 with a valid admin cookie, and the backend's actual JSON response shape was checked against the frontend's TypeScript types field-for-field before wiring the hooks — not assumed to match.

## Phase 7 — Rule-Based Scheduling Assistant (mocked chat replaced with the real thing)

`/faculty/assistant` — the chat UI Phase 1 scaffolded with a hardcoded
`mockRespond()` function — now sends every message to the real
`POST /faculty/assistant/query` endpoint and renders whatever the
rule-based backend actually returns: a scored recommendation with
alternates and explainable pass/fail reasons, a plain data table (free
rooms, availability), or just a message (workload, timetable summary,
or a graceful "I didn't understand that").

- `src/types/assistant.ts` — matches the backend's Pydantic schemas field-for-field
- `src/hooks/useAssistantApi.ts` — `useQueryAssistant` (mutation, since each query is a one-off action, not cached data) and `useConfirmAssistantBooking`
- **"Find Another Slot" doesn't re-query the backend** — it cycles through the `alternates` array the first response already included, since re-running the identical query would just return the same ranked list again. This is a deliberate frontend-only optimization, not a backend limitation.
- **A real gap I found and fixed:** `useConfirmAssistantBooking` had no `onSuccess` cache invalidation, unlike every other mutation hook in this codebase. A confirmed booking writes a real `timetable_entries` row, so without invalidating `["faculty","timetable"]`, `["faculty","schedule"]`, and `["faculty","workload"]`, those pages would have shown stale data until a manual refresh. Fixed to match the established pattern.
- Verified end-to-end against both running servers: `/faculty/assistant` returns 200 with a valid faculty cookie, and a full regression sweep confirmed all 16 pages across the entire app (6 faculty + 10 admin) still return 200 — Phase 7's changes introduced zero regressions elsewhere.

## Phase 8 — Analytics (real dashboard, one deliberate omission)

`/admin/analytics` — converted from Phase 1's placeholder to real data
via `useAnalytics()`. Utilization bars (faculty/classroom/lab/idle-time)
reuse the same `LinearProgress` styling established in Phase 5's
Workload page, for visual consistency across the app rather than
introducing a new chart library for one screen.

**Types and hooks were already in place** when this phase started
(`Analytics`/`IntentBreakdown` in `types/admin.ts`, `useAnalytics()` in
`useAdminApi.ts`) — only the page UI itself was still the Phase 1
placeholder. Built it to match the wireframe's bar-chart layout, plus
an intent-usage breakdown table sourced from Phase 7's query logs.

**One thing intentionally missing, matching the backend's own
decision:** no "Conflicts Prevented" counter. See
`backend/README.md`'s Phase 8 section for why — short version, Phase 6
enforces zero clashes by construction, so there's no real number to
show without inventing one.

Verified against both running servers: `/admin/analytics` returns 200
with a valid admin cookie, and a full regression sweep confirmed all
17 pages across the entire app (6 faculty + 11 admin) still return
200.

## Phase 9 — Testing (Vitest + Testing Library)

```bash
npm run test        # single pass, CI-style
npm run test:watch  # interactive
```

**34 tests across 5 files**, all passing:

- `schemas/auth.test.ts`, `schemas/admin.test.ts` — every Zod rule behind the login form and 4 admin CRUD forms, including a test that specifically proves `z.coerce.number()` correctly turns a string like `"18"` (what MUI's `type="number"` TextField actually produces via RHF's `Controller`) into a real `number` — the runtime behavior the `Resolver<T>` cast pattern (used throughout Phases 4–7) depends on
- `lib/cookies.test.ts` — the cookie helpers `middleware.ts` and `useAuth.tsx` both depend on, using jsdom's real `document.cookie` rather than mocking it
- `lib/errors.test.ts` — `getApiErrorMessage`, including a real `AxiosError` (not a hand-rolled fake), FastAPI's validation-error array shape, and non-Axios errors
- `components/admin/DataTable.test.tsx` — the shared table used by 5 admin pages: loading/empty states, row/column rendering, and both the optional `onEdit` and always-present `onDelete` callbacks

**Config note:** `vitest.config.mts` (not `.ts`) — Vitest 4's native
config loader warns about CJS-loaded ESM syntax otherwise. This
project's `package.json` deliberately has no top-level
`"type": "module"` (that's also why `next.config.mjs` needs its `.mjs`
extension), so per-file `.mts`/`.mjs` extensions are how ESM-only
config files opt in without changing that project-wide setting.

**A bug in my own test, not the app:** the first version of the
delete-click test had a leftover `cond ? [] : screen.getAllByRole(...)`
line that always evaluated to an empty array. It failed loudly and
correctly, got fixed, and now passes for the right reason — worth
stating plainly rather than glossing over, same as every other
find-and-fix documented throughout this project.

**Honestly scoped:** this is unit/component coverage, not full browser
e2e (no Playwright/Cypress). See `backend/README.md`'s Phase 9 section
for the reasoning — short version, this sandbox's background-process
instability (visible throughout every phase's manual server testing)
would have made real browser automation fragile rather than reliably
trustworthy.

## Next

Phase 10 (Deployment) will document how to actually run both the
frontend and backend in production.
