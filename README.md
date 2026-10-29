# Cloth Store Manager — Next.js + Tailwind CSS + shadcn/ui

Modern, responsive inventory, sales, and profit tracking web application for a clothing store. Built as an all-in-one full-stack Next.js app with Tailwind CSS, shadcn/ui aesthetics, and **Neon PostgreSQL**. Ready for single-click deployment to **Vercel**.

---

## Folder Structure

```
cloth-store/
├── src/
│   ├── app/                          # Next.js App Router (Frontend Pages & Backend APIs)
│   │   ├── (auth)/                   # Authentication Pages
│   │   │   └── login/page.tsx        # Login & Initial Admin Setup
│   │   ├── (dashboard)/              # Authenticated App Pages
│   │   │   ├── layout.tsx            # Desktop Sidebar + Mobile Bottom Dock
│   │   │   ├── page.tsx              # Dashboard (Profit Today/Week/Month, Chart, Stock Value)
│   │   │   ├── sell/page.tsx         # Point of Sale Cashier
│   │   │   ├── inventory/page.tsx    # Stock Management & Restocking
│   │   │   ├── sales/page.tsx        # Sales History & CSV Export
│   │   │   ├── reports/page.tsx      # Profit & Sales Analytics
│   │   │   └── settings/page.tsx     # Password Change & Database Backup
│   │   ├── api/                      # Backend Serverless API Routes
│   │   │   ├── products/             # Product endpoints
│   │   │   ├── sales/                # Sales transactions & CSV export
│   │   │   ├── dashboard/            # Dashboard metrics & analytics
│   │   │   ├── reports/              # Custom period & grouping reports
│   │   │   ├── backup/               # Database JSON snapshot backup
│   │   │   └── ...                   # Auth & session endpoints
│   │   ├── globals.css               # Tailwind CSS & Design Tokens
│   │   └── layout.tsx                # Root Layout with Plus Jakarta Sans & JetBrains Mono
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (Button, Card, Input, Badge, Dialog)
│   │   ├── layout/                   # Sidebar, MobileHeader, MobileNav
│   │   ├── dashboard/                # Recharts Sales & Profit chart
│   │   ├── sell/                     # Cashier Sell Modal
│   │   └── stock/                    # Add/Edit Product Modal, Restock Modal
│   └── lib/
│       ├── db.ts                     # Neon PostgreSQL Pool & Table Initialization
│       ├── auth.ts                   # Bcrypt hashing & HTTP-only Cookie Sessions
│       ├── format.ts                 # Currency (৳), Date, Compact Numbers
│       └── utils.ts                  # Classname merger (cn)
├── .env.example                      # Environment variables template
├── package.json
└── README.md
```

---

## Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Neon Database
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Add your Neon connection string to `.env`:
```env
DATABASE_URL=postgresql://neondb_owner:your_password@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=verify-full
```

### 3. (Optional) Migrate Existing SQLite Data
If you have data from your previous SQLite store:
```bash
npm run migrate-to-neon
```

### 4. Start the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. On first visit, you will be prompted to create your admin login.

---

## Deploying to Vercel (1-Click)

1. Push this repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository.
4. In the **Environment Variables** section, add:
   * **Name**: `DATABASE_URL`
   * **Value**: Your Neon PostgreSQL connection string (`postgresql://neondb_owner:...`)
5. Click **Deploy**. Vercel will automatically build and deploy your app.
