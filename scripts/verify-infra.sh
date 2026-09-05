#!/usr/bin/env bash
# DealFlow360 Infrastructure Automated Verification Script (Bash)
# Usage: ./scripts/verify-infra.sh

set -e

echo "======================================================================"
echo "         DealFlow360 Infrastructure Verification Suite                 "
echo "======================================================================"

# Step 1: Docker Compose Syntax Validation
echo "[1/7] Validating Docker Compose configuration..."
if docker compose config --quiet; then
    echo "  [OK] Compose configuration valid."
else
    echo "  [FAIL] Compose configuration invalid!"
    exit 1
fi

# Step 2: Check Container Health
echo "[2/7] Checking PostgreSQL container health..."
HEALTH=$(docker inspect --format '{{json .State.Health.Status}}' dealflow-postgres 2>/dev/null || echo "not running")
if [[ "${HEALTH}" == *"healthy"* ]]; then
    echo "  [OK] Container dealflow-postgres is HEALTHY."
else
    echo "  [FAIL] Container dealflow-postgres is NOT healthy! Current status: ${HEALTH}"
    exit 1
fi

# Step 3: Verify Persistent Volume
echo "[3/7] Verifying named Docker volumes..."
VOLUMES=$(docker volume ls --format "{{.Name}}")
if echo "${VOLUMES}" | grep -q "dealflow_postgres_data"; then
    echo "  [OK] Persistent volume 'dealflow_postgres_data' exists."
else
    echo "  [FAIL] Volume 'dealflow_postgres_data' missing!"
    exit 1
fi

# Step 4: Verify Application Database and User Credentials
echo "[4/7] Testing Application Database and User Privileges..."
DB_CHECK=$(docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -c "SELECT current_database(), current_user;" 2>&1 || true)
if echo "${DB_CHECK}" | grep -q "dealflow_db" && echo "${DB_CHECK}" | grep -q "dealflow_user"; then
    echo "  [OK] Connected successfully as application user 'dealflow_user' to 'dealflow_db'."
else
    echo "  [FAIL] Failed to connect as application user! Details: ${DB_CHECK}"
    exit 1
fi

# Step 5: Verify Required Extensions
echo "[5/7] Checking PostgreSQL extensions (uuid-ossp, pgcrypto)..."
EXT_CHECK=$(docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -c "SELECT extname FROM pg_extension;" 2>&1 || true)
if echo "${EXT_CHECK}" | grep -q "uuid-ossp" && echo "${EXT_CHECK}" | grep -q "pgcrypto"; then
    echo "  [OK] Required extensions (uuid-ossp, pgcrypto) enabled."
else
    echo "  [FAIL] Missing required PostgreSQL extensions! Details: ${EXT_CHECK}"
    exit 1
fi

# Step 6: Verify Network Isolation
echo "[6/7] Verifying Docker Network..."
NET=$(docker network ls --format "{{.Name}}")
if echo "${NET}" | grep -q "dealflow_network"; then
    echo "  [OK] Dedicated bridge network 'dealflow_network' exists."
else
    echo "  [FAIL] Network 'dealflow_network' missing!"
    exit 1
fi

# Step 7: Verify Data Persistence Test Record
echo "[7/7] Executing Data Persistence Verification..."
docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -c "CREATE TABLE IF NOT EXISTS _infra_healthcheck (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now()); INSERT INTO _infra_healthcheck DEFAULT VALUES;" >/dev/null 2>&1
RECORD_COUNT=$(docker exec -t dealflow-postgres psql -U dealflow_user -d dealflow_db -t -c "SELECT count(*) FROM _infra_healthcheck;" 2>&1 | tr -d '[:space:]')
echo "  [OK] Persistence table active. Current healthcheck records: ${RECORD_COUNT}"

echo "======================================================================"
echo "     ALL INFRASTRUCTURE CHECKS PASSED SUCCESSFULLY!                    "
echo "======================================================================"
