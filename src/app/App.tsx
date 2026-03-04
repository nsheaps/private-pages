import { useEffect, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { RouterProvider } from './Router';
import { loadConfig, ConfigError } from '../config/loader';
import { ErrorScreen } from '../ui/ErrorScreen';
import { LoadingScreen } from '../ui/LoadingScreen';
import { LoginScreen } from '../ui/LoginScreen';
import type { ValidatedConfig } from '../config/schema';

type AppState =
  | { phase: 'loading-config' }
  | { phase: 'config-error'; message: string }
  | { phase: 'login'; config: ValidatedConfig }
  | { phase: 'ready'; config: ValidatedConfig };

export function App() {
  const [state, setState] = useState<AppState>({ phase: 'loading-config' });

  useEffect(() => {
    loadConfig()
      .then((config) => {
        // TODO: Check for stored token -> skip to 'ready'
        setState({ phase: 'login', config });
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

function AppContent({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  switch (state.phase) {
    case 'loading-config':
      return <LoadingScreen message="Loading configuration..." />;

    case 'config-error':
      return (
        <ErrorScreen
          title="Configuration Error"
          message={state.message}
          onRetry={() => {
            setState({ phase: 'loading-config' });
            loadConfig()
              .then((config) => setState({ phase: 'login', config }))
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
          onLogin={() => {
            // TODO: Trigger OAuth flow
            setState({ phase: 'ready', config: state.config });
          }}
        />
      );

    case 'ready':
      return (
        <div id="private-pages-app">
          <h1>Private Pages</h1>
          <p>Authenticated. Content rendering not yet implemented.</p>
        </div>
      );
  }
}
