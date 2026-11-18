# Crewline Document Generator — Appwrite Function

Production Appwrite Function document engine for automated and secure generation of:
1. **Internship Offer Letters** (A4 Portrait)
2. **Internship Completion Certificates** (A4 Landscape)
3. **Project Completion Certificates** (A4 Landscape)

---

## Architecture Overview

- **Engine:** Playwright Chromium headless runner rendering 100% self-contained HTML with embedded base64 assets and inline SVGs.
- **Verification:** Cryptographically generated QR codes linking to `https://crewline.me/verify/<DOCUMENT_ID>`.
- **Security:**
  - Zero arbitrary template paths or client-controlled HTML.
  - Mandatory HTML escaping across all user-supplied inputs (`safeText` & `escapeHtml`).
  - Strict server-side eligibility checks enforced before generation.
  - Idempotent document creation via unique `eventKey` constraint preventing duplicate issuance.
  - Student read-only Appwrite Storage permissions (`Role.user(studentId)`).
  - Automatic rollback of Storage files if database persistence fails.

---

## Directory Structure

```text
functions/crewline-document-generator/
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── main.js
│   ├── config/
│   │   └── env.js
│   ├── handlers/
│   │   ├── offer-letter.handler.js
│   │   ├── internship-certificate.handler.js
│   │   └── project-certificate.handler.js
│   ├── services/
│   │   ├── document-service.js
│   │   ├── eligibility-service.js
│   │   ├── pdf-service.js
│   │   ├── storage-service.js
│   │   ├── database-service.js
│   │   └── internship-dates-helper.js
│   ├── templates/
│   │   ├── offer-letter/
│   │   │   ├── template.html
│   │   │   └── assets/
│   │   ├── internship-certificate/
│   │   │   ├── template.html
│   │   │   └── assets/
│   │   └── project-certificate/
│   │       ├── template.html
│   │       └── assets/
│   ├── utils/
│   │   ├── html-escape.js
│   │   ├── document-id.js
│   │   ├── idempotency.js
│   │   ├── qr-generator.js
│   │   └── template-renderer.js
│   └── tests/
│       ├── offer-letter.test.js
│       ├── internship-certificate.test.js
│       ├── project-certificate.test.js
│       └── document-engine.test.js
```

---

## API Request Payloads

### 1. Issue Offer Letter
```json
{
  "documentType": "offer",
  "applicationId": "app_12345",
  "issuedBy": "system-auto-enrollment",
  "offerDetails": {
    "startDate": "2026-11-20",
    "duration": "1 Month",
    "workMode": "Remote"
  }
}
```

### 2. Issue Internship Completion Certificate
```json
{
  "documentType": "internship_completion",
  "enrollmentId": "enr_12345",
  "issuedBy": "admin_or_system"
}
```

### 3. Issue Project Completion Certificate
```json
{
  "documentType": "project_completion",
  "submissionId": "sub_12345",
  "issuedBy": "admin_or_system"
}
```

### 4. HTML Preview (Non-persistent)
```json
{
  "action": "preview",
  "documentType": "internship_completion",
  "data": {
    "studentName": "Aarav Sharma",
    "documentTitle": "Full Stack Web Development",
    "domain": "Web Development",
    "duration": "1 Month",
    "startDate": "2026-10-01",
    "endDate": "2026-11-01",
    "workMode": "Remote",
    "verificationUrl": "https://crewline.me/verify/CW-INT-2026-DEMO01"
  }
}
```

---

## Deployment via Appwrite CLI

1. Ensure Appwrite CLI is logged in:
   ```bash
   appwrite login
   ```
2. Deploy function from root:
   ```bash
   appwrite deploy function
   ```
   Or specify function ID:
   ```bash
   appwrite functions createDeployment --functionId crewline-document-generator --activate true
   ```
