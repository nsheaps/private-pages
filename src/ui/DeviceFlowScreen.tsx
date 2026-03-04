import type { DeviceFlowState } from '../auth/types';

export interface DeviceFlowScreenProps {
  state: DeviceFlowState;
  onCancel: () => void;
}

export function DeviceFlowScreen({ state, onCancel }: DeviceFlowScreenProps) {
  if (state.status === 'idle') {
    return null;
  }

  if (state.status === 'error') {
    return (
      <div className="pp-device-flow-screen" role="alert">
        <h1>Authentication Error</h1>
        <p>{state.error}</p>
        <button onClick={onCancel}>Try again</button>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <div className="pp-device-flow-screen" role="status">
        <h1>Authenticated!</h1>
        <p>Loading your content...</p>
      </div>
    );
  }

  return (
    <div className="pp-device-flow-screen" role="status">
      <h1>Sign in with GitHub</h1>
      <p>
        Go to{' '}
        <a
          href={state.verificationUri}
          target="_blank"
          rel="noopener noreferrer"
        >
          {state.verificationUri}
        </a>
      </p>
      <p>and enter this code:</p>
      <div className="pp-user-code" aria-label="Verification code">
        <code>{state.userCode}</code>
      </div>
      <p className="pp-device-flow-hint">
        Waiting for authorization...
      </p>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}
