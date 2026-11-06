# Forms, fields and templates

Part of the Evertrust Books accounting skill. The core rules in SKILL.md always apply.

## Parameters and first-create field discovery

- Read `get_tool_contract` for the exact deployed schema when a host hides constraints. Paging uses `page_size:1..100`, `skip>=0`; `find_record.max_pages:1..10` (default 5). Diagnostic native query uses camel-case `pageSize:1..100`; tool arguments and native field names are case-sensitive. GL grouping uses returned native names such as `account` and `amount`, not guessed capitalizations.
- `get_resource_schema` now includes native request/response schemas and, by default, one sanitized existing same-company form. Use `key` for a verified example or `include_template:false` for schema-only inspection. Identity/display fields are removed; values in an old record are not defaults for a new one.
- Use `get_native_form_schema(endpoint:"/...-form")` for supported report forms or inventory unit-cost forms. A generic object schema without properties is unresolved. For Balance Sheet, Trial Balance and Profit and Loss, `verified_field_contract` supplies minimal fields tested in Sample Use on Manager 26.10.10.0 when this company advertises POST. Balance Sheet uses `Periods:[{Date:...}]`; Trial Balance and P&L use `Periods:[{FromDate:...,ToDate:...}]`, with native date-time strings. Top-level dates are discarded. No IDs, sample values, defaults or enum mappings are transferred. Other forms without evidence remain `pending`; never POST invented date fields, seed a real company, or use an all-zero/random UUID to manufacture defaults.
- For a first create, consult Manager's official forum/docs for candidate field names, then validate them in user-authorized Sample Use examples. A saved native example and read-back establish actual field names; forum examples alone do not establish support in this version. Browser fallback follows the host's approval requirements. Do not claim a first-create test succeeded when only schema discovery ran.

## Value-free form templates

- Use `get_form_template` for a native root endpoint. It returns nested paths, types, evidence level, relation roles, known rejected paths and a versioned minimal schema; it never returns copied example values as new defaults. `same_company_observed` means readable, not writable. `sample_storage_verified` means tested field storage, not a correct accounting treatment.
- Use `prepare_form_create` with only the intended user-provided fields. The result is a read-only preview, never POST. `pending` lists missing template slots, unknown fields, invalid native date-times, discarded fields and unresolved links. `ready_for_storage_review` still requires duplicate search, accounting checks and native write/read-back. It is not approval or a posted document.
- Template-required slots belong to the chosen minimal workflow; native server-required fields are unknown unless native schema establishes them. No optional enum meaning, tax treatment, foreign exchange or company-specific default is inferred.
- Relation preview reads actual same-company customer/supplier/item keys, with at most 25 unique detail reads and reuse within one preview. Invoice line Account can be validated against that item's native PurchaseItemAccount/SaleItemAccount. Other posting-account semantics remain Pending.
- Minimal templates cover Inventory Item, Customer, Supplier, Employee, Bank/Cash Account, Sales/Purchase Invoice, both Quotes, both Orders, Journal, customer Receipts, supplier Payments and three common reports. Journal uses Date, Reference, Narration and Lines[].Debit/Credit; preview checks balanced amounts and one side per line. Receipt PaidBy:1 and Payment Payee:2 are the tested party-specific variants, not general enum mappings. Other allowlisted forms expose observed/schema evidence and remain Pending until tested. Bank currency and account-type settings require their own evidenced native choices.
- Sample test on 2026-10-12: Inventory Item `DefaultQty:2` read back as 1. Do not treat `DefaultQty`, `HasDefaultQty`, or other generated flags as writable defaults simply because GET returns them. Bank Account `Currency` and `IsBankAccount:true` stored correctly in a dedicated test, but currency IDs are company-specific and must never be baked into templates.
- If MCP cannot finish a field discovery, try other advertised MCP reads, record the limitation and continue supported work. Do not silently switch to browser. Sample fixtures may be created only in the authorized Sample Use connection, with test names/references, duplicate search and complete read-back; uncertain creates are reconciled before any retry.

## Sample API compatibility findings

- Inventory items use `ItemName`, not `Name`. Non-inventory `ItemName` was discarded by API2 in the 2026-10-12 first-create test; its actual name field remains Pending. Do not transfer the inventory naming rule. Parties, employees and bank accounts use `Name`.
- Sales invoices and sales quotes use `IssueDate`; purchase quotes and both orders use `Date`. Do not copy date fields between document types.
- Quote/order lines discarded `Account` in Sample. Map invoice posting accounts explicitly at conversion.
- Receipt settlement lines need the evidenced receivables control `Account` as well as customer/invoice links. Links alone stored successfully but did not settle the invoice in Sample.
- Sample supplier payments stored `Payee: 2` and payable control/customer fields. `AccountsPayablePurchaseInvoice` was discarded; a zero invoice balance after posting does not prove an explicit invoice link.
- Sample payslips returned lowercase `employee`. Earnings/deductions still require a native payroll template and ledger checks.
- Sample transfer `Amount` and delivery-note `Date`/`IssueDate` were discarded. Their real native amount/date fields remain unresolved; do not claim successful transfers or invent alternative fields.
- Sample report schemas advertised generic objects without property names. Report date writes failed or returned uncertain. Never retry uncertain report saves; discovery alone is not report verification.
