'use strict';

// Rate limiting "best effort" in memoria.
//
// In un ambiente serverless ogni istanza ha la sua memoria: questo limita
// gli abusi ripetuti sulla stessa istanza ma NON e' una difesa distribuita.
// Per un pilota da poche centinaia di iscrizioni e' piu' che sufficiente.
// Se in futuro servisse una protezione reale: Vercel Firewall o Upstash Redis.

const BUCKETS = new Map();

function prune(now) {
  if (BUCKETS.size < 5000) return;
  for (const [key, entry] of BUCKETS) {
    if (entry.resetAt <= now) BUCKETS.delete(key);
  }
}

function rateLimit(key, { max = 8, windowMs = 60_000 } = {}) {
  const now = Date.now();
  prune(now);

  const entry = BUCKETS.get(key);
  if (!entry || entry.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true, remaining: max - entry.count, retryAfter: 0 };
}

function reset() {
  BUCKETS.clear();
}

module.exports = { rateLimit, reset };
