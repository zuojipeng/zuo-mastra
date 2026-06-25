# Test Report: Worker Release Retry

Date: 2026-06-25

## Commands

```bash
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm run release:worker -- --dry-run
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm run release:worker -- --help
git diff --check
PATH=/Users/edy/.nvm/versions/node/v22.21.1/bin:$PATH npm run release:worker -- --deploy --apply-schema
```

## Result

LOCAL TOOLING PASS / DEPLOY BLOCKED

## Evidence

- Dry-run release wrapper: PASS.
- Help output: PASS.
- Diff check: PASS.
- TypeScript check before deploy: PASS.
- Wrangler deploy: BLOCKED by missing `CLOUDFLARE_API_TOKEN` in non-interactive environment.

## Production Smoke

Not reached. Worker deploy did not complete.

