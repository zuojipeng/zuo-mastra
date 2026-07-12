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

Local phase evidence level: E4 reproducible evidence.

## Production Verification

Worker version `bbfea4f4-2077-4692-9ac5-3f20654f07ee` was deployed without a schema migration.

- Immediate post-deploy smoke: health passed, project list returned transient 404 during propagation.
- Retry with `npm run release:worker -- --smoke-only`: all eight steps passed against production.

Final evidence level: E5 for Projects API handoff summary behavior.
