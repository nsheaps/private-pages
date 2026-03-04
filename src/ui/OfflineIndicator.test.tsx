import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('renders nothing when online', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('shows offline message when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    render(<OfflineIndicator />);
    expect(
      screen.getByText('You are offline. Cached content is still available.'),
    ).toBeInTheDocument();
  });

  it('updates on offline/online events', () => {
    render(<OfflineIndicator />);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(
      screen.getByText('You are offline. Cached content is still available.'),
    ).toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(
      screen.queryByText('You are offline. Cached content is still available.'),
    ).toBeNull();
  });
});
