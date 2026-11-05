import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';

interface AlignmentMetricFact extends AvailableFactEnvelope {
  readonly value: {
    readonly expected: number;
    readonly measurement: string;
    readonly observed: number;
    readonly subjectIds: readonly string[];
    readonly tolerance: number;
  };
}

/*** Creates a portable available metric fact for one Alignment and Layout rule fixture. */
export function alignmentMetricFact(
  ruleId: string,
  scopeId: string,
  measurement: string,
  expected: number,
  observed: number,
  tolerance: number,
): AlignmentMetricFact {
  return {
    contentHash: `fixture-${ruleId}-${scopeId}-${expected}-${observed}-${tolerance}`,
    id: `${ruleId}:${scopeId}`,
    kind: ruleId,
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture', revision: null },
    },
    schemaVersion: 1,
    scope: {
      id: scopeId,
      kind: 'page',
      target: {
        kind: 'project',
        projectId: 'fixture-project',
        targetId: 'fixture-target',
        tenantId: 'fixture-tenant',
      },
    },
    status: 'available',
    value: { expected, measurement, observed, subjectIds: ['fixture-subject'], tolerance },
  };
}
