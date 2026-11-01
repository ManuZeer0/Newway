'use strict';

// Utility HTTP condivise dalle funzioni serverless.

function setCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.origin || '';
  if (allowed.length === 0 || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function preflight(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

function methodNotAllowed(req, res, allowed) {
  setCors(req, res);
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { ok: false, error: 'method_not_allowed' });
}

// Vercel popola req.body se il Content-Type e' application/json.
function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') return null;
  return body;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
}

module.exports = { setCors, json, preflight, methodNotAllowed, readBody, clientIp };
