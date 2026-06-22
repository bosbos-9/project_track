# Etimad Tender AI Dashboard

A React + Vite dashboard for reviewing Etimad tender opportunities assessed by an AI filtering workflow.

The app connects directly to Supabase, reads opportunities from `matched_opportunities`, and gives a clean Arabic RTL interface for quickly reviewing matched, review, and rejected tender decisions.

## Features

- Arabic RTL dashboard interface
- Supabase client-side data fetching
- KPI cards for total, matched, review, and rejected opportunities
- Search by title, reference number, or government entity
- Decision filter: all useful opportunities, matched, review, rejected
- Service area filter
- Sort by fit score, last seen, or opening date
- Opportunity detail drawer
- Etimad details link
- CSV export for the currently filtered rows
- Dark mode toggle
- Loading, empty, setup, and error states
- Filter persistence with `localStorage`

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Supabase JS client
- Lucide React icons

## Getting Started

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Add your Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Supabase Requirements

The app expects a Supabase table or view named:

```text
matched_opportunities
```

Expected columns:

```text
reference_number
title
government_entity
main_activity
opening_date
details_url
decision
fit_score
confidence
best_service_area
reason_ar
recommended_action
last_seen_at
```

The browser must use a public-safe Supabase key. Do not use a service role key or secret key in `VITE_SUPABASE_ANON_KEY`.

Use one of:

- Supabase anon public key
- Supabase publishable key

## Decision Behavior

By default, the dashboard focuses on useful opportunities:

- `MATCHED`
- `REVIEW`

Rejected opportunities are available only when selecting the rejected decision filter.

## Environment Notes

Vite only reads `.env` files when the dev server starts. If you change `.env`, stop and restart the server:

```bash
npm run dev
```

## Security

This project is frontend-only. Keep these rules:

- Never commit `.env`
- Never expose a Supabase service role key in the browser
- Configure Supabase Row Level Security or safe views before public deployment

## Deployment

This is a static Vite app. It can be deployed to platforms like Vercel, Netlify, Cloudflare Pages, or any static hosting provider.

Set these environment variables in your hosting platform:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
