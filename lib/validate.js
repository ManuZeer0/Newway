'use strict';

// Validazione e normalizzazione degli input.
// Regola: accettare il minimo indispensabile, rifiutare tutto il resto.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const LIMITS = {
  name: 80,
  email: 254,
  message: 4000,
  topic: 80,
  source: 40,
  consentVersion: 20,
};

function cleanString(value, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(CONTROL_CHARS, '').replace(/\r\n/g, '\n').trim();
  return cleaned.slice(0, maxLength);
}

function normalizeEmail(value) {
  return cleanString(value, LIMITS.email).toLowerCase();
}

function isValidEmail(email) {
  return EMAIL_RE.test(email) && email.length <= LIMITS.email;
}

// Blocca gli invii da form compilati dai bot: il campo "website" deve restare vuoto.
function looksLikeSpam(body) {
  const trap = body.website || body.honeypot || body._gotcha;
  return Boolean(trap && String(trap).trim().length > 0);
}

function validateWaitlist(body) {
  const errors = [];
  const email = normalizeEmail(body.email);
  const name = cleanString(body.name, LIMITS.name);

  if (!isValidEmail(email)) errors.push('email');
  if (body.privacy !== true) errors.push('consent_privacy');
  if (!name) errors.push('name');

  return {
    errors,
    value: {
      email,
      name,
      marketing_consent: body.marketing === true,
      privacy_consent: true,
      consent_version: cleanString(body.consentVersion, LIMITS.consentVersion) || '2026-10',
      source: cleanString(body.source, LIMITS.source) || 'landing',
    },
  };
}

function validateContact(body) {
  const errors = [];
  const email = normalizeEmail(body.email);
  const name = cleanString(body.name, LIMITS.name);
  const message = cleanString(body.message, LIMITS.message);
  const topic = cleanString(body.topic, LIMITS.topic) || 'Altro';

  if (!isValidEmail(email)) errors.push('email');
  if (!name) errors.push('name');
  if (message.length < 10) errors.push('message');
  if (body.privacy !== true) errors.push('consent_privacy');

  return { errors, value: { email, name, message, topic, privacy_consent: true } };
}

module.exports = {
  LIMITS,
  cleanString,
  normalizeEmail,
  isValidEmail,
  looksLikeSpam,
  validateWaitlist,
  validateContact,
};
