// Servidor local que imita a Vercel: serve /public e as funções de /api.
//   npm run dev        → usa o ClickUp real (lê .env)
//   npm run dev:mock   → usa um ClickUp falso em memória (não precisa de token)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { getConfig } from './lib/config.js';
import { createFakeClickUp } from './mock/fake-clickup.js';
import * as webhook from './api/webhook.js';
import * as agenda from './api/agenda.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const MOCK = process.env.MOCK === '1';
const PORT = Number(process.env.PORT || 3000);

const deps = MOCK
  ? { cu: createFakeClickUp(), cfg: getConfig({ ...process.env, CLICKUP_LIST_IDS: 'L1', CLICKUP_WEBHOOK_SECRET: 'dev' }) }
  : {};
const routes = { '/api/webhook': webhook, '/api/agenda': agenda };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const mod = routes[url.pathname];

  if (mod) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, {
      method: req.method, headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const handler = mod[req.method];
    const response = handler ? await handler(request, deps) : new Response('Method Not Allowed', { status: 405 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
  }

  const file = join('public', url.pathname === '/' || url.pathname === '/agenda' ? 'index.html' : url.pathname);
  try {
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`Agenda VOLUTA em http://localhost:${PORT} ${MOCK ? '(modo mock)' : ''}`));
