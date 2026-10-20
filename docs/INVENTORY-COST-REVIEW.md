# Inventory cost review interfaces

`get_inventory_cost_state(connection_id, max_pages=10)` reads inventory and stored unit costs with native API2 paging. It preserves item IDs, raw money objects and unresolved rows, flags duplicate item/date groups and exposes incomplete reads. It never claims to read Manager's native correction queue or to execute its valuation algorithm.

`prepare_inventory_cost_cleanup(connection_id, native_advice_reference, pairs)` accepts up to 20 explicit `{remove_key, remove_hash, retain_key, retain_hash}` pairs. Both native forms must match the same item and exact date. Different values are disclosed, not resolved algorithmically. The native advice reference is user-supplied provenance, not backend-verified evidence or authorization. It creates an encrypted `prepare_record_changes` task only. Review the full deletion preview, then use the existing `apply_record_changes` transport with its task ID and hash under explicit deletion authorization.

Record-change tasks now accept optional read-only `guards` containing resource/key/current hash. These guards are encrypted with the task, bound into its preview hash, checked at preparation, before dispatch and after mutations. A changed or unreadable retained record stops remaining writes. This is not an atomic database lock; concurrent upstream edits remain a limitation. Existing conflict, exclusive task claim, uncertain-result stopping, per-record readback and no replay behavior remain in place.

After execution read `get_record_change_task`, confirm deletion/retention and reread inventory, COGS, GL and native correction proposals. Zero duplicate groups does not prove costing complete. Native Apply Changes can leave more native actions. Completion requires a fresh empty applicable proposal queue, unchanged quantities and reconciled inventory plus COGS. Stop on repeated identical proposals or uncertainty.

## Native recalculation boundary

The inspected Manager API2 catalogue exposes stored unit-cost forms, not the native Recalculate operation. No API4 authentication or payload has been verified. Therefore these interfaces implement review and guarded native-record cleanup, not automatic recalculation. The real native calculation must continue through the authorized Manager UI until a supported operation is documented and tested. Do not deploy a placeholder tool that claims recalculation succeeded.

Synthetic regression tests exercise pagination failure, unknown completion, differing-value duplicates, retained-record conflicts, exact-date validation, company/user isolation and no replay. These tests do not prove a production costing algorithm or real-company deletion. No real accounting writes are part of interface development.
