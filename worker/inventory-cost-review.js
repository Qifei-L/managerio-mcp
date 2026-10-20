// Review native records; never implement or impersonate Manager's costing algorithm.
export async function inventoryCostState(c, args, envelope, h) {
  const read = endpoint => h.module(c, {module:'inventory', endpoint, auto_paginate:true,
    page_size:100, max_pages:args.max_pages ?? 10}, envelope, false);
  const inventory = await read('/inventory-items');
  const costs = await read('/inventory-unit-costs');
  const groups = new Map(), unresolved = [];
  for (const row of costs.items) {
    const item = row.inventoryItem?.key, date = row.date, key = row.key;
    if (!h.uuid.test(item ?? '') || !h.uuid.test(key ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ||
        row.unitCost?.value === null || typeof row.unitCost?.value !== 'number' || !Number.isFinite(row.unitCost.value)) {
      unresolved.push(row); continue;
    }
    const id = item.toLowerCase()+'|'+date;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  const duplicates = [...groups.values()].filter(rows => rows.length > 1).map(records => ({
    inventory_item_key:records[0].inventoryItem.key, date:records[0].date, records,
    values_identical:records.every(r => JSON.stringify(r.unitCost) === JSON.stringify(records[0].unitCost)),
    retention_decision:'requires_explicit_native_evidence'
  }));
  const capability = await h.inspect(c, envelope);
  return {...envelope, inventory, unit_costs:costs, complete:inventory.complete && costs.complete,
    snapshot_hash:await h.hash({inventory:inventory.items, costs:costs.items}),
    duplicate_groups:duplicates, unresolved_records:unresolved,
    native_recalculation:capability.native_recalculation,
    native_recalculation_complete:null, pending_native_actions:null,
    read_only:true, writes_performed:0,
    limitations:['Complete applies to the two record collections, not the native correction queue.',
      'Duplicate item/date records do not establish which record is obsolete. No winner is inferred.',
      'Native pending actions must be read from a verified native action or current UI; zero duplicates does not prove recalculation complete.',
      'Money objects and unknown currencies are preserved; no mixed or unknown currency totals are computed.',
      'Live offset pages are not a transactional snapshot.']};
}

export async function prepareInventoryCostCleanup(c, args, envelope, h) {
  const used = new Set(), removals = new Set(args.pairs.map(p => p.remove_key.toLowerCase()));
  const changes = [], guards = new Map(), evidence = [];
  for (const pair of args.pairs) {
    if (used.has(pair.remove_key.toLowerCase()) || removals.has(pair.retain_key.toLowerCase()))
      throw new h.Error('Duplicate removal or retained record also scheduled for removal.');
    used.add(pair.remove_key.toLowerCase());
    const before = await h.read(c, pair.remove_key), retained = await h.read(c, pair.retain_key);
    if (await h.hash(before) !== pair.remove_hash || await h.hash(retained) !== pair.retain_hash)
      throw new h.Error('Unit-cost record changed; read both records again.',409);
    if (!h.uuid.test(before.InventoryItem ?? '') || before.InventoryItem.toLowerCase() !== retained.InventoryItem?.toLowerCase() ||
        typeof before.Date !== 'string' || before.Date !== retained.Date)
      throw new h.Error('Cleanup pairs must identify the same native inventory item and exact date.');
    if (![before.UnitCost,retained.UnitCost].every(x => typeof x === 'number' && Number.isFinite(x)))
      throw new h.Error('Native unit-cost amounts are unresolved.');
    changes.push({operation:'delete', resource:'inventory_unit_costs', key:pair.remove_key, expected_hash:pair.remove_hash});
    guards.set(pair.retain_key.toLowerCase(), {resource:'inventory_unit_costs', key:pair.retain_key, expected_hash:pair.retain_hash});
    evidence.push({removed:before, retained, values_differ:before.UnitCost !== retained.UnitCost});
  }
  const task = await h.prepare({connection_id:c.id, changes, guards:[...guards.values()]});
  return {...envelope, ...task, cleanup_evidence:evidence, native_advice_reference:args.native_advice_reference,
    writes_performed:0, native_recalculation_complete:null,
    next_action:'Review and authorize the exact permanent deletions, then use apply_record_changes. Inspect saved results and reread native pending actions; no replay.',
    limitation:'Only explicit same-item/date duplicate pairs are supported here. Other native correction actions require their own evidenced workflow. This preview does not validate the costing algorithm or infer obsolete records.'};
}
