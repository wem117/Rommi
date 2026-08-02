#!/usr/bin/env bash
#
# Roomi — restore / restore-verification for the self-hosted Supabase database.
#
#   ops/restore-db.sh verify [<dump>]     restore into a throwaway database and
#                                         compare row counts against live, then
#                                         drop it. Touches NO production data.
#                                         This is what cron runs weekly.
#
#   ops/restore-db.sh restore <dump> --i-understand-this-overwrites-<DB_NAME>
#                                         real disaster recovery: restores into
#                                         the actual application database.
#
# The destructive path deliberately requires a long, database-specific flag so it
# cannot be triggered by a typo, a stray argument, or a copy-pasted command.

set -Eeuo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/postgres}"
KEY_FILE="${KEY_FILE:-$HOME/.config/roomi/backup.key}"
VERIFY_DB="${VERIFY_DB:-roomi_restore_verify}"
LOG_FILE="${LOG_FILE:-$HOME/backups/restore.log}"

mkdir -p "$(dirname "$LOG_FILE")"

# See ops/backup-db.sh for the rationale; same config file, separate switch so a
# failing weekly restore test is distinguishable from a failing nightly dump.
ALERTS_ENV="${ALERTS_ENV:-$HOME/.config/roomi/alerts.env}"
# shellcheck disable=SC1090
[ -f "$ALERTS_ENV" ] && . "$ALERTS_ENV"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
RESTORE_HEALTHCHECK_URL="${RESTORE_HEALTHCHECK_URL:-}"

log() { printf '%s [restore] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE" >&2; }

ping_healthcheck() {
  [ -n "$RESTORE_HEALTHCHECK_URL" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${RESTORE_HEALTHCHECK_URL}${1:-}" 2>/dev/null || true
}

alert() {
  [ -n "$ALERT_WEBHOOK_URL" ] || return 0
  local text
  text=$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}')
  curl -fsS -m 10 -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"$text\"}" -o /dev/null "$ALERT_WEBHOOK_URL" 2>/dev/null || true
}

fail() {
  log "ERROR: $*"
  # A restore test that fails means the backups are not restorable — the single
  # most important thing to be told about, and the easiest to never notice.
  alert "🔴 Roomi RESTORE VERIFICATION FAILED on $(hostname): $*"$'\n'"Log: $LOG_FILE"
  ping_healthcheck "/fail"
  exit 1
}

# NOTE: no `-i`, and stdin is explicitly detached. These queries run inside a
# `while read` loop fed by a here-string; an interactive `docker exec` would
# consume that loop's stdin and silently cut the iteration short after one row.
psql_q() { docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$1" -tAc "$2" </dev/null; }

latest_dump() {
  find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'postgres_*.dump' -o -name 'postgres_*.dump.enc' \) \
    -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-
}

# Decrypts to a temp file when needed; echoes a path to a plaintext dump.
materialize() {
  local src="$1" out
  case "$src" in
    *.enc)
      [ -f "$KEY_FILE" ] || fail "$src is encrypted but $KEY_FILE is missing"
      out="$(mktemp)"; chmod 600 "$out"
      openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
        -pass "file:$KEY_FILE" -in "$src" -out "$out" || fail "decryption failed"
      echo "$out" ;;
    *) echo "$src" ;;
  esac
}

MODE="${1:-verify}"

case "$MODE" in
  verify)
    SRC="${2:-$(latest_dump)}"
    [ -n "$SRC" ] && [ -f "$SRC" ] || fail "no backup found in $BACKUP_DIR — has ops/backup-db.sh run yet?"
    log "verifying $SRC"
    PLAIN="$(materialize "$SRC")"
    trap '[ "${PLAIN:-}" != "${SRC:-}" ] && rm -f "$PLAIN" || true' EXIT

    # Start from a guaranteed-clean scratch database.
    psql_q postgres "DROP DATABASE IF EXISTS $VERIFY_DB;" >/dev/null
    psql_q postgres "CREATE DATABASE $VERIFY_DB;" >/dev/null
    log "created scratch database $VERIFY_DB"

    # Supabase dumps reference roles/extensions that already exist cluster-wide;
    # those produce non-fatal errors on restore. Row counts below are the real
    # pass/fail signal, so collect errors but don't abort on them.
    restore_errors=0
    docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$VERIFY_DB" \
      --no-owner --no-privileges < "$PLAIN" 2>"$LOG_FILE.tmp" || restore_errors=1
    err_count=$(grep -c '^pg_restore: error' "$LOG_FILE.tmp" 2>/dev/null || true)
    cat "$LOG_FILE.tmp" >> "$LOG_FILE"; rm -f "$LOG_FILE.tmp"
    log "pg_restore finished (exit-flag=$restore_errors, ${err_count:-0} non-fatal errors)"

    # --- The actual proof: compare live vs restored row counts ---------------
    tables="$(psql_q "$DB_NAME" \
      "select tablename from pg_tables where schemaname='public' order by tablename;")"
    [ -n "$tables" ] || fail "no public tables found in live database — cannot verify"

    mismatches=0; checked=0
    while IFS= read -r t; do
      [ -n "$t" ] || continue
      live="$(psql_q "$DB_NAME"  "select count(*) from public.\"$t\";" 2>/dev/null || echo MISSING)"
      rest="$(psql_q "$VERIFY_DB" "select count(*) from public.\"$t\";" 2>/dev/null || echo MISSING)"
      checked=$((checked + 1))
      if [ "$live" != "$rest" ]; then
        log "  MISMATCH $t: live=$live restored=$rest"
        mismatches=$((mismatches + 1))
      fi
    done <<< "$tables"

    psql_q postgres "DROP DATABASE IF EXISTS $VERIFY_DB;" >/dev/null
    log "dropped scratch database $VERIFY_DB"

    if [ "$mismatches" -gt 0 ]; then
      # Live rows can legitimately change mid-restore on a busy system; on this
      # workload it almost always means a genuinely bad backup.
      fail "RESTORE VERIFICATION FAILED — $mismatches/$checked tables differ"
    fi
    log "RESTORE VERIFIED OK — $checked tables match between backup and live"
    ping_healthcheck
    ;;

  restore)
    SRC="${2:-}"; CONFIRM="${3:-}"
    [ -n "$SRC" ] && [ -f "$SRC" ] || fail "usage: $0 restore <dump-file> --i-understand-this-overwrites-$DB_NAME"
    [ "$CONFIRM" = "--i-understand-this-overwrites-$DB_NAME" ] \
      || fail "refusing: pass --i-understand-this-overwrites-$DB_NAME to confirm overwriting the LIVE database"

    log "DISASTER RECOVERY: restoring $SRC into LIVE database $DB_NAME"
    PLAIN="$(materialize "$SRC")"
    trap '[ "${PLAIN:-}" != "${SRC:-}" ] && rm -f "$PLAIN" || true' EXIT

    # --clean drops each object immediately before recreating it, so the window
    # where an object is missing is as short as possible.
    docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" \
      --clean --if-exists --no-owner --no-privileges < "$PLAIN" 2>&1 | tee -a "$LOG_FILE" || true

    log "restore finished — verify the application, then restart dependent services:"
    log "  docker restart supabase-rest supabase-auth roomi-web"
    ;;

  *)
    fail "unknown mode '$MODE' (expected: verify | restore)"
    ;;
esac
