export function SetupPage() {
  return (
    <div className="pp-setup-page" role="main">
      <h1>Private Pages</h1>
      <p>
        View private GitHub repository content as static sites, entirely in the browser.
      </p>

      <h2>Quick Start</h2>
      <p>
        This app needs a GitHub App for authentication. Follow these steps to get started:
      </p>

      <ol className="pp-setup-steps">
        <li>
          <strong>Create a GitHub App</strong>
          <p>
            Go to{' '}
            <a
              href="https://github.com/settings/apps/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Settings &rarr; Developer settings &rarr; GitHub Apps &rarr; New GitHub App
            </a>
          </p>
          <ul>
            <li>
              <strong>App name:</strong> anything (e.g. &quot;My Private Pages&quot;)
            </li>
            <li>
              <strong>Homepage URL:</strong> your deployed app URL
            </li>
            <li>
              <strong>Callback URL:</strong> your deployed app URL (e.g.{' '}
              <code>https://yourdomain.github.io/private-pages/app/</code>)
            </li>
            <li>
              <strong>Check</strong> &quot;Enable Device Flow&quot; (fallback for preview deploys)
            </li>
            <li>
              <strong>Permissions:</strong> Repository contents → Read-only
            </li>
            <li>
              <strong>Where can this app be installed?</strong> &quot;Only on this account&quot;
            </li>
          </ul>
        </li>

        <li>
          <strong>Copy your Client ID</strong>
          <p>
            After creating the app, copy the <strong>Client ID</strong> (starts with{' '}
            <code>Iv...</code>). You do <em>not</em> need a client secret.
          </p>
        </li>

        <li>
          <strong>Configure this app</strong>
          <p>Create a <code>config.json</code> in the app root:</p>
          <pre>
{`{
  "github": {
    "clientId": "Iv1.your_client_id",
    "callbackUrl": "https://yourdomain.github.io/private-pages/app/"
  }
}`}
          </pre>
          <p>
            Or pass config via URL:{' '}
            <code>?client_id=Iv1.xxx&amp;callback_url=https://...</code>
          </p>
        </li>

        <li>
          <strong>Install the GitHub App</strong>
          <p>
            Install it on your account/org and grant access to the repos you want to view.
          </p>
        </li>
      </ol>

      <h2>How It Works</h2>
      <ul>
        <li>PKCE OAuth flow (click &quot;Sign in with GitHub&quot; &mdash; no codes to copy)</li>
        <li>
          Falls back to Device Flow automatically for preview deployments where the
          callback URL doesn&apos;t match
        </li>
        <li>Clones repos into browser storage (OPFS) using isomorphic-git</li>
        <li>Renders static site content in a sandboxed iframe</li>
        <li>No backend server &mdash; everything runs in the browser</li>
      </ul>
    </div>
  );
}
