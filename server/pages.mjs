// Browser pages for the service. Plain HTML/CSS/JS, no build step.
// Page scripts are written inside template literals: they avoid backticks and ${...}.

const style = `
:root{--text:#1d1d1f;--text2:#5f5f63;--muted:#8c8c91;--border:#e4e4e7;--border2:#d0d0d6;--surface:#ffffff;--surface1:#f7f7f8;--surface2:#efeff1;--primary:#1d1d1f;--primary-hover:#3a3a3d;
--ok-bg:#e8f5ec;--ok:#1d6b3a;--warn-bg:#fdf3dc;--warn:#835400;--danger-bg:#fdeceb;--danger:#a32d2d;--radius:7px;
font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;font-size:14px;color:var(--text);background:var(--surface);font-synthesis:none}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;line-height:1.5}a{color:inherit}button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #6b6bff;outline-offset:2px}
.btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--surface);font-size:13px;white-space:nowrap}
.btn:hover{background:var(--surface1)}.btn:disabled{opacity:.55;cursor:wait}.btn.primary{background:var(--primary);border-color:var(--primary);color:#fff}.btn.primary:hover{background:var(--primary-hover)}
.btn.danger{background:var(--danger);border-color:var(--danger);color:#fff}.btn.sm{height:26px;padding:0 9px;font-size:12px}.btn.ghost{border-color:transparent;background:none}.btn.ghost:hover{background:var(--surface2)}
input,select,textarea{height:34px;padding:0 10px;border:1px solid var(--border2);border-radius:var(--radius);background:var(--surface);font-size:13px;width:100%}textarea{height:auto;padding:8px 10px;resize:vertical}
input:focus,select:focus,textarea:focus{border-color:var(--text2);outline:none}
label.field{display:block;margin:0 0 14px}label.field span{display:block;font-size:12px;color:var(--text2);margin-bottom:5px}
.badge{display:inline-block;font-size:11px;line-height:18px;padding:0 8px;border-radius:99px;background:var(--surface2);color:var(--text2);white-space:nowrap}.badge.ok{background:var(--ok-bg);color:var(--ok)}.badge.warn{background:var(--warn-bg);color:var(--warn)}.badge.danger{background:var(--danger-bg);color:var(--danger)}
.app{display:grid;grid-template-columns:200px minmax(0,1fr);min-height:100svh}
.side{background:var(--surface1);border-right:1px solid var(--border);padding:16px 10px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;height:100svh}
.brand{font-weight:600;font-size:15px;padding:2px 10px 18px}
.nav{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:var(--radius);color:var(--text2);text-decoration:none;font-size:13px}.nav:hover{background:var(--surface2);color:var(--text)}
.nav[aria-current=page]{background:var(--surface);color:var(--text);font-weight:600;box-shadow:0 0 0 1px var(--border)}.nav svg{flex:none}.nav .badge{margin-left:auto}
.me{margin-top:auto;border-top:1px solid var(--border);padding:12px 10px 0;font-size:12px;color:var(--text2)}.me b{display:block;color:var(--text);font-weight:600;font-size:13px}
.linkbtn{border:0;background:none;padding:0;color:var(--text);text-decoration:underline;font-size:12px;margin-top:6px}
main{padding:28px 32px 48px;max-width:1080px;width:100%}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}h1{font-size:20px;font-weight:600;margin:0;letter-spacing:-.2px}.count{font-size:14px;color:var(--muted);font-weight:400;margin-left:6px}
h2{font-size:15px;font-weight:600;margin:0 0 4px}.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.toolbar{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}.toolbar input{max-width:320px;height:32px}
.chip{height:28px;padding:0 11px;border-radius:99px;border:1px solid var(--border);background:var(--surface);font-size:12px;color:var(--text2)}.chip[aria-pressed=true]{background:var(--surface2);border-color:var(--border2);color:var(--text);font-weight:600}
table.grid{width:100%;border-collapse:collapse;font-size:13px}table.grid th{font-weight:500;font-size:12px;color:var(--text2);text-align:left;padding:7px 10px;border-bottom:1px solid var(--border);white-space:nowrap}
table.grid td{padding:9px 10px;border-bottom:1px solid var(--border);vertical-align:middle}table.grid tr:hover td{background:var(--surface1)}table.grid td.right,table.grid th.right{text-align:right}
.name{font-weight:500;overflow-wrap:anywhere}.sub{font-size:12px;color:var(--muted);overflow-wrap:anywhere}.num{font-variant-numeric:tabular-nums}.nowrap{white-space:nowrap}
.empty{padding:40px 10px;text-align:center;color:var(--text2)}.note{font-size:12px;color:var(--muted);margin-top:12px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--warn-bg);color:var(--warn);border-radius:var(--radius);padding:9px 12px;margin-bottom:14px;font-size:13px;flex-wrap:wrap}
.tabs{display:flex;gap:20px;border-bottom:1px solid var(--border);margin-bottom:18px}.tabs button{border:0;background:none;padding:8px 0;color:var(--text2);font-size:13px;border-bottom:2px solid transparent;margin-bottom:-1px}.tabs button[aria-selected=true]{color:var(--text);font-weight:600;border-bottom-color:var(--text)}.tabs .count{font-size:12px;margin-left:2px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}.card{background:var(--surface1);border-radius:var(--radius);padding:12px 14px}.card h3{font-size:13px;margin:0 0 4px}.card p{margin:0;font-size:12px;color:var(--text2)}
.copyrow{display:flex;gap:8px;margin-bottom:14px}.copyrow input{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.secret{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:var(--surface1);border:1px solid var(--border);border-radius:var(--radius);padding:10px;overflow-wrap:anywhere;margin:10px 0}
dialog{border:1px solid var(--border);border-radius:10px;padding:22px;width:calc(100% - 32px);max-width:440px;color:var(--text);box-shadow:0 12px 40px rgba(0,0,0,.14)}dialog::backdrop{background:rgba(20,20,24,.35)}
dialog h2{font-size:16px;margin-bottom:8px}dialog p{font-size:13px;color:var(--text2);margin:0 0 12px}.foot{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.err{color:var(--danger);font-size:12px;min-height:16px;margin:0 0 8px}
.menu{position:absolute;z-index:20;min-width:170px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:0 8px 24px rgba(0,0,0,.12);padding:4px}.menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:7px 10px;border-radius:5px;font-size:13px}.menu button:hover{background:var(--surface1)}.menu button.danger{color:var(--danger)}
#toasts{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:50}.toast{background:var(--primary);color:#fff;border-radius:var(--radius);padding:9px 14px;font-size:13px;max-width:360px;box-shadow:0 6px 20px rgba(0,0,0,.18)}.toast.bad{background:var(--danger)}
.login{min-height:100svh;display:grid;place-items:center;padding:24px;background:var(--surface1);max-width:none}.login-box{width:100%;max-width:360px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px}.login-box .brand{padding:0 0 22px}.login-box h1{margin-bottom:4px}.login-box .intro{color:var(--text2);font-size:13px;margin:0 0 20px}.login-box .btn{width:100%;justify-content:center;height:36px}.login-foot{margin-top:16px;font-size:12px;color:var(--text2);text-align:center}
@media(max-width:760px){.app{grid-template-columns:1fr}.side{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px;padding:10px 12px;border-right:0;border-bottom:1px solid var(--border)}.brand{padding:0 8px 0 4px;width:100%;margin-bottom:4px}.me{margin:0 0 0 auto;border:0;padding:0;display:flex;gap:10px;align-items:center}.me b{display:inline}.me br{display:none}.linkbtn{margin:0}main{padding:18px 14px 40px}.hide-sm{display:none}}
`;

const icons = {
  companies: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/>',
  mcp: '<path d="M7 12h10M9 7V3M15 7V3M6 7h12v5a6 6 0 0 1-12 0zM12 18v3"/>',
  users: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9"/>',
  account: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
};
const icon = name => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

function document(title, content, script) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Evertrust Books</title><style>${style}</style></head><body>${content}<script>${script}</script></body></html>`;
}

// Helpers shared by every signed-in page.
const common = `
const $=id=>document.getElementById(id);
function h(tag,props){const e=document.createElement(tag);for(const k in props||{}){const v=props[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v)}for(const kid of Array.prototype.slice.call(arguments,2).flat()){if(kid==null||kid===false)continue;e.append(kid.nodeType?kid:document.createTextNode(String(kid)))}return e}
async function api(path,body,method){const response=await fetch(path,{method:method||(body?'POST':'GET'),headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});if(response.status===401){location.replace('/login');throw Error('Your session has ended. Sign in again.')}const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Request failed. Try again.');return data}
function toast(message,bad){const t=h('div',{class:'toast'+(bad?' bad':''),role:'status',text:message});$('toasts').append(t);setTimeout(()=>t.remove(),bad?6000:3200)}
function day(ms){if(!ms)return '—';const d=new Date(ms),now=new Date();return d.toLocaleDateString(undefined,d.getFullYear()===now.getFullYear()?{month:'short',day:'numeric'}:{year:'numeric',month:'short',day:'numeric'})}
function stamp(ms){return ms?new Date(ms).toLocaleString():'—'}
async function copy(value){try{await navigator.clipboard.writeText(value);toast('Copied')}catch{toast('Clipboard unavailable. Select the text and copy it.',true)}}
function busy(button,work){return async function(){button.disabled=true;try{await work()}catch(e){toast(e.message,true)}finally{button.disabled=false}}}
let openMenu=null;function closeMenu(){if(openMenu){openMenu.remove();openMenu=null}}
document.addEventListener('click',e=>{if(openMenu&&!openMenu.contains(e.target))closeMenu()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
function menu(items){return h('button',{class:'btn sm ghost',type:'button','aria-label':'More actions','aria-haspopup':'menu',text:'···',onclick:e=>{e.stopPropagation();const owner=e.currentTarget;const reopen=openMenu&&openMenu.owner===owner;closeMenu();if(reopen)return;const r=owner.getBoundingClientRect();const m=h('div',{class:'menu',role:'menu'},items.filter(Boolean).map(it=>h('button',{type:'button',role:'menuitem',class:it.danger?'danger':'',text:it.label,onclick:()=>{closeMenu();Promise.resolve().then(it.run).catch(err=>toast(err.message,true))}})));m.owner=owner;document.body.append(m);m.style.top=(window.scrollY+r.bottom+4)+'px';m.style.left=Math.max(8,window.scrollX+r.right-m.offsetWidth)+'px';openMenu=m;const first=m.querySelector('button');if(first)first.focus()}})}
function confirmBox(title,text,label,danger){return new Promise(resolve=>{const d=$('confirmDlg');$('confirmTitle').textContent=title;$('confirmText').textContent=text;const ok=$('confirmOk');ok.textContent=label;ok.className='btn '+(danger?'danger':'primary');d.returnValue='';d.onclose=()=>resolve(d.returnValue==='ok');d.showModal()})}
function chips(root,options,current,onpick){root.replaceChildren(...options.map(o=>h('button',{type:'button',class:'chip','aria-pressed':String(o.value===current),text:o.label+' '+o.count,onclick:()=>onpick(o.value)})))}
`;

// Shared sidebar for signed-in pages. The Users item and its pending count load from the API.
function shell(title, current, content, script) {
  const link = (href, name, label) => `<a class="nav" href="${href}"${href === current ? ' aria-current="page"' : ''}>${icon(name)}${label}</a>`;
  return document(title, `
<div class="app"><aside class="side" aria-label="Main"><div class="brand">Evertrust Books</div>
${link('/', 'companies', 'Companies')}${link('/mcp-settings', 'mcp', 'MCP access')}<span id="navAdmin" hidden>${link('/admin', 'users', 'Users <span class="badge warn" id="pendingCount" hidden></span>')}</span>${link('/account', 'account', 'Account')}
<div class="me"><b id="meName">…</b><span id="meRole"></span><br><button class="linkbtn" id="logout" type="button">Sign out</button></div></aside>
<main>${content}</main></div>
<dialog id="confirmDlg" aria-labelledby="confirmTitle"><form method="dialog"><h2 id="confirmTitle"></h2><p id="confirmText"></p><div class="foot"><button class="btn" value="cancel">Cancel</button><button class="btn primary" id="confirmOk" value="ok"></button></div></form></dialog>
<div id="toasts" aria-live="polite"></div>`, `${common}
function onUser(fn){if(window.currentUser)fn(window.currentUser);else document.addEventListener('user',e=>fn(e.detail),{once:true})}
fetch('/api/auth/me').then(r=>{if(r.status===401){location.replace('/login');return null}return r.json()}).then(data=>{if(!data||!data.user)return;const u=data.user;window.currentUser=u;$('meName').textContent=u.username;$('meRole').textContent=u.role==='admin'?'Administrator':'User';if(u.role==='admin'){$('navAdmin').hidden=false;$('navAdmin').style.display='contents';fetch('/api/admin/users').then(r=>r.json()).then(d=>{const n=(d.users||[]).filter(x=>x.status==='pending').length;if(n){$('pendingCount').textContent=n;$('pendingCount').hidden=false}}).catch(()=>{})}document.dispatchEvent(new CustomEvent('user',{detail:u}))}).catch(()=>{});
$('logout').onclick=async()=>{try{await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})}finally{location.replace('/login')}};
${script}`);
}

function authPage(title, heading, intro, fields, button, footer, script) {
  return document(title, `
<main class="login"><section class="login-box"><div class="brand">Evertrust Books</div><h1>${heading}</h1><p class="intro">${intro}</p><form id="authForm">${fields}<p class="err" id="error" role="alert" aria-live="polite"></p><button class="btn primary" id="submit" type="submit">${button}</button></form><div class="login-foot">${footer}</div></section></main>
`, `const form=document.getElementById('authForm'),button=document.getElementById('submit'),error=document.getElementById('error');${script}`);
}

export const loginPage = authPage('Sign in', 'Welcome back.', 'Sign in to manage your companies and MCP access.',
  `<label class="field" for="username"><span>Username</span><input id="username" name="username" autocomplete="username" required></label><label class="field" for="password"><span>Password</span><input id="password" name="password" type="password" autocomplete="current-password" required></label>`,
  'Sign in', `No account yet? <a href="/register">Create one</a>`, `
// Only same-site paths are accepted as a return address after signing in.
const next=new URLSearchParams(location.search).get('next');const target=next&&next.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\\\')?next:'/';
form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;button.textContent='Signing in…';error.textContent='';try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.username.value.trim(),password:form.password.value})});const data=await response.json().catch(()=>({}));if(!response.ok){error.textContent=data.error||'Couldn\\'t sign in. Try again.';return}form.reset();location.replace(data.user&&data.user.must_change_password&&target==='/'?'/account?reset=1':target)}catch{error.textContent='Couldn\\'t reach the service. Try again.'}finally{button.disabled=false;button.textContent='Sign in'}});
`);

export const registerPage = authPage('Create account', 'Create an account', 'An administrator approves new accounts before you can sign in.',
  `<label class="field" for="username"><span>Username</span><input id="username" name="username" autocomplete="username" required minlength="3" maxlength="100" placeholder="Letters, digits, . _ @ + -"></label><label class="field" for="password"><span>Password</span><input id="password" name="password" type="password" autocomplete="new-password" required minlength="10" placeholder="At least 10 characters"></label><label class="field" for="confirm"><span>Confirm password</span><input id="confirm" name="confirm" type="password" autocomplete="new-password" required minlength="10"></label>`,
  'Create account', `Already have an account? <a href="/login">Sign in</a>`, `
form.addEventListener('submit',async event=>{event.preventDefault();error.textContent='';if(form.password.value!==form.confirm.value){error.textContent='Passwords don\\'t match.';return}button.disabled=true;try{const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.username.value.trim(),password:form.password.value})});const data=await response.json().catch(()=>({}));if(!response.ok){error.textContent=data.error||'Couldn\\'t create the account.';return}const done=document.createElement('p');done.textContent='Account created. You can sign in after an administrator approves it.';form.replaceChildren(done)}catch{error.textContent='Couldn\\'t reach the service. Try again.'}finally{button.disabled=false}});
`);

export const connectionsPage = shell('Companies', '/', `
<div class="head"><h1>Companies<span class="count" id="total"></span></h1><div class="actions"><button class="btn" id="testAll" type="button">Test all</button><button class="btn primary" id="add" type="button">Add connection</button></div></div>
<div class="toolbar"><input id="search" type="search" placeholder="Search companies" aria-label="Search companies"><div class="actions" id="filters" role="group" aria-label="Filter by status"></div></div>
<table class="grid" aria-label="Company connections"><thead><tr><th>Company</th><th class="hide-sm">Token</th><th>Status</th><th class="hide-sm">Verified</th><th class="right"></th></tr></thead><tbody id="rows"><tr><td colspan="5" class="empty">Loading companies…</td></tr></tbody></table>
<p class="note">Manager access tokens are encrypted and never shown after saving.</p>
<dialog id="editor" aria-labelledby="editorTitle"><form id="connectionForm"><h2 id="editorTitle">Add connection</h2><p id="editorHint">Paste the access token from the company's Manager settings.</p><label class="field" for="token"><span id="tokenLabel">Manager access token</span><input id="token" name="token" type="password" autocomplete="off" spellcheck="false" required></label><label class="field" for="label"><span>Label (optional)</span><input id="label" name="label" maxlength="120" placeholder="Accounting team"></label><label class="field" for="notes"><span>Notes (optional)</span><textarea id="notes" name="notes" rows="2" maxlength="500"></textarea></label><p class="err" id="formError" role="alert"></p><div class="foot"><button class="btn" type="button" id="cancel">Cancel</button><button class="btn primary" id="save" type="submit">Connect company</button></div></form></dialog>
`, `
let all=[],filter='all',editing=null;
const statusOf=c=>c.status==='connected'?['ok','Connected']:c.status==='failed'?['warn','Check token']:['','Not verified'];
function render(){const q=$('search').value.trim().toLowerCase();const needs=all.filter(c=>c.status!=='connected');
chips($('filters'),[{value:'all',label:'All',count:all.length},{value:'ok',label:'Connected',count:all.length-needs.length},{value:'attention',label:'Needs attention',count:needs.length}],filter,v=>{filter=v;render()});
const shown=all.filter(c=>(filter==='all'||(filter==='ok'?c.status==='connected':c.status!=='connected'))&&(!q||[c.business_name,c.token_name,c.label].some(x=>(x||'').toLowerCase().includes(q))));
$('total').textContent=all.length;const rows=$('rows');rows.replaceChildren();
if(!all.length){rows.append(h('tr',{},h('td',{colspan:5,class:'empty'},'No companies yet. ',h('button',{class:'btn sm',type:'button',text:'Add your first connection',onclick:()=>openEditor()}))));return}
if(!shown.length){rows.append(h('tr',{},h('td',{colspan:5,class:'empty',text:'No companies match this search.'})));return}
for(const c of shown){const s=statusOf(c);const name=(c.business_name||'Unknown company').trim();const test=h('button',{class:'btn sm',type:'button',text:'Test'});test.onclick=busy(test,async()=>{const r=await api('/api/connections/'+c.connection_id+'/test',{});await load();toast(r.ok?name+' connected':(r.connection&&r.connection.last_error)||'Couldn\\'t verify '+name,!r.ok)});
rows.append(h('tr',{},h('td',{},h('div',{class:'name',text:name}),c.label?h('div',{class:'sub',text:c.label}):null),h('td',{class:'hide-sm nowrap',text:c.token_name||'Manager token'}),h('td',{},h('span',{class:'badge '+s[0],text:s[1],title:c.last_error||null})),h('td',{class:'hide-sm num',text:day(Date.parse(c.verified_at||'')||0)}),
h('td',{class:'right'},h('div',{class:'actions',style:'justify-content:flex-end;flex-wrap:nowrap'},test,menu([{label:'Edit',run:()=>openEditor(c)},{label:'Remove',danger:true,run:()=>remove(c)}])))))}}
async function load(){const data=await api('/api/connections');all=data.connections.slice().sort((a,b)=>(a.business_name||'').trim().localeCompare((b.business_name||'').trim()));render()}
function openEditor(c){editing=c||null;$('connectionForm').reset();$('label').value=c?c.label||'':'';$('notes').value=c?c.notes||'':'';$('token').required=!c;$('token').placeholder=c?'Leave empty to keep the current token':'';$('tokenLabel').textContent=c?'Replace access token (optional)':'Manager access token';$('editorTitle').textContent=c?'Edit '+(c.business_name||'connection').trim():'Add connection';$('editorHint').textContent=c?'Update the label, notes or access token.':'Paste the access token from the company\\'s Manager settings.';$('save').textContent=c?'Save changes':'Connect company';$('formError').textContent='';$('editor').showModal()}
async function remove(c){if(!await confirmBox('Remove '+(c.business_name||'connection').trim()+'?','This removes the saved token from Evertrust Books. Records in Manager stay as they are.','Remove',true))return;await api('/api/connections/'+c.connection_id,{},'DELETE');await load();toast('Connection removed')}
$('add').onclick=()=>openEditor();$('cancel').onclick=()=>$('editor').close();$('search').oninput=render;
$('connectionForm').addEventListener('submit',async event=>{event.preventDefault();const b=$('save');b.disabled=true;$('formError').textContent='';try{const body={label:$('label').value,notes:$('notes').value},token=$('token').value.trim();if(token)body.token=token;await api(editing?'/api/connections/'+editing.connection_id+(token?'/token':''):'/api/connections',body);$('editor').close();await load();toast(editing?'Connection updated':'Company connected')}catch(e){$('formError').textContent=e.message}finally{b.disabled=false}});
$('testAll').onclick=busy($('testAll'),async()=>{let ok=0,bad=0;const list=all.slice();try{for(let i=0;i<list.length;i++){$('testAll').textContent='Testing '+(i+1)+'/'+list.length+'…';try{const r=await api('/api/connections/'+list[i].connection_id+'/test',{});if(r.ok)ok++;else bad++}catch{bad++}}}finally{$('testAll').textContent='Test all'}await load();toast(bad?ok+' connected, '+bad+' need attention':'All '+ok+' companies connected',bad>0)});
load().catch(e=>{$('rows').replaceChildren(h('tr',{},h('td',{colspan:5,class:'empty',text:e.message})))});
`);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

// MCP access: endpoint, authorized apps and personal access tokens for the signed-in user.
// No password or master credential is ever rendered.
export function mcpSettingsPage(config) {
  const endpoint = escapeHtml(`${config.origin}/mcp`);
  return shell('MCP access', '/mcp-settings', `
<div class="head"><h1>MCP access</h1></div>
<div class="tabs" role="tablist"><button type="button" role="tab" id="tab-connect" aria-controls="panel-connect" aria-selected="true">Connect</button><button type="button" role="tab" id="tab-apps" aria-controls="panel-apps" aria-selected="false">Authorized apps<span class="count" id="appCount"></span></button><button type="button" role="tab" id="tab-tokens" aria-controls="panel-tokens" aria-selected="false">Personal tokens<span class="count" id="tokenCount"></span></button></div>
<section role="tabpanel" id="panel-connect" aria-labelledby="tab-connect">
<div class="copyrow"><input id="endpoint" value="${endpoint}" readonly spellcheck="false" aria-label="MCP URL"><button class="btn" id="copyUrl" type="button">Copy</button><button class="btn primary" id="test" type="button">Test</button></div>
<div class="cards"><div class="card"><h3>Claude</h3><p>Add a remote MCP server with this URL, then choose Sign in now and Register automatically.</p></div><div class="card"><h3>ChatGPT</h3><p>Choose OAuth with automatic client registration. Leave client ID and secret empty.</p></div><div class="card"><h3>Other clients</h3><p>Create a personal token and send it as <code>Authorization: Bearer &lt;token&gt;</code>.</p></div></div>
<p class="note" id="testStatus">You sign in with your own username and password when an app asks for access.</p></section>
<section role="tabpanel" id="panel-apps" aria-labelledby="tab-apps" hidden><p class="note" style="margin:0 0 10px">Apps you approved through OAuth. Revoking signs the app out right away.</p>
<table class="grid"><thead><tr><th>App</th><th class="hide-sm">Authorized</th><th class="hide-sm">Renews until</th><th class="right"></th></tr></thead><tbody id="apps"></tbody></table></section>
<section role="tabpanel" id="panel-tokens" aria-labelledby="tab-tokens" hidden><div class="head" style="margin-bottom:10px"><p class="note" style="margin:0">Personal access tokens can only call the MCP endpoint, never these pages.</p><button class="btn primary" id="newToken" type="button">Create token</button></div>
<table class="grid"><thead><tr><th>Name</th><th class="hide-sm">Created</th><th>Expires</th><th class="hide-sm">Last used</th><th class="right"></th></tr></thead><tbody id="tokens"></tbody></table></section>
<dialog id="tokenDlg" aria-labelledby="tokenTitle"><form id="tokenForm"><h2 id="tokenTitle">Create token</h2><div id="tokenFields"><label class="field" for="tokenName"><span>Name</span><input id="tokenName" maxlength="100" required placeholder="Office laptop"></label><label class="field" for="tokenDays"><span>Expires</span><select id="tokenDays"><option value="30">In 30 days</option><option value="90" selected>In 90 days</option><option value="365">In 1 year</option><option value="">Never</option></select></label></div>
<div id="tokenShown" hidden><p>Copy this token now. It won't be shown again.</p><div class="secret" id="tokenValue"></div></div><p class="err" id="tokenError" role="alert"></p>
<div class="foot"><button class="btn" type="button" id="tokenCancel">Cancel</button><button class="btn" type="button" id="tokenCopy" hidden>Copy token</button><button class="btn primary" type="submit" id="tokenCreate">Create</button></div></form></dialog>
`, `
const tabs=['connect','apps','tokens'];function show(name){if(!tabs.includes(name))name='connect';for(const t of tabs){$('tab-'+t).setAttribute('aria-selected',String(t===name));$('panel-'+t).hidden=t!==name}history.replaceState(null,'',name==='connect'?location.pathname:'#'+name)}
for(const t of tabs)$('tab-'+t).onclick=()=>show(t);show(location.hash.slice(1));
$('copyUrl').onclick=()=>copy($('endpoint').value);
function empty(root,cols,text){root.replaceChildren(h('tr',{},h('td',{colspan:cols,class:'empty',text})))}
function revokeButton(run){const b=h('button',{class:'btn sm',type:'button',text:'Revoke'});b.onclick=busy(b,run);return b}
async function load(){const data=await api('/api/tokens');$('appCount').textContent=data.apps.length||'';$('tokenCount').textContent=data.tokens.length||'';
const apps=$('apps');apps.replaceChildren();if(!data.apps.length)empty(apps,4,'No apps authorized yet. Connect one from the Connect tab.');
for(const a of data.apps)apps.append(h('tr',{},h('td',{class:'name',text:a.client_name}),h('td',{class:'hide-sm',text:stamp(a.authorized)}),h('td',{class:'hide-sm',text:day(a.expires)}),h('td',{class:'right'},revokeButton(async()=>{if(!await confirmBox('Revoke '+a.client_name+'?','The app loses access right away and has to be approved again.','Revoke',true))return;await api('/api/oauth/grants/'+a.id,{},'DELETE');await load();toast('App access revoked')}))));
const tokens=$('tokens');tokens.replaceChildren();if(!data.tokens.length)empty(tokens,5,'No personal tokens yet.');
for(const t of data.tokens)tokens.append(h('tr',{},h('td',{class:'name',text:t.name}),h('td',{class:'hide-sm',text:day(t.created)}),h('td',{text:t.expires?day(t.expires):'Never'}),h('td',{class:'hide-sm',text:stamp(t.last_used)}),h('td',{class:'right'},revokeButton(async()=>{if(!await confirmBox('Revoke '+t.name+'?','Clients using this token stop working right away.','Revoke',true))return;await api('/api/tokens/'+t.id,{},'DELETE');await load();toast('Token revoked')}))))}
$('newToken').onclick=()=>{$('tokenForm').reset();$('tokenDays').value='90';$('tokenFields').hidden=false;$('tokenShown').hidden=true;$('tokenCreate').hidden=false;$('tokenCopy').hidden=true;$('tokenCancel').textContent='Cancel';$('tokenError').textContent='';$('tokenDlg').showModal()};
$('tokenCancel').onclick=()=>$('tokenDlg').close();$('tokenCopy').onclick=()=>copy($('tokenValue').textContent);
$('tokenForm').onsubmit=async event=>{event.preventDefault();const b=$('tokenCreate');b.disabled=true;$('tokenError').textContent='';try{const days=$('tokenDays').value;const created=await api('/api/tokens',{name:$('tokenName').value,expires_days:days?Number(days):null});$('tokenValue').textContent=created.token;$('tokenFields').hidden=true;$('tokenShown').hidden=false;$('tokenCreate').hidden=true;$('tokenCopy').hidden=false;$('tokenCancel').textContent='Done';await load()}catch(e){$('tokenError').textContent=e.message}finally{b.disabled=false}};
$('test').onclick=busy($('test'),async()=>{$('testStatus').textContent='Testing…';async function rpc(method,params,id){const response=await fetch('/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});if(response.status===401){location.replace('/login');throw Error('Sign in again.')}if(!response.ok)throw Error('Connection failed (HTTP '+response.status+')');const data=await response.json();if(data.error)throw Error(data.error.message||'MCP request failed');return data.result}
try{await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'evertrust-connection-check',version:'1.0'}},1);const result=await rpc('tools/list',{},2);$('testStatus').textContent='Connected · '+((result.tools||[]).length)+' tools available';toast('MCP connection works')}catch(e){$('testStatus').textContent='Test failed: '+e.message;throw e}});
load().catch(e=>toast(e.message,true));
`);
}

export const accountPage = shell('Account', '/account', `
<div class="head"><h1>Account</h1></div>
<div id="resetNotice" class="bar" hidden>Your password was reset by an administrator. Choose a new password now.</div>
<div style="display:flex;gap:12px;align-items:center;margin-bottom:26px"><div id="avatar" style="width:42px;height:42px;border-radius:50%;background:var(--surface2);display:grid;place-items:center;font-weight:600"></div><div><div class="name" id="profileName">…</div><div class="sub" id="profileMeta"></div></div></div>
<h2>Change password</h2><p class="note" style="margin:0 0 14px">Other browsers are signed out. Your MCP tokens and authorized apps keep working.</p>
<form id="passwordForm" style="max-width:360px"><label class="field" for="current"><span>Current password</span><input id="current" type="password" autocomplete="current-password" required></label><label class="field" for="next"><span>New password</span><input id="next" type="password" autocomplete="new-password" minlength="10" required placeholder="At least 10 characters"></label><label class="field" for="confirm"><span>Confirm new password</span><input id="confirm" type="password" autocomplete="new-password" minlength="10" required></label><p class="err" id="error" role="alert"></p><button class="btn primary" type="submit" id="save">Change password</button></form>
`, `
onUser(u=>{$('avatar').textContent=u.username.slice(0,1).toUpperCase();$('profileName').textContent=u.username;$('profileMeta').textContent=(u.role==='admin'?'Administrator':'User')+' · joined '+day(u.created);$('resetNotice').hidden=!u.must_change_password});
$('passwordForm').onsubmit=async event=>{event.preventDefault();$('error').textContent='';if($('next').value!==$('confirm').value){$('error').textContent='New passwords don\\'t match.';return}const b=$('save');b.disabled=true;try{await api('/api/auth/password',{current_password:$('current').value,new_password:$('next').value});$('passwordForm').reset();$('resetNotice').hidden=true;toast('Password changed')}catch(e){$('error').textContent=e.message}finally{b.disabled=false}};
`);

export const adminPage = shell('Users', '/admin', `
<div class="head"><h1>Users<span class="count" id="total"></span></h1></div>
<div class="bar" id="pendingBar" hidden><span id="pendingText"></span><button class="btn sm" type="button" id="showPending">Show pending</button></div>
<div class="toolbar"><input id="search" type="search" placeholder="Search users" aria-label="Search users"><div class="actions" id="filters" role="group" aria-label="Filter users"></div></div>
<table class="grid" aria-label="Users"><thead><tr><th>User</th><th class="hide-sm">Role</th><th>Status</th><th class="hide-sm right">Companies</th><th class="hide-sm right">Tokens</th><th class="hide-sm">Last sign-in</th><th class="right"></th></tr></thead><tbody id="rows"><tr><td colspan="7" class="empty">Loading users…</td></tr></tbody></table>
<p class="note">Company data stays private to each user. Admins see counts only.</p>
<dialog id="secretDlg" aria-labelledby="secretTitle"><form method="dialog"><h2 id="secretTitle">Temporary password</h2><p id="secretText"></p><div class="secret" id="secretValue"></div><div class="foot"><button class="btn" type="button" id="secretCopy">Copy</button><button class="btn primary" value="ok">Done</button></div></form></dialog>
<dialog id="accessDlg" aria-labelledby="accessTitle"><form method="dialog"><h2 id="accessTitle">Access</h2><div id="accessBody"></div><div class="foot"><button class="btn primary" value="ok">Close</button></div></form></dialog>
`, `
let users=[],filter='all';
const statusBadge={active:['ok','Active'],pending:['warn','Pending'],suspended:['danger','Suspended']};
const confirmations={suspend:u=>['Suspend '+u.username+'?','They are signed out, and their tokens and apps stop working until you activate them again.','Suspend',true],remove_admin:u=>['Remove admin rights from '+u.username+'?','They keep their account and companies.','Remove admin',true],make_admin:u=>['Make '+u.username+' an admin?','Admins can approve, suspend and reset other users.','Make admin',false],reset_password:u=>['Reset password for '+u.username+'?','They are signed out, and authorized apps must be approved again. You get a temporary password to give them.','Reset password',true],reject:u=>['Reject '+u.username+'?','The registration is deleted.','Reject',true]};
const done={approve:'Approved ',reject:'Rejected ',suspend:'Suspended ',activate:'Activated ',make_admin:'Admin rights given to ',remove_admin:'Admin rights removed from ',reset_password:'Password reset for '};
async function act(u,action){const c=confirmations[action];if(c){const t=c(u);if(!await confirmBox(t[0],t[1],t[2],t[3]))return}const result=await api('/api/admin/users/'+encodeURIComponent(u.id),{action});
if(result.temporary_password){$('secretText').textContent='Give this to '+u.username+' privately. It is shown only once, and they will be asked to change it.';$('secretValue').textContent=result.temporary_password;$('secretDlg').showModal()}
toast(done[action]+u.username);await load()}
$('secretCopy').onclick=()=>copy($('secretValue').textContent);
async function showAccess(u){const data=await api('/api/admin/users/'+encodeURIComponent(u.id)+'/access');const body=$('accessBody');body.replaceChildren();$('accessTitle').textContent='Access · '+u.username;const base='/api/admin/users/'+encodeURIComponent(u.id);
const line=(title,meta,path,what)=>{const b=h('button',{class:'btn sm',type:'button',text:'Revoke'});b.onclick=busy(b,async()=>{await api(path,{},'DELETE');toast(what+' revoked');await showAccess(u);await load()});return h('div',{style:'display:flex;justify-content:space-between;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)'},h('div',{},h('div',{class:'name',text:title}),h('div',{class:'sub',text:meta})),b)};
const section=(title,items,render)=>{body.append(h('h2',{style:'font-size:13px;margin:14px 0 4px',text:title}));if(!items.length)body.append(h('p',{text:'None.'}));for(const it of items)body.append(render(it))};
section('Authorized apps',data.apps,a=>line(a.client_name,'Authorized '+stamp(a.authorized),base+'/grants/'+a.id,'App'));
section('Personal tokens',data.tokens,t=>line(t.name,'Expires '+(t.expires?day(t.expires):'never')+' · last used '+stamp(t.last_used),base+'/tokens/'+t.id,'Token'));
if(!$('accessDlg').open)$('accessDlg').showModal()}
function render(){const me=window.currentUser&&window.currentUser.id;const q=$('search').value.trim().toLowerCase();const count=f=>users.filter(f).length;
const pending=users.filter(u=>u.status==='pending');$('pendingBar').hidden=!pending.length;$('pendingText').textContent=pending.length+' account'+(pending.length===1?'':'s')+' waiting for approval: '+pending.map(u=>u.username).join(', ');
chips($('filters'),[{value:'all',label:'All',count:users.length},{value:'active',label:'Active',count:count(u=>u.status==='active')},{value:'pending',label:'Pending',count:pending.length},{value:'suspended',label:'Suspended',count:count(u=>u.status==='suspended')},{value:'admin',label:'Admins',count:count(u=>u.role==='admin')}],filter,v=>{filter=v;render()});
$('total').textContent=users.length;const rows=$('rows');rows.replaceChildren();
const shown=users.filter(u=>(filter==='all'||(filter==='admin'?u.role==='admin':u.status===filter))&&(!q||u.username.toLowerCase().includes(q)));
if(!shown.length){rows.append(h('tr',{},h('td',{colspan:7,class:'empty',text:'No users match.'})));return}
for(const u of shown){const s=statusBadge[u.status]||['',u.status];const self=u.id===me;let actions;
if(u.status==='pending'){const approve=h('button',{class:'btn sm primary',type:'button',text:'Approve'});approve.onclick=busy(approve,()=>act(u,'approve'));actions=[approve,menu([{label:'Reject',danger:true,run:()=>act(u,'reject')}])]}
else actions=[menu([{label:'View access',run:()=>showAccess(u)},u.status==='active'&&!self&&{label:'Suspend',danger:true,run:()=>act(u,'suspend')},u.status==='suspended'&&{label:'Activate',run:()=>act(u,'activate')},u.status==='active'&&u.role!=='admin'&&{label:'Make admin',run:()=>act(u,'make_admin')},u.role==='admin'&&!self&&{label:'Remove admin',danger:true,run:()=>act(u,'remove_admin')},!self&&{label:'Reset password',danger:true,run:()=>act(u,'reset_password')}])];
rows.append(h('tr',{},h('td',{},h('div',{class:'name',text:u.username+(self?' (you)':'')}),h('div',{class:'sub',text:'Joined '+day(u.created)})),h('td',{class:'hide-sm',text:u.role==='admin'?'Admin':'User'}),h('td',{},h('span',{class:'badge '+s[0],text:s[1]})),h('td',{class:'hide-sm right num',text:u.companies}),h('td',{class:'hide-sm right num',text:u.tokens}),h('td',{class:'hide-sm',text:day(u.last_login)}),h('td',{class:'right'},h('div',{class:'actions',style:'justify-content:flex-end;flex-wrap:nowrap'},actions))))}}
async function load(){users=(await api('/api/admin/users')).users;render();const n=users.filter(u=>u.status==='pending').length;$('pendingCount').textContent=n||'';$('pendingCount').hidden=!n}
$('search').oninput=render;$('showPending').onclick=()=>{filter='pending';render()};
onUser(()=>load().catch(e=>$('rows').replaceChildren(h('tr',{},h('td',{colspan:7,class:'empty',text:e.message})))));
`);
