import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <div id="private-pages-app">
        <h1>Private Pages</h1>
        <p>Client-only GitHub Pages for private repos.</p>
      </div>
    </ErrorBoundary>
  );
}
