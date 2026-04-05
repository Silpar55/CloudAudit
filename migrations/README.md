# Database migrations

SQL artifacts in this folder define the **PostgreSQL schema** and optional **local development data** for CloudAudit.

| File | Purpose |
|------|---------|
| [001_initial_schema.sql](001_initial_schema.sql) | **Canonical production schema** — tables, views, enums, and triggers for a new environment. Apply this first on an empty database. |
| [002_mock_data_injection.sql](002_mock_data_injection.sql) | **Dev/demo only** — sample users, teams, and cost rows so the UI can be exercised without real AWS data. **Do not run against production.** |

## Why this folder matters

The API and ML service assume tables and column names defined here. Deployments should treat `001_initial_schema.sql` as the source of truth for greenfield installs; incremental changes in production should follow your own migration process (versioned SQL, Flyway, etc.) while keeping this file aligned for new clones of the repo.

For end-to-end setup and URLs, see the root [README.md](../README.md).
