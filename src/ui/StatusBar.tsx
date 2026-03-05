export interface StatusBarProps {
  syncStatus: 'idle' | 'syncing' | 'error';
  commitSha?: string;
  lastUpdated?: number;
  repoName?: string;
  branch?: string;
  branches?: string[];
  onBranchChange?: (branch: string) => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function StatusBar({
  syncStatus,
  commitSha,
  lastUpdated,
  repoName,
  branch,
  branches,
  onBranchChange,
}: StatusBarProps) {
  const hasBranchOptions = branches && branches.length > 1 && onBranchChange;

  return (
    <div className="pp-status-bar" role="status">
      {repoName && <span className="pp-status-repo">{repoName}</span>}
      {branch && (
        hasBranchOptions ? (
          <select
            className="pp-status-branch-select"
            value={branch}
            onChange={(e) => onBranchChange(e.target.value)}
            aria-label="Select branch"
          >
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        ) : (
          <span className="pp-status-branch">{branch}</span>
        )
      )}
      {commitSha && (
        <span className="pp-status-sha" title={commitSha}>
          {commitSha.slice(0, 7)}
        </span>
      )}
      <span className="pp-status-sync">
        {syncStatus === 'syncing' && 'Syncing...'}
        {syncStatus === 'error' && 'Sync error'}
        {syncStatus === 'idle' && lastUpdated && `Updated ${formatTimeAgo(lastUpdated)}`}
      </span>
    </div>
  );
}
