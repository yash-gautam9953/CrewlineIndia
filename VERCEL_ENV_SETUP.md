# Crewline — Vercel Environment Variables Configuration Guide

This guide describes the streamlined environment variables for Crewline in the **Vercel Dashboard** and local development.

---

## 1. Master Environment Variable Table

### Core Required Variables (7)

| Variable | Required | Purpose | Where to Get It | Public/Private |
| :--- | :---: | :--- | :--- | :---: |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | **Yes** | REST API endpoint for Appwrite Cloud or self-hosted instance | Appwrite Console > Project Settings > General > Endpoint | **Public** |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | **Yes** | Single source of truth for Appwrite Project ID (client + SSR/server) | Appwrite Console > Project Settings > General > Project ID | **Public** |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Root canonical URL for verification QR links and transactional emails | Production domain (e.g. `https://crewline.me`) or Preview URL | **Public** |
| `APPWRITE_API_KEY` | **Yes** | Privileged server secret key for database, auth, storage, and functions | Appwrite Console > Project Settings > API Keys > Create Key | **Private** |
| `APPWRITE_DATABASE_ID` | **Yes** | Database ID containing all Crewline TablesDB collections | Appwrite Console > Databases > Your Database > Database ID | **Private** |
| `CREWLINE_ADMIN_IDENTITIES` | **Yes** | Comma-separated Appwrite Auth user IDs or verified emails granted Admin access | Appwrite Console > Auth > Users | **Private** |
| `CREWLINE_PREVIEW_SECRET` | **Yes** | HMAC secret signing admin document preview tokens before issuance | Generate a unique high-entropy 64-character random string | **Private** |

### Production PDF, Security & Optional Variables

| Variable | Required | Purpose | Where to Get It | Public/Private |
| :--- | :---: | :--- | :--- | :---: |
| `APPWRITE_DOCUMENT_FUNCTION_ID` | **Prod Yes** | Appwrite Document Generator Function ID used for production PDF issuance | Appwrite Console > Functions > `generate-document-pdf` ID | **Private** |
| `UPSTASH_REDIS_REST_URL` | **Prod Yes** | Upstash Redis REST URL for fail-closed distributed rate limiting | Upstash Console > Redis Database > REST API | **Private** |
| `UPSTASH_REDIS_REST_TOKEN` | **Prod Yes** | Upstash Redis REST token paired with `UPSTASH_REDIS_REST_URL` | Upstash Console > Redis Database > REST API | **Private** |
| `CREWLINE_EMAILS_ENABLED` | Optional | Toggle Appwrite Messaging email delivery (`true` / `false`) | Set `false` in dev/preview; `true` in production | **Private** |
| `CREWLINE_CRON_SECRET` | Optional | Bearer secret authenticating `/api/cron/deadline-reminders` | Generate a high-entropy 64-character random string | **Private** |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Support contact email displayed on public pages | Your organization support address (e.g. `support@crewline.me`) | **Public** |
| `BROWSERLESS_API_KEY` | Optional | Remote Chromium API key for non-production / preview PDF fallback | Browserless.io Dashboard > Account > API Key | **Private** |
| `CHROME_WS_ENDPOINT` | Optional | Full WebSocket endpoint for dedicated remote Chromium | Dedicated headless Chrome endpoint | **Private** |

### Backward Compatibility & Explicit Overrides (Not Required)

All 14 TablesDB tables (`Student profiles`, `Internships`, `Applications`, `Enrollments`, `Tasks`, `Task assignments`, `Task resources`, `Submissions`, `Reviews`, `Payments`, `Certificates`, `Documents`, `Audit logs`, `Website content`) and 2 Storage buckets (`Submissions`, `Documents`) are automatically discovered server-side using exact name matching scoped to `NEXT_PUBLIC_APPWRITE_PROJECT_ID` and `APPWRITE_DATABASE_ID`.

Legacy variables remain supported as explicit overrides if needed:
- `APPWRITE_PROJECT_ID` (validated against `NEXT_PUBLIC_APPWRITE_PROJECT_ID`; mismatches fail closed)
- `APPWRITE_*_TABLE_ID` and `APPWRITE_*_BUCKET_ID` (verified against the active database/project before use)

---

## 2. Detailed Dashboard Locations & Security Rules

### 1. Appwrite Server API Key (`APPWRITE_API_KEY`)
1. In your Appwrite project, go to **Settings** > **API Keys** > **Create API Key**.
2. Grant the required server scopes:
   - **Databases / TablesDB**: `databases.read`, `tables.read`, `rows.read`, `rows.write`
   - **Storage**: `buckets.read`, `files.read`, `files.write`
   - **Authentication**: `users.read`, `users.write`, `sessions.write`
   - **Functions**: `execution.read`, `execution.write`
   - **Messaging**: `messages.write`
3. Keep `APPWRITE_API_KEY` strictly **Private** (never `NEXT_PUBLIC_`).

### 2. Appwrite Storage Buckets
Ensure both private Storage buckets (`Submissions` and `Documents`) have **File Security** enabled and `Role.any()` is **NOT** granted read access.

### 3. Cron Secret (`CREWLINE_CRON_SECRET`) & Preview Secret (`CREWLINE_PREVIEW_SECRET`)
Generate separate high-entropy 64-character random hex secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Production Fail-Closed Guards
- **Rate Limiting:** When `NODE_ENV=production`, distributed rate limiting via Upstash Redis is enforced strictly; missing Redis configuration fails closed (`503`) rather than silently falling back to per-instance memory.
- **PDF Generation:** When `NODE_ENV=production`, `APPWRITE_DOCUMENT_FUNCTION_ID` is required for server-side PDF rendering via Appwrite Functions.
- **Staging Isolation:** Never reuse production `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `CREWLINE_PREVIEW_SECRET`, or `NEXT_PUBLIC_APPWRITE_PROJECT_ID` in staging/preview environments.
