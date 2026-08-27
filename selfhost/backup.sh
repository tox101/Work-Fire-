#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
set -a
. "$ROOT/selfhost/.env"
set +a
STAMP="$(date +%F-%H%M%S)"
OUT="$ROOT/backups/$STAMP"
mkdir -p "$OUT"

docker compose --env-file "$ROOT/selfhost/.env" -f "$ROOT/selfhost/docker-compose.yml" exec -T db \
  mysqldump -u root -p"${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}" \
  --single-transaction --routines --triggers --databases personal_work_os > "$OUT/database.sql"
docker run --rm -v personal-work-os_uploads_data:/data -v "$OUT":/backup alpine \
  tar czf /backup/uploads.tgz -C /data .
printf 'Backup created: %s\n' "$OUT"
