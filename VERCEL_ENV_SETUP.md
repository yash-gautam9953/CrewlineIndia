# Crewline — Vercel Environment Variables Configuration Guide

This guide provides step-by-step instructions for configuring all environment variables for Crewline in the **Vercel Dashboard**.

---

## 1. Master Environment Variable Table

| Variable | Required | Purpose | Where to Get It | Public/Private |
| :--- | :---: | :--- | :--- | :---: |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | **Yes** | REST API endpoint for Appwrite Cloud or self-hosted instance | Appwrite Console > Project Settings > General > Endpoint | **Public** |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | **Yes** | Public project identifier for browser-side SDK initialization | Appwrite Console > Project Settings > General > Project ID | **Public** |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Root canonical URL for QR verification links and links in emails | Production domain (e.g. `https://crewline.me`) or Vercel URL | **Public** |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Support contact email shown on public pages | Your organization's support address (e.g. `support@crewline.me`) | **Public** |
| `APPWRITE_PROJECT_ID` | **Yes** | Server-side Project ID used by SSR session cookie validator | Appwrite Console > Project Settings > General > Project ID | **Private** |
| `APPWRITE_API_KEY` | **Yes** | Privileged server secret key for database, auth, and storage | Appwrite Console > Project Settings > API Keys > Create Key | **Private** |
| `APPWRITE_DATABASE_ID` | **Yes** | Database ID containing all TablesDB collections | Appwrite Console > Databases > Your Database > Database ID | **Private** |
| `APPWRITE_STUDENT_PROFILES_TABLE_ID` | **Yes** | Table storing student university, phone, and profile details | Appwrite Console > Databases > [Database] > `student_profiles` | **Private** |
| `APPWRITE_INTERNSHIPS_TABLE_ID` | **Yes** | Table storing published internship domain listings | Appwrite Console > Databases > [Database] > `internships` | **Private** |
| `APPWRITE_APPLICATIONS_TABLE_ID` | **Yes** | Table storing submitted internship applications and status | Appwrite Console > Databases > [Database] > `applications` | **Private** |
| `APPWRITE_ENROLLMENTS_TABLE_ID` | **Yes** | Table storing active and completed student enrollments | Appwrite Console > Databases > [Database] > `enrollments` | **Private** |
| `APPWRITE_TASKS_TABLE_ID` | **Yes** | Table storing curriculum milestone tasks and project briefs | Appwrite Console > Databases > [Database] > `tasks` | **Private** |
| `APPWRITE_TASK_ASSIGNMENTS_TABLE_ID` | **Yes** | Table tracking individual student task assignments | Appwrite Console > Databases > [Database] > `task_assignments` | **Private** |
| `APPWRITE_TASK_RESOURCES_TABLE_ID` | **Yes** | Table storing starter kit resources and file IDs | Appwrite Console > Databases > [Database] > `task_resources` | **Private** |
| `APPWRITE_SUBMISSIONS_TABLE_ID` | **Yes** | Table storing student project code submissions and files | Appwrite Console > Databases > [Database] > `submissions` | **Private** |
| `APPWRITE_REVIEWS_TABLE_ID` | **Yes** | Table storing mentor feedback and grade reviews | Appwrite Console > Databases > [Database] > `reviews` | **Private** |
| `APPWRITE_PAYMENTS_TABLE_ID` | **Yes** | Table storing certificate fee requests and payment proofs | Appwrite Console > Databases > [Database] > `payments` | **Private** |
| `APPWRITE_CERTIFICATES_TABLE_ID` | **Yes** | Public certificate verification index | Appwrite Console > Databases > [Database] > `certificates` | **Private** |
| `APPWRITE_DOCUMENTS_TABLE_ID` | **Yes** | Authoritative document metadata and idempotency store | Appwrite Console > Databases > [Database] > `documents` | **Private** |
| `APPWRITE_AUDIT_LOGS_TABLE_ID` | Optional | Administrative audit trail collection | Appwrite Console > Databases > [Database] > `audit_logs` | **Private** |
| `APPWRITE_WEBSITE_CONTENT_TABLE_ID` | Optional | Authorized signatory profile and CMS settings | Appwrite Console > Databases > [Database] > `website_content` | **Private** |
| `APPWRITE_SUBMISSIONS_BUCKET_ID` | **Yes** | Storage bucket for student project zip/pdf uploads and proofs | Appwrite Console > Storage > `submissions` bucket ID | **Private** |
| `APPWRITE_DOCUMENTS_BUCKET_ID` | **Yes** | Storage bucket for generated offer letters and certificates | Appwrite Console > Storage > `documents` bucket ID | **Private** |
| `CREWLINE_ADMIN_IDENTITIES` | **Yes** | Comma-separated Appwrite Auth user IDs granted Admin access | Appwrite Console > Auth > Users > Copy target User ID | **Private** |
| `CREWLINE_CRON_SECRET` | **Yes** | Bearer secret for automated deadline reminders cron | Generate high-entropy 64-character random string | **Private** |
| `CREWLINE_EMAILS_ENABLED` | **Yes** | Toggle Appwrite Messaging email delivery (`true` / `false`) | Set `false` in dev/preview; `true` in production | **Private** |
| `BROWSERLESS_API_KEY` | Recommended | Remote headless Chromium API key for serverless PDF engine | Browserless.io Dashboard > Account > API Key | **Private** |
| `CHROME_WS_ENDPOINT` | Optional | Full WebSocket endpoint for remote Chromium cluster | Dedicated Chromium container (e.g. Railway, Fly, AWS) | **Private** |

---

## 2. Detailed Dashboard Locations & How to Get Values

### 1. Appwrite Project Settings
1. Navigate to [Appwrite Cloud Console](https://cloud.appwrite.io) or your self-hosted console.
2. Select your project.
3. In the left navigation, click **Settings** (gear icon) > **General**.
4. Copy:
   - **Endpoint**: (e.g. `https://sgp.cloud.appwrite.io/v1`) &rarr; assign to `NEXT_PUBLIC_APPWRITE_ENDPOINT`.
   - **Project ID**: (e.g. `6afc10e40030343548a0`) &rarr; assign to **both** `NEXT_PUBLIC_APPWRITE_PROJECT_ID` and `APPWRITE_PROJECT_ID`.

---

### 2. Appwrite Server API Key (`APPWRITE_API_KEY`)
1. In your Appwrite project, go to **Settings** > **API Keys**.
2. Click **Create API Key**.
3. Name it: `Crewline Production Server Key`.
4. Set **Expiration** to never expire (or according to your security rotation policy).
5. Grant only the following least-privilege scopes:
   - **Databases**: `databases.read`, `databases.write`
   - **Tables / Collections**: `tables.read`, `tables.write`, `columns.read`, `columns.write`, `indexes.read`, `indexes.write`
   - **Documents / Rows**: `rows.read`, `rows.write`
   - **Storage**: `buckets.read`, `buckets.write`, `files.read`, `files.write`
   - **Authentication**: `users.read`, `users.write`, `sessions.write`
   - **Messaging**: `messages.write`
6. Click **Create**, copy the secret key, and paste it into `APPWRITE_API_KEY`.
   *(Do NOT reveal this key to anyone or prefix it with `NEXT_PUBLIC_`)*.

---

### 3. Appwrite Databases & Table IDs
1. In the left navigation, click **Databases**.
2. Select your Crewline database (or click the database row).
3. The string below the database title is your `APPWRITE_DATABASE_ID`.
4. In the database, you will see the list of tables. Click into each table (or copy from table settings):
   - `student_profiles` &rarr; `APPWRITE_STUDENT_PROFILES_TABLE_ID`
   - `internships` &rarr; `APPWRITE_INTERNSHIPS_TABLE_ID`
   - `applications` &rarr; `APPWRITE_APPLICATIONS_TABLE_ID`
   - `enrollments` &rarr; `APPWRITE_ENROLLMENTS_TABLE_ID`
   - `tasks` &rarr; `APPWRITE_TASKS_TABLE_ID`
   - `task_assignments` &rarr; `APPWRITE_TASK_ASSIGNMENTS_TABLE_ID`
   - `task_resources` &rarr; `APPWRITE_TASK_RESOURCES_TABLE_ID`
   - `submissions` &rarr; `APPWRITE_SUBMISSIONS_TABLE_ID`
   - `reviews` &rarr; `APPWRITE_REVIEWS_TABLE_ID`
   - `payments` &rarr; `APPWRITE_PAYMENTS_TABLE_ID`
   - `certificates` &rarr; `APPWRITE_CERTIFICATES_TABLE_ID`
   - `documents` &rarr; `APPWRITE_DOCUMENTS_TABLE_ID`
   - `audit_logs` &rarr; `APPWRITE_AUDIT_LOGS_TABLE_ID` *(if created)*
   - `website_content` &rarr; `APPWRITE_WEBSITE_CONTENT_TABLE_ID` *(if created)*

> **Tip:** If you ran `npm run setup:appwrite`, check your generated table IDs or copy them directly from the Appwrite Console.

---

### 4. Appwrite Storage Buckets
1. In the left navigation, click **Storage**.
2. Identify your two private buckets:
   - **Submissions Bucket**: Stores student project files, zip archives, and payment proofs &rarr; `APPWRITE_SUBMISSIONS_BUCKET_ID`.
   - **Documents Bucket**: Stores generated A4 PDF offer letters and completion certificates &rarr; `APPWRITE_DOCUMENTS_BUCKET_ID`.
3. In each bucket's **Settings**, ensure that **File Security** is enabled and `Role.any()` is **NOT** granted read access.

---

### 5. Admin Identities (`CREWLINE_ADMIN_IDENTITIES`)
1. In the left navigation, click **Auth** > **Users**.
2. Find your administrator account.
3. Click the user or hover over their ID, then click **Copy ID** (e.g. `673a9f1234567890abcd`).
4. Paste into `CREWLINE_ADMIN_IDENTITIES`. For multiple administrators, separate IDs with commas:
   ```env
   CREWLINE_ADMIN_IDENTITIES=673a9f1234567890abcd,673b0a9876543210ef01
   ```
5. **Important:** The administrator user must have a verified email address (`emailVerification: true` in Appwrite Console).

---

### 6. Cron Secret (`CREWLINE_CRON_SECRET`)
The cron endpoint `/api/cron/deadline-reminders` requires a secure bearer token. Generate a random 64-character secret using one of these commands:

- **Using Node.js:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Using OpenSSL:**
  ```bash
  openssl rand -hex 32
  ```
- **Using PowerShell:**
  ```powershell
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
  ```

Paste this string into `CREWLINE_CRON_SECRET`. In your external cron job scheduler (or Vercel Cron), send the header:
```http
Authorization: Bearer <CREWLINE_CRON_SECRET>
```

---

### 7. Remote PDF Generation (`BROWSERLESS_API_KEY` or `CHROME_WS_ENDPOINT`)
On Vercel Serverless (AWS Lambda), local Chromium cannot run directly due to missing Linux desktop dependencies and package size limits. To enable serverless PDF generation:

1. Sign up for a free or production plan at [Browserless.io](https://browserless.io).
2. From the Browserless Dashboard, copy your **API Key**.
3. Paste it into `BROWSERLESS_API_KEY`.
4. *Alternative:* If hosting your own headless Chrome Docker container (e.g. on Railway, Render, or Fly.io), provide the full WebSocket URL in `CHROME_WS_ENDPOINT`:
   ```env
   CHROME_WS_ENDPOINT=wss://your-chrome-service.up.railway.app
   ```

---

### 8. Email Delivery Configuration (`CREWLINE_EMAILS_ENABLED`)
1. In Appwrite Console, go to **Messaging** > **Providers**.
2. Click **Add Provider** > **Email** (select Sendgrid, Mailgun, Resend, or Custom SMTP).
3. Fill in your SMTP host, port, username, password, and sender address (e.g. `no-reply@crewline.me`).
4. Once verified with a test email:
   - For **Production**: set `CREWLINE_EMAILS_ENABLED=true`.
   - For **Preview / Development**: set `CREWLINE_EMAILS_ENABLED=false` to prevent sending test offer emails to real student mailboxes.

---

## 3. Environment-Specific Configuration Guide

When adding variables in the Vercel Dashboard (**Project Settings > Environment Variables**), you can select which environments each variable applies to:

### A. Production Environment
- `NEXT_PUBLIC_APP_URL`: Set to your custom live domain: `https://crewline.me`.
- `CREWLINE_EMAILS_ENABLED`: Set to `true` (once Appwrite Messaging provider is verified).
- `BROWSERLESS_API_KEY`: Provide your live Browserless API key.

### B. Preview Environment (Pull Requests & Branch Deploys)
- `NEXT_PUBLIC_APP_URL`: Set to `https://preview.crewline.me` or leave blank to inherit the branch domain.
- `CREWLINE_EMAILS_ENABLED`: Set to `false` (avoids accidental email dispatch during testing).
- `BROWSERLESS_API_KEY`: Share the Browserless key if you want PDF previews to work on PR builds.

### C. Development Environment (Local CLI `vercel env pull`)
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000`.
- `CREWLINE_EMAILS_ENABLED`: `false`.
- `BROWSERLESS_API_KEY`: Optional (local development automatically uses local Playwright Chromium).

---

## 4. How to Apply in Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com).
2. Select your project **Crewline**.
3. Click **Settings** > **Environment Variables**.
4. You can paste the contents of `.env.vercel.example` (with your actual values filled in) directly into the bulk import textarea, or add each variable individually.
5. Check the appropriate environment checkboxes (**Production**, **Preview**, **Development**).
6. Click **Save**.
7. Redeploy your project (or push a commit) to apply the new environment variables.

---

## 5. Security Checklist Before Going Live

- [ ] `APPWRITE_API_KEY` is marked as **Private** (never prefixed with `NEXT_PUBLIC_`).
- [ ] `BROWSERLESS_API_KEY` is marked as **Private**.
- [ ] `CREWLINE_CRON_SECRET` is a long, random string.
- [ ] In Appwrite Console > **Storage**, both `submissions` and `documents` buckets have private permissions (`Role.any()` is unchecked).
- [ ] In Appwrite Console > **Settings > Custom Domains**, your production domain `crewline.me` and Vercel domains `*.vercel.app` are added as allowed Web Platforms.
- [ ] The admin user listed in `CREWLINE_ADMIN_IDENTITIES` has verified their email in Appwrite Auth.
