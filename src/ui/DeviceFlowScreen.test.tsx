import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeviceFlowScreen } from './DeviceFlowScreen';

describe('DeviceFlowScreen', () => {
  it('renders nothing when idle', () => {
    const { container } = render(
      <DeviceFlowScreen state={{ status: 'idle' }} onCancel={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows user code when polling', () => {
    render(
      <DeviceFlowScreen
        state={{
          status: 'polling',
          userCode: 'ABCD-1234',
          verificationUri: 'https://github.com/login/device',
        }}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('ABCD-1234')).toBeInTheDocument();
    expect(screen.getByText('Waiting for authorization...')).toBeInTheDocument();
  });

  it('shows verification link', () => {
    render(
      <DeviceFlowScreen
        state={{
          status: 'polling',
          userCode: 'ABCD-1234',
          verificationUri: 'https://github.com/login/device',
        }}
        onCancel={vi.fn()}
      />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/login/device');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows success message', () => {
    render(
      <DeviceFlowScreen state={{ status: 'success' }} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('Authenticated!')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(
      <DeviceFlowScreen
        state={{ status: 'error', error: 'Token expired' }}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Token expired')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <DeviceFlowScreen
        state={{
          status: 'polling',
          userCode: 'ABCD-1234',
          verificationUri: 'https://github.com/login/device',
        }}
        onCancel={onCancel}
      />,
    );
    screen.getByText('Cancel').click();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
