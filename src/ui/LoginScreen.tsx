import { useState } from 'react';

export interface LoginScreenProps {
  onLogin: () => void;
  onPatLogin: (token: string) => void;
  loading?: boolean;
  error?: string;
  authMode?: 'pkce' | 'device-flow' | 'pat';
}

export function LoginScreen({ onLogin, onPatLogin, loading, error, authMode }: LoginScreenProps) {
  const [patValue, setPatValue] = useState('');
  const [showPat, setShowPat] = useState(authMode === 'pat');

  const handlePatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (patValue.trim()) {
      onPatLogin(patValue.trim());
    }
  };

  return (
    <div className="pp-login-screen" role="main">
      <h1>Private Pages</h1>
      <p>Sign in with GitHub to view private repository content.</p>
      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}

      {showPat ? (
        <form onSubmit={handlePatSubmit} className="pp-pat-form">
          <label htmlFor="pp-pat-input">Personal Access Token</label>
          <input
            id="pp-pat-input"
            type="password"
            value={patValue}
            onChange={(e) => setPatValue(e.target.value)}
            placeholder="ghp_... or github_pat_..."
            disabled={loading}
            autoComplete="off"
          />
          <button type="submit" disabled={loading || !patValue.trim()} className="pp-login-button">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {authMode !== 'pat' && (
            <button type="button" className="pp-link-button" onClick={() => setShowPat(false)}>
              Use OAuth instead
            </button>
          )}
          <p className="pp-pat-help">
            Generate a token at{' '}
            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">
              github.com/settings/tokens
            </a>{' '}
            with <code>repo</code> scope.
          </p>
        </form>
      ) : (
        <>
          <button
            onClick={onLogin}
            disabled={loading}
            className="pp-login-button"
          >
            {loading ? 'Signing in…' : 'Sign in with GitHub'}
          </button>
          <button type="button" className="pp-link-button" onClick={() => setShowPat(true)}>
            Use a Personal Access Token
          </button>
        </>
      )}
    </div>
  );
}
