import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SqliteBucket } from './storage.mjs';
import { loginPage, registerPage, connectionsPage, mcpSettingsPage, accountPage, adminPage } from './pages.mjs';
import { PerformanceMonitor } from './performance.mjs';
import { executionLane, WriteExecutor } from './execution.mjs';
import { ReadService } from './read-service.mjs';
import { OwnerOAuth } from './oauth.mjs';
import { Accounts, AccountError } from './accounts.mjs';

export function configuration(env = process.env) {
  const token = env.APP_AUTH_TOKEN;
  if (typeof token !== 'string' || token.length < 32 || /[\s:]/.test(token)) throw new Error('APP_AUTH_TOKEN must be at least 32 characters, without whitespace or colons.');
  if (!/^[a-f0-9]{64}$/.test(env.MANAGER_TOKEN_ENCRYPTION_KEY ?? '')) throw new Error('MANAGER_TOKEN_ENCRYPTION_KEY must be 64 lowercase hex characters.');
  const managerBase = new URL(env.MANAGER_API_BASE);
  if (managerBase.protocol !== 'https:' || managerBase.username || managerBase.password || managerBase.search || managerBase.hash || !/^\/api2\/?$/.test(managerBase.pathname)) throw new Error('MANAGER_API_BASE must be a HTTPS URL ending in /api2, without credentials or query parameters.');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  const origin = new URL(env.PUBLIC_URL || (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${port}`));
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('PUBLIC_URL must be an HTTP(S) origin without a path or credentials.');
  if (env.RAILWAY_ENVIRONMENT_ID && origin.protocol !== 'https:') throw new Error('Configure a HTTPS PUBLIC_URL or generate a Railway domain.');
  const dataDir = resolve(env.DATA_DIR || env.RAILWAY_VOLUME_MOUNT_PATH || './data');
  if (env.RAILWAY_ENVIRONMENT_ID) {
    if (!env.RAILWAY_VOLUME_MOUNT_PATH) throw new Error('Attach a Railway persistent volume before starting this service.');
    const location = relative(resolve(env.RAILWAY_VOLUME_MOUNT_PATH), dataDir);
    if (location.startsWith('..') || isAbsolute(location)) throw new Error('DATA_DIR must be inside the Railway volume.');
  }
  const user = env.APP_USER_ID || 'railway-owner';
  if (user.length > 200 || /[\r\n]/.test(user)) throw new Error('Invalid APP_USER_ID');
  const adminUsername = env.APP_ADMIN_USERNAME || 'admin';
  if (!/^[A-Za-z0-9._@+-]{3,100}$/.test(adminUsername)) throw new Error('Invalid APP_ADMIN_USERNAME');
  if (env.APP_LEGACY_BEARER && !['on', 'off'].includes(env.APP_LEGACY_BEARER)) throw new Error('APP_LEGACY_BEARER must be on or off.');
  // During the transition APP_AUTH_TOKEN still works as a Bearer/Basic credential for the admin.
  const legacyBearer = env.APP_LEGACY_BEARER !== 'off';
  return { token, key: env.MANAGER_TOKEN_ENCRYPTION_KEY, port, origin: origin.origin, dataDir, user, adminUsername, legacyBearer, managerBase: managerBase.href };
}

function equal(a, b) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

function masterCredential(value, config) {
  if (!config.legacyBearer || typeof value !== 'string') return false;
  if (value.startsWith('Bearer ')) return equal(value.slice(7), config.token);
  if (value.startsWith('Basic ')) return equal(Buffer.from(value.slice(6), 'base64').toString('utf8'), `admin:${config.token}`);
  return false;
}

function reply(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(body));
}

function html(res, content) {
  res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
  res.end(content);
}

const redirect = (res, location) => { res.writeHead(303, { Location: location, 'Cache-Control': 'no-store' }); res.end(); };

async function readJson(req, limit = 4096) {
  let body = '', bytes = 0;
  for await (const part of req) { bytes += part.length; if (bytes > limit) throw new AccountError('Request body too large', 413); body += part.toString('utf8'); }
  try { const value = body ? JSON.parse(body) : {}; if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0; return value; }
  catch { throw new AccountError('Invalid JSON request.'); }
}

export function createApplication(config, bucket = new SqliteBucket(join(config.dataDir, 'managerio.sqlite')), monitor = new PerformanceMonitor()) {
  bucket.assertEncryptionKey(config.key);
  const accounts = new Accounts(config, bucket.db);
  const oauth = new OwnerOAuth(config, bucket, accounts);
  const reads = new ReadService(config, bucket, monitor);
  const writes = new WriteExecutor(config);
  let stopping = false;
  const cookieName = 'evertrust_session';
  // Lax so the OAuth consent page sees the session when a client opens it from another site.
  // State-changing requests still require this exact Origin.
  const cookie = (value, maxAge) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.origin.startsWith('https:') ? '; Secure' : ''}`;
  const sessionId = req => (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const namespace = id => createHash('sha256').update(id).digest('hex');
  const countConnections = id => bucket.db.prepare('SELECT count(*) AS n FROM objects WHERE substr(key,1,?)=?').get(15 + 64 + 1, `connections-v2/${namespace(id)}/`).n;
  const access = userId => ({ tokens: accounts.tokens(userId), apps: oauth.grants(userId) });

  // Account, token and admin endpoints. Only browser sessions and the legacy master
  // credential reach them; personal tokens and OAuth tokens are limited to /mcp.
  async function accountApi(req, res, url, who, session) {
    const path = url.pathname, method = req.method, user = who.user;
    if (path === '/api/auth/me' && method === 'GET') return reply(res, 200, { user: accounts.publicUser(user) });
    if (path === '/api/auth/password' && method === 'POST') {
      const body = await readJson(req);
      await accounts.changePassword(user, body.current_password, body.new_password, session);
      return reply(res, 200, { changed: true });
    }
    if (path === '/api/tokens' && method === 'GET') return reply(res, 200, access(user.id));
    if (path === '/api/tokens' && method === 'POST') {
      const body = await readJson(req);
      return reply(res, 201, accounts.createToken(user, body.name, body.expires_days ?? null));
    }
    let m = /^\/api\/tokens\/([\w-]{1,64})$/.exec(path);
    if (m && method === 'DELETE') return reply(res, accounts.revokeToken(user.id, m[1]) ? 200 : 404, { revoked: true });
    m = /^\/api\/oauth\/grants\/([\w-]{1,64})$/.exec(path);
    if (m && method === 'DELETE') return reply(res, oauth.revokeGrant(user.id, m[1]) ? 200 : 404, { revoked: true });
    if (path.startsWith('/api/admin/')) {
      if (user.role !== 'admin') return reply(res, 403, { error: 'Administrator access required.' });
      if (path === '/api/admin/users' && method === 'GET') return reply(res, 200, { users: accounts.users(countConnections) });
      m = /^\/api\/admin\/users\/([\w-]{1,210})(?:\/(access|tokens\/([\w-]{1,64})|grants\/([\w-]{1,64})))?$/.exec(path);
      if (!m || !accounts.get(m[1])) return reply(res, 404, { error: 'User not found.' });
      if (!m[2] && method === 'POST') { const body = await readJson(req); return reply(res, 200, await accounts.adminAction(user, m[1], body.action)); }
      if (m[2] === 'access' && method === 'GET') return reply(res, 200, access(m[1]));
      if (m[3] && method === 'DELETE') return reply(res, accounts.revokeToken(m[1], m[3]) ? 200 : 404, { revoked: true });
      if (m[4] && method === 'DELETE') return reply(res, oauth.revokeGrant(m[1], m[4]) ? 200 : 404, { revoked: true });
    }
    return null;
  }

  const server = createServer((req, res) => monitor.request(req, res, async () => {
    try {
      // Build links and CSRF checks from configured origin, never from Host/forwarded headers.
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) return reply(res, 400, { error: 'Invalid request URL' });
      const url = new URL(req.url, config.origin);
      if (url.origin !== config.origin) return reply(res, 400, { error: 'Invalid request URL' });
      if (url.pathname === '/healthz' && ['GET', 'HEAD'].includes(req.method)) {
        return reply(res, stopping || !bucket.healthy() ? 503 : 200, { status: stopping ? 'stopping' : 'ok' });
      }
      if (stopping) return reply(res, 503, { error: 'Service is stopping' });
      accounts.cleanup();
      const session = sessionId(req);
      const sessionUser = accounts.session(session);
      if (await oauth.handle(req, res, url, sessionUser)) return;

      // Resolve who is calling. Personal and OAuth tokens only reach /mcp; the browser
      // entry pages need a real session (a cached Basic challenge does not count).
      const authorization = req.headers.authorization;
      const browserEntry = ['/', '/login', '/register', '/mcp-settings', '/account', '/admin'].includes(url.pathname);
      let who = null;
      if (sessionUser) who = { user: sessionUser, via: 'session' };
      else if (masterCredential(authorization, config) && (!browserEntry || authorization.startsWith('Bearer '))) who = { user: accounts.admin(), via: 'master' };
      else if (url.pathname === '/mcp') {
        const tokenUser = accounts.tokenUser(authorization) ?? oauth.authenticate(authorization);
        if (tokenUser) who = { user: tokenUser, via: 'token' };
      }
      if (who && who.user?.status !== 'active') who = null;

      const statePost = !['GET', 'HEAD'].includes(req.method);
      if (['/login', '/register'].includes(url.pathname) && req.method === 'GET') {
        if (who?.via === 'session') return redirect(res, '/');
        return html(res, url.pathname === '/login' ? loginPage : registerPage);
      }
      if (statePost && ['/login', '/logout', '/register'].includes(url.pathname) || url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/admin/') || url.pathname.startsWith('/api/tokens') || url.pathname.startsWith('/api/oauth/')) {
        if (statePost && req.headers.origin !== config.origin) return reply(res, 403, { error: 'Request origin is not allowed.' });
      }
      if (req.method === 'POST' && ['/login', '/api/auth/login'].includes(url.pathname)) {
        const body = await readJson(req);
        // The original password-only form signs in the admin account.
        const result = await accounts.login(body.username ?? config.adminUsername, body.password);
        if (session) accounts.logout(session);
        return reply(res, 200, { signed_in: true, user: result.user }, { 'Set-Cookie': cookie(result.session, result.maxAge) });
      }
      if (req.method === 'POST' && ['/register', '/api/auth/register'].includes(url.pathname)) {
        const body = await readJson(req);
        return reply(res, 201, { registered: true, user: await accounts.register(body.username, body.password) });
      }
      if (req.method === 'POST' && ['/logout', '/api/auth/logout'].includes(url.pathname)) {
        accounts.logout(session);
        return reply(res, 200, { signed_out: true }, { 'Set-Cookie': cookie('', 0) });
      }

      if (!who) {
        if (['/', '/mcp-settings', '/account', '/admin'].includes(url.pathname) && req.method === 'GET') return redirect(res, '/login');
        return reply(res, 401, { error: 'Authentication required' }, url.pathname === '/mcp' ? { 'WWW-Authenticate': oauth.challenge() } : {});
      }
      if (req.headers.origin && req.headers.origin !== config.origin) return reply(res, 403, { error: 'Request origin is not allowed.' });
      if (who.via === 'session' && statePost && req.headers.origin !== config.origin) return reply(res, 403, { error: 'Request origin is not allowed.' });
      if (who.via !== 'token' && url.pathname.startsWith('/api/')) {
        const handled = await accountApi(req, res, url, who, who.via === 'session' ? session : null);
        if (handled !== null) return;
      }
      if (['/api/performance', '/api/execution'].includes(url.pathname) && who.user.role !== 'admin') return reply(res, 403, { error: 'Administrator access required.' });
      if (url.pathname === '/api/performance' && req.method === 'GET') return reply(res, 200, monitor.summary());
      if (url.pathname === '/api/execution' && req.method === 'GET') return reply(res, 200, { mode: 'separate-write-thread', writes: writes.status() });
      if (url.pathname === '/' && req.method === 'GET') return html(res, connectionsPage);
      if (url.pathname === '/mcp-settings' && req.method === 'GET') return html(res, mcpSettingsPage(config));
      if (url.pathname === '/account' && req.method === 'GET') return html(res, accountPage);
      if (url.pathname === '/admin' && req.method === 'GET') return who.user.role === 'admin' ? html(res, adminPage) : redirect(res, '/');
      if (url.pathname === '/mcp' && req.method !== 'POST') return reply(res, 405, { error: 'This stateless MCP endpoint accepts POST only.' }, { Allow: 'POST' });
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (['authorization', 'host', 'connection', 'content-length', 'transfer-encoding', 'oai-authenticated-user-id'].includes(key) || key.startsWith('x-forwarded-')) continue;
        if (typeof value === 'string') headers.set(key, value);
      }
      // Never accept caller-supplied user identity. The authenticated user selects the namespace.
      headers.set('oai-authenticated-user-id', who.user.id);
      const maxBytes = 16 * 1024 * 1024;
      if (Number(req.headers['content-length']) > maxBytes) return reply(res, 413, { error: 'Request body too large' });
      const parts = [];
      let length = 0;
      for await (const part of req) {
        length += part.length;
        if (length > maxBytes) { reply(res, 413, { error: 'Request body too large' }); return; }
        parts.push(part);
      }
      const request = new Request(url, { method: req.method, headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(parts) } : {}) });
      const lane = await executionLane(request);
      monitor.lane(lane);
      let response;
      if (lane === 'write') {
        const result = await writes.execute(request);
        response = result.response;
        monitor.mergeExecution(result.metrics);
      } else {
        response = await reads.fetch(request);
      }
      const responseBody = Buffer.from(await response.arrayBuffer());
      monitor.responseBytes(responseBody.length);
      const responseHeaders = Object.fromEntries(response.headers);
      responseHeaders['cache-control'] = 'no-store';
      responseHeaders['x-content-type-options'] = 'nosniff';
      responseHeaders['referrer-policy'] = 'no-referrer';
      responseHeaders['server-timing'] = monitor.timing();
      responseHeaders['x-execution-lane'] = lane;
      res.writeHead(response.status, responseHeaders);
      res.end(req.method === 'HEAD' ? undefined : responseBody);
    } catch (error) {
      if (error instanceof AccountError) { if (!res.headersSent) reply(res, error.status, { error: error.message }); else res.end(); return; }
      // Log no credentials, request bodies, company records or upstream response content.
      console.error('HTTP request failed');
      if (!res.headersSent) reply(res, 500, { error: 'Request failed. Inspect the saved task before retrying a write.' });
      else res.end();
    }
  }));
  server.requestTimeout = 180_000;
  server.headersTimeout = 30_000;
  server.setTimeout(180_000);
  return { server, bucket, accounts, shutdown: () => {
    stopping = true;
    return new Promise((done, reject) => server.close(async error => {
      try { await writes.close(); bucket.close(); }
      catch (failure) { reject(failure); return; }
      if (error) reject(error); else done();
    }));
  } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const config = configuration();
    const app = createApplication(config);
    app.server.listen(config.port, '0.0.0.0', () => console.log(`Evertrust Books listening on port ${config.port}`));
    let shutdownStarted = false;
    const stop = () => {
      if (shutdownStarted) return;
      shutdownStarted = true;
      const deadline = setTimeout(() => process.exit(1), 110_000).unref();
      app.shutdown().then(() => { clearTimeout(deadline); process.exit(0); }, () => process.exit(1));
    };
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
