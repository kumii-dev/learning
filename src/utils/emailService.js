/**
 * src/utils/emailService.js
 * Resend-backed transactional email service.
 *
 * Env vars:
 *   Resend_API_Key  — Resend secret key
 *   FROM_EMAIL      — "From" address (default: onboarding@resend.dev for sandbox)
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const { Resend } = require('resend');
const logger     = require('./logger');

// Lazy singleton — avoids Resend constructor throwing at module-load time
// when the env key is undefined (Vercel cold-start crash pattern).
let _resend = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.Resend_API_Key ?? process.env.RESEND_API_KEY ?? 'missing');
  }
  return _resend;
}

const FROM = process.env.FROM_EMAIL ?? 'Kumii Learning <onboarding@resend.dev>';

/* ── Logo helper ───────────────────────────────────────────────────────────── */
// Load Kumii logo once at module level as a base64 data-URI for email footers.
// Falls back to an empty string if the file is missing in the deployment.
function loadLogoDataUri() {
  try {
    const logoPath = path.resolve(__dirname, '../../Kumii-logo.png');
    const data = fs.readFileSync(logoPath);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch {
    return '';
  }
}
const KUMII_LOGO_URI = loadLogoDataUri();

const logoFooterHtml = KUMII_LOGO_URI
  ? `<img src="${KUMII_LOGO_URI}" alt="Kumii Learning" width="120"
         style="display:block;margin:0 auto 8px;opacity:0.85;">`
  : `<span style="font-size:20px;font-weight:800;color:#15803d;">Kumii</span>`;

/* ── Certificate-issued email ──────────────────────────────────────────────── */

/**
 * Send the "Your certificate is ready" email to the learner.
 *
 * @param {object} opts
 * @param {string}  opts.to             — learner email
 * @param {string}  opts.learnerName    — full name
 * @param {string}  opts.courseTitle    — course title
 * @param {string|null} opts.pdfUrl     — Supabase Storage public URL (or null)
 * @param {string}  opts.certificateId  — UUID
 * @param {string}  opts.issuedAt       — ISO timestamp
 */
async function sendCertificateEmail({ to, learnerName, courseTitle, pdfUrl, certificateId, issuedAt }) {
  if (!to) {
    logger.warn('[email] sendCertificateEmail: no recipient address — skipping');
    return;
  }

  const issued = issuedAt
    ? new Date(issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const certShortId = (certificateId ?? '').slice(0, 8).toUpperCase();

  const downloadBtn = pdfUrl
    ? `<a href="${pdfUrl}"
         style="display:inline-block;margin-top:8px;padding:13px 32px;
                background:#16a34a;color:#ffffff;text-decoration:none;
                border-radius:8px;font-weight:700;font-size:15px;
                letter-spacing:0.2px;">
         ⬇ Download Certificate
       </a>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Certificate — Kumii Learning</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f1f5f9;padding:48px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="560" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#ffffff;border-radius:18px;overflow:hidden;
                    box-shadow:0 8px 32px rgba(0,0,0,0.10);">

        <!-- ── Header band ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#15803d 0%,#059669 100%);
                     padding:36px 40px;text-align:center;">
            <div style="font-size:30px;font-weight:800;color:#ffffff;
                        letter-spacing:-0.5px;line-height:1;">Kumii</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.75);
                        letter-spacing:2.5px;text-transform:uppercase;
                        margin-top:6px;">Learning Hub</div>
          </td>
        </tr>

        <!-- ── Award strip ── -->
        <tr>
          <td style="background:#f0fdf4;padding:28px 40px;text-align:center;
                     border-bottom:2px solid #bbf7d0;">
            <div style="font-size:52px;line-height:1;margin-bottom:12px;">🏆</div>
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#15803d;">
              Congratulations, ${learnerName}!
            </h1>
            <p style="margin:0;font-size:14px;color:#4b5563;">
              You have successfully completed
            </p>
            <p style="margin:10px 0 0;font-size:20px;font-weight:700;color:#111827;">
              ${courseTitle}
            </p>
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#374151;">
              We're proud to recognise your achievement. Your official certificate has been
              generated and is ready for download. Share it on LinkedIn or save it for
              your records!
            </p>

            <!-- Meta table -->
            <table cellpadding="0" cellspacing="0" width="100%"
                   style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;
                          margin:0 0 28px;">
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:13px 20px;background:#f9fafb;width:40%;">
                  <span style="font-size:11px;color:#6b7280;text-transform:uppercase;
                               letter-spacing:0.8px;">Course</span>
                </td>
                <td style="padding:13px 20px;">
                  <span style="font-size:14px;font-weight:600;color:#111827;">${courseTitle}</span>
                </td>
              </tr>
              <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:13px 20px;background:#f9fafb;">
                  <span style="font-size:11px;color:#6b7280;text-transform:uppercase;
                               letter-spacing:0.8px;">Issued</span>
                </td>
                <td style="padding:13px 20px;">
                  <span style="font-size:14px;font-weight:600;color:#111827;">${issued}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:13px 20px;background:#f9fafb;">
                  <span style="font-size:11px;color:#6b7280;text-transform:uppercase;
                               letter-spacing:0.8px;">Certificate ID</span>
                </td>
                <td style="padding:13px 20px;">
                  <span style="font-size:13px;font-weight:600;color:#374151;
                               font-family:monospace;">${certShortId}</span>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;padding:4px 0 8px;">
              ${downloadBtn}
            </div>
          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;
                     border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This email was sent by <strong style="color:#6b7280;">Kumii Learning Hub</strong>.<br>
              Keep learning. Keep growing.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;

  try {
    const { data, error } = await getResend().emails.send({
      from:    FROM,
      to:      [to],
      subject: `🎉 Your "${courseTitle}" certificate is ready — Kumii Learning`,
      html,
    });

    if (error) {
      logger.warn('[email] Resend returned an error', { to, error });
    } else {
      logger.info('[email] Certificate email sent', { id: data?.id, to });
    }
  } catch (err) {
    logger.warn('[email] Failed to send certificate email', { to, message: err.message });
  }
}

module.exports = { sendCertificateEmail, sendRecordingEmail };

/* ── Recording available email ─────────────────────────────────────────────── */

/**
 * Send a "session recording is available" email to one participant.
 *
 * @param {object}   opts
 * @param {string}   opts.to              — recipient email
 * @param {string}   opts.recipientName   — first name / display name
 * @param {string}   opts.sessionTitle    — e.g. "KUMii Access To Market"
 * @param {string}   opts.sessionDate     — human-readable date string
 * @param {string}   opts.instructor      — instructor name
 * @param {Array}    opts.recordings      — Daily.co recording objects
 */
async function sendRecordingEmail({
  to,
  recipientName,
  sessionTitle,
  sessionDate,
  instructor,
  recordings = [],
}) {
  if (!to) {
    logger.warn('[email] sendRecordingEmail: no recipient — skipping');
    return;
  }

  /* ── Build recording rows ── */
  const recRows = recordings
    .map((r, i) => {
      const startDate = r.start_ts
        ? new Date(r.start_ts * 1000).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : 'Recording';
      const durationLabel = r.duration
        ? `${Math.floor(r.duration / 60)}m ${r.duration % 60}s`
        : '';
      const dlBtn = r.download_link
        ? `<a href="${r.download_link}"
               style="display:inline-block;padding:9px 22px;
                      background:#4f46e5;color:#ffffff;
                      text-decoration:none;border-radius:7px;
                      font-weight:700;font-size:13px;">
             ⬇ Download Recording ${recordings.length > 1 ? i + 1 : ''}
           </a>`
        : `<span style="color:#9ca3af;font-size:12px;">Processing — check back soon</span>`;

      return `
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;
                     font-size:14px;color:#374151;">
            ${startDate}${durationLabel ? ` &nbsp;·&nbsp; ${durationLabel}` : ''}
          </td>
          <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;text-align:right;">
            ${dlBtn}
          </td>
        </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Session Recording — ${sessionTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f1f5f9;padding:48px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="580" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#ffffff;border-radius:18px;overflow:hidden;
                    box-shadow:0 8px 32px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                     padding:36px 40px;text-align:center;">
            <div style="font-size:30px;font-weight:800;color:#ffffff;
                        letter-spacing:-0.5px;">Kumii</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.75);
                        letter-spacing:2.5px;text-transform:uppercase;
                        margin-top:6px;">Learning Hub</div>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#eef2ff;padding:24px 40px;text-align:center;
                     border-bottom:2px solid #c7d2fe;">
            <div style="font-size:44px;margin-bottom:10px;">🎬</div>
            <h1 style="margin:0 0 6px;font-size:21px;font-weight:800;color:#3730a3;">
              Your session recording is ready
            </h1>
            <p style="margin:0;font-size:14px;color:#4b5563;">
              <strong>${sessionTitle}</strong>${sessionDate ? ` &nbsp;·&nbsp; ${sessionDate}` : ''}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#374151;">
              Hi ${recipientName ? `<strong>${recipientName}</strong>` : 'there'},
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#374151;">
              The recording for
              <strong>${sessionTitle}</strong>${instructor ? ` hosted by <strong>${instructor}</strong>` : ''}
              is now available. Use the link${recordings.length > 1 ? 's' : ''} below to download
              ${recordings.length > 1 ? 'your copies' : 'your copy'}.
            </p>

            <!-- Recordings table -->
            <table cellpadding="0" cellspacing="0" width="100%"
                   style="border:1px solid #e5e7eb;border-radius:10px;
                          overflow:hidden;margin:0 0 28px;">
              ${recRows || `
              <tr>
                <td colspan="2" style="padding:20px;text-align:center;
                                        font-size:14px;color:#9ca3af;">
                  Recording link will be available shortly.
                </td>
              </tr>`}
            </table>

            <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
              Download links expire after 6 hours. If you need a fresh link,
              please contact your session administrator.
            </p>
          </td>
        </tr>

        <!-- Footer with Kumii logo -->
        <tr>
          <td style="background:#f9fafb;padding:28px 40px;text-align:center;
                     border-top:1px solid #f1f5f9;">
            ${logoFooterHtml}
            <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Sent by <strong style="color:#6b7280;">Kumii Learning Hub</strong>.<br>
              Keep learning. Keep growing.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;

  try {
    const { data, error } = await getResend().emails.send({
      from:    FROM,
      to:      [to],
      subject: `🎬 Recording available: "${sessionTitle}" — Kumii Learning`,
      html,
    });

    if (error) {
      logger.warn('[email] sendRecordingEmail: Resend error', { to, error });
    } else {
      logger.info('[email] Recording email sent', { id: data?.id, to });
    }
  } catch (err) {
    logger.warn('[email] sendRecordingEmail: failed', { to, message: err.message });
    throw err;
  }
}