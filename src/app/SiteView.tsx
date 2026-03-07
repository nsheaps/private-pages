import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from './Router';
import { GitClient } from '../git/client';
import { FallbackContentFetcher } from '../content/fetcher';
import { GitContentFetcher } from '../content/git-fetcher';
import { GitHubApiFetcher } from '../content/api-fetcher';
import { resolveFile, resolve404 } from '../content/resolver';
import { PageRenderer } from '../renderer/page-renderer';
import { isServiceWorkerActive } from './sw-register';
import { CloneProgressScreen } from '../ui/CloneProgressScreen';
import { ErrorScreen } from '../ui/ErrorScreen';
import { LoadingScreen } from '../ui/LoadingScreen';
import { StatusBar } from '../ui/StatusBar';
import type { ValidatedConfig, SiteConfig } from '../config/schema';
import type { TokenInfo } from '../auth/types';
import type { CloneProgress, RepoState } from '../git/types';

interface SiteViewProps {
  config: ValidatedConfig;
  token: TokenInfo;
  userLogin: string;
  onLogout: () => void;
  onBack?: () => void;
}

type ViewState =
  | { phase: 'cloning'; siteConfig: SiteConfig }
  | { phase: 'clone-error'; siteConfig: SiteConfig; error: string }
  | { phase: 'rendering'; siteConfig: SiteConfig; repoState: RepoState | null }
  | { phase: 'render-error'; siteConfig: SiteConfig; error: string }
  | { phase: 'not-found'; siteConfig: SiteConfig };

function parseSiteRepo(repo: string): { owner: string; repoName: string } {
  const [owner, repoName] = repo.split('/');
  return { owner: owner!, repoName: repoName! };
}

const GITHUB_API_URL = 'https://api.github.com';

interface BranchInfo {
  name: string;
}

async function fetchBranches(
  owner: string,
  repo: string,
  token: string,
): Promise<string[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as BranchInfo[];
    return data.map((b) => b.name);
  } catch {
    return [];
  }
}

export function SiteView({ config, token, userLogin, onLogout, onBack }: SiteViewProps) {
  const { route } = useRouter();
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [cloneProgress, setCloneProgress] = useState<CloneProgress | null>(null);
  const [repoState, setRepoState] = useState<RepoState | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [branches, setBranches] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PageRenderer | null>(null);

  // Find matching site config for current route
  const matchedSite = config.sites.find((site) =>
    route.path === site.path || route.path.startsWith(site.path + '/'),
  ) ?? config.sites[0];

  // Use the config branch directly and fetch the branch list for the dropdown.
  useEffect(() => {
    if (!matchedSite) return;

    const { owner, repoName } = parseSiteRepo(matchedSite.repo);
    setActiveBranch(matchedSite.branch);

    fetchBranches(owner, repoName, token.accessToken).then((branchList) => {
      setBranches(branchList);
    }).catch(() => { /* dropdown won't populate */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when repo/branch changes
  }, [matchedSite?.repo, matchedSite?.branch, token.accessToken]);

  // Clone/fetch the repo once we know the branch
  useEffect(() => {
    if (!matchedSite || !activeBranch) return;

    const { owner, repoName } = parseSiteRepo(matchedSite.repo);
    const client = new GitClient({
      owner,
      repo: repoName,
      branch: activeBranch,
      token: token.accessToken,
      corsProxy: config.github.corsProxy,
      onProgress: setCloneProgress,
    });

    setViewState({ phase: 'cloning', siteConfig: matchedSite });
    setSyncStatus('syncing');

    client
      .cloneOrFetch(matchedSite.fetchTtlSeconds)
      .then((state) => {
        setRepoState(state);
        setViewState({ phase: 'rendering', siteConfig: matchedSite, repoState: state });
        setSyncStatus('idle');
      })
      .catch(() => {
        // Clone/fetch failed — fall back to API-only rendering
        setViewState({ phase: 'rendering', siteConfig: matchedSite, repoState: null });
        setSyncStatus('idle');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depend on repo/branch only
  }, [matchedSite?.repo, activeBranch, token.accessToken]);

  // Render content when route changes and repo is ready
  const renderContent = useCallback(async () => {
    if (!viewState || viewState.phase !== 'rendering' || !containerRef.current) return;
    if (!matchedSite || !activeBranch) return;

    const { owner, repoName } = parseSiteRepo(matchedSite.repo);
    const gitFetcher = new GitContentFetcher(token.accessToken);
    const apiFetcher = new GitHubApiFetcher(token.accessToken);
    const fetcher = new FallbackContentFetcher(gitFetcher, apiFetcher);

    // Compute the sub-path within the site
    const subPath = route.path.startsWith(matchedSite.path)
      ? route.path.slice(matchedSite.path.length) || '/'
      : '/';

    const file = await resolveFile(
      fetcher,
      owner,
      repoName,
      activeBranch,
      subPath,
      matchedSite.directory,
    );

    if (!file) {
      // Try 404 page
      const notFound = await resolve404(
        fetcher,
        owner,
        repoName,
        activeBranch,
        matchedSite.directory,
      );

      if (notFound) {
        renderHtml(notFound.content, matchedSite, owner, repoName);
      } else {
        setViewState({ phase: 'not-found', siteConfig: matchedSite });
      }
      return;
    }

    if (file.contentType === 'text/html') {
      renderHtml(file.content, matchedSite, owner, repoName);
    } else {
      // Non-HTML content — serve as download/display
      const buf = new ArrayBuffer(file.content.byteLength);
      new Uint8Array(buf).set(file.content);
      const blob = new Blob([buf], { type: file.contentType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- renderHtml is stable, matchedSite captured by closure
  }, [viewState, route.path, matchedSite, activeBranch, token.accessToken]);

  function renderHtml(
    content: Uint8Array,
    siteConfig: SiteConfig,
    owner: string,
    repoName: string,
  ) {
    if (!containerRef.current || !activeBranch) return;

    // Clean up previous renderer
    rendererRef.current?.cleanup();
    const renderer = new PageRenderer(containerRef.current);
    rendererRef.current = renderer;

    const htmlString = new TextDecoder().decode(content);

    if (isServiceWorkerActive()) {
      renderer.renderWithServiceWorker(
        {
          owner,
          repo: repoName,
          branch: activeBranch,
          basePath: siteConfig.path,
        },
        route.path.slice(siteConfig.path.length) || '/',
      );
    } else {
      renderer.renderWithSrcdoc(htmlString);
    }
  }

  useEffect(() => {
    renderContent().catch(() => {
      if (matchedSite) {
        setViewState({
          phase: 'render-error',
          siteConfig: matchedSite,
          error: 'Failed to render page',
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matchedSite included via renderContent
  }, [renderContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.cleanup();
    };
  }, []);

  const handleBranchChange = useCallback((branch: string) => {
    setActiveBranch(branch);
    setRepoState(null);
    setCloneProgress(null);
  }, []);

  if (!matchedSite) {
    return <ErrorScreen message="No site configured for this path." />;
  }

  const statusBar = (
    <>
      <StatusBar
        syncStatus={syncStatus}
        commitSha={repoState?.headCommitSha}
        lastUpdated={repoState?.lastFetchAt}
        repoName={matchedSite.repo}
        branch={activeBranch ?? matchedSite.branch}
        branches={branches}
        onBranchChange={handleBranchChange}
        onBack={onBack}
      />
      <div className="pp-user-info">
        Signed in as {userLogin}{' '}
        <button onClick={onLogout} className="pp-logout-link">
          Sign out
        </button>
      </div>
    </>
  );

  if (!viewState) {
    return (
      <>
        <LoadingScreen message="Initializing..." />
        {statusBar}
      </>
    );
  }

  switch (viewState.phase) {

    case 'cloning':
      return (
        <>
          <CloneProgressScreen
            repoName={matchedSite.repo}
            progress={cloneProgress}
          />
          {statusBar}
        </>
      );

    case 'clone-error':
      return (
        <>
          <CloneProgressScreen
            repoName={matchedSite.repo}
            progress={null}
            error={viewState.error}
            onRetry={() => {
              if (!activeBranch) return;
              setViewState({ phase: 'cloning', siteConfig: matchedSite });
              const { owner, repoName } = parseSiteRepo(matchedSite.repo);
              const client = new GitClient({
                owner,
                repo: repoName,
                branch: activeBranch,
                token: token.accessToken,
                corsProxy: config.github.corsProxy,
                onProgress: setCloneProgress,
              });
              client
                .cloneOrFetch(0)
                .then((state) => {
                  setRepoState(state);
                  setViewState({ phase: 'rendering', siteConfig: matchedSite, repoState: state });
                  setSyncStatus('idle');
                })
                .catch(() => {
                  setViewState({ phase: 'rendering', siteConfig: matchedSite, repoState: null });
                  setSyncStatus('idle');
                });
            }}
          />
          {statusBar}
        </>
      );

    case 'not-found':
      return (
        <>
          <ErrorScreen
            title="Page Not Found"
            message={`The path "${route.path}" was not found in ${matchedSite.repo} (branch: ${activeBranch ?? matchedSite.branch}).`}
          />
          {statusBar}
        </>
      );

    case 'render-error':
      return (
        <>
          <ErrorScreen
            title="Render Error"
            message={viewState.error}
          />
          {statusBar}
        </>
      );

    case 'rendering':
      return (
        <>
          <div ref={containerRef} className="pp-content-container" />
          {statusBar}
        </>
      );
  }
}
