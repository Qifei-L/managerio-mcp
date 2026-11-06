# Chart of accounts

Part of the Evertrust Books accounting skill. The core rules in SKILL.md always apply.

## Chart of accounts: Manager-native workflow

Excel is only an optional external bulk-data source. Never require a spreadsheet, workbook preview, download or upload to manage COA. The normal model is **Balance Sheet / Profit & Loss → Group → Account**, using native object IDs. Report membership is evidenced by the native form kind, not inferred from an account name, code range or translated label.

### Responsibility boundary

This Skill owns accounting interpretation, object relationships, constraints, cycle analysis, deletion eligibility and the decision to proceed. MCP provides authenticated reads, schema-bounded writes, immutable previews, hashes, checkpoints and read-back results. Backend allowlists, identity checks, cycle rejection and conflict checks remain defense in depth; a Skill is not an enforceable security boundary. Do not remove these protections to make writes appear generic. Storage verification alone does not establish correct accounting.

### Choose the read scope from the operation

Select the explicit company/connection and native IDs first. Do not collect the complete structure for every edit.

- **Create an account:** check name/code against the complete native chart index, read the destination group and its active ancestors, validate its report/classification, then read back the newly created record. Only inspect additional branches for dependencies introduced by the actual plan.
- **Rename or change a code:** read the target's current native form and check duplicates across the complete company chart index, not the current page. Do not traverse unrelated hierarchy. Native settings/hash still protect the write. For a group absent from the chart, use evidenced group inventory; disclose unused/unattached groups that cannot be enumerated.
- **Move a group/account:** read the target and relevant old/new parent paths. Check that the destination's projected ancestors cannot lead back to the moved node; examine all jointly changed edges and the execution order. Read the affected descendants/siblings only when the requested action depends on them. Keep raw and effective Group edges distinct.
- **Change Position:** read the target and relevant siblings for ordering. Do not promise automatic renumbering or inspect unrelated branches.
- **Large reorganization or full inventory review:** collect every `get_coa_structure` page from one snapshot, build the active ID graph, and inspect all affected relationships. `complete` only describes chart pagination; `group_inventory.complete:false` remains an inventory limitation. Never infer unseen groups or parent IDs from names/codes.

Use `get_coa_item(include_path:false)` when inspecting only the current target settings for a name/code edit; omit that option when ancestry is needed. The canonical preparation tool already reads its target and complete chart index, so do not repeat a full structure fetch to satisfy the same precheck.

Structure pages reuse a five-minute, caller/connection/token-isolated snapshot. Inspect its timestamp and validation scope. `refresh:true` on the first page forces a new native read; never combine refresh with an old cursor. External Manager edits may remain invisible until refresh/expiry. Cached structure is not a write precondition: preparation and application still read current native records, duplicate indexes and relevant parent hashes. Writes invalidate structure snapshots; restart pagination after an intervening write.

### Classify objects before treating them as ordinary accounts

- Only the advertised ordinary `balance_sheet_account`, `profit_loss_account`, `balance_sheet_group` and `profit_loss_group` forms are supported for these COA writes. Even for these, respect returned `editable_fields` and preserve all other settings.
- System singleton accounts are identified through fixed Manager model IDs and advertised native form routes. If API2 returns 404, `object_classification: system_account` describes identity only; `settings_available:false` and incomplete path mean Group/Position remain unknown. Do not infer settings, materialize defaults with POST/PUT, or treat these objects as ordinary editable accounts.
- Built-in Balance Sheet Assets, Liabilities and Equity are fixed, non-editable roots. Use their returned IDs directly, including direct Equity accounts. Do not create an extra same-name Assets/Liabilities/Equity group under a built-in root. Empty companies still have these roots.
- System accounts, control accounts, subtotals/totals and special forms are distinct objects. Classify from native routes/settings and evidenced linked resources, never just a label. Do not convert them to ordinary accounts or assume their balance can be cleared by moving/renaming them. The ordinary COA write allowlist excludes special forms. Inventory control accounts have separate dedicated tools; never route them through ordinary COA preparation.
- Customers, suppliers, bank/cash accounts, inventory items and similar subsidiary records can be subaccounts of control accounts. Use their dedicated party/business resources and evidenced control links. A subaccount is not necessarily a COA Group child; do not edit its COA parent as though it were an ordinary ledger account. If the API cannot establish classification or editable relationships, stop and report the limitation.
- P&L Group `Type`: default/0 = Income; 1 = Expense; 2 = Subgroup of. Types 0 and 1 are top-level and **ignore a retained raw Group value**. Only Type 2 activates the Group edge and requires a valid parent. Moving under a P&L group implies Type 2; preview this change explicitly. Returning to the top level requires evidenced Type 0/1. Account parents must stay in the same report; account-to-report conversion is unsupported.

### Validate hierarchy and position

For each proposed Group change, check the current and projected ID graphs. Reject self-parenting, descendant parenting, multi-item cycles and cross-report parents. Check the **execution order**, not only the final graph: create parents first and apply prerequisite moves before dependent children. Do not invent unapproved temporary moves. If no acyclic order exists, revise the preview. Existing active cycles produce warnings without aborting reads; repair a cycle using explicit evidenced destination IDs before moving children into it. A stale Group on a Type 0/1 P&L root is not an active cycle.

Position changes affect ordering, not report classification or parentage. Inspect current sibling positions and preview each requested position change. Do not promise automatic sibling renumbering or reorder by input row order. Only use Position when advertised editable. Manager may omit default Position 0, Type 0 and null Group on read-back; compare their evidenced effective defaults, while checking non-default values strictly. Non-editable tax and other settings must survive updates.

### Prepare → preview → apply → verify

- Use `prepare_coa_changes` with explicit `items`. Existing edits require `item_key` and the evidenced `kind`. New objects require `operation: "create"`, explicit kind/name/parent, and optional `ref` identifiers. Existing parents use `group_key`; new planned parents use `group_ref`. Never use names to bind parents. Preparation reads native forms and returns structured differences without Manager writes.
- Read the entire preview using `get_coa_changes` with `offset` / `page_size`, or `detail:true`. Show company/connection, create/update actions, stable IDs, names/codes, old/new report paths, Position and inferred Type changes, warnings and unresolved issues. Omitted objects are retained, never implicitly deleted.
- A complex reorganization needs approval of the exact complete preview. Existing authorization for that exact reviewed plan persists across chunks. Apply using `apply_coa_changes` with `task_id` and `approval_hash`. A hash identifies a plan; it is not proof that the user approved it. Preparation alone is not permission to apply.
- Changes to simple party/business records use existing dedicated or generic CRUD tools under the user's requested action. Read first, pass an inspected `expected_hash` on edits, and re-read after every write. A simple COA edit uses the same ID-based preparation/apply transport; do not introduce a spreadsheet or expand the user's requested scope. If exact returned differences are already authorized, no redundant per-chunk confirmation is needed.
- After COA writes, verify each affected record's stored fields and preserved settings. For moves, verify the relevant active parent/type and paths; for ordering, verify relevant siblings. Collect a refreshed full structure only for large reorganizations or a full review. State partial failures and incomplete paths; a completed task does not prove a complete group inventory.
- Continue the same approved `in_progress` task until terminal. Up to 200 writes per call; adaptive response windows may yield sooner. Batches are not atomic; no automatic rollback. Execution needs an active caller, not an unattended background job. Never repeat succeeded or uncertain writes. After interruption, inspect `get_coa_changes(detail:true)` and reconcile live items before proceeding. Use `refresh_coa_changes` only to prepare resolved remaining changes; new differences require a fresh preview. Cancel pending items without undoing already written items.

### Deletion checks and current limits

Deletion is not supported by the current COA tools, and generic `delete_record` does not expose COA resources. Do not route around that restriction. Before any future supported account deletion: read the exact ID, establish whether the object is ordinary/system/control/subaccount, verify the balance (zero alone is insufficient), inspect **all** relevant transaction pages and references, check descendant/subaccount dependencies, and obtain native evidence that deletion is permitted. Missing balances, incomplete history or an unavailable eligibility check are unknown, not zero/unused/allowed. Require the user's specific deletion instruction and include deletion in the reviewed preview. Re-read to prove absence after deletion. Do not delete/recreate used accounts to work around restrictions; offer an evidenced non-destructive alternative only when supported.

### Compatibility and external imports

`prepare_coa_sync` / `execute_coa_sync`, `get_coa_edit_task` and existing precise edit tasks remain deprecated compatibility interfaces for saved callers/tasks. Prefer `prepare_coa_changes` / `apply_coa_changes` and `get_coa_changes` / `refresh_coa_changes` for new work. The old table adapter can resolve unique name/code candidates, but it is an external import convenience, not the normal hierarchy-management workflow. Verify every resolved ID, inferred classification and parent in the preview. Excel export remains optional and is never a prerequisite for approval or verification.

### Recorded Manager findings

- Group hierarchy cycles must use active native Group/Type edges; previously observed P&L self-links can be stale values on Income/Expense roots. Read paths even when a true cycle exists and identify exact cycle IDs.
- Chart rows may omit groups. Ancestors prove membership for those IDs only; unused standalone groups remain an explicit inventory gap.
- Equity uses the built-in root ID, not a custom guessed group. Protect all built-in roots and block duplicate same-name root children.
- Parent moves may infer P&L Type 2; Position moves do not change Group. Preview both fields and verify their effective values.
- Default fields can disappear in Manager responses; strict byte-for-byte equality can produce false failures. Only evidenced defaults may normalize.
- Native writes can discard unsupported fields even after HTTP success. Read-back and accounting reconciliation are separate checks. Do not repeat a write whose outcome is uncertain.
- Large batches can partially complete or outlive a host request. Keep per-item checkpoints, connection isolation and existing approval; resume the same task rather than recreate records.
