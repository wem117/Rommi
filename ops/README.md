# Roomi — production operations

Everything needed to run, recover, and move this deployment. Written for whoever
is on call, including future-you at 3am.

---

## 0. Fix register

Findings from the production readiness audit, by severity. "Shipped" means the
change is committed and verified; it does **not** mean it is live — see the
deployment note under each. Anything marked *needs root* has exact commands in
§5.

### P0 — fix before the next growth push

| # | Finding | Status |
|---|---|---|
| 1 | **No backups existed.** `/opt/backup.sh` was an unedited template containing the literal string `<postgres_container_name>`, referenced by no cron or timer. RPO was total data loss. | **Done and running** — nightly, encrypted, self-verifying; restore tested against live (§2) |
| 2 | **Uploaded images were unprotected.** Storage runs `STORAGE_BACKEND=file`, so 64 images lived only on this host's disk. A DB-only backup would have restored rows pointing at files that no longer existed. | **Done** — included in the nightly run, decrypt + JPEG magic bytes verified |
| 3 | **Server-side DB calls exit to Cloudflare and return** — 239–805 ms vs 3–24 ms locally, on every SSR page that touches the database. | Code **shipped** (inert by default); needs 2 host commands to activate — §5 |
| 4 | **SSH accepts passwords** from the entire internet. | *Needs root* — §5 |
| 5 | **Origin reachable bypassing Cloudflare**, defeating the WAF and making `CF-Connecting-IP` forgeable. | *Needs root* — §5 |

### P1 — fix soon

| # | Finding | Status |
|---|---|---|
| 6 | **A failed deploy had no way back.** Only `:latest` was pushed, so by the time a bad release was identified its tag had already been overwritten. | **Shipped** — immutable `:sha-<commit>` tags + automatic rollback on failed health check |
| 7 | **Rate limiting counted the wrong thing.** Caddy overwrites `X-Forwarded-For` with its own peer — a Cloudflare edge — so every visitor behind an edge shared one bucket. One abuser could throttle unrelated users. | **Shipped** — prefers `cf-connecting-ip`, 9 tests |
| 8 | **No resource limits or log rotation** on the web tier, sharing 5.8 GB with Postgres. Docker's default json-file driver has no size cap. | **Shipped** for the app; the 11 Supabase containers still *need root* — §5 |
| 9 | **`anon` holds INSERT/UPDATE/DELETE/TRUNCATE on every public table.** RLS is the only control, and **RLS does not apply to TRUNCATE at all**. | Migration **written, NOT applied** — needs review, §4 |
| 10 | **Caddy does not know Cloudflare is in front of it** (no `trusted_proxies`). | *Needs root* — §5 |
| 11 | **Duplicate, conflicting security headers** — two `Strict-Transport-Security` values (31536000 and 63072000). | *Needs root* — §5 |

### P2 / P3 — worth doing, not urgent

| # | Finding | Status |
|---|---|---|
| 12 | Container healthcheck probed `/`, server-rendering a DB-backed page every 30 s. | **Shipped** — now `/api/health` |
| 13 | **No declarative definition of the deployment** — the runtime contract existed only inside a CI script. | **Shipped** — `ops/docker-compose.yml` |
| 14 | **Single Node process** caps throughput at ~113 rps while 3 of 4 vCPUs idle. | *Needs root* — a second container + Caddy load-balancing also buys zero-downtime deploys, §5 |
| 15 | PostgreSQL on stock defaults (`effective_cache_size` 128 MB); no slow-query log, no statement timeout. | *Needs root* — §5 |
| 16 | `authorized_keys` contains a literal `PASTE_YOUR_PUBLIC_KEY_HERE` line and a duplicated key. | *Needs root* — §5 |
| 17 | `studio.roomi.kz` defined in Caddy with no DNS record. If DNS is ever added, note `basicauth /` matches that path **exactly** — subpaths would be unauthenticated. | Latent; §5 |
| 18 | Leftover `certbot.timer` and `/etc/cron.d/certbot` — Caddy manages TLS. | *Needs root* — §5 |
| 19 | `vm.swappiness=60` with a database on the box. | *Needs root* — §5 |

### Not fixable from inside this box

**CPU steal is 16% at idle** — the hypervisor is taking roughly two-thirds of a
vCPU before the app does any work. No tuning changes this; it is the provider
oversubscribing the host. Worth raising with them, and a reason to size the next
VPS with headroom.

### Observability — what exists, and the one thing left

Deliberately lightweight: no Prometheus, Grafana, Loki or Alertmanager. That
stack would want ~1–1.5 GB on a box with ~3 GB free and 16% CPU steal, to watch
a service using 87 MB.

| Capability | State |
|---|---|
| Structured JSON logs | **Built in** — `src/lib/observability/logger.ts`, one line per event, parseable by any aggregator |
| Server error capture | **Built in** — `onRequestError` in `src/instrumentation.ts` catches every uncaught error in Server Components, route handlers and middleware |
| Sentry forwarding | **Built in, inert** — posts via `fetch` to Sentry's store endpoint, so there is no `@sentry/*` dependency and no client bundle cost. Needs `SENTRY_DSN`. |
| Health endpoint | **Built in** — `/api/health`, unauthenticated, 200/503, reports process and database separately |
| Backup failure alerting | **Built in** — webhook + dead-man's switch, see §2 |
| Uptime monitoring | **Needs an external account** — point any monitor at `https://roomi.kz/api/health` and alert on non-200 |

**The one thing left is a DSN.** Error tracking is wired end to end and running
in production right now, but with `SENTRY_DSN` unset it degrades to structured
console output. Create a Sentry project, then add the DSN as a GitHub secret
named `SENTRY_DSN` — the deploy workflow already passes it through. No code
change, no redeploy of anything else.

Note the Sentry forwarder is hand-rolled against the store endpoint and has
**not** been exercised against a live DSN. Confirm the first event arrives after
configuring it; if richer capture is wanted later (client-side errors,
breadcrumbs, source-mapped stack traces), `@sentry/nextjs` is the upgrade path
and this module is the thing it replaces.

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

### Alerting on backup failure

Silent failure is the only failure mode that matters here — a backup that stops
running looks exactly like one that is working. Configure both channels in a
file kept out of the repo:

```bash
install -m 600 /dev/null ~/.config/roomi/alerts.env
cat > ~/.config/roomi/alerts.env <<'EOF'
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
HEALTHCHECK_URL=https://hc-ping.com/<uuid-for-nightly-backup>
RESTORE_HEALTHCHECK_URL=https://hc-ping.com/<uuid-for-weekly-restore>
EOF
```

| | Fires when | Covers |
|---|---|---|
| `ALERT_WEBHOOK_URL` | the script runs and fails | a bad dump, a stopped container, a full disk |
| `HEALTHCHECK_URL` | the script does **not** ping on schedule | broken cron, a dead box, a hung run |

The second is the one that saves you. A webhook can only fire when the script
executes; it stays silent in exactly the situations where you most need to hear
something. The dead-man's switch alerts on *silence*.

`{"text": "..."}` is accepted unchanged by Slack, Discord and Mattermost. Both
are optional — with no config the scripts run exactly as before.

The success ping is sent **last**, after the dump has been read back and every
integrity check has passed, so a truncated or unverified backup can never reset
the switch.

Verified end to end against a local receiver: success pings `/start` then the
base URL; a failed backup and a failed restore each POST the webhook and ping
`/fail`. The restore test was confirmed to reject a deliberately corrupted dump
(12/12 tables reported as differing) rather than passing it.

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

`ops/docker-compose.yml` describes the same container declaratively — the memory
ceiling, pid limit, log rotation, health probe and networks that otherwise exist
only inside the CI script. Use it to rebuild the web tier by hand (after an
incident, or on a new host) without retyping `docker run` flags from memory:

```bash
cd ops
cp ~/app/roomi/.env.production .env.production
ROOMI_IMAGE=ghcr.io/yeraly218/roommatekz:sha-<commit> docker compose up -d
```

It intentionally does not define Postgres or the Supabase services — those stay
owned by the upstream compose project in `/root/supabase/docker`, so there is
only ever one source of truth for the database.

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

### P0 — Server-side database traffic leaves the machine and comes back

The single largest performance problem measured during the audit.

`NEXT_PUBLIC_SUPABASE_URL` is `https://api.roomi.kz`, which resolves to
Cloudflare. Server-side rendering uses that same hostname, so a request that
could stay on loopback instead exits the VPS, crosses the internet to a
Cloudflare PoP, and is routed straight back to this host:

```
measured from inside the roomi-web container
  https://api.roomi.kz/rest/v1/    239 ms, 537 ms, 555 ms, 805 ms
  http://127.0.0.1:8000/rest/v1/     3 ms,  10 ms,  22 ms,  24 ms
```

**Every server-rendered page that touches the database pays 200–800 ms of
avoidable latency**, and the site's availability is needlessly coupled to
Cloudflare and to public DNS.

The application side is already done and shipped: server-side Supabase clients
read `SUPABASE_INTERNAL_URL` when set (`src/lib/supabase/config.ts`), and the
upload route re-anchors stored image URLs to the public origin so nothing
user-facing changes. **It is inert until the two steps below are performed**, so
the code is safe to deploy on its own.

```bash
# 1. Put the app on the Supabase network so it can resolve `kong` by name.
#    Additive — the container keeps its existing bridge network and published port.
docker network connect supabase_default roomi-web

# 2. Add the internal origin and restart.
echo 'SUPABASE_INTERNAL_URL=http://kong:8000' >> ~/app/roomi/.env.production
docker restart roomi-web
```

Also add `SUPABASE_INTERNAL_URL` to the env block in
`.github/workflows/deploy.yml` (and as a repository secret) so it survives the
next deploy, and add `docker network connect supabase_default roomi-web || true`
after `start_app`.

Verify:

```bash
curl -s http://127.0.0.1:3000/api/health     # expect {"database":"ok"}
curl -o /dev/null -w '%{time_total}\n' http://127.0.0.1:3000/   # expect a large drop
```

Rollback: remove the line from `.env.production` and `docker restart roomi-web`.
The code falls back to the public URL automatically.

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
