# Architecture Overview

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- Prisma + SQLite
- Custom cookie/session authentication with Google OAuth, phone verification, and email/password login
- Nodemailer-based confirmation email delivery
- Zod validation
- Vitest + Playwright

## High-level design

The application uses a layered architecture so business logic stays separate from UI and persistence concerns.

## Layers

### 1. Domain layer

Location: `ecp-platform/src/domain/ecp/`

Responsibilities:

- catalog definitions for markets, dealers, models, trims, engines, packages, and options
- core types
- rules engine evaluation
- pricing, incentives, compliance, and manufacturing feasibility logic

Primary files:

- `catalog.ts`
- `types.ts`
- `evaluator.ts`

### 2. Application layer

Location: `ecp-platform/src/application/ecp/`

Responsibilities:

- orchestration of bootstrap, evaluation, and save use cases
- Zod request validation schemas
- repository interface definition

Primary file:

- `platform-service.ts`

### 3. Infrastructure layer

Location: `ecp-platform/src/infrastructure/`

Responsibilities:

- Prisma client initialization
- persistent storage implementation for saved quotes/configurations
- JSON fallback repository when Prisma is unavailable

Auth-related infrastructure also relies on Prisma-backed models for users, linked auth providers, phone verification codes, and active sessions.

Primary files:

- `db/prisma.ts`
- `repositories/saved-quote-repository.ts`

### 4. Presentation / delivery layer

Location: `ecp-platform/src/app/` and `ecp-platform/src/components/`

Responsibilities:

- App Router pages and route handlers
- multi-step configurator UI
- user interaction, fetch calls, auth redirects, review/save experience
- saved-configuration management workspace and admin pages

Primary files:

- `app/page.tsx`
- `app/api/bootstrap/route.ts`
- `app/api/evaluate/route.ts`
- `app/api/quotes/route.ts`
- `app/api/saved-configurations/route.ts`
- `app/api/auth/*`
- `app/admin/page.tsx`
- `components/ecp/configurator-client.tsx`

## Request flow

1. Home page loads bootstrap data from the application layer
2. User selections trigger `/api/evaluate`
3. Application layer calls the domain evaluator
4. Evaluated configuration updates UI pricing, availability, and operational summary
5. If a signed-out user attempts to save, the client preserves a local draft and redirects to `/login?returnTo=...`
6. After authentication, the client resumes the save flow and posts to `/api/saved-configurations`
7. Repository persists configuration data to SQLite through Prisma or falls back to JSON where supported
8. Authenticated users manage their saved configurations from `/saved-configurations`, while admins access cross-user oversight at `/admin`

## Persistence model

`SavedQuote` records store:

- owner linkage
- customer name
- notification email
- market and dealer context
- selected model
- quote or order path
- currency and total price
- compliance and manufacturing state
- serialized configuration and evaluation payloads

Additional Prisma models support authentication and authorization:

- `User`
- `AuthAccount`
- `UserSession`
- `PhoneVerification`

## Important business rules implemented

- market and dealer-aware engine availability
- electric transmission correction to automatic
- package dependency and exclusion enforcement
- trim/package compatibility checks
- pricing adjustments, EV incentives, and dealer markup logic
- feasibility corrections for invalid manufacturing combinations

## API surface

- `GET /api/bootstrap` - bootstrap data for markets, dealers, models, defaults, and step labels
- `POST /api/evaluate` - validates and evaluates a configuration payload
- `GET /api/quotes` - lists recent saved quotes/orders
- `POST /api/quotes` - authenticated quote persistence endpoint kept for compatibility
- `POST /api/auth/login` - email/password sign-in
- `POST /api/auth/register` - email/password registration
- `GET /api/auth/google` and callback route - Google OAuth flow
- `POST /api/auth/phone/start` and `POST /api/auth/phone/verify` - phone verification login
- `GET /api/saved-configurations` - owner-scoped saved configuration listing
- `POST /api/saved-configurations` - owner-scoped creation endpoint used by the configurator
- `GET/PUT/DELETE /api/saved-configurations/[id]` - saved configuration detail, update, and delete
- `GET /api/admin/users` - admin-only user overview
- `GET /api/admin/configurations` - admin-only saved configuration overview
