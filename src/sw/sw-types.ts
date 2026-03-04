import type { SiteConfig } from '../config/types';

export type ClientToSwMessage =
  | { type: 'REPO_CLONED'; owner: string; repo: string; branch: string }
  | { type: 'FETCH_COMPLETE'; owner: string; repo: string; newSha: string }
  | { type: 'CONFIG_UPDATE'; sites: SiteConfig[] };

export type SwToClientMessage =
  | { type: 'UPDATE_AVAILABLE'; owner: string; repo: string; newSha: string }
  | { type: 'SERVE_ERROR'; url: string; error: string };
