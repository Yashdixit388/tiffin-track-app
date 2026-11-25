# TiffinTrack

TiffinTrack is a Next.js app for tiffin-service owners and customers. The public home page is at `/`, authenticated workspaces are at `/dashboard`, and authentication plus application records are stored in MongoDB Atlas.

## Local setup

1. Create a MongoDB Atlas cluster and database user. Allow your development IP address in Atlas Network Access.
2. Edit the included, git-ignored `.env` file (or copy `.env.example` to `.env`).
3. Set `MONGODB_URI` to your Atlas connection string. URL-encode special characters in the database username or password.
4. Set a unique `BETTER_AUTH_SECRET` with at least 32 random characters.
5. Configure SMTP using `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. These settings deliver the six-digit email verification codes; the code expires after five minutes and has a limited number of verification attempts.
6. Install dependencies and start the app:

   ```sh
   pnpm install
   pnpm dev
   ```

`MONGODB_DB` defaults to `tiffintrack`. Atlas must support replica-set transactions for Better Auth's MongoDB adapter. Never commit `.env` or share its secrets.

## Accounts and workflows

- Choose **Tiffin owner** during sign-up to create a business and get its customer invite code.
- Choose **Customer** and enter the invite code to connect a customer account to a service. Owners can also create customer contact profiles before customers sign up.
- Owners can manage meal plans, publish dated menus, approve subscriptions, generate daily orders, mark deliveries, create monthly bills, record payments, and view reports.
- Customers can browse active plans and menus, request or manage subscriptions, skip eligible meals, view deliveries and bills, and maintain a delivery profile.
- Same-day meal skips use the business cutoff and the `Asia/Kolkata` timezone. Per-meal bills use delivered orders; monthly bills are prorated for the active portion of the billing month and subtract eligible skip deductions.
- Invoices open a print-friendly view that can be printed or saved as PDF by the browser.

The app uses Next.js route handlers for its REST-style backend rather than a separate Express server. Menu photos currently use image URLs; payment collection is recorded manually, not through an online payment gateway.

## Data collections

Better Auth stores users, sessions, accounts, and verification records in MongoDB. TiffinTrack stores businesses, customer profiles, plans, menus, subscriptions, skips, orders, bills, and payments in the same database. All business records are scoped to an owner; customer queries are scoped to the signed-in customer.

Existing PostgreSQL authentication accounts are not automatically copied to Atlas. If this app already has production users, migrate their records before switching deployments; otherwise, users will need to register again.
