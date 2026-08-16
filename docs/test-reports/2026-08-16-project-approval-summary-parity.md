# Test Report: Project Approval Summary Parity

Date: 2026-08-16
Gate: Engineering / Code Review / Test

## Results

- `npm run check`: PASS.
- `node --check scripts/projects-api-smoke.mjs`: PASS.
- Local Worker Projects API smoke: PASS, 18/18 steps.
- Missing base URL guard: PASS, rejected before network access.
- Non-local target guard: PASS, rejected without `--allow-production` before network access.
- Production health GET: PASS.
- Production Projects API smoke: PASS, 18/18 steps against Worker version `283c2a6e-73f2-4d5e-8375-dcb89d5496a1`.
- `git diff --check`: PASS before final documentation verification.

## Covered Behavior

- Pending shot: list and detail remain blocked.
- Legacy usable payload without selected attempt or receipt: readable and blocked.
- Usable selected attempt without receipt: blocked.
- Receipt bound to a stale attempt: blocked.
- Complete receipt bound to the current selected attempt: ready.
- Project save, update, list, detail, and delete complete successfully against an isolated local Worker.

## Evidence Level

Evidence level: E5 production behavior. The smoke created a unique timestamped project, verified list/detail summaries for pending, legacy, unapproved, stale, and approved states, then deleted that project.
