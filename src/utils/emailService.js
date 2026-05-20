/**
 * src/utils/emailService.js
 * Resend-backed transactional email service.
 *
 * Env vars:
 *   Resend_API_Key  — Resend secret key
 *   FROM_EMAIL      — "From" address (default: onboarding@resend.dev for sandbox)
 */

'use strict';

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

module.exports = { sendCertificateEmail };
