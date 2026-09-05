# DealFlow360 Database Restore Script (PowerShell)
# Usage: .\scripts\restore-db.ps1 -BackupFile .\backups\dealflow_db_dump_TIMESTAMP.sql

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Host "Error: Backup file '$BackupFile' does not exist." -ForegroundColor Red
    exit 1
}

Write-Host "Restoring DealFlow360 database from: $BackupFile..." -ForegroundColor Cyan

Get-Content $BackupFile | docker exec -i dealflow-postgres psql -U dealflow_user -d dealflow_db

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restored successfully!" -ForegroundColor Green
} else {
    Write-Host "Database restore failed!" -ForegroundColor Red
    exit 1
}
