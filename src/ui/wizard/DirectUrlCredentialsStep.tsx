import { useState } from 'react';
import type { DirectUrlCredentialMode } from './types';

interface DirectUrlCredentialsStepProps {
  repoUrl: string;
  credentialMode: DirectUrlCredentialMode;
  onSubmit: (auth: { token?: string; username?: string; password?: string }) => void;
  onChangeMode: (mode: DirectUrlCredentialMode) => void;
  onBack: () => void;
  onHelp: () => void;
  loading?: boolean;
  error?: string;
}

export function DirectUrlCredentialsStep({
  repoUrl,
  credentialMode,
  onSubmit,
  onChangeMode,
  onBack,
  onHelp,
  loading,
  error,
}: DirectUrlCredentialsStepProps) {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentialMode === 'token' && token.trim()) {
      onSubmit({ token: token.trim() });
    } else if (credentialMode === 'username-password' && username.trim()) {
      onSubmit({ username: username.trim(), password });
    }
  };

  const canSubmit =
    credentialMode === 'token'
      ? token.trim().length > 0
      : username.trim().length > 0;

  return (
    <div className="pp-wizard-screen" role="main" data-testid="wizard-direct-url-credentials">
      <div className="pp-wizard-header">
        <button type="button" className="pp-wizard-back" onClick={onBack} aria-label="Back">
          &larr; Back
        </button>
        <h1>Authenticate Repository</h1>
        <p>
          Provide credentials for <code>{repoUrl}</code>
        </p>
      </div>

      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}

      <div className="pp-wizard-mode-tabs">
        <button
          type="button"
          className={`pp-wizard-tab ${credentialMode === 'token' ? 'pp-wizard-tab-active' : ''}`}
          onClick={() => onChangeMode('token')}
        >
          Token
        </button>
        <button
          type="button"
          className={`pp-wizard-tab ${credentialMode === 'username-password' ? 'pp-wizard-tab-active' : ''}`}
          onClick={() => onChangeMode('username-password')}
        >
          Username &amp; Password
        </button>
      </div>

      <form onSubmit={handleSubmit} className="pp-wizard-form">
        {credentialMode === 'token' ? (
          <>
            <label htmlFor="pp-wizard-cred-token">Access Token</label>
            <input
              id="pp-wizard-cred-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token or PAT"
              disabled={loading}
              autoComplete="off"
              className="pp-wizard-input"
            />
          </>
        ) : (
          <>
            <label htmlFor="pp-wizard-cred-username">Username</label>
            <input
              id="pp-wizard-cred-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={loading}
              autoComplete="username"
              className="pp-wizard-input"
            />
            <label htmlFor="pp-wizard-cred-password">Password</label>
            <input
              id="pp-wizard-cred-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password or token"
              disabled={loading}
              autoComplete="current-password"
              className="pp-wizard-input"
            />
          </>
        )}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="pp-wizard-button pp-wizard-button-primary"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>

      <div className="pp-wizard-help-section">
        <button type="button" className="pp-link-button" onClick={onHelp} data-testid="wizard-help-link">
          Learn more about repository authentication
        </button>
      </div>
    </div>
  );
}
