import type { FactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createContrastRules } from './createContrastRules.ts';

const rules = createContrastRules();

test.each(rules)(
  '$identity.id passes when its scoped measurement meets the supplied expectation',
  (rule) => {
    const result = evaluateRules({ facts: [contrastFact(rule.identity.id, 4.5, 4.5)] }, [rule], {
      capabilities: rule.requiredCapabilities,
      scope: { id: 'screen-1', kind: 'page' },
    });

    expect(result.results).toMatchObject([{ status: 'PASS' }]);
  },
);

test.each(rules)(
  '$identity.id fails with the measured subject when its expectation is not met',
  (rule) => {
    const result = evaluateRules({ facts: [contrastFact(rule.identity.id, 3, 4.5)] }, [rule], {
      capabilities: rule.requiredCapabilities,
      scope: { id: 'screen-1', kind: 'page' },
    });

    expect(result.results).toMatchObject([
      {
        findings: [
          {
            evidence: { actual: 3, comparison: 'at-least', expected: 4.5 },
            subjects: [{ id: 'target-1', kind: 'element' }],
          },
        ],
        status: 'FAIL',
      },
    ]);
  },
);

test.each(rules)(
  '$identity.id is incomplete rather than passing without its scoped fact',
  (rule) => {
    const result = evaluateRules({ facts: [] }, [rule], {
      capabilities: rule.requiredCapabilities,
      scope: { id: 'screen-1', kind: 'page' },
    });

    expect(result.results).toMatchObject([{ status: 'INCOMPLETE' }]);
    expect(result.findings[0]?.message).toContain(
      'requires an available design.contrast.measurement',
    );
  },
);

function contrastFact(ruleId: string, actual: number, expected: number): FactEnvelope {
  return {
    contentHash: 'sha256:contrast-fact',
    id: `fact:${ruleId}`,
    kind: 'design.contrast.measurement',
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'test', version: '1.0.0' },
      source: { id: 'fixture', revision: '1' },
    },
    schemaVersion: 1,
    scope: {
      id: 'screen-1',
      kind: 'page',
      target: {
        kind: 'screen',
        projectId: 'project-1',
        targetId: 'target-1',
        tenantId: 'tenant-1',
      },
    },
    status: 'available',
    value: {
      actual,
      comparison: 'at-least',
      expected,
      ruleId,
      subject: { id: 'target-1', kind: 'element' },
    },
  };
}
