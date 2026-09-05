# DealFlow360 — Sales Operations Platform

> **An Intelligent, Self-Governing Sales Operations Platform**

DealFlow360 is a B2B Sales Operations platform designed to automate multi-tier discount governance, blended risk evaluation, automated approval routing, live upsell/cross-sell recommendations, multi-warehouse fulfillment splitting, hybrid subscription billing, customer quotation negotiation, deal health monitoring, and reporting dashboards.

---

## 🛠 Technology Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, Node.js, TypeScript (Modular Monolith)
- **Database**: PostgreSQL 16 (Dockerized), Prisma ORM
- **Cache & Queues**: Redis 7.2 (Dockerized), BullMQ
- **Authentication**: JWT, Refresh Tokens, RBAC (Sales Rep, Sales Manager, Finance, Admin, Customer)
- **Realtime**: Socket.IO
- **Infrastructure**: Docker & Docker Compose

---

## 🏗 Architecture Topology

```text
+----------------------------------------------------------------------------------------------------+
|                                      HOST WORKSTATION / OS                                         |
|                                                                                                    |
|  Dev Host Access: 127.0.0.1:5433 (PostgreSQL) | 127.0.0.1:6379 (Redis)                              |
+------------------------------------------------|---------------------------------------------------+
                                                 |
                                                 v
+----------------------------------------------------------------------------------------------------+
|                                     DOCKER BRIDGE NETWORK                                          |
|                                       (dealflow_network)                                           |
|                                                                                                    |
|  +------------------------+      +------------------------+      +------------------------------+  |
|  |    Frontend Service    |      |    Backend Service     |      |       Redis Container        |  |
|  |      (Next.js App)     | ---> |      (NestJS API)      | ---> |      (BullMQ & Caching)      |  |
|  |      Port: 3000        |      |      Port: 4000        |      |      Port: 6379 (Internal)   |  |
|  +------------------------+      +-----------+------------+      +------------------------------+  |
|                                              |                                                     |
|                                              | DATABASE_URL                                        |
|                                              | postgresql://dealflow_user:pass@postgres:5432/...  |
|                                              v                                                     |
|                                  +------------------------+                                        |
|                                  |  PostgreSQL Database   |                                        |
|                                  |   (postgres:16-alpine) |                                        |
|                                  +-----------+------------+                                        |
+----------------------------------------------|-----------------------------------------------------+
                                               |
                                               v
                                  +------------------------+
                                  |   NAMED DOCKER VOLUME  |
                                  | (dealflow_postgres_...) |
                                  +------------------------+
```

---

## 📁 Clean Repository Layout

```text
dealflow360/
├── backend/                  # NestJS Modular Monolith API
│   ├── prisma/
│   │   ├── schema.prisma     # Prisma Data Model (22 Entities & 12 Enums)
│   │   └── seed.ts           # Seeder (Users, Catalog, Warehouses, Rules)
│   ├── src/
│   │   ├── app.module.ts     # Core NestJS Root Module
│   │   ├── main.ts           # API Bootstrap (CORS, Pipes, Prefix)
│   │   └── prisma/           # PrismaService & PrismaModule
│   └── package.json
├── frontend/                 # Next.js 15 App Router UI
│   ├── app/                  # Workspace & Customer Portal routes
│   └── package.json
├── docker/                   # PostgreSQL initialization SQL scripts
│   └── postgres/
│       ├── config/           # Custom postgresql.conf (UTC timezone & tuning)
│       └── init/             # 01-init-user-db.sql & 02-extensions.sql
├── scripts/                  # DevOps & Database management utilities
│   ├── backup-db.ps1 / .sh   # Database backup scripts
│   ├── restore-db.ps1 / .sh  # Database restore scripts
│   └── verify-infra.ps1      # Automated infrastructure verification test
├── docker-compose.yml        # Unified Docker Compose architecture
├── .env.example              # Environment variables blueprint
├── .gitignore                # Protects .env, node_modules, and dumps
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start Guide

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Start Infrastructure (PostgreSQL + Redis)
Start the Docker containers in the background:
```bash
docker compose up -d
```

### 3. Run Automated Infrastructure Verification
Verify that PostgreSQL and Redis containers are healthy and reachable:
```powershell
.\scripts\verify-infra.ps1
```

### 4. Setup Backend & Seed Database
Navigate to `backend/` and run migrations & seed data:
```bash
cd backend
npm run prisma:push
npm run prisma:seed
npm run start:dev
```

### 5. Start Frontend & View Website
Access the live Dockerized applications in your browser:
- 🌐 **Frontend Web UI (Docker)**: [http://localhost:3001](http://localhost:3001)
- ⚙️ **Backend API (Docker)**: [http://localhost:4000/api](http://localhost:4000/api)
- 🗄️ **PostgreSQL (Host Access)**: `localhost:5433` (DB: `dealflow_db`, User: `dealflow_user`)
- 🔴 **Redis (Host Access)**: `localhost:6379`

---

## 💾 Database Backup & Restore

- **Local Database Backup**:
  ```powershell
  .\scripts\backup-db.ps1
  ```
- **Restore Database**:
  ```powershell
  .\scripts\restore-db.ps1 -BackupFile .\backups\dealflow_db_dump_TIMESTAMP.sql
  ```

> ⚠️ **CAUTION**: Running `docker compose down -v` removes named volumes and deletes local database records. Standard `docker compose down` retains all database data safely.
