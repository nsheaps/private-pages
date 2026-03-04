# Private Pages

Client-only web app that authenticates via GitHub OAuth, clones private repos into the browser's OPFS using isomorphic-git, and renders the repo's static site content as if it were GitHub Pages. **No backend server.**

## Architecture

**THIS IS A CLIENT-ONLY APP. THERE IS NO BACKEND SERVER.**

- `src/app/` — React SPA shell, routing, layout
- `src/auth/` — GitHub OAuth (client-side device flow or PKCE)
- `src/git/` — isomorphic-git in browser + OPFS adapter (**primary** content source)
- `src/content/` — ContentFetcher interface, GitHub API fallback, path resolution
- `src/renderer/` — Render fetched HTML in sandboxed iframe, asset interception
- `src/storage/` — OPFS, IndexedDB, Cache API helpers
- `src/sw/` — Service Worker (intercepts iframe requests, serves from OPFS)
- `src/config/` — App config (Zod schema, loader)
- `src/ui/` — Shared React components
- `src/actions/` — GitHub Actions (not part of SPA bundle)

**Content fetching priority:** local OPFS clone (isomorphic-git) → GitHub API. Always local first.

Key interfaces: ContentFetcher, GitClient, OpfsAdapter, AuthProvider, PageRenderer, LinkInterceptor.

## Key Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run validate` | Lint + typecheck + test |
| `npm run build` | Production build (SPA + SW) |
| `npm run build:sw` | Build Service Worker only |
| `npm run test` | All Vitest tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type checking |

## Code Conventions

- **TypeScript strict** — no `any`, no `@ts-ignore`
- **Commit convention:** `<type>(<scope>): <description>`
  - Types: feat, fix, refactor, test, docs, chore, ci
  - Scopes: app, auth, git, content, renderer, storage, sw, ui, config, actions
- **No server-side code** — no express, hono, fastify, http.createServer, node:fs, node:path
- **isomorphic-git** uses `isomorphic-git/http/web` (not `/http/node`)
- **OPFS** is the persistent storage layer — the bare clone IS the cache
- **Token encryption:** SubtleCrypto AES-GCM, key in OPFS, token in IndexedDB
- **Web Locks** for concurrent tab safety
- **Keep bundle size small** — no server-side deps in client bundle
