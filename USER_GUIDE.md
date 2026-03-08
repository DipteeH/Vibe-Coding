# User Guide

## Purpose

The Enterprise Car Configuration Platform supports enterprise quote and order workflows with live rules, pricing, compliance checks, and manufacturing guidance.

## Start a configuration

1. Open the application home page
2. Choose the commercial context:
   - market
   - dealer channel
   - lifecycle path (`QUOTE` or `ORDER`)
3. Move through the nine configuration steps

## The nine steps

1. Select Model
2. Select Engine
3. Select Transmission
4. Select Trim
5. Select Exterior
6. Select Interior
7. Select Wheels
8. Add Packages
9. Review & Save

## What the platform does while you configure

- Re-evaluates availability after every meaningful change
- Applies compatibility and exclusion rules automatically
- Updates total price and pricing line items
- Calculates operational summary details such as compliance, manufacturing status, lead time, and plant allocation
- Surfaces notifications and audit notes for rule-driven corrections

## Example rules you will observe

- Electric powertrains auto-correct transmission to automatic
- Diesel can become unavailable for California or restricted dealer contexts
- Electric Atlas SUV excludes the Tow Package
- Executive Package requires Premium or Luxury-compatible builds
- Winter Package conflicts with 21 inch performance wheels
- Certain Nova Coupe combinations are automatically corrected for feasibility

## Review and save

At the final step you can:

- enter the customer or account name
- enter the notification email that should receive save/update confirmations
- keep the lifecycle as a quote
- switch the lifecycle to an order path
- save the configuration

## Authentication and save continuation

- You can browse and configure vehicles without signing in
- Saving requires authentication
- If you click **Save quote** while signed out, the platform preserves your draft and redirects you to the login experience
- After signing in, the platform returns you to the configurator so you can continue saving the same draft

The login experience supports:

- email/password registration and sign-in
- Google sign-in when enabled by your environment
- phone verification sign-in

Successful saves show a confirmation banner, place the latest entry in the Recent quotes panel, and create a record in your saved workspace.

## Saved configurations workspace

Open **Saved configurations** from the authenticated navigation to:

- review your saved quotes and orders
- open a saved configuration detail page
- continue editing in the configurator
- update customer metadata or notification email
- delete a saved configuration you own

Administrators can open the same detail pages in preview mode for oversight.

## Sidebar panels

The right-hand sidebar provides:

- Pricing overview
- Operational summary
- Notifications and audit
- Recent quotes

## Resetting the flow

Use **Start a new configuration** on the review step to clear the current working selection and begin again.

## Admin workspace

Users marked as administrators can open `/admin` to review:

- user accounts and provider adoption
- active session counts
- saved configuration volume across the workspace
- all saved configurations with quick links into detail pages
