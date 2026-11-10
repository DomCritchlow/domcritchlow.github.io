// Figures for "AI tools should answer where the work is". Each one isolates a single idea from the
// app on a small fictional calendar. The fisheye numbers and the time scale are the app's own:
// they are imported from the copy of the app that the last figure runs.
import {FISHEYE, timeScale} from './09-live-app/canvas.js';

const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const clock = m => { const h = Math.floor(m / 60), mm = m % 60, s = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${s}`; };
const span = e => `${clock(e.start).replace(/ (AM|PM)$/, (x, s) => (e.start < 720) === (e.end < 720) ? '' : ' ' + s)} to ${clock(e.end)}`;
const COLOR = {focus: '#14995f', together: '#2a78d6', updates: '#dd5b25', life: '#b8328a'};
const DAYS = [['m1', 'Mon', 9], ['t1', 'Tue', 10], ['w1', 'Wed', 11], ['h1', 'Thu', 12], ['f1', 'Fri', 13], ['m2', 'Mon', 16], ['t2', 'Tue', 17], ['w2', 'Wed', 18], ['h2', 'Thu', 19], ['f2', 'Fri', 20]].map(([key, label, num]) => ({key, label, num}));
const day = key => DAYS.find(d => d.key === key);
const E = (id, d, a, b, title, cat, more = {}) => ({id, day: d, start: hm(a), end: hm(b), title, cat, ...more});
const EVENTS = [
  E('notes', 'm1', '8:30', '9:00', 'Morning notes', 'focus', {who: 'Only you'}),
  E('review', 'm1', '10:00', '11:00', 'Project review', 'together', {place: 'Cedar', who: 'With Alex, Priya', people: 'Alex Kim, Priya Shah', about: 'Review the prototype and agree on the next iteration.', file: 'Review agenda'}),
  E('lunch1', 'm1', '12:00', '12:45', 'Lunch', 'life', {who: 'Only you'}),
  E('writing', 'm1', '14:00', '15:30', 'Writing time', 'focus', {who: 'Only you'}),
  E('sync', 'm1', '16:00', '16:30', 'Studio sync', 'updates', {who: 'With Jordan, Mei'}),
  E('standup2', 't1', '9:30', '9:45', 'Standup', 'updates', {who: 'With the team'}),
  E('lunch2', 't1', '12:00', '13:00', 'Lunch', 'life', {who: 'Only you'}),
  E('design', 't1', '13:00', '14:00', 'Design exchange', 'together', {place: 'Birch', who: 'With Ola'}),
  E('hiring', 't1', '15:30', '16:30', 'Hiring loop', 'together', {who: 'With Noor, Sam'}),
  E('standup3', 'w1', '9:30', '9:45', 'Standup', 'updates', {who: 'With the team'}),
  E('vendor', 'w1', '10:00', '11:00', 'Vendor demo', 'together', {external: true, who: 'With Dana', note: 'Optional, and the recording is shared after'}),
  E('research', 'w1', '13:00', '14:00', 'Research block', 'focus', {who: 'Only you'}),
  E('checkin', 'w1', '15:00', '16:00', 'Studio check-in', 'updates', {who: 'With Jordan'}),
  E('standup4', 'h1', '9:30', '9:45', 'Standup', 'updates', {who: 'With the team'}),
  E('customer', 'h1', '10:00', '11:00', 'Customer call', 'together', {external: true, place: 'Video', who: 'With Rae, Tom'}),
  E('sam', 'h1', '11:30', '12:00', '1:1 with Sam', 'together', {who: 'With Sam'}),
  E('lunch4', 'h1', '12:00', '13:00', 'Lunch', 'life', {who: 'Only you'}),
  E('roadmap', 'h1', '15:30', '16:00', 'Roadmap office hours', 'updates', {who: 'Drop-in', note: 'Drop-in, nothing of yours on the agenda'}),
  E('standup5', 'f1', '9:30', '9:45', 'Standup', 'updates', {who: 'With the team'}),
  E('reflection', 'f1', '11:00', '12:00', 'Weekly reflection', 'focus', {who: 'Only you'}),
  E('allhands', 'f1', '13:00', '14:00', 'All hands', 'updates', {who: 'Whole company', note: 'Optional for you, notes go out Monday'}),
  E('board', 'f1', '14:30', '15:30', 'Board prep', 'together', {place: 'Cedar', who: 'With Priya'}),
  E('review2', 'm2', '10:00', '11:00', 'Project review', 'together', {place: 'Cedar', who: 'With Alex, Priya'}),
  E('standup7', 't2', '9:30', '9:45', 'Standup', 'updates', {who: 'With the team'}),
  E('design2', 't2', '14:00', '15:00', 'Design exchange', 'together', {who: 'With Ola'}),
  E('standup8', 'w2', '9:30', '9:45', 'Standup', 'updates', {who: 'With the team'}),
  E('offsite', 'w2', '13:00', '16:00', 'Planning offsite', 'together', {place: 'Offsite', who: 'With the team'}),
  E('sam2', 'h2', '11:30', '12:00', '1:1 with Sam', 'together', {who: 'With Sam'}),
  E('customer2', 'h2', '14:00', '15:00', 'Customer call', 'together', {external: true, who: 'With Rae, Tom'}),
  E('allhands2', 'f2', '13:00', '14:00', 'All hands', 'updates', {who: 'Whole company'})
];
const byId = id => EVENTS.find(e => e.id === id);
const h = (tag, cls, html = '') => { const n = document.createElement(tag); if (cls) n.className = cls; n.innerHTML = html; return n; };

// A small calendar. Its elements are kept and restyled, so every change of shape is one CSS transition.
function Grid(host, opt = {}) {
  const from = opt.from ?? 480, to = opt.to ?? 1020, hour = opt.hour ?? 54;
  const s = {days: opt.days || ['m1', 't1', 'w1', 'h1', 'f1'], focus: new Set(), notes: false, open: null, level: 1, fisheye: opt.fisheye !== false, marks: {}, moved: {}};
  host.classList.add('dwf-grid');
  host.innerHTML = '<div class="dwf-head"><i class="dwf-corner"></i><div class="dwf-cols"></div></div><div class="dwf-body"><div class="dwf-axis"></div><div class="dwf-tracks"><div class="dwf-rules"></div></div></div><div class="dwf-measure dwf-ev"><div class="dwf-in"></div></div>';
  const cols = host.querySelector('.dwf-cols'), tracks = host.querySelector('.dwf-tracks'), axis = host.querySelector('.dwf-axis'), rules = host.querySelector('.dwf-rules'), body = host.querySelector('.dwf-body'), ruler = host.querySelector('.dwf-measure');
  const hours = []; for (let m = from; m <= to; m += 60) hours.push(m);
  const labels = hours.map(m => axis.appendChild(h('span', '', clock(m)))), lines = hours.map(() => rules.appendChild(h('i')));
  const colOf = new Map(), headOf = new Map(), evOf = new Map(), gapOf = new Map();
  const content = (e, mode) => {
    const when = `<span class="dwf-time">${span(e)}</span>`;
    if (mode === 'open' || mode === 'details') return `<b class="dwf-big">${e.title}</b><span class="dwf-time">${day(e.day).label}, Nov ${day(e.day).num} · ${span(e)}</span>` + (mode === 'open'
      ? `${e.place ? `<span class="dwf-place">${e.place}</span>` : ''}<span class="dwf-who"><i></i><i></i>${e.people || e.who}</span><span class="dwf-actions"><u class="on">Discuss</u><u>Change time</u><u class="plain" data-level="2">Details ›</u></span>`
      : `<span class="dwf-line">You're organizing</span><span class="dwf-about">${e.about || 'No description.'}</span>${e.file ? `<span class="dwf-file">${e.file} ↗</span>` : ''}<span class="dwf-actions"><u class="plain" data-level="1">‹ Back</u><u>Dial-in and options</u></span>`);
    if (mode === 'note') return `<b>${e.title}</b>${when}<span class="dwf-note">${e.note}</span>`;
    if (mode === 'peek') return `<b>${e.title}</b>${when}${e.place ? `<span class="dwf-sub">${e.place}</span>` : ''}<span class="dwf-sub">${e.who}</span>`;
    if (mode === 'tag') return `<b>${e.title}</b>${when}<span class="dwf-tag">${s.marks[e.id]}</span>`;
    return `<b>${e.title}</b>${when}`;
  };
  function draw() {
    const shown = EVENTS.filter(e => s.days.includes(s.moved[e.id]?.day || e.day)).map(e => ({...e, ...(s.moved[e.id] || {})}));
    const focused = shown.filter(e => s.focus.has(e.id) || s.open === e.id), fdays = new Set(focused.map(e => e.day));
    const weight = d => s.fisheye && fdays.size && fdays.size < s.days.length && fdays.has(d) ? FISHEYE.day : 1;
    // columns, with a folded strip wherever the days on screen are not next to each other
    const order = [];
    s.days.forEach((key, i) => { if (i) { const gap = day(key).num - day(s.days[i - 1]).num - 1; if (gap > 0) order.push({gap, key: s.days[i - 1] + '>' + key}); } order.push({key}); });
    const keep = new Set(order.map(o => o.key));
    for (const map of [colOf, headOf]) for (const [key, node] of map) if (!keep.has(key)) { node.remove(); map.delete(key); }
    for (const [key, pair] of gapOf) if (!keep.has(key)) { pair.forEach(n => n.remove()); gapOf.delete(key); }
    for (const [id, node] of evOf) if (!id.startsWith('ghost ') && !shown.some(e => e.id === id)) { node.remove(); evOf.delete(id); }
    order.forEach((o, i) => {
      if (o.gap) { if (!gapOf.has(o.key)) { gapOf.set(o.key, [tracks.appendChild(h('div', 'dwf-gap')), cols.appendChild(h('div', 'dwf-gap', `<span>${o.gap} ${o.gap === 1 ? 'day' : 'days'}</span>`))]); } gapOf.get(o.key).forEach(n => n.style.order = i); return; }
      if (!colOf.has(o.key)) { colOf.set(o.key, tracks.appendChild(h('div', 'dwf-track'))); headOf.set(o.key, cols.appendChild(h('div', 'dwf-day', `<span>${day(o.key).label}</span><b>${day(o.key).num}</b>`))); }
      for (const n of [colOf.get(o.key), headOf.get(o.key)]) { n.style.order = i; n.style.flexGrow = weight(o.key); n.classList.toggle('lit', weight(o.key) > 1); }
    });
    // what each meeting shows, and how much room that needs at its column's final width
    const total = tracks.clientWidth - order.filter(o => o.gap).length * 34, sum = s.days.reduce((n, d) => n + weight(d), 0);
    const modeOf = e => s.open === e.id ? (s.level === 2 ? 'details' : 'open') : s.marks[e.id] ? 'tag' : s.focus.has(e.id) ? (s.notes && e.note ? 'note' : s.peek && s.focus.size <= FISHEYE.peeks ? 'peek' : 'rest') : 'rest';
    const lenses = [];
    for (const e of shown) {
      const mode = modeOf(e); if (mode === 'rest') continue;
      ruler.style.width = Math.max(60, total * weight(e.day) / sum - 6) + 'px'; ruler.className = 'dwf-measure dwf-ev ' + mode; ruler.firstChild.innerHTML = content(e, mode);
      lenses.push({start: e.start, end: e.end, pixels: ruler.firstChild.offsetHeight + 14});
    }
    const scale = timeScale(from, to, s.fisheye ? focused.map(e => [e.start, e.end]) : [], hour, s.fisheye ? lenses : []);
    body.style.height = scale.height + 'px';
    hours.forEach((m, i) => { labels[i].style.top = lines[i].style.top = scale.at(m) + 'px'; });
    for (const e of shown) {
      let node = evOf.get(e.id);
      if (!node) { node = h('button', 'dwf-ev', '<div class="dwf-in"></div>'); node.type = 'button'; node.dataset.id = e.id; node.style.setProperty('--c', COLOR[e.cat]); evOf.set(e.id, node); }
      if (node.parentNode !== colOf.get(e.day)) colOf.get(e.day).appendChild(node);
      const mode = modeOf(e), height = Math.max(15, scale.at(e.end) - scale.at(e.start) - 2), html = content(e, mode);
      if (node.dataset.html !== html) { node.firstChild.innerHTML = html; node.dataset.html = html; }
      node.className = `dwf-ev ${mode}${height < 34 ? ' small' : ''}${s.focus.has(e.id) || s.open === e.id ? ' forward' : focused.length && s.dim !== false ? ' back' : ''}${s.marks[e.id] ? ' proposed' : ''}`;
      node.style.top = scale.at(e.start) + 'px'; node.style.height = height + 'px';
    }
    // A proposed move leaves the current time where it is, as an outline, until it is confirmed.
    for (const e of EVENTS) {
      const key = 'ghost ' + e.id, wanted = s.moved[e.id] && s.marks[e.id] && colOf.has(e.day); let node = evOf.get(key);
      if (!wanted) { if (node) { node.remove(); evOf.delete(key); } continue; }
      if (!node) { node = h('div', 'dwf-ev ghost', `<div class="dwf-in"><b>${e.title}</b><span class="dwf-time">Current time, still booked</span></div>`); evOf.set(key, node); }
      if (node.parentNode !== colOf.get(e.day)) colOf.get(e.day).appendChild(node);
      node.style.top = scale.at(e.start) + 'px'; node.style.height = Math.max(15, scale.at(e.end) - scale.at(e.start) - 2) + 'px';
    }
    s.scale = scale; opt.onDraw?.(s, scale);
  }
  host.addEventListener('click', ev => {
    const level = ev.target.closest('[data-level]'); if (level) { s.level = +level.dataset.level; opt.onLevel?.(s.level); draw(); return; }
    const node = ev.target.closest('.dwf-ev'); if (node && opt.onPick) { opt.onPick(node.dataset.id, s, ev); draw(); }
  });
  new ResizeObserver(draw).observe(host);
  return {s, draw, host, hour, from, to};
}

const chips = (figure, items, onPick, multi) => {
  const bar = figure.querySelector('.dwf-bar') || figure.insertBefore(h('div', 'dwf-bar'), figure.querySelector('.dwf-readout') || figure.querySelector('figcaption'));
  items.forEach(([label, value, on]) => { const b = bar.appendChild(h('button', 'dwf-chip' + (on ? ' on' : ''), label)); b.type = 'button'; b.dataset.value = value; });
  bar.addEventListener('click', ev => { const b = ev.target.closest('.dwf-chip'); if (!b) return; if (!multi) bar.querySelectorAll('.dwf-chip').forEach(x => x.classList.toggle('on', x === b)); onPick(b.dataset.value, b); });
  return bar;
};
const readout = figure => figure.insertBefore(h('p', 'dwf-readout'), figure.querySelector('figcaption'));
const stage = figure => figure.insertBefore(h('div', 'dwf-stage'), figure.firstChild);

const FIGURES = {
  // 1. The fixed grid: every hour gets the same room, and the detail floats over the week.
  fixed(figure) {
    const el = stage(figure), out = readout(figure); let card;
    const grid = Grid(el, {fisheye: false, onPick(id) { const e = byId(id), node = el.querySelector(`[data-id="${id}"]`), box = node.getBoundingClientRect(), base = el.getBoundingClientRect();
      card.innerHTML = `<b>${e.title}</b><span>${span(e)}</span><span>${e.place || 'No room'} · ${e.who}</span><span class="dwf-about">${e.about || 'Agenda, guests, files and notes open here.'}</span>`;
      card.classList.add('on'); const left = Math.min(base.width - 236, box.right - base.left + 8); card.style.left = left + 'px'; card.style.top = Math.max(8, Math.min(base.height - 150, box.top - base.top)) + 'px';
      out.innerHTML = `The card covers <b>${Math.round(230 / (base.width - 44) * 5 * 10) / 10} days</b> of the week it describes.`; }});
    card = el.appendChild(h('div', 'dwf-popover'));
    el.addEventListener('click', ev => { if (!ev.target.closest('.dwf-ev')) { card.classList.remove('on'); say(); } });
    const say = () => out.innerHTML = `A 15-minute standup gets <b>${Math.round(grid.hour / 4)} px</b>. The empty hour and a half before it gets <b>${Math.round(grid.hour * 1.5)} px</b>. Click a meeting.`;
    grid.draw(); say();
  },
  // 2. One sentence becomes a view and a set of changes.
  sentence(figure) {
    const el = stage(figure); el.classList.add('dwf-sentence');
    el.innerHTML = `<p class="dwf-ask"><span data-k="edit">Decline</span> the <span data-k="find">external meetings</span> <span data-k="view">on Wednesday and Thursday</span>, <span data-k="note">with a note</span></p>
      <ol class="dwf-ops"><li data-k="view"><code>view.days</code> Wed Nov 11, Thu Nov 12</li><li data-k="find"><code>edit.ids</code> Vendor demo, Customer call</li><li data-k="edit"><code>edit.action</code> decline; each organizer gets an RSVP</li><li data-k="note"><code>edit.note</code> "Sorry, I am out those days."</li></ol><div class="dwf-mini"></div>`;
    const grid = Grid(el.querySelector('.dwf-mini'), {days: ['w1', 'h1'], hour: 40});grid.s.dim = false;
    const steps = [() => { grid.s.marks = {}; grid.s.focus.clear(); }, () => {}, () => { grid.s.focus = new Set(['vendor', 'customer']); }, () => { grid.s.marks = {vendor: 'Proposed decline', customer: 'Proposed decline'}; }, () => { grid.s.marks = {vendor: 'Decline, with note', customer: 'Decline, with note'}; }];
    let timer; const play = () => { clearInterval(timer); let i = 0; const tick = () => { steps[i](); grid.draw(); el.querySelectorAll('[data-k]').forEach(n => n.classList.toggle('on', ['', 'view', 'find', 'edit', 'note'].indexOf(n.dataset.k) <= i && i > 0)); if (++i >= steps.length) clearInterval(timer); }; tick(); timer = setInterval(tick, 1100); };
    chips(figure, [['Replay', 'replay']], play); onSeen(figure, play);
  },
  // 3. The fisheye: what is in focus gets more room, and the rest gives a little.
  fisheye(figure) {
    const el = stage(figure), out = readout(figure);
    const grid = Grid(el, {onPick(id, s) { s.notes = false; s.focus.has(id) ? s.focus.delete(id) : s.focus.add(id); bar.querySelectorAll('.dwf-chip').forEach(b => b.classList.remove('on')); },
      onDraw(s, scale) { const sizes = []; for (let m = grid.from; m < grid.to; m += 60) sizes.push(Math.round(scale.at(m + 60) - scale.at(m))); const tall = Math.max(...sizes), short = Math.min(...sizes);
        out.innerHTML = s.focus.size ? `Hours in focus: up to <b>${tall} px</b>. The others: <b>${short} px</b> or more, never under ${Math.round(FISHEYE.floor * 100)}%. The day is still <b>${Math.round(scale.height)} px</b> long.` : `Every hour is <b>${grid.hour} px</b>. Click a meeting, or ask.`; }});
    const bar = chips(figure, [['Which meetings could I skip?', 'ask'], ['Clear', 'clear']], v => { grid.s.focus = new Set(v === 'ask' ? ['vendor', 'roadmap', 'allhands'] : []); grid.s.notes = v === 'ask'; grid.draw(); });
    grid.draw();
  },
  // 4. One meeting at three depths.
  depths(figure) {
    const el = stage(figure), out = readout(figure);
    const say = ['At rest: a title and a time.', 'Selected: where it is and who is in it. Up to four meetings can show this at once.', 'Opened: when, where, who and the actions, inside the slot.', 'Details: the description and the files. The slot grows again.'];
    const set = v => { const s = grid.s; s.focus = new Set(v === 1 ? ['review'] : []); s.peek = v === 1; s.open = v >= 2 ? 'review' : null; s.level = v === 3 ? 2 : 1; grid.draw(); out.textContent = say[v]; bar.querySelectorAll('.dwf-chip').forEach(b => b.classList.toggle('on', +b.dataset.value === v)); };
    const grid = Grid(el, {days: ['m1', 't1', 'w1'], onLevel: level => set(level === 2 ? 3 : 2), onPick: () => set(grid.s.open ? 0 : 2)});
    grid.s.dim = false;
    const bar = chips(figure, [['At rest', 0, true], ['Selected', 1], ['Opened', 2], ['Details', 3]], v => set(+v));
    set(0);
  },
  // 5. Any days side by side, with what lies between them folded away.
  compare(figure) {
    const el = stage(figure), out = readout(figure), picked = new Set(['t1', 'h2']);
    const grid = Grid(el, {days: [...picked], hour: 46});
    const show = () => { grid.s.days = DAYS.map(d => d.key).filter(k => picked.has(k)); grid.draw(); const n = grid.s.days.length, skipped = n > 1 ? day(grid.s.days.at(-1)).num - day(grid.s.days[0]).num + 1 - n : 0;
      out.innerHTML = `<b>${n} ${n === 1 ? 'day' : 'days'}</b> on screen${skipped ? `, <b>${skipped}</b> folded between them` : ''}. Pick up to four.`; };
    chips(figure, DAYS.map(d => [`${d.label} ${d.num}`, d.key, picked.has(d.key)]), (key, b) => { if (picked.has(key)) { if (picked.size > 1) picked.delete(key); } else if (picked.size < 4) picked.add(key); b.classList.toggle('on', picked.has(key)); show(); }, true);
    show();
  },
  // 6. The dates on screen are the dates the question is about.
  scope(figure) {
    const el = stage(figure), out = readout(figure), ask = el.appendChild(h('div', 'dwf-request', '<i></i><span>Which of these could move to the afternoon?</span>'));
    const views = {week: ['m1', 't1', 'w1', 'h1', 'f1'], thu: ['h1'], pair: ['t1', 'h1'], next: ['m2', 't2', 'w2', 'h2', 'f2']};
    const grid = Grid(el, {hour: 30});
    const set = v => { grid.s.days = views[v]; grid.draw(); const ds = views[v].map(day), morning = EVENTS.filter(e => views[v].includes(e.day) && e.start < 720).length;
      out.innerHTML = `Sent with the question: <b>${ds.length > 2 ? `${ds[0].label} Nov ${ds[0].num} to ${ds.at(-1).label} Nov ${ds.at(-1).num}` : ds.map(d => `${d.label} Nov ${d.num}`).join(' and ')}</b>. "These" is the <b>${morning}</b> morning ${morning === 1 ? 'meeting' : 'meetings'} on screen.`; };
    el.insertBefore(ask, el.firstChild);
    chips(figure, [['This week', 'week', true], ['Thursday', 'thu'], ['Tuesday and Thursday', 'pair'], ['Next week', 'next']], set); set('week');
  },
  // 7. A change is drawn before it is made.
  draft(figure) {
    const el = stage(figure), out = readout(figure);
    const grid = Grid(el, {days: ['m1', 't1', 'w1'], hour: 46}); grid.s.dim = false;
    const set = v => { const s = grid.s;
      if (v === 'ask') { s.moved = {review: {day: 'w1', start: hm('11:00'), end: hm('12:00')}}; s.marks = {review: 'Proposed move'}; s.focus = new Set(['review']); out.innerHTML = 'Drawn at 11:00 on Wednesday. <b>Nothing has been written.</b> Monday 10:00 is still booked.'; }
      if (v === 'yes') { if (!s.marks.review) { out.innerHTML = 'Nothing to confirm yet. Ask for the move first.'; return; } s.marks = {}; s.focus = new Set(); out.innerHTML = 'Confirmed. <b>Now</b> the calendar changes, and Alex and Priya get an update.'; }
      if (v === 'no') { if (!s.marks.review) { out.innerHTML = s.moved.review ? 'Already confirmed. Ask again to move it back.' : 'Nothing to discard yet.'; return; } s.moved = {}; s.marks = {}; s.focus = new Set(); out.innerHTML = 'Discarded. The calendar was never touched.'; }
      requestAnimationFrame(() => grid.draw()); };
    chips(figure, [['Move project review to Wednesday at 11', 'ask'], ['Move meeting', 'yes'], ['Discard', 'no']], set);
    grid.draw(); out.innerHTML = 'Project review is on Monday at 10:00. Ask to move it.';
  },
  // 7b. Another agent suggests; the app checks it and draws it like any other change.
  agent(figure) {
    const el = stage(figure), out = readout(figure);
    const inbox = el.appendChild(h('div', 'dwf-inbox', '<span class="dwf-saved">Saved <b>0</b></span><div class="dwf-note-card"></div>'));
    const grid = Grid(el, {days: ['h1', 'f1'], hour: 44}); grid.s.dim = false;
    const card = inbox.querySelector('.dwf-note-card'), count = inbox.querySelector('.dwf-saved b');
    const set = v => { const s = grid.s;
      if (v === 'send') { count.textContent = '1'; inbox.classList.add('has'); s.moved = {}; s.marks = {}; s.focus = new Set();
        card.innerHTML = '<b>Move Weekly reflection to Thursday afternoon</b><span>From a connected agent · source: team chat, Nov 8</span><span class="dwf-checked">Checked by the app: Thursday 2 to 3 is open.</span>';
        out.innerHTML = 'The suggestion arrives over MCP and waits in Saved. <b>The calendar has not changed.</b>'; }
      if (v === 'open') { if (count.textContent === '0') { out.innerHTML = 'Saved is empty. Send the suggestion first.'; return; } s.moved = {reflection: {day: 'h1', start: hm('14:00'), end: hm('15:00')}}; s.marks = {reflection: 'Suggested move'}; s.focus = new Set(['reflection']);
        out.innerHTML = 'Opened, it is drawn like any other change: the new time hatched, the current time outlined. <b>Still nothing written.</b>'; }
      if (v === 'yes') { if (!s.marks.reflection) { out.innerHTML = count.textContent === '0' ? 'Nothing to confirm yet. Send the suggestion first.' : 'Open it first, so you can see what would change.'; return; } s.marks = {}; s.focus = new Set(); count.textContent = '0'; inbox.classList.remove('has'); card.innerHTML = '';
        out.innerHTML = 'Confirmed. <b>Now</b> the calendar changes.'; }
      grid.draw(); };
    chips(figure, [['The agent sends a suggestion', 'send'], ['Open it', 'open'], ['Move meeting', 'yes']], set);
    grid.draw(); out.innerHTML = 'An agent connected to the calendar, reading sources the calendar cannot see. Send its suggestion.';
  },
  // 8. The whole app, driven one step at a time. Typing is shown key by key, and each step waits for its outcome.
  walk(figure) {
    const el = stage(figure); el.classList.add('dwf-live');
    const frame = el.appendChild(h('iframe')); frame.title = 'Dayweave running on a fictional week';
    const out = readout(figure), doc = () => frame.contentDocument, win = () => frame.contentWindow, q = sel => doc()?.querySelector(sel), wait = ms => new Promise(r => setTimeout(r, ms));
    const until = async (test, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (test()) return true; } catch {} await wait(80); } return false; };
    const idle = () => until(() => !q('.shell').classList.contains('thinking') && !q('#headline .headline-mark.working'));
    const type = async text => { const box = q('#command'); box.focus(); box.value = ''; for (const ch of text) { box.value += ch; box.dispatchEvent(new Event('input', {bubbles: true})); await wait(34); } await wait(380); q('#composer').requestSubmit(); await until(() => q('.shell').classList.contains('thinking'), 1200); await idle(); await wait(500); };
    const find = title => [...doc().querySelectorAll('.event')].find(n => n.querySelector('.event-title')?.textContent === title);
    const click = (node, keys = {}) => node?.dispatchEvent(new MouseEvent('click', {bubbles: true, ...keys}));
    const press = k => doc().dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true}));
    const settle = async () => { await wait(450); await idle(); };
    // An agent connected over MCP sends a suggestion. The demo receives it the way the app's server does.
    const suggest = async () => {
      const api = (path, body) => win().fetch(path, body ? {method: 'POST', body: JSON.stringify(body)} : undefined).then(r => r.json());
      const snap = await api('/api/snapshot'), e = snap.events.find(x => x.title === 'Weekly reflection'), thu = snap.events.find(x => x.title === 'Customer call');
      const start = new Date(Date.parse(thu.start) + 4 * 3600000).toISOString(), end = new Date(Date.parse(start) + 3600000).toISOString();
      await api('/api/decisions/reconcile', {contributionId: 'agent-' + Date.now(), proposal: {title: 'Move Weekly reflection to Thursday afternoon', reply: 'Friday is full of shared meetings. Thursday from 2 is open, and the reflection has no guests.', proposalState: {origin: 'Connected agent', edits: {[e.ref]: {kind: 'move', start, end}}, highlighted: [e.ref]}}});
      await until(() => /[1-9]/.test(q('#open-count')?.textContent || '') && !q('#open-count').classList.contains('empty'), 9000);
    };
    const steps = [
      ['The week at rest: the dates, one request bar, three views, and the hours added up by category.', null, async () => {}],
      ['A question. The meetings it is about come forward, each with its reason written inside it.', 'Which meetings could I skip this week?', null],
      ['A change. Three declines are drafted on the calendar; nothing is sent until you confirm.', 'Decline those', null],
      ['Discard. The draft goes and the week settles back.', null, async () => { q('#headline [data-action="close-thread"]')?.click(); await settle(); }],
      ['An agent connected over MCP, which reads sources the calendar cannot see, sends a suggestion. It waits in Saved; the calendar does not change.', null, suggest],
      ['Open it. The suggested move is drawn on the calendar with its reason, and the current time stays as an outline.', null, async () => { q('#open-count').click(); await until(() => q('#drawer .decision-card-main')); await wait(500); q('#drawer .decision-card-main').click(); await settle(); }],
      ['Confirm. Only now is the calendar written.', null, async () => { q('#headline .primary')?.click(); await until(() => /Done|applied/i.test(q('#headline')?.textContent || ''), 6000); await wait(600); }],
      ['Open one meeting. Its slot grows to hold its details, on its own color.', null, async () => { q('#headline [data-action="close-thread"]')?.click(); await settle(); click(find('Project review')); await settle(); }],
      ['Close it and select three meetings with Command-click. Each shows where it is and who is in it, and the bulk actions appear above.', null, async () => { press('Escape'); await settle(); for (const t of ['Project review', 'Design exchange', 'Board prep']) { click(find(t), {metaKey: true, ctrlKey: true}); await wait(650); } }],
      ['Compare two days. The day between them folds into a strip.', 'Compare Tuesday and Thursday', async () => { q('[data-action="clear-selection"]')?.click(); await settle(); }]
    ];
    let at = 0, busy = false;
    const show = (i, typing) => { out.innerHTML = `<b>${i + 1} of ${steps.length}.</b> ${steps[i][0]}${typing ? `<span class="dwf-typed">Typed: “${typing}”</span>` : ''}`; };
    const next = bar => bar.querySelector('[data-value=next]');
    const go = async i => {
      if (busy || !q('#command:not([disabled])')) return; busy = true; at = i; const [, text, before] = steps[i];
      const button = next(bar); button.disabled = true; show(i, text);
      try { if (i > 3) { const t = q('#toast'); if (t) t.hidden = true; } if (before) await before(); if (text) await type(text); } catch (error) { console.error(error); }
      button.disabled = false; button.textContent = i === steps.length - 1 ? 'Start over' : 'Next step'; busy = false;
    };
    // The demo keeps its state in this tab's storage; a fresh start clears it.
    const reset = () => { try { sessionStorage.removeItem('dayweave-demo-v2'); for (const k of Object.keys(localStorage)) if (/^calendar-(decisions|settings)|^dayweave-/.test(k)) localStorage.removeItem(k); } catch {} };
    const load = () => { reset(); at = 0; show(0); next(bar).textContent = 'Next step'; next(bar).disabled = true; frame.src = '/public/experiments/dayweave/09-live-app/index.html?walk=' + Date.now(); };
    frame.addEventListener('load', () => until(() => q('#command:not([disabled])'), 15000).then(() => { next(bar).disabled = false; }));
    const bar = chips(figure, [['Next step', 'next']], () => { if (busy) return; if (at === steps.length - 1) load(); else go(at + 1); });
    const size = () => { const w = el.clientWidth, phone = w < 700; frame.style.width = phone ? '100%' : '1280px'; frame.style.height = phone ? '640px' : '780px'; frame.style.transform = phone ? 'none' : `scale(${w / 1280})`; el.style.height = (phone ? 640 : Math.round(780 * w / 1280)) + 'px'; };
    size(); addEventListener('resize', size); show(0);
    onSeen(figure, load, '400px');
  }
};
function onSeen(node, run, margin = '0px') {
  if (!('IntersectionObserver' in window)) return run();
  const seen = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { seen.disconnect(); run(); } }, {rootMargin: margin, threshold: margin === '0px' ? .4 : 0}); seen.observe(node);
}
for (const figure of document.querySelectorAll('figure[data-dwf]')) { try { FIGURES[figure.dataset.dwf]?.(figure); } catch (error) { console.error('figure', figure.dataset.dwf, error); } }
