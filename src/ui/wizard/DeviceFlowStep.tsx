import type { DeviceFlowState } from '../../auth/types';

interface DeviceFlowStepProps {
  onLogin: () => void;
  onBack: () => void;
  onCancel?: () => void;
  onHelp: () => void;
  deviceFlowState?: DeviceFlowState;
  loading?: boolean;
  error?: string;
}

export function DeviceFlowStep({
  onLogin,
  onBack,
  onCancel,
  onHelp,
  deviceFlowState,
  loading,
  error,
}: DeviceFlowStepProps) {
  const isPolling = deviceFlowState?.status === 'polling';
  const isSuccess = deviceFlowState?.status === 'success';

  if (isSuccess) {
    return (
      <div className="pp-wizard-screen" role="status" data-testid="wizard-device-flow-success">
        <div className="pp-wizard-header">
          <h1>Authenticated!</h1>
          <p>Loading your content...</p>
        </div>
      </div>
    );
  }

  if (isPolling && deviceFlowState) {
    return (
      <div className="pp-wizard-screen" role="status" data-testid="wizard-device-flow-polling">
        <div className="pp-wizard-header">
          <button type="button" className="pp-wizard-back" onClick={onCancel ?? onBack} aria-label="Cancel">
            &larr; Cancel
          </button>
          <h1>Enter Code on GitHub</h1>
          <p>
            Go to{' '}
            <a
              href={deviceFlowState.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
            >
              {deviceFlowState.verificationUri}
            </a>
          </p>
          <p>and enter this code:</p>
        </div>

        <div className="pp-user-code" aria-label="Verification code">
          <code>{deviceFlowState.userCode}</code>
        </div>

        <p className="pp-device-flow-hint">Waiting for authorization...</p>
      </div>
    );
  }

  return (
    <div className="pp-wizard-screen" role="main" data-testid="wizard-device-flow">
      <div className="pp-wizard-header">
        <button type="button" className="pp-wizard-back" onClick={onBack} aria-label="Back">
          &larr; Back
        </button>
        <h1>Device Flow</h1>
        <p>
          Sign in by entering a one-time code on github.com.
          This works well in environments where browser redirects aren't available.
        </p>
      </div>

      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}

      <div className="pp-wizard-actions">
        <button
          onClick={onLogin}
          disabled={loading}
          className="pp-wizard-button pp-wizard-button-primary"
          data-testid="wizard-device-flow-start"
        >
          {loading ? 'Starting...' : 'Start Device Flow'}
        </button>
      </div>

      <div className="pp-wizard-help-section">
        <button type="button" className="pp-link-button" onClick={onHelp} data-testid="wizard-help-link">
          Learn more about Device Flow authentication
        </button>
      </div>
    </div>
  );
}
