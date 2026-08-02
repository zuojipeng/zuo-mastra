# Review: Projects API Summary Parity

Reviewer: Architecture Agent + Code Review Agent + Test Agent
Producer reviewed: Backend Engineering Agent

Strongest rejection reason: malformed or stale payload records could be counted as approved production evidence and mislead the project dashboard.

## Findings

- Repaired during review: selected attempts now require a matching selected ID, matching shot ID, valid timestamp, provider, model, and known status.
- Repaired during validation: calibration and attempt status values are explicitly narrowed to the API contract.
- No P0/P1 findings remain.
- No D1 migration or duplicated summary columns were introduced.
- Existing clients remain compatible because fields are additive and malformed evidence fails closed.

Decision: PASS FOR RELEASE CANDIDATE

Residual risk: production still serves the preceding contract until an approved deployment and remote smoke complete.
