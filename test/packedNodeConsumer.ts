import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const packageRoot = process.cwd();
const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'rules-design-node-consumer-'));
const tarballPath = path.join(fixtureRoot, 'rules-design.tgz');

try {
  await runCommandAsync(
    'bun',
    ['pm', 'pack', '--filename', tarballPath, '--ignore-scripts', '--quiet'],
    packageRoot,
  );
  await writeFile(
    path.join(fixtureRoot, 'package.json'),
    `${JSON.stringify({ dependencies: { '@ankhorage/rules-design': `file:${tarballPath}` }, private: true, type: 'module' })}\n`,
  );
  await runCommandAsync('bun', ['install'], fixtureRoot);
  await runCommandAsync(
    'node',
    ['--input-type=module', '--eval', "await import('@ankhorage/rules-design');"],
    fixtureRoot,
  );
} finally {
  await rm(fixtureRoot, { force: true, recursive: true });
}

async function runCommandAsync(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<void> {
  const process = Bun.spawn([command, ...args], { cwd, stderr: 'inherit', stdout: 'inherit' });
  if ((await process.exited) !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }
}
