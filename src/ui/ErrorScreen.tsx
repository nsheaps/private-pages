export interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorScreen({ title, message, onRetry }: ErrorScreenProps) {
  return (
    <div className="pp-error-screen" role="alert">
      <h1>{title ?? 'Something went wrong'}</h1>
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="pp-retry-button">
          Try again
        </button>
      )}
    </div>
  );
}
