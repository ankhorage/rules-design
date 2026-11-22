import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleFinding, RuleScope } from '@ankhorage/rules';

import type {
  ResponsiveDesignContext,
  ResponsiveElement,
  ResponsiveEvaluation,
  ResponsiveMatrix,
  ResponsiveViewport,
} from '../../types/responsive.js';
import { evaluateResponsiveOrder } from './evaluateResponsiveOrder.js';
import { isContainedInResponsiveBounds } from './isContainedInResponsiveBounds.js';
import { parseResponsiveMatrix } from './parseResponsiveMatrix.js';
import { responsiveElementsOfKind } from './responsiveElementsOfKind.js';
import { selectResponsiveFact } from './selectResponsiveFact.js';

interface ResponsiveRuleDefinition {
  readonly evaluate: (matrix: ResponsiveMatrix) => ResponsiveEvaluation;
  readonly id: string;
  readonly severity: 'warning';
  readonly summary: string;
}

/*** Creates the independently owned Responsive rule family from normalized viewport facts. */
export function createResponsiveRules(): readonly Rule<ResponsiveDesignContext>[] {
  return responsiveRuleDefinitions.map(createResponsiveRule);
}

const responsiveRuleDefinitions: readonly ResponsiveRuleDefinition[] = [
  {
    evaluate: () => pass(),
    id: 'design.responsive.breakpoint-coverage',
    severity: 'warning',
    summary: 'Require every declared breakpoint range to have a viewport measurement.',
  },
  {
    evaluate: (matrix) =>
      evaluateViewportBoolean(
        matrix,
        (viewport) => viewport.layout.renderedWidth > viewport.size.width,
        'Layouts did not reflow.',
      ),
    id: 'design.responsive.reflow',
    severity: 'warning',
    summary: 'Require measured layouts to reflow at every declared viewport.',
  },
  {
    evaluate: (matrix) =>
      evaluateViewportBoolean(
        matrix,
        (viewport) => viewport.layout.scrollWidth > viewport.size.width,
        'Layouts overflow horizontally.',
      ),
    id: 'design.responsive.horizontal-overflow',
    severity: 'warning',
    summary: 'Require viewport measurements without horizontal overflow.',
  },
  {
    evaluate: (matrix) =>
      evaluateElementBoolean(
        matrix,
        'text',
        (element) =>
          element.textLineCount === null || element.textUnwrappedWidth === null
            ? null
            : element.textUnwrappedWidth <= element.bounds.width || element.textLineCount > 1,
        'Text does not wrap meaningfully.',
      ),
    id: 'design.responsive.text-wrap',
    severity: 'warning',
    summary: 'Require measured text to wrap meaningfully at each viewport.',
  },
  {
    evaluate: (matrix) => {
      const controls = responsiveElementsOfKind(matrix, 'control');
      if (controls.length === 0) return incomplete('No control measurements were supplied.');
      const tooSmall = controls.filter(
        (element) => element.bounds.width < 24 || element.bounds.height < 24,
      );
      return tooSmall.length === 0
        ? pass()
        : fail(
            'Controls do not meet the 24 CSS pixel touch-target policy.',
            tooSmall.map((item) => item.id),
          );
    },
    id: 'design.responsive.touch-target',
    severity: 'warning',
    summary: 'Require measured controls to meet the responsive touch target.',
  },
  {
    evaluate: evaluateResponsiveOrder,
    id: 'design.responsive.order',
    severity: 'warning',
    summary: 'Require important text to retain its reading order when reflowed.',
  },
  {
    evaluate: (matrix) =>
      evaluateElementBoolean(
        matrix,
        'image',
        (element) =>
          element.focalPointBounds === null
            ? null
            : isContainedInResponsiveBounds(element.bounds, element.focalPointBounds),
        'Image crops hide declared focal content.',
      ),
    id: 'design.responsive.image-crop',
    severity: 'warning',
    summary: 'Advises when measured responsive image crops hide focal content.',
  },
  {
    evaluate: (matrix) => {
      const problematic = matrix.viewports.flatMap((viewport) =>
        viewport.elements.filter(
          (element) =>
            element.fixedSize !== null &&
            (element.fixedSize.width > viewport.size.width ||
              element.fixedSize.height > viewport.size.height),
        ),
      );
      return problematic.length === 0
        ? pass()
        : fail(
            'Problematic fixed dimensions were measured.',
            problematic.map((item) => item.id),
          );
    },
    id: 'design.responsive.fixed-dimensions',
    severity: 'warning',
    summary: 'Require measurements without problematic fixed dimensions.',
  },
  {
    evaluate: (matrix) => {
      const zoomed = matrix.viewports.filter((viewport) => viewport.zoom > 1);
      if (zoomed.length === 0) return incomplete('No zoomed viewport measurement was supplied.');
      const failures = zoomed.filter(
        (viewport) => viewport.layout.renderedWidth > viewport.size.width,
      );
      return failures.length === 0
        ? pass()
        : fail(
            'Layouts do not reflow under zoom.',
            failures.map((item) => item.id),
          );
    },
    id: 'design.responsive.zoom-reflow',
    severity: 'warning',
    summary: 'Require a zoomed viewport measurement whose layout reflows.',
  },
  {
    evaluate: (matrix) => {
      const observed = new Set(matrix.viewports.map((viewport) => viewport.orientation));
      const missing = matrix.requiredOrientations.filter(
        (orientation) => !observed.has(orientation),
      );
      if (missing.length > 0)
        return incomplete('Required orientation measurements were not supplied.', missing);
      const failures = matrix.viewports.filter(
        (viewport) =>
          viewport.layout.renderedWidth > viewport.size.width ||
          viewport.layout.scrollWidth > viewport.size.width,
      );
      return failures.length === 0
        ? pass()
        : fail(
            'Layouts are not robust across orientation.',
            failures.map((item) => item.id),
          );
    },
    id: 'design.responsive.orientation',
    severity: 'warning',
    summary: 'Require declared portrait and landscape measurements to remain robust.',
  },
];

/*** Creates one generic Rules contract from a responsive policy definition. */
function createResponsiveRule(definition: ResponsiveRuleDefinition): Rule<ResponsiveDesignContext> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateResponsiveRule(context.facts, definition, scope),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: ['viewport.layout', 'viewport.matrix'],
    summary: definition.summary,
  };
}

/*** Evaluates one rule only from available, normalized responsive matrix facts. */
function evaluateResponsiveRule(
  facts: readonly FactEnvelope[],
  definition: ResponsiveRuleDefinition,
  scope: RuleScope,
): RuleEvaluationOutcome {
  const fact = selectResponsiveFact(facts, scope);
  if (fact === null) {
    return outcome(
      definition.id,
      'INCOMPLETE',
      'Responsive viewport measurements are unavailable.',
      [],
    );
  }
  const matrix = parseResponsiveMatrix(fact.value);
  if (matrix === null) {
    return outcome(definition.id, 'INCOMPLETE', 'Responsive viewport measurements are malformed.', [
      fact.id,
    ]);
  }
  if (matrix.viewports.length === 0) {
    return outcome(
      definition.id,
      'INCOMPLETE',
      'No responsive viewport measurements were supplied.',
      [],
      [fact.id],
    );
  }
  const missingBreakpointIds = requiredBreakpointIds(matrix);
  if (missingBreakpointIds.length > 0) {
    return outcome(
      definition.id,
      'INCOMPLETE',
      'Required breakpoint viewport measurements were not supplied.',
      missingBreakpointIds,
      [fact.id],
    );
  }
  const evaluation = definition.evaluate(matrix);
  return outcome(definition.id, evaluation.status, evaluation.message, evaluation.failingIds, [
    fact.id,
  ]);
}

/*** Lists declared breakpoint IDs that lack their required viewport evidence. */
function requiredBreakpointIds(matrix: ResponsiveMatrix): readonly string[] {
  const observedIds = new Set(matrix.viewports.map((viewport) => viewport.id));
  return matrix.requiredBreakpointIds.filter((id) => !observedIds.has(id));
}

/*** Builds an engine finding without allowing a missing measurement to look successful. */
function outcome(
  ruleId: string,
  status: ResponsiveEvaluation['status'],
  message: string,
  subjectIds: readonly string[],
  factIds: readonly string[] = [],
): RuleEvaluationOutcome {
  return status === 'PASS'
    ? { findings: [], status }
    : {
        findings: [
          {
            evidence: { factIds, subjectIds },
            message,
            ruleId,
            severity: 'info',
            subjects: subjectIds.map((id) => ({ id, kind: 'responsive-measurement' })),
          } satisfies RuleFinding,
        ],
        status,
      };
}

/*** Returns a passing responsive policy evaluation. */
function pass(): ResponsiveEvaluation {
  return { failingIds: [], message: '', status: 'PASS' };
}

/*** Returns a failed responsive policy evaluation with its measured subjects. */
function fail(message: string, failingIds: readonly string[]): ResponsiveEvaluation {
  return { failingIds, message, status: 'FAIL' };
}

/*** Returns an incomplete responsive policy evaluation when measurements are absent. */
function incomplete(message: string, failingIds: readonly string[] = []): ResponsiveEvaluation {
  return { failingIds, message, status: 'INCOMPLETE' };
}

/*** Evaluates a required boolean viewport measurement. */
function evaluateViewportBoolean(
  matrix: ResponsiveMatrix,
  isFailure: (viewport: ResponsiveViewport) => boolean,
  message: string,
): ResponsiveEvaluation {
  const failures = matrix.viewports.filter(isFailure);
  return failures.length === 0
    ? pass()
    : fail(
        message,
        failures.map((item) => item.id),
      );
}

/*** Evaluates a required boolean element measurement for one semantic element kind. */
function evaluateElementBoolean(
  matrix: ResponsiveMatrix,
  kind: ResponsiveElement['kind'],
  observed: (element: ResponsiveElement) => boolean | null,
  message: string,
): ResponsiveEvaluation {
  const elements = responsiveElementsOfKind(matrix, kind);
  if (elements.length === 0) return incomplete(`No ${kind} measurements were supplied.`);
  const unknown = elements.filter((element) => observed(element) === null);
  if (unknown.length > 0)
    return incomplete(
      `${kind} measurements are incomplete.`,
      unknown.map((item) => item.id),
    );
  const failures = elements.filter((element) => observed(element) === false);
  return failures.length === 0
    ? pass()
    : fail(
        message,
        failures.map((item) => item.id),
      );
}
