'use strict';

// Client Supabase minimale: usa la REST API con la service role key.
// Nessuna dipendenza npm -> meno superficie di attacco e deploy piu' veloce.

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY non configurate');
  }
  return { url: url.replace(/\/$/, ''), key };
}

async function request(path, { method = 'GET', body, prefer, headers: extraHeaders } = {}) {
  const { url, key } = config();

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  Object.assign(headers, extraHeaders || {});

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch (e) { payload = text; }
  }

  if (!response.ok) {
    const err = new Error(`Supabase ${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// Conteggio esatto senza scaricare le righe (header Content-Range).
async function count(table, query = 'select=id') {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    method: 'HEAD',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
      'Range-Unit': 'items',
      Range: '0-0',
    },
  });
  const range = response.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

function insert(table, row) {
  return request(table, { method: 'POST', body: row, prefer: 'return=representation' });
}

function select(table, query) {
  return request(`${table}?${query}`);
}

module.exports = { insert, select, count, request };
