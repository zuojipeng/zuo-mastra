# Test Report: Projects API Smoke Tooling

Date: 2026-06-23

## Commands

```bash
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm run check
git diff --check
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npx --yes wrangler dev --local --port 8787
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH PROJECTS_API_BASE_URL=http://127.0.0.1:8787 npm run test:projects
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm run test:projects
```

## Result

PARTIAL PASS / RELEASE BLOCKED

## Evidence

- TypeScript: PASS.
- Diff check: PASS.
- Local Worker smoke: PASS.
- Production Worker smoke: FAIL at `list:initial`.

Production failure:

```json
{
  "step": "list:initial",
  "status": 404,
  "response": {
    "success": false,
    "error": "Not found"
  }
}
```

## Interpretation

The smoke tool is valid and catches the real production state: `/api/health` exists, but `/api/projects` is not deployed on the production Worker yet.

## Residual Risk

Cloud sync is still not durable in production until the Worker deployment and remote D1 schema application complete.

