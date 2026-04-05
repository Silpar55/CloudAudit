#!/usr/bin/env python3
"""
CloudAudit — Maintainer utility to prepend file-level JSDoc/docstrings.

Run from repo root: ``python3 scripts/dev/prepend_file_headers.py``

Skips files that already begin with a block containing the marker ``CloudAudit``.
Safe to re-run; it does not modify application logic.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]

MARKER = "CloudAudit"


def already_documented(text: str) -> bool:
    s = text.lstrip()
    if s.startswith("/**") and MARKER in s[:800]:
        return True
    if s.startswith('"""') and MARKER in s[:800]:
        return True
    if s.startswith("--") and MARKER in s[:800]:
        return True
    return False


OVERRIDES: dict[str, str] = {
    "backend/src/app.js": """/**
 * CloudAudit — Express application assembly.
 *
 * Wires JSON parsing, cookies, request metrics/logging, CORS (see FRONTEND_URL),
 * and mounts API routes for health, authentication, teams, and profile. Registers
 * the global error handler last. This module defines the HTTP surface the web app calls.
 */""",
    "backend/src/server.js": """/**
 * CloudAudit — Node.js process entrypoint.
 *
 * Binds the Express app to PORT, verifies PostgreSQL and AWS platform connectivity
 * on boot, then starts scheduled jobs (nightly cost sync, weekly recommendations).
 * Run via `npm start` in `backend/`.
 */""",
    "backend/src/modules/index.js": """/**
 * CloudAudit — Backend route and domain module index.
 *
 * Central export point for feature routers (auth, AWS, teams, etc.) consumed by `app.js`.
 */""",
    "frontend/app/root.tsx": """/**
 * CloudAudit — Application shell (React Router root layout).
 *
 * Provides global HTML shell, fonts, React Query, and authentication context. Renders
 * child routes via `<Outlet />`; loading and error UI live here for the whole SPA.
 */""",
    "frontend/app/routes.ts": """/**
 * CloudAudit — React Router 7 route configuration.
 *
 * Declares the file-based route tree (public marketing, auth flows, authenticated app,
 * team workspaces, invite acceptance). Changing paths here updates URLs site-wide.
 */""",
    "frontend/app/api/axiosClient.ts": """/**
 * CloudAudit — HTTP client for the backend API.
 *
 * Axios instance with base URL from VITE_API_URL, cookie credentials, and refresh-token
 * retry logic. All frontend services should use this client for consistent auth behavior.
 */""",
}


def js_block(body: str) -> str:
    lines = [l.rstrip() for l in body.strip().splitlines()]
    return "/**\n * " + "\n * ".join(lines) + "\n */\n\n"


def py_block(body: str) -> str:
    return '"""\n' + body.strip() + '\n"""\n\n'


def backend_header(rel: pathlib.Path) -> str:
    key = rel.as_posix()
    if key in OVERRIDES and OVERRIDES[key]:
        return OVERRIDES[key] + "\n"

    p = rel.as_posix()
    name = rel.name

    if "/tests/" in p:
        if name == "jest.setup.js":
            return js_block(
                "CloudAudit — Jest setup for backend unit tests.\n"
                "Runs before each test file; extend here for global mocks or matchers."
            )
        mod = name.replace(".test.js", "")
        return js_block(
            f"CloudAudit — Unit tests for `{mod}`.\n"
            "Run from `backend/` with `npm test`."
        )

    if name == "app.js" or name == "server.js":
        return ""

    if "/middleware/" in p:
        stem = name.replace(".js", "")
        return js_block(
            f"CloudAudit — Express middleware: `{stem}`.\n"
            "Applied to requests before route handlers; keep side effects minimal and ordered."
        )

    if "/config/" in p:
        stem = name.replace(".js", "")
        return js_block(
            f"CloudAudit — Application configuration: `{stem}`.\n"
            "Database pool and environment-driven settings for the API process."
        )

    if "/jobs/" in p:
        stem = name.replace(".job.js", "")
        return js_block(
            f"CloudAudit — Scheduled job: `{stem}`.\n"
            "Started from `server.js`; uses node-cron and domain services."
        )

    if "/modules/" in p:
        parts = rel.parts
        try:
            mi = parts.index("modules")
            domain = parts[mi + 1] if mi + 1 < len(parts) else "feature"
        except ValueError:
            domain = "feature"

        if name.endswith(".service.js"):
            return js_block(
                f"CloudAudit — Domain service: `{domain}`.\n"
                "Business rules and orchestration; callers are controllers, jobs, or other services."
            )
        if name.endswith(".controller.js"):
            return js_block(
                f"CloudAudit — HTTP controller: `{domain}`.\n"
                "Maps Express requests to services and response shapes."
            )
        if name.endswith(".route.js"):
            return js_block(
                f"CloudAudit — Express router: `{domain}`.\n"
                "Path definitions and middleware chain for this feature."
            )
        if name.endswith(".model.js"):
            return js_block(
                f"CloudAudit — Data access: `{domain}`.\n"
                "PostgreSQL queries and row mapping for this feature."
            )

    if "/utils/aws/" in p:
        stem = name.replace(".js", "")
        return js_block(
            f"CloudAudit — AWS integration helper: `{stem}`.\n"
            "Uses AWS SDK v3; respects platform role assumption for customer accounts."
        )

    if "/utils/notifications/" in p:
        stem = name.replace(".js", "")
        return js_block(
            f"CloudAudit — Notification helper: `{stem}`.\n"
            "Email (SES), Slack, or templates for user-facing alerts."
        )

    if "/utils/monitoring/" in p:
        return js_block(
            "CloudAudit — In-process metrics store for request counts and latency.\n"
            "Consumed by the monitoring API and optional dashboards."
        )

    if "/utils/helper/" in p:
        stem = name.replace(".js", "")
        return js_block(
            f"CloudAudit — Shared utility: `{stem}`.\n"
            "Cross-cutting helpers (errors, JWT) used by multiple modules."
        )

    if "/utils/" in p:
        stem = name.replace(".js", "")
        return js_block(
            f"CloudAudit — Backend utility: `{stem}`.\n"
            "Shared helpers for formatting, validation, logging, etc."
        )

    if "/modules/aws/services/" in p:
        stem = name.replace(".js", "")
        return js_block(
            f"CloudAudit — AWS sub-service: `{stem}`.\n"
            "Focused integration (CUR, Cost Explorer, setup) used by `aws.service.js`."
        )

    return js_block(
        f"CloudAudit — Backend module `{name}`.\n"
        "Part of the CloudAudit API; see repository README for architecture."
    )


def frontend_header(rel: pathlib.Path) -> str:
    key = rel.as_posix()
    if key in OVERRIDES and OVERRIDES[key]:
        return OVERRIDES[key] + "\n"

    p = rel.as_posix()
    name = rel.name

    if name == "root.tsx" or name == "routes.ts":
        return ""

    if "/routes/_public/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Public route: `{name}`.\n"
            " * Unauthenticated marketing or sign-in screens; wrapped by public layout.\n"
            " */\n\n"
        )

    if "/routes/_auth/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Auth flow route: `{name}`.\n"
            " * Email verification and similar post-registration steps.\n"
            " */\n\n"
        )

    if "/routes/_app/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Authenticated app route: `{name}`.\n"
            " * Requires login; lives under the main app shell (sidebar/header).\n"
            " */\n\n"
        )

    if "/routes/invite/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Team invitation route: `{name}`.\n"
            " * Accept or preview invites via token in URL or session.\n"
            " */\n\n"
        )

    if "/components/dashboard/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Dashboard UI: `{name}`.\n"
            " * Cost, anomalies, recommendations, and team overview widgets.\n"
            " */\n\n"
        )

    if "/components/layout/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Layout UI: `{name}`.\n"
            " * Navigation chrome shared across authenticated pages.\n"
            " */\n\n"
        )

    if "/components/profile/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Profile settings UI: `{name}`.\n"
            " */\n\n"
        )

    if "/components/teams/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Team / AWS setup UI: `{name}`.\n"
            " */\n\n"
        )

    if "/components/team/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Team feature UI: `{name}`.\n"
            " */\n\n"
        )

    if "/components/ui/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Shared UI primitive: `{name}`.\n"
            " * Reusable across features; keep presentation-agnostic where possible.\n"
            " */\n\n"
        )

    if "/hooks/" in p:
        base = name.replace(".ts", "")
        return (
            "/**\n"
            f" * CloudAudit — React hook: `{base}`.\n"
            " * Encapsulates data fetching or UI state for consuming components.\n"
            " */\n\n"
        )

    if "/services/" in p:
        return (
            "/**\n"
            f" * CloudAudit — API client: `{name}`.\n"
            " * Typed calls to backend endpoints via `api/axiosClient`.\n"
            " */\n\n"
        )

    if "/context/" in p:
        return (
            "/**\n"
            f" * CloudAudit — React context: `{name}`.\n"
            " * Provides app-wide state to the component tree.\n"
            " */\n\n"
        )

    if "/utils/" in p:
        return (
            "/**\n"
            f" * CloudAudit — Frontend utility: `{name}`.\n"
            " */\n\n"
        )

    return (
        "/**\n"
        f" * CloudAudit — Frontend module `{name}`.\n"
        " * See README for product overview and local run instructions.\n"
        " */\n\n"
    )


def ml_header(rel: pathlib.Path) -> str:
    p = rel.as_posix()
    name = rel.name

    if name == "wsgi.py":
        return py_block(
            "CloudAudit — WSGI entry for Gunicorn.\n"
            "Production servers load `app` from here; see Dockerfile and README."
        )

    if name == "gunicorn.conf.py":
        return py_block(
            "CloudAudit — Gunicorn process configuration.\n"
            "Workers, timeouts, and binding for the ML Flask service."
        )

    if "/routes/" in p:
        return py_block(
            f"CloudAudit — ML HTTP routes: `{name}`.\n"
            "Flask blueprints exposing health checks and anomaly analysis endpoints."
        )

    if "/services/" in p:
        return py_block(
            f"CloudAudit — ML service logic: `{name}`.\n"
            "Time-series anomaly detection and explainability; called by the Node API."
        )

    if "/models/" in p:
        return py_block(
            f"CloudAudit — ML model / explainer: `{name}`.\n"
            "Algorithms and interpretation helpers used by anomaly pipelines."
        )

    if "/db/" in p:
        return py_block(
            f"CloudAudit — ML database helpers: `{name}`.\n"
            "PostgreSQL access for features read by the Python service."
        )

    if name == "__init__.py":
        return py_block(
            f"CloudAudit — Python package: `{rel.parent.name}`.\n"
            "Part of the ML microservice; see `ml-service/README` if present and root README."
        )

    return py_block(
        f"CloudAudit — ML service module `{name}`.\n"
        "Supports cost anomaly analysis for the main application."
    )


def process_file(path: pathlib.Path, header_fn) -> bool:
    rel = path.relative_to(ROOT)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        print(f"skip read {rel}: {e}", file=sys.stderr)
        return False

    if already_documented(text):
        return False

    header = header_fn(rel)
    if not header.strip():
        return False

    new_text = header + text
    path.write_text(new_text, encoding="utf-8")
    print(f"updated {rel}")
    return True


def main() -> int:
    counts = 0

    for path in sorted(ROOT.glob("backend/src/**/*.js")):
        if process_file(path, backend_header):
            counts += 1

    for path in sorted(ROOT.glob("backend/tests/**/*.js")):
        if process_file(path, backend_header):
            counts += 1

    for ext in ("*.ts", "*.tsx"):
        for path in sorted(ROOT.glob(f"frontend/app/**/{ext}")):
            if process_file(path, frontend_header):
                counts += 1

    ml_root = ROOT / "ml-service"
    for path in sorted(ml_root.rglob("*.py")):
        if "venv" in path.parts or ".venv" in path.parts:
            continue
        if process_file(path, ml_header):
            counts += 1

    print(f"Done. Updated {counts} files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
