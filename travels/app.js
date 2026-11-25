const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (q) => document.querySelector(q);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');

// ---------- Kontinente nach Ländercode ----------
const CONT = {};
const addCont = (name, codes) => codes.split(' ').forEach((c) => (CONT[c] = name));
addCont('Europe', 'AL AD AT BY BE BA BG HR CY CZ DK EE FO FI FR DE GI GR HU IS IE IM IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH TR UA GB VA GG JE AX SJ');
addCont('Asia', 'AF AM AZ BH BD BT BN KH CN GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TM AE UZ VN YE');
addCont('Africa', 'DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW');
addCont('North America', 'AI AG AW BS BB BZ BM VG CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC MF PM VC SX TT TC US VI');
addCont('South America', 'AR BO BR CL CO EC FK GF GY PY PE SR UY VE');
addCont('Oceania', 'AS AU CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV VU WF');
addCont('Antarctica', 'AQ');
const ALL_CONTS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica'];
const VIS = { private: 'Only me', friends: 'Friends', public: 'Public' };

// ---------- Zustand ----------
const S = { user: null, profile: null, visits: [], screen: 'boot', tab: 'explore', mode: 'login',
  draft: null, sugs: [], detail: null, country: null, stat: null };
const newDraft = () => ({ place: null, from: '', to: '', who: 'Solo', stars: 0, tags: [], note: '', vis: 'private' });

// ---------- Berechnungen aus den Besuchen ----------
const countries = () => [...new Set(S.visits.map((v) => v.country_code))];
const cityKeys = () => [...new Set(S.visits.map((v) => v.city + '|' + v.country_code))];
const conts = () => [...new Set(S.visits.map((v) => v.continent).filter((c) => ALL_CONTS.includes(c)))];
const countryName = (code) => (S.visits.find((v) => v.country_code === code) || {}).country || code;
const fd = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const range = (v) => v.visited_from ? fd(v.visited_from) + (v.visited_to && v.visited_to !== v.visited_from ? ' – ' + fd(v.visited_to) : '') : 'No date';
const starsTxt = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
const initial = () => ((S.profile && (S.profile.display_name || S.profile.username)) || '?')[0].toUpperCase();
const pills = (v) => (v.highlights || []).map((t) => `<span class="tag on" style="cursor:default">${esc(t)}</span>`).join('');

function toast(m) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = m; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function setMsg(t, ok) { const m = $('#msg'); if (m) { m.textContent = t; m.className = 'msg' + (ok ? ' ok' : ''); } }
function go(screen, tab) {
  S.screen = screen; if (tab) S.tab = tab;
  if (screen === 'add' && !S.draft) S.draft = newDraft();
  render();
}

// ---------- Daten laden ----------
async function loadAll() {
  const [p, v] = await Promise.all([
    sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle(),
    sb.from('visits').select('*').eq('user_id', S.user.id)
      .order('visited_from', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
  ]);
  S.profile = p.data; S.visits = v.data || [];
  S.visits.forEach((x) => { x.continent = LEGACY[x.continent] || x.continent; });
}

// ---------- Anmeldung ----------
const errText = (e) => {
  const m = e.message || '';
  if (/Invalid login/i.test(m)) return 'Email or password is incorrect.';
  if (/not confirmed/i.test(m)) return 'Please confirm your email first.';
  if (/already registered/i.test(m)) return 'This email is already registered.';
  if (/Database error/i.test(m)) return 'That username is probably already taken.';
  if (/least \d+ char/i.test(m)) return 'Password is too short (at least 8 characters).';
  return m;
};
async function doLogin() {
  const email = $('#em').value.trim(), password = $('#pw').value;
  if (!email || !password) return setMsg('Please enter your email and password.');
  $('#go').disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  $('#go').disabled = false;
  if (error) return setMsg(errText(error));
  S.user = data.user; await loadAll(); go('main', 'explore');
}
async function doRegister() {
  const username = $('#un').value.trim().toLowerCase(), name = $('#dn').value.trim();
  const email = $('#em').value.trim(), password = $('#pw').value;
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return setMsg('Username: 3 to 20 characters, only a-z, 0-9 and _.');
  if (!email) return setMsg('Please enter your email.');
  if (password.length < 8) return setMsg('Password needs at least 8 characters.');
  $('#go').disabled = true;
  const { data, error } = await sb.auth.signUp({ email, password, options: {
    data: { username, display_name: name || username },
    emailRedirectTo: location.origin + location.pathname } });
  $('#go').disabled = false;
  if (error) return setMsg(errText(error));
  if (data.session) { S.user = data.user; await loadAll(); go('main', 'explore'); }
  else setMsg('Almost done! We sent you a confirmation email. Click the link, then log in.', true);
}
async function forgot() {
  const email = $('#em').value.trim();
  if (!email) return setMsg('Enter your email above and we will send you a link.');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  setMsg(error ? errText(error) : 'If that email exists, a link is on its way.', !error);
}
async function setNewPw() {
  const pw = $('#pw').value;
  if (pw.length < 8) return setMsg('At least 8 characters.');
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) return setMsg(errText(error));
  toast('Password changed'); S.user = (await sb.auth.getUser()).data.user; await loadAll(); go('main', 'explore');
}
async function logout() { await sb.auth.signOut(); S.user = null; S.profile = null; S.visits = []; S.mode = 'login'; go('login'); }
async function deleteAccount() {
  if (!confirm('Permanently delete your account and all entries?')) return;
  if (!confirm('This cannot be undone. Really delete?')) return;
  const { error } = await sb.rpc('delete_my_account');
  if (error) return toast('Error: ' + error.message);
  await sb.auth.signOut(); S.user = null; S.visits = []; go('login'); toast('Account deleted');
}

// ---------- Bildschirme ----------
function authScreen() {
  const reg = S.mode === 'register';
  return `<main><div class="hero"><img src="assets/profilepic.png" alt="nisoya99"><h1>Travels</h1>
    <p class="s">by nisoya99<br></p></div>
    <div class="seg"><button class="${reg ? '' : 'on'}" onclick="S.mode='login';render()">Log in</button>
    <button class="${reg ? 'on' : ''}" onclick="S.mode='register';render()">Sign up</button></div>
    ${reg ? `<label>Username</label><input id="un" autocapitalize="none" autocomplete="username" placeholder="e.g. elena_wanders">
    <label>Display name</label><input id="dn" autocomplete="name" placeholder="e.g. Elena Rostova">` : ''}
    <label>Email</label><input id="em" type="email" autocomplete="email" placeholder="you@example.com">
    <label>Password</label><input id="pw" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="at least 8 characters">
    <p class="msg" id="msg"></p>
    <button class="btn" id="go" onclick="${reg ? 'doRegister()' : 'doLogin()'}">${reg ? 'Create account' : 'Log in'}</button>
    ${reg ? '<p class="s" style="margin-top:12px">Your entries are private by default.</p>'
          : '<button class="btn g" onclick="forgot()">Forgot password</button>'}</main>`;
}
function recoverScreen() {
  return `<main><div class="hero"><h1>New password</h1></div><label>New password</label>
    <input id="pw" type="password" autocomplete="new-password" placeholder="at least 8 characters"><p class="msg" id="msg"></p>
    <button class="btn" onclick="setNewPw()">Save</button></main>`;
}
const head = () => `<header><div class="logo">Travels<small>by nisoya99</small></div><div class="av" onclick="go('main','profile')">${esc(initial())}</div></header>`;
const navbar = () => {
  const t = (id, ic, l) => `<button class="${S.tab === id && S.screen === 'main' ? 'on' : ''}" onclick="go('main','${id}')"><i>${ic}</i>${l}</button>`;
  return `<nav>${t('explore', '◎', 'Explore')}${t('places', '▤', 'Places')}<button class="add" onclick="go('add')"><i>+</i>Add</button>${t('profile', '☺', 'Profile')}</nav>`;
};
const statsHTML = () => `<div class="stats">
  <div class="stat" onclick="openStat('countries')"><b>${countries().length}</b><span>Countries</span></div>
  <div class="stat" onclick="openStat('cities')"><b>${cityKeys().length}</b><span>Cities</span></div>
  <div class="stat" onclick="openStat('conts')"><b>${conts().length}/7</b><span>Continents</span></div></div>`;
const visitRow = (v) => `<div class="card" onclick="S.detail='${v.id}';go('detail')"><div class="row"><b>${esc(v.city)}</b><span class="stars">${starsTxt(v.rating)}</span></div>
  <p class="s">${esc(v.country)} · ${esc(range(v))}</p><div style="margin-top:8px">${pills(v)}</div></div>`;
const emptyHTML = '<div class="empty">No visits yet.<br>Tap + below and add your first city.</div>';

function explore() {
  return `<main><h1>Explore</h1><p class="s" style="margin-bottom:14px">Your travel summary.</p>${statsHTML()}
    <h2>Recent visits</h2>${S.visits.length ? S.visits.slice(0, 5).map(visitRow).join('') : emptyHTML}
    <div class="card"><b>Map</b><p class="s" style="margin-top:6px">The world map with zoom (numbers first, then city names) comes in the next step.</p></div></main>`;
}
function places() {
  const by = {}; S.visits.forEach((v) => (by[v.country_code] ??= []).push(v));
  return `<main><h1>Places</h1><p class="s" style="margin-bottom:14px">All the countries and cities you have been to.</p>
    ${Object.keys(by).length ? Object.entries(by).map(([code, vs]) => `<div class="card">
      <div class="row" style="margin-bottom:8px;font-family:var(--hd);font-stretch:125%;font-size:17px" onclick="S.country='${code}';go('country')">
        <span>${esc(vs[0].country)} <span class="s">· ${vs.length} ${vs.length > 1 ? 'visits' : 'visit'}</span></span><span>›</span></div>
      ${vs.map((v) => `<div class="row" style="padding:8px 0;border-top:1px solid var(--line)" onclick="S.detail='${v.id}';go('detail')">
        <span>${esc(v.city)}</span><span class="s">${esc(range(v))}</span></div>`).join('')}</div>`).join('') : emptyHTML}</main>`;
}
function countryScreen() {
  const vs = S.visits.filter((v) => v.country_code === S.country);
  if (!vs.length) return `<main><button class="tag" onclick="go('main','places')">← Places</button><p class="s">No visits.</p></main>`;
  return `<main><button class="tag" onclick="go('main','places')">← Places</button><h1>${esc(vs[0].country)}</h1>
    <p class="s">${esc(vs[0].continent)} · ${vs.length} ${vs.length > 1 ? 'visits' : 'visit'}</p><h2>Cities and impressions</h2>
    ${vs.map((v) => visitRow(v) .replace('</div></div>', `</div>${v.note ? `<p class="s" style="font-style:italic;margin-top:10px">«${esc(v.note)}»</p>` : ''}</div>`)).join('')}</main>`;
}
function detailScreen() {
  const v = S.visits.find((x) => x.id === S.detail);
  if (!v) return `<main><button class="tag" onclick="go('main','places')">← Back</button></main>`;
  return `<main><button class="tag" onclick="go('main','places')">← Back</button><h1>${esc(v.city)}</h1>
    <p class="s">${esc(v.country)} · ${esc(range(v))}</p>
    <div class="card" style="margin-top:14px"><div class="stars">${starsTxt(v.rating)}</div>
      <div style="margin-top:8px">${pills(v)}</div>
      <p class="s" style="margin-top:10px">With: ${esc(v.companions || '–')} · Visible to: ${esc(VIS[v.visibility])}</p>
      <h2 style="margin-top:14px">Reflection</h2>
      <p class="s" style="font-style:italic;font-size:15px;color:var(--tx)">${v.note ? '«' + esc(v.note) + '»' : 'No reflection.'}</p></div>
    <button class="btn danger" onclick="delVisit('${v.id}')">Delete visit</button></main>`;
}
async function delVisit(id) {
  if (!confirm('Delete this visit?')) return;
  const { error } = await sb.from('visits').delete().eq('id', id);
  if (error) return toast('Error: ' + error.message);
  S.visits = S.visits.filter((v) => v.id !== id); go('main', 'places'); toast('Deleted');
}
function openStat(k) { S.stat = k; go('stat'); }
function statScreen() {
  const k = S.stat; let t, sub, list;
  if (k === 'countries') {
    t = 'Countries'; sub = countries().length + ' visited';
    list = countries().map((c) => { const n = S.visits.filter((v) => v.country_code === c).length;
      return `<div class="card row" onclick="S.country='${c}';go('country')"><span>${esc(countryName(c))}</span><span class="s">${n} ${n > 1 ? 'visits' : 'visit'} ›</span></div>`; }).join('');
  } else if (k === 'cities') {
    t = 'Cities'; sub = cityKeys().length + ' visited';
    list = [...new Map(S.visits.map((v) => [v.city + v.country_code, v])).values()].map((v) =>
      `<div class="card row" onclick="S.detail='${v.id}';go('detail')"><span>${esc(v.city)}</span><span class="s">${esc(v.country)} ›</span></div>`).join('');
  } else {
    t = 'Continents'; sub = conts().length + ' of 7 visited';
    list = ALL_CONTS.map((c) => { const cs = [...new Set(S.visits.filter((v) => v.continent === c).map((v) => v.country))];
      return `<div class="card" style="${cs.length ? '' : 'opacity:.45'}"><div class="row" style="cursor:default"><b>${c}</b>
        <span class="s">${cs.length ? cs.length + (cs.length > 1 ? ' countries' : ' country') : 'not yet'}</span></div>
        ${cs.length ? `<p class="s" style="margin-top:6px">${cs.map(esc).join(' · ')}</p>` : ''}</div>`; }).join('');
  }
  return `<main><button class="tag" onclick="go('main',S.tab)">← Back</button><h1>${t}</h1><p class="s" style="margin-bottom:14px">${sub}</p>${list || emptyHTML}</main>`;
}

// ---------- Besuch erfassen ----------
async function searchCity(q) {
  const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(q));
  const j = await r.json();
  return (j.results || []).filter((x) => x.country_code);
}
let tmr;
function onCity(q) {
  S.draft.place = null; clearTimeout(tmr);
  const sg = $('#sg');
  if (q.trim().length < 2) { sg.innerHTML = ''; return; }
  tmr = setTimeout(async () => {
    try {
      S.sugs = await searchCity(q.trim());
      sg.innerHTML = S.sugs.length
        ? S.sugs.map((x, i) => `<div class="opt" onclick="pickCity(${i})">${esc(x.name)} <span class="s">· ${esc(x.admin1 ? x.admin1 + ', ' : '')}${esc(x.country)}</span></div>`).join('')
        : '<p class="s pad">Nothing found.</p>';
    } catch (e) { sg.innerHTML = '<p class="s pad">Search is not available right now.</p>'; }
  }, 300);
}
function pickCity(i) {
  const x = S.sugs[i];
  S.draft.place = { name: x.name, country: x.country || x.country_code, country_code: x.country_code, lat: x.latitude, lon: x.longitude, label: x.name + ', ' + (x.country || '') };
  $('#cq').value = S.draft.place.label; $('#sg').innerHTML = '';
}
const whoHTML = () => ['Solo', 'Partner', 'Friends', 'Family'].map((w) => `<button class="tag ${S.draft.who === w ? 'on' : ''}" onclick="S.draft.who='${w}';$('#who').innerHTML=whoHTML()">${w}</button>`).join('');
const starsIn = () => [1, 2, 3, 4, 5].map((i) => `<span onclick="S.draft.stars=${i};$('#stars').innerHTML=starsIn()">${i <= S.draft.stars ? '★' : '☆'}</span>`).join('');
const visHTML = () => Object.entries(VIS).map(([k, l]) => `<button class="tag ${S.draft.vis === k ? 'on' : ''}" onclick="S.draft.vis='${k}';$('#vis').innerHTML=visHTML()">${l}</button>`).join('');
const tagsHTML = () => S.draft.tags.map((t, i) => `<button class="tag on" onclick="rmTag(${i})">${esc(t)} ✕</button>`).join('');
function addTag(t) {
  t = t.replace(/,/g, '').trim(); const a = S.draft.tags;
  if (!t || a.length >= 5 || a.some((x) => x.toLowerCase() === t.toLowerCase())) return;
  a.push(t.slice(0, 25)); $('#hp').innerHTML = tagsHTML();
}
function rmTag(i) { S.draft.tags.splice(i, 1); $('#hp').innerHTML = tagsHTML(); }
function addScreen() {
  const d = S.draft;
  return `<div class="bar"><button onclick="S.draft=null;go('main','explore')" aria-label="Close">✕</button><b>New visit</b><span></span></div><main>
    <label>City</label><input id="cq" autocomplete="off" placeholder="Type a city, e.g. Lis…" value="${esc(d.place ? d.place.label : '')}" oninput="onCity(this.value)"><div id="sg"></div>
    <div class="two"><div><label>From</label><input type="date" value="${d.from}" onchange="S.draft.from=this.value"></div>
    <div><label>To</label><input type="date" value="${d.to}" onchange="S.draft.to=this.value"></div></div>
    <label>With whom?</label><div id="who" style="margin-top:6px">${whoHTML()}</div>
    <label style="margin-top:10px">How was it?</label><div class="stars-in" id="stars">${starsIn()}</div>
    <label>Highlights (up to 5)</label><div id="hp" style="margin-top:6px">${tagsHTML()}</div>
    <input maxlength="26" placeholder="Type your own highlight, then Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();addTag(this.value);this.value=''}" oninput="if(this.value.endsWith(',')){addTag(this.value);this.value=''}">
    <div style="margin:-6px 0 12px">${['Food', 'Nature', 'Architecture', 'Nightlife', 'Affordable'].map((t) => `<button class="tag" onclick="addTag('${t}')">+ ${t}</button>`).join('')}</div>
    <label>Reflection (private)</label><textarea rows="4" placeholder="What will you remember?" oninput="S.draft.note=this.value">${esc(d.note)}</textarea>
    <label>Visible to</label><div id="vis" style="margin-top:6px">${visHTML()}</div>
    <button class="btn" id="save" onclick="saveVisit()">Save visit</button></main>`;
}
async function saveVisit() {
  const d = S.draft;
  if (!d.place) return toast('Please pick a city from the list');
  if (d.from && d.to && d.to < d.from) return toast('The end date is before the start date');
  $('#save').disabled = true;
  const p = d.place;
  const { data, error } = await sb.from('visits').insert({
    city: p.name, country: p.country, country_code: p.country_code, continent: CONT[p.country_code] || 'Unbekannt',
    lat: p.lat, lon: p.lon, visited_from: d.from || null, visited_to: d.to || d.from || null,
    rating: d.stars || null, companions: d.who, highlights: d.tags, note: d.note || null, visibility: d.vis,
  }).select().single();
  if (error) { $('#save').disabled = false; return toast('Error: ' + error.message); }
  S.visits.unshift(data); S.draft = null; go('main', 'explore'); toast('Saved');
}

// ---------- Profil ----------
async function saveProfile() {
  const username = $('#pu').value.trim().toLowerCase(), display_name = $('#pn').value.trim();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return toast('Username: 3 to 20 characters, a-z, 0-9, _');
  const { error } = await sb.from('profiles').update({ username, display_name }).eq('id', S.user.id);
  if (error) return toast(/duplicate|unique/i.test(error.message) ? 'Username is taken' : 'Error: ' + error.message);
  await loadAll(); render(); toast('Profile saved');
}
function profile() {
  const p = S.profile || {};
  return `<main><div style="display:flex;gap:14px;align-items:center;margin-bottom:16px"><div class="av big">${esc(initial())}</div>
    <div><h1 style="font-size:22px;margin:0">${esc(p.display_name || p.username || '')}</h1><p class="s">@${esc(p.username || '')}</p></div></div>
    <h2 style="margin-top:6px">Summary</h2>${statsHTML()}
    <h2>Edit profile</h2><div class="card"><label>Display name</label><input id="pn" value="${esc(p.display_name || '')}">
    <label>Username</label><input id="pu" autocapitalize="none" value="${esc(p.username || '')}">
    <label>Email</label><input value="${esc(S.user ? S.user.email : '')}" disabled>
    <button class="btn" onclick="saveProfile()">Save profile</button></div>
    <div class="card"><div class="row" style="cursor:default"><span>New entries are</span><span class="s">private by default</span></div></div>
    <button class="btn g" onclick="logout()">Log out</button>
    <button class="btn danger" onclick="deleteAccount()">Delete account</button></main>`;
}

// ---------- Anzeige ----------
function render() {
  const s = S.screen; let h = '';
  if (s === 'login') h = authScreen();
  else if (s === 'recover') h = recoverScreen();
  else if (s === 'add') h = addScreen();
  else {
    const body = s === 'detail' ? detailScreen() : s === 'country' ? countryScreen() : s === 'stat' ? statScreen()
      : S.tab === 'explore' ? explore() : S.tab === 'places' ? places() : profile();
    h = head() + body + navbar();
  }
  $('#app').innerHTML = h;
}
function hideSplash() {
  const sp = $('#splash'); if (!sp) return;
  sp.classList.add('out'); setTimeout(() => sp.remove(), 500);
}
sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') { S.screen = 'recover'; render(); hideSplash(); }
  if (event === 'SIGNED_OUT' && S.screen !== 'login') { S.user = null; S.screen = 'login'; render(); }
});
async function boot() {
  const t0 = Date.now();
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) { S.user = session.user; await loadAll(); }
  } catch (e) { console.error(e); }
  setTimeout(() => {
    if (S.screen === 'boot') S.screen = S.user ? 'main' : 'login';
    render(); hideSplash();
  }, Math.max(0, 1700 - (Date.now() - t0)));
}
boot();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
