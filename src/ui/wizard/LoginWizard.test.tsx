import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginWizard } from './LoginWizard';

const defaultProps = {
  onPatLogin: vi.fn(),
  onPkceLogin: vi.fn(),
  onDeviceFlowLogin: vi.fn(),
  onDirectUrlLogin: vi.fn(),
};

describe('LoginWizard', () => {
  it('renders the method selection screen by default', () => {
    render(<LoginWizard {...defaultProps} />);
    expect(screen.getByTestId('wizard-choose-method')).toBeInTheDocument();
    expect(screen.getByText('Private Pages')).toBeInTheDocument();
    expect(screen.getByText('Choose how you\'d like to connect to your repository.')).toBeInTheDocument();
  });

  it('shows all enabled methods', () => {
    render(
      <LoginWizard
        {...defaultProps}
        availableMethods={{ pat: true, githubApp: true, deviceFlow: true, directUrl: true }}
      />,
    );
    expect(screen.getByTestId('wizard-option-github-app')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-option-device-flow')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-option-pat-input')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-option-direct-url')).toBeInTheDocument();
  });

  it('hides disabled methods', () => {
    render(
      <LoginWizard
        {...defaultProps}
        availableMethods={{ pat: true, githubApp: false, deviceFlow: false, directUrl: true }}
      />,
    );
    expect(screen.queryByTestId('wizard-option-github-app')).not.toBeInTheDocument();
    expect(screen.queryByTestId('wizard-option-device-flow')).not.toBeInTheDocument();
    expect(screen.getByTestId('wizard-option-pat-input')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-option-direct-url')).toBeInTheDocument();
  });

  it('navigates to PAT input when PAT option is clicked', () => {
    render(<LoginWizard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('wizard-option-pat-input'));
    expect(screen.getByTestId('wizard-pat-input')).toBeInTheDocument();
  });

  it('navigates to GitHub App when option is clicked', () => {
    render(<LoginWizard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('wizard-option-github-app'));
    expect(screen.getByTestId('wizard-github-app')).toBeInTheDocument();
  });

  it('navigates to Device Flow when option is clicked', () => {
    render(<LoginWizard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('wizard-option-device-flow'));
    expect(screen.getByTestId('wizard-device-flow')).toBeInTheDocument();
  });

  it('navigates to Direct URL when option is clicked', () => {
    render(<LoginWizard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('wizard-option-direct-url'));
    expect(screen.getByTestId('wizard-direct-url')).toBeInTheDocument();
  });

  it('navigates back from PAT input to method selection', () => {
    render(<LoginWizard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('wizard-option-pat-input'));
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByTestId('wizard-choose-method')).toBeInTheDocument();
  });

  it('shows help page when help link is clicked', () => {
    render(<LoginWizard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('wizard-help-link'));
    expect(screen.getByTestId('wizard-help-page')).toBeInTheDocument();
  });

  it('calls onPatLogin when token is submitted', () => {
    const onPatLogin = vi.fn();
    render(<LoginWizard {...defaultProps} onPatLogin={onPatLogin} />);
    fireEvent.click(screen.getByTestId('wizard-option-pat-input'));

    const input = screen.getByLabelText('Token');
    fireEvent.change(input, { target: { value: 'ghp_test123' } });
    fireEvent.submit(input.closest('form')!);

    expect(onPatLogin).toHaveBeenCalledWith('ghp_test123');
  });

  it('calls onPkceLogin when GitHub App login is clicked', () => {
    const onPkceLogin = vi.fn();
    render(<LoginWizard {...defaultProps} onPkceLogin={onPkceLogin} />);
    fireEvent.click(screen.getByTestId('wizard-option-github-app'));
    fireEvent.click(screen.getByTestId('wizard-github-app-login'));

    expect(onPkceLogin).toHaveBeenCalledOnce();
  });

  it('calls onDeviceFlowLogin when device flow is started', () => {
    const onDeviceFlowLogin = vi.fn();
    render(<LoginWizard {...defaultProps} onDeviceFlowLogin={onDeviceFlowLogin} />);
    fireEvent.click(screen.getByTestId('wizard-option-device-flow'));
    fireEvent.click(screen.getByTestId('wizard-device-flow-start'));

    expect(onDeviceFlowLogin).toHaveBeenCalledOnce();
  });

  it('displays error message', () => {
    render(<LoginWizard {...defaultProps} error="Auth failed" />);
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });

  it('navigates through help topics', () => {
    render(<LoginWizard {...defaultProps} />);
    fireEvent.click(screen.getByTestId('wizard-help-link'));
    expect(screen.getByTestId('help-overview')).toBeInTheDocument();

    // Click the nav button specifically (not the heading in content)
    const nav = screen.getByRole('navigation', { name: 'Help topics' });
    fireEvent.click(nav.querySelector('button:nth-child(2)')!);
    expect(screen.getByTestId('help-pat')).toBeInTheDocument();

    fireEvent.click(nav.querySelector('button:nth-child(4)')!);
    expect(screen.getByTestId('help-device-flow')).toBeInTheDocument();
  });
});
