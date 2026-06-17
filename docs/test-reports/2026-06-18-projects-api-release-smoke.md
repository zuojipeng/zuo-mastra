# Test Report: Projects API Release Smoke

Date: 2026-06-18

## Commands

```bash
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm run check
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npx --yes wrangler dev --local --port 8787
curl --silent --show-error --max-time 10 http://127.0.0.1:8787/api/health
curl --silent --show-error --max-time 10 -H 'X-User-Id: local-project-smoke' http://127.0.0.1:8787/api/projects
curl --silent --show-error --max-time 10 -X POST http://127.0.0.1:8787/api/projects -H 'Content-Type: application/json' -H 'X-User-Id: local-project-smoke' --data '<workspace payload>'
curl --silent --show-error --max-time 10 -H 'X-User-Id: local-project-smoke' 'http://127.0.0.1:8787/api/projects?limit=3'
curl --silent --show-error --max-time 10 -H 'X-User-Id: local-project-smoke' http://127.0.0.1:8787/api/projects/smoke-project-1
curl --silent --show-error --max-time 10 -X DELETE -H 'X-User-Id: local-project-smoke' http://127.0.0.1:8787/api/projects/smoke-project-1
curl --silent --show-error --max-time 20 https://prompt-optimizer.hahazuo460.workers.dev/api/health
curl --silent --show-error --max-time 20 -H 'X-User-Id: release-smoke-2026-06-18' https://prompt-optimizer.hahazuo460.workers.dev/api/projects
```

## Result

PARTIAL PASS / RELEASE BLOCKED

## Evidence

- TypeScript: PASS.
- Local Worker `/api/health`: PASS, `features.projects=true`.
- Local Worker `GET /api/projects`: PASS, returns empty project list.
- Local Worker `POST /api/projects`: PASS, returns saved project id.
- Local Worker `GET /api/projects?limit=3`: PASS, returns summary with `shotCount=1` and `completedShotCount=1`.
- Local Worker `GET /api/projects/smoke-project-1`: PASS, returns full payload.
- Local Worker `DELETE /api/projects/smoke-project-1`: PASS.
- Production Worker `/api/health`: PASS.
- Production Worker `GET /api/projects`: FAIL, returns `{"success":false,"error":"Not found"}`.
- `wrangler deploy`: BLOCKED because non-interactive environment has no `CLOUDFLARE_API_TOKEN`.

## Residual Risk

The frontend production bundle contains the project cloud-sync client, but production backend routing is not updated yet. Until Worker deployment completes, project saving remains local-first and cloud sync reports failure instead of becoming durable.

