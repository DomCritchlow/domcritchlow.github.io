const FISHEYE={peak:1.38,reach:45,floor:.84,day:1.42,card:320,peeks:4};
// A lens {start,end,pixels} is a meeting that needs room for what it shows: a little for a selected
// meeting's extra lines, more for an opened one. Its span gets at least that many pixels; the rest
// give what the floor allows, and the day grows only by what is still missing.
function timeScale(from,to,focus=[],base=68,lens=null){
 const lenses=(Array.isArray(lens)?lens:lens?[lens]:[]).filter(l=>l.end>l.start&&l.pixels>0);
 const per=base/60,ease=t=>t*t*(3-2*t),ranges=[...focus,...lenses.map(l=>[l.start,l.end])];
 const cuts=new Set();for(let m=from;m<to;m+=15)cuts.add(m);for(const l of lenses)for(const m of [l.start,l.end])if(m>from&&m<to)cuts.add(m);
 const edges=[...cuts].sort((x,y)=>x-y),bands=edges.map((start,i)=>({start,end:edges[i+1]??to,stretch:1}));
 const weight=(a,b)=>ranges.reduce((best,[start,end])=>{const gap=Math.max(0,start-b,a-end);return Math.max(best,gap>=FISHEYE.reach?0:ease(1-gap/FISHEYE.reach));},0);
 let lit=0,slack=0;
 for(const band of bands){band.w=weight(band.start,band.end);lit+=band.w*(band.end-band.start);slack+=(1-band.w)*(band.end-band.start);}
 const peak=lit?Math.min(FISHEYE.peak,1+(1-FISHEYE.floor)*slack/lit):1;
 let give=lit&&slack?Math.min(1-FISHEYE.floor,(peak-1)*lit/slack):0;
 const size=band=>(band.end-band.start)*per*(1+(peak-1)*band.w-give*(1-band.w));
 // Each lens stretches its own span to fit; where two overlap, the larger need wins.
 for(const l of lenses){const inside=bands.filter(b=>b.start>=l.start&&b.end<=l.end),natural=inside.reduce((n,b)=>n+size(b)*b.stretch,0);if(natural&&natural<l.pixels)for(const b of inside)b.stretch*=l.pixels/natural;}
 const extra=bands.reduce((n,b)=>n+size(b)*(b.stretch-1),0);
 if(extra&&slack)give=Math.min(1-FISHEYE.floor,give+extra/(slack*per));
 let height=0;
 for(const band of bands){band.y=height;band.pixels=size(band)*band.stretch;height+=band.pixels;}
 const at=value=>{const v=Math.min(to,Math.max(from,value)),b=bands.find(b=>v<b.end)||bands.at(-1);return b?b.y+(v-b.start)/(b.end-b.start)*b.pixels:0;};
 const minute=value=>{const b=bands.find(b=>value<b.y+b.pixels)||bands.at(-1);return b?b.start+(value-b.y)/b.pixels*(b.end-b.start):from;};
 return {height,at,minute,from,to,bands};
}

const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const clock = m => { const h = Math.floor(m / 60), mm = m % 60, s = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${s}`; };
const span = e => `${clock(e.start).replace(/ (AM|PM)$/, (x, s) => (e.start < 720) === (e.end < 720) ? '' : ' ' + s)} to ${clock(e.end)}`;
const COLOR = {focus: '#14995f', together: '#2a78d6', updates: '#dd5b25', life: '#b8328a'};
const DAYS = [['m1', 'Mon', 9], ['t1', 'Tue', 10], ['w1', 'Wed', 11], ['h1', 'Thu', 12], ['f1', 'Fri', 13], ['m2', 'Mon', 16], ['t2', 'Tue', 17], ['w2', 'Wed', 18], ['h2', 'Thu', 19], ['f2', 'Fri', 20]].map(([key, label, num]) => ({key, label, num}));
const day = key => DAYS.find(d => d.key === key);
const E = (id, d, a, b, title, cat, more = {}) => ({id, day: d, start: hm(a), end: hm(b), title, cat, ...more});
const EVENTS = [
  E('notes', 'm1', '8:30', '9:00', 'Morning notes', 'focus', {who: 'Only you'}),
  E('review', 'm1', '10:00', '11:00', 'Project review', 'together', {place: 'Cedar', who: 'With Alex, Morgan', people: 'Alex Kim, Morgan Bell', about: 'Review the prototype and agree on the next iteration.', file: 'Review agenda'}),
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
  E('reflection', 'f1', '11:00', '12:00', 'Weekly reflection', 'focus', {who: 'Only you', note: 'Solo hold. Weekly notes are up to date.'}),
  E('allhands', 'f1', '13:00', '14:00', 'All hands', 'updates', {who: 'Whole company', note: 'Optional for you, notes go out Monday'}),
  E('board', 'f1', '14:30', '15:30', 'Board prep', 'together', {place: 'Cedar', who: 'With Morgan'}),
  E('review2', 'm2', '10:00', '11:00', 'Project review', 'together', {place: 'Cedar', who: 'With Alex, Morgan'}),
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
    if (mode === 'inspect') return `<b class="dwf-big">${e.title}</b><span class="dwf-about-when">${day(e.day).label} · ${span(e)}</span><span>${e.people || e.who}</span>${[e.place,e.about,e.note,s.marks[e.id]].filter(Boolean).map(text=>'<span>'+text+'</span>').join('')}`;
    if (mode === 'open' || mode === 'details') return `<b class="dwf-big">${e.title}</b><span class="dwf-time">${day(e.day).label}, Nov ${day(e.day).num} · ${span(e)}</span>` + (mode === 'open'
      ? `${e.place ? `<span class="dwf-place">${e.place}</span>` : ''}<span class="dwf-who"><i></i><i></i>${e.people || e.who}</span><span class="dwf-actions"><u class="on">Discuss</u><u>Change time</u></span>`
      : `<span class="dwf-line">You're organizing</span><span class="dwf-about">${e.about || 'No description.'}</span>${e.file ? `<span class="dwf-file">${e.file} ↗</span>` : ''}<span class="dwf-actions"><u>Dial-in and options</u></span>`);
    if (mode === 'note') return `<b>${e.title}</b>${when}<span class="dwf-note">${e.note}</span>`;
    if (mode === 'peek') return `<b>${e.title}</b>${when}${e.place ? `<span class="dwf-sub">${e.place}</span>` : ''}<span class="dwf-sub">${e.who}</span>`;
    if (mode === 'tag') return `<b>${e.title}</b>${when}<span class="dwf-tag">${s.marks[e.id]}</span>`;
    return `<b>${e.title}</b>${when}`;
  };
  function draw() {
    const shown = EVENTS.filter(e => s.days.includes(s.moved[e.id]?.day || e.day)).map(e => ({...e, ...(s.moved[e.id] || {})})).filter(e => e.start < to && e.end > from);
    const focused = shown.filter(e => s.focus.has(e.id) || s.open === e.id || s.inspected === e.id), fdays = new Set(focused.map(e => e.day));
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
    const modeOf = e => s.inspected === e.id ? 'inspect' : s.open === e.id ? (s.level === 2 ? 'details' : 'open') : s.marks[e.id] ? 'tag' : s.focus.has(e.id) ? (s.notes && e.note ? 'note' : s.peek && s.focus.size <= FISHEYE.peeks ? 'peek' : 'rest') : 'rest';
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
      node.setAttribute('aria-expanded',String(s.inspected===e.id || s.open===e.id));
      node.setAttribute('aria-label',e.title+', '+day(e.day).label+', '+span(e));
      node.className = `dwf-ev ${mode}${height < 34 ? ' small' : ''}${s.focus.has(e.id) || s.open === e.id || s.inspected === e.id ? ' forward' : focused.length && s.dim !== false ? ' back' : ''}${s.marks[e.id] ? ' proposed' : ''}`;
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

const week = ['m1','t1','w1','h1','f1'];
const scenes = {
  sentence: {
    label:'Replay', request:'Which meetings could I skip this week?',
    steps:[
      [400, {focus:['vendor','roadmap','reflection'],notes:true}, 'Skip the vendor demo if you’re happy to watch the recording. Office hours are drop-in, and you have nothing on the agenda. Friday’s reflection is just you. Your notes are already up to date.'],
      [4800, {focus:['reflection'],notes:false,moved:{reflection:{day:'h1',start:780,end:840}},marks:{reflection:'Proposed · 1–2 PM'}}, 'Friday opens up from the end of standup at 9:45 until all hands at 1. On Thursday, reflection would start as lunch ends.', 'What if I kept my reflection and moved it to Thursday after lunch?']
    ]
  },
  fisheye: {
    label:'Find meetings I could skip', request:'Which meetings could I skip this week?',
    steps:[[350,{focus:['vendor','roadmap','allhands'],notes:true},'Three meetings come forward, each with its own reason.']]
  },
  depths: {
    label:'Look inside the review', request:'Who’s in the project review, and what are we deciding?', days:['m1','t1','w1'],
    steps:[
      [350,{focus:['review'],peek:true},'The guests and room appear inside Monday’s meeting.'],
      [1500,{open:'review',level:1},'The slot expands around the meeting details.'],
      [1600,{level:2},'The agenda names the decision and links to the review document.']
    ]
  },
  compare: {
    label:'Compare the two days', request:'Put this Tuesday beside next Thursday.',
    steps:[[500,{days:['t1','h2']},'Eight days fold into the strip between Tuesday the 10th and Thursday the 19th.']]
  },
  scope: {
    label:'Narrow the view', request:'Which of these morning meetings could move?',
    steps:[
      [300,{focus:EVENTS.filter(e=>week.includes(e.day)&&e.start<720).map(e=>e.id)},'“These” refers to the morning meetings across the visible week.'],
      [1600,{days:['h1'],focus:EVENTS.filter(e=>e.day==='h1'&&e.start<720).map(e=>e.id)},'The same question now refers to Thursday’s three morning meetings.']
    ]
  },
  draft: {
    label:'Preview the move',request:'Move project review to Wednesday at eleven.',days:['m1','t1','w1'],
    steps:[[450,{moved:{review:{day:'w1',start:660,end:720}},marks:{review:'Proposed move'},focus:['review']},'The outline holds Monday’s booking. The striped meeting shows where it would land on Wednesday.']]
  },
  agent: {
    label:'Open the suggestion',request:'Team chat suggests moving Friday’s reflection to Thursday.',days:['h1','f1'],
    steps:[
      [350,{received:true},'From team chat · A teammate flagged a packed Friday.'],
      [1500,{moved:{reflection:{day:'h1',start:840,end:900}},marks:{reflection:'Team chat · proposed'},focus:['reflection']},'Thursday from 2 to 3 is free. Friday stays booked while you review the suggestion.']
    ]
  }
};
// These figures share the example calendar with the week view.
function makePlate(kind, host) {
  host.classList.add('plate', 'plate-'+kind);
  const state={};
  function columns(selected) {
    const band=h('div','date-band');
    for(let num=10;num<=19;num++){
      const d=DAYS.find(d=>d.num===num);
      const endpoint=num===10||num===19;
      if(selected&&!endpoint) {
        if(num===11)band.append(h('div','fold','<span>8 days</span>'));
        continue;
      }
      const col=h('div','strip-day'+(endpoint?' endpoint':''));
      col.append(h('span','strip-date',String(num)));
      const track=h('div','strip-track');
      for(const e of EVENTS.filter(e=>e.day===d?.key)){
        const block=h('i','strip-booking');
        block.style.top=((e.start-480)/540*100)+'%'; block.style.height=((e.end-e.start)/540*100)+'%';
        block.title=e.title+' · '+span(e);
        track.append(block);
      }
      col.append(track);band.append(col);
    }
    return band;
  }
  function panel(name,node) {const p=h('div','plate-panel');p.append(h('b','panel-title',name),node);return p;}
  function pair(a,b){host.replaceChildren(panel(...a),h('span','plate-arrow','→'),panel(...b));}
  function draw() {
    if(kind==='compare'){
      pair(['November 10–19',columns(false)],[state.days?.length===2?'Two days side by side':'Calendar view',columns(state.days?.length===2)]);
    }else if(kind==='scope'){
      const block=days=>{
        const group=h('div','dot-plot');
        for(const key of week){
          const d=day(key), col=h('div','dot-column'+(days.includes(key)?' selected':''));
          const stack=h('div','dot-stack');
          for(const e of EVENTS.filter(e=>e.day===key&&e.start<720)){
            const cube=h('i','meeting-tile');cube.title=e.title+' · '+span(e);stack.append(cube);
          }
          col.append(stack,h('span','dot-label',d.label));group.append(col);
        }
        return group;
      };
      const current=state.days||week;
      pair(['Visible week',block(week)],['Scope of “these”',block(current)]);
    }else{
      const proposed=Boolean(state.moved?.reflection);
      const received=proposed||state.received;
      host.innerHTML='<div class="handoff '+(received?'received':'')+'"><b>Team chat</b><span>Friday is filling up.</span></div><span class="plate-arrow">→</span><div class="handoff '+(proposed?'received':'')+'"><b>Calendar check</b><span>'+(proposed?'Thursday, 2–3 PM is open.':'Waiting for suggestion')+'</span></div>';
      const strip=h('div','proposal-strip'+(proposed?' proposed':''));
      strip.innerHTML='<span>Weekly reflection</span><div><b>Fri · 11 AM</b>'+(proposed?' <i>→</i> <b>Thu · 2 PM</b>':'')+'</div>';
      host.append(strip);
    }
  }
  return {s:state,draw};
}

function buildScene(figure) {
  const kind=figure.dataset.dwf, scene=scenes[kind], hero=kind==='sentence';
  const caption=figure.querySelector('figcaption');
  const stage=h('div','dwf-stage story-stage');
  const history=h('div','request-history');
  history.setAttribute('role','log');
  history.setAttribute('aria-label','Conversation');
  history.setAttribute('aria-live','polite');
  const form=h('form','request-form');
  const field=h('textarea','request-field');
  field.readOnly=true;
  field.rows=1;
  field.setAttribute('aria-label','Suggested question');
  const send=h('button','submit-request','Send <span aria-hidden="true">↑</span>');
  send.type='submit';
  form.append(field,send);
  const calendar=h('div','scene-calendar');
  const again=h('button','start-over','Start over');
  again.type='button';again.hidden=true;
  stage.append(form,calendar);

  figure.insertBefore(stage,caption);

  const days=scene.days||week;
  const diagram=['scope','agent','compare'].includes(kind);
  const grid=diagram?makePlate(kind,calendar):Grid(calendar,{days,hour:hero?48:42,onPick(id,state){if(id){state.inspected=state.inspected===id?null:id;prepare();if(state.inspected && form.getBoundingClientRect().bottom<40)form.scrollIntoView({block:'start'});}}});
  const legends={scope:['Morning meeting','In scope'],compare:['Other bookings','Compared days'],agent:[],sentence:['Meeting','In focus','Original slot'],draft:['Meeting','Proposed move','Original slot']};
  const legend=h('div','legend');
  for(const label of legends[kind]||['Meeting','In focus'])legend.append(h('span',label==='Original slot'?'outline':'',label));
  if(legend.children.length)stage.append(legend);
  const index=[...document.querySelectorAll('figure[data-dwf]')].indexOf(figure)+1;
  caption.prepend(h('b','','Figure '+index+'. '));
  const followups={
    sentence:[scene.steps[1]?.[3]],
    depths:['Who’s coming?','What decision is on the agenda?'],
    scope:['What if I only look at Thursday?'],
    agent:['Does that time actually work?']
  };
  const firstRequest={
    depths:'Show me Monday’s project review.',
    scope:'Which morning meetings am I looking at?',
    agent:'What did the team suggest for Friday?'
  };
  const requests=[firstRequest[kind]||scene.request,...(followups[kind]||[])];
  let turn=0;
  function sizeField(){
    field.style.height='auto';
    field.style.height=field.scrollHeight+'px';
  }
  const contextLabel=h('span','context-label');
  const comparison=h('aside','move-aside');
  comparison.setAttribute('aria-label','Move comparison');
  comparison.hidden=true;
  form.prepend(contextLabel);
  calendar.after(comparison);
  const fullDay=k=>({Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday'})[day(k).label];
  const slot=e=>fullDay(e.day)+' · '+span(e);
  function selectionQuestion(id){
    const e=byId(id);
    if(grid.s.moved[id])return {text:'What if I keep '+e.title+' at its original time?',event:e,restore:true};
    const duration=e.end-e.start;
    const index=days.indexOf(e.day);
    const alternatives=days.slice(index+1).concat(days.slice(0,index));
    if(id==='reflection' && days.includes('h1'))alternatives.unshift('h1');
    const bookings=EVENTS.filter(other=>other.id!==id).map(other=>({...other,...grid.s.moved[other.id]}));
    for(const d of alternatives){
      const starts=[id==='reflection'?780:e.start];
      for(let t=540;t+duration<=1020;t+=30)starts.push(t);
      for(const start of starts){
        const end=start+duration;
        if(bookings.some(other=>other.day===d && other.start<end && other.end>start))continue;
        const dest={day:d,start,end};
        return {event:e,dest,text:'What if I move '+e.title+' to '+fullDay(d)+' at '+clock(start)+'?'};
      }
    }
    return {event:e,text:'Who’s coming to '+e.title+'?'};
  }
  function prepare(){
    const selected=grid.s.inspected?selectionQuestion(grid.s.inspected):null;
    form.hidden=false;
    contextLabel.hidden=!selected;
    contextLabel.textContent=selected?'Selected · '+selected.event.title:'';
    const movedId=Object.keys(grid.s.moved||{})[0];
    field.value=selected?.text||(movedId?'What if I leave '+byId(movedId).title+' where it was?':requests[turn]||'Show me where we started.');
    if(!form.hidden)sizeField();
  }
  function compareMove(e,dest){
    comparison.replaceChildren();
    for(const [label,entry] of [['Currently booked',e],['Proposed time',dest]]){
      const item=h('div','slot-comparison');
      item.append(h('small','',label),h('b','',slot(entry)));
      comparison.append(item);
    }
    comparison.hidden=false;
  }
  const base={days:[...days],focus:new Set(),marks:{},moved:{},notes:false,open:null,level:1,peek:false,received:false,inspected:null};
  stage.insertBefore(history,form);
  stage.append(again);
  again.addEventListener('click',()=>{
    turn=0;
    Object.assign(grid.s,base);
    grid.draw();history.replaceChildren();comparison.hidden=true;
    again.hidden=true;form.hidden=false;prepare();
    send.focus({preventScroll:true});
  });
  grid.draw();
  prepare();
  new ResizeObserver(sizeField).observe(form);
  function submit(){
    const selected=grid.s.inspected?selectionQuestion(grid.s.inspected):null;

    const asked=field.value;
    let message;
    comparison.hidden=true;
    if(selected){
      const {event:e,dest,restore}=selected;
      const moved={...grid.s.moved},marks={...grid.s.marks};
      if(restore){
        delete moved[e.id];delete marks[e.id];
        message=e.title+' is back at '+slot(e)+'.';
      }else if(dest){
        moved[e.id]=dest;marks[e.id]='Proposed · '+span(dest);
        compareMove(e,dest);
        message=e.id==='reflection' && dest.day==='h1' && dest.start===780
          ? 'Friday opens up from 9:45 until 1. On Thursday, reflection would start as lunch ends.'
          : 'This would free '+slot(e)+' and use '+span(dest)+' on '+fullDay(dest.day)+'.';
        if(hero && e.id==='reflection' && turn===1)turn=2;
      }else message=e.who||'Only you';
      Object.assign(grid.s,{moved,marks,notes:false,open:null,focus:new Set([e.id])});
    }else if(turn>=requests.length || Object.keys(grid.s.moved||{}).length){
      const movedId=Object.keys(grid.s.moved||{})[0];
      if(movedId){
        const moved={...grid.s.moved},marks={...grid.s.marks};
        delete moved[movedId];delete marks[movedId];
        Object.assign(grid.s,{moved,marks,focus:new Set([movedId])});
        const e=byId(movedId);
        message=e.title+' stays on '+slot(e)+'.';
      }else{
        Object.assign(grid.s,base);
        turn=0;
        message='Here’s the original view.';
      }
    }else{
      const [,patch,reply]=scene.steps[turn++];
      Object.assign(grid.s,patch);message=reply;
      if(patch.focus)grid.s.focus=new Set(patch.focus);
      for(const [id,dest] of Object.entries(patch.moved||{}))compareMove(byId(id),dest);
    }
    grid.s.inspected=null;
    if(hero && matchMedia('(max-width: 600px)').matches){
      const affected=new Set();
      for(const id of grid.s.focus){
        const e=byId(id);
        if(e)affected.add(e.day);
        if(grid.s.moved[id])affected.add(grid.s.moved[id].day);
      }
      grid.s.days=affected.size>1?days.filter(d=>affected.has(d)):days;
    }
    grid.draw();
    const bubble=h('p','sent-request');
    bubble.textContent=asked;
    const answer=h('p','past-answer');
    answer.textContent=message;
    const exchange=h('div','exchange');
    exchange.append(bubble,answer);
    history.append(exchange);
    history.scrollTop=history.scrollHeight;
    again.hidden=false;
    prepare();
    if(!form.hidden)send.focus({preventScroll:true});
    else {
      form.hidden=true;
      again.focus({preventScroll:true});
    }
  }
  form.addEventListener('submit',event=>{event.preventDefault();submit();});
  field.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();form.requestSubmit();}
  });

}
document.querySelectorAll('figure[data-dwf]').forEach(buildScene);
const links=[...document.querySelectorAll('nav a')];function markSection(){let active=links[0];for(const a of links){if(document.querySelector(a.hash).getBoundingClientRect().top<innerHeight*.34)active=a;}for(const a of links){a.classList.toggle('current',a===active);if(a===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}addEventListener('scroll',markSection,{passive:true});markSection();
