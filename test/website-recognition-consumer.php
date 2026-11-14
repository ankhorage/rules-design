<?php
declare(strict_types=1);

/** Validates the public canonical recognition JSON as an independent PHP consumer. */
function requireArray(mixed $value, string $path): array
{
    if (!is_array($value)) {
        throw new RuntimeException("Expected array at {$path}.");
    }
    return $value;
}

/** Reads a required map member without coercing absent or malformed consumer input. */
function requireMember(array $value, string $name, string $path): mixed
{
    if (!array_key_exists($name, $value)) {
        throw new RuntimeException("Missing {$path}.{$name}.");
    }
    return $value[$name];
}

/** Requires every source reference to retain its page-local qualified JSON identity. */
function requireQualifiedSourceRefs(array $references, string $path): void
{
    foreach ($references as $index => $reference) {
        if (!is_string($reference)) {
            throw new RuntimeException("Expected string source reference at {$path}[{$index}].");
        }
        $identity = json_decode($reference, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($identity) || count($identity) !== 2 || !array_is_list($identity)) {
            throw new RuntimeException("Expected page-qualified source reference at {$path}[{$index}].");
        }
    }
}

$fixture = $argv[1] ?? __DIR__ . '/fixtures/website-recognition-expected.v1.json';
$document = requireArray(json_decode(file_get_contents($fixture), true, 512, JSON_THROW_ON_ERROR), '$');
$isAnimationDocument = requireMember($document, 'observedDocumentId', '$') === 'website:animation-fixture';

if (requireMember($document, 'schemaVersion', '$') !== 1) {
    throw new RuntimeException('Expected schemaVersion 1.');
}

$pages = requireArray(requireMember($document, 'pages', '$'), '$.pages');
if (!$isAnimationDocument && count($pages) !== 2) {
    throw new RuntimeException('Expected two recognized pages.');
}

foreach ($pages as $pageIndex => $pageValue) {
    $page = requireArray($pageValue, "$.pages[{$pageIndex}]");
    $root = requireArray(requireMember($page, 'root', "$.pages[{$pageIndex}]"), "$.pages[{$pageIndex}].root");
    $nodes = requireArray(requireMember($page, 'nodes', "$.pages[{$pageIndex}]"), "$.pages[{$pageIndex}].nodes");
    if (!is_string(requireMember($root, 'id', "$.pages[{$pageIndex}].root")) || (!$isAnimationDocument && count($nodes) < 10)) {
        throw new RuntimeException("Expected hierarchy and nodes on page {$pageIndex}.");
    }
    foreach ($nodes as $nodeIndex => $nodeValue) {
        $node = requireArray($nodeValue, "$.pages[{$pageIndex}].nodes[{$nodeIndex}]");
        requireQualifiedSourceRefs(
            requireArray(requireMember($node, 'sourceRefs', "$.pages[{$pageIndex}].nodes[{$nodeIndex}]"), "$.pages[{$pageIndex}].nodes[{$nodeIndex}].sourceRefs"),
            "$.pages[{$pageIndex}].nodes[{$nodeIndex}].sourceRefs",
        );
        requireArray(requireMember($node, 'props', "$.pages[{$pageIndex}].nodes[{$nodeIndex}]"), "$.pages[{$pageIndex}].nodes[{$nodeIndex}].props");
    }
}

$tokens = requireArray(requireMember($document, 'designTokens', '$'), '$.designTokens');
$media = requireArray(requireMember($document, 'media', '$'), '$.media');
if (!$isAnimationDocument && (count($tokens) === 0 || count($media) < 4)) {
    throw new RuntimeException('Expected design tokens and complete media inventory.');
}
foreach ($tokens as $index => $tokenValue) {
    $token = requireArray($tokenValue, "$.designTokens[{$index}]");
    requireQualifiedSourceRefs(
        requireArray(requireMember($token, 'sourceRefs', "$.designTokens[{$index}]"), "$.designTokens[{$index}].sourceRefs"),
        "$.designTokens[{$index}].sourceRefs",
    );
}

foreach ($media as $index => $mediaValue) {
    $recognizedMedia = requireArray($mediaValue, "$.media[{$index}]");
    requireMember($recognizedMedia, 'asset', "$.media[{$index}]");
    requireMember($recognizedMedia, 'originalUrl', "$.media[{$index}]");
    requireQualifiedSourceRefs(
        requireArray(requireMember($recognizedMedia, 'sourceRefs', "$.media[{$index}]"), "$.media[{$index}].sourceRefs"),
        "$.media[{$index}].sourceRefs",
    );
}

if ($isAnimationDocument) {
    assertAnimationEvidence($document);
}

echo "PHP website-recognition consumer passed.\n";

/** Validates state-paired portable animation evidence without treating a CSS pseudo-element as a node. */
function assertAnimationEvidence(array $document): void
{
    $pages = requireArray(requireMember($document, 'pages', '$'), '$.pages');
    $page = requireArray($pages[0] ?? null, '$.pages[0]');
    $nodes = requireArray(requireMember($page, 'nodes', '$.pages[0]'), '$.pages[0].nodes');
    $animated = findNode($nodes, '["home","#animated"]');
    $initial = findProperty(requireArray(requireMember($animated, 'props', '$.pages[0].nodes[animated]'), '$.pages[0].nodes[animated].props'), 'animationEvidence');
    $initialValue = requireArray(requireMember($initial, 'value', '$.pages[0].nodes[animated].props.animationEvidence'), '$.pages[0].nodes[animated].props.animationEvidence.value');
    $initialEvidence = requireArray(requireMember($initialValue, 'animationEvidence', '$.pages[0].nodes[animated].props.animationEvidence.value'), '$.pages[0].nodes[animated].props.animationEvidence.value.animationEvidence');
    $pseudoElements = requireArray(requireMember($initialEvidence, 'pseudoElements', '$.pages[0].nodes[animated].props.animationEvidence.value.animationEvidence'), '$.pages[0].nodes[animated].props.animationEvidence.value.animationEvidence.pseudoElements');
    $initialPseudo = requireArray($pseudoElements[0] ?? null, '$.pages[0].nodes[animated].pseudoElements[0]');
    $initialSize = requireArray(requireMember($initialPseudo, 'boxSize', '$.pages[0].nodes[animated].pseudoElements[0]'), '$.pages[0].nodes[animated].pseudoElements[0].boxSize');
    $initialWidth = requireArray(requireMember($initialSize, 'width', '$.pages[0].nodes[animated].pseudoElements[0].boxSize'), '$.pages[0].nodes[animated].pseudoElements[0].boxSize.width');
    if (requireMember($initialWidth, 'value', '$.pages[0].nodes[animated].pseudoElements[0].boxSize.width') !== '0px') {
        throw new RuntimeException('Expected initial pseudo-element width evidence.');
    }
    $responsive = requireArray(requireMember($animated, 'responsive', '$.pages[0].nodes[animated]'), '$.pages[0].nodes[animated].responsive');
    $desktop = requireArray($responsive[0] ?? null, '$.pages[0].nodes[animated].responsive[0]');
    $settled = findProperty(requireArray(requireMember($desktop, 'props', '$.pages[0].nodes[animated].responsive[0]'), '$.pages[0].nodes[animated].responsive[0].props'), 'state:settled:animationEvidence');
    $settledValue = requireArray(requireMember($settled, 'value', '$.pages[0].nodes[animated].responsive[0].props.settled'), '$.pages[0].nodes[animated].responsive[0].props.settled.value');
    $settledEvidence = requireArray(requireMember($settledValue, 'animationEvidence', '$.pages[0].nodes[animated].responsive[0].props.settled.value'), '$.pages[0].nodes[animated].responsive[0].props.settled.value.animationEvidence');
    $settledPseudos = requireArray(requireMember($settledEvidence, 'pseudoElements', '$.pages[0].nodes[animated].responsive[0].props.settled.value.animationEvidence'), '$.pages[0].nodes[animated].responsive[0].props.settled.value.animationEvidence.pseudoElements');
    $settledSize = requireArray(requireMember(requireArray($settledPseudos[0] ?? null, '$.pages[0].nodes[animated].settledPseudo[0]'), 'boxSize', '$.pages[0].nodes[animated].settledPseudo[0]'), '$.pages[0].nodes[animated].settledPseudo[0].boxSize');
    $settledWidth = requireArray(requireMember($settledSize, 'width', '$.pages[0].nodes[animated].settledPseudo[0].boxSize'), '$.pages[0].nodes[animated].settledPseudo[0].boxSize.width');
    if (requireMember($settledWidth, 'value', '$.pages[0].nodes[animated].settledPseudo[0].boxSize.width') !== '75px') {
        throw new RuntimeException('Expected settled pseudo-element width evidence.');
    }
    foreach ($nodes as $node) {
        $candidate = requireArray($node, '$.pages[0].nodes[]');
        if (str_contains((string) requireMember($candidate, 'id', '$.pages[0].nodes[]'), '::')) {
            throw new RuntimeException('Pseudo-element evidence must not become a DOM node.');
        }
    }
}

/** Finds a recognition node by its page-qualified source identity. */
function findNode(array $nodes, string $id): array
{
    foreach ($nodes as $node) {
        $candidate = requireArray($node, '$.pages[0].nodes[]');
        if (requireMember($candidate, 'id', '$.pages[0].nodes[]') === $id) {
            return $candidate;
        }
    }
    throw new RuntimeException("Missing recognition node {$id}.");
}

/** Finds one recognized property without reducing distinct observation states. */
function findProperty(array $properties, string $name): array
{
    foreach ($properties as $property) {
        $candidate = requireArray($property, '$.props[]');
        if (requireMember($candidate, 'name', '$.props[]') === $name) {
            return $candidate;
        }
    }
    throw new RuntimeException("Missing recognition property {$name}.");
}
