import type { Capability } from '@ankhorage/contracts/capability';

/*** Publish the executable Rules Design capabilities used by Ankh provider discovery. */
export const CAPABILITIES = [
  {
    id: 'rules-design.recognize',
    owner: '@ankhorage/rules-design',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Recognize website design',
    description: 'Assemble canonical website recognition from an observation document.',
  },
  {
    id: 'rules-design.inspect',
    owner: '@ankhorage/rules-design',
    access: ['invoke'],
    binding: { kind: 'action', bindableAs: ['target'] },
    label: 'Inspect website recognition',
    description: 'Read an existing canonical website recognition document.',
  },
] as const satisfies readonly Capability[];
