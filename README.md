# Bybit Quant Dashboard

Track Bybit portfolio, orders, and trading activity at a glance.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Requirements

- Node.js 18+
- Bybit API credentials
- Supabase project

## Tech Stack

- Next.js + TypeScript
- Tailwind CSS
- Recharts
- Bybit V5 API
- Supabase

## Architecture

- **Dashboard:** Vercel (Next.js frontend)
- **Cron Job:** VPS (portfolio snapshot collection)
- **Database:** Supabase (portfolio history & data storage)
