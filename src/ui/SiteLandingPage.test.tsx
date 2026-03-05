import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SiteLandingPage } from './SiteLandingPage';

const mockSites = [
  { path: '/docs', repo: 'org/docs', branch: 'main', directory: '/', fetchTtlSeconds: 60 },
  { path: '/blog', repo: 'org/blog', branch: 'gh-pages', directory: 'dist/', fetchTtlSeconds: 60 },
];

describe('SiteLandingPage', () => {
  it('renders site list', () => {
    render(
      <SiteLandingPage
        sites={mockSites}
        userLogin="testuser"
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      />,
    );
    expect(screen.getByText('org/docs')).toBeInTheDocument();
    expect(screen.getByText('org/blog')).toBeInTheDocument();
  });

  it('shows user login', () => {
    render(
      <SiteLandingPage
        sites={mockSites}
        userLogin="testuser"
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      />,
    );
    expect(screen.getByText('Signed in as testuser')).toBeInTheDocument();
  });

  it('calls onNavigate when site is clicked', () => {
    const onNavigate = vi.fn();
    render(
      <SiteLandingPage
        sites={mockSites}
        userLogin="testuser"
        onNavigate={onNavigate}
        onLogout={vi.fn()}
      />,
    );
    screen.getByText('org/docs').click();
    expect(onNavigate).toHaveBeenCalledWith('/docs');
  });

  it('calls onLogout', () => {
    const onLogout = vi.fn();
    render(
      <SiteLandingPage
        sites={mockSites}
        userLogin="testuser"
        onNavigate={vi.fn()}
        onLogout={onLogout}
      />,
    );
    screen.getByText('Sign out').click();
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
