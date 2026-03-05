import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import * as fs from 'node:fs';
import * as path from 'node:path';

const config = new pulumi.Config();
const workerName = config.require('workerName');
const allowedOrigins = config.get('allowedOrigins') ?? 'https://nsheaps.github.io';

// Resolve the worker script relative to this project
const workerScriptPath = path.resolve(__dirname, '..', '..', 'workers', 'cors-proxy', 'dist', 'index.js');

// The Cloudflare account ID is provided via the cloudflare provider config
// or CLOUDFLARE_ACCOUNT_ID env var

const workerScript = new cloudflare.WorkerScript(workerName, {
  accountId: new pulumi.Config('cloudflare').require('accountId'),
  name: workerName,
  content: fs.readFileSync(workerScriptPath, 'utf-8'),
  module: true,
  plainTextBindings: [
    {
      name: 'ALLOWED_ORIGINS',
      text: allowedOrigins,
    },
  ],
});

export const workerUrl = pulumi.interpolate`https://${workerName}.workers.dev`;
export const scriptName = workerScript.name;
