import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'bun:test';

import { websiteObservationDocumentFixture } from '../../../test/fixtures/websiteObservationDocument.js';
import { inspect } from './inspect.js';
import { recognize } from './recognize.js';

const invalidObservations = [
  ['missing site metadata', (document: Record<string, unknown>) => delete document.site],
  ['missing source metadata', (document: Record<string, unknown>) => delete document.source],
  [
    'unsupported schema version',
    (document: Record<string, unknown>) => (document.schemaVersion = 2),
  ],
  ['invalid page structure', (document: Record<string, unknown>) => (document.pages = [{}])],
] as const;

for (const [name, mutate] of invalidObservations) {
  test(`rejects ${name} before recognition writes output`, async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'rules-design-cli-validation-'));
    const inputPath = join(workspace, 'observation.json');
    const outputPath = join(workspace, 'recognition.json');
    const document = JSON.parse(JSON.stringify(websiteObservationDocumentFixture())) as Record<
      string,
      unknown
    >;
    mutate(document);
    await writeFile(inputPath, JSON.stringify(document));

    try {
      const context = createContext(workspace);
      const result = await recognize(['observation.json', '--output', 'recognition.json'], context);

      expect(result.exitCode).toBe(1);
      expect(context.stdout).toEqual([]);
      expect(context.stderr).toHaveLength(1);
      expect(await Bun.file(outputPath).exists()).toBeFalse();
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });
}

test('rejects a malformed inspect input that merely contains design tokens', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'rules-design-cli-validation-'));
  await writeFile(join(workspace, 'recognition.json'), JSON.stringify({ designTokens: [] }));

  try {
    const context = createContext(workspace);
    const result = await inspect(['recognition.json', '--section', 'tokens'], context);

    expect(result.exitCode).toBe(1);
    expect(context.stdout).toEqual([]);
    expect(context.stderr).toHaveLength(1);
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
});

test('recognizes and inspects a valid canonical fixture', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'rules-design-cli-validation-'));
  await writeFile(
    join(workspace, 'observation.json'),
    JSON.stringify(websiteObservationDocumentFixture()),
  );

  try {
    const recognitionContext = createContext(workspace);
    const recognition = await recognize(
      ['observation.json', '--output', 'recognition.json'],
      recognitionContext,
    );
    const inspectionContext = createContext(workspace);
    const inspection = await inspect(
      ['recognition.json', '--section', 'tokens'],
      inspectionContext,
    );

    expect(recognition.exitCode).toBe(0);
    expect(inspection.exitCode).toBe(0);
    expect(JSON.parse(await readFile(join(workspace, 'recognition.json'), 'utf8'))).toMatchObject({
      schemaVersion: 1,
    });
    expect(JSON.parse(inspectionContext.stdout.join(''))).toBeArray();
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
});

/*** Creates a minimal Ankh command context that retains observable CLI output for assertions. */
function createContext(cwd: string) {
  const stderr: string[] = [];
  const stdout: string[] = [];
  return {
    cwd,
    env: {},
    stderr,
    stdout,
    version: 'test',
    writeStderr: (value: string) => stderr.push(value),
    writeStdout: (value: string) => stdout.push(value),
  };
}
