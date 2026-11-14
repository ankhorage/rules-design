import { isSerializableValue, type SerializableValue } from '@ankhorage/contracts';
import type { WebsiteNodeObservation, WebsiteObservedNode } from '@ankhorage/contracts/website';

import type {
  WebsiteDesignPropertyObservation,
  WebsiteDesignUnresolvedObservation,
} from '../../types/websiteDesignRecognition';

/*** Recognizes factual portable animation evidence without inferring a CSS transition outcome. */
export function recognizeWebsiteAnimationEvidence(pageId: string, node: WebsiteObservedNode) {
  return {
    observations: node.observations.flatMap((observation) =>
      observation.animationEvidence === undefined
        ? []
        : [animationObservation(pageId, node.sourceRef, observation)],
    ),
    unresolved: node.observations.flatMap((observation) =>
      animationUnresolvedObservations(pageId, node.sourceRef, observation),
    ),
  };
}

/*** Records one animation sample with state, viewport, and provenance intact for later consumers. */
function animationObservation(
  pageId: string,
  sourceRef: string,
  observation: WebsiteNodeObservation,
): WebsiteDesignPropertyObservation {
  return {
    name: 'animationEvidence',
    pageId,
    provenance: observation.provenance,
    sourceRef,
    stateId: observation.stateId,
    value: serializableAnimationEvidence(pageId, sourceRef, observation),
    viewportId: observation.viewportId,
  };
}

/*** Packages observed animation evidence with its exact capture coordinates for later consumers. */
function serializableAnimationEvidence(
  pageId: string,
  sourceRef: string,
  observation: WebsiteNodeObservation,
): SerializableValue {
  const { animationEvidence } = observation;
  if (animationEvidence === undefined)
    throw new TypeError('Animation evidence must be serializable.');
  return {
    animationEvidence: serializableValue(animationEvidence),
    provenance: serializableValue(observation.provenance),
    sourceRef: JSON.stringify([pageId, sourceRef]),
    stateId: observation.stateId,
    viewportId: observation.viewportId,
  };
}

/*** Verifies a portable record at the contract boundary before storing it in a generic prop value. */
function serializableValue(value: unknown): SerializableValue {
  if (!isSerializableValue(value)) throw new TypeError('Animation evidence must be serializable.');
  return value;
}

/*** Makes each missing or uncertain animation channel visible without fabricating a CSS value. */
function animationUnresolvedObservations(
  pageId: string,
  sourceRef: string,
  observation: WebsiteNodeObservation,
): readonly WebsiteDesignUnresolvedObservation[] {
  const { animationEvidence: evidence } = observation;
  if (evidence === undefined) return [];
  const missing = [
    ...evidence.uncertainty.map((value) => ({ missing: value, subject: 'uncertainty' })),
    ...animationPropertyMissing(evidence.target.animation, 'target.animation'),
    ...animationPropertyMissing(evidence.target.transform, 'target.transform'),
    ...animationPropertyMissing(evidence.target.transition, 'target.transition'),
    ...evidence.pseudoElements.flatMap((pseudoElement) => [
      ...availabilityMissing(pseudoElement.availability, pseudoElement.pseudo),
      ...animationPropertyMissing(pseudoElement.content, `${pseudoElement.pseudo}.content`),
      ...animationPropertyMissing(
        pseudoElement.boxSize.width,
        `${pseudoElement.pseudo}.boxSize.width`,
      ),
      ...animationPropertyMissing(
        pseudoElement.boxSize.height,
        `${pseudoElement.pseudo}.boxSize.height`,
      ),
    ]),
  ];
  return missing.map(({ missing: value, subject }) => ({
    kind: 'animation-evidence',
    missing: value,
    pageId,
    provenance: observation.provenance,
    sourceRef,
    stateId: observation.stateId,
    subject,
    viewportId: observation.viewportId,
  }));
}

/*** Reads a missing animation property while retaining its precise CSS evidence path. */
function animationPropertyMissing(
  property: { readonly availability: WebsiteNodeObservation['availability'] },
  subject: string,
) {
  return availabilityMissing(property.availability, subject);
}

/*** Converts a producer-declared unavailable source channel into unresolved recognition evidence. */
function availabilityMissing(
  availability: WebsiteNodeObservation['availability'],
  subject: string,
) {
  return availability.status === 'missing' && availability.missing !== null
    ? [{ missing: availability.missing, subject }]
    : [];
}
