import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { AnkhCommandContext } from '@ankhorage/ankh';
import type { WebsiteRecognitionDocument } from '@ankhorage/contracts/website';

import { validateWebsiteRecognitionDocument } from '../../features/recognition/validateWebsiteRecognitionDocument.js';
/*** Adapt `ankh rules-design inspect` to read canonical recognition data without recomputing it. */
export async function inspect(
  argv: readonly string[],
  context: AnkhCommandContext,
): Promise<{ readonly exitCode: number }> {
  try {
    const input = parseInspectInput(argv, context.cwd);
    if ('help' in input) {
      context.writeStdout(`${renderUsage()}\n`);
      return { exitCode: 0 };
    }
    const designTokens = readDesignTokens(await readFile(input.inputPath, 'utf8'));
    context.writeStdout(`${JSON.stringify(designTokens, null, 2)}\n`);
    return { exitCode: 0 };
  } catch (error) {
    context.writeStderr(`${errorMessage(error)}\n`);
    return { exitCode: 1 };
  }
}

/*** Parse the supported inspect section and reject secondary analysis modes. */
function parseInspectInput(
  argv: readonly string[],
  cwd: string,
): { readonly inputPath: string } | { readonly help: true } {
  if (argv.length === 1 && isHelpToken(argv[0])) return { help: true };
  if (argv.length !== 3 || argv[1] !== '--section' || argv[2] !== 'tokens') {
    throw new Error(renderUsage());
  }
  const [input] = argv;
  return { inputPath: resolve(cwd, input) };
}

/*** Parse only the existing token collection required by the supported inspection section. */
function readDesignTokens(value: string): readonly unknown[] {
  const document = JSON.parse(value) as WebsiteRecognitionDocument;
  validateWebsiteRecognitionDocument(document);
  return document.designTokens;
}

/*** Identify the command help tokens supported by the Ankh delivery surface. */
function isHelpToken(value: string | undefined): boolean {
  return value === '--help' || value === '-h' || value === 'help';
}

/*** Render the canonical inspection invocation shape. */
function renderUsage(): string {
  return 'Usage: ankh rules-design inspect <recognition.json> --section tokens';
}

/*** Convert an unknown boundary failure to a safe command diagnostic. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Rules Design inspection failed.';
}
