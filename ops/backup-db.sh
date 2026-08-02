#!/usr/bin/env bash
#
# Roomi — automated PostgreSQL backup for the self-hosted Supabase stack.
#
# Produces, per run, two artifacts in $BACKUP_DIR:
#
#   globals_<ts>.sql.gz[.enc]   roles, passwords and other cluster-wide objects
#                               (pg_dumpall --globals-only). Restoring data
#                               without these leaves objects with no owner.
#   postgres_<ts>.dump[.enc]    the application database, pg_dump custom format
#                               (-Fc), which pg_restore can restore selectively
#                               and in parallel.
#   storage_<ts>.tar.gz[.enc]   every uploaded avatar / listing photo / message
#                               image. Supabase Storage here runs with
#                               STORAGE_BACKEND=file, so these objects live on
#                               THIS host's filesystem, not in S3 and not in
#                               Postgres. A database-only backup would restore
#                               rows that all point at images that no longer
#                               exist — every listing silently broken.
#
# Both are verified after being written — a backup that has never been read back
# is not a backup. Encryption is applied only when a key file is present, so the
# script is safe to run before the key is provisioned.
#
# Restore with ops/restore-db.sh (which also drives the automated restore test).
#
# Intentionally has no dependency on the repo, the app container or the network:
# it must keep working while the application is broken, which is exactly when
# backups matter.

set -Eeuo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
STORAGE_CONTAINER="${STORAGE_CONTAINER:-supabase-storage}"
STORAGE_PATH="${STORAGE_PATH:-/var/lib/storage}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/postgres}"
KEY_FILE="${KEY_FILE:-$HOME/.config/roomi/backup.key}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
LOG_FILE="${LOG_FILE:-$HOME/backups/backup.log}"
LOCK_FILE="${LOCK_FILE:-$HOME/backups/.backup.lock}"

# Smallest plausible good dump. A truncated/empty dump that still "succeeds"
# is the classic silent backup failure, so treat undersized output as an error.
MIN_DUMP_BYTES="${MIN_DUMP_BYTES:-20000}"
MIN_GLOBALS_BYTES="${MIN_GLOBALS_BYTES:-500}"

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

# --- Alerting ----------------------------------------------------------------
# Optional, and kept OUT of the repo: secrets live in ~/.config/roomi/alerts.env
#
#   ALERT_WEBHOOK_URL   generic JSON POST — Slack, Discord and Mattermost all
#                       accept {"text": "..."} unchanged
#   HEALTHCHECK_URL     dead-man's switch (healthchecks.io, Better Stack, ...)
#
# The dead-man's switch is the important half. A webhook only fires when the
# script RUNS and fails; it stays silent when cron is broken, the disk is full,
# or the box is down — the cases where you most need to know. A switch that
# expects a ping on a schedule alerts on silence, which covers all of them.
ALERTS_ENV="${ALERTS_ENV:-$HOME/.config/roomi/alerts.env}"
# shellcheck disable=SC1090
[ -f "$ALERTS_ENV" ] && . "$ALERTS_ENV"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"

log() { printf '%s [backup] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE" >&2; }

ping_healthcheck() {
  [ -n "$HEALTHCHECK_URL" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HEALTHCHECK_URL}${1:-}" 2>/dev/null || true
}

alert() {
  [ -n "$ALERT_WEBHOOK_URL" ] || return 0
  # Escape for JSON: backslashes, quotes, then newlines.
  local text
  text=$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}')
  curl -fsS -m 10 -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"$text\"}" -o /dev/null "$ALERT_WEBHOOK_URL" 2>/dev/null || true
}

fail() {
  log "ERROR: $*"
  alert "🔴 Roomi backup FAILED on $(hostname): $*"$'\n'"Log: $LOG_FILE"
  ping_healthcheck "/fail"
  exit 1
}

trap 'fail "aborted on line $LINENO"' ERR

# Never let two runs (cron overlap, manual + cron) write concurrently.
exec 9>"$LOCK_FILE"
flock -n 9 || { log "another backup run holds the lock; exiting"; exit 0; }

TS="$(date -u '+%Y%m%dT%H%M%SZ')"
GLOBALS_PATH="$BACKUP_DIR/globals_$TS.sql.gz"
DUMP_PATH="$BACKUP_DIR/postgres_$TS.dump"
STORAGE_ARCHIVE="$BACKUP_DIR/storage_$TS.tar.gz"

command -v docker >/dev/null 2>&1 || fail "docker not found in PATH"
docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null | grep -qx true \
  || fail "container '$DB_CONTAINER' is not running"

log "starting backup (container=$DB_CONTAINER db=$DB_NAME)"
ping_healthcheck "/start"

# --- Cluster globals ---------------------------------------------------------
# -T: no TTY, or docker injects CRs and corrupts the byte stream.
docker exec -i "$DB_CONTAINER" pg_dumpall -U "$DB_USER" --globals-only \
  | gzip -9 > "$GLOBALS_PATH" \
  || fail "pg_dumpall failed"

gzip -t "$GLOBALS_PATH" || fail "globals archive failed gzip integrity check"
globals_bytes=$(stat -c%s "$GLOBALS_PATH")
[ "$globals_bytes" -ge "$MIN_GLOBALS_BYTES" ] \
  || fail "globals dump is only ${globals_bytes}B (< ${MIN_GLOBALS_BYTES}B) — suspect truncation"

# --- Application database ----------------------------------------------------
docker exec -i "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-password \
  > "$DUMP_PATH" \
  || fail "pg_dump failed"

dump_bytes=$(stat -c%s "$DUMP_PATH")
[ "$dump_bytes" -ge "$MIN_DUMP_BYTES" ] \
  || fail "dump is only ${dump_bytes}B (< ${MIN_DUMP_BYTES}B) — suspect truncation"

# Read the dump back through pg_restore's own parser: proves the custom-format
# archive is structurally intact and lists the expected objects.
table_count="$(docker exec -i "$DB_CONTAINER" pg_restore -l < "$DUMP_PATH" \
  | grep -c 'TABLE DATA' || true)"
[ "${table_count:-0}" -ge 1 ] \
  || fail "dump contains no TABLE DATA entries — refusing to keep a useless backup"

log "dump verified: ${dump_bytes}B, ${table_count} tables with data"

# --- Storage objects ---------------------------------------------------------
# Streamed out through the container so this works without root, even though the
# files live under /root on the host.
if docker inspect -f '{{.State.Running}}' "$STORAGE_CONTAINER" 2>/dev/null | grep -qx true; then
  docker exec "$STORAGE_CONTAINER" tar -cf - -C "$STORAGE_PATH" . 2>/dev/null \
    | gzip -6 > "$STORAGE_ARCHIVE" || fail "storage archive failed"

  gzip -t "$STORAGE_ARCHIVE" || fail "storage archive failed gzip integrity check"
  file_count="$(tar -tzf "$STORAGE_ARCHIVE" 2>/dev/null | grep -cv '/$' || true)"
  log "storage archived: $(stat -c%s "$STORAGE_ARCHIVE")B, ${file_count} file(s)"
else
  STORAGE_ARCHIVE=""
  log "WARNING: container '$STORAGE_CONTAINER' not running — uploaded images NOT backed up this run"
fi

# --- Encryption (only when a key is provisioned) -----------------------------
if [ -f "$KEY_FILE" ]; then
  for f in "$GLOBALS_PATH" "$DUMP_PATH" ${STORAGE_ARCHIVE:+"$STORAGE_ARCHIVE"}; do
    openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
      -pass "file:$KEY_FILE" -in "$f" -out "$f.enc" || fail "encryption failed for $f"
    # Prove it decrypts before discarding the plaintext.
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
      -pass "file:$KEY_FILE" -in "$f.enc" -out /dev/null || fail "decrypt check failed for $f.enc"
    chmod 600 "$f.enc"
    rm -f "$f"
  done
  log "encrypted with $KEY_FILE (AES-256-CBC, PBKDF2)"
else
  chmod 600 "$GLOBALS_PATH" "$DUMP_PATH" ${STORAGE_ARCHIVE:+"$STORAGE_ARCHIVE"}
  log "WARNING: $KEY_FILE not found — backups written UNENCRYPTED. Run ops/install-backups.sh to provision a key."
fi

# --- Retention ---------------------------------------------------------------
# Only ever deletes this script's own artifacts, matched by name, inside
# BACKUP_DIR — never a general-purpose recursive delete.
deleted=$(find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'globals_*.sql.gz' -o -name 'globals_*.sql.gz.enc' \
     -o -name 'postgres_*.dump' -o -name 'postgres_*.dump.enc' \
     -o -name 'storage_*.tar.gz' -o -name 'storage_*.tar.gz.enc' \) \
  -mtime "+$RETENTION_DAYS" -print -delete | wc -l)

kept=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'postgres_*' | wc -l)
total=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

log "done — pruned $deleted expired file(s), $kept dump(s) retained, $total on disk"

# Success ping last, so the switch only resets once every check above has passed.
# Pinging earlier would report a truncated or unverified dump as a good backup,
# which is worse than no monitoring at all.
ping_healthcheck
