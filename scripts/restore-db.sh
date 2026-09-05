#!/usr/bin/env bash
# DealFlow360 Database Restore Script (Bash)
# Usage: ./scripts/restore-db.sh ./backups/dealflow_db_dump_TIMESTAMP.sql

set -e

BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Please provide a valid backup SQL file path."
  echo "Usage: ./scripts/restore-db.sh <path-to-sql-dump>"
  exit 1
fi

echo "Restoring DealFlow360 database from: ${BACKUP_FILE}..."
cat "${BACKUP_FILE}" | docker exec -i dealflow-postgres psql -U dealflow_user -d dealflow_db

echo "Database restored successfully!"
