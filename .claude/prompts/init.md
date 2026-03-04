Read the full spec in `init.md` at the repo root.

THIS IS A CLIENT-ONLY APP — NO BACKEND SERVER. Everything runs in the browser.
- isomorphic-git in the browser with OPFS for persistent git clone storage
- GitHub OAuth (device flow preferred) for authentication
- Service Worker intercepts rendered page asset requests, serves from OPFS
- React SPA shell with Vite build

Key rules:
- No server-side Node.js code (no express, hono, fastify, http.createServer, node:fs, node:path)
- isomorphic-git uses `isomorphic-git/http/web` (not `/http/node`)
- TypeScript strict, no `any`, no `@ts-ignore`
- OPFS is the persistent cache — the bare clone IS the cache
- Token encryption: SubtleCrypto AES-GCM, key in OPFS, token in IndexedDB
