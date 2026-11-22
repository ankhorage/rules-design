import { constants } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { AnkhCommandContext } from '@ankhorage/ankh';
import type { WebsiteObservationDocument } from '@ankhorage/contracts/website';

import { validateWebsiteRecognitionDocument } from '../../features/recognition/validateWebsiteRecognitionDocument.js';
import { recognizeWebsiteDocument } from '../../index.js';

/*** Adapt `ankh rules-design recognize` to the public document-recognition API. */
export async function recognize(
  argv: readonly string[],
  context: AnkhCommandContext,
): Promise<{ readonly exitCode: number }> {
  try {
    const input = parseRecognitionInput(argv, context.cwd);
    if ('help' in input) {
      context.writeStdout(`${renderUsage()}\n`);
      return { exitCode: 0 };
    }
    await assertOutputDoesNotExistAsync(input.outputPath);
    const observed = parseWebsiteObservationDocument(await readFile(input.inputPath, 'utf8'));
    const recognition = recognizeWebsiteDocument(observed);
    validateWebsiteRecognitionDocument(recognition);
    await writeFile(input.outputPath, `${JSON.stringify(recognition, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    context.writeStdout(`Wrote website recognition document to ${input.outputPath}.\n`);
    return { exitCode: 0 };
  } catch (error) {
    context.writeStderr(`${errorMessage(error)}\n`);
    return { exitCode: 1 };
  }
}

/*** Parse one observation input and its required non-overwriting recognition output. */
function parseRecognitionInput(
  argv: readonly string[],
  cwd: string,
): { readonly inputPath: string; readonly outputPath: string } | { readonly help: true } {
  if (argv.length === 1 && isHelpToken(argv[0])) return { help: true };
  if (argv.length !== 3 || argv[1] !== '--output') {
    throw new Error(renderUsage());
  }
  const [input, , output] = argv;
  return { inputPath: resolve(cwd, input), outputPath: resolve(cwd, output) };
}

/*** Parse JSON at the file boundary and apply the canonical recognition input validation. */
function parseWebsiteObservationDocument(value: string): WebsiteObservationDocument {
  const parsed: unknown = JSON.parse(value);
  return parsed as WebsiteObservationDocument;
}

/*** Refuse an existing output target before calculating a recognition document. */
async function assertOutputDoesNotExistAsync(path: string): Promise<void> {
  try {
    await access(path, constants.F_OK);
  } catch {
    return;
  }
  throw new Error(`Refusing to overwrite existing file: ${path}`);
}

/*** Identify the command help tokens supported by the Ankh delivery surface. */
function isHelpToken(value: string | undefined): boolean {
  return value === '--help' || value === '-h' || value === 'help';
}

/*** Render the canonical recognition invocation shape. */
function renderUsage(): string {
  return 'Usage: ankh rules-design recognize <observation.json> --output <recognition.json>';
}

/*** Convert an unknown boundary failure to a safe command diagnostic. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Rules Design recognition failed.';
}
