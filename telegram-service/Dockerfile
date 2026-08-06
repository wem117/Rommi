# syntax=docker/dockerfile:1

# Two stages so pip's build machinery (wheels, caches, setuptools scratch) is
# left behind in the builder and never ships. The runtime layer carries the
# interpreter, the installed packages and this service's own source — nothing
# else.
FROM python:3.12-slim AS builder
WORKDIR /build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt \
    # Bytecode is compiled here, once, rather than on every cold start in
    # production — and the -f keeps a stale .pyc from a rebuilt layer out.
    && /opt/venv/bin/python -m compileall -q -f /opt/venv/lib \
    && find /opt/venv -name "__pycache__" -path "*/test*" -prune -exec rm -rf {} + 2>/dev/null || true


FROM python:3.12-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    # glibc allocates one heap arena per thread by default, and Telethon plus
    # httpx plus uvicorn is enough threads for that to inflate RSS well past
    # what is actually live. Two arenas costs a little allocator contention on a
    # workload that is entirely I/O-bound, and reclaims tens of megabytes.
    MALLOC_ARENA_MAX=2

COPY --from=builder /opt/venv /opt/venv

RUN useradd --system --create-home --uid 1001 telegram

COPY app ./app
COPY telegram_parser ./telegram_parser
COPY telegram_listener.py .
COPY scripts ./scripts

# The .session file is NEVER baked into the image — it is created once,
# interactively, outside Docker (scripts/create_session.py) and mounted in at
# runtime as a volume. Baking a credential into an image layer would leak it to
# anyone who can pull the image, and would go stale the moment the account
# re-authenticates.
RUN mkdir -p /app/data && chown -R telegram:telegram /app
VOLUME ["/app/data"]
ENV TELEGRAM_SESSION_PATH=/app/data/roomi_session

USER telegram
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status==200 else 1)"

# --no-access-log: the only HTTP traffic this service sees is its own
# healthcheck, twice a minute, forever. Logging it says nothing and fills the
# json-file driver's 20 MB with noise that hides the lines that matter.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
