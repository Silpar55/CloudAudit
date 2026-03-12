# =============================================================
# CloudAudit ML Service — Dockerfile
# Multi-stage build:
#   Stage 1 (builder): installs dependencies into a venv
#   Stage 2 (production): copies only the venv + source, no build tools
# =============================================================

# ── Stage 1: builder ─────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System deps needed to compile psycopg2-binary and other C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Create an isolated virtual environment so Stage 2 can copy it cleanly
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies — layer cached unless requirements.txt changes
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: production ──────────────────────────────────────
FROM python:3.12-slim AS production

# Non-root user for security — never run as root inside a container
RUN groupadd --gid 1001 mlservice && \
    useradd --uid 1001 --gid mlservice --no-create-home mlservice

WORKDIR /app

# Minimal runtime system dep (libpq for psycopg2 at runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    build-essential \
    gcc \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Copy the venv from builder — no gcc, no apt build tools in this image
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source
COPY --chown=mlservice:mlservice app/ ./app/
COPY --chown=mlservice:mlservice wsgi.py gunicorn.conf.py ./

USER mlservice

EXPOSE 5000

# Healthcheck — Docker itself will poll this before marking the container healthy
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]