import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createCardAndDividerEvidenceDocument } from '../../../test/fixtures/websiteRecognition';
import { createWebsiteRecognitionRuleSet } from '../../index.ts';

test('declares the Card recognition in the versioned canonical Rules format', () => {
  const ruleSet = createWebsiteRecognitionRuleSet();

  expect(ruleSet.id).toBe('ankhorage.rules-design.website-recognition');
  expect(ruleSet.rules.map((rule) => rule.identity)).toEqual([
    { id: 'design.website-recognition.card', version: '1.0.0' },
  ]);
  expect(ruleSet.rules[0]?.dependencies).toEqual([]);
});

test('recognizes empty owned surfaces and records which signals proved the Card', () => {
  const background = evaluateFixtureRule('surface:empty');
  const image = evaluateFixtureRule('surface:image');

  expect(background.results[0]?.status).toBe('PASS');
  expect(background.results[0]?.findings[0]?.evidence).toEqual({
    signals: ['background-color'],
    sourceRef: 'surface:empty',
  });
  expect(image.results[0]?.status).toBe('PASS');
  expect(image.results[0]?.findings[0]?.evidence).toEqual({
    signals: ['background-image'],
    sourceRef: 'surface:image',
  });
});

test('excludes borders, radius and bare layout cells without promoting them to Cards', () => {
  const negatives = [
    'surface:radius-only',
    'surface:same-background',
    'surface:invisible-border',
    'surface:four-sided-border',
    'surface:copyright-border',
    'surface:plain-cell',
  ];

  expect(negatives.map((sourceRef) => evaluateFixtureRule(sourceRef).results[0]?.status)).toEqual(
    negatives.map(() => 'FAIL'),
  );
});

test('keeps non-layout children outside Card recognition, including actual dividers', () => {
  expect(evaluateFixtureRule('surface:hr').results[0]?.status).toBe('FAIL');
});

/*** Evaluates one real fixture node through the public RuleSet and generic Rules engine. */
function evaluateFixtureRule(sourceRef: string) {
  const nodes = createCardAndDividerEvidenceDocument().pages[0]?.nodes ?? [];
  const node = nodes.find((candidate) => candidate.sourceRef === sourceRef);
  if (node === undefined) throw new Error(`Missing fixture ${sourceRef}.`);
  const parent = nodes.find((candidate) => candidate.sourceRef === node.parentSourceRef) ?? null;
  const childNodesByParent = new Map(
    nodes.map((candidate) => [
      candidate.sourceRef,
      nodes.filter((child) => child.parentSourceRef === candidate.sourceRef),
    ]),
  );
  return evaluateRules(
    { childNodesByParent, node, parent },
    createWebsiteRecognitionRuleSet().rules,
    { scope: { id: node.sourceRef, kind: 'website-node' } },
  );
}
