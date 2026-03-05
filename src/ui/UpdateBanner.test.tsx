import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UpdateBanner } from './UpdateBanner';

describe('UpdateBanner', () => {
  it('renders update message', () => {
    render(<UpdateBanner onRefresh={vi.fn()} />);
    expect(screen.getByText('A new version is available.')).toBeInTheDocument();
  });

  it('calls onRefresh when button clicked', () => {
    const onRefresh = vi.fn();
    render(<UpdateBanner onRefresh={onRefresh} />);
    screen.getByText('Refresh').click();
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
