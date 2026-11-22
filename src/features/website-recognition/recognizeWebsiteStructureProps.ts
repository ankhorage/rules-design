import type { WebsiteObservedNode, WebsiteRecognizedProp } from '@ankhorage/contracts/website';

/*** Retains text runs, links, media references, and heading level as source-linked structural props. */
export function recognizeWebsiteStructureProps(
  node: WebsiteObservedNode,
): readonly WebsiteRecognizedProp[] {
  const textRuns = node.textRuns.map((textRun) => ({
    end: textRun.end,
    sourceRef: textRun.sourceRef,
    start: textRun.start,
    text: textRun.text,
  }));
  const links = node.links.map((link) => ({
    label: link.label,
    sourceRef: link.sourceRef,
    url: link.url,
  }));
  const media = node.media.map((item) => ({
    alt: item.alt,
    assetId: item.assetId,
    kind: item.kind,
    sourceRef: item.sourceRef,
    url: item.url,
  }));
  const headingLevel = headingLevelFor(node.dom.tagName);
  return [
    ...(textRuns.length === 0 ? [] : [recognizedProp('textRuns', textRuns)]),
    ...(links.length === 0 ? [] : [recognizedProp('links', links)]),
    ...(media.length === 0 ? [] : [recognizedProp('media', media)]),
    ...(headingLevel === null ? [] : [recognizedProp('level', headingLevel)]),
  ];
}

/*** Creates one serializable recognition prop while retaining the exact source value. */
function recognizedProp(
  name: string,
  value: WebsiteRecognizedProp['value'],
): WebsiteRecognizedProp {
  return { name, originalValues: [value], value };
}

/*** Extracts an explicit heading level only from an observed heading tag. */
function headingLevelFor(tagName: string): number | null {
  return /^h[1-6]$/i.test(tagName) ? Number(tagName[1]) : null;
}
