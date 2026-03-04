export interface LoginScreenProps {
  onLogin: () => void;
  loading?: boolean;
  error?: string;
}

export function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
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
    </div>
  );
}
