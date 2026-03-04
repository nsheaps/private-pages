# Private Pages

Client-only GitHub Pages for private repos. No backend server required.

Private Pages is a static SPA that authenticates users via GitHub OAuth, clones private repos into the browser using [isomorphic-git](https://isomorphic-git.org/) + [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system), and renders the repo's static site content as if it were served by GitHub Pages.

## How It Works

1. **Authenticate** — Sign in with GitHub (device flow or PKCE, entirely client-side)
2. **Clone** — The app clones your private repo into the browser's Origin Private File System (OPFS) using isomorphic-git
3. **Serve** — A Service Worker intercepts page requests and serves files from the local OPFS clone
4. **Update** — On return visits, only deltas are fetched via `git fetch`

## Features

- No backend server — everything runs in the browser
- Persistent storage via OPFS (survives page refreshes)
- Incremental updates via git fetch (only downloads changes)
- Service Worker for instant page loads after initial clone
- Works offline for previously-cloned repos
- Reusable GitHub Actions for deploying content

## Quick Start

```bash
npm install
npm run dev
```

## Development

```bash
npm run dev          # Vite dev server with HMR
npm run validate     # Lint + typecheck + test
npm run build        # Production build (SPA + SW)
npm run test         # Run all tests
npm run test:e2e     # Playwright E2E tests
```

## Tech Stack

- **TypeScript** (strict) + **React** + **Vite**
- **isomorphic-git** — Git client running in the browser
- **OPFS** — Origin Private File System for persistent bare clone storage
- **Service Worker** — Intercepts requests, serves files from OPFS
- **IndexedDB** — Token storage, repo metadata
- **Zod** — Configuration validation

## Configuration

Configure via environment variables, a JSON config file, or URL query parameters:

```
?repo=owner/repo&branch=main&dir=build/
```

Or via config file:

```json
{
  "github": {
    "clientId": "Iv1.abc123",
    "authMode": "device-flow"
  },
  "sites": [
    {
      "path": "/docs",
      "repo": "myorg/internal-docs",
      "branch": "main",
      "directory": "build/",
      "fetchTtlSeconds": 60
    }
  ]
}
```

## License

See [LICENSE](LICENSE).
