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
}

type ViewState =
  | { phase: 'cloning'; siteConfig: SiteConfig }
  | { phase: 'clone-error'; siteConfig: SiteConfig; error: string }
  | { phase: 'rendering'; siteConfig: SiteConfig; repoState: RepoState }
  | { phase: 'render-error'; siteConfig: SiteConfig; error: string }
  | { phase: 'not-found'; siteConfig: SiteConfig };

function parseSiteRepo(repo: string): { owner: string; repoName: string } {
  const [owner, repoName] = repo.split('/');
  return { owner: owner!, repoName: repoName! };
}

export function SiteView({ config, token, userLogin, onLogout }: SiteViewProps) {
  const { route } = useRouter();
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [cloneProgress, setCloneProgress] = useState<CloneProgress | null>(null);
  const [repoState, setRepoState] = useState<RepoState | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PageRenderer | null>(null);

  // Find matching site config for current route
  const matchedSite = config.sites.find((site) =>
    route.path === site.path || route.path.startsWith(site.path + '/'),
  ) ?? config.sites[0];

  // Clone/fetch the repo
  useEffect(() => {
    if (!matchedSite) return;

    const { owner, repoName } = parseSiteRepo(matchedSite.repo);
    const client = new GitClient({
      owner,
      repo: repoName,
      branch: matchedSite.branch,
      token: token.accessToken,
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
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Clone failed';
        setViewState({ phase: 'clone-error', siteConfig: matchedSite, error: message });
        setSyncStatus('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depend on repo/branch only
  }, [matchedSite?.repo, matchedSite?.branch, token.accessToken]);

  // Render content when route changes and repo is ready
  const renderContent = useCallback(async () => {
    if (!viewState || viewState.phase !== 'rendering' || !containerRef.current) return;
    if (!matchedSite) return;

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
      matchedSite.branch,
      subPath,
      matchedSite.directory,
    );

    if (!file) {
      // Try 404 page
      const notFound = await resolve404(
        fetcher,
        owner,
        repoName,
        matchedSite.branch,
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
  }, [viewState, route.path, matchedSite, token.accessToken]);

  function renderHtml(
    content: Uint8Array,
    siteConfig: SiteConfig,
    owner: string,
    repoName: string,
  ) {
    if (!containerRef.current) return;

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
          branch: siteConfig.branch,
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

  if (!matchedSite) {
    return <ErrorScreen message="No site configured for this path." />;
  }

  if (!viewState) {
    return <LoadingScreen message="Initializing..." />;
  }

  switch (viewState.phase) {
    case 'cloning':
      return (
        <CloneProgressScreen
          repoName={matchedSite.repo}
          progress={cloneProgress}
        />
      );

    case 'clone-error':
      return (
        <CloneProgressScreen
          repoName={matchedSite.repo}
          progress={null}
          error={viewState.error}
          onRetry={() => {
            setViewState({ phase: 'cloning', siteConfig: matchedSite });
            const { owner, repoName } = parseSiteRepo(matchedSite.repo);
            const client = new GitClient({
              owner,
              repo: repoName,
              branch: matchedSite.branch,
              token: token.accessToken,
              onProgress: setCloneProgress,
            });
            client
              .cloneOrFetch(0) // Force refresh
              .then((state) => {
                setRepoState(state);
                setViewState({ phase: 'rendering', siteConfig: matchedSite, repoState: state });
                setSyncStatus('idle');
              })
              .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Clone failed';
                setViewState({ phase: 'clone-error', siteConfig: matchedSite, error: message });
                setSyncStatus('error');
              });
          }}
        />
      );

    case 'not-found':
      return (
        <ErrorScreen
          title="Page Not Found"
          message={`The path "${route.path}" was not found in ${matchedSite.repo}.`}
        />
      );

    case 'render-error':
      return (
        <ErrorScreen
          title="Render Error"
          message={viewState.error}
        />
      );

    case 'rendering':
      return (
        <>
          <div ref={containerRef} className="pp-content-container" />
          <StatusBar
            syncStatus={syncStatus}
            commitSha={repoState?.headCommitSha}
            lastUpdated={repoState?.lastFetchAt}
            repoName={matchedSite.repo}
          />
          <div className="pp-user-info">
            Signed in as {userLogin}{' '}
            <button onClick={onLogout} className="pp-logout-link">
              Sign out
            </button>
          </div>
        </>
      );
  }
}
