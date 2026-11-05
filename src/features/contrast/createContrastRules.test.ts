import type { FactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules, type JsonValue, type Rule } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createContrastRules } from './createContrastRules.ts';

const rules = createContrastRules();
const scope = { id: 'screen-1', kind: 'page' };

test.each(rules)(
  '$identity.id passes from complete observations using its canonical standard',
  (rule) => {
    expect(evaluate(rule, observationFor(rule.identity.id)).results[0]?.status).toBe('PASS');
  },
);

test.each(rules)('$identity.id fails when its rule-owned standard is not met', (rule) => {
  const result = evaluate(rule, failingObservationFor(rule.identity.id));

  expect(result.results[0]?.status).toBe(
    rule.identity.id === 'design.contrast.text-background-resolved' ? 'INCOMPLETE' : 'FAIL',
  );
  if (rule.identity.id === 'design.contrast.text-background-resolved') return;
  expect(result.findings[0]).toMatchObject({
    evidence: { standard: expectedStandard(rule.identity.id) },
    subjects: [{ id: 'target-1', kind: 'element' }],
  });
});

test.each(rules)('$identity.id is incomplete without complete exact-scope evidence', (rule) => {
  expect(evaluate(rule).results[0]?.status).toBe('INCOMPLETE');
  expect(
    evaluate(rule, observationFor(rule.identity.id), { id: scope.id, kind: 'component' }).results[0]
      ?.status,
  ).toBe('INCOMPLETE');
});

test('text ratio resolves a validated selected WCAG standard instead of an evidence threshold', () => {
  const rule = ruleById('design.contrast.text-ratio');
  const result = evaluate(rule, observationFor(rule.identity.id), scope, {
    standard: 'wcag-aaa-normal',
    version: 1,
  });

  expect(result.results[0]?.status).toBe('FAIL');
  expect(result.findings[0]).toMatchObject({ evidence: { standard: 'wcag-aaa-normal' } });
});

test('focus visibility, effective backgrounds, CTA prominence, and visual hierarchy use their specific observations', () => {
  expect(
    evaluate(ruleById('design.contrast.focus-visible'), {
      ...observationFor('design.contrast.focus-visible'),
      focusIndicatorVisible: false,
    }).results[0]?.status,
  ).toBe('FAIL');
  expect(
    evaluate(ruleById('design.contrast.text-background-resolved'), {
      ...observationFor('design.contrast.text-background-resolved'),
      effectiveBackground: '',
    }).results[0]?.status,
  ).toBe('INCOMPLETE');
  expect(
    evaluate(ruleById('design.contrast.cta-prominence'), {
      ...observationFor('design.contrast.cta-prominence'),
      primaryProminence: 0.7,
    }).results[0]?.status,
  ).toBe('FAIL');
  expect(
    evaluate(ruleById('design.contrast.visual-hierarchy'), {
      ...observationFor('design.contrast.visual-hierarchy'),
      emphasis: [
        { score: 0.6, subject: { id: 'primary', kind: 'element' } },
        { score: 0.7, subject: { id: 'secondary', kind: 'element' } },
      ],
    }).results[0]?.status,
  ).toBe('FAIL');
});

test('comparison operators and acceptance thresholds in facts cannot determine an outcome', () => {
  const result = evaluate(ruleById('design.contrast.text-ratio'), {
    ...observationFor('design.contrast.text-ratio'),
    comparison: 'at-most',
    expected: 0,
  });

  expect(result.results[0]?.status).toBe('INCOMPLETE');
});

test('each rule selects only its exact fact when all frozen rules share a scope', () => {
  const outcome = evaluateRules(
    {
      facts: rules.map((rule) =>
        contrastFact(rule.identity.id, observationFor(rule.identity.id), scope),
      ),
    },
    rules,
    {
      capabilities: rules.flatMap((rule) => rule.requiredCapabilities ?? []),
      scope,
    },
  );

  expect(outcome.results).toHaveLength(rules.length);
  expect(outcome.results.every((result) => result.status === 'PASS')).toBe(true);
});

test('uses producer-declared kinds, not opaque fact IDs, to isolate mixed evidence', () => {
  const textRatio = ruleById('design.contrast.text-ratio');
  const nontextRatio = ruleById('design.contrast.nontext-ratio');
  const result = evaluateRules(
    {
      facts: [
        contrastFact(
          textRatio.identity.id,
          observationFor(textRatio.identity.id),
          scope,
          'producer:7cf858c8',
        ),
        missingContrastFact(textRatio.identity.id, scope, 'producer:ee43a4d1'),
        contrastFact(
          nontextRatio.identity.id,
          observationFor(nontextRatio.identity.id),
          scope,
          'producer:9f4d1a9b',
        ),
        missingContrastFact(
          'design.contrast.focus-visible',
          { id: scope.id, kind: 'component' },
          'producer:5a1c8d48',
        ),
      ],
    },
    [textRatio, nontextRatio],
    {
      capabilities: [
        ...(textRatio.requiredCapabilities ?? []),
        ...(nontextRatio.requiredCapabilities ?? []),
      ],
      scope,
    },
  );

  expect(result.results.map(({ status }) => status).sort()).toEqual(['INCOMPLETE', 'PASS']);
});

test.each(rules)('$identity.id rejects unsupported standard options', (rule) => {
  expect(rule.validateOptions?.({ standard: 'unsupported-standard', version: 1 })).toEqual([
    {
      code: 'invalid-contrast-options',
      message: 'Options must contain version 1 and a standard.',
    },
  ]);
});

/*** Runs one rule with its declared capabilities and optionally one portable fact observation. */
function evaluate(
  rule: Rule<{ readonly facts: readonly FactEnvelope[] }>,
  observation?: Record<string, JsonValue>,
  factScope = scope,
  options?: JsonValue,
) {
  return evaluateRules(
    { facts: observation ? [contrastFact(rule.identity.id, observation, factScope)] : [] },
    [rule],
    {
      capabilities: rule.requiredCapabilities,
      optionsByRuleId: new Map([[rule.identity.id, options]]),
      scope,
    },
  );
}

/*** Finds one group-local rule without registering the group centrally. */
function ruleById(id: string): Rule<{ readonly facts: readonly FactEnvelope[] }> {
  const rule = rules.find((candidate) => candidate.identity.id === id);
  if (!rule) throw new Error(`Contrast rule "${id}" is missing.`);
  return rule;
}

/*** Creates a complete passing observation for every frozen rule identity. */
function observationFor(ruleId: string): Record<string, JsonValue> {
  const base = { ruleId, subject: { id: 'target-1', kind: 'element' } } as const;
  if (ruleId === 'design.contrast.text-ratio') {
    return { ...base, contrastRatio: 4.5, effectiveBackground: '#fff', foreground: '#000' };
  }
  if (ruleId === 'design.contrast.nontext-ratio') {
    return { ...base, contrastRatio: 3, effectiveBackground: '#fff', foreground: '#000' };
  }
  if (ruleId === 'design.contrast.focus-visible') {
    return { ...base, contrastRatio: 3, effectiveBackground: '#fff', focusIndicatorVisible: true };
  }
  if (ruleId === 'design.contrast.surface-separation') {
    return {
      ...base,
      contrastRatio: 3,
      firstEffectiveBackground: '#fff',
      secondEffectiveBackground: '#000',
    };
  }
  if (ruleId === 'design.contrast.state-distinction') {
    return { ...base, comparedState: 'default', contrastRatio: 3, state: 'hover' };
  }
  if (ruleId === 'design.contrast.link-distinction') {
    return { ...base, distinguishingContrastRatio: 3, nonColorCueVisible: false };
  }
  if (ruleId === 'design.contrast.text-background-resolved') {
    return { ...base, backgroundLayerCount: 1, effectiveBackground: '#fff' };
  }
  if (ruleId === 'design.contrast.cta-prominence') {
    return { ...base, competingProminence: 0.6, primaryProminence: 0.8 };
  }
  return {
    ...base,
    emphasis: [
      { score: 0.9, subject: { id: 'primary', kind: 'element' } },
      { score: 0.7, subject: { id: 'secondary', kind: 'element' } },
    ],
  };
}

/*** Creates a complete observation that violates the fixed policy of its rule. */
function failingObservationFor(ruleId: string): Record<string, JsonValue> {
  const observation = observationFor(ruleId);
  if ('contrastRatio' in observation) return { ...observation, contrastRatio: 2 };
  if (ruleId === 'design.contrast.link-distinction') {
    return { ...observation, distinguishingContrastRatio: 2, nonColorCueVisible: false };
  }
  if (ruleId === 'design.contrast.cta-prominence')
    return { ...observation, primaryProminence: 0.65 };
  if (ruleId === 'design.contrast.visual-hierarchy') {
    return {
      ...observation,
      emphasis: [
        { score: 0.7, subject: { id: 'primary', kind: 'element' } },
        { score: 0.65, subject: { id: 'secondary', kind: 'element' } },
      ],
    };
  }
  if (ruleId === 'design.contrast.text-background-resolved') {
    return { ...observation, backgroundLayerCount: 0 };
  }
  return observation;
}

/*** Returns the default canonical standard selected by each rule. */
function expectedStandard(ruleId: string): string {
  if (ruleId === 'design.contrast.text-ratio') return 'wcag-aa-normal';
  if (
    ruleId === 'design.contrast.cta-prominence' ||
    ruleId === 'design.contrast.visual-hierarchy'
  ) {
    return 'heuristic-clear';
  }
  if (ruleId === 'design.contrast.text-background-resolved') return 'heuristic-clear';
  return 'wcag-aa-nontext';
}

/*** Wraps one serializable observation as an available portable fact at a chosen scope. */
function contrastFact(
  ruleId: string,
  value: Record<string, JsonValue>,
  factScope: { readonly id: string; readonly kind: string },
  id = 'producer:contrast-observation:5bd53cb4',
): FactEnvelope {
  return {
    contentHash: 'sha256:contrast-fact',
    id,
    kind: ruleId,
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'test', version: '1.0.0' },
      source: { id: 'fixture', revision: '1' },
    },
    schemaVersion: 1,
    scope: {
      ...factScope,
      target: {
        kind: 'screen',
        projectId: 'project-1',
        targetId: 'target-1',
        tenantId: 'tenant-1',
      },
    },
    status: 'available',
    value,
  };
}

/*** Wraps one unavailable observation with its producer-declared rule kind and opaque identity. */
function missingContrastFact(
  ruleId: string,
  factScope = scope,
  id = 'producer:contrast-observation:8b0dff2c',
): FactEnvelope {
  return {
    contentHash: 'sha256:missing-contrast-fact',
    id,
    kind: ruleId,
    missing: { code: 'unavailable', message: 'Contrast measurement is unavailable.' },
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'test', version: '1.0.0' },
      source: { id: 'fixture', revision: '1' },
    },
    schemaVersion: 1,
    scope: {
      ...factScope,
      target: {
        kind: 'screen',
        projectId: 'project-1',
        targetId: 'target-1',
        tenantId: 'tenant-1',
      },
    },
    status: 'missing',
  };
}
