# TLM Rule Repository — Frontend

Admin console for the [TLM Rule Repository backend](https://github.com/rehansmile18/rulerepo): a
web UI for authoring compliance policies, bundling them into rule groups, assigning them to a
workforce population, and resolving *"which rules apply to this worker on this date?"*.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · TanStack Query**.

## Features

- **JWT auth** with a persisted session and role-aware navigation (`PLATFORM_ADMIN`, `CLIENT_ADMIN`, `VIEWER`).
- **Policies** — list with filters (type/scope/state/status), create/edit with a **dynamic per-type
  rules form driven by the backend's `/policy-types` JSON schema**, full version history, and the
  maker-checker lifecycle (submit → approve/reject, publish, archive, clone).
- **Rule Groups** — build named bundles of policies with per-policy version pinning, versioning,
  publish/archive.
- **Assignments** — bind rule groups to employee / paygroup / location / department / state
  populations, plus the **Resolve** screen (the payoff query showing the winning rule group and
  fully expanded, effective-dated policies).
- **Clients / Users / Audit logs** — admin-gated management screens.
- Light/dark theme, toasts, and loading/empty/error states throughout.

## Prerequisites

- Node.js 20+
- The **backend API running** (default `http://localhost:4000`). See the backend repo for setup —
  in short: `npm install && npm run seed && npm run dev` (or `docker compose up`).

## Getting started

```bash
npm install
npm run dev    # http://localhost:3000
```

By default the app talks to `http://localhost:4000/api/v1`. To point elsewhere, create
`.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Open http://localhost:3000 and sign in with a backend account (e.g. the one created by the
backend's `npm run seed`, or a demo account if you seeded demo data).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000/api/v1` | Base URL of the backend API |

The backend allows all CORS origins by default in development, so the dev server on port 3000 can
call it without extra config. In production, set the backend's `CORS_ORIGIN` to this app's origin.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Lint with ESLint |

## Project structure

```
src/
  app/
    layout.tsx            root layout + providers (Query, theme, auth, toaster)
    login/                sign-in page
    (app)/                authenticated app shell (sidebar + topbar), route-guarded
      dashboard/ policies/ rule-groups/ assignments/ resolve/ clients/ users/ audit-logs/
  components/
    app-shell/            sidebar, topbar, theme toggle
    policies/             policy form + dynamic JSON-schema rules editor + read-only rules view
    rule-groups/          rule-group builder dialog
    assignments/          assignment form dialog
    ui/                   shadcn/ui components (+ a native <select> wrapper)
  lib/
    api.ts                typed fetch client with JWT + error normalization
    resources.ts          one function per backend endpoint
    auth.tsx              auth context + role helpers (useSyncExternalStore over the token store)
    auth-store.ts         localStorage session persistence
    types.ts              domain types mirrored from the backend
    hooks.ts / query-keys.ts / format.ts
```

## How it maps to the backend

Every screen is a thin, typed client over the backend's REST API (`src/lib/resources.ts`). Tenant
isolation, maker-checker separation, and effective-dated versioning are enforced server-side; the
UI surfaces the right actions per role and shows server validation/authorization errors as toasts.

## Notes

- This is an internal admin tool; it assumes a trusted operator and relies on the backend for all
  authorization. The JWT is stored in `localStorage` for session persistence.
- The policy authoring form is generated from the backend's JSON rules schema, so new policy types
  added on the backend appear automatically without frontend changes.
