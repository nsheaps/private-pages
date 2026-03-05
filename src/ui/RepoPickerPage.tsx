import { useCallback, useEffect, useState } from 'react';

export interface RepoPickerPageProps {
  token: string;
  userLogin: string;
  onSelectRepo: (repo: string) => void;
  onLogout: () => void;
}

interface GitHubRepo {
  full_name: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  default_branch: string;
  has_pages: boolean;
}

export function RepoPickerPage({
  token,
  userLogin,
  onSelectRepo,
  onLogout,
}: RepoPickerPageProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState('');

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const allRepos: GitHubRepo[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(
          `https://api.github.com/user/repos?per_page=100&sort=updated&page=${String(page)}&type=all`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
        );
        if (!res.ok) throw new Error(`GitHub API error: ${String(res.status)}`);
        const batch: GitHubRepo[] = await res.json() as GitHubRepo[];
        allRepos.push(...batch);
        hasMore = batch.length === 100;
        page++;
      }
      setRepos(allRepos);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repos');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchRepos();
  }, [fetchRepos]);

  const filtered = filter
    ? repos.filter((r) => r.full_name.toLowerCase().includes(filter.toLowerCase()))
    : repos;

  const privateRepos = filtered.filter((r) => r.private);
  const publicRepos = filtered.filter((r) => !r.private);

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

      <p className="pp-picker-hint">
        Select a repository to view, or navigate directly via{' '}
        <code>#/owner/repo</code> in the URL.
      </p>

      <input
        type="text"
        className="pp-repo-filter"
        placeholder="Filter repositories..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading && <p>Loading repositories...</p>}
      {error && (
        <div className="pp-error" role="alert">
          {error}
          <button onClick={() => void fetchRepos()} className="pp-retry-button">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="pp-site-list">
          {privateRepos.length > 0 && (
            <>
              <h2>Private Repositories</h2>
              <ul>
                {privateRepos.map((repo) => (
                  <RepoCard key={repo.full_name} repo={repo} onSelect={onSelectRepo} />
                ))}
              </ul>
            </>
          )}
          {publicRepos.length > 0 && (
            <>
              <h2>Public Repositories</h2>
              <ul>
                {publicRepos.map((repo) => (
                  <RepoCard key={repo.full_name} repo={repo} onSelect={onSelectRepo} />
                ))}
              </ul>
            </>
          )}
          {filtered.length === 0 && (
            <p>No repositories found{filter ? ` matching "${filter}"` : ''}.</p>
          )}
        </div>
      )}
    </div>
  );
}

function RepoCard({
  repo,
  onSelect,
}: {
  repo: GitHubRepo;
  onSelect: (repo: string) => void;
}) {
  return (
    <li className="pp-site-card">
      <button
        className="pp-site-link"
        onClick={() => onSelect(repo.full_name)}
      >
        <div>
          <span className="pp-site-name">{repo.full_name}</span>
          {repo.description && (
            <span className="pp-repo-description">{repo.description}</span>
          )}
        </div>
        <span className="pp-site-branch">{repo.default_branch}</span>
      </button>
    </li>
  );
}
