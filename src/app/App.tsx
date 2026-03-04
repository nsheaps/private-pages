import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { RouterProvider, useRouter } from './Router';
import { loadConfig, ConfigError } from '../config/loader';
import { DeviceFlowProvider } from '../auth/device-flow';
import { ErrorScreen } from '../ui/ErrorScreen';
import { LoadingScreen } from '../ui/LoadingScreen';
import { LoginScreen } from '../ui/LoginScreen';
import { DeviceFlowScreen } from '../ui/DeviceFlowScreen';
import { SiteLandingPage } from '../ui/SiteLandingPage';
import { RepoPickerPage } from '../ui/RepoPickerPage';
import { SiteView } from './SiteView';
import type { ValidatedConfig } from '../config/schema';
import type { DeviceFlowState, TokenInfo, UserInfo } from '../auth/types';

type AppState =
  | { phase: 'loading-config' }
  | { phase: 'config-error'; message: string }
  | { phase: 'checking-auth'; config: ValidatedConfig }
  | { phase: 'login'; config: ValidatedConfig }
  | { phase: 'device-flow'; config: ValidatedConfig }
  | { phase: 'ready'; config: ValidatedConfig; token: TokenInfo; user: UserInfo };

export function App() {
  const [state, setState] = useState<AppState>({ phase: 'loading-config' });

  useEffect(() => {
    loadConfig()
      .then((config) => {
        setState({ phase: 'checking-auth', config });
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
  if (state.phase === 'loading-config' || state.phase === 'config-error') {
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
  const clientId = config?.github.clientId ?? null;

  const authProvider = useMemo(() => {
    if (!clientId) return null;
    return new DeviceFlowProvider(clientId);
  }, [clientId]);

  // Check for stored token on config load
  useEffect(() => {
    if (state.phase !== 'checking-auth' || !authProvider || !config) return;
    const currentConfig = config;
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
  }, [state.phase, config, authProvider, setState]);

  const startLogin = useCallback(() => {
    if (!authProvider || !config) return;
    const currentConfig = config;

    setState({ phase: 'device-flow', config: currentConfig });
    setLoginError(undefined);

    authProvider
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
  }, [config, authProvider, setState]);

  const handleLogout = useCallback(() => {
    if (!authProvider || !config) return;
    const currentConfig = config;
    authProvider
      .logout()
      .then(() => {
        setState({ phase: 'login', config: currentConfig });
      })
      .catch(() => {
        // Clear state even if logout fails
        setState({ phase: 'login', config: currentConfig });
      });
  }, [authProvider, config, setState]);

  switch (state.phase) {
    case 'loading-config':
    case 'checking-auth':
      return <LoadingScreen message="Loading..." />;

    case 'config-error':
      return (
        <ErrorScreen
          title="Configuration Error"
          message={state.message}
          onRetry={() => {
            setState({ phase: 'loading-config' });
            loadConfig()
              .then((c) => setState({ phase: 'checking-auth', config: c }))
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
        <LoginScreen
          onLogin={startLogin}
          error={loginError}
        />
      );

    case 'device-flow':
      return (
        <DeviceFlowScreen
          state={deviceFlowState}
          onCancel={() => {
            authProvider?.cancelLogin();
            if (config) {
              setState({ phase: 'login', config });
            }
            setDeviceFlowState({ status: 'idle' });
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
 * Decides what to render once the user is authenticated:
 * - If config has pre-defined sites → SiteView (with SiteLandingPage at root for multi-site)
 * - If no sites → parse hash for ad-hoc repo (#/owner/repo/path) or show repo picker
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

  // At root with no sites → show repo picker
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
