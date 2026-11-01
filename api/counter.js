'use strict';

// GET /api/counter
// Restituisce i posti prenotati mostrati in home:
// slot riservati (COUNTER_RESERVED) + iscrizioni reali.

const { preflight, setCors, json, methodNotAllowed } = require('../lib/http');
const { count } = require('../lib/supabase');

function intFromEnv(name, fallback) {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  setCors(req, res);

  if (req.method !== 'GET') return methodNotAllowed(req, res, ['GET']);

  const total = intFromEnv('COUNTER_TOTAL', 100);
  const reserved = Math.min(intFromEnv('COUNTER_RESERVED', 30), total);

  let signups = 0;
  try {
    signups = await count('waitlist');
  } catch (err) {
    console.error('counter count failed', err);
  }

  const value = Math.min(total, reserved + signups);
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
  return json(res, 200, { ok: true, value, total, percent, signups, reserved });
};
