import type { FactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createTypographyRuleSet } from './createTypographyRuleSet.ts';

const capabilities = ['design.heading-facts', 'design.typography-facts'];
const observationDefaults: Record<string, TypographyValue> = {
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '400',
    headingLevel: null,
    letterSpacing: 0,
    lineHeight: 20,
    marginAfter: null,
    marginBefore: null,
    paragraphMeasure: 60,
    responsiveRole: 'body',
    semanticStyle: null,
    textClipped: null,
    viewport: 'desktop',
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '700',
    headingLevel: 1,
    letterSpacing: 0,
    lineHeight: 40,
    marginAfter: 16,
    marginBefore: 24,
    paragraphMeasure: null,
    responsiveRole: 'hero',
    semanticStyle: 'display',
    textClipped: false,
    viewport: 'desktop',
  },
  h2: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    headingLevel: 2,
    letterSpacing: 0,
    lineHeight: 30,
    marginAfter: 16,
    marginBefore: 24,
    paragraphMeasure: null,
    responsiveRole: 'section',
    semanticStyle: 'section',
    textClipped: false,
    viewport: 'desktop',
  },
};
const ruleSet = createTypographyRuleSet({
  allowedFontFamilies: ['Inter'],
  allowedFontSizes: [16, 24, 32],
  allowedFontWeights: ['400', '700'],
  allowedLetterSpacings: [0],
  allowedLineHeights: [20, 30, 40],
  allowedSemanticStyles: { h1: ['display'], h2: ['section'] },
  allowedSpacingAfter: [16],
  allowedSpacingBefore: [24],
  maximumH1Count: 1,
  maximumParagraphMeasure: 75,
  minimumBodyFontSize: 16,
  minimumH1Count: 1,
  minimumParagraphMeasure: 45,
  responsiveFontSizes: { body: [16], hero: [32], section: [24] },
});

test('passes every Typography and Heading rule with valid normalized facts', () => {
  const result = evaluateRules(context(observations()), ruleSet.rules, { capabilities });

  expect(result.diagnostics).toEqual([]);
  expect(result.findings).toEqual([]);
  expect(result.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.heading.h1-count', 'PASS'],
    ['design.heading.h1-presence', 'PASS'],
    ['design.heading.level-order', 'PASS'],
    ['design.heading.semantic-style', 'PASS'],
    ['design.heading.spacing-after', 'PASS'],
    ['design.heading.spacing-before', 'PASS'],
    ['design.heading.text-clipping', 'PASS'],
    ['design.typography.body-minimum', 'PASS'],
    ['design.typography.font-family', 'PASS'],
    ['design.typography.letter-spacing', 'PASS'],
    ['design.typography.line-height', 'PASS'],
    ['design.typography.paragraph-measure', 'PASS'],
    ['design.typography.responsive-scale', 'PASS'],
    ['design.typography.scale', 'PASS'],
    ['design.typography.weight', 'PASS'],
  ]);
});

test.each([
  ['design.typography.font-family', observation('body', { fontFamily: 'Unapproved' })],
  ['design.typography.scale', observation('body', { fontSize: 17 })],
  ['design.typography.weight', observation('body', { fontWeight: '500' })],
  ['design.typography.line-height', observation('body', { lineHeight: 21 })],
  ['design.typography.letter-spacing', observation('body', { letterSpacing: 1 })],
  ['design.typography.paragraph-measure', observation('body', { paragraphMeasure: 80 })],
  ['design.typography.body-minimum', observation('body', { fontSize: 15 })],
  ['design.typography.responsive-scale', observation('body', { responsiveRole: 'unknown' })],
  [
    'design.heading.h1-presence',
    observation('h1', { headingLevel: 2, semanticStyle: 'section', responsiveRole: 'section' }),
  ],
  [
    'design.heading.h1-count',
    observation('h2', { headingLevel: 1, semanticStyle: 'display', responsiveRole: 'hero' }),
  ],
  [
    'design.heading.level-order',
    observation('h2', { headingLevel: 3, semanticStyle: 'section', responsiveRole: 'section' }),
  ],
  ['design.heading.semantic-style', observation('h1', { semanticStyle: 'section' })],
  ['design.heading.spacing-before', observation('h1', { marginBefore: 12 })],
  ['design.heading.spacing-after', observation('h1', { marginAfter: 12 })],
  ['design.heading.text-clipping', observation('h1', { textClipped: true })],
] as const)('fails %s when its measured policy condition is violated', (ruleId, replacement) => {
  const result = evaluateRules(context(observations(replacement)), ruleSet.rules, { capabilities });
  const ruleResult = result.results.find((entry) => entry.rule.id === ruleId);

  expect(ruleResult).toMatchObject({ status: 'FAIL' });
  expect(ruleResult?.findings).toHaveLength(1);
  expect(ruleResult?.findings[0]).toMatchObject({
    ruleId,
  });
});

test('marks every rule incomplete when normalized evidence is absent', () => {
  const result = evaluateRules(context([]), ruleSet.rules, { capabilities });

  expect(result.diagnostics).toEqual([]);
  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  expect(result.findings).toHaveLength(15);
  expect(result.findings.every((finding) => finding.message.includes('evidence is missing'))).toBe(
    true,
  );
});

test('declares group-specific capabilities instead of treating missing browser facts as a pass', () => {
  const result = evaluateRules(context(observations()), ruleSet.rules, { capabilities: [] });

  expect(result.findings).toEqual([]);
  expect(result.diagnostics).toHaveLength(15);
  expect(result.diagnostics.every((diagnostic) => diagnostic.code === 'missing-capability')).toBe(
    true,
  );
});

function context(facts: readonly FactEnvelope[]) {
  return { evidence: [], facts };
}

function observations(replacement?: TypographyFact): readonly FactEnvelope[] {
  const facts = [observation('body'), observation('h1'), observation('h2')];
  return replacement === undefined
    ? facts
    : facts.map((fact) => (fact.id === replacement.id ? replacement : fact));
}

function observation(id: string, override: Partial<TypographyValue> = {}): TypographyFact {
  const defaultValue = Object.entries(observationDefaults).find(([name]) => name === id)?.[1];
  if (defaultValue === undefined) throw new Error(`Unknown Typography fixture "${id}".`);
  return fact(id, { ...defaultValue, ...override });
}

function fact(id: string, value: TypographyValue): TypographyFact {
  return {
    contentHash: `hash-${id}`,
    id,
    kind: id.startsWith('h') ? 'design.heading-facts' : 'design.typography-facts',
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture', revision: '1' },
    },
    schemaVersion: 1,
    scope: {
      id: 'page',
      kind: 'page',
      target: { kind: 'site', projectId: 'project', targetId: 'target', tenantId: 'tenant' },
    },
    status: 'available',
    value: { ...value },
  };
}

type TypographyFact = Extract<FactEnvelope, { readonly status: 'available' }>;

interface TypographyValue {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: string;
  readonly headingLevel: number | null;
  readonly letterSpacing: number;
  readonly lineHeight: number;
  readonly marginAfter: number | null;
  readonly marginBefore: number | null;
  readonly paragraphMeasure: number | null;
  readonly responsiveRole: string | null;
  readonly semanticStyle: string | null;
  readonly textClipped: boolean | null;
  readonly viewport: string;
}
