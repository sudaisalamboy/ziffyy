# 🛒 FreshKart — Grocery Delivery Platform

A full-stack grocery delivery web application built with **Next.js 16**, **TypeScript**, **Prisma ORM**, **Tailwind CSS 4**, and **shadcn/ui**. FreshKart connects customers with local shop owners and delivery personnel through a seamless, real-time experience.

> **Note:** This is a development/prototype project using SQLite. For production deployment, migrate to PostgreSQL and Redis (see schema.prisma and rate-limit.ts for details).

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 👤 Multi-Role System
- **Admin** — User management, shop approvals, platform analytics, system settings
- **Customer** — Browse products, place orders, track deliveries, wallet management
- **Shop Owner** — Manage shop, add/edit products, view and fulfill orders
- **Delivery Boy** — Accept delivery requests, track earnings, update delivery status

### 🔐 Security
- JWT-based authentication with token blacklisting
- Per-user and per-IP sliding-window rate limiting
- CORS protection with defense-in-depth (middleware + server config)
- Security headers (HSTS, CSP, X-Frame-Options, COOP, CORP, and more)
- HTML sanitization against XSS attacks
- Role-based access control on all API endpoints
- Input sanitization on all user-supplied data

### 💬 Real-Time Chat
- Socket.IO-powered chat service (independent microservice)
- Direct messaging between any two users
- Online status indicators

### 🛍️ Core Functionality
- Product catalog with categories, search, and filters
- Shopping cart with quantity management
- Order placement with address selection
- Delivery tracking with live status updates
- Digital wallet with top-up and transaction history
- Custom needs/requests (customers can request items not in catalog)
- Shop owner applications and admin approval workflow
- Notification system for all users
- Profile management with address book

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | SQLite via Prisma ORM |
| **Auth** | JWT (jose) + bcryptjs |
| **State** | Zustand (client) + TanStack Query (server) |
| **Real-time** | Socket.IO (chat microservice) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+

### Installation

```bash
# Clone the repository
git clone https://github.com/sudaisalamboy/ziffyy.git
cd ziffyy

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env and set your JWT_SECRET

# Initialize the database
bun run db:push
bun run db:generate

# (Optional) Seed with demo data
bun run prisma/seed.ts

# Start the development server
bun run dev
```

The application will be available at `http://localhost:3000`.

### Demo Credentials

After seeding, you can log in with these accounts (password: `password123`):

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

## 📁 Project Structure

```
freshkart/
├── prisma/
│   ├── schema.prisma        # Database schema (22 tables)
│   └── seed.ts              # Demo data seeder
├── src/
│   ├── app/
│   │   ├── api/             # REST API endpoints
│   │   │   ├── admin/       # Admin management APIs
│   │   │   ├── auth/        # Login, signup, verify
│   │   │   ├── addresses/   # Address CRUD
│   │   │   ├── cart/        # Shopping cart
│   │   │   ├── chat/        # Chat messages
│   │   │   ├── delivery/    # Delivery operations
│   │   │   ├── needs/       # Custom needs/requests
│   │   │   ├── notifications/ # User notifications
│   │   │   ├── orders/      # Order management
│   │   │   ├── products/    # Product catalog
│   │   │   ├── profile/     # User profiles
│   │   │   ├── settings/    # Platform settings
│   │   │   ├── shop/        # Shop management
│   │   │   └── wallet/      # Wallet operations
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main page
│   ├── components/
│   │   ├── dashboards/      # Role-specific dashboards
│   │   ├── chat/            # Chat panel component
│   │   ├── auth-page.tsx    # Login/Signup UI
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── api.ts           # API client helper
│   │   ├── auth-helper.ts   # Auth & rate-limit utilities
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── jwt.ts           # JWT sign/verify/blacklist
│   │   ├── rate-limit.ts    # Sliding-window rate limiter
│   │   ├── sanitize.ts      # XSS sanitization
│   │   └── utils.ts         # General utilities
│   ├── middleware.ts         # CORS & security headers
│   └── store/
│       └── auth.ts           # Zustand auth store
├── mini-services/
│   └── chat-service/        # Socket.IO chat microservice
├── public/
│   ├── logo.svg             # FreshKart logo
│   └── robots.txt           # Search engine directives
├── .env.example             # Environment variables template
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies & scripts
```

---

## 🔌 API Overview

All API endpoints are under `/api/` and require JWT authentication (except `/api/auth/*`).

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/signup` | POST | Register a new user |
| `/api/auth/login` | POST | Login and receive JWT |
| `/api/auth/verify` | POST | Verify current token |
| `/api/auth/logout` | POST | Invalidate token (server-side blacklist) |
| `/api/products` | GET, POST | List/create products |
| `/api/shop` | GET, POST | Get/create shop |
| `/api/orders` | GET, POST | List/create orders |
| `/api/cart` | GET, POST, PUT, DELETE | Cart management |
| `/api/delivery` | GET, POST | Delivery operations |
| `/api/wallet` | GET, POST | Wallet & transactions |
| `/api/needs` | GET, POST | Custom needs/requests |
| `/api/chat` | GET, POST | Chat messages |
| `/api/addresses` | GET, POST | User addresses |
| `/api/upload` | POST | Image upload (WebP, max 5 MB) |
| `/api/notifications` | GET, POST | Notifications with cursor pagination |
| `/api/profile` | GET, PUT | User profile |
| `/api/settings` | GET, PUT | Platform settings |
| `/api/admin` | GET | Admin: list users |
| `/api/admin/[id]` | PUT, DELETE | Admin: manage users |

---

## 🗄️ Database Schema

The application uses **22 tables** including:

- **User** — Core user table with role-based access (admin, customer, shop_owner, delivery_boy)
- **Shop / ShopOwner / Product** — Shop and product management
- **Order / OrderItem / OrderStatusLog** — Complete order lifecycle
- **Cart / CartItem** — Shopping cart
- **DeliveryAssignment / DeliveryHistory** — Delivery tracking
- **Wallet / WalletTransaction / Withdrawal / Payment** — Financial operations
- **Need / NeedComment / Offer** — Custom request marketplace
- **Notification** — User notifications
- **UserAddress** — Address book
- **RatingsReview** — Product ratings
- **Settings** — Platform configuration
- **AdminActivityLog** — Audit trail

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server on port 3000 |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema changes to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset database |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ using Next.js, TypeScript & Tailwind CSS
</p>