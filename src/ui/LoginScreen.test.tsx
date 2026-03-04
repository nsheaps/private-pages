import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('renders login prompt', () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    expect(screen.getByText('Private Pages')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in with GitHub to view private repository content.'),
    ).toBeInTheDocument();
  });

  it('calls onLogin when button is clicked', () => {
    const onLogin = vi.fn();
    render(<LoginScreen onLogin={onLogin} />);
    screen.getByText('Sign in with GitHub').click();
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('shows loading state', () => {
    render(<LoginScreen onLogin={vi.fn()} loading />);
    expect(screen.getByText('Signing in…')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('displays error message', () => {
    render(<LoginScreen onLogin={vi.fn()} error="Auth failed" />);
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });
});
