// Travels by nisoya99 - App-Logik (Schritt 1: Login, Besuche, Places, Profil)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (q) => document.querySelector(q);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');

// ---------- Kontinente nach Laendercode ----------
const CONT = {};
const addCont = (name, codes) => codes.split(' ').forEach((c) => (CONT[c] = name));
addCont('Europa', 'AL AD AT BY BE BA BG HR CY CZ DK EE FO FI FR DE GI GR HU IS IE IM IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH TR UA GB VA GG JE AX SJ');
addCont('Asien', 'AF AM AZ BH BD BT BN KH CN GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TM AE UZ VN YE');
addCont('Afrika', 'DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW');
addCont('Nordamerika', 'AI AG AW BS BB BZ BM VG CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC MF PM VC SX TT TC US VI');
addCont('Südamerika', 'AR BO BR CL CO EC FK GF GY PY PE SR UY VE');
addCont('Ozeanien', 'AS AU CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV VU WF');
addCont('Antarktis', 'AQ');
const ALL_CONTS = ['Europa', 'Asien', 'Afrika', 'Nordamerika', 'Südamerika', 'Ozeanien', 'Antarktis'];
const VIS = { private: 'Nur ich', friends: 'Freunde', public: 'Öffentlich' };

// ---------- Zustand ----------
const S = { user: null, profile: null, visits: [], screen: 'boot', tab: 'explore', mode: 'login',
  draft: null, sugs: [], detail: null, country: null, stat: null };
const newDraft = () => ({ place: null, from: '', to: '', who: 'Solo', stars: 0, tags: [], note: '', vis: 'private' });

// ---------- Berechnungen aus den Besuchen ----------
const countries = () => [...new Set(S.visits.map((v) => v.country_code))];
const cityKeys = () => [...new Set(S.visits.map((v) => v.city + '|' + v.country_code))];
const conts = () => [...new Set(S.visits.map((v) => v.continent).filter((c) => ALL_CONTS.includes(c)))];
const countryName = (code) => (S.visits.find((v) => v.country_code === code) || {}).country || code;
const fd = (d) => (d ? new Date(d + 'T00:00').toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const range = (v) => v.visited_from ? fd(v.visited_from) + (v.visited_to && v.visited_to !== v.visited_from ? ' – ' + fd(v.visited_to) : '') : 'Datum offen';
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
}

// ---------- Anmeldung ----------
const errText = (e) => {
  const m = e.message || '';
  if (/Invalid login/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/not confirmed/i.test(m)) return 'Bitte bestätige zuerst deine E-Mail.';
  if (/already registered/i.test(m)) return 'Diese E-Mail ist schon registriert.';
  if (/Database error/i.test(m)) return 'Der Benutzername ist wahrscheinlich schon vergeben.';
  if (/least \d+ char/i.test(m)) return 'Das Passwort ist zu kurz (mindestens 8 Zeichen).';
  return m;
};
async function doLogin() {
  const email = $('#em').value.trim(), password = $('#pw').value;
  if (!email || !password) return setMsg('Bitte E-Mail und Passwort eingeben.');
  $('#go').disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  $('#go').disabled = false;
  if (error) return setMsg(errText(error));
  S.user = data.user; await loadAll(); go('main', 'explore');
}
async function doRegister() {
  const username = $('#un').value.trim().toLowerCase(), name = $('#dn').value.trim();
  const email = $('#em').value.trim(), password = $('#pw').value;
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return setMsg('Benutzername: 3 bis 20 Zeichen, nur a-z, 0-9 und _.');
  if (!email) return setMsg('Bitte E-Mail eingeben.');
  if (password.length < 8) return setMsg('Das Passwort braucht mindestens 8 Zeichen.');
  $('#go').disabled = true;
  const { data, error } = await sb.auth.signUp({ email, password, options: {
    data: { username, display_name: name || username },
    emailRedirectTo: location.origin + location.pathname } });
  $('#go').disabled = false;
  if (error) return setMsg(errText(error));
  if (data.session) { S.user = data.user; await loadAll(); go('main', 'explore'); }
  else setMsg('Fast geschafft! Wir haben dir eine Bestätigungs-E-Mail geschickt. Klicke auf den Link und melde dich danach an.', true);
}
async function forgot() {
  const email = $('#em').value.trim();
  if (!email) return setMsg('Gib oben deine E-Mail ein, dann schicken wir dir einen Link.');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  setMsg(error ? errText(error) : 'Wenn die E-Mail existiert, ist ein Link unterwegs.', !error);
}
async function setNewPw() {
  const pw = $('#pw').value;
  if (pw.length < 8) return setMsg('Mindestens 8 Zeichen.');
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) return setMsg(errText(error));
  toast('Passwort geändert'); S.user = (await sb.auth.getUser()).data.user; await loadAll(); go('main', 'explore');
}
async function logout() { await sb.auth.signOut(); S.user = null; S.profile = null; S.visits = []; S.mode = 'login'; go('login'); }
async function deleteAccount() {
  if (!confirm('Konto und alle Einträge endgültig löschen?')) return;
  if (!confirm('Das kann nicht rückgängig gemacht werden. Wirklich löschen?')) return;
  const { error } = await sb.rpc('delete_my_account');
  if (error) return toast('Fehler: ' + error.message);
  await sb.auth.signOut(); S.user = null; S.visits = []; go('login'); toast('Konto gelöscht');
}

// ---------- Bildschirme ----------
function authScreen() {
  const reg = S.mode === 'register';
  return `<main><div class="hero"><img src="assets/logo.png" alt="nisoya99"><h1>Travels</h1>
    <p class="s">by nisoya99<br>Jede Reise als Stempel in deinem Pass.</p></div>
    <div class="seg"><button class="${reg ? '' : 'on'}" onclick="S.mode='login';render()">Anmelden</button>
    <button class="${reg ? 'on' : ''}" onclick="S.mode='register';render()">Konto erstellen</button></div>
    ${reg ? `<label>Benutzername</label><input id="un" autocapitalize="none" autocomplete="username" placeholder="z. B. elena_wanders">
    <label>Anzeigename</label><input id="dn" autocomplete="name" placeholder="z. B. Elena Rostova">` : ''}
    <label>E-Mail</label><input id="em" type="email" autocomplete="email" placeholder="du@beispiel.ch">
    <label>Passwort</label><input id="pw" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="mindestens 8 Zeichen">
    <p class="msg" id="msg"></p>
    <button class="btn" id="go" onclick="${reg ? 'doRegister()' : 'doLogin()'}">${reg ? 'Konto erstellen' : 'Anmelden'}</button>
    ${reg ? '<p class="s" style="margin-top:12px">Deine Einträge sind standardmässig privat.</p>'
          : '<button class="btn g" onclick="forgot()">Passwort vergessen</button>'}</main>`;
}
function recoverScreen() {
  return `<main><div class="hero"><h1>Neues Passwort</h1></div><label>Neues Passwort</label>
    <input id="pw" type="password" autocomplete="new-password" placeholder="mindestens 8 Zeichen"><p class="msg" id="msg"></p>
    <button class="btn" onclick="setNewPw()">Speichern</button></main>`;
}
const head = () => `<header><div class="logo">Travels<small>by nisoya99</small></div><div class="av" onclick="go('main','profile')">${esc(initial())}</div></header>`;
const navbar = () => {
  const t = (id, ic, l) => `<button class="${S.tab === id && S.screen === 'main' ? 'on' : ''}" onclick="go('main','${id}')"><i>${ic}</i>${l}</button>`;
  return `<nav>${t('explore', '◎', 'Explore')}${t('places', '▤', 'Places')}<button class="add" onclick="go('add')"><i>+</i>Add</button>${t('profile', '☺', 'Profile')}</nav>`;
};
const statsHTML = () => `<div class="stats">
  <div class="stat" onclick="openStat('countries')"><b>${countries().length}</b><span>Länder</span></div>
  <div class="stat" onclick="openStat('cities')"><b>${cityKeys().length}</b><span>Städte</span></div>
  <div class="stat" onclick="openStat('conts')"><b>${conts().length}/7</b><span>Kontinente</span></div></div>`;
const visitRow = (v) => `<div class="card" onclick="S.detail='${v.id}';go('detail')"><div class="row"><b>${esc(v.city)}</b><span class="stars">${starsTxt(v.rating)}</span></div>
  <p class="s">${esc(v.country)} · ${esc(range(v))}</p><div style="margin-top:8px">${pills(v)}</div></div>`;
const emptyHTML = '<div class="empty">Noch keine Besuche.<br>Tippe unten auf + und trage deine erste Stadt ein.</div>';

function explore() {
  return `<main><h1>Explore</h1><p class="s" style="margin-bottom:14px">Deine Reisebilanz.</p>${statsHTML()}
    <h2>Letzte Besuche</h2>${S.visits.length ? S.visits.slice(0, 5).map(visitRow).join('') : emptyHTML}
    <div class="card"><b>Karte</b><p class="s" style="margin-top:6px">Die Weltkarte mit Zoom (Zahlen, dann Städtenamen) kommt im nächsten Schritt.</p></div></main>`;
}
function places() {
  const by = {}; S.visits.forEach((v) => (by[v.country_code] ??= []).push(v));
  return `<main><h1>Places</h1><p class="s" style="margin-bottom:14px">Alle Länder und Städte, in denen du warst.</p>
    ${Object.keys(by).length ? Object.entries(by).map(([code, vs]) => `<div class="card">
      <div class="row" style="margin-bottom:8px;font-family:var(--hd);font-stretch:125%;font-size:17px" onclick="S.country='${code}';go('country')">
        <span>${esc(vs[0].country)} <span class="s">· ${vs.length} ${vs.length > 1 ? 'Besuche' : 'Besuch'}</span></span><span>›</span></div>
      ${vs.map((v) => `<div class="row" style="padding:8px 0;border-top:1px solid var(--line)" onclick="S.detail='${v.id}';go('detail')">
        <span>${esc(v.city)}</span><span class="s">${esc(range(v))}</span></div>`).join('')}</div>`).join('') : emptyHTML}</main>`;
}
function countryScreen() {
  const vs = S.visits.filter((v) => v.country_code === S.country);
  if (!vs.length) return `<main><button class="tag" onclick="go('main','places')">← Places</button><p class="s">Keine Besuche.</p></main>`;
  return `<main><button class="tag" onclick="go('main','places')">← Places</button><h1>${esc(vs[0].country)}</h1>
    <p class="s">${esc(vs[0].continent)} · ${vs.length} ${vs.length > 1 ? 'Besuche' : 'Besuch'}</p><h2>Städte und Eindrücke</h2>
    ${vs.map((v) => visitRow(v) .replace('</div></div>', `</div>${v.note ? `<p class="s" style="font-style:italic;margin-top:10px">«${esc(v.note)}»</p>` : ''}</div>`)).join('')}</main>`;
}
function detailScreen() {
  const v = S.visits.find((x) => x.id === S.detail);
  if (!v) return `<main><button class="tag" onclick="go('main','places')">← Zurück</button></main>`;
  return `<main><button class="tag" onclick="go('main','places')">← Zurück</button><h1>${esc(v.city)}</h1>
    <p class="s">${esc(v.country)} · ${esc(range(v))}</p>
    <div class="card" style="margin-top:14px"><div class="stars">${starsTxt(v.rating)}</div>
      <div style="margin-top:8px">${pills(v)}</div>
      <p class="s" style="margin-top:10px">Mit: ${esc(v.companions || '–')} · Sichtbar für: ${esc(VIS[v.visibility])}</p>
      <h2 style="margin-top:14px">Rückblick</h2>
      <p class="s" style="font-style:italic;font-size:15px;color:var(--tx)">${v.note ? '«' + esc(v.note) + '»' : 'Kein Rückblick.'}</p></div>
    <button class="btn danger" onclick="delVisit('${v.id}')">Besuch löschen</button></main>`;
}
async function delVisit(id) {
  if (!confirm('Diesen Besuch löschen?')) return;
  const { error } = await sb.from('visits').delete().eq('id', id);
  if (error) return toast('Fehler: ' + error.message);
  S.visits = S.visits.filter((v) => v.id !== id); go('main', 'places'); toast('Gelöscht');
}
function openStat(k) { S.stat = k; go('stat'); }
function statScreen() {
  const k = S.stat; let t, sub, list;
  if (k === 'countries') {
    t = 'Länder'; sub = countries().length + ' besucht';
    list = countries().map((c) => { const n = S.visits.filter((v) => v.country_code === c).length;
      return `<div class="card row" onclick="S.country='${c}';go('country')"><span>${esc(countryName(c))}</span><span class="s">${n} ${n > 1 ? 'Besuche' : 'Besuch'} ›</span></div>`; }).join('');
  } else if (k === 'cities') {
    t = 'Städte'; sub = cityKeys().length + ' besucht';
    list = [...new Map(S.visits.map((v) => [v.city + v.country_code, v])).values()].map((v) =>
      `<div class="card row" onclick="S.detail='${v.id}';go('detail')"><span>${esc(v.city)}</span><span class="s">${esc(v.country)} ›</span></div>`).join('');
  } else {
    t = 'Kontinente'; sub = conts().length + ' von 7 besucht';
    list = ALL_CONTS.map((c) => { const cs = [...new Set(S.visits.filter((v) => v.continent === c).map((v) => v.country))];
      return `<div class="card" style="${cs.length ? '' : 'opacity:.45'}"><div class="row" style="cursor:default"><b>${c}</b>
        <span class="s">${cs.length ? cs.length + (cs.length > 1 ? ' Länder' : ' Land') : 'noch offen'}</span></div>
        ${cs.length ? `<p class="s" style="margin-top:6px">${cs.map(esc).join(' · ')}</p>` : ''}</div>`; }).join('');
  }
  return `<main><button class="tag" onclick="go('main',S.tab)">← Zurück</button><h1>${t}</h1><p class="s" style="margin-bottom:14px">${sub}</p>${list || emptyHTML}</main>`;
}

// ---------- Besuch erfassen ----------
async function searchCity(q) {
  const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=de&format=json&name=' + encodeURIComponent(q));
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
        : '<p class="s pad">Nichts gefunden.</p>';
    } catch (e) { sg.innerHTML = '<p class="s pad">Die Suche ist gerade nicht erreichbar.</p>'; }
  }, 300);
}
function pickCity(i) {
  const x = S.sugs[i];
  S.draft.place = { name: x.name, country: x.country || x.country_code, country_code: x.country_code, lat: x.latitude, lon: x.longitude, label: x.name + ', ' + (x.country || '') };
  $('#cq').value = S.draft.place.label; $('#sg').innerHTML = '';
}
const whoHTML = () => ['Solo', 'Partner', 'Freunde', 'Familie'].map((w) => `<button class="tag ${S.draft.who === w ? 'on' : ''}" onclick="S.draft.who='${w}';$('#who').innerHTML=whoHTML()">${w}</button>`).join('');
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
  return `<div class="bar"><button onclick="S.draft=null;go('main','explore')" aria-label="Schliessen">✕</button><b>Neuer Besuch</b><span></span></div><main>
    <label>Stadt</label><input id="cq" autocomplete="off" placeholder="Stadt eintippen, z. B. Lis…" value="${esc(d.place ? d.place.label : '')}" oninput="onCity(this.value)"><div id="sg"></div>
    <div class="two"><div><label>Von</label><input type="date" value="${d.from}" onchange="S.draft.from=this.value"></div>
    <div><label>Bis</label><input type="date" value="${d.to}" onchange="S.draft.to=this.value"></div></div>
    <label>Mit wem?</label><div id="who" style="margin-top:6px">${whoHTML()}</div>
    <label style="margin-top:10px">Wie war es?</label><div class="stars-in" id="stars">${starsIn()}</div>
    <label>Highlights (bis 5)</label><div id="hp" style="margin-top:6px">${tagsHTML()}</div>
    <input maxlength="26" placeholder="Eigenes Highlight tippen, dann Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();addTag(this.value);this.value=''}" oninput="if(this.value.endsWith(',')){addTag(this.value);this.value=''}">
    <div style="margin:-6px 0 12px">${['Essen', 'Natur', 'Architektur', 'Nachtleben', 'Günstig'].map((t) => `<button class="tag" onclick="addTag('${t}')">+ ${t}</button>`).join('')}</div>
    <label>Rückblick (privat)</label><textarea rows="4" placeholder="Was bleibt dir in Erinnerung?" oninput="S.draft.note=this.value">${esc(d.note)}</textarea>
    <label>Sichtbar für</label><div id="vis" style="margin-top:6px">${visHTML()}</div>
    <button class="btn" id="save" onclick="saveVisit()">Besuch speichern</button></main>`;
}
async function saveVisit() {
  const d = S.draft;
  if (!d.place) return toast('Bitte eine Stadt aus der Liste wählen');
  if (d.from && d.to && d.to < d.from) return toast('„Bis“ liegt vor „Von“');
  $('#save').disabled = true;
  const p = d.place;
  const { data, error } = await sb.from('visits').insert({
    city: p.name, country: p.country, country_code: p.country_code, continent: CONT[p.country_code] || 'Unbekannt',
    lat: p.lat, lon: p.lon, visited_from: d.from || null, visited_to: d.to || d.from || null,
    rating: d.stars || null, companions: d.who, highlights: d.tags, note: d.note || null, visibility: d.vis,
  }).select().single();
  if (error) { $('#save').disabled = false; return toast('Fehler: ' + error.message); }
  S.visits.unshift(data); S.draft = null; go('main', 'explore'); toast('Gespeichert');
}

// ---------- Profil ----------
async function saveProfile() {
  const username = $('#pu').value.trim().toLowerCase(), display_name = $('#pn').value.trim();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return toast('Benutzername: 3 bis 20 Zeichen, a-z, 0-9, _');
  const { error } = await sb.from('profiles').update({ username, display_name }).eq('id', S.user.id);
  if (error) return toast(/duplicate|unique/i.test(error.message) ? 'Benutzername ist vergeben' : 'Fehler: ' + error.message);
  await loadAll(); render(); toast('Profil gespeichert');
}
function profile() {
  const p = S.profile || {};
  return `<main><div style="display:flex;gap:14px;align-items:center;margin-bottom:16px"><div class="av big">${esc(initial())}</div>
    <div><h1 style="font-size:22px;margin:0">${esc(p.display_name || p.username || '')}</h1><p class="s">@${esc(p.username || '')}</p></div></div>
    <h2 style="margin-top:6px">Bilanz</h2>${statsHTML()}
    <h2>Profil bearbeiten</h2><div class="card"><label>Anzeigename</label><input id="pn" value="${esc(p.display_name || '')}">
    <label>Benutzername</label><input id="pu" autocapitalize="none" value="${esc(p.username || '')}">
    <label>E-Mail</label><input value="${esc(S.user ? S.user.email : '')}" disabled>
    <button class="btn" onclick="saveProfile()">Profil speichern</button></div>
    <div class="card"><div class="row" style="cursor:default"><span>Neue Einträge sind standardmässig</span><span class="s">privat</span></div></div>
    <button class="btn g" onclick="logout()">Abmelden</button>
    <button class="btn danger" onclick="deleteAccount()">Konto löschen</button></main>`;
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
