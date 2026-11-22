import type { JsonValue, RuleSubject } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

/*** Validates privacy-safe, normalized values shared by website assessment rules. */
export const websiteAssessmentValues = {
  subject(value: unknown): RuleSubject | null {
    if (!isRecord(value)) return null;
    const id = this.text(value.id);
    const kind = this.text(value.kind);
    return id === null || kind === null ? null : { id, kind };
  },
  text(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  },
  year(value: JsonValue | undefined): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1000 && value <= 9999;
  },
};
