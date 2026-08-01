# GrocerApp

A modern grocery management web application built with Next.js, TypeScript, and shadcn/ui.

## Project Idea

GrocerApp is a comprehensive grocery management platform designed to help users manage their grocery shopping experience efficiently. The application provides features for product management, inventory tracking, and seamless user experience.

## Key Features

### Needs Feature (Customer Requests)
Customers can create custom needs/requests for items they want delivered:

- **Create Custom Needs**: Customers can specify what they need with title and detailed description
- **Flexible Pricing Options**:
  - Unknown Price: When customer doesn't know the cost
  - Exact Amount: Specify exact price willing to pay
  - Price Range: Set minimum and maximum price limits
- **Urgency Levels**: Choose delivery urgency (1 hour to 1-2 days)
- **Image Upload**: Attach reference images (JPG, PNG, GIF up to 5MB)
- **Delivery Boy Notifications**: Automatically notifies all approved delivery boys when a new need is created
- **Secure Access**: Only logged-in customers can create needs
- **Status Tracking**: Needs are created with 'active' status for delivery boys to view

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: Zustand, React Query
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Testing**: Playwright

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Bun or npm/yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd grocerapp-full-backup
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your database credentials and other configuration.

4. Set up the database:
```bash
bun run db:generate
bun run db:push
```

5. Run the development server:
```bash
bun run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run db:push` - Push database schema
- `bun run db:generate` - Generate Prisma client
- `bun run db:migrate` - Run database migrations
- `bun run db:reset` - Reset database

## Project Status

**IMPORTANT**: This project is currently under development and testing. Security implementation has been completed, but API functionality testing is ongoing. Some features may not be fully operational.

Please refer to `IMPORTANT NOTE.MD` for more details about the current project status.

## License

See LICENSE file for details.

## Disclaimer

This project is provided as-is for educational and development purposes. The developers are not responsible for any data leaks, security breaches, or loss of data that may occur from using this application. Users are responsible for implementing proper security measures and protecting their own data.
