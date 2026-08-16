# Release Packet: Project Approval Summary Parity

Date: 2026-08-16
Status: READY, NOT DEPLOYED

## Release Unit

- approval-aware handoff summaries for project list and detail
- defensive selected-attempt and receipt validation
- legacy payload fail-closed compatibility
- production-safe Projects API smoke entry gate
- no schema migration

## Preflight

- TypeScript check: PASS
- Smoke script syntax: PASS
- Local Worker CRUD and approval smoke: PASS, 18/18
- Architecture, code review, and test review: PASS after repair

## Deployment Gate

Production deployment is not authorized by this packet. After approval, deploy the exact commit, run the smoke with an explicit production base URL and `--allow-production`, and verify both blocked and approved summaries. Roll back if an unapproved or stale receipt becomes ready, existing project CRUD regresses, or the response contract changes unexpectedly.
