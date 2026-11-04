import { defineParadoxConfig } from '@ankhorage/paradox';

export default defineParadoxConfig({
  mode: 'write',
  output: { dir: './paradox' },
  package: { entrypoints: ['src/index.ts'], root: '.' },
});
