import { useState } from 'react';

interface PatInputStepProps {
  onSubmit: (token: string) => void;
  onBack: () => void;
  onHome: () => void;
  loading?: boolean;
  error?: string;
}

export function PatInputStep({ onSubmit, loading, error }: PatInputStepProps) {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onSubmit(token.trim());
    }
  };

  return (
    <div className="pp-wizard-screen" role="main" data-testid="wizard-pat-input">
      <div className="pp-wizard-header">
        <h1>Personal Access Token</h1>
        <p>
          Enter a GitHub Personal Access Token with <code>repo</code> scope to access private repositories.
        </p>
      </div>

      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="pp-wizard-form">
        <label htmlFor="pp-wizard-pat-input">Token</label>
        <input
          id="pp-wizard-pat-input"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_... or github_pat_..."
          disabled={loading}
          autoComplete="off"
          className="pp-wizard-input"
        />
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="pp-wizard-button pp-wizard-button-primary"
        >
          {loading ? 'Validating...' : 'Sign in'}
        </button>
      </form>

      <div className="pp-wizard-help-section">
        <p>
          Generate a token at{' '}
          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">
            github.com/settings/tokens
          </a>{' '}
          with <code>repo</code> scope.
        </p>
      </div>
    </div>
  );
}
