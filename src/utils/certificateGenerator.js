/**
 * src/utils/certificateGenerator.js
 *
 * Generates a professional, consistent PDF certificate using PDFKit.
 * OpenAI GPT-4o provides a short personalised congratulatory message.
 *
 * Layout (A4 landscape):
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  [gold border frame]                                        │
 *   │  [partner logo left top-left]    [partner logo right top-right] │
 *   │                                                             │
 *   │         CERTIFICATE OF COMPLETION                          │
 *   │                                                             │
 *   │         This is to certify that                             │
 *   │         [Learner Full Name]                                 │
 *   │         has successfully completed                          │
 *   │         [Course Name]                                       │
 *   │                                                             │
 *   │  [OpenAI personalised message]                              │
 *   │                                                             │
 *   │  Category: …   Est. Hours: …   Issued: …                   │
 *   │                                                             │
 *   │  [Kumii logo bottom-left]   ___________                     │
 *   │                              Date                           │
 *   └─────────────────────────────────────────────────────────────┘
 */

'use strict';

const path   = require('path');
const PDFDoc = require('pdfkit');
const OpenAI = require('openai');

const LOGO_PATH = path.resolve(__dirname, '../../Kumii-logo.png');

// Lazy singleton — avoids crashing at module load when OPENAI_API_KEY is not set.
// The OpenAI SDK v4 throws immediately in the constructor if the key is missing,
// which would cause every Vercel serverless invocation to fail on startup.
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'missing' });
  }
  return _openai;
}

/* ── colour palette ─────────────────────────────────────────────────────── */
const C = {
  gold:       '#c9a84c',
  goldLight:  '#f0d080',
  navy:       '#0f2d5e',
  darkText:   '#1a1a2e',
  midGrey:    '#64748b',
  lightGrey:  '#f8f9fa',
  white:      '#ffffff',
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

async function getPersonalisedMessage(learnerName, courseTitle, category) {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OpenAI timeout')), 7_000)
    );
    const chat = await Promise.race([
      getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 60,
        messages: [
          {
            role: 'system',
            content:
              'You write short, warm, professional congratulatory sentences for course completion certificates. ' +
              'One sentence only. No quotes. No hashtags. No emojis.',
          },
          {
            role: 'user',
            content:
              `Write a one-sentence congratulatory message for ${learnerName} who just completed ` +
              `"${courseTitle}" in the ${category || 'professional development'} category.`,
          },
        ],
      }),
      timeout,
    ]);
    return chat.choices[0]?.message?.content?.trim() ?? '';
  } catch (_) {
    return `Congratulations on completing ${courseTitle} — a significant achievement in your professional journey.`;
  }
}

/* ── main export ─────────────────────────────────────────────────────────── */
/**
 * Generate a certificate PDF and return it as a Buffer.
 *
 * @param {object} opts
 * @param {string} opts.learnerName      Full name of the learner
 * @param {string} opts.courseTitle      Title of the completed course
 * @param {string} opts.category         Course category
 * @param {number} opts.estimatedHours   Estimated course hours
 * @param {string} opts.issuedAt         ISO date string
 * @param {string} opts.certificateId    UUID for the certificate
 * @param {string|null} opts.logoLeftUrl  URL of partner logo for top-left (optional)
 * @param {string|null} opts.logoRightUrl URL of partner logo for top-right (optional)
 * @returns {Promise<Buffer>}
 */
async function generateCertificatePdf({
  learnerName,
  courseTitle,
  category,
  estimatedHours,
  issuedAt,
  certificateId,
  logoLeftUrl  = null,
  logoRightUrl = null,
}) {
  const message = await getPersonalisedMessage(learnerName, courseTitle, category);

  // Pre-fetch partner logo buffers (they are remote URLs).
  // Follows up to 5 redirects, validates HTTP 200, and returns null on any failure.
  async function fetchLogoBuffer(url, _redirects = 0) {
    if (!url) return null;
    if (_redirects > 5) return null;
    try {
      const https = require('https');
      const http  = require('http');
      return await new Promise((res, rej) => {
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, (response) => {
          // Follow redirects (301 / 302 / 307 / 308)
          if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
            response.resume(); // drain to free the socket
            fetchLogoBuffer(response.headers.location, _redirects + 1).then(res).catch(() => res(null));
            return;
          }
          // Only accept a successful response
          if (response.statusCode !== 200) {
            response.resume();
            return res(null);
          }
          const chunks = [];
          response.on('data', (c) => chunks.push(c));
          response.on('end',  () => res(Buffer.concat(chunks)));
          response.on('error', rej);
        }).on('error', rej);
      });
    } catch (_) {
      return null;
    }
  }

  const [logoLeftBuf, logoRightBuf] = await Promise.all([
    fetchLogoBuffer(logoLeftUrl),
    fetchLogoBuffer(logoRightUrl),
  ]);

  return new Promise((resolve, reject) => {
    const buffers = [];
    // A4 landscape
    const doc = new PDFDoc({
      size:   [841.89, 595.28],
      margin: 0,
      info: {
        Title:  `Certificate of Completion — ${courseTitle}`,
        Author: 'Kumii Learning',
      },
    });

    doc.on('data',  (chunk) => buffers.push(chunk));
    doc.on('end',   () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = 841.89;
    const H = 595.28;
    const M = 32;          // outer border margin
    const PAD = 52;        // inner horizontal padding for text

    /* ─────────────────────────────────────────────────────────────────
       ZONE MAP  (all Y values are absolute from top of page)
       ─────────────────────────────────────────────────────────────────
       y=32            outer border top / top gold band
       y=38 – 118      LOGO ZONE  (80px tall, vertically centred logos)
       y=122           thin separator rule
       y=134 – 192     "KUMII LEARNING" + "CERTIFICATE OF COMPLETION"
       y=196           decorative centre rule
       y=210 – 370     learner name / course / message block
       y=380           meta strip separator  ← pushed up from bottom
       y=390 – 430     meta columns
       y=440 – 470     signature + Kumii logo
       y=H-38          bottom gold band / outer border bottom
    ───────────────────────────────────────────────────────────────── */

    const LOGO_ZONE_TOP    = M + 6;   // just below top gold band
    const LOGO_ZONE_H      = 80;      // height reserved exclusively for logos
    const LOGO_ZONE_BOTTOM = LOGO_ZONE_TOP + LOGO_ZONE_H;
    const CONTENT_TOP      = LOGO_ZONE_BOTTOM + 16; // first text starts here

    // Meta strip sits at a fixed absolute position, leaving a generous gap
    // before the Kumii logo / signature zone at the very bottom.
    const META_TOP       = 415;                   // absolute Y — meta separator line
    const BOTTOM_ZONE_Y  = H - M - 6 - 46;       // ≈ 511 — Kumii logo + sig baseline

    /* ── Background ────────────────────────────────────────────────── */
    doc.rect(0, 0, W, H).fill(C.white);

    /* ── Outer gold border ──────────────────────────────────────────── */
    doc.rect(M, M, W - M * 2, H - M * 2)
       .lineWidth(3).strokeColor(C.gold).stroke();

    /* ── Inner gold border (inset 8px) ─────────────────────────────── */
    doc.rect(M + 8, M + 8, W - (M + 8) * 2, H - (M + 8) * 2)
       .lineWidth(1).strokeColor(C.goldLight).stroke();

    /* ── Top gold band ──────────────────────────────────────────────── */
    doc.rect(M, M, W - M * 2, 6).fill(C.gold);

    /* ── Bottom gold band ───────────────────────────────────────────── */
    doc.rect(M, H - M - 6, W - M * 2, 6).fill(C.gold);

    /* ══════════════════════════════════════════════════════════════════
       LOGO ZONE  — 80px tall strip, logos vertically centred
       Uses `cover` via explicit width constraint to avoid PDFKit's
       double-render bug with certain PNG ICC profiles when using `fit`.
    ══════════════════════════════════════════════════════════════════ */
    const logoMaxH = 48;
    const logoMaxW = 180;
    const logoY    = LOGO_ZONE_TOP + (LOGO_ZONE_H - logoMaxH) / 2;

    /* Partner logo — left */
    if (logoLeftBuf) {
      try {
        doc.image(logoLeftBuf, PAD, logoY, { width: logoMaxW, height: logoMaxH });
      } catch (_) { /* skip on decode error */ }
    }

    /* Partner logo — right  /  fallback award seal */
    if (logoRightBuf) {
      try {
        doc.image(logoRightBuf, W - PAD - logoMaxW, logoY, { width: logoMaxW, height: logoMaxH });
      } catch (_) { /* skip on decode error */ }
    } else {
      /* Programmatic award seal (only when no right logo supplied) */
      const sx = W - PAD - 36;
      const sy = LOGO_ZONE_TOP + LOGO_ZONE_H / 2;
      doc.circle(sx, sy, 24).lineWidth(2).strokeColor(C.gold).stroke();
      doc.circle(sx, sy, 17).lineWidth(1.5).strokeColor(C.goldLight).stroke();
      doc.moveTo(sx - 10, sy + 20).lineTo(sx - 15, sy + 40)
         .lineTo(sx, sy + 30).lineTo(sx + 15, sy + 40).lineTo(sx + 10, sy + 20)
         .lineWidth(0).fillColor(C.gold).fill();
      doc.font('Helvetica-Bold').fontSize(16).fillColor(C.gold)
         .text('★', sx - 9, sy - 11, { width: 18 });
    }

    /* ── Thin separator under logo zone ────────────────────────────── */
    doc.moveTo(M + 20, LOGO_ZONE_BOTTOM + 4)
       .lineTo(W - M - 20, LOGO_ZONE_BOTTOM + 4)
       .lineWidth(0.5).strokeColor(C.goldLight).stroke();

    /* ══════════════════════════════════════════════════════════════════
       HEADER TEXT  — starts at CONTENT_TOP, well below logos
    ══════════════════════════════════════════════════════════════════ */
    doc.font('Helvetica-Bold').fontSize(10)
       .fillColor(C.gold).fillOpacity(1)
       .text('KUMII LEARNING', 0, CONTENT_TOP, { align: 'center', width: W });

    doc.font('Helvetica-Bold').fontSize(26)
       .fillColor(C.navy)
       .text('CERTIFICATE OF COMPLETION', 0, CONTENT_TOP + 18, { align: 'center', width: W });

    /* ── Decorative rule ────────────────────────────────────────────── */
    const ruleY = CONTENT_TOP + 58;
    doc.moveTo(W / 2 - 120, ruleY).lineTo(W / 2 + 120, ruleY)
       .lineWidth(1).strokeColor(C.gold).stroke();
    doc.circle(W / 2, ruleY, 3).fill(C.gold);

    /* ── "This is to certify that" ──────────────────────────────────── */
    doc.font('Helvetica').fontSize(12).fillColor(C.midGrey)
       .text('This is to certify that', 0, ruleY + 12, { align: 'center', width: W });

    /* ── Learner name ───────────────────────────────────────────────── */
    doc.font('Helvetica-Bold').fontSize(28)
       .fillColor(C.darkText)
       .text(learnerName, 0, ruleY + 32, { align: 'center', width: W });

    /* ── Signature rule under name ──────────────────────────────────── */
    const nameRuleY = ruleY + 70;
    doc.moveTo(W / 2 - 160, nameRuleY).lineTo(W / 2 + 160, nameRuleY)
       .lineWidth(0.5).strokeColor(C.gold).stroke();

    /* ── "has successfully completed" ──────────────────────────────── */
    doc.font('Helvetica').fontSize(11).fillColor(C.midGrey)
       .text('has successfully completed', 0, nameRuleY + 7, { align: 'center', width: W });

    /* ── Course name ────────────────────────────────────────────────── */
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.navy)
       .text(courseTitle, 0, nameRuleY + 25, {
         align: 'center', width: W,
         ellipsis: true,
       });

    /* ── Personalised message ───────────────────────────────────────── */
    const msgInset = PAD + 60;
    doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(C.midGrey)
       .text(`"${message}"`, msgInset, nameRuleY + 50,
         { align: 'center', width: W - msgInset * 2 });

    /* ══════════════════════════════════════════════════════════════════
       META STRIP  — fixed at y=415, well above the bottom logo zone
    ══════════════════════════════════════════════════════════════════ */
    doc.rect(M + 8, META_TOP, W - (M + 8) * 2, 1).fill(C.goldLight);

    const metaItems = [
      { label: 'Category',        value: category || '—' },
      { label: 'Estimated Hours', value: estimatedHours ? `${estimatedHours}h` : '—' },
      { label: 'Issued',          value: fmtDate(issuedAt) },
      { label: 'Certificate ID',  value: certificateId.slice(0, 8).toUpperCase() },
    ];

    const colW = (W - PAD * 2) / metaItems.length;
    metaItems.forEach(({ label, value }, i) => {
      const cx = PAD + i * colW;
      doc.font('Helvetica').fontSize(7.5).fillColor(C.midGrey)
         .text(label.toUpperCase(), cx, META_TOP + 8, { width: colW - 4, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.darkText)
         .text(value, cx, META_TOP + 20, { width: colW - 4, align: 'center' });
    });

    /* ══════════════════════════════════════════════════════════════════
       BOTTOM ZONE  — Kumii logo (left) + authorised signature (right)
       Both anchored at BOTTOM_ZONE_Y ≈ 511, ~60px below meta strip end
    ══════════════════════════════════════════════════════════════════ */

    /* ── Kumii logo — bottom left ───────────────────────────────────── */
    try {
      doc.image(LOGO_PATH, PAD, BOTTOM_ZONE_Y, { height: 24, width: 90 });
    } catch (_) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navy)
         .text('KUMII', PAD, BOTTOM_ZONE_Y + 4);
    }

    /* ── Authorised signature — bottom right ────────────────────────── */
    const sigLineX1 = W - PAD - 210;
    const sigLineX2 = W - PAD;
    const sigLineY  = BOTTOM_ZONE_Y + 20;
    doc.moveTo(sigLineX1, sigLineY).lineTo(sigLineX2, sigLineY)
       .lineWidth(0.5).strokeColor(C.midGrey).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(C.midGrey)
       .text('Kumii Learning  ·  Authorised Signature',
         sigLineX1, sigLineY + 4,
         { width: sigLineX2 - sigLineX1, align: 'right' });

    doc.end();
  });
}

module.exports = { generateCertificatePdf };
