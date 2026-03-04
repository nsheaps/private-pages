# Private Pages — Task Tracker

## Phase -1: Claude Code Bootstrap

- [x] T-1.1: Create `.claude/settings.json`
- [x] T-1.2: Create `.claude/scripts/session-start.sh`
- [x] T-1.3: Create `.claude/prompts/init.md`
- [x] T-1.4: Create `CLAUDE.md`
- [x] T-1.5: Create `TASKS.md`
- [x] T-1.6: Create `package.json` with dependencies
- [x] T-1.7: Create `tsconfig.json` + `tsconfig.sw.json`
- [x] T-1.8: Create `vite.config.ts` + `vite.config.sw.ts`
- [x] T-1.9: Create `vitest.config.ts` + `playwright.config.ts`
- [x] T-1.10: Create `eslint.config.js`, `.gitignore`, `.mise.toml`
- [x] T-1.11: Create `public/index.html` + `public/manifest.json`
- [x] T-1.12: Create `src/` skeleton with placeholder modules
- [x] T-1.13: Create `.github/workflows/ci.yml` + `deploy.yml`

## Phase 0: Foundation

- [x] T0.1: Config schema + loader (Zod validation)
- [x] T0.2: React entry point + App shell + error boundary
- [x] T0.3: Client-side router (hash-based)
- [x] T0.4: Skeleton UI components (LoginScreen, LoadingScreen, ErrorScreen)
- [x] T0.5: Unit + component tests, CI green

## Phase 1: Authentication

- [x] T1.1: AuthProvider interface + types
- [x] T1.2: Device flow implementation
- [x] T1.3: Token encryption + IndexedDB storage
- [ ] T1.4: PKCE flow alternative
- [x] T1.5: IndexedDB wrapper (repos, auth, metadata stores)
- [x] T1.6: Wire auth into App (stored token → validate → site or login)
- [x] T1.7: DeviceFlowScreen UI component
- [x] T1.8: Tests + BDD feature file

## Phase 2: Git Clone & OPFS Storage

- [x] T2.1: GitClient interface + types
- [x] T2.2: OPFS helpers (directory structure, read/write, usage stats)
- [x] T2.3: OpfsAdapter (isomorphic-git `fs` backed by OPFS)
- [x] T2.4: Git auth helper (onAuth callback with stored token)
- [x] T2.5: GitClient class (clone, fetch, Web Locks)
- [x] T2.6: File reading from bare repo (tree walk + blob read)
- [x] T2.7: RepoState IndexedDB store
- [ ] T2.8: Clone progress UI
- [ ] T2.9: Wire into App (auth → check OPFS → clone/fetch → render)
- [x] T2.10: Tests (OPFS adapter, git client with fixture repos)
- [ ] T2.11: BDD feature file

## Phase 3: Content Resolution & Page Rendering

- [x] T3.1: ContentFetcher interface + types
- [x] T3.2: GitContentFetcher (reads from local OPFS clone)
- [x] T3.3: GitHubApiFetcher (octokit Contents API fallback)
- [x] T3.4: FallbackContentFetcher (git → API composition)
- [x] T3.5: Path resolver (URL path → file path resolution)
- [x] T3.6: PageRenderer (iframe + SW approach)
- [x] T3.7: Asset interceptor (rewrite relative URLs)
- [x] T3.8: Link interceptor (client-side navigation for internal links)
- [ ] T3.9: Wire into Router
- [x] T3.10: Tests
- [ ] T3.11: BDD feature file

## Phase 4: Service Worker

- [x] T4.1: SW build pipeline (tsconfig.sw, vite.config.sw)
- [x] T4.2: SW router (match `/__pages__/**` pattern)
- [x] T4.3: SW OPFS reader (serve files from OPFS in SW context)
- [x] T4.4: Main sw.ts (install, activate, fetch handler)
- [ ] T4.5: Background sync (check for new commits)
- [x] T4.6: SW registration in App
- [x] T4.7: UpdateBanner component
- [x] T4.8: PageRenderer SW detection + fallback
- [x] T4.9: Tests
- [ ] T4.10: BDD feature file

## Phase 5: GitHub Actions

- [x] T5.1: deploy-pages action
- [x] T5.2: preview-deploy action
- [x] T5.3: deploy-app action (via deploy.yml)
- [ ] T5.4: Action tests
- [ ] T5.5: Action documentation
- [x] T5.6: Wire into CI/CD

## Phase 6: Polish & UX

- [ ] T6.1: Multi-site landing page
- [ ] T6.2: Status bar component
- [ ] T6.3: Settings UI
- [ ] T6.4: Offline indicator
- [ ] T6.5: Error polish
- [ ] T6.6: Responsive design

## Phase 7: Build, Deploy & Release

- [ ] T7.1: Production build optimization
- [ ] T7.2: Deploy workflow
- [ ] T7.3: npm publish setup
- [ ] T7.4: Semantic versioning
- [ ] T7.5: Playwright E2E suite
- [ ] T7.6: Final README + documentation
