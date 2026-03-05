import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorScreen } from './ErrorScreen';

describe('ErrorScreen', () => {
  it('renders default title and message', () => {
    render(<ErrorScreen message="Something broke" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorScreen title="Auth Error" message="Token expired" />);
    expect(screen.getByText('Auth Error')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorScreen message="Error" onRetry={onRetry} />);
    screen.getByText('Try again').click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('hides retry button when no onRetry', () => {
    render(<ErrorScreen message="Error" />);
    expect(screen.queryByText('Try again')).toBeNull();
  });
});
