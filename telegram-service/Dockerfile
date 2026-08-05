# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN pip install --no-cache-dir --upgrade pip \
    && useradd --system --create-home --uid 1001 telegram

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
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

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
