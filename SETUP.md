# Wexa AI — Project Setup & Run Guide

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Neon (Serverless PostgreSQL)
- **ORM:** Prisma
- **Styling:** Tailwind CSS v4
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **AI:** Groq API
- **Payments:** Razorpay
- **Messaging:** Meta WhatsApp Cloud API

---

## Prerequisites

Make sure these are installed on your system:

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher
- A [Neon](https://neon.tech) account (free tier works)

---

## Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd wexa-ai
npm install
```

---

## Step 2 — Environment Variables

`.env` file root mein banao:

```env
# Database (Neon PostgreSQL)
DATABASE_URL='postgresql://<user>:<password>@<host>/neondb?sslmode=require&channel_binding=require'

# Auth
JWT_SECRET="your-super-secret-jwt-key"

# WhatsApp
WEBHOOK_VERIFY_TOKEN="your_webhook_token"
NEXTAUTH_URL="http://localhost:3000"

# AI
GROQ_API_KEY="your-groq-api-key"

# Payments (Razorpay)
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
RAZORPAY_WEBHOOK_SECRET="your-razorpay-webhook-secret"
```

> ⚠️ `.env` file kabhi GitHub pe push mat karo — already `.gitignore` mein hai.

---

## Step 3 — Database Setup

```bash
# Prisma client generate karo
npx prisma generate

# Schema database mein push karo (pehli baar)
npx prisma db push
```

---

## Step 4 — Run Development Server

```bash
npm run dev
```

Browser mein open karo: [http://localhost:3000](http://localhost:3000)

---

## Step 5 — Build for Production

```bash
npm run build
npm run start
```

---

## Useful Prisma Commands

| Command | Kaam |
|---|---|
| `npx prisma generate` | Prisma client regenerate karo |
| `npx prisma db push` | Schema DB mein push karo |
| `npx prisma studio` | DB GUI browser mein open karo |
| `npx prisma migrate deploy` | Migrations deploy karo |

---

## Project Structure

```
wexa-ai/
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── dashboard/       # Dashboard pages
│   │   ├── login/           # Login page
│   │   └── signup/          # Signup page
│   ├── components/          # Reusable components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Prisma, auth, helpers
│   └── types/               # TypeScript types
├── .env                     # Environment variables (secret)
└── package.json
```

---

## Common Issues

**`prisma generate` error aaye:**
```bash
npm install
npx prisma generate
```

**DB connection fail ho:**
- `.env` mein `DATABASE_URL` check karo
- Neon dashboard pe DB active hai ya nahi check karo

**Port already in use:**
```bash
# Different port pe run karo
npm run dev -- -p 3001
```
