# Financial reports and GL-derived analysis

Part of the Evertrust Books accounting skill. The core rules in SKILL.md always apply.

GL results default to a 60,000-character budget before MCP text/structured duplication. An oversized result returns no partial rows/groups, `result_complete:false`, and a concrete `next_request`; raw results also provide `summary_request`. `complete` describes native reading, not delivery of withheld data. Never claim to have reviewed withheld rows. Unknown currency remains unknown: inspect `currency_evidence`, preserve native money objects and obtain original-document/currency-setting evidence before financial conclusions. Mixed evidenced currencies cannot be summed together.

## Financial reports and GL-derived analysis

### Report procedure for the assistant

1. Select the requested company via `list_connections`; establish the report kind, reporting dates and currency. Read the same-company COA structure (`get_accounts` and evidenced native group/parent forms) for classification.
2. Request GL using `get_transactions` with `source:"general_ledger", auto_paginate:true`. For P&L use the requested period; TB/BS need sufficient prior history plus verified opening/starting balances through the as-of cutoff. A current-period-only pull cannot establish closing balances. Do not assume the feed includes openings or year-end transfers without evidence.
3. Inspect `complete`, `result_complete`, `rows_read`, `total_records`, `stop_reason` and `aggregation_performed`. If a bounded call yields `next_skip`, continue or narrow the request without gaps/overlap. Never aggregate incomplete data into a final report. These reads are live offset pages, not an immutable snapshot.
4. Prefer raw GL rows when report semantics need further inspection; use `group_by`/`sum_fields` only with evidenced native fields for compact movement summaries. Classify through actual company COA identities/verified unique candidates, preserve currencies, verify amount signs and opening/closing treatment, then calculate. Never invent account links or gross debit/credit columns from net movements.
5. Reconcile totals and flag unresolved account classification, opening balances, allocations or currency conversion. Label the result **GL-derived / reconstructed**, with company, period, retrieval time, coverage and limitations. If evidence supports movements only, present a movement analysis rather than calling it a complete TB/BS. AR/AP aging additionally requires native invoice dates, allocations and outstanding amounts; retrieve those from document APIs.

## Native accounting interface verification

- `inspect_accounting_interfaces` reads the company's complete OpenAPI path/method catalogue. Its eligible ledger/report GET list does not prove upstream availability. A path missing from the legacy report whitelist is not necessarily missing from Manager.
- `probe_accounting_endpoint` performs one advertised, eligible GET under the selected connection. It preserves native fields, including account IDs; `full_report:false` remains until report completeness and meaning are verified. It cannot call arbitrary URLs, change authentication, write, or scrape application pages.
- Probe `/transactions` only if advertised, using small pages (maximum 100) and exactly the advertised fields. Check native account IDs, amounts, dates, total records and subsequent pages before proposing a complete GL calculation. Do not infer account identities from descriptions or transaction labels.
- A report form is stored configuration. A successful read of `*-form/{key}` is not a generated report. An endpoint rejected by the MCP guard was not tested against Manager; say so explicitly.
