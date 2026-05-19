# Bluetick — WhatsApp Cloud API Platform

A full-stack SaaS platform for WhatsApp Business Cloud API management. Built with **React + Vite** on the frontend and **Express + PostgreSQL** on the backend.

---

## 🏗️ Project Structure

```
├── client/            # React (Vite) frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React context providers
│   │   ├── pages/        # Route-level page components
│   │   └── utils/        # Helper utilities
│   └── .env.example      # Frontend env template
│
├── server/            # Express.js backend API
│   ├── config/           # Database & app configuration
│   ├── middleware/        # Auth, rate-limiting, guards
│   ├── models/           # Sequelize ORM models
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   ├── utils/            # Storage, caching, helpers
│   └── .env.example      # Backend env template
│
├── .gitignore
└── README.md
```

---

## ✨ Features

- **WhatsApp Cloud API Integration** — Send messages, templates, campaigns via Meta's official API
- **Contact Management** — Import, organize, and segment contacts
- **Campaign Engine** — Schedule and broadcast message campaigns
- **Template Manager** — Create and manage WhatsApp message templates
- **Flow Bot Builder** — Visual chatbot flow configurator
- **AI Bot (Gemini)** — AI-powered auto-replies using Google Gemini
- **Meta Ads Manager** — Create and manage Click-to-WhatsApp (CTWA) ad campaigns directly from the dashboard
- **CTWA Analytics** — Track Click-to-WhatsApp ad performance, conversation attribution, and ROI metrics
- **Team Collaboration** — Multi-user access with role-based permissions
- **WA Store** — WhatsApp-based storefront with product catalog & checkout
- **vCard Manager** — Digital business card builder with themed templates
- **NFC Cards** — NFC-enabled digital business cards with order management
- **Addon Marketplace** — Extensible plugin system
- **Admin Dashboard** — User management, analytics, system controls
- **Referral & Partner Program** — Built-in referral tracking and tech partner system
- **Billing & Subscriptions** — Stripe / Razorpay payment integration

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** ≥ 14.x
- **npm** ≥ 9.x

### 1. Clone the repository

```bash
git clone https://github.com/bitslabtech/bluetick.git
cd bluetick
```

### 2. Setup the Backend

```bash
cd server
cp .env.example .env
# Edit .env with your database credentials, API keys, etc.
npm install
npm run dev
```

### 3. Setup the Frontend

```bash
cd client
cp .env.example .env
# Edit .env with your API URL
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` and the backend API at `http://localhost:5000`.

---

## ⚙️ Environment Variables

### Backend (`server/.env`)

| Variable              | Description                            |
| --------------------- | -------------------------------------- |
| `PORT`                | Server port (default: 5000)            |
| `NODE_ENV`            | `development` or `production`          |
| `FRONTEND_URL`        | Frontend origin for CORS               |
| `DB_NAME`             | PostgreSQL database name               |
| `DB_USER`             | PostgreSQL username                    |
| `DB_PASS`             | PostgreSQL password                    |
| `DB_HOST`             | Database host                          |
| `DB_PORT`             | Database port (default: 5432)          |
| `JWT_SECRET`          | Secret key for JWT token signing       |
| `WEBHOOK_VERIFY_TOKEN`| Meta webhook verification token        |
| `FB_CLIENT_ID`        | Facebook App ID                        |
| `FB_CLIENT_SECRET`    | Facebook App Secret                    |
| `GEMINI_API_KEY`      | Google Gemini API key                  |

### Frontend (`client/.env`)

| Variable        | Description              |
| --------------- | ------------------------ |
| `VITE_API_URL`  | Backend API base URL     |

> See `.env.example` files for full templates with instructions.

---

## 🛠️ Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | React 18, Vite, Lucide Icons            |
| Backend    | Express.js, Socket.IO                   |
| Database   | PostgreSQL, Sequelize ORM               |
| Auth       | JWT (jsonwebtoken, bcryptjs)            |
| AI         | Google Gemini (`@google/generative-ai`) |
| Payments   | Stripe, Razorpay                        |
| Storage    | Local / AWS S3 (`@aws-sdk/client-s3`)   |
| Real-time  | Socket.IO                               |

---

## 📜 License

This is proprietary software owned by **Bitslab Technologies**. All rights reserved.
