# DealFlow360 Database Backup Script (PowerShell)
# Usage: .\scripts\backup-db.ps1

$ErrorActionPreference = "Stop"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = Join-Path $PSScriptRoot "..\backups"
$BACKUP_FILE = Join-Path $BACKUP_DIR "dealflow_db_dump_$TIMESTAMP.sql"

if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "Creating DealFlow360 PostgreSQL backup..." -ForegroundColor Cyan

docker exec -t dealflow-postgres pg_dump -U dealflow_user -d dealflow_db | Out-File -FilePath $BACKUP_FILE -Encoding utf8

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
    Write-Host "Backup file saved to: $BACKUP_FILE" -ForegroundColor Yellow
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
    exit 1
}
