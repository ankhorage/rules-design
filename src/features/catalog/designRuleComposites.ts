import type { DesignRuleCatalogEntry } from '../../types/designRuleCatalog.js';

/*** Creates the five planned C.R.A.P. composite nodes from their atomic child rules. */
export function designRuleComposites(
  atomicEntries: readonly DesignRuleCatalogEntry[],
): readonly DesignRuleCatalogEntry[] {
  const children = (prefixes: readonly string[]) =>
    atomicEntries
      .filter((entry) => prefixes.some((prefix) => entry.id.startsWith(prefix)))
      .map((entry) => entry.id);
  return [
    composite(
      'design.crap.contrast',
      'C.R.A.P. contrast composition.',
      children(['design.color.', 'design.contrast.']),
    ),
    composite(
      'design.crap.repetition',
      'C.R.A.P. repetition composition.',
      children(['design.repetition.', 'design.typography.']),
    ),
    composite(
      'design.crap.alignment',
      'C.R.A.P. alignment composition.',
      children(['design.alignment.', 'design.layout.', 'design.responsive.']),
    ),
    composite(
      'design.crap.proximity',
      'C.R.A.P. proximity composition.',
      children(['design.spacing.', 'design.proximity.']),
    ),
    composite('design.crap', 'C.R.A.P. composition from exactly four composite results.', [
      'design.crap.contrast',
      'design.crap.repetition',
      'design.crap.alignment',
      'design.crap.proximity',
    ]),
  ];
}

/*** Creates the evidence contract for a planned advisory composite. */
function composite(
  id: string,
  description: string,
  dependencies: readonly string[],
): DesignRuleCatalogEntry {
  return {
    assessmentKind: 'heuristic',
    dependencies,
    description,
    evidenceSchemaVersion: '1',
    expectedEvidence: {
      assertion: 'Every referenced child rule result is available for composition.',
      observations: ['child rule identifier', 'child result status', 'child evidence reference'],
      source: 'rule-result-set',
    },
    facets: {
      principles:
        id === 'design.crap'
          ? ['contrast', 'repetition', 'alignment', 'proximity']
          : [id.split('.').at(-1) ?? ''],
      scopes: ['project'],
      subjects: ['page'],
      topics: ['design-quality'],
    },
    group: 'C.R.A.P.',
    id,
    name: id.slice('design.'.length),
    requiredCapabilities: ['rule.result-set'],
    semanticsVersion: '1',
    severity: 'advisory',
    status: 'planned',
  };
}
