/**
 * src/utils/eventEmitter.js
 * Lightweight in-process event bus for domain events.
 * Consumers can subscribe to events and react (e.g., trigger certificate issuance).
 */

'use strict';

const { EventEmitter } = require('events');
const logger = require('./logger');

const emitter = new EventEmitter();
emitter.setMaxListeners(20);

/**
 * Supported domain events.
 */
const EVENTS = Object.freeze({
  COURSE_ENROLLED:       'course_enrolled',
  ASSESSMENT_SUBMITTED:  'assessment_submitted',
  ASSESSMENT_PASSED:     'assessment_passed',
  COURSE_COMPLETED:      'course_completed',
  CERTIFICATE_ISSUED:    'certificate_issued',
});

/**
 * Emit a domain event safely (never throws).
 * @param {string} event
 * @param {object} payload
 */
function emit(event, payload) {
  try {
    logger.info(`[Event] ${event}`, payload);
    emitter.emit(event, payload);
  } catch (err) {
    logger.error(`Event emission failed for ${event}`, { message: err.message });
  }
}

module.exports = { emitter, emit, EVENTS };
