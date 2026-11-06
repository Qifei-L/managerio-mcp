import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const sameSecret = (a, b) => typeof a === 'string' && typeof b === 'string' && timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
const scryptAsync = (password, salt) => new Promise((resolve, reject) => scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key)));

const USERNAME = /^[A-Za-z0-9._@+-]{3,100}$/;
const SESSION_MS = 8 * 60 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_PENDING = 200;
const TOKEN_PREFIX = 'ebk_';
const ACTIONS = ['approve', 'reject', 'suspend', 'activate', 'make_admin', 'remove_admin', 'reset_password'];

export class AccountError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64url')}$${(await scryptAsync(password, salt)).toString('base64url')}`;
}

async function passwordMatches(password, stored) {
  const [kind, salt, expected] = String(stored).split('$');
  if (kind !== 'scrypt' || !salt || !expected) return false;
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64url'));
  const wanted = Buffer.from(expected, 'base64url');
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw new AccountError('Password must be 10 to 200 characters.');
}

// Users, browser sessions and personal access tokens. Each user id is also the data
// namespace passed to the accounting worker, so companies stay separate per user.
// The original single owner (APP_USER_ID) becomes the first admin and keeps its data.
export class Accounts {
  constructor(config, db) {
    this.config = config;
    this.db = db;
    this.failures = new Map();
    db.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT, role TEXT NOT NULL, status TEXT NOT NULL, stamp TEXT NOT NULL DEFAULT '', must_change INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, last_login INTEGER);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS access_tokens (id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, name TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER, last_used INTEGER);`);
    // A null password means "sign in with APP_AUTH_TOKEN" until the admin sets their own.
    db.prepare("INSERT INTO users(id,username,password,role,status,stamp,created) VALUES (?,?,NULL,'admin','active','',?) ON CONFLICT DO NOTHING")
      .run(config.user, config.adminUsername, Date.now());
  }

  publicUser(row) {
    return row && { id: row.id, username: row.username, role: row.role, status: row.status, must_change_password: !!row.must_change, created: row.created, last_login: row.last_login ?? null };
  }
  get(id) { return typeof id === 'string' ? this.db.prepare('SELECT * FROM users WHERE id=?').get(id) ?? null : null; }
  active(id) { const user = this.get(id); return user?.status === 'active' ? user : null; }
  byName(username) { return typeof username === 'string' ? this.db.prepare('SELECT * FROM users WHERE username=?').get(username) ?? null : null; }
  admin() { return this.get(this.config.user); }

  // Runs on every request, so it touches the database at most once a minute.
  cleanup() {
    const now = Date.now();
    if (this.lastCleanup && now - this.lastCleanup < 60000) return;
    this.lastCleanup = now;
    this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
    this.db.prepare('DELETE FROM access_tokens WHERE expires IS NOT NULL AND expires<=?').run(now);
    for (const [key, entry] of this.failures) if (entry.until <= now) this.failures.delete(key);
  }

  async register(username, password) {
    if (typeof username !== 'string' || !USERNAME.test(username)) throw new AccountError('Username must be 3 to 100 letters, digits or . _ @ + - characters.');
    checkPassword(password);
    if (this.byName(username)) throw new AccountError('This username is already taken.', 409);
    if (this.db.prepare("SELECT count(*) AS n FROM users WHERE status='pending'").get().n >= MAX_PENDING) throw new AccountError('Registration is temporarily closed. Contact the administrator.', 503);
    const id = 'u_' + randomBytes(12).toString('hex');
    this.db.prepare("INSERT INTO users(id,username,password,role,status,stamp,created) VALUES (?,?,?,'user','pending',?,?)").run(id, username, await hashPassword(password), secret(), Date.now());
    return this.publicUser(this.get(id));
  }

  async verify(user, password) {
    if (!user || typeof password !== 'string') return false;
    return user.password === null ? sameSecret(password, this.config.token) : passwordMatches(password, user.password);
  }

  // Failed attempts lock a username for 15 minutes; the proxy hides real client addresses.
  async login(username, password) {
    this.cleanup();
    const key = String(username ?? '').toLowerCase();
    const entry = this.failures.get(key);
    if (entry && entry.count >= MAX_FAILURES && entry.until > Date.now()) throw new AccountError('Too many failed attempts. Try again in 15 minutes.', 429);
    const user = this.byName(username);
    if (!await this.verify(user, password)) {
      if (this.failures.size < 10000 || this.failures.has(key)) {
        const next = entry && entry.until > Date.now() ? entry : { count: 0, until: Date.now() + LOCK_MS };
        next.count++; this.failures.set(key, next);
      }
      throw new AccountError('Incorrect username or password.', 401);
    }
    if (user.status === 'pending') throw new AccountError('Your account is waiting for administrator approval.', 403);
    if (user.status !== 'active') throw new AccountError('This account is suspended. Contact the administrator.', 403);
    this.failures.delete(key);
    const id = secret();
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(id), user.id, Date.now() + SESSION_MS);
    this.db.prepare('UPDATE users SET last_login=? WHERE id=?').run(Date.now(), user.id);
    return { session: id, maxAge: SESSION_MS / 1000, user: this.publicUser(user) };
  }

  session(id) {
    if (typeof id !== 'string' || !id) return null;
    const row = this.db.prepare('SELECT user_id FROM sessions WHERE hash=? AND expires>?').get(digest(id), Date.now());
    return row ? this.active(row.user_id) : null;
  }
  logout(id) { if (typeof id === 'string') this.db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(id)); }

  async changePassword(user, current, next, keepSession) {
    if (!await this.verify(user, current)) throw new AccountError('Current password is incorrect.', 401);
    checkPassword(next);
    this.db.prepare('UPDATE users SET password=?, must_change=0 WHERE id=?').run(await hashPassword(next), user.id);
    // Sign out other browsers; MCP tokens and app authorizations keep working.
    this.db.prepare('DELETE FROM sessions WHERE user_id=? AND hash<>?').run(user.id, keepSession ? digest(keepSession) : '');
  }

  // Personal access tokens are shown once and stored only as hashes.
  createToken(user, name, days) {
    if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new AccountError('Token name must be 1 to 100 characters.');
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 366)) throw new AccountError('Expiry must be 1 to 366 days, or never.');
    if (this.db.prepare('SELECT count(*) AS n FROM access_tokens WHERE user_id=?').get(user.id).n >= 50) throw new AccountError('A user can have at most 50 tokens. Revoke unused tokens first.', 409);
    const id = 't_' + randomBytes(9).toString('hex'), value = TOKEN_PREFIX + secret(), now = Date.now();
    this.db.prepare('INSERT INTO access_tokens VALUES (?,?,?,?,?,?,NULL)').run(id, digest(value), user.id, name.trim(), now, days === null ? null : now + days * 86400000);
    return { token: value, ...this.tokenView(this.db.prepare('SELECT * FROM access_tokens WHERE id=?').get(id)) };
  }
  tokenView(row) { return { id: row.id, name: row.name, created: row.created, expires: row.expires ?? null, last_used: row.last_used ?? null }; }
  tokens(userId) { return this.db.prepare('SELECT * FROM access_tokens WHERE user_id=? ORDER BY created DESC').all(userId).map(row => this.tokenView(row)); }
  revokeToken(userId, id) { return this.db.prepare('DELETE FROM access_tokens WHERE user_id=? AND id=?').run(userId, id).changes > 0; }
  tokenUser(header) {
    if (!header?.startsWith('Bearer ' + TOKEN_PREFIX)) return null;
    const row = this.db.prepare('SELECT id,user_id,last_used FROM access_tokens WHERE hash=? AND (expires IS NULL OR expires>?)').get(digest(header.slice(7)), Date.now());
    if (!row) return null;
    if (!row.last_used || Date.now() - row.last_used > 60000) this.db.prepare('UPDATE access_tokens SET last_used=? WHERE id=?').run(Date.now(), row.id);
    return this.active(row.user_id);
  }

  users(countConnections) {
    return this.db.prepare("SELECT * FROM users ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created").all().map(row => ({
      ...this.publicUser(row),
      tokens: this.db.prepare('SELECT count(*) AS n FROM access_tokens WHERE user_id=?').get(row.id).n,
      companies: countConnections(row.id),
    }));
  }

  // Changing the stamp invalidates the user's OAuth grants and is used for suspension/reset.
  async adminAction(actor, targetId, action) {
    if (!ACTIONS.includes(action)) throw new AccountError('Unknown action.');
    const target = this.get(targetId);
    if (!target) throw new AccountError('User not found.', 404);
    const self = target.id === actor.id;
    const otherActiveAdmins = this.db.prepare("SELECT count(*) AS n FROM users WHERE role='admin' AND status='active' AND id<>?").get(target.id).n;
    const set = (sql, ...args) => this.db.prepare(`UPDATE users SET ${sql} WHERE id=?`).run(...args, target.id);
    const endSessions = () => this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(target.id);
    if (action === 'approve') { if (target.status !== 'pending') throw new AccountError('Only pending accounts can be approved.', 409); set("status='active'"); }
    if (action === 'reject') { if (target.status !== 'pending') throw new AccountError('Only pending accounts can be rejected.', 409); this.db.prepare('DELETE FROM users WHERE id=?').run(target.id); return { removed: true }; }
    if (action === 'suspend') {
      if (self) throw new AccountError('You cannot suspend your own account.', 409);
      if (target.status !== 'active') throw new AccountError('Only active accounts can be suspended.', 409);
      if (target.role === 'admin' && !otherActiveAdmins) throw new AccountError('Keep at least one active admin.', 409);
      set("status='suspended', stamp=?", secret()); endSessions();
    }
    if (action === 'activate') { if (target.status !== 'suspended') throw new AccountError('Only suspended accounts can be activated.', 409); set("status='active'"); }
    if (action === 'make_admin') { if (target.status !== 'active') throw new AccountError('Only active accounts can become admins.', 409); set("role='admin'"); }
    if (action === 'remove_admin') {
      if (self) throw new AccountError('You cannot remove your own admin role.', 409);
      if (target.role !== 'admin') throw new AccountError('This user is not an admin.', 409);
      if (!otherActiveAdmins) throw new AccountError('Keep at least one active admin.', 409);
      set("role='user'");
    }
    if (action === 'reset_password') {
      if (self) throw new AccountError('Change your own password on the Account page.', 409);
      const temporary = randomBytes(12).toString('base64url');
      set('password=?, must_change=1, stamp=?', await hashPassword(temporary), secret()); endSessions();
      return { user: this.publicUser(this.get(target.id)), temporary_password: temporary };
    }
    return { user: this.publicUser(this.get(target.id)) };
  }
}
