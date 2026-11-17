# Crewline Document Generation Implementation Report

**Date:** 18 November 2026  
**Scope:** Local code, configuration examples, and synthetic-data PDF tests. No Appwrite data or production configuration was changed. No real documents or emails were issued.

## Implemented

### Three document templates

- Offer letter: A4 portrait; Crewline logo, offer date/ID, student, role, domain, duration, start/end dates, work mode, optional stipend, terms, and authorized signature.
- Internship completion certificate: A4 landscape; student, internship, domain, recorded enrollment dates, completion date, ID, authorized signature, QR code, and verification URL.
- Project completion certificate: A4 landscape; student, approved task/project title, domain, approval date, ID, signature, QR, and verification URL.
- The templates are separate reusable modules under `src/lib/documents/templates/`. Poppins headings and Inter body fonts are embedded in the generated HTML from local font packages. The existing `public/brand-logo.png` is embedded in each PDF.
- The server-side Playwright service creates the preview PDF in memory and creates/stores the final PDF only after an administrator confirms the preview.

### Workflow and security

- Admins can configure an authorized signatory name, designation, and PNG signature under **Authorized Signatory Settings**. Uploads require an admin session, PNG content validation, size and dimensions limits, and are kept in a private Appwrite bucket. Old signature files are retained; issued PDFs embed their signature at issue time.
- Preview tokens are signed on the server, expire after 15 minutes, and bind the preview to its source data and signatory settings. Issuance revalidates eligibility and rejects a stale preview.
- Offer letters require an approved application. Their duration must be expressible as a number of days, weeks, or months so the PDF can calculate an end date. Offer PDFs are private and excluded from public certificate lookup.
- Internship certificates require a completed enrollment, recorded start/completion dates, and approved submissions for all mandatory tasks.
- Project certificates require an approved submission and a recorded approved review. The current schema has tasks/submissions rather than a separate project entity, so the task title is used as the project title.
- Issued documents have server-generated IDs in the requested `CW-OFFER-YYYY-XXXXXX`, `CW-INT-YYYY-XXXXXX`, or `CW-PROJ-YYYY-XXXXXX` format. Appwrite row IDs and a unique event index prevent duplicate issue events. Controlled reissues record their previous document ID and reason; completion certificates must be revoked before reissue.
- PDFs and document metadata are private. Student download routes verify ownership; admins can access them after authorization. Public verification returns only certificate ID/type, student name, title, duration where applicable, issue date, issuer, and status.
- Certificate revocations are stored in the issued-document row and, when available, the existing revocation table. Issue/reissue/revocation actions write best-effort entries to the existing audit log table.
- The existing `Certificates` table remains unchanged. A new `Issued documents` table handles offer letters and both certificate types with one immutable snapshot structure; a new private bucket stores PDFs and authorized signature PNGs.

## Files created or modified

- Document generation: `src/lib/documents/document-id-generator.ts`, `document-validation.ts`, `document-service.ts`, `pdf-generator.ts`, `preview-token.ts`, `student-documents.ts`, and `templates/` modules.
- Routes: `src/app/api/admin/documents/preview/route.ts`, `issue/route.ts`, `signatory/route.ts`, `signatory/signature/route.ts`, `[documentId]/revoke/route.ts`, and `src/app/api/documents/[documentId]/download/route.ts`.
- UI: `src/app/admin/documents/page.tsx`, `src/components/authorized-signatory-settings.tsx`, `admin-document-issuer.tsx`, `revoke-document-form.tsx`, student documents in `src/app/account/page.tsx`, and public verification in `src/lib/certificates.ts` and `src/app/verify/[certificateId]/page.tsx`.
- Schema/setup: `scripts/setup-appwrite.mjs`, `.env.example`, `next.config.ts`, `package.json`, `package-lock.json`.
- Tests: `tests/documents.test.ts`.
- Report: this file.

The repository already had other uncommitted changes before this request. Those were preserved.

## Appwrite schema and current remote state

The repeatable `npm run setup:appwrite` script now defines:

- `Issued documents`: document type, unique event key, owner, source IDs, title/domain/duration, issue/status, private file ID, immutable JSON snapshot, signatory snapshot fields, template version, issuer, revocation fields, and reissue link.
- Unique index on `eventKey`; indexes on student and document type/status.
- `Crewline documents and signatures` bucket, restricted to PDF and PNG files with file-level security and a 10 MB limit.
- Environment ID keys `APPWRITE_DOCUMENTS_TABLE_ID` and `APPWRITE_DOCUMENTS_BUCKET_ID`; the setup script writes their IDs to `.env.local` when run.

A read-only Appwrite inspection found that the new table and bucket are currently absent. The setup/migration script was **not run**, so the Appwrite project was not mutated. Existing schema/data was not changed.

## Verification results

| Check | Result |
|---|---|
| TypeScript (`npm exec -- tsc --noEmit --incremental false`) | Passed |
| ESLint (`npm run lint`) | Passed with no warnings |
| Automated tests (`npm test`) | 5 passed; includes synthetic PDF rendering for all three document types and page orientation checks |
| Production build (`npm run build`) | Passed; all pages and API routes compiled |
| `problems` check | Passed; no errors found |
| Real Appwrite issue/download/revoke workflow | Not run; new Appwrite resources are not created yet |
| Real signature/student data or emails | Not used |

The local Playwright Chromium browser was installed for synthetic PDF tests. That browser download is local to this machine and is not part of the repository.

## Manual setup before using the document system

1. Ensure the Appwrite API key is server-only and has the required runtime scopes: database/table/row reads and writes, `files.read`, and `files.write`. The existing setup script also needs the database/table/column/index and bucket scopes used by its schema workflow. Existing auth and offer email routes may need their own `users.write`, `sessions.write`, and `messages.write` scopes.
2. Run `npm run setup:appwrite` after reviewing the new `Issued documents` table and private bucket definitions. It will create missing resources and save their IDs in `.env.local`; it does not delete rows or buckets.
3. Set `CREWLINE_ADMIN_IDENTITIES` to the exact Appwrite user ID(s) for authorized administrators. The existing admin check also requires verified email ownership. Do not use email addresses as admin identities.
4. Sign in as an authorized admin, open `/admin/documents`, and upload the authorized signatory's real PNG signature with their permission. No signature is pre-populated.
5. Verify the production origin and `NEXT_PUBLIC_APP_URL`, and allow the relevant application origin in Appwrite.
6. Confirm that the deployment host can run the Playwright Chromium browser. `next.config.ts` externalizes Playwright and traces the embedded font assets, but this repository does not install the browser during deployment. If the selected host cannot run Chromium, PDF rendering must be moved to a compatible Appwrite Function/runtime before production use.
7. Use a separate test Appwrite project and synthetic test accounts to validate owner-only downloads, document creation, revocation, and public verification end to end.

## Remaining limitations

- Appwrite integration behavior has not been exercised end to end because the required document resources are absent and no remote schema changes were made.
- Admin document lists show up to 100 recent records and do not yet include student search, internship filters, or pagination.
- Completion eligibility is rechecked during preview and issue. The current admin UI does not provide an enrollment-completion workflow; an enrollment must already be marked completed with dates in Appwrite.
- Offer end dates are derived from durations written as `N day(s)`, `N week(s)`, or `N month(s)`. Other duration wording is rejected for issuance until clarified.
- Signature transparency is recommended and explained in the UI, but PNG alpha transparency is not required.
- The server uses an in-memory preview, then generates the confirmed PDF again. It validates the source/signatory snapshot so preview and issue cannot silently diverge.
- Admin audit-log writes are best effort; document records and the revocation state remain authoritative.
- PDF visual tests verify A4 page dimensions/orientation and successful rendering from synthetic data. They do not replace review of real Appwrite previews in the deployed host environment.

