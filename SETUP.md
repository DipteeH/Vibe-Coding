# Setup Guide

## Prerequisites

- Node.js 20 LTS (`20.19+` preferred)
- npm 10+
- No external database is required

## 1. Enter the application directory

From the repository root:

```bash
cd ecp-platform
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env
```

The example env file includes the local defaults and optional integrations used by the auth-enabled application:

- `DATABASE_URL` - SQLite database used by Prisma
- `AUTH_BASE_URL` - absolute base URL for auth redirects and email links
- `AUTH_ADMIN_EMAILS` / `AUTH_ADMIN_PHONES` - comma-separated allowlist for admin access
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` - optional Google OAuth
- `EMAIL_FROM` and `EMAIL_SERVER_*` - optional SMTP delivery for save/update confirmations
- `PHONE_AUTH_DEV_MODE` - local phone-login mode; keep `true` for development
- `PHONE_AUTH_WEBHOOK_URL` / `PHONE_AUTH_WEBHOOK_TOKEN` - optional external SMS delivery integration

### Minimum local auth setup

For a smooth local experience, update at least these values in `.env`:

- set `AUTH_BASE_URL="http://127.0.0.1:3000"` if you use the default port
- set `AUTH_ADMIN_EMAILS` to your local sign-in email if you want admin access
- keep `PHONE_AUTH_DEV_MODE="true"` unless you have a real phone-delivery webhook

### Notes on optional providers

- Email/password auth works locally with no extra provider configuration
- Google sign-in only appears when all Google env vars are populated
- If SMTP settings are omitted, confirmation emails use Nodemailer JSON transport for safe local development

## 4. Initialize the local database

```bash
npm run db:push
```

This creates or updates the SQLite database used by Prisma.

## 5. Start the development server

```bash
npm run dev
```

Open `http://127.0.0.1:3000` in your browser.

## 6. Create a local account and verify auth

After the server starts:

1. Open `http://127.0.0.1:3000`
2. Try saving a configuration while signed out; you should be redirected to `/login`
3. Register with email/password or use phone sign-in
4. After sign-in, you should return to the save flow and be able to finish saving
5. Open `/saved-configurations` to manage your saved quotes/orders
6. If your account matches `AUTH_ADMIN_EMAILS` or `AUTH_ADMIN_PHONES`, open `/admin`

## 7. Optional verification commands

```bash
npm run lint
npm run test
npm run build
```

## 8. Production-style local run

```bash
npm run build
npm run start
```

## Troubleshooting

### Prisma is unavailable or the database fails

The application includes a safe local fallback repository for saved-configuration records. If Prisma cannot be used, configuration persistence falls back to:

- `ecp-platform/data/saved-quotes.json`

Authentication does **not** fall back to JSON. If auth pages show database-related errors, rerun `npm run db:push` and restart the app.

### Reset local saved data

You can reset local quote history by deleting one or both of the following files if they exist:

- `ecp-platform/prisma/dev.db`
- `ecp-platform/data/saved-quotes.json`

Then re-run:

```bash
npm run db:push
```

### Playwright browser install fails

If your environment has TLS or certificate restrictions, browser binary download may fail. In that case:

- use `npm run test` for unit/integration/UI validation
- run the app locally with `npm run dev`
- install Playwright browsers later in a network-permitted environment
