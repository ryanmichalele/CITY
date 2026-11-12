# CITI BANK — Sanity Studio

Hosted Studio: **https://citi-ca-bank.sanity.studio/**

- Project ID: `mc5ry4cs`
- Dataset: `production` (private)
- API version used by the site: `2025-01-01`

## Content model

| Studio section | What it controls |
|---|---|
| Applications | One document per submitted application. Tabs: Application, Login & security, Dashboard content, Submission meta. |
| Accounts | Account numbers, balances, status, owner reference. |
| Logins | Login ID → application mapping. |
| Dashboard defaults | Shared dashboard content used for every user without an override. |
| Site settings | Brand, navigation, footer, contact page. |
| Products / Services / Quick actions | Catalog documents with ordering. |
| Account types / Agreements | Labels and legal copy. |
| Transactions / Payments / Activity | Per-account records. |
| Audit log | Security events written by the API. |

## Per-user dashboard

Each `application` document has its own **Dashboard content** tab with every
dashboard field: hero labels, stat cards, detail rows, quick actions, services,
products, notices, activity, transactions, payments, notifications, security,
support, empty states, and the credentials panel.

The site resolves content in this order:

```
application.dashboard  →  dashboardDefaults.content  →  built-in copy
```

So a field left empty on a user falls back to the shared default.

## Local development

```bash
cd studio
npm install
npm run dev          # http://localhost:3333
```

## Deploy

```bash
cd studio
SANITY_AUTH_TOKEN=... npm run deploy
```

The first deploy created the hostname `citi-ca-bank` and app id
`we6n68jc9ee02j6mr8z7j92o` (already in `sanity.cli.ts`).

## Security

- Dataset is **private**; all site reads/writes go through Netlify Functions.
- Plaintext passwords are never stored — only scrypt hashes in
  `application.credentials.passwordHash`.
- Only `ssnLast4` is stored, never the full SSN.
