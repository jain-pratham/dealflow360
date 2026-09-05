-- =============================================================================
-- DealFlow360 Database Initialization Script
-- =============================================================================
-- This script runs automatically on initial PostgreSQL container startup.
-- It ensures a dedicated application user and database exist with least-privilege rules.
-- =============================================================================

-- Create dedicated application database if not existing
SELECT 'CREATE DATABASE dealflow_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dealflow_db')\gexec

-- Create dedicated application user if not existing
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'dealflow_user') THEN

      CREATE ROLE dealflow_user WITH LOGIN PASSWORD 'dealflow_app_secure_pass_2026';
   END IF;
END
$do$;

-- Grant privileges on dealflow_db database to application user
GRANT ALL PRIVILEGES ON DATABASE dealflow_db TO dealflow_user;

-- Connect to dealflow_db database
\c dealflow_db

-- Grant schema privileges to application user
GRANT ALL ON SCHEMA public TO dealflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dealflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dealflow_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO dealflow_user;

-- Log successful initialization
DO
$do$
BEGIN
   RAISE NOTICE 'DealFlow360 Application Database (dealflow_db) and User (dealflow_user) successfully initialized.';
END
$do$;
