#!/usr/bin/env bash
# DealFlow360 Database Backup Script (Bash)
# Usage: ./scripts/backup-db.sh

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$(dirname "$0")/../backups"
BACKUP_FILE="${BACKUP_DIR}/dealflow_db_dump_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

echo "Creating DealFlow360 PostgreSQL backup..."
docker exec -t dealflow-postgres pg_dump -U dealflow_user -d dealflow_db > "${BACKUP_FILE}"

echo "Backup completed successfully!"
echo "Saved to: ${BACKUP_FILE}"
