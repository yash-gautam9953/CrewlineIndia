import "server-only";
import type { DocumentSnapshot } from "../document-validation";
import { dateText, documentHtml, safeText, type DocumentAssets } from "./shared";

const heading = "INTERNSHIP OFFER LETTER";

const offerCss = `
  :root {
    --navy: #26365f;
    --blue: #0877f9;
    --purple: #5710e8;
    --pale: #eef4ff;
    --line: #cbd8f5;
    --body: #3b455c;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #fff;
    color: var(--body);
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 11pt;
    letter-spacing: .05px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
    margin: 0 auto;
    padding: 6mm 15mm 11mm;
    overflow: hidden;
    background: #fff;
  }
  .corner { position: absolute; pointer-events: none; z-index: 0; }
  .corner-top { top: 0; left: 0; width: 68mm; height: 24mm; }
  .corner-bottom { right: 0; bottom: 0; width: 82mm; height: 35mm; }
  .content { position: relative; z-index: 1; height: 280mm; }
  .header {
    display: flex; justify-content: space-between; align-items: center;
    gap: 8mm; min-height: 28mm;
  }
  .brand { display: flex; align-items: center; flex: 0 1 auto; min-width: 0; }
  .brand img { display: block; width: 76mm; max-height: 24mm; object-fit: contain; object-position: left center; }
  .meta {
    flex: 0 0 59mm; border-left: 1px solid #aab6d4;
    padding: 0 0 0 8mm; margin: 0; color: var(--navy); transform: translateY(-1.2mm);
  }
  .meta-row { display: flex; align-items: center; gap: 3mm; margin: 0 0 2.8mm; font-size: 11.5pt; font-weight: 700; line-height: 1.25; white-space: nowrap; }
  .meta-row:last-child { margin-bottom: 0; }
  .meta svg { width: 5mm; height: 5mm; stroke: var(--navy); flex: none; }
  h1 {
    color: var(--navy); text-align: center; font-size: 29pt; line-height: 1.1;
    letter-spacing: .2px; margin: 4.6mm 0 4.4mm; font-weight: 800;
  }
  .title-rule { display: flex; align-items: center; gap: 4mm; margin: 0 9mm 7.8mm; }
  .title-rule span { height: 1px; background: #b9c9ef; flex: 1; }
  .title-rule b { display: block; width: 45mm; height: 1.8mm; border-radius: 5px; background: linear-gradient(90deg,var(--blue),var(--purple)); }
  .greeting { font-size: 15pt; font-weight: 700; color: var(--navy); margin: 0 0 3mm; }
  .intro { font-size: 13pt; line-height: 1.25; margin: 0 0 4mm; }
  strong { color: #2d3d65; font-weight: 700; }
  .details {
    position: relative; border: 1.2px solid #91b2ff; border-radius: 4mm;
    padding: 6mm 6mm 2mm; margin: 0 0 3mm;
    background: linear-gradient(110deg, #fff 0%, #f8faff 100%);
  }
  .details-label {
    position: absolute; top: -5mm; left: -.3mm; height: 10mm; min-width: 69mm;
    display: flex; align-items: center; gap: 3mm; padding: 0 7mm 0 6mm;
    color: #fff; font-size: 12pt; font-weight: 800;
    background: linear-gradient(100deg, #0756d8, #5a0ce7);
    border-radius: 3mm 3mm 5mm 0; 
  }
  .details-label svg { width: 6mm; height: 6mm; stroke: #fff; }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .detail-col { padding: 0 6mm 0 2mm; }
  .detail-col + .detail-col { border-left: 1px solid #cfdbf5; padding: 0 1mm 0 8mm; }
  .detail-item { display: flex; align-items: center; gap: 4mm; min-height: 14mm; border-bottom: 1px solid #d8e1f5; }
  .detail-item:last-child { border-bottom: 0; }
  .detail-icon {
    width: 10mm; height: 10mm; border-radius: 3mm; flex: none;
    display: grid; place-items: center; background: #eaf1ff;
  }
  .detail-icon svg { width: 6.5mm; height: 6.5mm; stroke: #0874f5; }
  .detail-copy { min-width: 0; font-size: 11pt; line-height: 1.25; }
  .detail-copy b { display: block; color: #34415f; font-weight: 700; }
  .detail-copy span { display: block; overflow-wrap: anywhere; color: #354669; font-weight: 700; }
  .paragraphs p { font-size: 12.5pt; line-height: 1.2; margin: 0 0 2mm; }
  .closing { font-size: 12.5pt; line-height: 1.2; margin: 2mm 0 2mm; }
  .regards { color: var(--navy); font-size: 11.5pt; font-weight: 700; margin: 0 0 2.5mm; }
  .signature { position: absolute; left: 0; bottom: 16mm; width: 58mm; min-height: 26mm; }
  .signature img { display: block; width: 40mm; height: 14mm; object-fit: contain; object-position: left bottom; margin: 0 0 1mm; }
  .signature-line { width: 57mm; border-top: 1.2px solid var(--navy); margin: 0 0 2mm; }
  .sign-name { color: var(--navy); font-size: 12pt; font-weight: 700; margin-bottom: 1mm; }
  .sign-role { color: #505a70; font-size: 11.5pt; line-height: 1.3; }
  .footer {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; gap: 15mm;
    border-top: 1px solid #cbd8f5; margin-top: 0; padding-top: 5mm;
    color: #34415f; font-size: 11.5pt; font-weight: 600;
  }
  .footer-item { display: flex; align-items: center; gap: 3mm; }
  .footer svg { width: 5mm; height: 5mm; stroke: #0874f5; }
  .footer-divider { height: 6mm; width: 1px; background: #9eacd0; }
  @media print {
    body { background: #fff; }
    .page { width: 210mm; height: 297mm; margin: 0; box-shadow: none; }
  }
`;

export function renderOfferLetter(snapshot: DocumentSnapshot, assets: DocumentAssets) {
  const role = safeText(snapshot.documentTitle || "Internship Program");
  const domain = safeText(snapshot.domain || "Technology");
  const duration = safeText(snapshot.duration || "1 Month");
  const startDate = dateText(snapshot.startDate);
  const endDate = dateText(snapshot.endDate);
  const workMode = safeText(snapshot.workMode || "Virtual / Remote");
  const issueDate = dateText(snapshot.issueDate);
  const studentName = safeText(snapshot.studentName);
  const offerId = safeText(snapshot.documentId);
  const signatoryName = safeText(snapshot.signatoryName);
  const signatoryDesignation = safeText(snapshot.signatoryDesignation);

  const stipendParagraph = snapshot.stipend
    ? `<p>Any <strong>stipend</strong> (${safeText(snapshot.stipend)}), if applicable, will be governed by the terms communicated separately.</p>`
    : `<p>Any <strong>stipend</strong>, if applicable, will be governed by the terms communicated separately.</p>`;

  const content = `
<main class="page">
  <!-- Decorative top-left corner SVG -->
  <svg class="corner corner-top" viewBox="0 0 340 155" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="topGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2010c9"/><stop offset="1" stop-color="#0879ff"/>
      </linearGradient>
    </defs>
    <path d="M0 0H340C256 58 161 111 0 155Z" fill="url(#topGrad)"/>
    <path d="M0 0H294C222 52 130 98 0 130Z" fill="#6ea8ff" opacity=".48"/>
    <path d="M0 0H235C174 40 93 78 0 103Z" fill="#2811c9" opacity=".92"/>
  </svg>

  <div class="content">
    <header class="header">
      <div class="brand">
        <img src="${assets.logo}" alt="CREWLINE logo" />
      </div>
      <div class="meta">
        <div class="meta-row">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M7 3h8l5 5v13H4V3z"/><path d="M14 3v6h6M8 13h8M8 17h8"/></svg>
          <span>Offer ID: ${offerId}</span>
        </div>
        <div class="meta-row">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
          <span>Issued on: ${issueDate}</span>
        </div>
      </div>
    </header>

    <h1>INTERNSHIP OFFER LETTER</h1>
    <div class="title-rule"><span></span><b></b><span></span></div>

    <p class="greeting">Dear ${studentName},</p>
    <p class="intro">
      Congratulations! We are pleased to offer you the position of
      <strong>${role}</strong> at <strong>Crewline</strong> in the
      <strong>${domain}</strong> domain. This letter confirms your selection
      for our virtual internship program for the period from
      <strong>${startDate}</strong> to <strong>${endDate}</strong>.
    </p>

    <section class="details">
      <div class="details-label">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>
        INTERNSHIP DETAILS
      </div>
      <div class="detail-grid">
        <div class="detail-col">
          <div class="detail-item">
            <div class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg></div>
            <div class="detail-copy"><b>Internship Role</b><span>${role}</span></div>
          </div>
          <div class="detail-item">
            <div class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
            <div class="detail-copy"><b>Domain</b><span>${domain}</span></div>
          </div>
          <div class="detail-item">
            <div class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18M8 13h2M14 13h2M8 17h2"/></svg></div>
            <div class="detail-copy"><b>Duration</b><span>${duration}</span></div>
          </div>
        </div>
        <div class="detail-col">
          <div class="detail-item">
            <div class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18M8 13h2M14 13h2"/></svg></div>
            <div class="detail-copy"><b>Start Date</b><span>${startDate}</span></div>
          </div>
          <div class="detail-item">
            <div class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18m5 8 2 2 4-4"/></svg></div>
            <div class="detail-copy"><b>End Date</b><span>${endDate}</span></div>
          </div>
          <div class="detail-item">
            <div class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8M12 18v4M6 8h12"/></svg></div>
            <div class="detail-copy"><b>Work Mode</b><span>${workMode}</span></div>
          </div>
        </div>
      </div>
    </section>

    <div class="paragraphs">
      <p>
        The internship will be conducted <strong>completely online</strong> and will provide you with the
        opportunity to work on <strong>practical assignments and projects</strong> related to the
        <strong>${domain}</strong> domain. You will be able to apply your knowledge,
        strengthen your technical skills and gain <strong>hands-on industry exposure</strong>.
      </p>
      <p>
        Throughout the internship, you are expected to complete the <strong>assigned tasks on time</strong>,
        follow the <strong>program guidelines</strong> shared by Crewline and maintain
        <strong>professional conduct and responsible communication</strong>.
      </p>
      ${stipendParagraph}
    </div>

    <p class="closing">We are pleased to welcome you to <strong>Crewline</strong> and wish you a rewarding learning experience.</p>
    <p class="regards">Best regards,</p>

    <section class="signature">
      <img src="${assets.signature}" alt="Authorized signature" />
      <div class="signature-line"></div>
      <div class="sign-name">${signatoryName}</div>
      <div class="sign-role">${signatoryDesignation}<br/>Crewline</div>
    </section>

    <footer class="footer">
      <div class="footer-item">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>
        <span>www.crewline.me</span>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-item">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></svg>
        <span>support@crewline.me</span>
      </div>
    </footer>
  </div>

  <!-- Decorative bottom-right corner SVG -->
  <svg class="corner corner-bottom" viewBox="0 0 410 210" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="bottomGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1594ff"/><stop offset="1" stop-color="#2910cf"/>
      </linearGradient>
    </defs>
    <path d="M410 0V210H0C123 158 261 64 410 0Z" fill="url(#bottomGrad)"/>
    <path d="M410 0V154C315 157 169 194 42 210C178 122 300 49 410 0Z" fill="#0879ff" opacity=".65"/>
    <path d="M410 0V91C319 126 234 175 151 210H410Z" fill="#2d10d4" opacity=".9"/>
  </svg>
</main>
<style>${offerCss}</style>
`;

  return documentHtml("portrait", heading, content, assets);
}
