import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration, createApplication } from '../server/index.mjs';

const password = randomBytes(32).toString('hex');
const key = randomBytes(32).toString('hex');
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const redirect = 'https://claude.example/callback';
async function start(dir, port = 0, token = password) {
  const settings = configuration({ APP_AUTH_TOKEN: token, MANAGER_TOKEN_ENCRYPTION_KEY: key, MANAGER_API_BASE: 'https://manager.example/api2', DATA_DIR: dir, PORT: String(port) });
  const app = createApplication(settings);
  await new Promise(done => app.server.listen(port, '127.0.0.1', done));
  settings.origin = `http://127.0.0.1:${app.server.address().port}`;
  return { ...app, origin: settings.origin };
}
const post = (app, path, data, headers = {}) => fetch(app.origin + path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams(data), redirect: 'manual' });
async function register(app, extra = {}) {
  const response = await fetch(app.origin + '/oauth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: '<Claude & ChatGPT>', redirect_uris: [redirect], ...extra }) });
  assert.equal(response.status, 201); return response.json();
}
// The consent page uses the shared login session; the original owner signs in as "admin".
async function session(app, username = 'admin', secret = password) {
  const response = await fetch(app.origin + '/api/auth/login', { method: 'POST', headers: { Origin: app.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: secret }) });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
}
async function consent(app, client, extra = {}, sessionCookie) {
  app.sessionCookie ??= await session(app);
  const login = sessionCookie ?? app.sessionCookie;
  const params = { client_id: client.client_id, redirect_uri: redirect, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', resource: app.origin + '/mcp', scope: 'mcp', state: 'client-state', ...extra };
  const response = await fetch(app.origin + '/oauth/authorize?' + new URLSearchParams(params), { headers: { Cookie: login }, redirect: 'manual' });
  const text = await response.text();
  const csrf = response.headers.get('set-cookie')?.split(';')[0];
  return { response, text, id: /name="request_id" value="([^"]+)"/.exec(text)?.[1], csrf, cookie: csrf + '; ' + login };
}
async function authorize(app, client, sessionCookie) {
  const pending = await consent(app, client, {}, sessionCookie);
  assert.equal(pending.response.status, 200);
  assert.equal(pending.response.headers.get('referrer-policy'), 'same-origin');
  assert.match(pending.response.headers.get('content-security-policy'), /form-action 'self' https:\/\/claude\.example;/);
  assert(pending.text.includes('&lt;Claude &amp; ChatGPT&gt;'));
  assert(!pending.text.includes(password));
  const response = await post(app, '/oauth/authorize', { request_id: pending.id, decision: 'allow' }, { Origin: app.origin, Cookie: pending.cookie });
  assert.equal(response.status, 303);
  const url = new URL(response.headers.get('location'));
  assert.equal(url.origin + url.pathname, redirect);
  assert.equal(url.searchParams.get('state'), 'client-state');
  assert.equal(url.searchParams.get('iss'), app.origin);
  return url.searchParams.get('code');
}
async function exchange(app, client, code, extra = {}) {
  return post(app, '/oauth/token', { grant_type: 'authorization_code', client_id: client.client_id, code, redirect_uri: redirect, resource: app.origin + '/mcp', code_verifier: verifier, ...extra });
}
const mcp = (app, access, method = 'tools/list') => fetch(app.origin + '/mcp', { method: 'POST', headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: {} }) });

test('OAuth discovery, DCR, explicit owner consent, PKCE, tool access, rotation and revocation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'evertrust-oauth-'));
  const app = await start(dir);
  try {
    const denied = await mcp(app, 'wrong');
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get('www-authenticate'), /resource_metadata=/);
    const metadata = await (await fetch(app.origin + '/.well-known/oauth-authorization-server')).json();
    assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']);
    assert.equal(metadata.client_id_metadata_document_supported, undefined);
    const resource = await (await fetch(app.origin + '/.well-known/oauth-protected-resource/mcp')).json();
    assert.equal(resource.resource, app.origin + '/mcp');
    const client = await register(app);
    assert.equal((await consent(app, client, { redirect_uri: 'https://evil.example/' })).response.status, 400);
    assert.equal((await consent(app, client, { code_challenge_method: 'plain' })).response.status, 400);
    assert.equal((await consent(app, client, { resource: 'https://other.example/mcp' })).response.status, 400);
    const anonymous = await fetch(app.origin + '/oauth/authorize?' + new URLSearchParams({ client_id: client.client_id, redirect_uri: redirect, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256' }), { redirect: 'manual' });
    assert.equal(anonymous.status, 303);
    assert.match(anonymous.headers.get('location'), /^\/login\?next=%2Foauth%2Fauthorize%3F/);
    const pending = await consent(app, client);
    assert.match(pending.text, /your Evertrust Books account <strong>admin<\/strong>/);
    const args = { request_id: pending.id, decision: 'allow' };
    assert.equal((await post(app, '/oauth/authorize', args, { Origin: 'https://evil.example', Cookie: pending.cookie })).status, 403);
    assert.equal((await post(app, '/oauth/authorize', args, { Origin: 'null', Cookie: pending.cookie })).status, 403);
    assert.equal((await post(app, '/oauth/authorize', args, { Origin: app.origin })).status, 403);
    assert.equal((await post(app, '/oauth/authorize', args, { Origin: app.origin, Cookie: pending.csrf })).status, 401);
    const code = await authorize(app, client);
    assert.equal((await exchange(app, client, code, { code_verifier: randomBytes(32).toString('base64url') })).status, 400);
    assert.equal((await exchange(app, client, code, { resource: 'https://other.example/mcp' })).status, 400);
    const other = await register(app);
    assert.equal((await exchange(app, other, code)).status, 400);
    const response = await exchange(app, client, code);
    assert.equal(response.status, 200);
    const tokens = await response.json();
    assert.notEqual(tokens.access_token, password);
    assert.equal((await exchange(app, client, code)).status, 400);
    const tools = await (await mcp(app, tokens.access_token)).json();
    assert(tools.result.tools.length > 0);
    assert.equal((await fetch(app.origin + '/api/connections', { headers: { Authorization: 'Bearer ' + tokens.access_token } })).status, 401);
    assert.equal((await fetch(app.origin + '/mcp-settings', { headers: { Authorization: 'Bearer ' + tokens.access_token }, redirect: 'manual' })).status, 303);
    const init = await (await mcp(app, tokens.access_token, 'initialize')).json();
    assert.equal(init.result.serverInfo.version, JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
    assert.match(init.result.instructions, /Mandatory choice of data source/);
    assert.match(init.result.instructions, /Display transactions\/documents/);
    assert.match(init.result.instructions, /Report procedure for the assistant/);
    const firstRefresh = await post(app, '/oauth/token', { client_id: client.client_id, grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
    assert.equal(firstRefresh.status, 200);
    const rotated = await firstRefresh.json();
    assert.equal((await mcp(app, rotated.access_token)).status, 200);
    assert.equal((await post(app, '/oauth/token', { client_id: client.client_id, grant_type: 'refresh_token', refresh_token: tokens.refresh_token })).status, 400);
    assert.equal((await mcp(app, rotated.access_token)).status, 401);
    const second = await (await exchange(app, client, await authorize(app, client))).json();
    assert.equal((await post(app, '/oauth/revoke', { client_id: other.client_id, token: second.refresh_token })).status, 200);
    assert.equal((await mcp(app, second.access_token)).status, 200);
    assert.equal((await post(app, '/oauth/revoke', { client_id: client.client_id, token: second.refresh_token })).status, 200);
    assert.equal((await mcp(app, second.access_token)).status, 401);
    assert.equal((await mcp(app, password)).status, 200);
    const stored = JSON.stringify(app.bucket.db.prepare('SELECT * FROM oauth_tokens').all());
    assert(!stored.includes(second.access_token));
    assert(!stored.includes(second.refresh_token));
    assert(!stored.includes(password));
  } finally { await app.shutdown(); rmSync(dir, { recursive: true, force: true }); }
});

test('OAuth state persists across restarts, expires and is invalidated by master credential rotation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'evertrust-oauth-restart-'));
  let app = await start(dir);
  try {
    const client = await register(app);
    const code = await authorize(app, client);
    const port = app.server.address().port;
    await app.shutdown(); app = await start(dir, port);
    const response = await exchange(app, client, code);
    assert.equal(response.status, 200);
    const tokens = await response.json();
    assert.equal((await mcp(app, tokens.access_token)).status, 200);
    app.bucket.db.prepare("UPDATE oauth_tokens SET expires=0 WHERE kind='access'").run();
    assert.equal((await mcp(app, tokens.access_token)).status, 401);
    const next = await (await post(app, '/oauth/token', { client_id: client.client_id, grant_type: 'refresh_token', refresh_token: tokens.refresh_token })).json();
    await app.shutdown(); app = await start(dir, port, randomBytes(32).toString('hex'));
    assert.equal((await mcp(app, next.access_token)).status, 401);
    assert.equal((await post(app, '/oauth/token', { client_id: client.client_id, grant_type: 'refresh_token', refresh_token: next.refresh_token })).status, 400);
  } finally { await app.shutdown(); rmSync(dir, { recursive: true, force: true }); }
});

test('confidential DCR clients require their secret and cancellation never issues a code', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'evertrust-oauth-clients-'));
  const app = await start(dir);
  try {
    for (const method of ['client_secret_post', 'client_secret_basic']) {
      const client = await register(app, { token_endpoint_auth_method: method });
      const code = await authorize(app, client);
      assert.equal((await exchange(app, client, code)).status, 401);
      const data = { grant_type: 'authorization_code', client_id: client.client_id, code, redirect_uri: redirect, code_verifier: verifier };
      const headers = method === 'client_secret_basic' ? { Authorization: 'Basic ' + Buffer.from(client.client_id + ':' + client.client_secret).toString('base64') } : {};
      if (method === 'client_secret_post') data.client_secret = client.client_secret;
      assert.equal((await post(app, '/oauth/token', data, headers)).status, 200);
    }
    const client = await register(app);
    const pending = await consent(app, client);
    const response = await post(app, '/oauth/authorize', { request_id: pending.id, decision: 'deny' }, { Origin: app.origin, Cookie: pending.cookie });
    const url = new URL(response.headers.get('location'));
    assert.equal(url.searchParams.get('error'), 'access_denied');
    assert.equal(url.searchParams.has('code'), false);
    const replay = await post(app, '/oauth/authorize', { request_id: pending.id, decision: 'allow' }, { Origin: app.origin, Cookie: pending.cookie });
    assert.equal(replay.status, 403);
  } finally { await app.shutdown(); rmSync(dir, { recursive: true, force: true }); }
});

test('idle registered clients are removed after a week; clients holding tokens are kept', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'evertrust-oauth-idle-'));
  const app = await start(dir);
  try {
    const idle = await register(app), active = await register(app);
    const tokens = await (await exchange(app, active, await authorize(app, active))).json();
    const age = Date.now() - 8 * 86400 * 1000;
    app.bucket.db.prepare("UPDATE oauth_clients SET data=json_set(data,'$.created',?)").run(age);
    assert.equal((await fetch(app.origin + '/oauth/token', { method: 'POST' })).status, 400);
    const ids = app.bucket.db.prepare('SELECT id FROM oauth_clients').all().map(row => row.id);
    assert(!ids.includes(idle.client_id), 'idle client removed');
    assert(ids.includes(active.client_id), 'client with live tokens kept');
    assert.equal((await mcp(app, tokens.access_token)).status, 200);
  } finally { await app.shutdown(); rmSync(dir, { recursive: true, force: true }); }
});
