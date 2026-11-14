import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { websiteAnimationObservationDocumentFixture } from './fixtures/websiteObservationDocument';

type PackageManifest = {
  readonly devDependencies: { readonly typescript: string };
};

const repository = process.cwd();
const workspace = await mkdtemp('/tmp/rules-design-packed-consumer-');

try {
  await run(['bun', 'run', 'build'], repository);
  await run(['bun', 'pm', 'pack', '--destination', workspace], repository);

  const tarball = join(workspace, await packedTarball(workspace));
  const manifest = JSON.parse(
    await readFile(join(repository, 'package.json'), 'utf8'),
  ) as PackageManifest;
  const consumer = join(workspace, 'consumer');
  await mkdir(consumer);
  await Bun.write(
    join(consumer, 'animation-observation.json'),
    JSON.stringify(websiteAnimationObservationDocumentFixture()),
  );
  await Bun.write(
    join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'rules-design-packed-consumer',
        private: true,
        type: 'module',
        dependencies: { '@ankhorage/rules-design': `file:${tarball}` },
        devDependencies: { typescript: manifest.devDependencies.typescript },
        scripts: { 'check-types': 'tsc --noEmit' },
      },
      null,
      2,
    ),
  );
  await Bun.write(
    join(consumer, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          module: 'Preserve',
          moduleResolution: 'bundler',
          noEmit: true,
          resolveJsonModule: true,
          strict: true,
        },
      },
      null,
      2,
    ),
  );
  await Bun.write(
    join(consumer, 'index.ts'),
    [
      "import type { WebsiteObservationDocument, WebsiteRecognitionDocument } from '@ankhorage/contracts/website';",
      "import { recognizeWebsiteDocument } from '@ankhorage/rules-design';",
      "import { CAPABILITIES } from '@ankhorage/rules-design/capabilities';",
      "import provider from '@ankhorage/rules-design/cli';",
      "import animationObservation from './animation-observation.json' with { type: 'json' };",
      '',
      'const recognizer: typeof recognizeWebsiteDocument = recognizeWebsiteDocument;',
      'const recognize = (observation: WebsiteObservationDocument): WebsiteRecognitionDocument => recognizer(observation);',
      'const animationRecognition = recognize(animationObservation as unknown as WebsiteObservationDocument);',
      'const folded = animationRecognition.pages[0]?.nodes.find((node) => node.id === \'[\\"home\\",\\"#animated-parent > #animated-child\\"]\');',
      "const animation = folded?.props.find((property) => property.name === 'animationEvidence');",
      "const sourceRefs = animation?.originalValues.map((value) => value !== null && typeof value === 'object' && !Array.isArray(value) && 'sourceRef' in value && typeof value.sourceRef === 'string' ? value.sourceRef : null);",
      "if (typeof recognizer !== 'function') throw new TypeError('Public runtime export is missing.');",
      "if (typeof recognize !== 'function') throw new TypeError('Recognition contract is invalid.');",
      "if (provider.capabilities !== CAPABILITIES) throw new TypeError('Packed provider capability catalog is not canonical.');",
      'if (JSON.stringify(sourceRefs) !== JSON.stringify([\'[\\"home\\",\\"#animated-parent > #animated-child\\"]\', \'[\\"home\\",\\"#animated-parent\\"]\'])) throw new TypeError(\'Packed consumer lost animation source identities.\');',
    ].join('\n'),
  );

  await run(['bun', 'install'], consumer);
  await run(['bun', 'run', 'check-types'], consumer);
  await run(['bun', 'run', 'index.ts'], consumer);
} finally {
  await rm(workspace, { force: true, recursive: true });
}

/*** Runs one command at the packed-consumer boundary and preserves its failure status. */
async function run(command: readonly string[], cwd: string): Promise<void> {
  const child = Bun.spawn({
    cmd: [...command],
    cwd,
    env: { ...process.env, TEMP: '/tmp', TMP: '/tmp', TMPDIR: '/tmp' },
    stderr: 'inherit',
    stdout: 'inherit',
  });
  if ((await child.exited) !== 0) throw new Error(`Command failed: ${command.join(' ')}`);
}

/*** Finds the single tarball produced from the current package without assuming a package version. */
async function packedTarball(directory: string): Promise<string> {
  const tarballs = (await readdir(directory)).filter((file) => file.endsWith('.tgz'));
  const [tarball] = tarballs;
  if (tarball === undefined || tarballs.length !== 1)
    throw new Error(`Expected one packed tarball, received ${tarballs.length}.`);
  return tarball;
}
