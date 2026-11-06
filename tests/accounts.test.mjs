import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration, createApplication } from '../server/index.mjs';

const master = randomBytes(32).toString('hex');
const key = randomBytes(32).toString('hex');

async function start(dir, extra = {}) {
  const settings = configuration({ APP_AUTH_TOKEN: master, MANAGER_TOKEN_ENCRYPTION_KEY: key, MANAGER_API_BASE: 'https://manager.example/api2', DATA_DIR: dir, PORT: '0', ...extra });
  const app = createApplication(settings);
  await new Promise(done => app.server.listen(0, '127.0.0.1', done));
  settings.origin = `http://127.0.0.1:${app.server.address().port}`;
  return { ...app, origin: settings.origin };
}
function client(app) {
  const call = (path, { method = 'GET', body, cookie, auth, origin = app.origin } = {}) => fetch(app.origin + path, {
    method, redirect: 'manual',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(auth ? { Authorization: auth } : {}), ...(origin && method !== 'GET' ? { Origin: origin } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = async (...args) => { const response = await call(...args); return { status: response.status, data: await response.json().catch(() => null), response }; };
  const login = async (username, password) => {
    const result = await json('/api/auth/login', { method: 'POST', body: { username, password } });
    return { ...result, cookie: result.response.headers.get('set-cookie')?.split(';')[0] };
  };
  const mcp = (auth, cookie) => call('/mcp', { method: 'POST', auth, cookie, body: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} } });
  return { call, json, login, mcp };
}
async function withApp(name, run, extra) {
  const dir = mkdtempSync(join(tmpdir(), name));
  const app = await start(dir, extra);
  try { await run(app, client(app)); } finally { await app.shutdown(); rmSync(dir, { recursive: true, force: true }); }
}

test('registration waits for approval; the original owner signs in as admin with APP_AUTH_TOKEN', () => withApp('evertrust-accounts-', async (app, c) => {
  const admin = await c.login('admin', master);
  assert.equal(admin.status, 200);
  assert.equal(admin.data.user.role, 'admin');
  assert.equal(admin.data.user.id, 'railway-owner', 'existing data namespace is kept');
  assert.equal((await c.json('/api/auth/register', { method: 'POST', body: { username: 'ab', password: 'long enough password' } })).status, 400);
  assert.equal((await c.json('/api/auth/register', { method: 'POST', body: { username: 'alice', password: 'short' } })).status, 400);
  assert.equal((await c.json('/api/auth/register', { method: 'POST', body: { username: 'alice', password: 'alice password 1' }, origin: 'https://evil.example' })).status, 403);
  const registered = await c.json('/api/auth/register', { method: 'POST', body: { username: 'alice', password: 'alice password 1' } });
  assert.equal(registered.status, 201);
  assert.equal(registered.data.user.status, 'pending');
  assert.equal((await c.json('/api/auth/register', { method: 'POST', body: { username: 'ALICE', password: 'alice password 1' } })).status, 409);
  assert.equal((await c.login('alice', 'alice password 1')).status, 403);
  const users = (await c.json('/api/admin/users', { cookie: admin.cookie })).data.users;
  const alice = users.find(u => u.username === 'alice');
  assert.equal(alice.status, 'pending');
  assert.equal((await c.json(`/api/admin/users/${alice.id}`, { method: 'POST', cookie: admin.cookie, body: { action: 'approve' } })).status, 200);
  const signedIn = await c.login('alice', 'alice password 1');
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.data.user.role, 'user');
  assert.equal((await c.json('/api/admin/users', { cookie: signedIn.cookie })).status, 403);
  assert.equal((await c.call('/admin', { cookie: signedIn.cookie })).status, 303);
  assert.equal((await c.call('/admin', { cookie: admin.cookie })).status, 200);
  // The password-only form from the single-owner version still signs in the admin.
  assert.equal((await c.json('/login', { method: 'POST', body: { password: master } })).status, 200);
  // Rejecting removes a pending registration.
  await c.json('/api/auth/register', { method: 'POST', body: { username: 'mallory', password: 'mallory password' } });
  const mallory = (await c.json('/api/admin/users', { cookie: admin.cookie })).data.users.find(u => u.username === 'mallory');
  assert.deepEqual((await c.json(`/api/admin/users/${mallory.id}`, { method: 'POST', cookie: admin.cookie, body: { action: 'reject' } })).data, { removed: true });
  assert.equal((await c.login('mallory', 'mallory password')).status, 401);
}));

test('each user gets a private data namespace; personal tokens reach only /mcp', () => withApp('evertrust-isolation-', async (app, c) => {
  const admin = await c.login('admin', master);
  await c.json('/api/auth/register', { method: 'POST', body: { username: 'bob', password: 'bob password 12' } });
  const bob = (await c.json('/api/admin/users', { cookie: admin.cookie })).data.users.find(u => u.username === 'bob');
  await c.json(`/api/admin/users/${bob.id}`, { method: 'POST', cookie: admin.cookie, body: { action: 'approve' } });
  const session = (await c.login('bob', 'bob password 12')).cookie;
  // A saved company under the admin namespace is invisible to Bob and counted only for the admin.
  const adminSpace = createHash('sha256').update('railway-owner').digest('hex');
  await app.bucket.put(`preferences/${adminSpace}.json`, JSON.stringify({ id: 'admin-company' }));
  await app.bucket.put(`connections-v2/${adminSpace}/x.json`, '{}');
  assert.deepEqual((await c.json('/api/connections', { cookie: session })).data, { connections: [], preferred_connection_id: null });
  const counts = Object.fromEntries((await c.json('/api/admin/users', { cookie: admin.cookie })).data.users.map(u => [u.username, u.companies]));
  assert.deepEqual(counts, { admin: 1, bob: 0 });
  // Spoofed identity headers are ignored.
  const spoof = await fetch(app.origin + '/api/connections', { headers: { Cookie: session, 'oai-authenticated-user-id': 'railway-owner' } });
  assert.deepEqual(await spoof.json(), { connections: [], preferred_connection_id: null });

  assert.equal((await c.json('/api/tokens', { method: 'POST', cookie: session, body: { name: 'laptop' }, origin: null })).status, 403, 'session writes need Origin');
  assert.equal((await c.json('/api/tokens', { method: 'POST', cookie: session, body: { name: '', expires_days: 30 } })).status, 400);
  assert.equal((await c.json('/api/tokens', { method: 'POST', cookie: session, body: { name: 'laptop', expires_days: 0 } })).status, 400);
  const created = await c.json('/api/tokens', { method: 'POST', cookie: session, body: { name: 'laptop', expires_days: 30 } });
  assert.equal(created.status, 201);
  assert.match(created.data.token, /^ebk_/);
  const bearer = 'Bearer ' + created.data.token;
  assert.equal((await c.mcp(bearer)).status, 200);
  assert.equal((await c.call('/api/connections', { auth: bearer })).status, 401, 'tokens cannot use browser APIs');
  assert.equal((await c.call('/api/tokens', { auth: bearer })).status, 401);
  assert.equal((await c.call('/', { auth: bearer })).status, 303);
  const listed = (await c.json('/api/tokens', { cookie: session })).data.tokens;
  assert.equal(listed.length, 1);
  assert(!JSON.stringify(listed).includes(created.data.token), 'token value is shown only once');
  assert(listed[0].last_used);
  // Other users cannot revoke Bob's token through their own token API.
  assert.equal((await c.json(`/api/tokens/${created.data.id}`, { method: 'DELETE', cookie: admin.cookie })).status, 404);
  assert.equal((await c.json(`/api/tokens/${created.data.id}`, { method: 'DELETE', cookie: session })).status, 200);
  assert.equal((await c.mcp(bearer)).status, 401);
  const expired = await c.json('/api/tokens', { method: 'POST', cookie: session, body: { name: 'old', expires_days: 1 } });
  app.accounts.db.prepare('UPDATE access_tokens SET expires=1 WHERE id=?').run(expired.data.id);
  assert.equal((await c.mcp('Bearer ' + expired.data.token)).status, 401);
}));

test('admin protections, suspension, password reset and lockout', () => withApp('evertrust-admin-', async (app, c) => {
  const admin = await c.login('admin', master);
  for (const name of ['carol', 'dave']) {
    await c.json('/api/auth/register', { method: 'POST', body: { username: name, password: name + ' password' } });
    const user = (await c.json('/api/admin/users', { cookie: admin.cookie })).data.users.find(u => u.username === name);
    await c.json(`/api/admin/users/${user.id}`, { method: 'POST', cookie: admin.cookie, body: { action: 'approve' } });
  }
  const users = Object.fromEntries((await c.json('/api/admin/users', { cookie: admin.cookie })).data.users.map(u => [u.username, u]));
  const act = (id, action, cookie = admin.cookie) => c.json(`/api/admin/users/${id}`, { method: 'POST', cookie, body: { action } });
  assert.equal((await act('railway-owner', 'suspend')).status, 409, 'cannot suspend yourself');
  assert.equal((await act('railway-owner', 'remove_admin')).status, 409, 'cannot demote yourself');
  assert.equal((await act('railway-owner', 'reset_password')).status, 409);
  assert.equal((await act(users.carol.id, 'nonsense')).status, 400);
  assert.equal((await act('u_missing', 'approve')).status, 404);

  const carol = await c.login('carol', 'carol password');
  const token = (await c.json('/api/tokens', { method: 'POST', cookie: carol.cookie, body: { name: 'cli', expires_days: null } })).data.token;
  assert.equal((await act(users.carol.id, 'suspend')).status, 200);
  assert.equal((await c.call('/api/auth/me', { cookie: carol.cookie })).status, 401);
  assert.equal((await c.mcp('Bearer ' + token)).status, 401);
  assert.equal((await c.login('carol', 'carol password')).status, 403);
  assert.equal((await act(users.carol.id, 'activate')).status, 200);
  assert.equal((await c.mcp('Bearer ' + token)).status, 200, 'personal tokens resume after reactivation');

  // A second admin can be added and then removed; the last admin is protected.
  assert.equal((await act(users.dave.id, 'make_admin')).status, 200);
  const dave = await c.login('dave', 'dave password');
  assert.equal((await act('railway-owner', 'remove_admin', dave.cookie)).status, 200);
  assert.equal((await act(users.dave.id, 'remove_admin', dave.cookie)).status, 409);
  assert.equal((await act('railway-owner', 'make_admin', dave.cookie)).status, 200);

  const reset = await act(users.carol.id, 'reset_password');
  assert.equal(reset.status, 200);
  assert.equal(reset.data.user.must_change_password, true);
  assert.equal((await c.login('carol', 'carol password')).status, 401);
  const temporary = await c.login('carol', reset.data.temporary_password);
  assert.equal(temporary.status, 200);
  assert.equal(temporary.data.user.must_change_password, true);
  const other = await c.login('carol', reset.data.temporary_password);
  assert.equal((await c.json('/api/auth/password', { method: 'POST', cookie: temporary.cookie, body: { current_password: 'wrong', new_password: 'carol new password' } })).status, 401);
  assert.equal((await c.json('/api/auth/password', { method: 'POST', cookie: temporary.cookie, body: { current_password: reset.data.temporary_password, new_password: 'carol new password' } })).status, 200);
  assert.equal((await c.call('/api/auth/me', { cookie: temporary.cookie })).status, 200, 'current session kept');
  assert.equal((await c.call('/api/auth/me', { cookie: other.cookie })).status, 401, 'other sessions signed out');
  assert.equal((await c.json('/api/auth/me', { cookie: temporary.cookie })).data.user.must_change_password, false);

  // The admin can replace the APP_AUTH_TOKEN sign-in with a personal password.
  assert.equal((await c.json('/api/auth/password', { method: 'POST', cookie: admin.cookie, body: { current_password: master, new_password: 'admin own password' } })).status, 200);
  assert.equal((await c.login('admin', master)).status, 401);
  assert.equal((await c.login('admin', 'admin own password')).status, 200);
  assert.equal((await c.mcp('Bearer ' + master)).status, 200, 'legacy Bearer still works during the transition');

  for (let i = 0; i < 5; i++) assert.equal((await c.login('dave', 'wrong password')).status, 401);
  assert.equal((await c.login('dave', 'dave password')).status, 429, 'username locked after five failures');
}));

test('OAuth grants belong to the consenting user and stop with suspension', () => withApp('evertrust-oauth-users-', async (app, c) => {
  const admin = await c.login('admin', master);
  await c.json('/api/auth/register', { method: 'POST', body: { username: 'erin', password: 'erin password' } });
  const erinId = (await c.json('/api/admin/users', { cookie: admin.cookie })).data.users.find(u => u.username === 'erin').id;
  await c.json(`/api/admin/users/${erinId}`, { method: 'POST', cookie: admin.cookie, body: { action: 'approve' } });
  const erin = await c.login('erin', 'erin password');
  const redirect = 'https://claude.example/callback';
  const registered = await (await fetch(app.origin + '/oauth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: 'Claude', redirect_uris: [redirect] }) })).json();
  const verifier = randomBytes(32).toString('base64url');
  const query = new URLSearchParams({ client_id: registered.client_id, redirect_uri: redirect, response_type: 'code', code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
  const page = await fetch(app.origin + '/oauth/authorize?' + query, { headers: { Cookie: erin.cookie } });
  const html = await page.text();
  assert.match(html, /<strong>erin<\/strong>/);
  const csrf = page.headers.get('set-cookie').split(';')[0];
  const decision = await fetch(app.origin + '/oauth/authorize', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: app.origin, Cookie: csrf + '; ' + erin.cookie }, body: new URLSearchParams({ request_id: /name="request_id" value="([^"]+)"/.exec(html)[1], decision: 'allow' }) });
  const code = new URL(decision.headers.get('location')).searchParams.get('code');
  const tokens = await (await fetch(app.origin + '/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: registered.client_id, code, redirect_uri: redirect, code_verifier: verifier }) })).json();
  assert.equal((await c.mcp('Bearer ' + tokens.access_token)).status, 200);
  const mine = (await c.json('/api/tokens', { cookie: erin.cookie })).data.apps;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].client_name, 'Claude');
  assert.equal((await c.json('/api/tokens', { cookie: admin.cookie })).data.apps.length, 0, 'not listed for other users');
  assert.equal((await c.json(`/api/admin/users/${erinId}/access`, { cookie: admin.cookie })).data.apps.length, 1);
  await c.json(`/api/admin/users/${erinId}`, { method: 'POST', cookie: admin.cookie, body: { action: 'suspend' } });
  assert.equal((await c.mcp('Bearer ' + tokens.access_token)).status, 401);
  await c.json(`/api/admin/users/${erinId}`, { method: 'POST', cookie: admin.cookie, body: { action: 'activate' } });
  assert.equal((await c.mcp('Bearer ' + tokens.access_token)).status, 401, 'suspension rotates the stamp, so the app must be approved again');
  const refreshed = await fetch(app.origin + '/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: registered.client_id, refresh_token: tokens.refresh_token }) });
  assert.equal(refreshed.status, 400);
}));

test('APP_LEGACY_BEARER=off disables the master credential', () => withApp('evertrust-legacy-', async (app, c) => {
  assert.equal((await c.mcp('Bearer ' + master)).status, 401);
  assert.equal((await c.login('admin', master)).status, 200, 'admin sign-in with APP_AUTH_TOKEN still works until a password is set');
}, { APP_LEGACY_BEARER: 'off' }));
