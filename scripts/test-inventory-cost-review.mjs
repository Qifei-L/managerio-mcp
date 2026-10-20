import assert from 'node:assert/strict';
import worker,{isReadOnlyTool} from '../worker/index.js';
const id=n=>'60000000-0000-4000-8000-'+String(n).padStart(12,'0');
const records=new Map([[id(1),{Key:id(1),Date:'2026-02-05T00:00:00',InventoryItem:id(9),UnitCost:227.42}],
  [id(2),{Key:id(2),Date:'2026-02-05T00:00:00',InventoryItem:id(9),UnitCost:227.47}]]);
const objects=new Map();let revision=0,writes=0,mode='normal';
const env={MANAGER_TOKEN_ENCRYPTION_KEY:'af'.repeat(32),BUCKET:{
  get:async k=>objects.has(k)?{etag:objects.get(k).etag,json:async()=>JSON.parse(objects.get(k).body)}:null,
  put:async(k,body,opts={})=>{const prev=objects.get(k);if(opts.onlyIf?.etagMatches!==undefined&&prev?.etag!==opts.onlyIf.etagMatches)return null;
    if(opts.onlyIf?.etagDoesNotMatch==='*'&&prev)return null;const etag=String(++revision);objects.set(k,{body,etag});return{etag};},
  list:async({prefix})=>({objects:[...objects.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false})}};
const params=[{in:'query',name:'skip',schema:{type:'integer'}},{in:'query',name:'pageSize',schema:{type:'integer'}}];
const paths={'/inventory-items':{get:{parameters:params}},'/inventory-unit-costs':{get:{parameters:params}},'/inventory-unit-cost-form/{key}':{get:{},delete:{}}};
const original=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{
  const u=new URL(url),p=u.pathname.replace('/api2','');assert.equal(opts.headers['X-API-KEY'],'fixture');
  if(p==='')return Response.json({paths});
  if(p==='/chart-of-accounts')return Response.json({business:{name:'Sample Use'},totalRecords:0,chartOfAccounts:[]});
  if(p==='/inventory-items')return Response.json({totalRecords:1,inventoryItems:[{key:id(9),itemName:'Fixture',qtyOwned:4,totalCost:{value:40,currency:null}}]});
  if(p==='/inventory-unit-costs')return Response.json({totalRecords:mode==='repeat'?200:records.size,inventoryUnitCosts:[...records.values()].map(r=>({key:r.Key,date:r.Date.slice(0,10),inventoryItem:{key:r.InventoryItem,name:'Fixture'},unitCost:{value:r.UnitCost,currency:null}}))});
  if(p.startsWith('/inventory-unit-cost-form/')){const key=p.split('/').at(-1);if(!records.has(key))return new Response(null,{status:404});
    if(opts.method==='DELETE'){writes++;records.delete(key);return new Response(null,{status:204});}return Response.json(records.get(key));}
  throw Error('Unexpected path '+p);
};
async function request(path,body,user='owner'){return(await worker.fetch(new Request('https://cost.test'+path,{method:'POST',headers:{Origin:'https://cost.test','Content-Type':'application/json','oai-authenticated-user-id':user},body:JSON.stringify(body)}),env)).json();}
async function rpc(name,args,user){return(await request('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}},user)).result;}
try{
  const c=(await request('/api/connections',{token:'fixture'})).connection.connection_id;
  assert.equal(isReadOnlyTool('get_inventory_cost_state'),true);
  assert.equal(isReadOnlyTool('prepare_inventory_cost_cleanup'),true);
  let r=await rpc('get_inventory_cost_state',{connection_id:c});assert(!r.isError,JSON.stringify(r));
  assert.equal(r.structuredContent.complete,true);assert.equal(r.structuredContent.duplicate_groups.length,1);
  assert.equal(r.structuredContent.duplicate_groups[0].values_identical,false);assert.equal(r.structuredContent.native_recalculation_complete,null);
  assert.equal(r.structuredContent.pending_native_actions,null);assert.equal(writes,0);
  assert((await rpc('get_inventory_cost_state',{connection_id:c},'intruder')).isError);
  mode='repeat';r=await rpc('get_inventory_cost_state',{connection_id:c});assert.equal(r.structuredContent.complete,false);mode='normal';
  const read=async key=>(await rpc('get_record',{connection_id:c,resource:'inventory_unit_costs',key})).structuredContent;
  const a=await read(id(1)),b=await read(id(2));
  const args={connection_id:c,native_advice_reference:'Reviewed native correction screen, fixture only',pairs:[{remove_key:id(1),remove_hash:a.record_hash,retain_key:id(2),retain_hash:b.record_hash}]};
  r=await rpc('prepare_inventory_cost_cleanup',args);assert(!r.isError,JSON.stringify(r));assert.equal(writes,0);
  let task=r.structuredContent;assert.equal(task.guards[0].key,id(2));assert.equal(task.changes[0].operation,'delete');assert.equal(task.cleanup_evidence[0].values_differ,true);
  assert((await rpc('prepare_inventory_cost_cleanup',{...args,pairs:[{...args.pairs[0],remove_hash:'0'.repeat(64)}]})).isError);
  records.get(id(2)).UnitCost=228;
  r=await rpc('apply_record_changes',{connection_id:c,task_id:task.task_id,preview_hash:task.preview_hash});assert.equal(r.structuredContent.status,'stopped_conflict');assert.equal(writes,0);
  records.get(id(2)).UnitCost=227.47;
  records.get(id(2)).Date='2026-02-06T00:00:00';const wrongDate=await read(id(2));
  assert((await rpc('prepare_inventory_cost_cleanup',{...args,pairs:[{...args.pairs[0],retain_hash:wrongDate.record_hash}]})).isError);
  records.get(id(2)).Date='2026-02-05T00:00:00';
  assert((await rpc('prepare_inventory_cost_cleanup',{...args,pairs:[{...args.pairs[0],retain_key:id(1),retain_hash:a.record_hash}]})).isError);
  r=await rpc('prepare_inventory_cost_cleanup',args);task=r.structuredContent;
  r=await rpc('apply_record_changes',{connection_id:c,task_id:task.task_id,preview_hash:task.preview_hash});assert.equal(r.structuredContent.status,'completed');assert.equal(writes,1);assert(records.has(id(2)));
  await rpc('apply_record_changes',{connection_id:c,task_id:task.task_id,preview_hash:task.preview_hash});assert.equal(writes,1);
  r=await rpc('get_inventory_cost_state',{connection_id:c});assert.equal(r.structuredContent.duplicate_groups.length,0);assert.equal(r.structuredContent.native_recalculation_complete,null);
  assert((await rpc('prepare_inventory_cost_cleanup',{...args,unexpected:true})).isError);
  console.log('PASS inventory cost review: complete/partial reads, unresolved native completion, explicit differing-value duplicate preview, retained-record conflicts, date mismatch, ownership, permanent-delete readback and no replay. Synthetic fixture only.');
}finally{globalThis.fetch=original;}
