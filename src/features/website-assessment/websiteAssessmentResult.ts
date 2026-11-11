import type { RuleSubject } from '@ankhorage/rules';

import type { AssessmentFinding, AssessmentResult } from '../../types/websiteAssessment';

/*** Produces deterministic outcomes and generic incomplete evidence for website assessment rules. */
export function websiteAssessmentResult(
  findings: readonly AssessmentFinding[] | null,
): AssessmentResult {
  if (findings === null)
    return {
      findings: [
        {
          evidence: { reason: 'incomplete-observation' },
          message: 'The supplied structured observations are insufficient for a safe assessment.',
          subject: incompleteSubject,
        },
      ],
      status: 'INCOMPLETE',
    };
  return findings.length === 0
    ? { findings: [], status: 'PASS' }
    : {
        findings: [...findings].sort((left, right) =>
          left.subject.id.localeCompare(right.subject.id),
        ),
        status: 'FAIL',
      };
}

const incompleteSubject: RuleSubject = { id: 'website-assessment', kind: 'website' };
