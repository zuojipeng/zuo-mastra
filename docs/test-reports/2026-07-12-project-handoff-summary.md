# Test Report: Projects API Handoff Summary

Date: 2026-07-12
Gate: Engineering / Test

## Commands

- `npm run check`: PASS after repairing the map callback type error.
- `node --check scripts/projects-api-smoke.mjs`: PASS.
- `PROJECTS_API_BASE_URL=http://127.0.0.1:8787 npm run test:projects`: PASS outside the network sandbox.
- `git diff --check`: PASS.

## Local Worker Smoke

| Step | Result |
| --- | --- |
| health | 200 PASS |
| list:initial | 200 PASS |
| save pending workspace | 200 PASS |
| list:blocked with `镜头 1 未执行` | 200 PASS |
| update workspace to usable with result note | 200 PASS |
| list:ready with zero blockers | 200 PASS |
| detail with ready summary and payload | 200 PASS |
| delete | 200 PASS |

## Failed Evidence Retained

The first sandboxed smoke could not connect to `127.0.0.1:8787` and failed with `connect EPERM`. Re-running the same command with approved localhost access passed.

Residual risk: this is E4 reproducible local evidence, not E5 production evidence.
