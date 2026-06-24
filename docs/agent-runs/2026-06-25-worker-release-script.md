# Agent Run: Worker Release Script

Date: 2026-06-25

## Loop Board

Loop: 1
Goal: provide a safe local fallback for deploying the Worker without putting Cloudflare tokens in command lines.
Current gate: Release
Decision: CONTINUE

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | DevOps Agent | Human Owner | BLOCKER | Run either GitHub Actions deploy or local `release:worker` with a safe token environment | Production `npm run test:projects` passes | OPEN |
| L2 | DevOps Agent | Engineering Agent | IMPROVEMENT | Add local release wrapper with dry-run, deploy, schema, and smoke modes | Script validation and docs | CLOSED |

## DevOps Agent

Added `scripts/release-worker.mjs` and `npm run release:worker`.

Supported modes:

- `--dry-run`: run TypeScript check and Wrangler dry-run bundle.
- `--deploy`: run TypeScript check, deploy Worker, then production Projects API smoke.
- `--deploy --apply-schema`: deploy Worker, apply remote D1 schema, then smoke.
- `--smoke-only`: run production Projects API smoke.

## Security Note

The script requires `CLOUDFLARE_API_TOKEN` from the environment for deploy/schema actions. It does not accept a token argument and does not print token values.

## Next Action

Use one of the two release paths:

```bash
# GitHub Actions
Actions -> Worker Release -> Run workflow -> deploy=true, apply_schema=true
```

or:

```bash
cd /Users/edy/Desktop/learning/my-prompt-mastra-agent
export CLOUDFLARE_API_TOKEN="<token from your shell/session manager>"
npm run release:worker -- --deploy --apply-schema
```

