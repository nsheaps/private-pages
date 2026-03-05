import { useState } from 'react';
import type { DirectUrlCredentialMode } from './types';

interface DirectUrlStepProps {
  onSubmit: (url: string) => void;
  onCredentialsFallback: (mode: DirectUrlCredentialMode) => void;
  onBack: () => void;
  onHome: () => void;
  loading?: boolean;
  error?: string;
  anonymousFailed?: boolean;
}

export function DirectUrlStep({
  onSubmit,
  onCredentialsFallback,
  loading,
  error,
  anonymousFailed,
}: DirectUrlStepProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <div className="pp-wizard-screen" role="main" data-testid="wizard-direct-url">
      <div className="pp-wizard-header">
        <h1>Direct Repository URL</h1>
        <p>
          Enter a Git repository URL from any host (GitHub, GitLab, Bitbucket, self-hosted, etc.).
          We'll try anonymous access first.
        </p>
      </div>

      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="pp-wizard-form">
        <label htmlFor="pp-wizard-url-input">Repository URL</label>
        <input
          id="pp-wizard-url-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo.git"
          disabled={loading}
          className="pp-wizard-input"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="pp-wizard-button pp-wizard-button-primary"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>

      {anonymousFailed && (
        <div className="pp-wizard-fallback" data-testid="wizard-credential-fallback">
          <p>Anonymous access failed. Choose how to authenticate:</p>
          <div className="pp-wizard-fallback-options">
            <button
              type="button"
              className="pp-wizard-button"
              onClick={() => onCredentialsFallback('token')}
            >
              Use a token
            </button>
            <button
              type="button"
              className="pp-wizard-button"
              onClick={() => onCredentialsFallback('username-password')}
            >
              Use username &amp; password
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
