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

  // Pre-fetch partner logo buffers (they are remote URLs)
  async function fetchLogoBuffer(url) {
    if (!url) return null;
    try {
      const https = require('https');
      const http  = require('http');
      return await new Promise((res, rej) => {
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, (response) => {
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
    const M = 32;          // outer margin
    const innerM = 52;     // inner text margin

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

    /* ── Partner logo left (top-left) ──────────────────────────────── */
    if (logoLeftBuf) {
      try {
        doc.image(logoLeftBuf, innerM, innerM + 14, { height: 44, fit: [160, 44] });
      } catch (_) { /* skip on decode error */ }
    }

    /* ── Partner logo right (top-right) ────────────────────────────── */
    if (logoRightBuf) {
      try {
        doc.image(logoRightBuf, W - innerM - 160, innerM + 14, { height: 44, fit: [160, 44] });
      } catch (_) { /* skip on decode error */ }
    } else {
      // Fallback: award seal drawn programmatically
      const sx = W - innerM - 36;
      const sy = innerM + 36;
      doc.circle(sx, sy, 22).lineWidth(2).strokeColor(C.gold).stroke();
      doc.circle(sx, sy, 16).lineWidth(1.5).strokeColor(C.goldLight).stroke();
      doc.moveTo(sx - 10, sy + 18).lineTo(sx - 14, sy + 36).lineTo(sx, sy + 28)
         .lineTo(sx + 14, sy + 36).lineTo(sx + 10, sy + 18)
         .lineWidth(0).fillColor(C.gold).fill();
      doc.font('Helvetica-Bold').fontSize(16).fillColor(C.gold)
         .text('★', sx - 8, sy - 10, { width: 16 });
    }

    /* ── Main headline ──────────────────────────────────────────────── */
    doc.font('Helvetica-Bold').fontSize(11)
       .fillColor(C.gold).fillOpacity(1)
       .text('KUMII LEARNING', 0, innerM + 28, { align: 'center', width: W });

    doc.moveDown(0.3);

    doc.font('Helvetica-Bold').fontSize(28)
       .fillColor(C.navy)
       .text('CERTIFICATE OF COMPLETION', 0, innerM + 56, { align: 'center', width: W });

    /* ── Decorative rule ────────────────────────────────────────────── */
    const ruleY = innerM + 100;
    const ruleX = W / 2 - 120;
    doc.moveTo(ruleX, ruleY).lineTo(ruleX + 240, ruleY)
       .lineWidth(1).strokeColor(C.gold).stroke();
    doc.circle(W / 2, ruleY, 3).fill(C.gold);

    /* ── "This is to certify that" ──────────────────────────────────── */
    doc.font('Helvetica').fontSize(13).fillColor(C.midGrey)
       .text('This is to certify that', 0, ruleY + 14, { align: 'center', width: W });

    /* ── Learner name ───────────────────────────────────────────────── */
    doc.font('Helvetica-Bold').fontSize(30)
       .fillColor(C.darkText)
       .text(learnerName, 0, ruleY + 36, { align: 'center', width: W });

    /* ── Signature rule under name ──────────────────────────────────── */
    const nameRuleY = ruleY + 76;
    doc.moveTo(W / 2 - 160, nameRuleY).lineTo(W / 2 + 160, nameRuleY)
       .lineWidth(0.5).strokeColor(C.gold).stroke();

    /* ── "has successfully completed" ──────────────────────────────── */
    doc.font('Helvetica').fontSize(12).fillColor(C.midGrey)
       .text('has successfully completed', 0, nameRuleY + 8, { align: 'center', width: W });

    /* ── Course name ────────────────────────────────────────────────── */
    doc.font('Helvetica-Bold').fontSize(17).fillColor(C.navy)
       .text(courseTitle, 0, nameRuleY + 28, {
         align: 'center', width: W,
         ellipsis: true,
       });

    /* ── Personalised message ───────────────────────────────────────── */
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.midGrey)
       .text(`"${message}"`, innerM + 80, nameRuleY + 60,
         { align: 'center', width: W - (innerM + 80) * 2 });

    /* ── Meta strip ─────────────────────────────────────────────────── */
    const metaY = H - M - 8 - 58;
    doc.rect(M + 8, metaY, W - (M + 8) * 2, 1).fill(C.goldLight);

    const metaItems = [
      { label: 'Category',       value: category || '—' },
      { label: 'Estimated Hours', value: estimatedHours ? `${estimatedHours}h` : '—' },
      { label: 'Issued',         value: fmtDate(issuedAt) },
      { label: 'Certificate ID', value: certificateId.slice(0, 8).toUpperCase() },
    ];

    const colW = (W - innerM * 2) / metaItems.length;
    metaItems.forEach(({ label, value }, i) => {
      const cx = innerM + i * colW;
      doc.font('Helvetica').fontSize(8).fillColor(C.midGrey)
         .text(label.toUpperCase(), cx, metaY + 10, { width: colW - 4, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.darkText)
         .text(value, cx, metaY + 22, { width: colW - 4, align: 'center' });
    });

    /* ── Bottom signature line ──────────────────────────────────────── */
    const sigY = H - M - 8 - 12;
    doc.moveTo(innerM + 80, sigY).lineTo(innerM + 220, sigY)
       .lineWidth(0.5).strokeColor(C.midGrey).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(C.midGrey)
       .text('Kumii Learning  ·  Authorised Signature', innerM + 80, sigY + 3,
         { width: 200, align: 'center' });

    /* ── Kumii logo (bottom-left) ───────────────────────────────────── */
    try {
      doc.image(LOGO_PATH, innerM, sigY - 38, { height: 32, fit: [120, 32] });
    } catch (_) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.navy)
         .text('KUMII', innerM, sigY - 22);
    }

    doc.end();
  });
}

module.exports = { generateCertificatePdf };
