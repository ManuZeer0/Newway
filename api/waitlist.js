'use strict';

// POST /api/waitlist
// Iscrizione alla lista d'attesa. Idempotente: se l'email esiste gia'
// risponde comunque ok, senza rivelare nulla sull'anagrafica esistente.

const { preflight, setCors, json, methodNotAllowed, readBody, clientIp } = require('../lib/http');
const { validateWaitlist, looksLikeSpam } = require('../lib/validate');
const { rateLimit } = require('../lib/rate-limit');
const { insert, count } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  setCors(req, res);

  if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);

  const limit = rateLimit(`waitlist:${clientIp(req)}`, { max: 6, windowMs: 60_000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return json(res, 429, { ok: false, error: 'too_many_requests' });
  }

  const body = readBody(req);
  if (!body) return json(res, 400, { ok: false, error: 'invalid_body' });

  // Bot: risposta finta positiva, nessuna scrittura.
  if (looksLikeSpam(body)) return json(res, 200, { ok: true });

  const { errors, value } = validateWaitlist(body);
  if (errors.length) return json(res, 422, { ok: false, error: 'validation_failed', fields: errors });

  let created = true;
  try {
    await insert('waitlist', value);
  } catch (err) {
    const code = err && err.payload && err.payload.code;
    if (code === '23505') {
      created = false;
    } else {
      console.error('waitlist insert failed', err);
      return json(res, 500, { ok: false, error: 'storage_unavailable' });
    }
  }

  let position = null;
  try {
    position = await count('waitlist');
  } catch (err) {
    console.error('waitlist count failed', err);
  }

  return json(res, 200, { ok: true, alreadyRegistered: !created, position });
};
