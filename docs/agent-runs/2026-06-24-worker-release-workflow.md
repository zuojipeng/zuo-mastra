# Agent Run: Worker Release Workflow

Date: 2026-06-24

## Loop Board

Loop: 1
Goal: remove local-token deployment friction for the Projects API release.
Current gate: Release
Decision: CONTINUE

| ID | From | To | Blocking Level | Request | Evidence Required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | DevOps Agent | Human Owner | BLOCKER | Add `CLOUDFLARE_API_TOKEN` to GitHub Secrets and run `Worker Release` with deploy enabled | `npm run test:projects` passes against production | OPEN |
| L2 | DevOps Agent | Engineering Agent | IMPROVEMENT | Add GitHub Actions release workflow with dry-run, deploy, schema, and smoke gates | Workflow file plus local validation | CLOSED |

## DevOps Agent

Added `.github/workflows/worker-release.yml`.

The workflow:

- Runs on push and pull request as a quality gate.
- Installs dependencies with `npm ci`.
- Runs `npm run check`.
- Runs a Wrangler dry-run bundle check.
- Supports manual production deploy through `workflow_dispatch`.
- Optionally applies D1 schema.
- Runs `npm run test:projects` after deploy.

## Security Note

The workflow uses `secrets.CLOUDFLARE_API_TOKEN` instead of putting tokens in shell commands. This avoids exposing credentials through local process lists or Codex tool logs.

## Next Action

Configure this GitHub Secret in `zuojipeng/zuo-mastra`:

```text
CLOUDFLARE_API_TOKEN
```

Then run Actions -> `Worker Release` with:

```text
deploy=true
apply_schema=true
smoke_base_url=https://prompt-optimizer.hahazuo460.workers.dev
```

