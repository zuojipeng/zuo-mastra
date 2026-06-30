# Test Report: Projects API Production Verification

Date: 2026-06-30
Owner: Test Agent
Scope: production Projects API release smoke.

## Commands

```bash
npm run release:worker -- --smoke-only
npx --yes wrangler whoami
gh auth status -h github.com
```

## Results

- Production smoke: FAIL at `list:initial`.
- `/api/health`: PASS, HTTP 200.
- `/api/projects`: FAIL, HTTP 404, `{"success":false,"error":"Not found"}`.
- Wrangler auth: FAIL, not logged in.
- `CLOUDFLARE_API_TOKEN`: missing from the Codex process environment.
- GitHub CLI auth: FAIL, token invalid.

## Decision

BLOCKED for production release. The backend code is already on `main`; production deploy requires a valid Cloudflare deploy credential path or a working GitHub Actions dispatch token.
