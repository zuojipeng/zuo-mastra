# Review: Project Approval Summary Parity

Date: 2026-08-16
Reviewer: Architecture Agent + Code Review Agent + Test Agent
Producer reviewed: Backend Engineering Agent

Strongest rejection reason: a stale or malformed approval receipt could incorrectly mark a selected shot as ready for delivery.

## Findings

- Repaired: `usable` no longer implies handoff readiness by itself.
- Repaired: approval must bind the current valid selected attempt and match shot, provider, model, asset reference, timestamp, evidence kind, and decision note.
- Repaired: legacy usable payloads without attempts or receipts remain readable but fail closed with `镜头 N 缺交付审批`.
- Repaired: blocked states are asserted through both list and detail APIs.
- Repaired: the write-capable smoke has no production default and refuses non-local targets without `--allow-production`.
- No D1 schema or duplicated summary columns were introduced.

Decision: PASS FOR RELEASE CANDIDATE

Residual risk: the frontend currently accepts a narrower approval-receipt contract than the backend. The backend is intentionally stricter; a cross-repository contract-alignment task remains before claiming complete client/server parity.
