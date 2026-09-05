-- =============================================================================
-- DealFlow360 Required PostgreSQL Extensions
-- =============================================================================

\c dealflow_db

-- Enable UUID generation support for database primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions for tokens and hashes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log extension installation
DO
$do$
BEGIN
   RAISE NOTICE 'DealFlow360 PostgreSQL Extensions (uuid-ossp, pgcrypto) successfully enabled.';
END
$do$;
