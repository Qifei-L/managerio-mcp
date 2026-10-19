import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import embedded from '../worker/accounting-skill.js';
const skill = readFileSync(new URL('../skills/evertrust-books-accounting/SKILL.md', import.meta.url), 'utf8');
assert.equal(embedded, skill, 'Deployed Skill must match canonical source');
for (const clause of [
  'Creating a new COA account requires explicit user authorization',
  'do not implicitly authorize new accounts',
  'Reuse current explicit approval',
  'Use concise plain English for newly authored bookkeeping account labels',
  'Preserve exact legal identities, reference numbers',
  'preserve it verbatim',
  'nor mass renaming or rewriting of existing records',
  'Export detail rows with their original contents, order, amounts, currencies, references and descriptions intact',
  'clearly labeled separate columns or sheets; never replace original detail values',
]) assert.ok(skill.includes(clause), `Missing policy: ${clause}`);
assert.ok(!skill.includes('remove repetition and obvious spelling noise'), 'Unconditional cleanup conflicts with source preservation');
assert.ok(!skill.includes("Keep business-facing text readable in the user's chosen language"));
console.log('Accounting Skill policy and embedded-source parity passed');
