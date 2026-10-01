(function () {
'use strict';
const D = window.DATA;
const KEY = 'wgym.v1';
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = [['breakfast', 'BREAKFAST'], ['main1', 'LUNCH'], ['snack', 'SNACK'], ['main2', 'DINNER']];
const PLAN = { breakfast: ['bA', 'bB', 'bC', 'bA', 'bB', 'bC', 'bA'], main1: ['A', 'B', 'C', 'D', 'E', 'A', 'B'], main2: ['D', 'E', 'A', 'B', 'C', 'D', 'E'], snack: { 1: 'sB', 3: 'sA', 5: 'sB' } };
const RAMP = [['1st', '50%', '5–6', 0], ['2nd', '70%', '3', 0], ['3rd', '90%', '1–2', 0], ['Working', '100%', '8–12', 1]];
const MID = [['1st', '50–60%', '4–5', 0], ['Working', '100%', '8–12', 1]];
const FIX = [['Set 1', '', '8–12', 1], ['Set 2', '', '8–12', 1]];
const ORANGE_LV = ['Practical setup', 'No direct evidence', 'Anatomy', 'EMG only', 'Limited evidence'];

/* ---------- helpers ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const r0 = Math.round, r1 = v => Math.round(v * 10) / 10;
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => v.toFixed(2).replace('.', ',') + ' €';
const todayIdx = () => (new Date().getDay() + 6) % 7;
const isoDate = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function fq(u, a) {
  if (u !== 'pcs') return r0(a) + ' ' + u;
  const w = Math.floor(a + 1e-6), f = a - w;
  const fr = Math.abs(f - 1 / 3) < .02 ? '⅓' : Math.abs(f - 2 / 3) < .02 ? '⅔' : Math.abs(f - .5) < .02 ? '½' : (f > .02 ? r1(f).toString().slice(1) : '');
  return (w || '') + fr + ((fr || w > 1) ? ' pcs' : ' pc');
}

/* ---------- state ---------- */
const mk = id => ({ preset: id, name: D.PRE[id].name, edited: false, items: clone(D.PRE[id].items) });
function freshPlan() { return WD.map((_, d) => ({ breakfast: mk(PLAN.breakfast[d]), main1: mk(PLAN.main1[d]), main2: mk(PLAN.main2[d]), snack: PLAN.snack[d] ? mk(PLAN.snack[d]) : null })); }
function fresh() {
  return { v: 1, week: 1, tday: 0, mday: todayIdx(), train: {}, plan: freshPlan(), foods: [], price: {}, per: 7, saved: [], body: { 1: { w: '74.9', s: '' } }, tgt: { kcal: 2030, p: 132, c: 240, f: 60 } };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const o = JSON.parse(raw); return Object.assign(fresh(), o); }
  } catch (e) { /* ignore */ }
  return fresh();
}
let S = load();
let saveFailed = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); saveFailed = false; }
  catch (e) { if (!saveFailed) toast('Could not save: storage is blocked or full'); saveFailed = true; }
}
const U = { tab: 'train', view: 'list', ex: null, blk: 'p', dt: 'log', mmode: 'day', sheet: null, form: null, edit: null };

/* ---------- training ---------- */
const rowsFor = (n, blk) => n === 'Leg Extension' ? FIX : (blk === 'p' ? RAMP : MID);
const tKey = (w, d, n) => w + '|' + d + '|' + n;
function peek(n) { return S.train[tKey(S.week, S.tday, n)]; }
function getLog(n, blk) {
  const k = tKey(S.week, S.tday, n), rows = rowsFor(n, blk);
  if (!S.train[k]) S.train[k] = { sets: rows.map(() => ({ kg: '', reps: '', rir: '' })), rem: '', done: false };
  return S.train[k];
}
function prevLog(n) {
  for (let w = S.week - 1; w >= 1; w--) { const L = S.train[tKey(w, S.tday, n)]; if (L && L.sets.some(s => s.kg)) return L; }
  return null;
}
const exInfo = n => D.EXS[n] || { db: null, muscle: '', tips: [], exact: false };
const imgSrc = (n, j) => 'img/' + exInfo(n).db + '_' + j + '.jpg';
function dayDot(d) { return Object.keys(S.train).some(k => k.indexOf(S.week + '|' + d + '|') === 0 && S.train[k].done); }

function row(n, blk) {
  const e = exInfo(n), L = peek(n), nr = rowsFor(n, blk).length;
  const th = e.db ? `<img class="th" loading="lazy" src="${imgSrc(n, 0)}" alt="">` : '<div class="th q">?</div>';
  let chip;
  if (L && L.done) { const last = L.sets.filter(s => s.kg).slice(-1)[0]; chip = `<span class="chip ok">✓ ${last ? esc(last.kg) + ' kg' : 'done'}</span>`; }
  else chip = `<span class="chip">${n === 'Leg Extension' ? '2 × 8–12' : nr + ' sets'}</span>`;
  return `<button class="ex" data-a="openEx" data-n="${esc(n)}" data-blk="${blk}">${th}<b>${esc(n)}</b>${chip}</button>`;
}
function vTrain() {
  const d = D.DAYS[S.tday];
  return `<div class="wk"><button data-a="wk" data-v="-1" aria-label="Previous week">‹</button><b>Week ${S.week} of 12</b><button data-a="wk" data-v="1" aria-label="Next week">›</button></div>
  <div class="chips">${D.DAYS.map((x, i) => `<button data-a="tday" data-v="${i}" class="${i === S.tday ? 'on' : ''}">D${i + 1}${dayDot(i) ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>
  <h1>${esc(d.t.split(' · ')[1])}</h1><p class="sub">${esc(d.t.split(' · ')[0])} · warm-up 5–10 min low-intensity cardio</p>
  <small class="sec">POSTERIOR</small>${d.p.map(n => row(n, 'p')).join('')}<small class="sec">ANTERIOR</small>${d.a.map(n => row(n, 'a')).join('')}`;
}
function tipHtml(t, n) {
  return `<div class="tip"><b>${n}</b><span>${esc(t.t)}<br><em class="lv ${ORANGE_LV.indexOf(t.lv) >= 0 ? 'o' : ''}">${esc(t.lv)}</em>${(t.src || []).map(k => D.SRC[k] ? ` <a href="${D.SRC[k][1]}" target="_blank" rel="noopener">${esc(D.SRC[k][0])} ↗</a>` : '').join('')}</span></div>`;
}
function vDetail() {
  const n = U.ex, e = exInfo(n), rs = rowsFor(n, U.blk), L = getLog(n, U.blk), P = prevLog(n);
  let h = `<button class="back" data-a="back">‹ Day ${S.tday + 1}</button><h1 style="font-size:25px">${esc(n)}</h1><p class="sub">${esc(e.muscle)} · Week ${S.week}</p>`;
  if (!e.db) h += '<div class="card" style="margin-bottom:10px">No photo or technique tips for this exercise yet. Logging works as usual.</div>';
  if (e.db && U.dt === 'tech') {
    h += `<div class="seg"><button data-a="dt" data-v="log">Log</button><button data-a="dt" data-v="tech" class="on">Technique</button></div>
    <div class="two"><div><img src="${imgSrc(n, 0)}" alt="start"><span>START</span></div><div><img src="${imgSrc(n, 1)}" alt="end"><span>END</span></div></div>`;
    h += e.tips.map((t, i) => tipHtml(t, i + 1)).join('') + '<small class="sec">BASICS FOR EVERY EXERCISE</small>' + D.BASICS.map(t => tipHtml(t, '•')).join('');
    h += `<div class="note">${e.exact ? 'Photos show this exact exercise.' : 'Photos show the closest matching exercise in the library (same movement pattern, different machine or equipment).'} Photos: free-exercise-db (public domain). General technique tips, not medical advice: stop if something hurts.</div>`;
    return h;
  }
  if (e.db) h += `<div class="loop"><img src="${imgSrc(n, 0)}" alt="start"><img class="b" src="${imgSrc(n, 1)}" alt="end"><span>START ⇄ END</span></div><div class="seg"><button data-a="dt" data-v="log" class="on">Log</button><button data-a="dt" data-v="tech">Technique</button></div>`;
  h += '<div class="hd"><small>SET · TARGET</small><small>KG</small><small>REPS</small><small>RIR</small></div>';
  h += rs.map((r, i) => {
    const v = L.sets[i], p = P && P.sets[i];
    const tgt = (r[1] ? r[1] + ' · ' : '') + r[2] + ' reps';
    const last = p && p.kg ? `<br><small style="letter-spacing:0;color:var(--a)">last: ${esc(p.kg)}${p.reps ? ' × ' + esc(p.reps) : ''}${p.rir !== '' && p.rir != null ? ' · RIR ' + esc(p.rir) : ''}</small>` : '';
    const rir = r[3] ? `<input class="fld ${v.rir !== '' ? 'set' : ''}" data-a="rir" data-i="${i}" readonly placeholder="RIR" value="${esc(v.rir)}">` : '<input class="fld off" disabled value="warm-up">';
    return `<div class="sr"><div class="l"><b>${r[0]}</b><small>${tgt}</small>${last}</div><input class="fld" data-in="set" data-i="${i}" data-f="kg" inputmode="decimal" autocomplete="off" placeholder="${p && p.kg ? esc(p.kg) : 'kg'}" value="${esc(v.kg)}"><input class="fld" data-in="set" data-i="${i}" data-f="reps" inputmode="numeric" autocomplete="off" placeholder="${p && p.reps ? esc(p.reps) : 'reps'}" value="${esc(v.reps)}">${rir}</div>`;
  }).join('');
  h += `<textarea class="rem" data-in="rem" placeholder="Remarks (seat setting, pain, tempo…)">${esc(L.rem)}</textarea>`;
  return h;
}

/* ---------- meals ---------- */
const meal = (d, s) => S.plan[d][s];
function tot(m) {
  if (!m) return { kcal: 0, p: 0, c: 0, f: 0, inc: false };
  const kcal = m.items.reduce((a, i) => a + i.kcal, 0);
  if (!m.edited) { const P = D.PRE[m.preset]; return { kcal, p: P.p, c: P.c, f: P.f, inc: false }; }
  const kn = m.items.filter(i => i.p != null);
  return { kcal, p: kn.reduce((a, i) => a + i.p, 0), c: kn.reduce((a, i) => a + i.c, 0), f: kn.reduce((a, i) => a + i.f, 0), inc: m.items.some(i => i.p == null) };
}
function dayTot(d) { const t = { kcal: 0, p: 0, c: 0, f: 0, inc: false }; SLOTS.forEach(([s]) => { const x = tot(meal(d, s)); t.kcal += x.kcal; t.p += x.p; t.c += x.c; t.f += x.f; t.inc = t.inc || x.inc; }); return t; }
const bar = (l, v, t, u) => `<div class="bar"><span style="text-align:left;color:var(--t)">${l}</span><i><b class="${v > t * 1.05 ? 'o' : ''}" style="width:${Math.min(100, t ? v / t * 100 : 0)}%"></b></i><span>${r0(v)} / ${t}${u}</span></div>`;
function slotCard(s, label) {
  const m = meal(S.mday, s);
  if (!m) return `<div class="slot"><small>${label}</small><b style="color:var(--m)">No snack planned</b><div class="acts"><button class="pr" data-a="pick" data-s="${s}">+ Add a snack</button></div></div>`;
  const t = tot(m), pl = t.inc ? '+' : '';
  return `<div class="slot"><div class="h"><div><small>${label}${m.edited ? '<span class="tag">EDITED</span>' : ''}</small><b>${esc(m.name)}</b></div><span class="k">${r0(t.kcal)} kcal</span></div>
  <div class="mini">P ${r0(t.p)}${pl} · C ${r0(t.c)}${pl} · F ${r0(t.f)}${pl} g${t.inc ? ' · macros incomplete' : ''}</div>
  <div class="acts"><button data-a="editMeal" data-s="${s}">Edit items</button><button data-a="pick" data-s="${s}">Change meal</button>${s === 'snack' ? '<button data-a="rmSnack">Remove</button>' : ''}</div></div>`;
}
function vMeals() {
  const dt = dayTot(S.mday), T = S.tgt;
  const chips = `<div class="chips">${WD.map((x, i) => `<button data-a="mday" data-v="${i}" class="${i === S.mday ? 'on' : ''}">${x}</button>`).join('')}</div>`;
  const seg = `<div class="seg"><button data-a="mmode" data-v="day" class="${U.mmode === 'day' ? 'on' : ''}">Day</button><button data-a="mmode" data-v="week" class="${U.mmode === 'week' ? 'on' : ''}">Week</button></div>`;
  if (U.mmode === 'week') {
    return `<h1>Meal plan</h1><p class="sub">Your shopping list is built from this plan.</p>${seg}<table class="grid7"><tr><th></th>${WD.map(x => `<th>${x}</th>`).join('')}</tr>
    ${SLOTS.map(([s, l]) => `<tr><td class="l">${l.slice(0, 5)}</td>${WD.map((_, d) => { const m = meal(d, s); return m ? `<td class="${m.edited ? 'e' : ''}" data-a="gotoDay" data-v="${d}">${esc(m.preset.replace(/^[bs]/, ''))}${m.edited ? '*' : ''}</td>` : '<td style="opacity:.4">–</td>'; }).join('')}</tr>`).join('')}
    <tr><td class="l">KCAL</td>${WD.map((_, d) => { const k = dayTot(d).kcal; return `<td class="k ${Math.abs(k - T.kcal) > T.kcal * .05 ? 'o' : ''}">${r0(k)}</td>`; }).join('')}</tr></table>
    <p class="note">Letters = the preset meal of that name in the programme (breakfast A–C, lunch/dinner A–E, snack A–B). * = you edited it. Orange kcal = more than 5 % away from ${T.kcal}. Tap a day to open it.</p>`;
  }
  return `${chips}<h1>Meals</h1><p class="sub">${WD[S.mday]} · target ${T.kcal} kcal</p>${seg}
  <div class="kpi k3"><div><small>PLANNED</small><b>${r0(dt.kcal)}</b></div><div><small>REMAINING</small><b style="${T.kcal - dt.kcal < 0 ? 'color:var(--w)' : ''}">${r0(T.kcal - dt.kcal)}</b></div><div><small>TARGET</small><b>${T.kcal}</b></div></div>
  <div class="bars">${bar('P', dt.p, T.p, ' g')}${bar('C', dt.c, T.c, ' g')}${bar('F', dt.f, T.f, ' g')}</div>
  ${dt.inc ? '<p class="warn">Some items have no macros yet, so P/C/F are lower than reality. Open “Edit items” and add them.</p>' : ''}
  ${SLOTS.map(([s, l]) => slotCard(s, l)).join('')}`;
}
function vEdit() {
  const m = meal(S.mday, U.edit), t = tot(m), pl = t.inc ? '+' : '';
  return `<button class="back" data-a="back">‹ ${WD[S.mday]}</button><h1 style="font-size:23px">${esc(m.name)}</h1><p class="sub">${m.edited ? 'Edited from the preset' : 'Preset from the programme'} · remove or add anything</p>
  ${m.items.map((i, ix) => `<div class="itm"><div><b>${esc(i.name)}</b> <span class="mini">${fq(i.unit, i.amt)}</span></div><button class="x" data-a="delItem" data-v="${ix}" aria-label="Remove">✕</button><div class="m">${r0(i.kcal)} kcal · ${i.p == null ? `<u data-a="fixItem" data-v="${ix}">+ add P / C / F</u>` : 'P ' + r1(i.p) + ' · C ' + r1(i.c) + ' · F ' + r1(i.f)}</div></div>`).join('')}
  <div class="sum"><div><small>KCAL</small><b>${r0(t.kcal)}</b></div><div><small>P</small><b>${r0(t.p)}${pl}</b></div><div><small>C</small><b>${r0(t.c)}${pl}</b></div><div><small>F</small><b>${r0(t.f)}${pl}</b></div></div>
  ${m.edited && t.inc ? '<p class="warn">Items marked “add P / C / F” have no macros yet, so the P/C/F totals are incomplete.</p>' : ''}
  ${!m.edited ? '<p class="note">Untouched presets use the programme’s own P/C/F. After your first change the totals are the sum of your items, so please add macros to the items marked above.</p>' : ''}`;
}
function formCalc() {
  const f = U.form, mult = f.per100 ? num(f.amt) / 100 : 1;
  const p = num(f.p) * mult, c = num(f.c) * mult, fa = num(f.f) * mult;
  const auto = Math.round(4 * p + 4 * c + 9 * fa);
  const kcal = f.kcal !== '' ? num(f.kcal) * mult : auto;
  return { p, c, f: fa, kcal, auto };
}
function mineFoods() {
  const seen = {}, out = [];
  S.foods.forEach(x => { if (!seen[x.name.toLowerCase()]) { seen[x.name.toLowerCase()] = 1; out.push(x); } });
  Object.keys(D.PRE).forEach(k => D.PRE[k].items.forEach(i => { if (!seen[i.key]) { seen[i.key] = 1; out.push(i); } }));
  return out.slice(0, 14);
}
function sheetHtml() {
  if (U.sheet && U.sheet.type === 'rir') {
    return `<div class="dim" data-a="closeSheet"></div><div class="sheet"><h3>RIR – how many reps were left?</h3><p>Count after your last rep of the set.</p><div class="opts">${[['0', 'failure'], ['1', '1 left'], ['2', '2 left'], ['3', '3 left'], ['4', 'easy']].map(x => `<button data-a="setRir" data-v="${x[0]}">${x[0]}<small>${x[1]}</small></button>`).join('')}</div></div>`;
  }
  if (U.sheet && U.sheet.type === 'pick') {
    const s = U.sheet.slot, want = s === 'breakfast' ? 'breakfast' : s === 'snack' ? 'snack' : 'main';
    return `<div class="dim" data-a="closeSheet"></div><div class="sheet"><h3>Choose ${SLOTS.find(x => x[0] === s)[1].toLowerCase()}</h3><p>Preset meals from your programme. You can edit them afterwards.</p>${Object.values(D.PRE).filter(x => x.slot === want).map(x => `<button class="pk" data-a="setMeal" data-v="${x.id}"><b>${esc(x.name)}</b><span>${x.kcal} kcal · P ${x.p} · C ${x.c} · F ${x.f}</span></button>`).join('')}</div>`;
  }
  if (U.form) {
    const f = U.form, c = formCalc();
    return `<div class="dim" data-a="closeSheet"></div><div class="sheet"><h3>${f.ix != null ? 'Edit item' : 'Add item'}</h3><p>You enter the macros. Kcal is calculated if you leave it empty (4·P + 4·C + 9·F).</p>
    <div class="chs">${mineFoods().map((x, i) => `<button data-a="useFood" data-v="${i}">${esc(x.name.length > 18 ? x.name.slice(0, 17) + '…' : x.name)}</button>`).join('')}</div>
    <div class="fm"><div class="w3"><label>NAME</label><input class="fi" data-in="form" data-f="name" placeholder="e.g. Hummus" autocomplete="off" value="${esc(f.name)}"></div>
    <div class="w2"><label>AMOUNT</label><input class="fi" data-in="form" data-f="amt" inputmode="decimal" placeholder="30" value="${esc(f.amt)}"></div><div><label>UNIT</label><div class="ut">${['g', 'pcs', 'ml'].map(u => `<button data-a="unit" data-v="${u}" class="${f.unit === u ? 'on' : ''}">${u}</button>`).join('')}</div></div>
    <div><label>PROTEIN g</label><input class="fi" data-in="form" data-f="p" inputmode="decimal" placeholder="0" value="${esc(f.p)}"></div><div><label>CARBS g</label><input class="fi" data-in="form" data-f="c" inputmode="decimal" placeholder="0" value="${esc(f.c)}"></div><div><label>FAT g</label><input class="fi" data-in="form" data-f="f" inputmode="decimal" placeholder="0" value="${esc(f.f)}"></div>
    <div class="w3"><label>KCAL (optional)</label><input class="fi" data-in="form" data-f="kcal" inputmode="decimal" placeholder="auto: ${c.auto}" value="${esc(f.kcal)}"></div></div>
    <button class="tg ${f.per100 ? 'on' : ''}" data-a="per100"><b></b>Values on the label are per 100 g</button>
    <div class="pv" id="pv">For ${esc(f.amt || '…')} ${f.unit}: <b>${r0(c.kcal)} kcal</b> · P ${r1(c.p)} · C ${r1(c.c)} · F ${r1(c.f)}</div><button class="btn" data-a="saveItem">Save item</button></div>`;
  }
  return '';
}

/* ---------- shopping & budget ---------- */
function planDays() { return S.per === 7 ? [0, 1, 2, 3, 4, 5, 6] : [S.mday, (S.mday + 1) % 7, (S.mday + 2) % 7]; }
function groceries() {
  const g = {};
  planDays().forEach(d => SLOTS.forEach(([s]) => {
    const m = meal(d, s); if (!m) return;
    m.items.forEach(i => {
      const k = (i.key || ('c:' + i.name.toLowerCase())) + '|' + i.unit;
      if (!g[k]) g[k] = { k, name: i.name, unit: i.unit, amt: 0, key: i.key, custom: !i.key };
      g[k].amt += i.amt;
    });
  }));
  return Object.values(g).sort((a, b) => a.custom - b.custom);
}
const total = () => Object.values(S.price).reduce((a, b) => a + num(b), 0);
function vShop() {
  const gl = groceries();
  return `<h1>Shopping<span class="lidl">LIDL</span></h1><p class="sub">Built from your meal plan · type what you paid</p>
  <div class="seg"><button data-a="per" data-v="3" class="${S.per === 3 ? 'on' : ''}">3 days</button><button data-a="per" data-v="7" class="${S.per === 7 ? 'on' : ''}">7 days</button></div>
  ${S.per === 3 ? `<p class="note" style="margin:-4px 0 10px">3 days from ${WD[S.mday]} (change the day in Meals).</p>` : ''}
  ${gl.map(x => {
    const L = x.key && D.LIDL[x.key], url = L ? L.url : 'https://www.lidl.de/q/search?q=' + encodeURIComponent(x.name);
    return `<div class="it"><div><b>${esc(x.name)}</b>${x.custom ? '<span class="cust">CUSTOM</span>' : ''} <span class="q">${fq(x.unit, x.amt)}</span></div><div class="pr"><input data-in="price" data-k="${esc(x.k)}" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(S.price[x.k] || '')}"><span>€</span></div><div class="p"><a href="${url}" target="_blank" rel="noopener">${L ? esc(L.lidl) : 'Search on lidl.de'} ↗</a>${L && L.verify ? '<em>⚠ verify</em>' : ''}</div></div>`;
  }).join('')}
  <div class="tot"><div><small>TOTAL · ${S.per} DAYS</small><b id="tTot">${money(total())}</b></div><div style="text-align:right"><small>PER DAY</small><b id="tDay">${money(total() / S.per)}</b></div></div>
  <button class="btn sm sec2" style="margin-top:10px" data-a="saveList">Save this list to Budget</button>`;
}
function vBudget() {
  const t = total(), saved = S.saved.reduce((a, b) => a + b.total, 0), days = S.saved.reduce((a, b) => a + b.per, 0);
  return `<h1>Gym budget</h1><p class="sub">Food spending for the programme</p>
  <div class="kpi"><div><small>THIS LIST (UNSAVED)</small><b>${money(t)}</b></div><div><small>PER DAY</small><b>${money(t / S.per)}</b></div><div><small>SAVED LISTS</small><b>${money(saved)}</b></div><div><small>AVERAGE PER DAY</small><b>${days ? money(saved / days) : '–'}</b></div></div>
  <small class="sec">SAVED SHOPPING TRIPS</small>
  ${S.saved.length ? S.saved.map(s => `<div class="trip"><div><small>${esc(s.date)} · ${s.per} DAYS</small><b>${money(s.total)}</b></div><button data-a="delTrip" data-v="${esc(s.id)}" aria-label="Delete">✕</button></div>`).join('') : '<div class="note">Nothing saved yet. In Shop, type your prices and tap “Save this list to Budget”.</div>'}`;
}

/* ---------- progress ---------- */
function chartHtml() {
  const pts = []; for (let w = 1; w <= 12; w++) { const v = num(S.body[w] && S.body[w].w); if (v) pts.push([w, v]); }
  if (pts.length < 2) return '<div class="chart"><div class="note">Enter your weight for at least two weeks to see the chart.</div></div>';
  const vs = pts.map(p => p[1]), mn = Math.min(...vs) - 0.5, mx = Math.max(...vs) + 0.5, W = 320, H = 110;
  const X = w => 10 + (w - 1) / 11 * (W - 20), Y = v => 10 + (1 - (v - mn) / (mx - mn)) * (H - 20);
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" width="100%"><polyline fill="none" stroke="#C6F432" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}"/>${pts.map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.5" fill="#C6F432"/>`).join('')}<text x="10" y="${H - 1}" fill="#8F9C92" font-size="10">W1</text><text x="${W - 30}" y="${H - 1}" fill="#8F9C92" font-size="10">W12</text><text x="10" y="10" fill="#8F9C92" font-size="10">${r1(mx)} kg</text></svg></div>`;
}
function vProgress() {
  let rows = '';
  for (let w = 1; w <= 12; w++) { const b = S.body[w] || { w: '', s: '' }; rows += `<div class="rowin"><b>Week ${w}</b><input class="fi" data-in="body" data-w="${w}" data-f="w" inputmode="decimal" placeholder="kg" value="${esc(b.w)}"><input class="fi" data-in="body" data-w="${w}" data-f="s" inputmode="numeric" placeholder="steps/day" value="${esc(b.s)}"></div>`; }
  const T = S.tgt;
  return `<h1>Progress</h1><p class="sub">Log your body weight every morning (fasted) and your average steps.</p>${chartHtml()}
  <div class="rowin" style="margin-bottom:2px"><small></small><small>WEIGHT (KG)</small><small>STEPS</small></div>${rows}
  <small class="sec">DAILY TARGETS</small>
  <div class="fm" style="grid-template-columns:repeat(4,1fr)"><div><label>KCAL</label><input class="fi" data-in="tgt" data-f="kcal" inputmode="numeric" value="${T.kcal}"></div><div><label>P g</label><input class="fi" data-in="tgt" data-f="p" inputmode="numeric" value="${T.p}"></div><div><label>C g</label><input class="fi" data-in="tgt" data-f="c" inputmode="numeric" value="${T.c}"></div><div><label>F g</label><input class="fi" data-in="tgt" data-f="f" inputmode="numeric" value="${T.f}"></div></div>
  <small class="sec">BACKUP</small><p class="note" style="margin-top:0">Your data lives only on this phone. Export a backup file now and then (save it to Files / iCloud Drive).</p>
  <div class="acts" style="margin-top:6px"><button class="pr" data-a="export">Export backup</button><button data-a="import">Import backup</button></div>
  <input type="file" id="imp" accept=".json,application/json" hidden>
  <small class="sec">DANGER ZONE</small><button class="btn sm sec2" data-a="reset" style="color:var(--w)">Reset everything</button>
  <div class="note" style="margin-top:14px">Exercise photos: free-exercise-db (public domain). Tips are general training information, not medical advice.</div>`;
}

/* ---------- render ---------- */
function tabsHtml() {
  const T = [['train', '🏋️', 'Train'], ['meals', '🍽️', 'Meals'], ['shop', '🛒', 'Shop'], ['budget', '💶', 'Budget'], ['progress', '📈', 'Progress']];
  return `<nav class="tabs">${T.map(t => `<button data-a="tab" data-v="${t[0]}" class="${U.tab === t[0] ? 'on' : ''}"><span class="ic">${t[1]}</span>${t[2]}</button>`).join('')}</nav>`;
}
function render(keep) {
  const app = document.getElementById('app'), old = app.querySelector('.view'), st = old && keep ? old.scrollTop : 0;
  let body = '', bottom = '';
  if (U.tab === 'train') {
    if (U.view === 'detail') { body = vDetail(); if (exInfo(U.ex).db ? U.dt === 'log' : true) bottom = `<div class="bar-bottom"><button class="btn" data-a="saveEx">Save exercise</button></div>`; else bottom = ''; }
    else body = vTrain();
  } else if (U.tab === 'meals') {
    if (U.view === 'edit') { body = vEdit(); bottom = `<div class="bar-bottom"><button class="btn sec2" data-a="resetMeal">Reset to preset</button><button class="btn" data-a="addItem">+ Add item</button></div>`; }
    else body = vMeals();
  } else if (U.tab === 'shop') body = vShop();
  else if (U.tab === 'budget') body = vBudget();
  else body = vProgress();
  const showTabs = !((U.tab === 'train' && U.view === 'detail') || (U.tab === 'meals' && U.view === 'edit'));
  app.innerHTML = `<div class="view">${body}</div>${bottom}${showTabs ? tabsHtml() : ''}${sheetHtml()}`;
  const v = app.querySelector('.view'); if (v && keep) v.scrollTop = st;
}
let tt;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1800); }

/* ---------- actions ---------- */
const A = {
  tab(v) { U.tab = v; U.view = 'list'; U.sheet = null; U.form = null; render(); },
  wk(v) { S.week = Math.min(12, Math.max(1, S.week + (+v))); save(); render(true); },
  tday(v) { S.tday = +v; save(); render(true); },
  openEx(v, el) { U.ex = el.dataset.n; U.blk = el.dataset.blk; U.view = 'detail'; U.dt = 'log'; render(); },
  back() { U.view = 'list'; render(true); },
  dt(v) { U.dt = v; render(); },
  rir(v, el) { U.sheet = { type: 'rir', i: +el.dataset.i }; render(true); },
  setRir(v) { getLog(U.ex, U.blk).sets[U.sheet.i].rir = v; U.sheet = null; save(); render(true); },
  closeSheet() { U.sheet = null; U.form = null; render(true); },
  saveEx() { const L = getLog(U.ex, U.blk); L.done = true; save(); U.view = 'list'; render(true); toast('Saved'); },
  mday(v) { S.mday = +v; save(); render(true); },
  gotoDay(v) { S.mday = +v; U.mmode = 'day'; save(); render(); },
  mmode(v) { U.mmode = v; render(); },
  pick(v, el) { U.sheet = { type: 'pick', slot: el.dataset.s }; render(true); },
  setMeal(v) { S.plan[S.mday][U.sheet.slot] = mk(v); U.sheet = null; save(); render(true); },
  rmSnack() { S.plan[S.mday].snack = null; save(); render(true); },
  editMeal(v, el) { U.edit = el.dataset.s; U.view = 'edit'; render(); },
  delItem(v) { const m = meal(S.mday, U.edit); m.items.splice(+v, 1); m.edited = true; save(); render(true); },
  resetMeal() { if (confirm('Reset this meal to the programme preset?')) { S.plan[S.mday][U.edit] = mk(meal(S.mday, U.edit).preset); save(); render(true); } },
  addItem() { U.form = { name: '', amt: '', unit: 'g', p: '', c: '', f: '', kcal: '', per100: false, ix: null }; render(true); },
  fixItem(v) { const i = meal(S.mday, U.edit).items[+v]; U.form = { name: i.name, amt: String(r1(i.amt)), unit: i.unit, p: '', c: '', f: '', kcal: String(r0(i.kcal)), per100: false, ix: +v }; render(true); },
  unit(v) { U.form.unit = v; render(true); },
  per100() { U.form.per100 = !U.form.per100; render(true); },
  useFood(v) { const x = mineFoods()[+v]; U.form = Object.assign({}, U.form, { name: x.name, unit: x.unit, amt: String(r1(x.amt)), kcal: x.p == null ? String(r0(x.kcal)) : '', p: x.p == null ? '' : String(r1(x.p)), c: x.p == null ? '' : String(r1(x.c)), f: x.p == null ? '' : String(r1(x.f)), per100: false }); render(true); },
  saveItem() {
    const f = U.form; if (!f.name.trim() || !num(f.amt)) { toast('Enter a name and an amount'); return; }
    const c = formCalc(), m = meal(S.mday, U.edit);
    const it = { name: f.name.trim(), amt: num(f.amt), unit: f.unit, kcal: c.kcal, p: c.p, c: c.c, f: c.f };
    if (f.ix != null) { it.key = m.items[f.ix].key; m.items[f.ix] = it; }
    else { m.items.push(it); S.foods.push(clone(it)); }
    m.edited = true; U.form = null; save(); render(true);
  },
  per(v) { S.per = +v; save(); render(true); },
  saveList() {
    const t = total(); if (!t) { toast('Enter some prices first'); return; }
    S.saved.unshift({ id: String(Date.now()), date: isoDate(), per: S.per, total: t }); S.price = {}; save(); render(true); toast('Saved to Budget');
  },
  delTrip(v) { if (confirm('Delete this saved trip?')) { S.saved = S.saved.filter(s => s.id !== v); save(); render(true); } },
  export() {
    const name = 'walid-gym-backup-' + isoDate() + '.json', blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const file = (window.File ? new File([blob], name, { type: 'application/json' }) : null);
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Gym backup' }).catch(() => { }); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },
  import() { document.getElementById('imp').click(); },
  reset() { if (confirm('Delete ALL data on this phone (logs, meals, prices, weights)? Export a backup first.') && confirm('Really reset everything?')) { S = fresh(); save(); render(); toast('Reset done'); } }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a; if (A[a]) { e.preventDefault(); A[a](el.dataset.v, el); }
});
document.addEventListener('input', e => {
  const t = e.target, k = t.dataset && t.dataset.in; if (!k) return;
  if (k === 'set') { getLog(U.ex, U.blk).sets[+t.dataset.i][t.dataset.f] = t.value; }
  else if (k === 'rem') { getLog(U.ex, U.blk).rem = t.value; }
  else if (k === 'form') { U.form[t.dataset.f] = t.value; const c = formCalc(), pv = document.getElementById('pv'); if (pv) pv.innerHTML = `For ${esc(U.form.amt || '…')} ${U.form.unit}: <b>${r0(c.kcal)} kcal</b> · P ${r1(c.p)} · C ${r1(c.c)} · F ${r1(c.f)}`; const ki = document.querySelector('[data-f=kcal]'); if (ki) ki.placeholder = 'auto: ' + c.auto; return; }
  else if (k === 'price') { S.price[t.dataset.k] = t.value; const a = document.getElementById('tTot'), b = document.getElementById('tDay'); if (a) a.textContent = money(total()); if (b) b.textContent = money(total() / S.per); }
  else if (k === 'body') { const w = t.dataset.w; S.body[w] = S.body[w] || { w: '', s: '' }; S.body[w][t.dataset.f] = t.value; }
  else if (k === 'tgt') { S.tgt[t.dataset.f] = num(t.value) || 0; }
  save();
});
document.addEventListener('focusin', e => { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !t.readOnly) setTimeout(() => { try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { } }, 350); });
document.addEventListener('change', e => {
  if (e.target.dataset && e.target.dataset.in === 'body') { render(true); return; }
  if (e.target.id !== 'imp' || !e.target.files[0]) return;
  const rd = new FileReader();
  rd.onload = () => {
    try { const o = JSON.parse(rd.result); if (!o || o.v !== 1 || !o.plan) throw new Error('bad'); S = Object.assign(fresh(), o); save(); render(); toast('Backup imported'); }
    catch (err) { toast('That file is not a valid backup'); }
  };
  rd.readAsText(e.target.files[0]);
});

render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
})();
