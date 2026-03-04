import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingScreen } from './LoadingScreen';

describe('LoadingScreen', () => {
  it('renders loading heading', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows custom message', () => {
    render(<LoadingScreen message="Cloning repository..." />);
    expect(screen.getByText('Cloning repository...')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(
      <LoadingScreen
        progress={{ phase: 'Downloading objects', loaded: 50, total: 100 }}
      />,
    );
    expect(screen.getByText('Downloading objects')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('value', '50');
    expect(progressBar).toHaveAttribute('max', '100');
  });
});
