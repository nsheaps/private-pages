import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  const defaultProps = { onLogin: vi.fn(), onPatLogin: vi.fn() };

  it('renders login prompt', () => {
    render(<LoginScreen {...defaultProps} />);
    expect(screen.getByText('Private Pages')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in with GitHub to view private repository content.'),
    ).toBeInTheDocument();
  });

  it('calls onLogin when OAuth button is clicked', () => {
    const onLogin = vi.fn();
    render(<LoginScreen {...defaultProps} onLogin={onLogin} />);
    screen.getByText('Sign in with GitHub').click();
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('shows PAT input when link is clicked', () => {
    render(<LoginScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Use a Personal Access Token'));
    expect(screen.getByLabelText('Personal Access Token')).toBeInTheDocument();
  });

  it('shows PAT input by default in pat mode', () => {
    render(<LoginScreen {...defaultProps} authMode="pat" />);
    expect(screen.getByLabelText('Personal Access Token')).toBeInTheDocument();
  });

  it('calls onPatLogin with token value', () => {
    const onPatLogin = vi.fn();
    render(<LoginScreen {...defaultProps} onPatLogin={onPatLogin} authMode="pat" />);
    fireEvent.change(screen.getByLabelText('Personal Access Token'), {
      target: { value: 'ghp_test123' },
    });
    fireEvent.submit(screen.getByLabelText('Personal Access Token').closest('form')!);
    expect(onPatLogin).toHaveBeenCalledWith('ghp_test123');
  });

  it('displays error message', () => {
    render(<LoginScreen {...defaultProps} error="Auth failed" />);
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });
});
