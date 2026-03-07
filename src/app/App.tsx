import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { RouterProvider, useRouter } from './Router';
import { loadConfig, ConfigError } from '../config/loader';
import { PkceFlowProvider } from '../auth/pkce-flow';
import { DeviceFlowProvider } from '../auth/device-flow';
import { PatFlowProvider } from '../auth/pat-flow';
import { ErrorScreen } from '../ui/ErrorScreen';
import { LoadingScreen } from '../ui/LoadingScreen';
import { LoginWizard } from '../ui/wizard';
import { SetupPage } from '../ui/SetupPage';
import { SiteLandingPage } from '../ui/SiteLandingPage';
import { RepoPickerPage } from '../ui/RepoPickerPage';
import { SiteView } from './SiteView';
import type { ValidatedConfig } from '../config/schema';
import type { AuthProvider, DeviceFlowState, TokenInfo, UserInfo } from '../auth/types';

const GITHUB_API_URL = 'https://api.github.com';

async function fetchGitHubUser(accessToken: string): Promise<UserInfo> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch user info (HTTP ${String(response.status)})`);
  }
  const data = (await response.json()) as {
    id: number;
    login: string;
    avatar_url: string;
    name: string | null;
  };
  return {
    id: data.id,
    login: data.login,
    avatarUrl: data.avatar_url,
    name: data.name,
  };
}

type AppState =
  | { phase: 'loading-config' }
  | { phase: 'no-config' }
  | { phase: 'config-error'; message: string }
  | { phase: 'checking-auth'; config: ValidatedConfig }
  | { phase: 'login'; config: ValidatedConfig }
  | { phase: 'device-flow'; config: ValidatedConfig }
  | { phase: 'direct-url'; repoUrl: string; auth?: { token?: string; username?: string; password?: string } }
  | { phase: 'ready'; config: ValidatedConfig; token: TokenInfo; user: UserInfo };

/**
 * Determine the effective auth mode from config.
 * Defaults to PKCE. When a callbackUrl is configured it points to a shared
 * /auth/callback route that redirects back to the originating deployment,
 * so a URL mismatch is expected and does NOT trigger a device-flow fallback.
 */
function resolveAuthMode(config: ValidatedConfig): 'pkce' | 'device-flow' | 'pat' {
  return config.github.authMode;
}

export function App() {
  const [state, setState] = useState<AppState>({ phase: 'loading-config' });

  useEffect(() => {
    loadConfig()
      .then((config) => {
        if (!config) {
          setState({ phase: 'no-config' });
        } else {
          setState({ phase: 'checking-auth', config });
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ConfigError
            ? err.message
            : 'Failed to load configuration';
        setState({ phase: 'config-error', message });
      });
  }, []);

  return (
    <ErrorBoundary>
      <RouterProvider>
        <AppContent state={state} setState={setState} />
      </RouterProvider>
    </ErrorBoundary>
  );
}

function getConfig(state: AppState): ValidatedConfig | null {
  if (
    state.phase === 'loading-config' ||
    state.phase === 'config-error' ||
    state.phase === 'no-config' ||
    state.phase === 'direct-url'
  ) {
    return null;
  }
  return state.config;
}

/**
 * Create all auth providers that the config supports.
 * Each wizard method gets its own provider instance so the user
 * can pick any method regardless of the config's default authMode.
 */
function createProviders(config: ValidatedConfig) {
  const hasClientId = config.github.clientId !== '';
  return {
    pat: new PatFlowProvider(),
    pkce: hasClientId
      ? new PkceFlowProvider(config.github.clientId, 'repo', config.github.callbackUrl, config.github.corsProxy)
      : null,
    deviceFlow: hasClientId
      ? new DeviceFlowProvider(config.github.clientId, 'repo', config.github.corsProxy)
      : null,
  };
}

function AppContent({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [deviceFlowState, setDeviceFlowState] = useState<DeviceFlowState>({
    status: 'idle',
  });
  const [loginError, setLoginError] = useState<string>();

  const config = getConfig(state);

  const providers = useMemo(() => {
    if (!config) return null;
    return createProviders(config);
  }, [config]);

  // The "primary" provider is the one matching config's authMode — used for
  // stored-token checks, PKCE callbacks, and logout.
  const primaryProvider = useMemo((): AuthProvider | null => {
    if (!providers || !config) return null;
    const mode = resolveAuthMode(config);
    if (mode === 'pkce') return providers.pkce;
    if (mode === 'device-flow') return providers.deviceFlow;
    return providers.pat;
  }, [providers, config]);

  // Check for stored token on config load, and handle PKCE callback
  useEffect(() => {
    if (state.phase !== 'checking-auth' || !primaryProvider || !config) return;
    const currentConfig = config;

    // If PKCE and we have a pending callback (?code= in URL), process it
    if (
      providers?.pkce instanceof PkceFlowProvider &&
      providers.pkce.hasPendingCallback()
    ) {
      providers.pkce
        .login()
        .then(async (token) => {
          const user = await fetchGitHubUser(token.accessToken);
          setState({
            phase: 'ready',
            config: currentConfig,
            token,
            user,
          });
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Login failed';
          setLoginError(message);
          setState({ phase: 'login', config: currentConfig });
        });
      return;
    }

    // Check for stored token using the primary provider
    primaryProvider
      .loadStoredToken()
      .then((stored) => {
        if (stored) {
          setState({
            phase: 'ready',
            config: currentConfig,
            token: stored.token,
            user: stored.user,
          });
        } else {
          setState({ phase: 'login', config: currentConfig });
        }
      })
      .catch(() => {
        setState({ phase: 'login', config: currentConfig });
      });
  }, [state.phase, config, providers, primaryProvider, setState]);

  const startPkceLogin = useCallback(() => {
    if (!providers?.pkce || !config) return;
    const currentConfig = config;
    setLoginError(undefined);

    providers.pkce.login().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLoginError(message);
      setState({ phase: 'login', config: currentConfig });
    });
  }, [config, providers, setState]);

  const startDeviceFlowLogin = useCallback(() => {
    if (!providers?.deviceFlow || !config) return;
    const currentConfig = config;
    const dfProvider = providers.deviceFlow;
    setLoginError(undefined);

    dfProvider
      .login((flowState) => setDeviceFlowState(flowState))
      .then(async (token) => {
        const user = await fetchGitHubUser(token.accessToken);
        setState({
          phase: 'ready',
          config: currentConfig,
          token,
          user,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Login failed';
        setLoginError(message);
        setDeviceFlowState({ status: 'error', error: message });
      });
  }, [config, providers, setState]);

  const startPatLogin = useCallback((token: string) => {
    if (!providers || !config) return;
    const currentConfig = config;
    setLoginError(undefined);

    providers.pat
      .login(token)
      .then(async (tokenInfo) => {
        const user = await fetchGitHubUser(tokenInfo.accessToken);
        setState({
          phase: 'ready',
          config: currentConfig,
          token: tokenInfo,
          user,
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Invalid token';
        setLoginError(message);
      });
  }, [config, providers, setState]);

  const startDirectUrlLogin = useCallback((url: string, auth?: { token?: string; username?: string; password?: string }) => {
    setState({ phase: 'direct-url', repoUrl: url, auth });
  }, [setState]);

  const handleLogout = useCallback(() => {
    if (!primaryProvider || !config) return;
    const currentConfig = config;
    primaryProvider
      .logout()
      .then(() => {
        setState({ phase: 'login', config: currentConfig });
      })
      .catch(() => {
        setState({ phase: 'login', config: currentConfig });
      });
  }, [primaryProvider, config, setState]);

  // Determine which wizard methods are available based on config
  const wizardMethods = useMemo(() => {
    if (!config) {
      return { pat: true, githubApp: false, deviceFlow: false, directUrl: true };
    }
    const hasClientId = config.github.clientId !== '';
    return {
      pat: true,
      githubApp: hasClientId,
      deviceFlow: hasClientId,
      directUrl: true,
    };
  }, [config]);

  const cancelDeviceFlow = useCallback(() => {
    if (providers?.deviceFlow) {
      providers.deviceFlow.cancelLogin();
    }
    setDeviceFlowState({ status: 'idle' });
  }, [providers]);

  switch (state.phase) {
    case 'loading-config':
    case 'checking-auth':
      return <LoadingScreen message="Loading..." />;

    case 'no-config':
      return <SetupPage />;

    case 'config-error':
      return (
        <ErrorScreen
          title="Configuration Error"
          message={state.message}
          onRetry={() => {
            setState({ phase: 'loading-config' });
            loadConfig()
              .then((c) => {
                if (!c) {
                  setState({ phase: 'no-config' });
                } else {
                  setState({ phase: 'checking-auth', config: c });
                }
              })
              .catch((err: unknown) =>
                setState({
                  phase: 'config-error',
                  message:
                    err instanceof ConfigError
                      ? err.message
                      : 'Failed to load configuration',
                }),
              );
          }}
        />
      );

    case 'login':
    case 'device-flow':
      return (
        <LoginWizard
          onPatLogin={startPatLogin}
          onPkceLogin={startPkceLogin}
          onDeviceFlowLogin={startDeviceFlowLogin}
          onDirectUrlLogin={startDirectUrlLogin}
          error={loginError}
          deviceFlowState={deviceFlowState}
          onDeviceFlowCancel={cancelDeviceFlow}
          availableMethods={wizardMethods}
          hasCorsProxy={Boolean(config?.github.corsProxy)}
        />
      );

    case 'direct-url':
      return (
        <DirectUrlView
          repoUrl={state.repoUrl}
          auth={state.auth}
          onBack={() => {
            if (config) {
              setState({ phase: 'login', config });
            } else {
              setState({ phase: 'no-config' });
            }
          }}
        />
      );

    case 'ready':
      return (
        <ReadyView
          config={state.config}
          token={state.token}
          user={state.user}
          onLogout={handleLogout}
        />
      );
  }
}

/**
 * Handles a direct-url clone attempt. Tries anonymous first, shows progress.
 * For now, shows a loading state — the full git clone integration will come
 * when the direct URL feature is connected to the git client.
 */
function DirectUrlView({
  repoUrl,
  auth,
  onBack,
}: {
  repoUrl: string;
  auth?: { token?: string; username?: string; password?: string };
  onBack: () => void;
}) {
  return (
    <div className="pp-wizard-screen" role="status">
      <div className="pp-wizard-header">
        <button type="button" className="pp-wizard-back" onClick={onBack} aria-label="Back">
          &larr; Back
        </button>
        <h1>Connecting to Repository</h1>
        <p>
          Cloning <code>{repoUrl}</code>
          {auth ? ' with provided credentials' : ' anonymously'}...
        </p>
      </div>
      <LoadingScreen message="Connecting..." />
    </div>
  );
}

/**
 * Decides what to render once the user is authenticated:
 * - If config has pre-defined sites -> SiteView (with SiteLandingPage at root for multi-site)
 * - If no sites -> parse hash for ad-hoc repo (#/owner/repo/path) or show repo picker
 */
function ReadyView({
  config,
  token,
  user,
  onLogout,
}: {
  config: ValidatedConfig;
  token: TokenInfo;
  user: UserInfo;
  onLogout: () => void;
}) {
  const { route, navigate } = useRouter();
  const hasSites = config.sites.length > 0;

  // Clear leftover login hash (e.g. #/login/pat-input) so we don't
  // misinterpret it as an ad-hoc owner/repo route.
  useEffect(() => {
    if (route.path.startsWith('/login')) {
      navigate('/');
    }
  }, [route.path, navigate]);

  // For ad-hoc mode (no sites), parse owner/repo from the hash
  const adHocParsed = !hasSites ? parseAdHocRoute(route.segments) : null;

  // If config has sites, use SiteView as before
  if (hasSites) {
    // Multi-site: show landing page at root if multiple sites configured
    const isRoot = route.path === '/';
    if (isRoot && config.sites.length > 1) {
      return (
        <SiteLandingPage
          sites={config.sites}
          userLogin={user.login}
          onNavigate={navigate}
          onLogout={onLogout}
        />
      );
    }
    return (
      <SiteView
        config={config}
        token={token}
        userLogin={user.login}
        onLogout={onLogout}
      />
    );
  }

  // No sites configured: ad-hoc mode
  if (adHocParsed) {
    // Build a temporary config with the ad-hoc repo
    const adHocConfig: ValidatedConfig = {
      ...config,
      sites: [
        {
          path: `/${adHocParsed.owner}/${adHocParsed.repo}`,
          repo: `${adHocParsed.owner}/${adHocParsed.repo}`,
          branch: adHocParsed.branch ?? 'main',
          directory: '/',
          fetchTtlSeconds: 60,
        },
      ],
    };
    return (
      <SiteView
        config={adHocConfig}
        token={token}
        userLogin={user.login}
        onLogout={onLogout}
      />
    );
  }

  // At root with no sites -> show repo picker
  return (
    <RepoPickerPage
      token={token.accessToken}
      userLogin={user.login}
      onSelectRepo={(repo, branch) => navigate(`/${repo}@${branch}`)}
      onLogout={onLogout}
    />
  );
}

const RESERVED_ROUTES = new Set(['login', 'auth', 'setup', 'help']);

function parseAdHocRoute(
  segments: string[],
): { owner: string; repo: string; branch?: string } | null {
  if (segments.length < 2) return null;
  if (RESERVED_ROUTES.has(segments[0]!)) return null;

  // Parse optional @branch suffix from repo segment: "repo@branch"
  const repoSegment = segments[1]!;
  const atIndex = repoSegment.indexOf('@');
  if (atIndex > 0) {
    return {
      owner: segments[0]!,
      repo: repoSegment.slice(0, atIndex),
      branch: repoSegment.slice(atIndex + 1),
    };
  }
  return { owner: segments[0]!, repo: repoSegment };
}
