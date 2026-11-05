import type { FactEnvelope } from '@ankhorage/contracts/rules';

import type { TypographyObservation, TypographyRulePolicy } from '../../src/types/typography.ts';

export const typographyPolicy: TypographyRulePolicy = {
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
};

const observationDefaults: Record<string, TypographyValue> = {
  body: {
    documentOrder: 1,
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
    documentOrder: 1,
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
    documentOrder: 2,
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

export function observations(replacement?: TypographyFact): readonly FactEnvelope[] {
  const facts = [observation('body'), observation('h1'), observation('h2')];
  return replacement === undefined
    ? facts
    : facts.map((fact) => (fact.id === replacement.id ? replacement : fact));
}

export function observation(id: string, override: Partial<TypographyValue> = {}): TypographyFact {
  const defaultValue = Object.entries(observationDefaults).find(([name]) => name === id)?.[1];
  if (defaultValue === undefined) throw new Error(`Unknown Typography fixture "${id}".`);
  return fact(id, { ...defaultValue, ...override });
}

export function missingFact(id: string): FactEnvelope {
  const available = observation(id);
  return {
    ...available,
    missing: { code: 'unavailable', message: 'The browser did not supply this measurement.' },
    status: 'missing',
  };
}

export function malformedFact(id: string): TypographyFact {
  const available = observation(id);
  return { ...available, value: { fontSize: 'not-a-number' } };
}

export function h1Observation(index: number): TypographyFact {
  return fact(`h1-${index}`, { ...observationDefaults.h1, documentOrder: index });
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
type TypographyValue = Omit<TypographyObservation, 'id'>;
