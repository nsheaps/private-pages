import { useState, useCallback } from 'react';
import type { DeviceFlowState } from '../../auth/types';
import type { WizardState, WizardStep, HelpTopic, DirectUrlCredentialMode } from './types';
import { ChooseMethodStep } from './ChooseMethodStep';
import { PatInputStep } from './PatInputStep';
import { GitHubAppStep } from './GitHubAppStep';
import { DeviceFlowStep } from './DeviceFlowStep';
import { DirectUrlStep } from './DirectUrlStep';
import { DirectUrlCredentialsStep } from './DirectUrlCredentialsStep';
import { HelpPage } from './HelpPage';

export interface LoginWizardProps {
  onPatLogin: (token: string) => void;
  onPkceLogin: () => void;
  onDeviceFlowLogin: () => void;
  onDirectUrlLogin: (url: string, auth?: { token?: string; username?: string; password?: string }) => void;
  loading?: boolean;
  error?: string;
  deviceFlowState?: DeviceFlowState;
  onDeviceFlowCancel?: () => void;
  /** Which auth methods are available based on config */
  availableMethods?: {
    pat?: boolean;
    githubApp?: boolean;
    deviceFlow?: boolean;
    directUrl?: boolean;
  };
}

export function LoginWizard({
  onPatLogin,
  onPkceLogin,
  onDeviceFlowLogin,
  onDirectUrlLogin,
  loading,
  error,
  deviceFlowState,
  onDeviceFlowCancel,
  availableMethods,
}: LoginWizardProps) {
  const [state, setState] = useState<WizardState>({ step: 'choose-method' });

  const methods = availableMethods ?? {
    pat: true,
    githubApp: true,
    deviceFlow: true,
    directUrl: true,
  };

  const goTo = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step, error: undefined }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.step === 'direct-url-credentials') {
        return { ...prev, step: 'direct-url', error: undefined };
      }
      if (prev.step === 'help') {
        return { ...prev, step: 'choose-method', error: undefined, helpTopic: undefined };
      }
      return { ...prev, step: 'choose-method', error: undefined };
    });
  }, []);

  const showHelp = useCallback((topic: HelpTopic) => {
    setState((prev) => ({ ...prev, step: 'help', helpTopic: topic }));
  }, []);

  const handleDirectUrlSubmit = useCallback((url: string) => {
    setState((prev) => ({ ...prev, repoUrl: url, loading: true }));
    onDirectUrlLogin(url);
  }, [onDirectUrlLogin]);

  const handleDirectUrlCredentials = useCallback((mode: DirectUrlCredentialMode) => {
    setState((prev) => ({
      ...prev,
      step: 'direct-url-credentials',
      credentialMode: mode,
      anonymousFailed: true,
    }));
  }, []);

  const handleCredentialSubmit = useCallback((auth: { token?: string; username?: string; password?: string }) => {
    if (state.repoUrl) {
      onDirectUrlLogin(state.repoUrl, auth);
    }
  }, [state.repoUrl, onDirectUrlLogin]);

  const displayError = error ?? state.error;

  switch (state.step) {
    case 'choose-method':
      return (
        <ChooseMethodStep
          onChoose={goTo}
          onHelp={() => showHelp('overview')}
          error={displayError}
          availableMethods={methods}
        />
      );

    case 'pat-input':
      return (
        <PatInputStep
          onSubmit={onPatLogin}
          onBack={goBack}
          onHelp={() => showHelp('pat')}
          loading={loading}
          error={displayError}
        />
      );

    case 'github-app':
      return (
        <GitHubAppStep
          onLogin={onPkceLogin}
          onBack={goBack}
          onHelp={() => showHelp('github-app')}
          loading={loading}
          error={displayError}
        />
      );

    case 'device-flow':
      return (
        <DeviceFlowStep
          onLogin={onDeviceFlowLogin}
          onBack={goBack}
          onCancel={onDeviceFlowCancel}
          onHelp={() => showHelp('device-flow')}
          deviceFlowState={deviceFlowState}
          loading={loading}
          error={displayError}
        />
      );

    case 'direct-url':
      return (
        <DirectUrlStep
          onSubmit={handleDirectUrlSubmit}
          onCredentialsFallback={handleDirectUrlCredentials}
          onBack={goBack}
          onHelp={() => showHelp('direct-url')}
          loading={loading}
          error={displayError}
          anonymousFailed={state.anonymousFailed}
        />
      );

    case 'direct-url-credentials':
      return (
        <DirectUrlCredentialsStep
          repoUrl={state.repoUrl ?? ''}
          credentialMode={state.credentialMode ?? 'token'}
          onSubmit={handleCredentialSubmit}
          onChangeMode={(mode) => setState((prev) => ({ ...prev, credentialMode: mode }))}
          onBack={goBack}
          onHelp={() => showHelp('direct-url')}
          loading={loading}
          error={displayError}
        />
      );

    case 'help':
      return (
        <HelpPage
          topic={state.helpTopic ?? 'overview'}
          onBack={goBack}
          onChooseTopic={(topic) => setState((prev) => ({ ...prev, helpTopic: topic }))}
        />
      );
  }
}
