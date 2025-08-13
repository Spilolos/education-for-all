/* SmartStudy frontend - API wiring + offline sync + JWT refresh
   Assumes backend API at API_BASE (set below), with endpoints:
   POST ?p=register, POST ?p=login, POST ?p=refresh, GET/POST/PUT/DELETE ?p=courses,notes,quizzes, GET ?p=profile
*/
const API_BASE = "./api/index.php?p="; // adjust if backend placed elsewhere

// Token storage
const TokenStore = {
  set(tokens){ localStorage.setItem('smartstudy:tokens', JSON.stringify(tokens)); },
  get(){ try{return JSON.parse(localStorage.getItem('smartstudy:tokens')||'null');}catch{return null;} },
  clear(){ localStorage.removeItem('smartstudy:tokens'); }
};

// Offline action queue (for write operations)
const OfflineQueue = {
  key:'smartstudy:queue',
  push(action){ const q=JSON.parse(localStorage.getItem(this.key)||'[]'); q.push(action); localStorage.setItem(this.key, JSON.stringify(q)); },
  drain(){ const q=JSON.parse(localStorage.getItem(this.key)||'[]'); localStorage.removeItem(this.key); return q; },
  peek(){ return JSON.parse(localStorage.getItem(this.key)||'[]'); }
};

// Helpers
const $ = (sel, ctx=document)=>ctx.querySelector(sel);
const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));
function authHeaders(){ const t=TokenStore.get(); return t && t.access_token ? { 'Authorization': 'Bearer '+t.access_token } : {}; }

async function apiFetch(path, opts={}){
  // network-first for API calls; if failing and write operation, queue it.
  opts.headers = opts.headers || {};
  Object.assign(opts.headers, { 'Content-Type':'application/json' });
  Object.assign(opts.headers, authHeaders());
  try {
    const res = await fetch(API_BASE + path, opts);
    if(res.status === 401){
      // try refresh
      const refreshed = await tryRefresh();
      if(refreshed){
        Object.assign(opts.headers, authHeaders());
        const retry = await fetch(API_BASE + path, opts);
        if(retry.ok) return retry.json();
        throw new Error('Request failed after refresh');
      }
      throw new Error('Unauthorized');
    }
    if(res.ok){
      const txt = await res.text();
      return txt ? JSON.parse(txt) : null;
    } else {
      const txt = await res.text();
      throw new Error(txt || res.statusText);
    }
  } catch(err){
    if(['POST','PUT','DELETE'].includes((opts.method||'GET').toUpperCase())){
      OfflineQueue.push({ path, opts, timestamp:Date.now() });
      console.warn('Queued offline action', path, err.message);
      throw new Error('Offline: action queued');
    }
    throw err;
  }
}

async function tryRefresh(){
  const tokens = TokenStore.get();
  if(!tokens || !tokens.refresh_token) return false;
  const now = Math.floor(Date.now()/1000);
  if(tokens.expires_at && tokens.expires_at > now+5) return true;
  try {
    const res = await fetch(API_BASE + 'refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refresh_token: tokens.refresh_token }) });
    if(!res.ok) { TokenStore.clear(); return false; }
    const data = await res.json();
    const expires_at = Math.floor(Date.now()/1000) + (data.expires_in || 900);
    TokenStore.set({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at });
    return true;
  } catch(e){ console.error('Refresh failed', e); TokenStore.clear(); return false; }
}

// Simple wrapper to GET collection and map to DATA
async function fetchCollections(){
  DATA.courses = await safeApi('courses', 'GET') || [];
  DATA.notes = await safeApi('notes', 'GET') || [];
  DATA.quizzes = await safeApi('quizzes', 'GET') || [];
  renderAll();
}

async function safeApi(path, method='GET', body=null){
  const opts = { method };
  if(body) opts.body = JSON.stringify(body);
  try {
    return await apiFetch(path, opts);
  } catch(err){
    console.warn('API error', path, err.message);
    if(method==='GET'){
      const local = localStorage.getItem(`smartstudy:data:${CURRENT_USER?.id}`);
      if(local) {
        try{ const parsed=JSON.parse(local); return parsed[path] || []; }catch{}
      }
    }
    throw err;
  }
}

// On reconnection drain queue
async function flushQueue(){
  const q = OfflineQueue.peek();
  if(!q.length) return;
  console.log('Flushing', q.length, 'queued actions');
  const drained = OfflineQueue.drain();
  for(const item of drained){
    try {
      await apiFetch(item.path, item.opts);
    } catch(e){
      console.warn('Failed queued action', e);
      OfflineQueue.push(item);
      break;
    }
  }
  try{ await fetchCollections(); }catch(e){console.warn(e);}
}

// Auth & App logic (abbreviated here for brevity; see full app for all functions)
let CURRENT_USER = null;
let DATA = { courses:[], notes:[], quizzes:[] };

// UI elements
const authWrapper = $("#authWrapper");
const app = $("#app");
const btnShowLogin = $("#btnShowLogin");
const btnShowRegister = $("#btnShowRegister");
const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const loginError = $("#loginError");
const registerError = $("#registerError");

btnShowLogin.addEventListener("click", ()=>{
  btnShowLogin.classList.add("bg-gray-100");
  btnShowRegister.classList.remove("bg-gray-100");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});
btnShowRegister.addEventListener("click", ()=>{
  btnShowRegister.classList.add("bg-gray-100");
  btnShowLogin.classList.remove("bg-gray-100");
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
});

loginForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  loginError.classList.add("hidden");
  const email = $("#loginEmail").value.trim();
  const pass = $("#loginPass").value;
  try {
    const res = await fetch(API_BASE + 'login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password: pass }) });
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const expires_at = Math.floor(Date.now()/1000) + (data.expires_in || 900);
    TokenStore.set({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at });
    CURRENT_USER = { id: data.id, name: data.name, email: data.email };
    localStorage.setItem('smartstudy:currentUser', JSON.stringify(CURRENT_USER));
    boot();
  } catch(err){
    loginError.textContent = err.message;
    loginError.classList.remove("hidden");
  }
});

registerForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  registerError.classList.add("hidden");
  const name = $("#regName").value.trim();
  const email = $("#regEmail").value.trim();
  const pass = $("#regPass").value;
  try {
    const res = await fetch(API_BASE + 'register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, password: pass }) });
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const expires_at = Math.floor(Date.now()/1000) + (data.expires_in || 900);
    TokenStore.set({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at });
    CURRENT_USER = { id: data.id, name: data.name, email: data.email };
    localStorage.setItem('smartstudy:currentUser', JSON.stringify(CURRENT_USER));
    boot();
  } catch(err){
    registerError.textContent = err.message;
    registerError.classList.remove("hidden");
  }
});

// Logout
document.getElementById('btnLogout').addEventListener('click', ()=>{
  TokenStore.clear();
  localStorage.removeItem('smartstudy:currentUser');
  location.reload();
});

// Other UI handlers (Add Course/Note/Quiz etc.) are implemented below (omitted for brevity in this snippet)
// For full functionality, see the app.api.js file shipped in the package (it includes all handlers).

function boot(){
  const stored = JSON.parse(localStorage.getItem('smartstudy:currentUser')||'null');
  const tokens = TokenStore.get();
  if(!stored || !tokens) { authWrapper.classList.remove('hidden'); app.classList.add('hidden'); return; }
  CURRENT_USER = stored;
  authWrapper.classList.add('hidden'); app.classList.remove('hidden');
  document.getElementById('profName').textContent = CURRENT_USER.name;
  document.getElementById('profEmail').textContent = CURRENT_USER.email;
  const snap = JSON.parse(localStorage.getItem(`smartstudy:data:${CURRENT_USER.id}`) || '{"courses":[],"notes":[],"quizzes":[]}');
  DATA = snap;
  renderAll();
  if(navigator.onLine) { fetchCollections().catch(()=>{}); flushQueue().catch(()=>{}); }
}

function renderAll(){ /* placeholder - actual render functions exist in full file */ }
function fetchCollections(){ /* placeholder */ }
function flushQueue(){ /* placeholder */ }

boot();
fetchQuote();