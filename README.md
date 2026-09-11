# DealFlow360 — Sales Operations Platform

> **An Intelligent, Self-Governing Sales Operations Platform**

DealFlow360 is a B2B Sales Operations Platform that manages the complete deal lifecycle from **quotation creation to payment and deal monitoring**.

It automates discount governance, risk evaluation, approval routing, customer negotiation, upsell/cross-sell recommendations, multi-warehouse fulfillment, hybrid billing, payment tracking, and sales reporting.

---

## ✨ Key Features

- 🔐 JWT Authentication with Refresh Tokens
- 👥 Role-Based Access Control (RBAC)
- 📋 Quotation & Deal Management
- 💰 Multi-Tier Discount Governance
- 🧠 Blended Deal Risk Evaluation
- ✅ Automated Approval Routing
- 🤝 Customer Quotation Negotiation
- 📈 Upsell & Cross-Sell Recommendations
- 🏭 Multi-Warehouse Fulfillment
- 💳 One-Time & Recurring Billing
- 🔄 Payment Status & Retry Handling
- ❤️ Deal Health Monitoring
- 📊 Sales & Operational Dashboards
- ⚡ Realtime Updates with Socket.IO
- 🔴 Redis Caching & Background Jobs
- 📦 BullMQ Job Processing
- 🐳 Dockerized Infrastructure
- 💾 Database Backup & Restore

---

## 🛠 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Backend | NestJS, Node.js, TypeScript |
| Architecture | Modular Monolith |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache | Redis 7.2 |
| Queue | BullMQ |
| Authentication | JWT + Refresh Tokens |
| Authorization | RBAC |
| Realtime | Socket.IO |
| Infrastructure | Docker + Docker Compose |

---

# 🏗 System Architecture

```text
                         DEALFLOW360
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
       ┌──────────────┐                ┌──────────────┐
       │   FRONTEND   │                │   BACKEND    │
       │              │   HTTP/API     │              │
       │   Next.js    │ ─────────────► │   NestJS     │
       │   React      │                │   Node.js     │
       │   Port 3000  │                │   Port 4000  │
       └──────────────┘                └───────┬──────┘
                                               │
                            ┌──────────────────┼──────────────────┐
                            │                  │                  │
                            ▼                  ▼                  ▼
                     ┌────────────┐     ┌────────────┐     ┌────────────┐
                     │ PostgreSQL │     │   Redis    │     │ Socket.IO  │
                     │            │     │            │     │            │
                     │ Prisma ORM │     │ Cache      │     │ Realtime   │
                     │            │     │ BullMQ     │     │ Updates    │
                     └────────────┘     └────────────┘     └────────────┘
```

All services communicate through the Docker network:

```text
dealflow_network
```

---

# 🔄 Complete DealFlow360 Business Flow

```text
LOGIN
  │
  ▼
ROLE IDENTIFICATION
  │
  ▼
CREATE DEAL
  │
  ▼
SELECT CUSTOMER
  │
  ▼
ADD PRODUCTS / SERVICES
  │
  ▼
CREATE QUOTATION
  │
  ▼
DISCOUNT GOVERNANCE
  │
  ▼
RISK EVALUATION
  │
  ▼
APPROVAL WORKFLOW
  │
  ▼
UPSELL / CROSS-SELL
  │
  ▼
SEND QUOTATION TO CUSTOMER
  │
  ▼
CUSTOMER DECISION
  │
  ├──────────────► REJECT
  │                    │
  │                    ▼
  │                 CLOSED
  │
  ├──────────────► COUNTER OFFER
  │                    │
  │                    ▼
  │                RECALCULATE
  │                    │
  │                    ├── Discount
  │                    ├── Margin
  │                    └── Risk
  │                    │
  │                    ▼
  │              APPROVAL CHECK
  │                    │
  │                    └──────────► CUSTOMER
  │
  ▼
ACCEPTED
  │
  ▼
SALES ORDER
  │
  ▼
INVENTORY CHECK
  │
  ├──────────────► STOCK AVAILABLE
  │                    │
  │                    ▼
  │              FULFILLMENT
  │
  └──────────────► STOCK NOT AVAILABLE
                       │
                       ▼
                MULTI-WAREHOUSE SPLIT
                       │
                       ▼
                   FULFILLMENT
                       │
                       ▼
                    BILLING
                       │
              ┌────────┴────────┐
              ▼                 ▼
          ONE-TIME          RECURRING
              │                 │
              ▼                 ▼
           INVOICE         SUBSCRIPTION
              │                 │
              └────────┬────────┘
                       ▼
                    PAYMENT
                       │
                ┌──────┴──────┐
                ▼             ▼
             SUCCESS        FAILED
                │             │
                ▼             ▼
             COMPLETED    RETRY / ALERT
                │
                ▼
         DEAL HEALTH MONITORING
                │
                ▼
         REPORTING DASHBOARD
```

---

# 💰 Discount Governance

Every quotation is evaluated against configured discount rules.

```text
                  QUOTATION
                      │
                      ▼
             REQUESTED DISCOUNT
                      │
                      ▼
             CHECK DISCOUNT RULE
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       WITHIN       MANAGER      HIGH / RISKY
        LIMIT       REQUIRED      DISCOUNT
          │           │           │
          ▼           ▼           ▼
       PROCEED     MANAGER     MANAGER +
                   REVIEW       FINANCE
                                  REVIEW
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
           APPROVED         REJECTED
              │               │
              ▼               ▼
          NEXT STAGE         CLOSED
```

The exact discount thresholds are controlled by business rules.

---

# 🧠 Risk Evaluation

Deal risk is evaluated using multiple commercial factors.

```text
                    DEAL
                     │
                     ▼
              RISK EVALUATION
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
 Customer Risk   Discount Risk  Margin Risk
       │             │             │
       └─────────────┼─────────────┘
                     │
                     ▼
                Payment Risk
                     │
                     ▼
                  Deal Value
                     │
                     ▼
             COMBINED RISK SCORE
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
        LOW        MEDIUM      HIGH
          │          │          │
          ▼          ▼          ▼
       PROCEED     REVIEW     ESCALATE
                     │          │
                     ▼          ▼
                  MANAGER    MANAGER +
                  REVIEW      FINANCE
```

---

# 🤝 Customer Negotiation

Customers can accept, reject, or negotiate a quotation.

```text
                  QUOTATION
                      │
                      ▼
                   CUSTOMER
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
        ACCEPT      REJECT    COUNTER OFFER
          │           │           │
          │           ▼           ▼
          │         CLOSED    UPDATE TERMS
          │                       │
          │                       ▼
          │                RECALCULATE PRICE
          │                       │
          │                       ▼
          │                 RECALCULATE RISK
          │                       │
          │                       ▼
          │                APPROVAL REQUIRED?
          │                       │
          │                  ┌────┴────┐
          │                  │         │
          │                 YES        NO
          │                  │         │
          │                  ▼         │
          │              APPROVAL      │
          │                  │         │
          └──────────────────┴─────────┘
                             │
                             ▼
                        FINAL QUOTE
```

---

# 📈 Upsell & Cross-Sell

DealFlow360 can recommend related products or services based on the current deal.

```text
                 CURRENT DEAL
                      │
                      ▼
             ANALYZE PRODUCTS
                      │
                      ▼
          RECOMMENDATION ENGINE
                      │
                      ▼
           RECOMMENDED PRODUCTS
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
          ACCEPT              SKIP
             │                 │
             ▼                 │
        ADD TO QUOTE           │
             │                 │
             └────────┬────────┘
                      ▼
                  FINAL QUOTE
```

---

# 🏭 Multi-Warehouse Fulfillment

When a single warehouse cannot fulfill the complete order, inventory can be allocated across multiple warehouses.

```text
                    SALES ORDER
                         │
                         ▼
                  REQUIRED QUANTITY
                         │
                         ▼
                CHECK INVENTORY
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
     ENOUGH STOCK                  NOT ENOUGH
     IN ONE WH                     IN ONE WH
          │                             │
          ▼                             ▼
    SINGLE WAREHOUSE             FIND OTHER WHs
          │                             │
          │                             ▼
          │                     SPLIT FULFILLMENT
          │                             │
          │                 ┌───────────┼───────────┐
          │                 ▼           ▼           ▼
          │               WH-A        WH-B        WH-C
          │                60           30          10
          │                 │           │           │
          └─────────────────┴───────────┴───────────┘
                                │
                                ▼
                           FULFILLED
```

### Example

```text
Order Quantity = 100

Warehouse A = 60
Warehouse B = 30
Warehouse C = 10

Total Fulfilled = 100
```

---

# 💳 Hybrid Billing

DealFlow360 supports both one-time and recurring billing.

## One-Time Billing

```text
SALES ORDER
     │
     ▼
GENERATE INVOICE
     │
     ▼
PAYMENT REQUEST
     │
     ▼
PAYMENT SUCCESSFUL?
     │
 ┌───┴────┐
 ▼        ▼
YES       NO
 │        │
 ▼        ▼
PAID    RETRY / ALERT
 │
 ▼
COMPLETED
```

## Recurring Billing

```text
SALES ORDER
     │
     ▼
CREATE SUBSCRIPTION
     │
     ▼
BILLING SCHEDULE
     │
     ▼
GENERATE RECURRING INVOICE
     │
     ▼
PAYMENT
     │
 ┌───┴────┐
 ▼        ▼
SUCCESS  FAILED
 │        │
 ▼        ▼
CONTINUE RETRY / ALERT
 │
 ▼
NEXT BILLING CYCLE
```

---

# ❤️ Deal Health Monitoring

Deal health is monitored using operational and financial indicators.

```text
                    ACTIVE DEAL
                         │
                         ▼
                 DEAL HEALTH ENGINE
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
        Margin        Payment      Fulfillment
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                  Customer Activity
                         │
                         ▼
                    Risk Status
                         │
                         ▼
                    DEAL HEALTH
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
           HEALTHY     WARNING    CRITICAL
              │          │          │
              │          ▼          ▼
              │     NOTIFICATION  ESCALATION
              │
              ▼
           CONTINUE
```

---

# 🔁 Deal State Flow

```text
DRAFT
  │
  ▼
QUOTATION_CREATED
  │
  ▼
PENDING_APPROVAL
  │
  ├──────────────► REJECTED
  │
  ▼
APPROVED
  │
  ▼
SENT_TO_CUSTOMER
  │
  ├──────────────► REJECTED
  │
  ├──────────────► COUNTER_OFFER
  │                     │
  │                     ▼
  │              RECALCULATE
  │                     │
  │                     ▼
  │              PENDING_APPROVAL
  │
  ▼
ACCEPTED
  │
  ▼
SALES_ORDER
  │
  ▼
FULFILLMENT
  │
  ├──────────────► PARTIAL_FULFILLMENT
  │                     │
  │                     ▼
  │                 FULFILLED
  │
  ▼
BILLED
  │
  ▼
PAYMENT_PENDING
  │
  ├──────────────► PAYMENT_FAILED
  │                     │
  │                     ▼
  │                   RETRY
  │
  ▼
PAID
  │
  ▼
COMPLETED
  │
  ▼
DEAL_HEALTH_MONITORING
```

---

# ⚡ Realtime & Background Processing

DealFlow360 uses Redis, BullMQ, and Socket.IO for asynchronous and realtime operations.

```text
                         FRONTEND
                            │
                    HTTP / WebSocket
                            │
                            ▼
                     ┌─────────────┐
                     │  NestJS API │
                     └──────┬──────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          Prisma          Redis        Socket.IO
             │              │              │
             ▼              ▼              ▼
        PostgreSQL        BullMQ       Realtime UI
                            │
                            ▼
                     BACKGROUND JOBS
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Approval        Billing     Notifications
            Jobs           Jobs          Jobs
```

---

# 🔐 Authentication & Authorization

DealFlow360 uses JWT authentication with refresh tokens and role-based authorization.

## Authentication Flow

```text
LOGIN
  │
  ▼
VALIDATE CREDENTIALS
  │
  ▼
ACCESS TOKEN + REFRESH TOKEN
  │
  ▼
AUTHENTICATED REQUEST
  │
  ▼
JWT VALIDATION
  │
  ▼
RBAC CHECK
  │
  ▼
PROTECTED RESOURCE
```

## User Roles

| Role | Responsibility |
|---|---|
| Sales Rep | Create and manage deals and quotations |
| Sales Manager | Review and approve sales deals |
| Finance | Review financial and high-risk deals |
| Admin | Manage system-level operations |
| Customer | View and negotiate quotations |

---

# 📊 Reporting Dashboard

The reporting layer provides visibility into important sales operations.

Key metrics include:

- Revenue
- Deal value
- Conversion rate
- Margin
- Discount utilization
- Pending approvals
- Risk levels
- Fulfillment status
- Payment status
- Deal health

---

# 📁 Repository Structure

```text
dealflow360/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   │
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── workspace/
│   │   └── customer/
│   │
│   └── package.json
│
├── docker/
│   └── postgres/
│       ├── config/
│       │   └── postgresql.conf
│       │
│       └── init/
│           ├── 01-init-user-db.sql
│           └── 02-extensions.sql
│
├── scripts/
│   ├── backup-db.ps1
│   ├── backup-db.sh
│   ├── restore-db.ps1
│   ├── restore-db.sh
│   └── verify-infra.ps1
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# 🗄 Database

DealFlow360 uses:

```text
PostgreSQL 16
        +
Prisma ORM
```

### Database Configuration

```text
Database : dealflow_db
User     : dealflow_user
Host     : localhost
Port     : 5433
```

### Prisma Schema

```text
backend/prisma/schema.prisma
```

### Seed Data

```text
backend/prisma/seed.ts
```

The seed process provides development data such as users, catalog data, warehouses, and business rules.

---

# 🐳 Docker Infrastructure

The project uses Docker Compose for local infrastructure.

### Services

```text
┌────────────────────────────────────┐
│        dealflow_network             │
│                                    │
│  Frontend ───► Backend             │
│                   │                │
│          ┌────────┴────────┐       │
│          ▼                 ▼       │
│     PostgreSQL           Redis     │
│                                    │
└────────────────────────────────────┘
```

### PostgreSQL

```text
Image: postgres:16-alpine
Host Port: 5433
Container Port: 5432
```

### Redis

```text
Redis Version: 7.2
Host Port: 6379
Container Port: 6379
```

---

# ⚙️ Environment Configuration

Create `.env` from `.env.example`.

### Linux / macOS

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables before starting the application.

Example:

```env
DATABASE_URL=postgresql://dealflow_user:password@postgres:5432/dealflow_db

REDIS_URL=redis://redis:6379

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

> Never commit `.env` or production secrets to Git.

---

# 🚀 Quick Start

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Docker
- Docker Compose
- Git

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd dealflow360
```

---

## 2. Configure Environment

```bash
cp .env.example .env
```

Windows:

```powershell
Copy-Item .env.example .env
```

---

## 3. Start PostgreSQL & Redis

```bash
docker compose up -d
```

Check containers:

```bash
docker compose ps
```

---

# 🔍 Infrastructure Verification

Run the infrastructure verification script:

```powershell
.\scripts\verify-infra.ps1
```

The script verifies that PostgreSQL and Redis are running and reachable.

---

# 📦 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Sync the Prisma schema:

```bash
npm run prisma:push
```

Seed the database:

```bash
npm run prisma:seed
```

Start the backend:

```bash
npm run start:dev
```

Backend API:

```text
http://localhost:4000/api
```

---

# 💻 Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

If the Dockerized frontend is configured for port `3001`:

```text
http://localhost:3001
```

---

# 🌐 Application Services

| Service | Address |
|---|---|
| Frontend | `http://localhost:3000` |
| Docker Frontend | `http://localhost:3001` |
| Backend API | `http://localhost:4000/api` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |

---

# 💾 Database Backup & Restore

## Backup — Windows

```powershell
.\scripts\backup-db.ps1
```

## Backup — Linux / macOS

```bash
./scripts/backup-db.sh
```

## Restore — Windows

```powershell
.\scripts\restore-db.ps1 -BackupFile .\backups\dealflow_db_dump_TIMESTAMP.sql
```

## Restore — Linux / macOS

```bash
./scripts/restore-db.sh ./backups/dealflow_db_dump_TIMESTAMP.sql
```

---

# ⚠️ Database Volume Warning

Avoid the following command unless you intentionally want to remove the local PostgreSQL volume:

```bash
docker compose down -v
```

This can delete the stored database data.

For a normal shutdown:

```bash
docker compose down
```

Start the infrastructure again:

```bash
docker compose up -d
```

---

# 🧪 Development Workflow

```text
Pull Latest Code
      │
      ▼
Start Docker Infrastructure
      │
      ▼
Verify PostgreSQL + Redis
      │
      ▼
Install Dependencies
      │
      ▼
Sync Prisma Database
      │
      ▼
Seed Development Data
      │
      ▼
Start Backend
      │
      ▼
Start Frontend
      │
      ▼
Test DealFlow
```

---

# 🔒 Security

- JWT-based authentication
- Refresh-token authentication
- Role-Based Access Control
- Protected backend routes
- Environment-based secrets
- `.env` excluded from source control
- Server-side authorization
- Controlled approval workflows
- Database credentials separated from application source

---

# 🎯 DealFlow360 Flow Summary

```text
QUOTATION
    ↓
DISCOUNT GOVERNANCE
    ↓
RISK EVALUATION
    ↓
APPROVAL
    ↓
UPSELL / CROSS-SELL
    ↓
CUSTOMER NEGOTIATION
    ↓
CUSTOMER ACCEPTANCE
    ↓
SALES ORDER
    ↓
INVENTORY ALLOCATION
    ↓
MULTI-WAREHOUSE FULFILLMENT
    ↓
BILLING
    ↓
PAYMENT
    ↓
DEAL COMPLETION
    ↓
DEAL HEALTH MONITORING
    ↓
REPORTING
```

---

## DealFlow360

> **From quotation to payment — intelligently governed, operationally connected, and continuously monitored.**
