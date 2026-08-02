# Roomi — production operations

Everything needed to run, recover, and move this deployment. Written for whoever
is on call, including future-you at 3am.

---

## 1. Architecture as deployed

One VPS runs **everything** — the web tier *and* the entire self-hosted Supabase
stack. There is no second machine and no managed database.

```
                    ┌───────────────────────────────┐
   visitors ───────▶│ Cloudflare  (TLS, WAF, cache) │
                    └───────────────┬───────────────┘
                                    │  origin: 93.171.232.71 :80/:443
                    ┌───────────────▼───────────────┐
                    │ Caddy 2.11 (systemd, on host) │  automatic TLS
                    │  roomi.kz      → :3000        │  HTTP/1.1 + h2 + h3
                    │  api.roomi.kz  → :8000 (Kong) │
                    │  :80,:443 catch-all → abort   │
                    └───────┬───────────────┬───────┘
                            │               │
              ┌─────────────▼──────┐  ┌─────▼──────────────────────────┐
              │ roomi-web          │  │ supabase-kong  :8000 (gateway) │
              │ Next.js 15 standby │  └─────┬──────────────────────────┘
              │ node:20-alpine     │        │
              │ 127.0.0.1:3000     │   ┌────┴──── auth (gotrue)   :9999
              │ non-root uid 1001  │   ├───────── rest (postgrest)
              └─────────┬──────────┘   ├───────── realtime
                        │              ├───────── storage → imgproxy
                        │  https       ├───────── edge-functions
                        └─────────────▶├───────── studio  (no public DNS)
                          api.roomi.kz └───────── meta
                                            │
                                  ┌─────────▼──────────┐
                                  │ supavisor (pooler) │ :5432 / :6543
                                  ├─────────▼──────────┤
                                  │ supabase-db        │ PostgreSQL 17.6
                                  │ 127.0.0.1 only     │
                                  └────────────────────┘
```

**Only ports 22, 80 and 443 are reachable from the internet.** Every Supabase
port is bound to `127.0.0.1` and reachable only through Kong via `api.roomi.kz`.

| Layer | What runs it | Notes |
|---|---|---|
| TLS / edge | Cloudflare + Caddy | Caddy also holds its own certs (Let's Encrypt) |
| Web | `roomi-web` container, `ghcr.io/yeraly218/roommatekz` | pinned per-commit SHA tag |
| API gateway | `supabase-kong` | all Supabase traffic funnels through it |
| Database | `supabase-db` (PG 17.6) | data lives in a **bind mount under `/root/supabase`** |
| Deploy | GitHub Actions → SSH → `docker run` | see `.github/workflows/deploy.yml` |

> **The database is not on a Docker named volume.** It is a bind mount inside
> `/root/supabase/docker/volumes`. Any migration plan must copy that path, and
> `docker volume` commands will not capture it.

---

## 2. Backups

Installed by `ops/install-backups.sh` — runs as the `roomi` user, no root needed.

| | |
|---|---|
| Schedule | nightly **03:15**, plus a restore test **Sunday 04:30** |
| Location | `~/backups/postgres` |
| Artifacts | `postgres_<ts>.dump.enc` (app DB, `pg_dump -Fc`), `globals_<ts>.sql.gz.enc` (roles), `storage_<ts>.tar.gz.enc` (uploaded images) |
| Encryption | AES-256-CBC, PBKDF2 200k iterations, key at `~/.config/roomi/backup.key` |
| Retention | 14 days |
| Verification | every run reads the dump back through `pg_restore -l`; weekly run does a **full restore into a scratch database and compares row counts against live** |

```bash
~/ops/backup-db.sh            # take one now
~/ops/restore-db.sh verify    # prove the newest backup actually restores
```

### ⚠ The key must live somewhere other than this server

```bash
cat ~/.config/roomi/backup.key   # → password manager, today
```

Losing the server with the key on it makes every backup permanently unreadable.
That is indistinguishable from having no backups.

### Recovery objectives

| | Value | Determined by |
|---|---|---|
| **RPO** | **≤ 24 h** | nightly dump cadence |
| **RTO** | **~15–30 min** | restore into the existing stack |
| RTO (total host loss) | **~2–4 h** | rebuild VPS + Supabase stack, then restore |

RPO is limited by dump frequency, not by tooling. To reach minutes instead of
hours you need continuous archiving (WAL-G / pgBackRest shipping to object
storage) — see §5.

### Disaster recovery

```bash
# 1. Confirm what you are about to restore
ls -la ~/backups/postgres

# 2. Restore into the LIVE database (deliberately hard to run by accident)
~/ops/restore-db.sh restore ~/backups/postgres/postgres_<ts>.dump.enc \
    --i-understand-this-overwrites-postgres

# 3. Restart the services that cache connections/schema
docker restart supabase-rest supabase-auth roomi-web

# 4. Verify
curl -s http://127.0.0.1:3000/api/health
```

Restoring uploaded images — **required after any host loss**. Supabase Storage
runs with `STORAGE_BACKEND=file`, so images are ordinary files on this host, not
objects in S3. Restoring only the database gives you listings whose photos all
404:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:$HOME/.config/roomi/backup.key \
  -in ~/backups/postgres/storage_<ts>.tar.gz.enc \
  | docker exec -i supabase-storage tar -xzf - -C /var/lib/storage
docker restart supabase-storage
```

Restoring roles (only needed on a rebuilt cluster):

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -pass file:$HOME/.config/roomi/backup.key \
  -in ~/backups/postgres/globals_<ts>.sql.gz.enc | gunzip \
  | docker exec -i supabase-db psql -U postgres
```

---

## 3. Deploying and rolling back

Push to `main` → quality gate (typecheck, lint, 127 tests, build) → image build →
SSH deploy → health gate → **automatic rollback on failure**.

Images are tagged `:latest` *and* `:sha-<commit>`. The container always runs the
SHA tag, so what is live is traceable to one exact build.

**Manual rollback:**

```bash
docker pull ghcr.io/yeraly218/roommatekz:sha-<good-commit>
docker rm -f roomi-web
docker run -d --name roomi-web --restart unless-stopped \
  --env-file ~/app/roomi/.env.production \
  --memory 1g --memory-swap 1g --pids-limit 512 \
  --log-driver json-file --log-opt max-size=20m --log-opt max-file=5 \
  -p 127.0.0.1:3000:3000 ghcr.io/yeraly218/roommatekz:sha-<good-commit>
curl -s http://127.0.0.1:3000/api/health
```

**Deploy downtime is currently ~2–5 s** — Caddy proxies to a fixed
`127.0.0.1:3000`, so the old container must release the port before the new one
binds it. To reach true zero downtime, see §5.

---

## 4. Database migrations

SQL lives in `supabase/migrations/`, applied in filename order:

```bash
docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1 -d postgres \
  < supabase/migrations/<file>.sql
```

Take a backup first (`~/ops/backup-db.sh`) — it takes about three seconds.

---

## 5. Hardening that still needs root

Everything below was identified during the production audit but requires
privileges this deployment's app account does not have. Ordered by severity.

### P0 — SSH accepts passwords from the entire internet

`sshd` offers `publickey,password` on a port open to the world.

```bash
sudo tee /etc/ssh/sshd_config.d/10-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
PermitRootLogin no
KbdInteractiveAuthentication no
MaxAuthTries 3
EOF
sudo sshd -t && sudo systemctl reload ssh   # -t FIRST; never reload an invalid config
```

Keep an open session while testing, and confirm key login from a second terminal
before closing it. Also remove the dead placeholder line from
`~/.ssh/authorized_keys` (a literal `PASTE_YOUR_PUBLIC_KEY_HERE`, plus a
duplicated key).

### P0 — Origin is reachable without going through Cloudflare

Anyone who learns `93.171.232.71` can hit the origin directly, bypassing
Cloudflare's WAF and rate limiting — and can then forge `CF-Connecting-IP`,
which the app now trusts for rate limiting.

```bash
# Allow 80/443 only from Cloudflare; keep SSH reachable.
sudo ufw allow 22/tcp
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do sudo ufw allow from $ip to any port 80,443 proto tcp; done
for ip in $(curl -s https://www.cloudflare.com/ips-v6); do sudo ufw allow from $ip to any port 80,443 proto tcp; done
sudo ufw default deny incoming
sudo ufw enable
```

### P1 — Caddy does not know Cloudflare is in front of it

Caddy overwrites `X-Forwarded-For` with its peer (a Cloudflare edge), so origin
logs and any proxy-level rate limiting see Cloudflare, not visitors.

```caddyfile
{
    servers {
        trusted_proxies static 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 \
            103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 \
            188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 \
            104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22
    }
}
```

Then `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy`.

### P1 — Duplicated, conflicting security headers

Caddy re-adds headers the app already sets, so responses carry two
`Strict-Transport-Security` values (`max-age=31536000` **and** `63072000`), and
duplicate `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.

`next.config.ts` is the single source of truth. Delete the `header { … }` block
from the `roomi.kz` site in `/etc/caddy/Caddyfile`.

### P1 — Docker logs are uncapped host-wide

The app container is now capped by `--log-opt` in the deploy workflow, but the
**eleven Supabase containers are not**. The default `json-file` driver has no
size limit; the disk is 64% full.

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "20m", "max-file": "5" } }
EOF
sudo systemctl restart docker    # restarts ALL containers — pick a quiet window
```

### P2 — PostgreSQL is running stock defaults

`effective_cache_size = 128MB` on a 5.8 GB host makes the planner believe almost
nothing is cached, biasing it away from index scans. Also: no slow-query log, no
statement timeout, no idle-transaction timeout.

```conf
effective_cache_size = 2GB
shared_buffers = 512MB
work_mem = 8MB
random_page_cost = 1.1            # SSD-backed, not spinning rust
log_min_duration_statement = 500  # surface slow queries at all
statement_timeout = 30s
idle_in_transaction_session_timeout = 60s
```

Add via the Supabase compose env or a mounted `postgresql.conf`, then restart
`supabase-db`. Low urgency at current data volumes; do it before real growth.

### P2 — Studio and other unused surface

- `studio.roomi.kz` is defined in the Caddyfile but has **no DNS record**, so it
  is unreachable. If you ever add the record, note that Caddy's `basicauth /`
  matches the path `/` **exactly** — subpaths would be unauthenticated. Use
  `basic_auth *`.
- `supabase-studio` uses ~270 MB RAM for a tool with no public route. Stopping it
  (`docker stop supabase-studio`) frees that; start it when you need it.
- `certbot.timer` and `/etc/cron.d/certbot` are leftovers — Caddy manages TLS.

### P2 — Zero-downtime deploys

Run two app containers and let Caddy fail over, replacing the fixed upstream:

```caddyfile
reverse_proxy 127.0.0.1:3000 127.0.0.1:3001 {
    lb_policy first
    health_uri /api/health
    health_interval 2s
    fail_duration 10s
}
```

Deploy to the idle port, wait for it to pass health checks, then stop the other.
Caddy drains the old upstream automatically. Removes the 2–5 s gap entirely.

### P3 — Swap tuning

`vm.swappiness=60` is desktop-oriented; with a database on the box, 10 is better.

```bash
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system
```

---

## 6. Moving to another provider

Nothing here is provider-specific — it is Debian + Docker + Caddy. Portability is
already good. The migration path:

1. **Provision** a new VPS (≥ 4 vCPU / 8 GB recommended; the current 6 GB is tight).
2. **Install** Docker, Caddy, and copy `/root/supabase` (compose + `.env` + the
   `volumes/` bind mounts).
3. **Restore** the database from `~/backups/postgres` (§2).
4. **Copy** `~/app/roomi/.env.production` and `~/.config/roomi/backup.key`.
5. **Install** the backup system: `bash ops/install-backups.sh`.
6. **Verify** on the new host with the old one still live:
   ```bash
   curl -H 'Host: roomi.kz' http://<new-ip>/api/health
   ```
7. **Cut over in Cloudflare** — change the origin A record. TTL is the only
   downtime, typically < 60 s, and it is instantly reversible.
8. Keep the old VPS for 48 h before destroying it.

The database is the only stateful component. Storage objects live in Postgres +
the Supabase storage bind mount, which step 2 covers.
