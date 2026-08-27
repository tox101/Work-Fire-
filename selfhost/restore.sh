#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: MYSQL_ROOT_PASSWORD=... ./selfhost/restore.sh backups/YYYY-MM-DD-HHMMSS" >&2
  exit 1
fi

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
set -a
. "$ROOT/selfhost/.env"
set +a
BACKUP="$(CDPATH= cd -- "$1" && pwd)"
test -f "$BACKUP/database.sql"
test -f "$BACKUP/uploads.tgz"

docker compose --env-file "$ROOT/selfhost/.env" -f "$ROOT/selfhost/docker-compose.yml" exec -T db \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}" < "$BACKUP/database.sql"
docker run --rm -v personal-work-os_uploads_data:/data -v "$BACKUP":/backup alpine \
  sh -c 'rm -rf /data/* && tar xzf /backup/uploads.tgz -C /data'
printf 'Restored: %s\n' "$BACKUP"
