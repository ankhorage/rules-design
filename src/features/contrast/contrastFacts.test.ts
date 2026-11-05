import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue } from '@ankhorage/rules';

/*** Wraps one serializable observation as an available portable fact at a chosen scope. */
export function contrastFact(
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
    scope: { ...factScope, target: target() },
    status: 'available',
    value,
  };
}

/*** Wraps one unavailable observation with its producer-declared rule kind and opaque identity. */
export function missingContrastFact(
  ruleId: string,
  factScope: { readonly id: string; readonly kind: string },
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
    scope: { ...factScope, target: target() },
    status: 'missing',
  };
}

/*** Produces the portable fixture target shared by contrast fact envelopes. */
function target() {
  return {
    kind: 'screen',
    projectId: 'project-1',
    targetId: 'target-1',
    tenantId: 'tenant-1',
  };
}
