export interface LoadingScreenProps {
  message?: string;
  progress?: {
    phase: string;
    loaded: number;
    total: number;
  };
}

export function LoadingScreen({ message, progress }: LoadingScreenProps) {
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : null;

  return (
    <div className="pp-loading-screen" role="status" aria-live="polite">
      <h1>Loading…</h1>
      {message && <p>{message}</p>}
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
    </div>
  );
}
