# Testing Guide

## Test stack

- Vitest for unit, integration, and UI tests
- React Testing Library for component interaction coverage
- Happy DOM for UI test runtime where browser-like DOM behavior is needed
- Playwright for browser smoke automation

## Test locations

- `ecp-platform/tests/unit/` - rules engine unit tests
- `ecp-platform/tests/integration/` - service and API route tests
- `ecp-platform/tests/components/` - configurator UI tests
- `ecp-platform/e2e/` - Playwright browser smoke test

## Run commands

Run from `ecp-platform/`:

```bash
npm run test
npm run test:unit
npm run test:integration
npm run test:ui
npm run test:e2e
```

## What is covered

### Unit

- electric transmission auto-selection
- California diesel restriction behavior
- package revalidation logic

### Integration

- save validation requiring a selected model
- owner-aware service-to-repository handoff
- recent quote retrieval delegation
- protected API route request validation and authenticated success flows
- saved-configuration list/save coverage
- admin access restriction coverage

### UI

- configurator renders correctly
- selecting a model advances the experience
- evaluate API calls are triggered by the UI flow
- unauthenticated save attempts preserve the draft and redirect to login

### E2E

- app loads in a real browser
- user selects Atlas SUV
- user navigates to Review & Save
- unauthenticated user is redirected to login when attempting to save

## Recommended verification sequence

Run from `ecp-platform/`:

1. `npm run test`
2. `npm run lint`
3. `npm run build`
4. `npm run test:e2e`

## Playwright note

The Playwright spec is included and ready to run. On the implementation machine, Chromium download was blocked by local TLS/certificate restrictions, so native Playwright execution may require one of the following:

- successful `npx playwright install chromium`
- a preinstalled compatible browser in your environment
- a CI runner with working outbound certificate trust
