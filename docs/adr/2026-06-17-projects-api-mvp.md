# ADR: Projects API MVP

Date: 2026-06-17

## Status

Accepted

## Context

The frontend now has local project persistence, a local project library, and a project dashboard. To move Jingci from a local demo toward a real workbench, backend project sync needs a durable D1-backed API.

## Decision

Add a `projects` D1 table and Worker CRUD routes:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

Use `X-User-Id` for the same user isolation model as history and feedback. Store normalized metadata as columns and the full frontend workspace as JSON `payload`.

## Consequences

The frontend can sync its current `LocalProjectWorkspace` shape without waiting for a new frontend model. Project dashboard queries can use metadata columns while detail restore can use full payload.

This slice does not add authentication beyond the existing API key and `X-User-Id` model.

