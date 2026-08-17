import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/platform/db.js';
import { startServer, resetDb } from './helpers.js';

before(async () => {
  await resetDb();
});

after(async () => {
  await pool.end();
});

test('CORS: OPTIONS preflight with production origin https://cinemaseat.vercel.app', async (t) => {
  const { baseUrl } = await startServer(t);

  const res = await fetch(`${baseUrl}/api/movies`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://cinemaseat.vercel.app',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type,Accept',
    },
  });

  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://cinemaseat.vercel.app');
  assert.ok(res.headers.get('access-control-allow-methods')?.includes('GET'));
  assert.ok(res.headers.get('access-control-allow-methods')?.includes('POST'));
});

test('CORS: standard GET request with Origin: https://cinemaseat.vercel.app', async (t) => {
  const { baseUrl } = await startServer(t);

  const res = await fetch(`${baseUrl}/api/movies`, {
    method: 'GET',
    headers: {
      Origin: 'https://cinemaseat.vercel.app',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://cinemaseat.vercel.app');
  const data = await res.json();
  assert.ok(Array.isArray(data.movies));
});

test('CORS: local development origin (e.g. localhost:5173) is allowed', async (t) => {
  const { baseUrl } = await startServer(t);

  const res = await fetch(`${baseUrl}/api/movies`, {
    method: 'GET',
    headers: {
      Origin: 'http://localhost:5173',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});
