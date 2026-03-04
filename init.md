# Private Pages — Client-Only GitHub Pages for Private Repos

## 1. Project Overview

### 1.1 What We're Building

Private Pages is a **client-only web application** — there is no backend server. It is a static SPA that can itself be hosted on GitHub Pages (from a public repo), any CDN, or any static file host. When a user visits a Private Pages deployment, the app:

1. Authenticates the user via a GitHub App or GitHub OAuth App (client-side OAuth flow)
2. Uses the resulting token to **fetch files from a private GitHub repository** that the user has access to — preferring git protocol via isomorphic-git running in the browser, falling back to the GitHub API
3. Stores the fetched repository content **locally in the browser** using the Origin Private File System (OPFS) so that files persist across page loads and only deltas need to be fetched on return visits
4. **Injects the fetched static files into the browser** so that they render as if they were served by a normal GitHub Pages site — the user sees the private repo's HTML/CSS/JS/images as a regular website, except the source is a private repository

The project also provides reusable GitHub Actions to deploy privately-built static sites to branches in private repos that Private Pages can then serve. Use cases include preview environments for client-only GitHub Pages apps, and private internal documentation requiring org membership to view.

**Key mental model**: Private Pages is like a "local web server in the browser" — it clones a private repo into browser-local storage (OPFS), then acts as a virtual server that resolves URL paths to files in that local clone and renders them.

### 1.2 Core Value Proposition

GitHub Pages from private repos requires Enterprise Cloud. Private Pages gives anyone the same experience — push static content to a branch, visit a URL, see the site — but with GitHub OAuth-based access control, no backend infrastructure to manage, and no Enterprise Cloud requirement. Because it's entirely client-side, deployment is trivial: host the Private Pages SPA on GitHub Pages from a public repo and point it at your private repo.

### 1.3 Non-Goals (v1)

- No backend server — everything runs in the browser (auth, git fetch, rendering)
- No static site generator (Jekyll, Hugo, etc.) — only serves pre-built static files
- No server-side rendering or dynamic backends
- No build pipeline — content is pre-built and deployed to the private repo via GitHub Actions or git push
- No real-time collaboration or editing
- No multi-tenant SaaS platform — this is a deployable static app
- No GitHub Enterprise Server support (github.com only in v1)

### 1.4 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | TypeScript (strict) | Type safety, GitHub ecosystem alignment |
| Framework | React (or Preact for size) + Vite | SPA with fast HMR, tree-shaking, small production bundles |
| Auth | GitHub OAuth App (client-side flow) + GitHub App (optional) | Client-side device/PKCE flow for token acquisition, no backend needed |
| Git (primary) | isomorphic-git (in browser) | JS-native git client, runs in browser with OPFS backend — clones/fetches via smart HTTP, avoids API rate limits, gets full tree in one operation |
| Git auth | isomorphic-git `onAuth` + GitHub token | Token from OAuth used as HTTP basic auth for git smart HTTP to github.com |
| Git fallback | octokit-rest (browser) | Fallback when git protocol fails — GitHub Contents API / Trees API |
| Persistent storage | Origin Private File System (OPFS) | Browser-native filesystem API — persistent, fast, no size prompts, perfect as isomorphic-git's `fs` backend. Stores the full bare clone locally. |
| Fast serving | Service Worker + Cache API | SW intercepts page navigation, serves files from OPFS/cache. Near-instant page loads after initial clone. |
| Metadata | IndexedDB | Stores repo state, manifests, auth tokens (encrypted), user preferences |
| Build | Vite | Fast dev server, optimized production builds, SW plugin support |
| Test | Vitest + @testing-library/react + Playwright | Unit, component, and E2E browser tests |
| CI/CD | GitHub Actions | Dogfooding — deploy the Private Pages SPA itself via GitHub Pages |
| Package | npm (library) + GitHub Pages (hosted app) | Reusable as a library, deployable as a static site |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                  Browser                                          │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐    │
│  │                        Private Pages SPA                                  │    │
│  │                                                                           │    │
│  │  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────────────┐  │    │
│  │  │  Auth Module  │   │  Git Client       │   │  Page Renderer          │  │    │
│  │  │  (OAuth PKCE  │──▶│  (isomorphic-git  │──▶│  (resolves URL path     │  │    │
│  │  │   flow, token │   │   in browser,     │   │   → file in local repo, │  │    │
│  │  │   storage)    │   │   clones to OPFS) │   │   injects into DOM)     │  │    │
│  │  └──────────────┘   └──────────────────┘   └──────────────────────────┘  │    │
│  │         │                    │                          │                  │    │
│  │         ▼                    ▼                          ▼                  │    │
│  │  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────────────┐  │    │
│  │  │  IndexedDB    │   │  OPFS             │   │  Service Worker          │  │    │
│  │  │  (tokens,     │   │  (bare git clone, │   │  (intercepts navigation, │  │    │
│  │  │   repo meta,  │   │   full file tree, │   │   serves from OPFS,      │  │    │
│  │  │   user prefs) │   │   persists across │   │   cache-first strategy,  │  │    │
│  │  │              │   │   sessions)        │   │   background sync)       │  │    │
│  │  └──────────────┘   └──────────────────┘   └──────────────────────────┘  │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                                                                   │
│         ↕ git smart HTTP (clone/fetch)        ↕ REST API (fallback)              │
│         ↕ OAuth PKCE flow                                                         │
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              github.com                                           │
│                                                                                   │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  OAuth / GitHub App │  │  Private Repo     │  │  Git Smart HTTP endpoint     │  │
│  │  (auth token)       │  │  (source content) │  │  (clone/fetch via HTTPS)     │  │
│  └────────────────────┘  └──────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions (Reusable)                                  │
│                                                                                   │
│  ┌────────────────┐  ┌────────────────────┐  ┌────────────────────┐              │
│  │  deploy-pages   │  │  preview-deploy     │  │  deploy-app        │             │
│  │  (push content  │  │  (PR preview envs)  │  │  (deploy Private   │             │
│  │   to branch)    │  │                     │  │   Pages SPA itself)│             │
│  └────────────────┘  └────────────────────┘  └────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Structure

```
private-pages/
├── src/
│   ├── app/                     # SPA shell, routing, layout
│   │   ├── App.tsx              # Root component
│   │   ├── Router.tsx           # Client-side router (maps URL → page from repo)
│   │   ├── Layout.tsx           # Chrome around rendered pages (nav, status bar)
│   │   ├── ErrorBoundary.tsx    # Error handling UI
│   │   └── index.tsx            # Entry point, mounts app, registers SW
│   ├── auth/                    # GitHub authentication (client-side)
│   │   ├── provider.ts          # AuthProvider interface
│   │   ├── oauth-pkce.ts        # GitHub OAuth with PKCE (no backend needed)
│   │   ├── device-flow.ts       # GitHub device flow (alternative, for CLI-like UX)
│   │   ├── token-store.ts       # Store/retrieve encrypted tokens in IndexedDB
│   │   ├── github-app.ts        # GitHub App installation token (if app-based auth)
│   │   └── types.ts             # Auth types (TokenInfo, UserInfo, AuthState)
│   ├── git/                     # Git operations in the browser
│   │   ├── client.ts            # GitClient class — wraps isomorphic-git for browser
│   │   ├── clone.ts             # Clone management: bare clone to OPFS, incremental fetch
│   │   ├── read.ts              # Read files from OPFS bare repo (tree walk + blob read)
│   │   ├── opfs-fs.ts           # OPFS adapter for isomorphic-git's `fs` parameter
│   │   ├── auth-helper.ts       # isomorphic-git onAuth callback (injects GitHub token)
│   │   └── types.ts             # Git types (RepoState, CloneProgress, etc.)
│   ├── content/                 # Content resolution + fallback
│   │   ├── fetcher.ts           # ContentFetcher interface (git → API fallback)
│   │   ├── git-fetcher.ts       # GitContentFetcher — reads from local OPFS clone
│   │   ├── api-fetcher.ts       # GitHubApiFetcher — octokit Contents API (fallback)
│   │   ├── resolver.ts          # URL path → file path resolution (index.html, 404.html)
│   │   └── types.ts             # ContentResult, ResolvedFile, etc.
│   ├── renderer/                # Inject fetched content into the browser
│   │   ├── page-renderer.ts     # Takes HTML string → renders in sandboxed iframe or shadow DOM
│   │   ├── asset-interceptor.ts # Rewrites relative URLs (CSS, JS, images) to resolve from OPFS
│   │   ├── link-interceptor.ts  # Intercepts <a> clicks for client-side navigation within the site
│   │   └── types.ts             # RenderContext, AssetMap
│   ├── storage/                 # Browser storage abstractions
│   │   ├── opfs.ts              # OPFS helpers: init directory structure, read/write files, usage stats
│   │   ├── idb.ts               # IndexedDB stores: repos, auth, metadata
│   │   ├── cache-manager.ts     # Cache API management: versioned caches, cleanup
│   │   └── types.ts             # Storage types
│   ├── sw/                      # Service Worker (separate build target)
│   │   ├── sw.ts                # SW entry: install, activate, fetch intercept
│   │   ├── sw-router.ts         # Route matching: which requests to handle from OPFS
│   │   ├── sw-opfs.ts           # Read files from OPFS inside the SW context
│   │   ├── sw-sync.ts           # Background sync: check for repo updates, pull deltas
│   │   └── sw-types.ts          # SW message types (client ↔ SW communication)
│   ├── config/                  # App configuration
│   │   ├── schema.ts            # Zod schema for site config
│   │   ├── loader.ts            # Load config from URL params, query string, or config file
│   │   └── types.ts             # Config types
│   ├── ui/                      # Shared UI components
│   │   ├── LoginScreen.tsx      # OAuth login prompt
│   │   ├── LoadingScreen.tsx    # Clone/fetch progress indicator
│   │   ├── ErrorScreen.tsx      # Error display (auth failure, repo not found, etc.)
│   │   ├── UpdateBanner.tsx     # "New version available" banner
│   │   └── StatusBar.tsx        # Bottom bar: sync status, commit SHA, last updated
│   └── actions/                 # GitHub Actions source (reusable workflows)
│       ├── deploy/
│       │   └── action.yml
│       └── preview/
│           └── action.yml
├── public/                      # Static assets for the SPA itself
│   ├── index.html               # SPA shell HTML
│   └── manifest.json            # Web App Manifest (PWA add-to-homescreen)
├── test/
│   ├── unit/                    # Vitest unit tests
│   ├── integration/             # Integration tests with mocked OPFS/git
│   ├── e2e/                     # Playwright browser tests
│   └── fixtures/                # Test repos, mock responses
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml           # Deploy the Private Pages SPA itself to GitHub Pages
├── vite.config.ts               # Main app build
├── vite.config.sw.ts            # Service Worker build
├── tsconfig.json                # App TypeScript config
├── tsconfig.sw.json             # SW TypeScript config (WebWorker lib)
├── vitest.config.ts
├── playwright.config.ts
├── package.json
└── README.md
```

### 2.3 Abstraction Layers

**ContentFetcher** — Interface for fetching a file from a repo at a given ref/path. The `GitContentFetcher` (isomorphic-git reading from the local OPFS clone) is the **primary** implementation. The `GitHubApiFetcher` (octokit Contents API) is the **fallback**, used only when the git clone hasn't completed yet or git operations fail. A `FallbackContentFetcher` composes both: tries the local git clone first, falls back to API, logs which path was used.

**GitClient** — Wraps isomorphic-git for browser usage. Manages bare clones in OPFS, incremental `git fetch`, and reading files/trees from a specific commit/ref. Uses the OPFS adapter as its `fs` parameter. One OPFS directory per `<owner>/<repo>`. This is the persistent local cache — the cloned repo in OPFS IS the cache. `git fetch` only transfers deltas.

**OpfsAdapter** — Adapts the OPFS (Origin Private File System) API to the `fs`-like interface that isomorphic-git expects. isomorphic-git needs `readFile`, `writeFile`, `mkdir`, `readdir`, `stat`, `unlink`, `rmdir`, `lstat`, `symlink`, `readlink`. The OPFS `FileSystemDirectoryHandle` / `FileSystemFileHandle` / `FileSystemSyncAccessHandle` APIs are mapped to these operations.

**AuthProvider** — Interface for authenticating with GitHub. `OAuthPkceProvider` implements the client-side OAuth Authorization Code flow with PKCE (Proof Key for Code Exchange) — this is the standard way to do OAuth from a SPA without a backend secret. Tokens are stored encrypted in IndexedDB.

**PageRenderer** — Takes a resolved file (HTML content + asset map) and renders it in the browser. Uses either an iframe with `srcdoc` or a shadow DOM approach to sandbox the rendered page while still allowing asset resolution. Intercepts relative URLs in CSS/JS/images and resolves them through the ContentFetcher (which reads from the local OPFS clone).

**LinkInterceptor** — Intercepts `<a>` tag clicks within the rendered page. Internal links (within the private site) trigger client-side navigation (fetch the new page from OPFS, render it). External links navigate normally.

### 2.4 Platform Targets

- **Primary**: Modern browsers (Chrome 86+, Firefox 111+, Safari 15.2+, Edge 86+) with OPFS support
- **Deployment**: The Private Pages SPA itself is a static site — deploy to GitHub Pages (public repo), Netlify, Vercel, Cloudflare Pages, or any static host
- **PWA**: Installable via Web App Manifest + Service Worker, works offline for previously-cloned repos
- **GitHub Actions**: Reusable composite actions for deploying content to branches

---

## 3. Package Structure

Single package (not a monorepo). Two build targets: the main SPA and the Service Worker.

```
private-pages/           # Single npm package
├── src/app/             # SPA shell + routing
├── src/auth/            # GitHub OAuth (client-side PKCE)
├── src/git/             # isomorphic-git + OPFS (primary content source)
├── src/content/         # Content abstraction, API fallback, path resolution
├── src/renderer/        # Inject fetched pages into DOM (iframe/shadow DOM)
├── src/storage/         # OPFS, IndexedDB, Cache API helpers
├── src/sw/              # Service Worker (separate Vite build)
├── src/ui/              # Shared React components
├── src/config/          # App config (site mapping, repo settings)
└── src/actions/         # GitHub Actions (not part of the SPA bundle)
```

The npm package exports the core library (git client, content fetcher, auth) for programmatic use. The SPA build produces static files deployable to any host.

---

## 5. Feature Specifications

### 5.1 Feature: GitHub OAuth Authentication (Client-Side)

#### What It Does
The Private Pages SPA authenticates users via GitHub OAuth entirely in the browser — no backend server or secret is needed. After authenticating, the app has a GitHub access token that grants it permission to clone/read private repos the user can access.

#### Key Behaviors
- On first visit (no stored token), the app shows a login screen explaining what Private Pages is and prompting the user to sign in with GitHub
- Authentication uses the **OAuth Authorization Code flow with PKCE** — this is the secure client-side OAuth flow that doesn't require a client secret
- The OAuth app is configured in GitHub with the Private Pages deployment URL as the callback
- After the OAuth redirect, the app exchanges the authorization code for an access token using PKCE verification
- The token is stored **encrypted in IndexedDB** (encrypted with a key derived from a browser-generated secret stored in OPFS)
- Token scopes: `repo` (to read private repo contents via git protocol)
- On subsequent visits, the stored token is loaded and validated. If expired or revoked, the user is prompted to re-authenticate.
- Logout clears the token from IndexedDB and all repo data from OPFS

#### Technical Approach
- Use `@octokit/oauth-app` or manual fetch calls to implement the PKCE flow:
  1. Generate `code_verifier` (random 128 chars) and `code_challenge` (S256 hash of verifier)
  2. Redirect to `https://github.com/login/oauth/authorize?client_id=...&code_challenge=...&code_challenge_method=S256&scope=repo`
  3. GitHub redirects back with `?code=...`
  4. Exchange code + verifier for token via `POST https://github.com/login/oauth/access_token` (this works from the browser with a CORS proxy or GitHub App setup)
- **Note**: GitHub's OAuth token endpoint doesn't support CORS for standard OAuth Apps. Two solutions:
  - **Preferred**: Use a GitHub App with a device flow (no CORS issue, works purely client-side)
  - **Alternative**: Use a lightweight CORS proxy (e.g., Cloudflare Worker) for the token exchange only — the proxy has the client secret, but touches no user data
  - **Alternative**: Use the GitHub device flow (`https://github.com/login/device/code`) which is entirely client-side and requires no CORS proxy
- Token encryption in IndexedDB: Use `SubtleCrypto.encrypt()` (AES-GCM) with a key derived from a randomly-generated secret stored as a file in OPFS (the secret never leaves the browser)
- Token validation: On app load, make a lightweight `GET /user` call to verify the token is still valid

#### Edge Cases
- Token revocation: If the user revokes the OAuth app in GitHub settings, API/git calls fail → clear stored token, prompt re-auth
- CORS restrictions: The token exchange endpoint may need a proxy — document this clearly in setup instructions
- Private browsing / incognito: OPFS may be unavailable or non-persistent → fall back to in-memory storage with a warning that data won't persist
- Multiple GitHub accounts: Only one account at a time in v1. Switching accounts clears all stored data.

#### Acceptance Criteria
- [ ] First visit shows login screen
- [ ] Clicking "Sign in with GitHub" initiates OAuth flow (PKCE or device flow)
- [ ] After auth, token is stored encrypted in IndexedDB
- [ ] Subsequent visits auto-load the stored token without re-auth
- [ ] Expired/revoked tokens trigger re-authentication
- [ ] Logout clears token and all stored repo data

### 5.2 Feature: Git Clone & Fetch in the Browser (isomorphic-git + OPFS)

#### What It Does
After authentication, the app uses isomorphic-git running in the browser to clone private repos into the Origin Private File System (OPFS). The OPFS provides persistent, filesystem-like storage that survives page refreshes and browser restarts. On return visits, the app only needs to `git fetch` to pull new commits — not re-clone the entire repo.

#### Key Behaviors
- On first visit to a configured site, the app performs a **shallow bare clone** (`depth: 1`, `singleBranch: true`) of the private repo into OPFS at `repos/<owner>/<repo>.git/`
- Clone progress is shown in the UI (percentage, bytes transferred) via isomorphic-git's `onProgress` callback
- On subsequent visits, the app runs `git fetch` to pull only new objects (delta compression). If the branch ref hasn't changed, fetch is a no-op (near-instant).
- After clone/fetch, the app can read any file from the repo by walking the git tree and reading blobs — all from OPFS, no network calls
- Authentication for git operations: `onAuth` callback returns `{ username: 'x-access-token', password: storedToken }`
- HTTP transport: `isomorphic-git/http/web` (browser fetch-based HTTP client)
- A configurable fetch TTL controls how often the app re-fetches from origin (default: 60s). Within TTL, the app serves entirely from the local OPFS clone with zero network calls.

#### Technical Approach
- **OPFS as isomorphic-git's `fs`**: isomorphic-git accepts a `fs` parameter implementing a subset of Node's `fs` module. The `OpfsAdapter` maps OPFS APIs (`FileSystemDirectoryHandle.getFileHandle()`, `FileSystemSyncAccessHandle.read()/.write()`, etc.) to the required interface. For the main thread, use async OPFS APIs. For the SW, use sync `FileSystemSyncAccessHandle` in a dedicated worker if needed.
- **Clone**: `git.clone({ fs: opfsAdapter, http: webHttp, url: 'https://github.com/<owner>/<repo>.git', dir: '/repos/<owner>/<repo>', bare: true, singleBranch: true, ref: branch, depth: 1, onAuth, onProgress })`
- **Fetch**: `git.fetch({ fs: opfsAdapter, http: webHttp, url: ..., dir: ..., ref: branch, onAuth, onProgress })`
- **Read file**: `git.readBlob({ fs: opfsAdapter, dir: ..., oid: blobSha })` after resolving the path through `git.readTree()`
- **Repo state**: Stored in IndexedDB — `{ owner, repo, branch, lastFetchAt, headCommitSha, totalSize }`. Checked before network operations to decide if fetch is needed.
- **OPFS directory layout**:
  ```
  /private-pages/
  ├── repos/
  │   ├── myorg/
  │   │   ├── internal-docs.git/    # bare clone
  │   │   └── design-system.git/    # bare clone
  │   └── ...
  └── secrets/
      └── encryption-key            # key for token encryption
  ```

#### Edge Cases
- OPFS not available (old browser, private browsing): Fall back to in-memory `fs` (lightning-fs/memfs). Data won't persist but the app still works for the current session. Show a warning.
- OPFS quota exceeded: Check `navigator.storage.estimate()` before cloning. If low, warn user and offer to clear old repos. Request persistent storage via `navigator.storage.persist()`.
- Very large repos (>500MB): Show a warning before cloning. Consider limiting depth or using the GitHub API fallback for initial file reads while a background clone proceeds.
- Clone interrupted (tab closed, network loss): On next visit, detect partial clone (no valid HEAD ref in OPFS), delete and re-clone.
- CORS for git smart HTTP: GitHub's smart HTTP endpoint (`https://github.com/<owner>/<repo>.git/info/refs`) supports CORS for authenticated requests. The `Authorization: Basic` header (with `x-access-token:<token>`) should work from the browser.
- Concurrent access: Multiple tabs may access the same OPFS directory. Use Web Locks API (`navigator.locks.request('repo-<owner>-<repo>', ...)`) to prevent concurrent clone/fetch operations.

#### Acceptance Criteria
- [ ] First visit triggers a shallow bare clone into OPFS (visible in OPFS via DevTools)
- [ ] Clone progress is displayed in the UI
- [ ] After clone, files can be read from OPFS with zero network calls
- [ ] Subsequent visit within TTL serves entirely from OPFS (no fetch)
- [ ] After TTL, `git fetch` pulls only new objects (not a full re-clone)
- [ ] Changed content is visible immediately after fetch completes
- [ ] `navigator.locks` prevents concurrent clone/fetch across tabs
- [ ] OPFS unavailable → graceful fallback to in-memory fs with warning

### 5.3 Feature: Content Resolution & Page Rendering

#### What It Does
The app resolves URL paths to files in the local OPFS git clone and renders them in the browser, making the private repo's static site look like a normal website.

#### Key Behaviors
- The app's client-side router maps URL paths to files in the configured repo/branch/directory
- Path resolution: `/docs/guide` → try `<directory>/guide`, `<directory>/guide/index.html`, `<directory>/guide.html`
- HTML pages are rendered in a **sandboxed iframe** (`srcdoc`) or **shadow DOM** to isolate them from the Private Pages SPA shell
- Relative URLs in the rendered page (CSS `<link>`, JS `<script>`, `<img>`, etc.) are **intercepted and resolved** through the content fetcher — they read from the local OPFS clone, not the network
- Internal links (`<a href="/other-page">`) are intercepted for client-side navigation — clicking them fetches the new page from OPFS and re-renders without a full page reload
- External links navigate normally
- 404 handling: If the repo has a `404.html`, render it; otherwise, show a built-in error page
- MIME types inferred from file extensions for proper Content-Type handling

#### Technical Approach
- **Iframe rendering (preferred)**: Create an iframe with `src` pointing to a virtual URL pattern `/__pages__/<site>/<path>` that the SW intercepts and serves from OPFS. This means the rendered page's dynamic asset loading (lazy images, `import()`, `fetch()`) all work automatically.
- **Fallback (no SW)**: Use iframe `srcdoc` with blob URL rewriting — parse HTML via DOMParser, rewrite `src`/`href`/`url()` to blob URLs from OPFS reads.
- **Asset resolution**: For each asset reference: `ContentFetcher.getFile(repo, branch, resolvedPath)` → read blob from OPFS → `URL.createObjectURL(new Blob([content], { type: mimeType }))` → replace in HTML
- **Client-side router**: Hash-based or history API based. URL structure: `https://pages.example.com/#/docs/guide` or `https://pages.example.com/docs/guide`

#### Edge Cases
- JavaScript in rendered pages: Scripts execute in the iframe (by design — serves full static sites with JS). The iframe sandbox attribute controls allowed capabilities.
- Relative paths with `../`: Resolve correctly against the current page's directory in the repo
- SPA sites from repo (React/Vue apps): The rendered site's own router works within the iframe. The SW approach handles this naturally.
- Large assets (images, videos): Stream from OPFS where possible.

#### Acceptance Criteria
- [ ] Visiting `/#/docs/` renders `index.html` from the configured repo/branch/directory
- [ ] CSS, JS, and images referenced by the page load correctly from the local OPFS clone
- [ ] Internal links navigate to other pages without full page reload
- [ ] JavaScript in the rendered page executes correctly
- [ ] Path resolution handles `/`, `/index.html`, `/page`, `/page/index.html`, `/page.html`
- [ ] 404.html from the repo is rendered for missing pages
- [ ] External links navigate away from Private Pages normally

### 5.4 Feature: Service Worker for Asset Interception

#### What It Does
A Service Worker intercepts network requests originating from rendered pages (inside the iframe) and serves them from the local OPFS clone. This eliminates the need to pre-parse and rewrite HTML/CSS — the rendered page's assets "just work" because the SW transparently serves them from local storage.

#### Key Behaviors
- The SW registers on first visit and claims all clients immediately
- For requests matching a configured site's URL pattern (`/__pages__/**`), the SW:
  1. Checks if the repo is cloned in OPFS
  2. Resolves the request URL to a file path in the repo
  3. Reads the file from OPFS and returns it as a `Response` with correct `Content-Type`
- Non-matching requests (external URLs, auth endpoints) pass through to the network
- Background sync: The SW periodically checks if the repo has new commits (via a lightweight `git ls-remote` or GitHub API call). If updates are available, it notifies the page via `postMessage`.
- Cache API is used as a secondary fast cache for frequently-accessed assets

#### Technical Approach
- SW fetch handler intercepts `/__pages__/**` and calls `serveFromOpfs()`
- `serveFromOpfs()` reads the file from OPFS (via `FileSystemSyncAccessHandle` in the SW context or via isomorphic-git), constructs a `Response` with correct MIME type
- The SW and main thread coordinate via `postMessage`
- OPFS access from SW: Service Workers can access OPFS via `navigator.storage.getDirectory()`

#### Edge Cases
- SW not supported: Fall back to the blob URL rewriting approach
- OPFS not accessible from SW: Fall back to Cache API-only approach
- Stale SW: Use `skipWaiting()` + `clients.claim()`. Version the SW with a build hash.

#### Acceptance Criteria
- [ ] SW intercepts requests from the rendered iframe and serves files from OPFS
- [ ] Rendered page's CSS, JS, images load without network requests (all from OPFS via SW)
- [ ] Non-site requests pass through to the network normally
- [ ] Background sync detects new commits and notifies the page
- [ ] Browsers without SW support still work (fallback to blob URL rewriting)

### 5.5 Feature: Site Configuration

#### What It Does
The Private Pages SPA is configured to know which private repo(s) to serve and how to map URL paths to repo content.

#### Key Behaviors
- Configuration is embedded in the SPA build (via environment variables at build time) or loaded from a JSON config file at a known URL
- For simple single-site deployments, config can be passed entirely via URL query parameters: `?repo=owner/repo&branch=main&dir=build/`
- Single-site mode: root `/` maps directly to that site
- Multi-site mode: Each site has a unique path prefix. Landing page at `/` shows available sites.
- Config validated at load time with Zod.

#### Config Schema

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

#### Acceptance Criteria
- [ ] SPA loads config from build-time env vars or runtime JSON file
- [ ] URL query parameter config works for simple deployments
- [ ] Single-site mode serves content at root `/`
- [ ] Multi-site mode serves each site at its configured path prefix
- [ ] Invalid config shows a clear, actionable error page

### 5.6 Feature: GitHub Actions for Deployment

#### What It Does
Reusable GitHub Actions to deploy content to branches that Private Pages can serve, and to deploy the Private Pages SPA itself.

#### Key Behaviors
- `deploy-pages`: Commits built static files to a configurable branch in the target repo
- `preview-deploy`: On PR, deploys to `preview/pr-{number}` branch; on close, cleans up
- `deploy-app`: Deploys the Private Pages SPA to GitHub Pages from a public repo

#### Acceptance Criteria
- [ ] `deploy-pages` deploys a directory to a branch in the target repo
- [ ] `preview-deploy` creates/cleans up preview branches and comments URLs on PRs
- [ ] `deploy-app` builds and deploys the Private Pages SPA

---

## 6. End-to-End Test Plan

### Test Strategy
- **Unit tests**: Vitest — git client, OPFS adapter, content fetcher, auth, path resolution, renderer
- **Component tests**: Vitest + @testing-library/react — LoginScreen, LoadingScreen, etc.
- **Integration tests**: Vitest with mocked OPFS/IndexedDB — full content pipeline
- **Service Worker tests**: Vitest with miniflare or service-worker-mock
- **E2E tests**: Playwright — full browser tests with real OPFS, real isomorphic-git, mocked GitHub (MSW)
- **BDD**: Feature files in `features/` with step definitions

### Critical Test Scenarios

| # | Scenario | Type | Priority |
|---|----------|------|----------|
| 1 | First visit shows login screen | E2E | P0 |
| 2 | OAuth flow completes, token stored in IndexedDB | E2E | P0 |
| 3 | After auth, repo cloned into OPFS | E2E | P0 |
| 4 | Cloned repo content renders as a web page | E2E | P0 |
| 5 | CSS/JS/images from repo load correctly | E2E | P0 |
| 6 | Return visit within TTL serves from OPFS (no network) | Integration | P0 |
| 7 | After TTL, git fetch pulls only deltas | Integration | P0 |
| 8 | Internal link click navigates without page reload | E2E | P1 |
| 9 | When git clone fails, falls back to GitHub API | Integration | P0 |
| 10 | Token expired → re-authentication prompt | Integration | P1 |
| 11 | Path resolution: `/docs/` → `index.html` | Unit | P0 |
| 12 | 404.html from repo rendered for missing pages | Integration | P1 |
| 13 | SW intercepts iframe requests, serves from OPFS | SW Unit | P0 |
| 14 | Background sync detects new commits | SW Unit | P1 |
| 15 | OPFS unavailable → fallback to in-memory | Integration | P1 |
| 16 | Web Locks prevent double clone across tabs | Integration | P1 |
| 17 | Logout clears token + OPFS data | E2E | P0 |
| 18 | Clone progress UI updates | Component | P1 |
| 19 | URL query param config works | E2E | P1 |

---

## 8. Data Model / Schema

### App Config Schema (Zod)

```typescript
const SiteConfigSchema = z.object({
  path: z.string().startsWith('/'),
  repo: z.string().regex(/^[^/]+\/[^/]+$/),
  branch: z.string().default('main'),
  directory: z.string().default('/'),
  fetchTtlSeconds: z.number().default(60),
});

const ConfigSchema = z.object({
  github: z.object({
    clientId: z.string(),
    authMode: z.enum(['pkce', 'device-flow']).default('device-flow'),
    corsProxy: z.string().url().optional(),
  }),
  sites: z.array(SiteConfigSchema).min(1),
});
```

### Git / Storage Types

```typescript
interface RepoState {
  owner: string;
  repo: string;
  branch: string;
  lastFetchAt: number;
  headCommitSha: string;
  totalSizeBytes: number;
  cloneComplete: boolean;
}

interface StoredAuth {
  encryptedToken: ArrayBuffer;
  iv: Uint8Array;
  githubUserId: number;
  githubLogin: string;
  tokenExpiresAt: number;
  scopes: string[];
}

interface ResolvedFile {
  path: string;
  content: Uint8Array;
  blobSha: string;
  contentType: string;
  size: number;
}
```

### SW ↔ Client Message Types

```typescript
type ClientToSwMessage =
  | { type: 'REPO_CLONED'; owner: string; repo: string; branch: string }
  | { type: 'FETCH_COMPLETE'; owner: string; repo: string; newSha: string }
  | { type: 'CONFIG_UPDATE'; sites: SiteConfig[] };

type SwToClientMessage =
  | { type: 'UPDATE_AVAILABLE'; owner: string; repo: string; newSha: string }
  | { type: 'SERVE_ERROR'; url: string; error: string };
```

---

## 9. Rendering Strategy

### Approach: Service Worker + iframe

The preferred rendering approach uses two cooperating mechanisms:

1. **Service Worker intercepts all requests** from the rendered page's iframe. When the iframe loads `index.html` and that HTML references `style.css` and `app.js`, those requests are intercepted by the SW and served from OPFS.

2. **iframe with `src` pointing to a virtual URL** under the app's origin. The SW recognizes the `/__pages__/**` pattern and serves from OPFS.

This is superior to `srcdoc` + blob URL rewriting because dynamic asset loading (`import()`, `fetch()`, lazy images) all works automatically, and the rendered page's own SPA router works naturally.

### Fallback: blob URL rewriting

If the SW is not available: parse HTML with DOMParser, rewrite `src`/`href`/`url()` to `blob:` URLs created from OPFS reads, render via iframe `srcdoc`.

---

## 10. Security & Auth

### Authentication Flow (Device Flow — preferred)

1. User clicks "Sign in with GitHub"
2. App calls `POST https://github.com/login/device/code` with `client_id` and `scope=repo`
3. GitHub returns `user_code` and `verification_uri`
4. App displays: "Go to github.com/login/device and enter code: ABCD-1234"
5. User enters code on GitHub, authorizes the app
6. App polls `POST https://github.com/login/oauth/access_token` until authorized
7. Token stored encrypted in IndexedDB

**Why device flow**: No CORS issues, no backend needed, no client secret exposed.

### Security Considerations

- Tokens encrypted at rest (AES-GCM, key in OPFS)
- OPFS is origin-scoped
- Rendered pages in iframe — isolated from SPA
- No secrets in the SPA bundle — `client_id` is public by design
- Web Locks for concurrent access safety

---

## 11. Deployment

### CI Pipeline

```
Lint → Typecheck → Unit Tests → Integration Tests → Playwright E2E
```

### Deploying the Private Pages SPA

The SPA itself is a static site. Primary target: GitHub Pages from a public repo.

### Build Output

```
dist/
├── index.html
├── assets/
│   ├── app.[hash].js
│   ├── app.[hash].css
│   └── vendor.[hash].js
├── sw.js
└── manifest.json
```

---

## 12. Claude Code Integration

### 12.1 Repository & Branch Rules

- **Repo**: `nsheaps/private-pages`
- **Default branch**: `main`
- **SCM workflow**: Variant A (Solo Developer, stacked on main via git-spice)

### 12.2 CLAUDE.md

Create at repo root:

```markdown
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
| `gs log short` | View git-spice stack |

## Plugins & Workflow

[same nsheaps/ai-mktpl plugins as before]

**Commit convention:** `<type>(<scope>): <description> [T<X>.<Y>]`
Scopes: app, auth, git, content, renderer, storage, sw, ui, config, actions
```

### 12.3 Session Start Script

Create `.claude/scripts/session-start.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Private Pages Session Bootstrap ==="

IS_EPHEMERAL=false
if [[ -f /.dockerenv ]] || [[ "${CODESPACES:-}" == "true" ]] || [[ -n "${CLAUDE_CODE_WEB:-}" ]]; then
  IS_EPHEMERAL=true
  echo "[env] Ephemeral container detected"
fi

if ! command -v mise &>/dev/null; then
  curl https://mise.run | sh
  export PATH="$HOME/.local/bin:$PATH"
fi
echo "[mise] $(mise --version)"

mise install --yes
npm ci
echo "[deps] Dependencies installed"

if ! command -v gs &>/dev/null; then
  go install go.abhg.dev/git-spice@latest 2>/dev/null || \
    brew install git-spice 2>/dev/null || \
    echo "[git-spice] Manual install needed"
fi
if command -v gs &>/dev/null; then
  gs repo init 2>/dev/null || true
fi

if command -v claude &>/dev/null; then
  claude plugin marketplace add nsheaps/ai-mktpl 2>/dev/null || true
  for plugin in scm-utils git-spice review-changes task-parallelization fix-pr \
                commit-skill commit-command product-development-and-sdlc \
                code-simplifier context-bloat-prevention todo-plus-plus \
                correct-behavior memory-manager; do
    claude plugin install "$plugin@nsheaps-ai-mktpl" 2>/dev/null || true
  done
  claude plugin marketplace add anthropics/claude-plugins-official 2>/dev/null || true
  claude plugin marketplace add anthropics/claude-code 2>/dev/null || true
  claude plugin install ralph-loop@anthropics-claude-code 2>/dev/null || true
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
git fetch origin 2>/dev/null || true
if [[ "$CURRENT_BRANCH" != "main" ]] && command -v gs &>/dev/null; then
  gs repo sync 2>/dev/null || true
  gs repo restack 2>/dev/null || true
fi

npm run validate 2>/dev/null || echo "[validate] Some checks failed"

echo ""
echo "=== Session Ready ==="
if [[ -f "TASKS.md" ]]; then
  grep -n "^\- \[x\]" TASKS.md | tail -3 || true
  echo "..."
  grep -n "^\- \[ \]" TASKS.md | head -3 || true
fi
echo "========================"
```

### 12.4 Claude Code Settings

Create `.claude/settings.json`: (same as before — npm, npx, node, git, gs, standard unix tools, three marketplaces, all plugins)

### 12.5–12.6 Slash Commands & Sub-Agents

(Same /continue, /validate, /status, /phase-gate commands as before. Same test-writer, reviewer, doc-writer agents but with the client-only architecture checklist — **reviewer must flag any server-side code as a 🔴 Critical.**)

### 12.7 Session 1 Output Checklist

After Phase -1: all `.claude/` config, `CLAUDE.md`, `TASKS.md`, `package.json` (react, vite, isomorphic-git, octokit, zod, idb), `tsconfig.json`, `tsconfig.sw.json`, `vite.config.ts`, `vite.config.sw.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.mise.toml`, `.gitignore`, `public/index.html`, `public/manifest.json`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md`. All committed and pushed.

---

## 13. Task Breakdown

### Phase -1: Claude Code Bootstrap (Session 1 ONLY)

- T-1.1 through T-1.13: Create all .claude/ config, install plugins, create project config, README, push to git. (Same structure as before, adapted for Vite/React/browser project)

### Phase 0: Foundation

- T0.1: Config schema + loader (Zod)
- T0.2: React entry point + App shell + error boundary
- T0.3: Client-side router (hash-based)
- T0.4: Skeleton UI components (LoginScreen, LoadingScreen, ErrorScreen)
- T0.5: Unit + component tests, CI green

### Phase 1: Authentication

- T1.1: AuthProvider interface + types
- T1.2: Device flow implementation
- T1.3: Token encryption + IndexedDB storage
- T1.4: PKCE flow alternative
- T1.5: IndexedDB wrapper (repos, auth, metadata stores)
- T1.6: Wire auth into App (stored token → validate → site or login)
- T1.7: DeviceFlowScreen UI component
- T1.8: Tests + BDD feature file

### Phase 2: Git Clone & OPFS Storage

- T2.1: GitClient interface + types
- T2.2: OPFS helpers (directory structure, read/write, usage stats)
- T2.3: OpfsAdapter (isomorphic-git `fs` backed by OPFS)
- T2.4: Git auth helper (onAuth callback with stored token)
- T2.5: GitClient class (clone, fetch, Web Locks)
- T2.6: File reading from bare repo (tree walk + blob read)
- T2.7: RepoState IndexedDB store
- T2.8: Clone progress UI
- T2.9: Wire into App (auth → check OPFS → clone/fetch → render)
- T2.10: Tests (OPFS adapter, git client with fixture repos)
- T2.11: BDD feature file

### Phase 3: Content Resolution & Page Rendering

- T3.1–T3.5: ContentFetcher interface, git-fetcher, api-fetcher (fallback), FallbackContentFetcher, path resolver
- T3.6–T3.8: PageRenderer (iframe + SW, fallback to srcdoc), asset interceptor, link interceptor
- T3.9: Wire into Router
- T3.10–T3.11: Tests + BDD

### Phase 4: Service Worker

- T4.1: SW build pipeline (tsconfig.sw, vite.config.sw)
- T4.2–T4.5: SW router, OPFS reader, main sw.ts (install/activate/fetch), background sync
- T4.6–T4.7: SW registration in App, UpdateBanner component
- T4.8: PageRenderer SW detection + fallback
- T4.9–T4.10: Tests + BDD

### Phase 5: GitHub Actions

- T5.1–T5.6: deploy-pages, preview-deploy, deploy-app actions + tests + docs

### Phase 6: Polish & UX

- T6.1–T6.6: Multi-site landing, status bar, settings UI, offline indicator, error polish, responsive design

### Phase 7: Build, Deploy & Release

- T7.1–T7.6: Production build optimization, deploy workflow, npm publish, semver, Playwright E2E, final README

---

## 14. Final Notes

### Startup Prompts

**Session 1 (Bootstrap):**

```
@.claude/prompts/init.md Read this entire spec. Execute Phase -1 (Claude Code Bootstrap).
THIS IS A CLIENT-ONLY APP — NO BACKEND SERVER. Everything runs in the browser.
Install plugins from nsheaps/ai-mktpl first, then official, then claude-code.
All work via git-spice stacked branches. Commit after each task.
When done, print what's complete and remind to type /continue.
```

**Session 2+ (Development):**

```
@.claude/prompts/init.md Re-read spec. REMEMBER: client-only, no server.
Run session-start.sh. gs repo sync && gs repo restack. Read TASKS.md.
For each task: stacked branch, TDD, review, validate, gs branch submit --fill.
At phase end: /ralph-loop then /phase-gate.
```

### Key Reminders

- **THIS IS A CLIENT-ONLY APP. THERE IS NO BACKEND SERVER. If you write server-side Node.js code (express, hono, fastify, http.createServer, node:fs, node:path), STOP — you are going the wrong direction.**
- All work on stacked branches via git-spice
- Every task gets multi-layer review
- **Git-first**: isomorphic-git in the browser with OPFS. GitHub API is fallback only.
- **OPFS is the persistent cache**: The bare clone in OPFS IS the cache. No separate cache layer.
- **Service Worker serves rendered page assets** from OPFS — this is how CSS/JS/images load.
- **File System API (OPFS)** is the core storage. Not localStorage, not sessionStorage.
- isomorphic-git uses `isomorphic-git/http/web` (not `/http/node`) and the OpfsAdapter (not `node:fs`)
- Token encryption: SubtleCrypto AES-GCM. Key in OPFS. Token in IndexedDB.
- Web Locks for concurrent tab safety
- Test in real browsers with Playwright. Mock GitHub with MSW. Real isomorphic-git with fixture repos.
- TypeScript strict, no `any`, no `@ts-ignore`
- **Keep bundle size small** — no server-side deps in client bundle
