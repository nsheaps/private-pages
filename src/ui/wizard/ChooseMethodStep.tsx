import type { WizardStep } from './types';

interface ChooseMethodStepProps {
  onChoose: (step: WizardStep) => void;
  onHelp: () => void;
  error?: string;
  availableMethods: {
    pat?: boolean;
    githubApp?: boolean;
    deviceFlow?: boolean;
    directUrl?: boolean;
  };
}

interface MethodOption {
  step: WizardStep;
  title: string;
  description: string;
  enabled: boolean;
}

export function ChooseMethodStep({ onChoose, onHelp, error, availableMethods }: ChooseMethodStepProps) {
  const options: MethodOption[] = [
    {
      step: 'github-app',
      title: 'Sign in with GitHub',
      description: 'Authorize via your browser using the GitHub App OAuth flow.',
      enabled: availableMethods.githubApp ?? false,
    },
    {
      step: 'device-flow',
      title: 'Device Flow',
      description: 'Sign in by entering a code on github.com. Works in restricted environments.',
      enabled: availableMethods.deviceFlow ?? false,
    },
    {
      step: 'pat-input',
      title: 'Personal Access Token',
      description: 'Paste a GitHub PAT with repo scope. No OAuth app needed.',
      enabled: availableMethods.pat ?? false,
    },
    {
      step: 'direct-url',
      title: 'Direct Repository URL',
      description: 'Enter any Git repository URL. Tries anonymous access first.',
      enabled: availableMethods.directUrl ?? false,
    },
  ];

  const enabledOptions = options.filter((o) => o.enabled);

  return (
    <div className="pp-wizard-screen" role="main" data-testid="wizard-choose-method">
      <div className="pp-wizard-header">
        <h1>Private Pages</h1>
        <p>Choose how you'd like to connect to your repository.</p>
      </div>

      {error && (
        <div className="pp-error" role="alert">
          {error}
        </div>
      )}

      <div className="pp-wizard-options">
        {enabledOptions.map((option) => (
          <button
            key={option.step}
            className="pp-wizard-option"
            onClick={() => onChoose(option.step)}
            data-testid={`wizard-option-${option.step}`}
          >
            <span className="pp-wizard-option-title">{option.title}</span>
            <span className="pp-wizard-option-desc">{option.description}</span>
          </button>
        ))}
      </div>

      <div className="pp-wizard-footer">
        <button type="button" className="pp-link-button" onClick={onHelp} data-testid="wizard-help-link">
          Help: Which method should I use?
        </button>
      </div>
    </div>
  );
}
