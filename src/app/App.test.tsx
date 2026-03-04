import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />);
    expect(screen.getByText('Private Pages')).toBeInTheDocument();
  });

  it('shows the description text', () => {
    render(<App />);
    expect(
      screen.getByText('Client-only GitHub Pages for private repos.'),
    ).toBeInTheDocument();
  });
});
