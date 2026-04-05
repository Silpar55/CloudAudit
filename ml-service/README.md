# CloudAudit ML service

Python **Flask** application (served with **Gunicorn** in production) that exposes HTTP endpoints for **cost anomaly analysis**. The Node.js backend calls this service via `ML_SERVICE_URL`.

- **Configure:** `DATABASE_URL` (PostgreSQL; same logical database as the API for shared tables).
- **Run locally:** Use a virtualenv, install `requirements.txt`, then run the app or `gunicorn` as in the [Dockerfile](Dockerfile).
- **Docker:** Multi-stage image in this directory; referenced from root `docker-compose.prod.yml`.

See the root [README.md](../README.md) for how this fits into the full stack.
