"""
CloudAudit — Gunicorn process configuration for the ML Flask service.

Binds workers, timeouts, and logging for container-friendly operation (see comments below).
"""

# Network
bind = "0.0.0.0:5000"

# Workers — hardcoded to 2 for reliable container behaviour.
# multiprocessing.cpu_count() reads the host's cores inside Docker on Mac,
# which causes dozens of workers to spawn unexpectedly.
workers = 2
worker_class = "sync"
threads = 1

# Timeouts — ML inference can take longer than a typical web request
timeout = 120
graceful_timeout = 30
keepalive = 5

# Logging — stdout/stderr so Docker captures logs with docker logs
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "cloudaudit-ml"