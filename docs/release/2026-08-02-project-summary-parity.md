# Release Packet: Projects API Summary Parity

Date: 2026-08-02
Status: READY, NOT DEPLOYED

## Release Unit

- additive project summary fields for iteration, calibration, and explicitly selected shot evidence
- defensive validation of selected attempt references
- expanded Projects API smoke coverage
- no schema migration

## Preflight

- TypeScript check: PASS
- Smoke script syntax: PASS
- Local Worker CRUD/evidence smoke: PASS, 8/8
- Architecture and code review: PASS after repair

## Deployment Gate

Production deployment is intentionally not authorized by this packet. After approval, deploy this exact commit and run the existing production Projects API smoke. Roll back if any existing handoff fields regress or the new fields do not fail closed for old payloads.
