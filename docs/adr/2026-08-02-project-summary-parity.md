# ADR: Projects API Production Evidence Summary

Date: 2026-08-02
Status: Accepted

## Context

The Jingci dashboard can summarize feedback iterations, platform calibrations, and an explicitly selected shot result from a local workspace. Cloud project summaries previously exposed only handoff readiness, so local and cloud rows could disagree after synchronization.

## Decision

Derive nine additive summary fields from the persisted workspace payload when reading a project row:

- iteration count and latest focus
- calibration count, latest platform, and latest outcome
- explicitly selected attempt count, latest provider, model, and status

Do not add D1 columns or write-time denormalization. A selected attempt is counted only when its selected ID resolves to an attempt under the same shot, its timestamp is valid, and provider, model, and status are valid. Missing or malformed evidence returns `0` or `null`.

## Consequences

- Old payloads and old frontend clients remain compatible.
- Summary truth cannot drift from the stored project payload.
- List reads perform bounded JSON parsing and derivation; the existing 100-row limit bounds the cost.
- A future query that filters by evidence fields would require an indexed projection or migration; that is intentionally outside this slice.
