export interface LoginScreenProps {
  onLogin: () => void;
  loading?: boolean;
  error?: string;
  authMode?: 'pkce' | 'device-flow';
}

export function LoginScreen({ onLogin, loading, error, authMode }: LoginScreenProps) {
  return (
    <div className="pp-login-screen" role="main">
      <h1>Private Pages</h1>
      <p>Sign in with GitHub to view private repository content.</p>
      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}
      <button
        onClick={onLogin}
        disabled={loading}
        className="pp-login-button"
      >
        {loading ? 'Signing in…' : 'Sign in with GitHub'}
      </button>
      {authMode === 'device-flow' && (
        <p className="pp-auth-mode-hint">
          Using device flow (preview deployment)
        </p>
      )}
    </div>
  );
}
