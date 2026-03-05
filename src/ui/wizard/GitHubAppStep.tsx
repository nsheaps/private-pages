interface GitHubAppStepProps {
  onLogin: () => void;
  onBack: () => void;
  onHome: () => void;
  loading?: boolean;
  error?: string;
}

export function GitHubAppStep({ onLogin, loading, error }: GitHubAppStepProps) {
  return (
    <div className="pp-wizard-screen" role="main" data-testid="wizard-github-app">
      <div className="pp-wizard-header">
        <h1>Sign in with GitHub</h1>
        <p>
          You'll be redirected to GitHub to authorize this application.
          After authorization, you'll be returned here automatically.
        </p>
      </div>

      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}

      <div className="pp-wizard-actions">
        <button
          onClick={onLogin}
          disabled={loading}
          className="pp-wizard-button pp-wizard-button-primary"
          data-testid="wizard-github-app-login"
        >
          {loading ? 'Redirecting...' : 'Continue to GitHub'}
        </button>
      </div>

      <div className="pp-wizard-help-section">
        <p>This uses the secure PKCE OAuth flow. No secrets are stored on any server.</p>
      </div>
    </div>
  );
}
