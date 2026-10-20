# FreshKart (ziffyy) — Setup Guide

A full-stack grocery delivery web application built with Next.js 16, TypeScript, Prisma ORM, Tailwind CSS 4, and shadcn/ui. FreshKart connects customers with local shop owners and delivery personnel through a seamless, real-time experience with multi-role support (Admin, Customer, Shop Owner, Delivery Boy), JWT auth, wallet, and a Socket.IO chat microservice.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Chat Microservice](#chat-microservice)
- [Build for Production](#build-for-production)
- [Deployment Options](#deployment-options)
- [Project Structure](#project-structure)
- [Demo Credentials](#demo-credentials)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

FreshKart is a multi-role grocery delivery platform with four user types:

- **Admin** — user management, shop approvals, platform analytics, system settings.
- **Customer** — browse products, place orders, track deliveries, wallet management.
- **Shop Owner** — manage shop, add/edit products, view and fulfill orders.
- **Delivery Boy** — accept delivery requests, track earnings, update delivery status.

Core features include a product catalog with search & filters, shopping cart, order tracking with live status updates, digital wallet with top-up & transaction history, custom needs/requests marketplace, shop-owner approval workflow, real-time Socket.IO chat, and a notification system. Security is built in with JWT auth + token blacklisting, per-user/IP rate limiting, CORS defense-in-depth, security headers, HTML sanitization, and role-based access control.

> **Note:** This is a development/prototype project using SQLite. For production, migrate to PostgreSQL and Redis.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Bun** | 1.3+ | Recommended runtime & package manager |
| **Node.js** | 18+ | Alternative if Bun is unavailable |
| **SQLite** | bundled | Default dev database |
| **Git** | 2.20+ | Cloning the repository |

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
bun --version
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/sudaisalamboy/ziffyy.git
cd ziffyy
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` (see [Environment Variables](#environment-variables) below).

### 4. Initialize the database

```bash
bun run db:generate   # generate Prisma client
bun run db:push       # create / sync the 22-table schema
```

### 5. (Optional) Seed demo data

```bash
bun run prisma/seed.ts
```

This populates the database with demo users (admin, customers, shop owners, delivery boys), shops, products, and sample orders. See [Demo Credentials](#demo-credentials) below.

---

## Environment Variables

```env
# Required — JWT signing secret
JWT_SECRET=your-secret-key-here

# Database (defaults to SQLite)
DATABASE_URL=file:./db/custom.db
```

Generate a strong JWT secret:

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

> **Production:** Use PostgreSQL by changing the Prisma provider. Set a strong `JWT_SECRET`. Consider Redis for the rate limiter in multi-instance deployments.

---

## Running Locally

Start the development server:

```bash
bun run dev
```

The app is available at **http://localhost:3000**.

For the real-time chat feature, also start the chat microservice:

```bash
cd mini-services/chat-service
bun install
bun run index.ts   # starts the Socket.IO server
```

Other scripts:

```bash
bun run lint         # ESLint
bun run db:push      # re-sync schema after editing prisma/schema.prisma
bun run db:generate  # regenerate Prisma client
bun run db:migrate   # create a versioned migration
bun run db:reset     # drop & recreate the database (destructive)
```

---

## Chat Microservice

The real-time chat runs as a separate Socket.IO microservice at `mini-services/chat-service/`. It handles:

- Direct messaging between any two users
- Online status indicators
- Message persistence via the same database

Start it independently:

```bash
cd mini-services/chat-service
bun install && bun run index.ts
```

The main Next.js app connects to it as a client via `socket.io-client`.

---

## Build for Production

The app uses Next.js **standalone output**:

```bash
bun run build   # builds + copies .next/static and public/ into standalone dir
bun run start   # runs the standalone server
```

Production server: `.next/standalone/server.js` on `PORT` (default `3000`).

---

## Deployment Options

### Option A — Self-hosted VM (recommended)

```bash
bun install
bun run db:generate
bun run db:push
bun run build
bun run start &

# Chat microservice
cd mini-services/chat-service && bun install && bun run index.ts &
```

### Option B — Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    volumes: ["./db:/app/db"]
  chat:
    build: ./mini-services/chat-service
    env_file: .env
    ports: ["3001:3001"]
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: freshkart
      POSTGRES_PASSWORD: secret
    ports: ["5432:5432"]
```

### Option C — Vercel (with caveats)

The main Next.js app deploys to Vercel, but:
- SQLite must be replaced with PostgreSQL (change provider in `prisma/schema.prisma`).
- The in-memory rate limiter becomes probabilistic on serverless (use Upstash Redis).
- The chat microservice must be hosted separately (Railway / Fly.io / Render).

### Option D — PostgreSQL (production database)

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then:

```bash
bun run db:generate
bun run db:migrate
```

---

## Project Structure

```
ziffyy/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/        # admin user management
│   │   │   ├── auth/         # signup, login, verify, logout
│   │   │   ├── addresses/    # address CRUD
│   │   │   ├── cart/         # shopping cart
│   │   │   ├── chat/         # chat messages (REST)
│   │   │   ├── delivery/     # delivery operations
│   │   │   ├── needs/        # custom needs/requests
│   │   │   ├── notifications/ # cursor-paginated notifications
│   │   │   ├── orders/       # order management
│   │   │   ├── products/     # product catalog
│   │   │   ├── profile/      # user profiles
│   │   │   ├── settings/     # platform settings
│   │   │   ├── shop/        # shop management
│   │   │   └── wallet/       # wallet & transactions
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── chat/             # chat panel
│   │   ├── auth-page.tsx     # login/signup UI
│   │   └── ui/               # shadcn/ui library
│   ├── lib/
│   │   ├── api.ts            # API client helper
│   │   ├── auth-helper.ts   # auth & rate-limit utilities
│   │   ├── db.ts             # Prisma client singleton
│   │   ├── jwt.ts            # JWT sign/verify/blacklist
│   │   ├── rate-limit.ts    # sliding-window rate limiter
│   │   ├── sanitize.ts      # XSS sanitization
│   │   └── utils.ts
│   ├── middleware.ts         # CORS & security headers
│   └── store/auth.ts         # Zustand auth store
├── mini-services/chat-service/  # Socket.IO chat microservice
├── prisma/
│   ├── schema.prisma         # 22 tables
│   └── seed.ts              # demo data seeder
├── public/logo.svg
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Demo Credentials

After seeding (`bun run prisma/seed.ts`), log in with these accounts (password: `password123`):

| Role | Email |
|------|-------|
| Admin | admin@freshkart.com |
| Customer | rahul@mail.com |
| Customer | priya@mail.com |
| Shop Owner | ramesh@shop.com |
| Shop Owner | meena@shop.com |
| Delivery Boy | suresh@delivery.com |
| Delivery Boy | arjun@delivery.com |

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `JWT_SECRET` error | Missing or empty | Set `JWT_SECRET` in `.env` (use `openssl rand -hex 32`) |
| `prisma: command not found` | Prisma CLI not installed | `bun add -d prisma` |
| Chat not working | Chat microservice not running | Start `mini-services/chat-service` |
| `Database is locked` | Concurrent SQLite writes | Switch to PostgreSQL for production |
| Login returns 429 | Rate limited (per-user/IP) | Wait 60 seconds; the sliding-window limiter resets |
| 401 on all API calls | JWT expired or blacklisted | Re-login; check token blacklist table |
| Upload fails | File too large / wrong type | Use WebP, max 5 MB |
| Seed fails | Schema out of sync | `bun run db:push` then re-run seed |
| Shop approval stuck | Admin hasn't approved | Log in as admin and approve the shop application |
| Order status not updating | Delivery boy hasn't accepted | Check delivery assignments in the DB |
| `EADDRINUSE :3000` | Port already in use | `PORT=3001 bun run dev` |
| CORS error in browser | Origin not allowed | Check `middleware.ts` CORS allowlist |

---

Made by **Sudais Alam** · [GitHub @sudaisalamboy](https://github.com/sudaisalamboy)
