import { z } from 'zod';

export const SiteConfigSchema = z.object({
  path: z.string().startsWith('/'),
  repo: z.string().regex(/^[^/]+\/[^/]+$/),
  branch: z.string().default('main'),
  directory: z.string().default('/'),
  fetchTtlSeconds: z.number().default(60),
});

export const GithubConfigSchema = z.object({
  clientId: z.string(),
  authMode: z.enum(['pkce', 'device-flow']).default('device-flow'),
  corsProxy: z.string().url().optional(),
});

export const ConfigSchema = z.object({
  github: GithubConfigSchema,
  sites: z.array(SiteConfigSchema).min(1),
});

export type ValidatedConfig = z.infer<typeof ConfigSchema>;
