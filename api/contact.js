'use strict';

// POST /api/contact
// Salva il messaggio dal form contatti su Supabase.
// Nessun invio email: i messaggi si leggono dal pannello Supabase
// (Table Editor > contact_messages).

const { preflight, setCors, json, methodNotAllowed, readBody, clientIp } = require('../lib/http');
const { validateContact, looksLikeSpam } = require('../lib/validate');
const { rateLimit } = require('../lib/rate-limit');
const { insert } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  setCors(req, res);

  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  const limit = rateLimit(`contact:${clientIp(req)}`, { max: 4, windowMs: 60_000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return json(res, 429, { ok: false, error: 'too_many_requests' });
  }

  const body = readBody(req);
  if (!body) return json(res, 400, { ok: false, error: 'invalid_body' });

  if (looksLikeSpam(body)) return json(res, 200, { ok: true });

  const { errors, value } = validateContact(body);
  if (errors.length) return json(res, 422, { ok: false, error: 'validation_failed', fields: errors });

  try {
    await insert('contact_messages', {
      name: value.name,
      email: value.email,
      topic: value.topic,
      message: value.message,
      privacy_consent: true,
    });
  } catch (err) {
    console.error('contact insert failed', err);
    return json(res, 500, { ok: false, error: 'storage_unavailable' });
  }

  return json(res, 200, { ok: true });
};
