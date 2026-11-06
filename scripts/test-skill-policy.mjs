import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import embedded, { ACCOUNTING_TOPICS } from '../worker/accounting-skill.js';
import worker from '../worker/index.js';
const dir = new URL('../skills/evertrust-books-accounting/', import.meta.url);
const skill = readFileSync(new URL('SKILL.md', dir), 'utf8');
const topics = Object.fromEntries(readdirSync(new URL('references/', dir)).filter(f => f.endsWith('.md')).sort().map(f => [f.slice(0, -3), readFileSync(new URL('references/' + f, dir), 'utf8')]));
assert.equal(embedded, skill, 'Deployed core Skill must match canonical source');
assert.deepEqual(ACCOUNTING_TOPICS, topics, 'Deployed topics must match canonical references');
assert.ok(skill.length < 15000, `Core Skill sent at initialize should stay small (${skill.length} chars)`);
for (const slug of Object.keys(topics)) assert.ok(skill.includes('`' + slug + '`'), `Core must list topic ${slug}`);
const everything = skill + Object.values(topics).join('\n');
// Rules that must be in the core, because they apply before any topic is read.
for (const clause of [
  'Creating a new COA account requires explicit user authorization',
  'do not implicitly authorize new accounts',
  'Reuse current explicit approval',
  '**Prefer direct edits.**',
  'Use a reversing journal only when the user explicitly requests that treatment or explicitly approves it',
  'Search first: POST is not idempotent.',
  'Never automatically repeat a write',
  'Never echo tokens',
]) assert.ok(skill.includes(clause), `Missing core policy: ${clause}`);
for (const clause of [
  'Use concise plain English for newly authored bookkeeping account labels',
  'Preserve exact legal identities, reference numbers',
  'preserve it verbatim',
  'nor mass renaming or rewriting of existing records',
  'Export detail rows with their original contents, order, amounts, currencies, references and descriptions intact',
  'clearly labeled separate columns or sheets; never replace original detail values',
]) assert.ok(everything.includes(clause), `Missing policy: ${clause}`);
assert.ok(!everything.includes('reversals prohibited'), 'Reversals stay allowed with explicit approval (decision 2026-11-06)');
assert.ok(!/[\u4e00-\u9fff]/.test(everything), 'Skill text is English only');
assert.ok(!everything.includes('remove repetition and obvious spelling noise'), 'Unconditional cleanup conflicts with source preservation');
assert.ok(!everything.includes("Keep business-facing text readable in the user's chosen language"));
// The MCP tool serves the core without a topic and each topic on request.
const store = new Map();
const env = { MANAGER_TOKEN_ENCRYPTION_KEY: 'cd'.repeat(32), BUCKET: { get: async k => store.has(k) ? { json: async () => JSON.parse(store.get(k)), text: async () => store.get(k) } : null, put: async (k, b) => { store.set(k, b); return { etag: '1' }; }, list: async () => ({ objects: [] }), delete: async () => {} } };
const rpc = async (name, args) => (await (await worker.fetch(new Request('https://skill.test/mcp', { method: 'POST', headers: { 'content-type': 'application/json', 'oai-authenticated-user-id': 'u' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) }), env)).json()).result;
const core = await rpc('get_accounting_skill', {});
assert.equal(core.structuredContent.content, skill);
assert.deepEqual(core.structuredContent.topics, Object.keys(topics));
const reports = await rpc('get_accounting_skill', { topic: 'reports-and-ledger' });
assert.equal(reports.structuredContent.content, topics['reports-and-ledger']);
assert.match(reports.structuredContent.content, /Report procedure for the assistant/);
assert.equal((await rpc('get_accounting_skill', { topic: 'nonsense' })).isError, true);
console.log(`Accounting Skill policy and embedded-source parity passed (core ${skill.length} chars, ${Object.keys(topics).length} topics)`);
