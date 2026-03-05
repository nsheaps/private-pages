import type { HelpTopic } from './types';

interface HelpPageProps {
  topic: HelpTopic;
  onBack: () => void;
  onChooseTopic: (topic: HelpTopic) => void;
}

const SCREENSHOT_BASE = 'docs/screenshots';

export function HelpPage({ topic, onBack, onChooseTopic }: HelpPageProps) {
  return (
    <div className="pp-wizard-screen pp-wizard-help" role="main" data-testid="wizard-help-page">
      <div className="pp-wizard-header">
        <button type="button" className="pp-wizard-back" onClick={onBack} aria-label="Back">
          &larr; Back
        </button>
        <h1>Authentication Help</h1>
      </div>

      <nav className="pp-help-nav" aria-label="Help topics">
        <button
          type="button"
          className={`pp-help-nav-item ${topic === 'overview' ? 'pp-help-nav-active' : ''}`}
          onClick={() => onChooseTopic('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`pp-help-nav-item ${topic === 'pat' ? 'pp-help-nav-active' : ''}`}
          onClick={() => onChooseTopic('pat')}
        >
          Personal Access Token
        </button>
        <button
          type="button"
          className={`pp-help-nav-item ${topic === 'github-app' ? 'pp-help-nav-active' : ''}`}
          onClick={() => onChooseTopic('github-app')}
        >
          GitHub App
        </button>
        <button
          type="button"
          className={`pp-help-nav-item ${topic === 'device-flow' ? 'pp-help-nav-active' : ''}`}
          onClick={() => onChooseTopic('device-flow')}
        >
          Device Flow
        </button>
        <button
          type="button"
          className={`pp-help-nav-item ${topic === 'direct-url' ? 'pp-help-nav-active' : ''}`}
          onClick={() => onChooseTopic('direct-url')}
        >
          Direct URL
        </button>
      </nav>

      <div className="pp-help-content">
        {topic === 'overview' && <OverviewHelp />}
        {topic === 'pat' && <PatHelp />}
        {topic === 'github-app' && <GitHubAppHelp />}
        {topic === 'device-flow' && <DeviceFlowHelp />}
        {topic === 'direct-url' && <DirectUrlHelp />}
      </div>
    </div>
  );
}

function OverviewHelp() {
  return (
    <div data-testid="help-overview">
      <h2>Choosing an Authentication Method</h2>
      <p>
        Private Pages supports multiple ways to access your repositories.
        The best method depends on your setup:
      </p>
      <table className="pp-help-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Best for</th>
            <th>Requires</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>GitHub App (PKCE)</strong></td>
            <td>Team deployments with a configured GitHub App</td>
            <td>GitHub App Client ID</td>
          </tr>
          <tr>
            <td><strong>Device Flow</strong></td>
            <td>Restricted environments (kiosks, embedded browsers)</td>
            <td>GitHub App Client ID</td>
          </tr>
          <tr>
            <td><strong>Personal Access Token</strong></td>
            <td>Quick personal setup, no app registration needed</td>
            <td>GitHub PAT with <code>repo</code> scope</td>
          </tr>
          <tr>
            <td><strong>Direct URL</strong></td>
            <td>Non-GitHub repos, public repos, any Git host</td>
            <td>Repository clone URL</td>
          </tr>
        </tbody>
      </table>
      <img
        src={`${SCREENSHOT_BASE}/wizard-choose-method.png`}
        alt="Screenshot of the authentication method selection screen"
        className="pp-help-screenshot"
        loading="lazy"
      />
    </div>
  );
}

function PatHelp() {
  return (
    <div data-testid="help-pat">
      <h2>Personal Access Token (PAT)</h2>
      <p>
        A Personal Access Token is the simplest way to authenticate. You create a token on GitHub
        and paste it here. No OAuth app registration is needed.
      </p>

      <h3>How to create a PAT</h3>
      <ol>
        <li>
          Go to{' '}
          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">
            github.com/settings/tokens
          </a>
        </li>
        <li>Click <strong>Generate new token</strong> (classic) or <strong>Generate new token (fine-grained)</strong></li>
        <li>For classic tokens: select the <code>repo</code> scope</li>
        <li>For fine-grained tokens: select the repositories you want to access and grant <strong>Contents: Read</strong></li>
        <li>Copy the token and paste it in the login screen</li>
      </ol>
      <img
        src={`${SCREENSHOT_BASE}/wizard-pat-input.png`}
        alt="Screenshot of the PAT input screen"
        className="pp-help-screenshot"
        loading="lazy"
      />

      <h3>Security notes</h3>
      <ul>
        <li>Your token is encrypted with AES-GCM and stored locally in your browser</li>
        <li>The encryption key is stored in OPFS (Origin Private File System)</li>
        <li>No server ever sees your token — all processing is client-side</li>
        <li>Use fine-grained tokens for minimum permissions</li>
      </ul>
    </div>
  );
}

function GitHubAppHelp() {
  return (
    <div data-testid="help-github-app">
      <h2>GitHub App (PKCE OAuth)</h2>
      <p>
        This is the recommended method for team deployments. A GitHub App is registered once,
        and team members authorize it through a secure browser redirect.
      </p>

      <h3>How it works</h3>
      <ol>
        <li>Click <strong>Continue to GitHub</strong></li>
        <li>You're redirected to GitHub to authorize the app</li>
        <li>After authorization, you're returned here automatically</li>
        <li>The token is exchanged using PKCE (no client secret needed)</li>
      </ol>
      <img
        src={`${SCREENSHOT_BASE}/wizard-github-app.png`}
        alt="Screenshot of the GitHub App login screen"
        className="pp-help-screenshot"
        loading="lazy"
      />

      <h3>For administrators</h3>
      <p>
        To set up a GitHub App for your organization:
      </p>
      <ol>
        <li>Create a GitHub App at <strong>Settings &rarr; Developer settings &rarr; GitHub Apps</strong></li>
        <li>Set the callback URL to your deployment URL</li>
        <li>Request <strong>Contents: Read</strong> repository permission</li>
        <li>Add the Client ID to your Private Pages configuration</li>
      </ol>
    </div>
  );
}

function DeviceFlowHelp() {
  return (
    <div data-testid="help-device-flow">
      <h2>Device Flow</h2>
      <p>
        The Device Flow is designed for environments where browser redirects don't work well,
        such as CLI tools, embedded browsers, or shared terminals.
      </p>

      <h3>How it works</h3>
      <ol>
        <li>Click <strong>Start Device Flow</strong></li>
        <li>A one-time code is displayed (e.g., <code>ABCD-1234</code>)</li>
        <li>Open <a href="https://github.com/login/device" target="_blank" rel="noopener noreferrer">github.com/login/device</a> in any browser</li>
        <li>Enter the code and authorize the app</li>
        <li>This page automatically detects the authorization</li>
      </ol>
      <img
        src={`${SCREENSHOT_BASE}/wizard-device-flow.png`}
        alt="Screenshot of the Device Flow code entry screen"
        className="pp-help-screenshot"
        loading="lazy"
      />

      <h3>When to use this</h3>
      <ul>
        <li>When popup blockers prevent the GitHub App redirect</li>
        <li>On devices where you can't easily paste a token</li>
        <li>In restricted browser environments</li>
      </ul>
    </div>
  );
}

function DirectUrlHelp() {
  return (
    <div data-testid="help-direct-url">
      <h2>Direct Repository URL</h2>
      <p>
        Access any Git repository by URL �� not just GitHub. This works with GitLab, Bitbucket,
        Gitea, self-hosted instances, or any server that speaks the Git HTTP protocol.
      </p>

      <h3>How it works</h3>
      <ol>
        <li>Enter the repository's clone URL (HTTPS)</li>
        <li>We try to pull the repository anonymously first</li>
        <li>If anonymous access fails, you'll be prompted for credentials</li>
        <li>Choose between a token or username/password authentication</li>
      </ol>
      <img
        src={`${SCREENSHOT_BASE}/wizard-direct-url.png`}
        alt="Screenshot of the direct URL input screen"
        className="pp-help-screenshot"
        loading="lazy"
      />

      <h3>Supported URL formats</h3>
      <ul>
        <li><code>https://github.com/owner/repo.git</code></li>
        <li><code>https://gitlab.com/owner/repo.git</code></li>
        <li><code>https://git.example.com/repo.git</code></li>
      </ul>

      <h3>Authentication options</h3>
      <p>If the repository requires authentication, you can provide:</p>
      <ul>
        <li><strong>Token:</strong> A personal access token or deploy token</li>
        <li><strong>Username &amp; Password:</strong> Your Git credentials (some hosts use a token as the password)</li>
      </ul>
      <img
        src={`${SCREENSHOT_BASE}/wizard-direct-url-credentials.png`}
        alt="Screenshot of the credential entry screen for direct URL access"
        className="pp-help-screenshot"
        loading="lazy"
      />
    </div>
  );
}
