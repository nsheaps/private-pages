import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CloneProgressScreen } from './CloneProgressScreen';

describe('CloneProgressScreen', () => {
  it('shows repo name', () => {
    render(<CloneProgressScreen repoName="org/repo" progress={null} />);
    expect(screen.getByText('org/repo')).toBeInTheDocument();
  });

  it('shows preparing when no progress', () => {
    render(<CloneProgressScreen repoName="org/repo" progress={null} />);
    expect(screen.getByText('Preparing...')).toBeInTheDocument();
  });

  it('shows progress phase and bar', () => {
    render(
      <CloneProgressScreen
        repoName="org/repo"
        progress={{
          phase: 'Receiving objects',
          loaded: 50,
          total: 100,
          lengthComputable: true,
        }}
      />,
    );
    expect(screen.getByText('Receiving objects')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '50');
  });

  it('shows error with retry', () => {
    const onRetry = vi.fn();
    render(
      <CloneProgressScreen
        repoName="org/repo"
        progress={null}
        error="Network error"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Clone Failed')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    screen.getByText('Try again').click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
