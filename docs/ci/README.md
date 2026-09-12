# Deferred CI — inactive workflow template

The GitHub connection rejected creation of `.github/workflows/inspector.yml` because it lacks `workflows` permission. On 2026-09-12, the user explicitly approved **Defer CI and proceed** for the current inspector PR/merge.

[`inspector.yml.example`](inspector.yml.example) preserves the complete proposed workflow as documentation. It is outside `.github/workflows/` and **does not run automatically**. The workflow had never been enabled remotely; this change does not disable an existing check or alter branch protection. Tests remain in `tests/` and all local verification commands remain available.

## Run checks manually

Use the Node version pinned in `.nvmrc`:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
npm run package
```

The 102 local unit/structural tests, typecheck, lint and build have passed. The 12 browser tests have been discovered but have **not** run in this environment. Do not treat absent CI status checks as passing browser verification. See [VERIFICATION.md](../VERIFICATION.md) for actual results and limits.

## Enable CI later

A maintainer with permission to publish GitHub workflow files can review the template, place it in `.github/workflows/inspector.yml`, and commit it in an authorized change. Then run the job, fix any failures and update the verification record. Do not put credentials into the template or chat, and do not bypass repository-required checks to merge a change.

The inspector's interim header and unverified browser behavior remain documented limitations. This is not the completed BO flight assistant.
