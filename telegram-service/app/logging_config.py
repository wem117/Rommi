"""
Structured (JSON-lines) logging to stdout.

Matches the rest of the production stack: the Next.js container's Docker
logging driver is configured with a size cap (ops/docker-compose.yml,
`max-size: 20m`), and this service is meant to run under the same convention —
plain stdout lines that `docker logs` / any log shipper can consume, with
enough structure (event, source, message_id) to grep/filter without parsing
prose.
"""

from __future__ import annotations

import json
import logging
import sys
import time

from app.config import settings


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Anything passed via `extra={...}` is merged in, so callers can attach
        # structured context (source_id, message_id, listing_id, ...) without
        # string-formatting it into the message.
        for key, value in record.__dict__.items():
            if key in (
                "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
                "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
                "created", "msecs", "relativeCreated", "thread", "threadName",
                "processName", "process", "message", "taskName",
            ):
                continue
            payload[key] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())

    # Telethon is chatty at INFO; keep it at WARNING unless the operator asks
    # for full verbosity via LOG_LEVEL=DEBUG.
    if settings.log_level.upper() != "DEBUG":
        logging.getLogger("telethon").setLevel(logging.WARNING)
