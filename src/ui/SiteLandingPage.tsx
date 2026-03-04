import type { SiteConfig } from '../config/schema';

export interface SiteLandingPageProps {
  sites: SiteConfig[];
  userLogin: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function SiteLandingPage({
  sites,
  userLogin,
  onNavigate,
  onLogout,
}: SiteLandingPageProps) {
  return (
    <div className="pp-landing-page" role="main">
      <header className="pp-landing-header">
        <h1>Private Pages</h1>
        <div className="pp-user-controls">
          <span>Signed in as {userLogin}</span>
          <button onClick={onLogout} className="pp-logout-button">
            Sign out
          </button>
        </div>
      </header>
      <div className="pp-site-list">
        <h2>Available Sites</h2>
        <ul>
          {sites.map((site) => (
            <li key={site.path} className="pp-site-card">
              <button
                className="pp-site-link"
                onClick={() => onNavigate(site.path)}
              >
                <span className="pp-site-name">{site.repo}</span>
                <span className="pp-site-path">{site.path}</span>
                <span className="pp-site-branch">{site.branch}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
