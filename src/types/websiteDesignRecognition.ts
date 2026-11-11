import type { SerializableValue } from '@ankhorage/contracts';
import type {
  WebsiteMediaReference,
  WebsiteMissingValue,
  WebsiteObservationProvenance,
} from '@ankhorage/contracts/website';

/*** Identifies one observed DOM node within the page that owns its local source reference. */
export interface WebsiteDesignSourceReference {
  readonly pageId: string;
  readonly sourceRef: string;
}

/*** Describes one exact observed design value without assigning a quality verdict. */
export interface WebsiteDesignPropertyObservation {
  readonly name: string;
  readonly value: SerializableValue;
  readonly viewportId: string;
  readonly stateId: string;
  readonly sourceRef: string;
  readonly pageId: string;
  readonly provenance: WebsiteObservationProvenance;
}

/*** Retains an unavailable observation instead of substituting or silently omitting design evidence. */
export interface WebsiteDesignUnresolvedObservation {
  readonly kind: 'computed-css' | 'geometry';
  readonly viewportId: string;
  readonly stateId: string;
  readonly sourceRef: string;
  readonly pageId: string;
  readonly provenance: WebsiteObservationProvenance;
  readonly missing: WebsiteMissingValue;
}

/*** Groups all factual design observations for one stable observed DOM node. */
export interface WebsiteDesignNodeRecognition {
  readonly sourceRef: string;
  readonly pageId: string;
  readonly colors: readonly WebsiteDesignPropertyObservation[];
  readonly typography: readonly WebsiteDesignPropertyObservation[];
  readonly layout: readonly WebsiteDesignPropertyObservation[];
  readonly responsive: readonly WebsiteDesignPropertyObservation[];
  readonly accessibility: readonly WebsiteDesignPropertyObservation[];
  readonly media: readonly WebsiteMediaReference[];
  readonly unresolved: readonly WebsiteDesignUnresolvedObservation[];
}

/*** Records a repeated observed value as a reusable token candidate without inventing a role. */
export interface WebsiteDesignTokenCandidate {
  readonly kind: 'color' | 'radius' | 'shadow' | 'spacing' | 'typography';
  readonly property: string;
  readonly value: string;
  readonly originalValues: readonly string[];
  readonly sourceRefs: readonly WebsiteDesignSourceReference[];
  readonly confidence: number;
  readonly inferredRole: null;
}

/*** Provides the factual design-property contribution for later website recognition assembly. */
export interface WebsiteDesignRecognition {
  readonly nodes: readonly WebsiteDesignNodeRecognition[];
  readonly tokenCandidates: readonly WebsiteDesignTokenCandidate[];
}
