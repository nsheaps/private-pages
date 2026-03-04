import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, ConfigError } from '../config/loader';
import { App } from './App';

vi.mock('../config/loader', () => ({
  loadConfig: vi.fn(),
  ConfigError: class ConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConfigError';
    }
  },
}));

const mockLoadConfig = vi.mocked(loadConfig);

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading screen initially', () => {
    mockLoadConfig.mockReturnValue(new Promise(() => {})); // never resolves
    render(<App />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows login screen after config loads', async () => {
    mockLoadConfig.mockResolvedValue({
      github: { clientId: 'Iv1.test', authMode: 'device-flow' as const },
      sites: [
        {
          path: '/',
          repo: 'org/repo',
          branch: 'main',
          directory: '/',
          fetchTtlSeconds: 60,
        },
      ],
    });
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText('Sign in with GitHub to view private repository content.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error screen when config fails', async () => {
    mockLoadConfig.mockRejectedValue(new ConfigError('No config found'));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('No config found')).toBeInTheDocument();
    });
  });
});
