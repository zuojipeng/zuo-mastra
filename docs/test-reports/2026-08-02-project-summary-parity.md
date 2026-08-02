# Test Report: Projects API Summary Parity

Date: 2026-08-02
Gate: Engineering / Code Review / Test

## Results

- `npm run check`: PASS after explicit status narrowing repair.
- `node --check scripts/projects-api-smoke.mjs`: PASS.
- Local Worker Projects API smoke: PASS, 8/8 steps.
- `git diff --check`: PASS before documentation finalization.

The smoke verifies initial list, pending save, blocked summary with iteration and calibration evidence, usable update with an explicitly selected Runway Gen-4.5 attempt, ready list, detail, and delete.

## Failed Evidence Retained

- The first local Worker start inside the sandbox failed with `listen EPERM 127.0.0.1:9229`; approved local execution passed.
- A first typecheck exposed an overly broad inferred calibration outcome; the implementation now explicitly narrows API union values.
- A 2026-08-02 read-only production check timed out after 20 seconds both inside and outside the sandbox. This proves only that the current execution environment could not reach the Worker domain; it is not recorded as a production outage or as proof that new fields are deployed.

## Release Status

Local evidence level: E4 reproducible Worker behavior. Production evidence remains pending deployment approval and E5 smoke.
