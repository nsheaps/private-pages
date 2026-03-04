import type { CloneProgress } from '../git/types';

export interface CloneProgressScreenProps {
  repoName: string;
  progress: CloneProgress | null;
  error?: string;
  onRetry?: () => void;
}

export function CloneProgressScreen({
  repoName,
  progress,
  error,
  onRetry,
}: CloneProgressScreenProps) {
  if (error) {
    return (
      <div className="pp-loading-screen" role="alert">
        <h1>Clone Failed</h1>
        <p>Could not clone {repoName}</p>
        <p className="pp-error">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="pp-retry-button">
            Try again
          </button>
        )}
      </div>
    );
  }

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : null;

  return (
    <div className="pp-loading-screen" role="status" aria-live="polite">
      <h1>Cloning Repository</h1>
      <p>{repoName}</p>
      {progress && (
        <div className="pp-progress">
          <p>{progress.phase}</p>
          {percent !== null && (
            <progress value={progress.loaded} max={progress.total}>
              {percent}%
            </progress>
          )}
        </div>
      )}
      {!progress && <p>Preparing...</p>}
    </div>
  );
}
