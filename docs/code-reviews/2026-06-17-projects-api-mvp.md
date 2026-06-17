# Code Review: Projects API MVP

Date: 2026-06-17

## Scope

Reviewed schema, Worker project routes, payload normalization, CORS changes, and docs.

## Findings

No blocking findings.

## Notes

- The API uses metadata columns plus JSON payload, which is the smallest design that supports both dashboard list queries and workbench restore.
- `POST` and `PUT` check existing project ownership before upsert.
- Request body size is larger than prompt APIs but bounded at 200 KB.
- The table is created both in `schema.sql` and Worker startup migration path.

## Residual Risk

There is no dedicated Worker unit test harness in this repo yet. Current validation is TypeScript plus Wrangler dry-run. A future slice should add a small request-level test harness with a fake D1 binding.

