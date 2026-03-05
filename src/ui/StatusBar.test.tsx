import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('shows repo name', () => {
    render(<StatusBar syncStatus="idle" repoName="org/repo" />);
    expect(screen.getByText('org/repo')).toBeInTheDocument();
  });

  it('shows truncated commit SHA', () => {
    render(
      <StatusBar syncStatus="idle" commitSha="abc1234567890" />,
    );
    expect(screen.getByText('abc1234')).toBeInTheDocument();
  });

  it('shows syncing status', () => {
    render(<StatusBar syncStatus="syncing" />);
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });

  it('shows sync error', () => {
    render(<StatusBar syncStatus="error" />);
    expect(screen.getByText('Sync error')).toBeInTheDocument();
  });
});
