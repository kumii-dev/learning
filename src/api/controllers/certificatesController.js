/**
 * src/api/controllers/certificatesController.js
 */
'use strict';

const certificatesService = require('../services/certificatesService');

const listMine = async (req, res, next) => {
  try {
    const certs = await certificatesService.getUserCertificates(req.user.id);
    res.json({ data: certs });
  } catch (err) { next(err); }
};

// Public verification endpoint — no auth required
const verify = async (req, res, next) => {
  try {
    const cert = await certificatesService.getCertificateById(req.params.id);
    res.json({ data: cert });
  } catch (err) { next(err); }
};

const downloadCertificate = async (req, res, next) => {
  try {
    // Always regenerate so the downloaded PDF reflects the latest template logos.
    const updated = await certificatesService.regeneratePdf(req.params.id, req.user.id);
    res.json({ url: updated.pdf_url });
  } catch (err) { next(err); }
};

module.exports = { listMine, verify, downloadCertificate };
