export interface SiteConfig {
  path: string;
  repo: string;
  branch: string;
  directory: string;
  fetchTtlSeconds: number;
}

export interface GithubConfig {
  clientId: string;
  authMode: 'pkce' | 'device-flow';
  corsProxy?: string;
}

export interface AppConfig {
  github: GithubConfig;
  sites: SiteConfig[];
}
