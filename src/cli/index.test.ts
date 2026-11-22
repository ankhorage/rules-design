import { areCapabilitiesEqual, isCapability } from '@ankhorage/capability';
import { expect, test } from 'bun:test';

import packageJson from '../../package.json' with { type: 'json' };
import { CAPABILITIES } from '../capabilities/index.js';
import provider from './index.js';

test('publishes canonical Rules Design capabilities and matching command handlers', () => {
  expect(CAPABILITIES).toHaveLength(2);
  expect(CAPABILITIES.every(isCapability)).toBeTrue();
  expect(CAPABILITIES.map(({ id }) => id)).toEqual([
    'rules-design.recognize',
    'rules-design.inspect',
  ]);
  expect(packageJson.exports['./cli']).toEqual({
    types: './dist/cli/index.d.ts',
    import: './dist/cli/index.js',
  });
  expect(packageJson.exports['./capabilities']).toEqual({
    types: './dist/capabilities/index.d.ts',
    import: './dist/capabilities/index.js',
  });
  for (const [index, capability] of CAPABILITIES.entries()) {
    const published = packageJson.ankh.capabilities.at(index);
    expect(isCapability(published)).toBeTrue();
    if (!isCapability(published)) continue;
    expect(areCapabilitiesEqual(published, capability)).toBeTrue();
  }
  expect(provider.capabilities).toBe(CAPABILITIES);
  expect(provider.commands.map(({ path }) => path)).toEqual([['recognize'], ['inspect']]);
  expect(provider.handlers.map(({ path }) => path)).toEqual([['recognize'], ['inspect']]);
});
