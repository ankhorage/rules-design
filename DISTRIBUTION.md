# Distribution decision

This document records the distribution boundary for `@ankhorage/rules-design` before the
high-value design-rule catalog is published. It is a packaging decision, not legal advice.

## Decision

`@ankhorage/rules-design` remains an MIT-licensed public package. Its first public release
contains the provider integration, public provider contract, and any rules explicitly selected
for the open basic provider. The existing [`LICENSE`](./LICENSE) remains unchanged.

Commercial rule packs are not added to this repository. A commercial pack, if one is released,
is a separately packaged and independently licensed provider that consumes the released public
`@ankhorage/rules` and `@ankhorage/rules-design` APIs. It must not depend on sibling source files
or make the open package a compatibility shim for unpublished code.

This makes the intended distribution boundary explicit:

| Asset | Distribution |
| --- | --- |
| Provider integration and basic provider rules in this repository | Public under MIT |
| A manifest shipped by this repository | Public under MIT and limited to the rules shipped here |
| Commercial-pack manifest and executable rule logic | Shipped only with that separately licensed pack |
| Plugin integration | Uses released public provider APIs; it does not copy or relicense pack logic |

The catalog implementation issue must classify every rule as either part of this open provider
or part of a separately distributed pack before its executable logic is published. It must not
silently place commercial logic under this repository's MIT license.

## Runtime and delivery

An installed open or commercial provider evaluates locally and offline. Evaluation must be
deterministic from the supplied facts, options, and installed rule version; it does not require a
remote request, account lookup, or telemetry.

Remote delivery is optional and limited to obtaining a separately versioned package or update.
It is not an execution dependency and must not alter the result of an already installed rule
version. Authentication, entitlement, and update transport stay outside the generic Rules engine
and outside the rule evaluator.

## Consequences

- The initial open provider scaffold can proceed independently of commercial-pack work.
- The full 106-rule catalog is not assumed to be open or proprietary as a whole; its executable
  rules are published only after their pack classification is recorded.
- A future commercial pack needs its own repository/package, license, release process, and public
  compatibility declaration. It may not change this repository's MIT license by implication.
- Consumers select providers through released public APIs, so open and commercial providers can
  coexist without a special engine branch.

## Review trigger

Revisit this decision before publishing the first commercial pack or changing what the open
provider ships. Any change to this boundary requires an explicit licensing review and a new
recorded decision; it must not be inferred from a package publication.
