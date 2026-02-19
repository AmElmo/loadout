# Acme App

A multi-tenant SaaS platform for project management, built with Next.js 14 and Supabase.

## Architecture

- **Frontend**: Next.js 14 with App Router, React Server Components
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **Auth**: Supabase Auth — magic links + Google OAuth
- **Payments**: Stripe subscriptions with webhook handlers
- **Email**: Resend for transactional emails
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State**: Zustand for client state, React Query for server data

## Project Structure

```
app/                   # Next.js App Router pages
  (auth)/              # Auth routes (login, signup, callback)
  (dashboard)/         # Authenticated dashboard routes
  api/                 # API route handlers
components/            # Shared React components
  ui/                  # shadcn/ui primitives
lib/                   # Shared utilities
  supabase.ts          # Supabase client singleton
  stripe.ts            # Stripe client and helpers
hooks/                 # Custom React hooks
types/                 # TypeScript interfaces
```

## Conventions

- Use server components by default — add `"use client"` only when needed
- API routes go in `app/api/` with proper HTTP method handlers
- Database queries use the Supabase client from `lib/supabase.ts`
- Environment variables: `NEXT_PUBLIC_` prefix for client-side, plain for server-only
- All prices stored in cents (integer) — convert for display only
- Multi-tenancy via `org_id` column on all tenant-scoped tables

## Important

- Never bypass Row-Level Security — always use the authenticated Supabase client
- Stripe webhook handler must verify signatures before processing events
- All database mutations must go through API routes — no direct Supabase calls from client components
