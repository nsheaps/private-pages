import type { DeviceFlowState, TokenInfo, UserInfo } from '../../auth/types';

export type WizardStep =
  | 'choose-method'
  | 'pat-input'
  | 'github-app'
  | 'device-flow'
  | 'direct-url'
  | 'direct-url-credentials'
  | 'help';

export type DirectUrlCredentialMode = 'token' | 'username-password';

export interface WizardState {
  step: WizardStep;
  error?: string;
  loading?: boolean;
  helpTopic?: HelpTopic;
  /** For device flow */
  deviceFlowState?: DeviceFlowState;
  /** For direct URL flow */
  repoUrl?: string;
  anonymousFailed?: boolean;
  credentialMode?: DirectUrlCredentialMode;
}

export type HelpTopic =
  | 'pat'
  | 'github-app'
  | 'device-flow'
  | 'direct-url'
  | 'overview';

export interface WizardCallbacks {
  onPatLogin: (token: string) => void;
  onPkceLogin: () => void;
  onDeviceFlowLogin: () => void;
  onDirectUrlLogin: (url: string, auth?: { token?: string; username?: string; password?: string }) => void;
  onLoginComplete: (token: TokenInfo, user: UserInfo) => void;
}
