import { expect, test } from 'bun:test';

import { designRuleCatalog } from './designRuleCatalog.ts';
import { designRuleProfiles } from './designRuleProfiles.ts';
import { designRuleProviderManifest } from './designRuleProviderManifest.ts';
import { filterDesignRuleCatalog } from './filterDesignRuleCatalog.ts';
import { designRulePlanningManifest } from './fixtures/designRuleCatalogManifest.ts';

test('contains the frozen atomic and C.R.A.P. catalog sizes with complete planned metadata', () => {
  const atomicRules = designRuleCatalog.filter((entry) => !entry.id.startsWith('design.crap'));
  const compositeRules = designRuleCatalog.filter((entry) => entry.id.startsWith('design.crap'));

  expect(atomicRules).toHaveLength(106);
  expect(compositeRules).toHaveLength(5);
  expect(new Set(designRuleCatalog.map((entry) => entry.id)).size).toBe(designRuleCatalog.length);
  expect(designRuleCatalog.every((entry) => entry.description.length > 0)).toBe(true);
  expect(designRuleCatalog.every((entry) => entry.expectedEvidence.assertion.length > 0)).toBe(
    true,
  );
  expect(designRuleCatalog.every((entry) => entry.expectedEvidence.observations.length > 0)).toBe(
    true,
  );
  expect(designRuleCatalog.every((entry) => entry.expectedEvidence.source.length > 0)).toBe(true);
  expect(designRuleCatalog.every((entry) => entry.requiredCapabilities.length > 0)).toBe(true);
  expect([...new Set(designRuleCatalog.map((entry) => entry.status))]).toEqual(['planned']);
  expect([...new Set(designRuleCatalog.map((entry) => entry.semanticsVersion))]).toEqual(['1']);
  expect(designRulePlanningManifest).toEqual({
    profiles: designRuleProfiles,
    rules: designRuleCatalog,
    schemaVersion: '1',
  });
  expect(designRuleProviderManifest).toEqual({
    packageName: '@ankhorage/rules-design',
    providerId: 'ankhorage.rules-design',
    publishedRuleIds: [],
    schemaVersion: '1',
  });
});

test('defines rule-specific scopes, capabilities, and inspectable evidence', () => {
  const byId = new Map(designRuleCatalog.map((entry) => [entry.id, entry]));
  expect(byId.get('design.color.token-exists')).toMatchObject({
    facets: { scopes: ['project'] },
    requiredCapabilities: ['source.style-tokens'],
    expectedEvidence: { source: 'declared-design-tokens' },
  });
  expect(byId.get('design.contrast.text-ratio')).toMatchObject({
    facets: { scopes: ['element'] },
    requiredCapabilities: ['dom.computed-style', 'dom.text-content'],
    expectedEvidence: { source: 'resolved-rendered-style' },
  });
  expect(byId.get('design.responsive.reflow')).toMatchObject({
    facets: { scopes: ['page'] },
    requiredCapabilities: ['viewport.layout', 'viewport.matrix'],
    expectedEvidence: { source: 'viewport-layout-snapshots' },
  });
  expect(byId.get('design.crap')?.requiredCapabilities).toEqual(['rule.result-set']);
});

test('keeps composite dependencies defined and acyclic', () => {
  const byId = new Map(designRuleCatalog.map((entry) => [entry.id, entry]));
  expect(
    designRuleCatalog.every((entry) =>
      entry.dependencies.every((dependency) => byId.has(dependency)),
    ),
  ).toBe(true);
  expect(isAcyclic(designRuleCatalog)).toBe(true);
  expect(byId.get('design.crap')?.dependencies).toEqual([
    'design.crap.contrast',
    'design.crap.repetition',
    'design.crap.alignment',
    'design.crap.proximity',
  ]);
});

test('filters controlled Heading, Color, Button, and combined facets deterministically', () => {
  expect(
    filterDesignRuleCatalog(designRuleCatalog, { topics: ['heading'] }).map((entry) => entry.id),
  ).toContain('design.heading.h1-presence');
  expect(
    filterDesignRuleCatalog(designRuleCatalog, { topics: ['color'] }).map((entry) => entry.id),
  ).toContain('design.color.usage-distribution');
  expect(
    filterDesignRuleCatalog(designRuleCatalog, { subjects: ['button'] }).map((entry) => entry.id),
  ).toContain('design.repetition.button-variants');
  expect(
    filterDesignRuleCatalog(designRuleCatalog, {
      topics: ['color', 'heading'],
    }),
  ).toEqual([]);
});

test('declares the frozen selectable profiles without adding a sixth composite rule', () => {
  const catalogIds = new Set(designRuleCatalog.map((entry) => entry.id));
  expect(designRuleProfiles.map((profile) => profile.id)).toEqual([
    'design.quality.base',
    'design.wcag.advisory',
    'design.crap',
    'design.60-30-10',
  ]);
  expect(
    designRuleProfiles.every((profile) => profile.rootRuleIds.every((id) => catalogIds.has(id))),
  ).toBe(true);
  expect(
    designRuleProfiles.find((profile) => profile.id === 'design.60-30-10')?.rootRuleIds,
  ).toEqual(['design.color.usage-distribution']);
});

function isAcyclic(
  entries: readonly {
    readonly dependencies: readonly string[];
    readonly id: string;
  }[],
): boolean {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  return entries.every((entry) => visit(entry.id));

  function visit(id: string): boolean {
    if (visited.has(id)) return true;
    if (visiting.has(id)) return false;
    visiting.add(id);
    const result = byId.get(id)?.dependencies.every(visit) ?? false;
    visiting.delete(id);
    visited.add(id);
    return result;
  }
}
