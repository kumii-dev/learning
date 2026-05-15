/**
 * server.js — Express entry point for the Kumii Learning Hub backend.
 * Handles all API routes, middleware, and server startup.
 */

'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./src/utils/logger');

// ── Route imports ────────────────────────────────────────────────────────────
const coursesRouter       = require('./src/api/routes/courses');
const enrolmentsRouter    = require('./src/api/routes/enrolments');
const myLearningRouter    = require('./src/api/routes/myLearning');
const assessmentsRouter   = require('./src/api/routes/assessments');
const gradingRouter       = require('./src/api/routes/grading');
const certificatesRouter  = require('./src/api/routes/certificates');
const cmsRouter           = require('./src/cms/routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    // CSP is handled by Next.js headers config for the frontend.
    // The Express API doesn't serve HTML so we keep it minimal.
    contentSecurityPolicy: false,
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) or listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// ── Global rate limiting ─────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Request logging ──────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/courses',      coursesRouter);
app.use('/api/enrolments',   enrolmentsRouter);
app.use('/api/my-learning',  myLearningRouter);
app.use('/api/assessments',  assessmentsRouter);
app.use('/api/grading',      gradingRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/cms',          cmsRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Kumii Learning Hub API listening on port ${PORT}`);
});

module.exports = app; // for testing
