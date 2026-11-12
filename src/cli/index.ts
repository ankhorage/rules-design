import { readFileSync } from 'node:fs';

import type { AnkhRuntimeCommandProvider } from '@ankhorage/ankh';

import { CAPABILITIES } from '../capabilities/index.js';
import { inspect } from './commands/inspect.js';
import { recognize } from './commands/recognize.js';

const provider = {
  id: '@ankhorage/rules-design',
  category: 'rules-design',
  version: readPackageVersion(),
  capabilities: CAPABILITIES,
  commands: [
    {
      path: ['recognize'],
      capability: 'rules-design.recognize',
      summary: 'Assemble canonical website recognition from an observation document.',
    },
    {
      path: ['inspect'],
      capability: 'rules-design.inspect',
      summary: 'Read design tokens from an existing website recognition document.',
    },
  ],
  handlers: [
    { path: ['recognize'], handler: async ({ argv, context }) => await recognize(argv, context) },
    { path: ['inspect'], handler: async ({ argv, context }) => await inspect(argv, context) },
  ],
} satisfies AnkhRuntimeCommandProvider;

export default provider;

/*** Read the package version that is published with this provider module. */
function readPackageVersion(): string {
  const parsed: unknown = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  if (!isRecord(parsed) || typeof parsed.version !== 'string' || parsed.version.length === 0) {
    throw new Error('package.json must define a non-empty version.');
  }
  return parsed.version;
}

/*** Narrow JSON input to a non-null record without accepting arrays. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
