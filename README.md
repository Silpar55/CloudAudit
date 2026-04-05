# CloudAudit

**CloudAudit** is an AWS cost optimization SaaS for small and medium businesses. Teams connect their AWS accounts with a secure IAM trust model, then use a web dashboard for spend visibility, ML-assisted anomaly detection, and optimization recommendations.

| Audience | Start here |
|----------|------------|
| **Visitors / evaluators** | This README (overview, URLs, how to run). |
| **Operators / DevOps** | [docker-compose.prod.yml](docker-compose.prod.yml), [backend/.env.example](backend/.env.example), [migrations/README.md](migrations/README.md). |
| **Deep dive (product + architecture)** | [docs/CloudAudit_Complete_Guide.md](docs/CloudAudit_Complete_Guide.md) |

---

## What the product does

1. **Connect AWS** — Customers delegate access via IAM roles that trust the CloudAudit platform role (no long-lived keys in our database for their control plane).
2. **Cost visibility** — Cost Explorer, CUR/Athena paths, and cached summaries power dashboards and tables.
3. **Anomaly detection** — A Python **ML service** scores time-series spend and explains spikes for operators.
4. **Recommendations** — Suggested savings (rightsizing, idle resources, etc.), with optional external AI agents when configured.
5. **Teams** — Multi-user workspaces, invitations, audit logs, and notification preferences.

**Business model** (product direction; see guide for detail):

- **FREE** — Below roughly $500/month AWS spend.
- **STARTER / PRO / ENTERPRISE** — Tiered features and support.

---

## Repository layout

| Path | Role |
|------|------|
| [frontend/](frontend/) | React Router 7 + Vite SPA/SSR app (dashboard, auth UI, team workspaces). |
| [backend/](backend/) | Express API, PostgreSQL access, AWS SDK jobs, calls into ML service. |
| [ml-service/](ml-service/) | Flask + Gunicorn; anomaly analysis endpoints consumed by the API. |
| [migrations/](migrations/) | SQL schema and optional local mock data. |
| [scripts/](scripts/) | Helper scripts (e.g. AWS role setup, dev utilities). |
| [docs/](docs/) | Extended guide and internal notes. |

---

## URLs and environments

There is **no fixed production URL in this repository**. You choose the hostname when you deploy.

### Local development (defaults)

| Surface | Default URL | Notes |
|---------|-------------|--------|
| **Web app** | `http://localhost:5173` | `npm run dev` in `frontend/`. |
| **API** | `http://localhost:3000` | `npm start` in `backend/`; routes are under `/api/...`. |
| **ML service** | `http://127.0.0.1:5000` (or `5001` if mapped in Docker) | Must match `ML_SERVICE_URL` in backend env. |

Point the SPA at the API with **`VITE_API_URL`**, for example `http://localhost:3000/api` (include the `/api` suffix used by the client).

### Production

1. Deploy the **frontend** behind HTTPS and set **`VITE_API_URL`** at **build time** to your public API base (e.g. `https://api.yourdomain.com/api`).
2. Set **`FRONTEND_URL`** on the **backend** to the exact browser origin of the SPA (e.g. `https://app.yourdomain.com`) so CORS and email links are correct.
3. Ensure the backend can reach the ML service (`ML_SERVICE_URL`), and that PostgreSQL and AWS credentials/platform roles match [backend/.env.example](backend/.env.example).

---

## Prerequisites

- **Node.js** 22+ (backend and frontend).
- **PostgreSQL** 14+ (schema in `migrations/001_initial_schema.sql`).
- **Python** 3.12+ (ML service; see `ml-service/requirements.txt`).
- **AWS account** for the platform (SES, STS assume-role into customer accounts, etc.) as described in `.env.example` and the docs guide.

---

## Quick start (local)

### 1. Database

Create a database and apply the canonical schema:

```bash
psql -U your_user -d cloudaudit -f migrations/001_initial_schema.sql
```

Optional local fixtures: `migrations/002_mock_data_injection.sql` (see header in that file; not for production).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: PostgreSQL, JWT secrets, FRONTEND_URL, AWS/ML settings
npm install
npm start
```

API listens on `PORT` (default **3000**).

### 3. ML service

From `ml-service/`, configure `DATABASE_URL` and run the Flask app per that folder’s conventions (e.g. Gunicorn locally or Docker). The backend’s `ML_SERVICE_URL` must point at the analyze endpoint your deployment exposes.

### 4. Frontend

```bash
cd frontend
# e.g. frontend/.env.local
echo 'VITE_API_URL=http://localhost:3000/api' > .env.local
npm install
npm run dev
```

Open **`http://localhost:5173`**.

---

## Production deployment (Docker)

The root [docker-compose.prod.yml](docker-compose.prod.yml) runs **backend**, **frontend** (SSR via `react-router-serve`), and **ml** on a single host (typical: EC2 + external RDS).

```bash
export VITE_API_URL=http://YOUR_PUBLIC_HOST:3000/api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Compose publishes backend on **3000** and frontend on **3001** by default; set `VITE_API_URL` to whatever origin browsers will use to reach the API. RDS credentials go in env files referenced by the backend container (see comments in the compose file).

---

## Testing

```bash
cd backend && npm test
```

---

## License

This project is licensed under the **Polyform Noncommercial License 1.0.0**.

You may use this software for personal, educational, and other non-commercial purposes for free. Commercial use, including use in revenue-generating products or services, requires a separate paid license.

**Contact:** asilva.tech@gmail.com

---

## Contributing and code comments

Source files include a short **file-level** description of purpose and importance. To regenerate consistent headers after bulk changes, see `scripts/dev/prepend_file_headers.py` (optional; intended for maintainers).
