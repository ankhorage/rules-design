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

$fixture = __DIR__ . '/fixtures/website-recognition-expected.v1.json';
$document = requireArray(json_decode(file_get_contents($fixture), true, 512, JSON_THROW_ON_ERROR), '$');

if (requireMember($document, 'schemaVersion', '$') !== 1) {
    throw new RuntimeException('Expected schemaVersion 1.');
}

$pages = requireArray(requireMember($document, 'pages', '$'), '$.pages');
if (count($pages) !== 2) {
    throw new RuntimeException('Expected two recognized pages.');
}

foreach ($pages as $pageIndex => $pageValue) {
    $page = requireArray($pageValue, "$.pages[{$pageIndex}]");
    $root = requireArray(requireMember($page, 'root', "$.pages[{$pageIndex}]"), "$.pages[{$pageIndex}].root");
    $nodes = requireArray(requireMember($page, 'nodes', "$.pages[{$pageIndex}]"), "$.pages[{$pageIndex}].nodes");
    if (!is_string(requireMember($root, 'id', "$.pages[{$pageIndex}].root")) || count($nodes) < 10) {
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
if (count($tokens) === 0 || count($media) < 4) {
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

echo "PHP website-recognition consumer passed.\n";
