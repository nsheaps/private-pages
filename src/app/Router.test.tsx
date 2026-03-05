import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouterProvider, useRouter } from './Router';

function TestComponent() {
  const { route, navigate } = useRouter();
  return (
    <div>
      <span data-testid="path">{route.path}</span>
      <span data-testid="segments">{route.segments.join(',')}</span>
      <button onClick={() => navigate('/test/page')}>Navigate</button>
    </div>
  );
}

describe('Router', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('parses empty hash as root path', () => {
    render(
      <RouterProvider>
        <TestComponent />
      </RouterProvider>,
    );
    expect(screen.getByTestId('path').textContent).toBe('/');
    expect(screen.getByTestId('segments').textContent).toBe('');
  });

  it('parses hash path into segments', () => {
    window.location.hash = '#/docs/guide';
    render(
      <RouterProvider>
        <TestComponent />
      </RouterProvider>,
    );
    expect(screen.getByTestId('path').textContent).toBe('/docs/guide');
    expect(screen.getByTestId('segments').textContent).toBe('docs,guide');
  });

  it('updates route on hashchange', async () => {
    render(
      <RouterProvider>
        <TestComponent />
      </RouterProvider>,
    );

    await act(() => {
      window.location.hash = '#/new/path';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByTestId('path').textContent).toBe('/new/path');
  });

  it('navigate sets the hash', () => {
    render(
      <RouterProvider>
        <TestComponent />
      </RouterProvider>,
    );
    act(() => {
      screen.getByText('Navigate').click();
    });
    expect(window.location.hash).toBe('#/test/page');
  });

  it('throws when useRouter is used outside RouterProvider', () => {
    // Suppress error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      'useRouter must be used within a RouterProvider',
    );
    consoleSpy.mockRestore();
  });
});
