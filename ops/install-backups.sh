#!/usr/bin/env bash
#
# Installs the backup system for the account that runs it (no root required —
# the account only needs docker access).
#
#   - copies backup-db.sh / restore-db.sh to ~/ops
#   - generates an AES key at ~/.config/roomi/backup.key if absent
#   - installs two cron entries: a nightly backup and a weekly restore test
#
# Idempotent: re-running updates the scripts and leaves an existing key and
# existing schedule untouched.

set -Eeuo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$HOME/ops"
KEY_FILE="$HOME/.config/roomi/backup.key"
BACKUP_HOUR="${BACKUP_HOUR:-3}"

echo "==> Installing backup scripts to $DEST_DIR"
mkdir -p "$DEST_DIR" "$HOME/backups"
install -m 700 "$SRC_DIR/backup-db.sh"  "$DEST_DIR/backup-db.sh"
install -m 700 "$SRC_DIR/restore-db.sh" "$DEST_DIR/restore-db.sh"

if [ -f "$KEY_FILE" ]; then
  echo "==> Encryption key already present at $KEY_FILE (left unchanged)"
else
  echo "==> Generating encryption key at $KEY_FILE"
  mkdir -p "$(dirname "$KEY_FILE")"; chmod 700 "$(dirname "$KEY_FILE")"
  openssl rand -base64 48 > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  cat <<'WARN'

  ############################################################################
  #  COPY THIS KEY OFF THE SERVER NOW.
  #
  #  Backups are encrypted with it. A server loss that takes the key with it
  #  makes every backup permanently unreadable — which is the same as having
  #  no backups at all.
  #
  #      cat ~/.config/roomi/backup.key      # store in a password manager
  ############################################################################

WARN
fi

# --- Cron --------------------------------------------------------------------
# Rewrites only the two Roomi lines; any other cron entries are preserved.
echo "==> Installing cron schedule"
CRON_BACKUP="15 ${BACKUP_HOUR} * * * $DEST_DIR/backup-db.sh >/dev/null 2>&1"
CRON_VERIFY="30 4 * * 0 $DEST_DIR/restore-db.sh verify >/dev/null 2>&1"

current="$(crontab -l 2>/dev/null || true)"
kept="$(printf '%s\n' "$current" | grep -v 'ops/backup-db.sh' | grep -v 'ops/restore-db.sh' || true)"
printf '%s\n%s\n%s\n' "$kept" "$CRON_BACKUP" "$CRON_VERIFY" | grep -v '^$' | crontab -

echo "==> Cron installed:"
crontab -l | grep 'ops/' | sed 's/^/    /'

cat <<EOF

==> Done.

    Backups      $HOME/backups/postgres
    Logs         $HOME/backups/backup.log, $HOME/backups/restore.log
    Nightly      ${BACKUP_HOUR}:15 server time — full dump + globals, verified, encrypted
    Weekly       Sun 04:30 — automated restore test into a scratch database

    Run once now to confirm:   $DEST_DIR/backup-db.sh && $DEST_DIR/restore-db.sh verify
EOF
