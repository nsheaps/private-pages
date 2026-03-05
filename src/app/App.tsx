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

function createAuthProvider(config: ValidatedConfig): AuthProvider {
  const mode = resolveAuthMode(config);
  if (mode === 'pkce') {
    return new PkceFlowProvider(
      config.github.clientId,
      'repo',
      config.github.callbackUrl,
    );
  }
  if (mode === 'device-flow') {
    return new DeviceFlowProvider(config.github.clientId, 'repo', config.github.corsProxy);
  }
  return new PatFlowProvider();
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

  const authProvider = useMemo(() => {
    if (!config) return null;
    return createAuthProvider(config);
  }, [config]);

  const effectiveAuthMode = config ? resolveAuthMode(config) : null;

  // Check for stored token on config load, and handle PKCE callback
  useEffect(() => {
    if (state.phase !== 'checking-auth' || !authProvider || !config) return;
    const currentConfig = config;

    // If PKCE and we have a pending callback (?code= in URL), process it
    if (
      effectiveAuthMode === 'pkce' &&
      authProvider instanceof PkceFlowProvider &&
      authProvider.hasPendingCallback()
    ) {
      authProvider
        .login()
        .then((token) => {
          return authProvider.loadStoredToken().then((stored) => {
            if (stored) {
              setState({
                phase: 'ready',
                config: currentConfig,
                token,
                user: stored.user,
              });
            }
          });
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Login failed';
          setLoginError(message);
          setState({ phase: 'login', config: currentConfig });
        });
      return;
    }

    // Check for stored token
    authProvider
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
  }, [state.phase, config, authProvider, effectiveAuthMode, setState]);

  const startLogin = useCallback(() => {
    if (!authProvider || !config) return;
    const currentConfig = config;
    setLoginError(undefined);

    if (effectiveAuthMode === 'pkce') {
      authProvider.login().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Login failed';
        setLoginError(message);
        setState({ phase: 'login', config: currentConfig });
      });
      return;
    }

    if (effectiveAuthMode === 'device-flow') {
      setState({ phase: 'device-flow', config: currentConfig });
      (authProvider as DeviceFlowProvider)
        .login((flowState) => setDeviceFlowState(flowState))
        .then((token) => {
          return authProvider.loadStoredToken().then((stored) => {
            if (stored) {
              setState({
                phase: 'ready',
                config: currentConfig,
                token,
                user: stored.user,
              });
            }
          });
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Login failed';
          setLoginError(message);
          setDeviceFlowState({ status: 'error', error: message });
          setState({ phase: 'login', config: currentConfig });
        });
      return;
    }

    // PAT mode — login() without a token just prompts; handled by startPatLogin
  }, [config, authProvider, effectiveAuthMode, setState]);

  const startPatLogin = useCallback((token: string) => {
    if (!authProvider || !config) return;
    const currentConfig = config;
    setLoginError(undefined);

    (authProvider as PatFlowProvider)
      .login(token)
      .then((tokenInfo) => {
        return authProvider.loadStoredToken().then((stored) => {
          if (stored) {
            setState({
              phase: 'ready',
              config: currentConfig,
              token: tokenInfo,
              user: stored.user,
            });
          }
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Invalid token';
        setLoginError(message);
      });
  }, [config, authProvider, setState]);

  const startDirectUrlLogin = useCallback((url: string, auth?: { token?: string; username?: string; password?: string }) => {
    setState({ phase: 'direct-url', repoUrl: url, auth });
  }, [setState]);

  const handleLogout = useCallback(() => {
    if (!authProvider || !config) return;
    const currentConfig = config;
    authProvider
      .logout()
      .then(() => {
        setState({ phase: 'login', config: currentConfig });
      })
      .catch(() => {
        setState({ phase: 'login', config: currentConfig });
      });
  }, [authProvider, config, setState]);

  // Determine which wizard methods are available based on config
  const wizardMethods = useMemo(() => {
    if (!config) {
      return { pat: true, githubApp: false, deviceFlow: false, directUrl: true };
    }
    const mode = resolveAuthMode(config);
    return {
      pat: true,
      githubApp: mode === 'pkce' || config.github.clientId !== '',
      deviceFlow: mode === 'device-flow' || config.github.clientId !== '',
      directUrl: true,
    };
  }, [config]);

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
      return (
        <LoginWizard
          onPatLogin={startPatLogin}
          onPkceLogin={startLogin}
          onDeviceFlowLogin={startLogin}
          onDirectUrlLogin={startDirectUrlLogin}
          error={loginError}
          deviceFlowState={deviceFlowState}
          onDeviceFlowCancel={() => {
            if (authProvider instanceof DeviceFlowProvider) {
              authProvider.cancelLogin();
            }
            setDeviceFlowState({ status: 'idle' });
          }}
          availableMethods={wizardMethods}
        />
      );

    case 'device-flow':
      return (
        <LoginWizard
          onPatLogin={startPatLogin}
          onPkceLogin={startLogin}
          onDeviceFlowLogin={startLogin}
          onDirectUrlLogin={startDirectUrlLogin}
          error={loginError}
          deviceFlowState={deviceFlowState}
          onDeviceFlowCancel={() => {
            if (authProvider instanceof DeviceFlowProvider) {
              authProvider.cancelLogin();
            }
            if (config) {
              setState({ phase: 'login', config });
            }
            setDeviceFlowState({ status: 'idle' });
          }}
          availableMethods={wizardMethods}
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
          branch: 'main',
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
      onSelectRepo={(repo) => navigate(`/${repo}`)}
      onLogout={onLogout}
    />
  );
}

function parseAdHocRoute(
  segments: string[],
): { owner: string; repo: string } | null {
  if (segments.length < 2) return null;
  return { owner: segments[0]!, repo: segments[1]! };
}
