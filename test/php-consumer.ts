import { mkdtemp, rm } from 'node:fs/promises';

import { recognizeWebsiteDocument } from '../src/features/recognition/recognizeWebsiteDocument';
import { websiteAnimationObservationDocumentFixture } from './fixtures/websiteObservationDocument';

const workspace = await mkdtemp('/tmp/rules-design-php-consumer-');

try {
  const animationFixture = `${workspace}/animation-recognition.json`;
  await Bun.write(
    animationFixture,
    JSON.stringify(recognizeWebsiteDocument(websiteAnimationObservationDocumentFixture())),
  );
  await run(['php', 'test/website-recognition-consumer.php']);
  await run(['php', 'test/website-recognition-consumer.php', animationFixture]);
} finally {
  await rm(workspace, { force: true, recursive: true });
}

/*** Runs the independent PHP consumer and preserves its boundary failure status. */
async function run(command: readonly string[]): Promise<void> {
  const php = Bun.spawn({ cmd: [...command], stderr: 'inherit', stdout: 'inherit' });
  if ((await php.exited) !== 0) throw new Error('PHP website-recognition consumer failed.');
}
