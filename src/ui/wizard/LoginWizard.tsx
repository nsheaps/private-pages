import { useState, useCallback, useRef, useEffect } from 'react';
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

/** Steps ordered by depth for determining slide direction */
const STEP_DEPTH: Record<WizardStep, number> = {
  'choose-method': 0,
  'pat-input': 1,
  'github-app': 1,
  'device-flow': 1,
  'direct-url': 1,
  'direct-url-credentials': 2,
  'help': 1,
};

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
  const [slideDirection, setSlideDirection] = useState<'none' | 'left' | 'right'>('none');
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const methods = availableMethods ?? {
    pat: true,
    githubApp: true,
    deviceFlow: true,
    directUrl: true,
  };

  const navigateTo = useCallback((nextStep: WizardStep, currentStep: WizardStep) => {
    const direction = STEP_DEPTH[nextStep] >= STEP_DEPTH[currentStep] ? 'left' : 'right';
    setSlideDirection(direction);
    setAnimating(true);
  }, []);

  // When animation starts, wait for the exit animation then update state
  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => {
      setAnimating(false);
      setSlideDirection('none');
    }, 200);
    return () => clearTimeout(timer);
  }, [animating]);

  const goTo = useCallback((step: WizardStep) => {
    navigateTo(step, state.step);
    setState((prev) => ({ ...prev, step, error: undefined }));
  }, [navigateTo, state.step]);

  const goHome = useCallback(() => {
    navigateTo('choose-method', state.step);
    setState((prev) => ({ ...prev, step: 'choose-method', error: undefined }));
  }, [navigateTo, state.step]);

  const goBack = useCallback(() => {
    setState((prev) => {
      const nextStep = prev.step === 'direct-url-credentials' ? 'direct-url' : 'choose-method';
      navigateTo(nextStep, prev.step);
      if (prev.step === 'help') {
        return { ...prev, step: 'choose-method', error: undefined, helpTopic: undefined };
      }
      return { ...prev, step: nextStep as WizardStep, error: undefined };
    });
  }, [navigateTo]);

  const showHelp = useCallback((topic: HelpTopic) => {
    navigateTo('help', state.step);
    setState((prev) => ({ ...prev, step: 'help', helpTopic: topic }));
  }, [navigateTo, state.step]);

  const handleDirectUrlSubmit = useCallback((url: string) => {
    setState((prev) => ({ ...prev, repoUrl: url, loading: true }));
    onDirectUrlLogin(url);
  }, [onDirectUrlLogin]);

  const handleDirectUrlCredentials = useCallback((mode: DirectUrlCredentialMode) => {
    navigateTo('direct-url-credentials', 'direct-url');
    setState((prev) => ({
      ...prev,
      step: 'direct-url-credentials',
      credentialMode: mode,
      anonymousFailed: true,
    }));
  }, [navigateTo]);

  const handleCredentialSubmit = useCallback((auth: { token?: string; username?: string; password?: string }) => {
    if (state.repoUrl) {
      onDirectUrlLogin(state.repoUrl, auth);
    }
  }, [state.repoUrl, onDirectUrlLogin]);

  const displayError = error ?? state.error;

  const isHome = state.step === 'choose-method';

  // Build the slide animation class
  let slideClass = '';
  if (animating && slideDirection === 'left') slideClass = ' pp-wizard-slide-exit-left';
  else if (animating && slideDirection === 'right') slideClass = ' pp-wizard-slide-exit-right';
  else if (!animating && slideDirection === 'none') slideClass = ' pp-wizard-slide-enter';

  const stepContent = (() => {
    switch (state.step) {
      case 'choose-method':
        return (
          <ChooseMethodStep
            onChoose={goTo}
            error={displayError}
            availableMethods={methods}
          />
        );

      case 'pat-input':
        return (
          <PatInputStep
            onSubmit={onPatLogin}
            onBack={goBack}
            onHome={goHome}
            loading={loading}
            error={displayError}
          />
        );

      case 'github-app':
        return (
          <GitHubAppStep
            onLogin={onPkceLogin}
            onBack={goBack}
            onHome={goHome}
            loading={loading}
            error={displayError}
          />
        );

      case 'device-flow':
        return (
          <DeviceFlowStep
            onLogin={onDeviceFlowLogin}
            onBack={goBack}
            onHome={goHome}
            onCancel={onDeviceFlowCancel}
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
            onHome={goHome}
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
            onHome={goHome}
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
  })();

  return (
    <div className="pp-wizard-container" ref={containerRef}>
      <div className="pp-wizard-topbar">
        {!isHome && (
          <button type="button" className="pp-wizard-back" onClick={goBack} aria-label="Back">
            &larr; Back
          </button>
        )}
        <div className="pp-wizard-topbar-spacer" />
        <button
          type="button"
          className="pp-link-button"
          onClick={() => showHelp('overview')}
          data-testid="wizard-help-link"
        >
          Help
        </button>
      </div>
      <div className={`pp-wizard-step-wrapper${slideClass}`}>
        {stepContent}
      </div>
    </div>
  );
}
