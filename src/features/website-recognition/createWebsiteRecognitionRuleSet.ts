import type { WebsiteObservedNode } from '@ankhorage/contracts/website';
import type { Rule, RuleEvaluationOutcome, RuleSet } from '@ankhorage/rules';

import type { WebsiteRecognitionRuleContext } from '../../types/websiteRecognitionRules';
import { websiteStructureEvidence } from './websiteStructureEvidence';

/*** Declares the versioned, provider-neutral Card predicate in the canonical Rules format. */
export function createWebsiteRecognitionRuleSet(): RuleSet<WebsiteRecognitionRuleContext> {
  return {
    id: 'ankhorage.rules-design.website-recognition',
    rules: [cardRecognitionRule],
  };
}

const cardRecognitionRule: Rule<WebsiteRecognitionRuleContext> = {
  defaultSeverity: 'info',
  dependencies: [],
  identity: { id: 'design.website-recognition.card', version: '1.0.0' },
  summary: 'A layout child owns a visible background or shadow independent of its layout cell.',
  evaluate: ({ context }) => evaluateCardRecognition(context),
};

/*** PASS means Card match; FAIL means no match, not a quality or policy violation. */
function evaluateCardRecognition(
  context: WebsiteRecognitionRuleContext,
): RuleEvaluationOutcome {
  const { node, parent, childNodesByParent } = context;
  const evidence = websiteStructureEvidence(node, [], parent);
  if (evidence.availableObservation === null)
    return { findings: [], status: 'INCOMPLETE' };
  if (
    !isLayoutGroup(parent) ||
    ownsNestedSurfaceLayout(node, childNodesByParent) ||
    !evidence.hasCardSurface
  )
    return { findings: [], status: 'FAIL' };
  return {
    findings: [
      {
        evidence: {
          signals: evidence.cardSurfaceReasons,
          sourceRef: node.sourceRef,
        },
        message: 'This layout child owns a visible Card surface.',
        ruleId: cardRecognitionRule.identity.id,
        severity: 'info',
        subjects: [{ id: node.sourceRef, kind: 'website-node' }],
      },
    ],
    status: 'PASS',
  };
}

/*** Prevents a layout owning separately bounded children from being their Card wrapper. */
function ownsNestedSurfaceLayout(
  node: WebsiteObservedNode,
  childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>,
): boolean {
  if (!isLayoutGroup(node)) return false;
  return (childNodesByParent.get(node.sourceRef) ?? []).some(
    (child) =>
      isGenericSurfaceNode(child) &&
      websiteStructureEvidence(child, [], node).hasCardSurface,
  );
}

/*** Checks measured Flex/Grid layout semantics without creating synthetic layout nodes. */
function isLayoutGroup(node: WebsiteObservedNode | null): boolean {
  if (node === null) return false;
  const css = websiteStructureEvidence(node).availableObservation?.css;
  return css !== null && css !== undefined && /grid|flex/u.test(css.display);
}

/*** Generic wrappers may own nested surfaces; semantic descendants retain their own type. */
function isGenericSurfaceNode(node: WebsiteObservedNode): boolean {
  return ['div', 'span'].includes(node.dom.tagName.toLowerCase());
}
