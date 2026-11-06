import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { completeResponsiveFact } from '../../../test/fixtures/responsiveFact';
import { createResponsiveRules } from './createResponsiveRules';

const capabilities = ['viewport.layout', 'viewport.matrix'];
const scope = { id: 'page:/fixture', kind: 'page' };

test('owns touch-target policy, reports its own rule ID, and rejects missing text order', () => {
  const fact = completeResponsiveFact();
  const [firstViewport, ...remainingViewports] = fact.value.viewports;
  const result = evaluateRules(
    {
      facts: [
        {
          ...fact,
          value: {
            ...fact.value,
            minimumTouchTarget: 1,
            viewports: [
              {
                ...firstViewport,
                elements: firstViewport.elements.map((element) =>
                  element.kind === 'control'
                    ? { ...element, bounds: { ...element.bounds, height: 20, width: 20 } }
                    : element.kind === 'text'
                      ? { ...element, readingOrder: null }
                      : element,
                ),
              },
              ...remainingViewports,
            ],
          },
        },
      ],
    },
    createResponsiveRules(),
    { capabilities, scope },
  );
  const touchTarget = result.results.find(
    (entry) => entry.rule.id === 'design.responsive.touch-target',
  );
  const order = result.results.find((entry) => entry.rule.id === 'design.responsive.order');

  expect(touchTarget).toMatchObject({ status: 'FAIL' });
  expect(touchTarget?.findings[0]?.ruleId).toBe('design.responsive.touch-target');
  expect(order).toMatchObject({ status: 'INCOMPLETE' });
  expect(order?.findings[0]?.ruleId).toBe('design.responsive.order');
});
