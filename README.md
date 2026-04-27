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

<!-- ## Caveats

A developer's diary on the evolution of this project:

1. I wanted to host everything on Vercel and query Bybit API directly as a serverless data source.
2. Bybit doesn't provide portfolio history queries, so I needed a database. Decided on Supabase.
3. Started using GitHub Actions for cron jobs (to update portfolio snapshots), but Bybit banned GitHub's IP ranges.
4. Rented a cheap $5 VPS to run Linux cron jobs instead.
5. A $5 VPS isn't ideal for running WebSocket servers + REST API simultaneously. Chose simplicity: page auto-refresh every 10 minutes instead.
6. Data is not real-time, but the architecture is reliable, maintainable, and costs effective. -->