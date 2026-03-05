import { useState, useCallback, useEffect, useRef } from 'react';
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

const VALID_STEPS = new Set<string>(Object.keys(STEP_DEPTH));

function isWizardStep(value: unknown): value is WizardStep {
  return typeof value === 'string' && VALID_STEPS.has(value);
}

/** Build the hash fragment for a wizard step */
function stepToHash(step: WizardStep): string {
  if (step === 'choose-method') return '#/login';
  return `#/login/${step}`;
}

/** Parse the current hash to a wizard step, or null if it doesn't match */
function hashToStep(): WizardStep | null {
  const hash = window.location.hash;
  if (!hash || hash === '#/' || hash === '#/login') return 'choose-method';
  const match = hash.match(/^#\/login\/(.+)$/);
  if (match && isWizardStep(match[1])) return match[1];
  return null;
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
  // Initialize from hash if it contains a valid wizard step
  const initialStep = hashToStep() ?? 'choose-method';
  const [state, setState] = useState<WizardState>({ step: initialStep });
  const [slideDirection, setSlideDirection] = useState<'none' | 'forward' | 'back'>('none');
  const currentStepRef = useRef(state.step);
  currentStepRef.current = state.step;

  const methods = availableMethods ?? {
    pat: true,
    githubApp: true,
    deviceFlow: true,
    directUrl: true,
  };

  // Set the initial hash on mount if it doesn't already point to a wizard step
  useEffect(() => {
    const current = hashToStep();
    if (current === null) {
      window.history.replaceState({ wizardStep: 'choose-method' }, '', stepToHash('choose-method'));
    } else {
      window.history.replaceState({ wizardStep: current }, '', stepToHash(current));
    }
  }, []);

  // Listen for browser back/forward button
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const step = event.state?.wizardStep;
      if (isWizardStep(step)) {
        // Returning from or to help shouldn't slide — it's not a wizard step
        const isHelpTransition = step === 'help' || currentStepRef.current === 'help';
        setSlideDirection(isHelpTransition ? 'none' : 'back');
        setState((prev) => {
          if (step === 'choose-method') {
            return { ...prev, step, error: undefined, helpTopic: undefined };
          }
          return { ...prev, step, error: undefined };
        });
      } else {
        // Try parsing from hash as fallback
        const fromHash = hashToStep();
        const target = fromHash ?? 'choose-method';
        setSlideDirection('none');
        setState((prev) => ({ ...prev, step: target, error: undefined, helpTopic: undefined }));
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((nextStep: WizardStep, currentStep: WizardStep) => {
    const direction = STEP_DEPTH[nextStep] >= STEP_DEPTH[currentStep] ? 'forward' : 'back';
    setSlideDirection(direction);
  }, []);

  /** Push a new history entry for the given step */
  const pushStep = useCallback((step: WizardStep) => {
    window.history.pushState({ wizardStep: step }, '', stepToHash(step));
  }, []);

  const goTo = useCallback((step: WizardStep) => {
    navigateTo(step, state.step);
    pushStep(step);
    setState((prev) => ({ ...prev, step, error: undefined }));
  }, [navigateTo, state.step, pushStep]);

  const goHome = useCallback(() => {
    navigateTo('choose-method', state.step);
    pushStep('choose-method');
    setState((prev) => ({ ...prev, step: 'choose-method', error: undefined }));
  }, [navigateTo, state.step, pushStep]);

  const goBack = useCallback(() => {
    // Use browser history so the back button stays consistent
    window.history.back();
  }, []);

  const showHelp = useCallback((topic: HelpTopic) => {
    // Help is an overlay — no slide animation, and replaceState so repeated
    // clicks don't stack history entries (back always returns to the previous step).
    setSlideDirection('none');
    if (state.step === 'help') {
      // Already on help — just switch topic, keep same history entry
      setState((prev) => ({ ...prev, helpTopic: topic }));
    } else {
      window.history.pushState({ wizardStep: 'help' }, '', stepToHash('help'));
      setState((prev) => ({ ...prev, step: 'help', helpTopic: topic }));
    }
  }, [state.step]);

  const handleDirectUrlSubmit = useCallback((url: string) => {
    setState((prev) => ({ ...prev, repoUrl: url, loading: true }));
    onDirectUrlLogin(url);
  }, [onDirectUrlLogin]);

  const handleDirectUrlCredentials = useCallback((mode: DirectUrlCredentialMode) => {
    navigateTo('direct-url-credentials', 'direct-url');
    pushStep('direct-url-credentials');
    setState((prev) => ({
      ...prev,
      step: 'direct-url-credentials',
      credentialMode: mode,
      anonymousFailed: true,
    }));
  }, [navigateTo, pushStep]);

  const handleCredentialSubmit = useCallback((auth: { token?: string; username?: string; password?: string }) => {
    if (state.repoUrl) {
      onDirectUrlLogin(state.repoUrl, auth);
    }
  }, [state.repoUrl, onDirectUrlLogin]);

  const displayError = error ?? state.error;

  const isHome = state.step === 'choose-method';

  // Build the slide animation class
  let slideClass = '';
  if (slideDirection === 'forward') slideClass = ' pp-wizard-slide-from-right';
  else if (slideDirection === 'back') slideClass = ' pp-wizard-slide-from-left';

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
            onChooseTopic={(topic) => setState((prev) => ({ ...prev, helpTopic: topic }))}
          />
        );
    }
  })();

  return (
    <div className="pp-wizard-container">
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
      <div
        className={`pp-wizard-step-wrapper${slideClass}`}
        onAnimationEnd={() => setSlideDirection('none')}
      >
        {stepContent}
      </div>
    </div>
  );
}
