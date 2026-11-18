# Crewline Internship Workflow Implementation Report

**Scope:** Local code changes for the student application, admin review, enrollment, project, payment, notification, and document workflows. This report distinguishes code that is present from Appwrite operations that still need to be run.

## Student and admin flow

1. A signed-in student applies to a published internship and chooses a 1, 2, or 3 month duration plus a requested start date. The server validates the date and records the calculated end date.
2. An administrator reviews applications by domain, duration, status, and student name/email. Approval creates an enrollment with a schedule and a final project deadline two calendar days before the planned end date. Rejection and approval create in-app notifications.
3. The administrator enters the WhatsApp link and optional offer details, then sends the offer. The server creates a personalized offer PDF, attaches it to an Appwrite Messaging email, and includes the WhatsApp link. The requested schedule is locked to the student's application values.
4. Administrators create tasks for all enrolled students or selected students, optionally attach a PDF resource, and can replace the resource while preserving its version history.
5. Students submit project details and up to five private files. The server checks file signatures, size, enrollment, assignment, and whether a prior attempt was sent back for revision. Mentors/admins record feedback, score, and a decision.
6. A disclosed payment request is optional. Enrollments start as `not_applicable`; there is no invented fee or payment gateway. If an administrator requests payment, the student can submit a transaction reference and private proof file for separate verification.
7. An administrator can record completion only after assigned mandatory tasks are approved and any disclosed payment is verified or waived. Document issuance then revalidates eligibility and requires an authorized signatory. Certificate PDFs have public verification and revocation support in the existing document system.

## Feature status

| Area | Status | Implemented behavior and remaining limit |
|---|---|---|
| Student application | Implemented locally | Authenticated application, duration/start date, profile capture, duplicate protection, and calculated schedule. |
| Admin application review | Implemented locally | Filters, search, 25-row pagination, approve/reject, and student notifications. |
| Enrollment management | Implemented locally | Start/end/deadline, progress, reasoned deadline extension, and guarded completion action. Admin list currently reads up to 100 rows. |
| Offer email | Implemented locally; provider unverified | Personalized PDF attachment and WhatsApp link through Appwrite Messaging. Delivery requires a configured Appwrite email provider and `CREWLINE_EMAILS_ENABLED=true`. |
| Tasks and resources | Implemented locally | Create, publish, assign to all or selected enrolled students, optional PDF resources, and resource version history. Task editing/archiving controls are not complete. |
| Student project submissions | Implemented locally | Versioned revisions, project metadata, private upload validation, late flag, and private file download. |
| Reviews | Implemented locally | Review feedback, optional score, revision/approval/rejection, notifications, and audit entry. |
| Payments | Implemented locally; manual only | Admin-disclosed amount/instructions, student proof upload, and admin verify/reject/waive. No payment provider or automatic charge is configured. |
| Notifications | Implemented locally | Idempotent Appwrite rows, per-student read access, mark-read action, and optional email delivery. Realtime updates are not implemented. |
| Deadline reminders | Route implemented; scheduler missing | Idempotent reminders for 7, 3, 2, and 0 days before deadline. A daily scheduler still needs to call the protected route. |
| Documents and certificates | Existing system integrated | Private PDF storage, preview/issue, signatory settings, revocation, reissue support, and public verification. Issuance still depends on signatory configuration and Appwrite storage. |
| Internship management | Partially implemented | Admin can create draft or published listings. Edit/archive management is not complete. |

## Appwrite changes prepared

The repeatable setup script now adds the schema needed for the new workflow: schedule and search fields, enrollment deadlines, selected-student task assignments, task resource history, project metadata and file versions, notification email state, payment verification, indexes, and configuration IDs in `.env.local`. The schema changes are additive; the script contains no row/table deletion step.

**The setup script has not been run against Appwrite during this implementation.** No live tables, buckets, rows, users, emails, or certificates were created or changed by this work. The Appwrite dashboard could not be verified from the local build.

Before running it, create an Appwrite API key with the scopes listed in [.env.example](./.env.example). The current script needs database, table, column, index, row, bucket, and file read/write access; account creation needs `users.write` and `sessions.write`; email delivery needs `messages.write`. Keep the key server-side in `.env.local` and restart the dev server after changing it. Run `npm run setup:appwrite` to create/reuse the schema and write its IDs into `.env.local`.

Also configure:

- `CREWLINE_ADMIN_IDENTITIES` with the Appwrite Auth user ID(s) allowed into `/admin`; the current admin check requires a verified email.
- An authorized signatory name, designation, and permitted signature image in Admin → Documents.
- An Appwrite email provider under Messaging before enabling offer delivery. Keep `CREWLINE_EMAILS_ENABLED=false` in local development until a controlled test is ready.
- A long random `CREWLINE_CRON_SECRET` and a daily scheduler that calls `POST /api/cron/deadline-reminders` with `Authorization: Bearer <secret>`. The endpoint is implemented, but no scheduler is provisioned here.

## Local verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed with no warnings |
| `npm test` | Passed: 8 tests, including document rendering and schedule validation across 10 synthetic students; no Appwrite calls or emails are made by the synthetic workflow tests. |
| `npm run build` | Passed on Next.js 16.4.6; the new admin enrollment completion route is included. |

## Completion estimate and next phase

**Estimated local workflow implementation: about 75%.** The main user-facing and server-side paths now exist, and the local checks pass. The remaining quarter reflects unrun Appwrite migrations, unverified live permissions and Messaging delivery, the missing scheduler, incomplete internship/task edit controls, and the absence of an end-to-end Appwrite smoke test. This estimate measures code and operational readiness, not product launch readiness.

Recommended next steps:

1. Add the API key scopes from `.env.example`, then run `npm run setup:appwrite` and confirm all generated IDs in `.env.local`.
2. Verify row security and private file access in Appwrite for the student, admin, task-resource, submission, payment-proof, and document buckets/tables.
3. Set the authorized signatory and configure an Appwrite Messaging provider.
4. Use one synthetic student account to apply, approve, send an offer to a controlled inbox, submit/revise a project, and test a disclosed payment request.
5. Configure and verify a daily scheduler for deadline reminders.
6. Add edit/archive controls for internships and tasks, then add pagination for admin student, enrollment, payment, and document lists.
7. Add an Appwrite-backed integration test in a dedicated test project before relying on the workflow for real students.
