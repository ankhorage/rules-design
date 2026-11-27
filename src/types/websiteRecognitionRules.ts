import type { WebsiteObservedNode } from '@ankhorage/contracts/website';

/*** Source-linked facts used by the canonical Rules evaluation for website modules. */
export interface WebsiteRecognitionRuleContext {
  readonly childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>;
  readonly node: WebsiteObservedNode;
  readonly parent: WebsiteObservedNode | null;
}
