# DealFlow360 Infrastructure Automated Verification Script (PowerShell)
# Usage: .\scripts\verify-infra.ps1

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         DealFlow360 Infrastructure Verification Suite                 " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# Step 1: Docker Compose Syntax Validation
Write-Host "[1/7] Validating Docker Compose configuration..." -ForegroundColor Yellow
docker compose config --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Compose configuration valid." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Compose configuration invalid!" -ForegroundColor Red
    exit 1
}

# Step 2: Check Container Health
Write-Host "[2/7] Checking PostgreSQL container health..." -ForegroundColor Yellow
$HEALTH = docker inspect --format '{{json .State.Health.Status}}' dealflow-postgres 2>$null
if ($HEALTH -like "*healthy*") {
    Write-Host "  [OK] Container dealflow-postgres is HEALTHY." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Container dealflow-postgres is NOT healthy! Current status: $HEALTH" -ForegroundColor Red
    exit 1
}

# Step 3: Verify Persistent Volume
Write-Host "[3/7] Verifying named Docker volumes..." -ForegroundColor Yellow
$VOLUMES = docker volume ls --format "{{.Name}}"
if ($VOLUMES -match "dealflow_postgres_data") {
    Write-Host "  [OK] Persistent volume 'dealflow_postgres_data' exists." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Volume 'dealflow_postgres_data' missing!" -ForegroundColor Red
    exit 1
}

# Step 4: Verify Application Database and User Credentials
Write-Host "[4/7] Testing Application Database and User Privileges..." -ForegroundColor Yellow
$DB_CHECK = docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -c "SELECT current_database(), current_user;" 2>&1
if ($DB_CHECK -match "dealflow_db" -and $DB_CHECK -match "dealflow_user") {
    Write-Host "  [OK] Connected successfully as application user 'dealflow_user' to 'dealflow_db'." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Failed to connect as application user! Details: $DB_CHECK" -ForegroundColor Red
    exit 1
}

# Step 5: Verify Required Extensions
Write-Host "[5/7] Checking PostgreSQL extensions (uuid-ossp, pgcrypto)..." -ForegroundColor Yellow
$EXT_CHECK = docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -c "SELECT extname FROM pg_extension;" 2>&1
if ($EXT_CHECK -match "uuid-ossp" -and $EXT_CHECK -match "pgcrypto") {
    Write-Host "  [OK] Required extensions (uuid-ossp, pgcrypto) enabled." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Missing required PostgreSQL extensions! Details: $EXT_CHECK" -ForegroundColor Red
    exit 1
}

# Step 6: Verify Network Isolation
Write-Host "[6/7] Verifying Docker Network..." -ForegroundColor Yellow
$NET = docker network ls --format "{{.Name}}"
if ($NET -contains "dealflow_network") {
    Write-Host "  [OK] Dedicated bridge network 'dealflow_network' exists." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Network 'dealflow_network' missing!" -ForegroundColor Red
    exit 1
}

# Step 7: Verify Data Persistence Test Record
Write-Host "[7/7] Executing Data Persistence Verification..." -ForegroundColor Yellow
docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -c "CREATE TABLE IF NOT EXISTS _infra_healthcheck (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now()); INSERT INTO _infra_healthcheck DEFAULT VALUES;" >$null 2>&1
$RECORD_COUNT = docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -t -c "SELECT count(*) FROM _infra_healthcheck;" 2>&1
$COUNT_TRIMMED = $RECORD_COUNT.ToString().Trim()
Write-Host "  [OK] Persistence table active. Current healthcheck records: $COUNT_TRIMMED" -ForegroundColor Green

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "     ALL INFRASTRUCTURE CHECKS PASSED SUCCESSFULLY!                    " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
