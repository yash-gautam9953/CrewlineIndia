# Crewline

Crewline is a Next.js + Appwrite internship application portal. Students create an account, apply to a published internship, and view their own profile and application status. Admins review applications and send an offer email with program details and the WhatsApp/Google Form links. The rest of the internship process is handled outside the website.

## Run locally

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>.

## Appwrite configuration

Copy `.env.example` to `.env.local`, then set the endpoint, project ID, and server-only API key. Keep `.env.local` out of Git and never add the API key to a `NEXT_PUBLIC_` variable.

The server key needs the scopes used by this app:

- `databases.read`, `databases.write`
- `tables.read`, `tables.write`
- `columns.read`, `columns.write`
- `indexes.read`, `indexes.write`
- `rows.read`, `rows.write`
- `buckets.read`, `buckets.write`
- `users.write`, `sessions.write`
- `messages.write`

To create or reconcile the Crewline database schema and storage buckets:

```powershell
npm run setup:appwrite
```

The script creates missing resources and fills their IDs into `.env.local`. It does not seed sample records or delete existing resources. It can be rerun after a schema change to add missing columns or indexes.

To enable admin access, add the administrator's Appwrite account email or user ID to `CREWLINE_ADMIN_IDENTITIES` in `.env.local` as a comma-separated allowlist. A browser-supplied role is never trusted.

To send offer email, configure and enable an Email provider under **Appwrite Console → Messaging → Providers**. Appwrite Messaging sends to the selected applicant's account email. The sender address must be verified with the configured provider. Add the WhatsApp invitation link and, where needed, the Google Form link in the admin application screen.

## Checks

```powershell
npm run lint
npm run build
```
