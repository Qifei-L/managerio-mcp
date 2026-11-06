# Settings, assets and Business Details

Part of the Evertrust Books accounting skill. The core rules in SKILL.md always apply.

## Business Details reads

`get_business_information` automatically reads the documented Business Details singleton key when only keyed GET is advertised. A native 404 returns `information_status:native_record_not_found` with chart-verified display identity; an unadvertised interface returns `not_advertised`. Neither verifies legal name, tax ID, base currency or equality of two connections. Permission failures remain errors. Do not invent another singleton key or create settings to make the read succeed. Legacy report tools remain diagnostic only.

## Assets, accounting settings and module detail data

- `list_business_resources` includes fixed_assets, intangible_assets, foreign_currencies, exchange_rates, tax_codes, divisions, projects, inventory_locations, inventory_transfers, inventory_write_offs and inventory_unit_costs. Read native schemas/examples before creating them; added routes are not evidence of tested native fields. Asset/settings edits require current expected_hash. Unit-cost CRUD stores records; it does not implement Recalculate.
- `list_module_interfaces` exposes each supported module's advertised collection, line, transaction, quantity, cost and keyed form GETs, with exact query schemas. It excludes credentials, users and executable custom settings. Inspect native required parameters instead of guessing field names or IDs.
- `read_module_data` reads only a listed module endpoint. Use exact native query case, `key` only with /{key}, tool page_size:1..100, skip>=0 and max_pages:1..10 (default 5). Native rows are preserved; raw full pages are optional via include_native_pages:true to avoid duplicated token output. Unresolved collection shapes and keyed forms retain raw pages. Auto pagination stops on repeated/empty pages, a response budget or the page limit; inspect complete and next_skip. A complete endpoint is not a complete statement or a cross-module transaction snapshot.
- Ordinary accounting singleton forms (lock date, base currency, default inventory location, starting exchange rates) can be inspected through native form/module discovery. Do not manufacture their IDs. `update_system_setting` requires existing key, current hash, advertised GET/PUT and fields evidenced by current record or native PUT schema. Unknown first-use fields remain Pending; there is no automatic seed POST.
- Native term searching was shown not to match some References in Sample. For GL, use a complete general_ledger read and exact local filters. Exact find_record scans unfiltered list pages and, when a list omits Reference, performs at most 25 detail reads within its time budget. Any unresolved/capped scan is incomplete, never a proved not-found. A list row's native key and a detailed form establish identity; a display name never does.
- Sample TB/P&L/BS/tax source feeds were empty while the native GL contained transactions. Do not turn empty source feeds into zero financial statements; use the complete GL for generic analysis and disclose its limitations.
- Native date-only values may read back as the same calendar date at midnight. Storage verification treats only these equivalent Date/IssueDate/FromDate/ToDate representations as equal; other dates/times, money, quantities and unknown fields retain exact checks.
- Availability is determined by the deployed tool surface. New asset/settings/module routes have local transport tests, but their native write behavior remains Pending unless a live test is recorded. Do not report native writes as tested based on local mocks.

## Business Information / Business Details

- Use `get_business_information` to obtain the native record, current `record_hash` and advertised PUT schema. Use `key` only when the company exposes a keyed Business Details form. No singleton key is guessed.
- Update only explicitly requested fields through `update_business_information`, with the latest `expected_hash`. Use native field names proved by the read record or schema, preserve omitted fields, and do not add unsupported settings. Identity/display fields are not writable.
- Read-back verifies persistence, not broader business/legal correctness. On uncertain or failed verification, reread before any further write; never automatically retry PUT.
- When Name changes, the connector checks the unchanged account fingerprint before refreshing this connection's stored company name. If `connection_refresh_required` is returned, reconcile the connection metadata; do not repeat the native rename. Connection ID, token and private ownership are retained.
