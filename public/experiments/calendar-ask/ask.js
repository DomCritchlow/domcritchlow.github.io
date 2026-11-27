/* Figures for "Show me, don't tell me". One small calendar: each sentence you type or say redraws it.
   Events, people and dates are made up. */
(() => {
'use strict';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const T = s => { const [h, m = 0] = s.split(':').map(Number); return h + m / 60; };
const copy = o => JSON.parse(JSON.stringify(o));
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const ICON = {
  mic: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5"/><path d="M3.2 7.6a4.8 4.8 0 0 0 9.6 0M8 12.4v2.2"/></svg>',
  up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.4M4 7.2 8 3.2l4 4"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7"/></svg>',
  layers: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 14 5.4 8 8.6 2 5.4z"/><path d="m2 8.4 6 3.2 6-3.2"/><path d="m2 11.2 6 3.2 6-3.2"/></svg>'
};

/* ---------- the made-up weeks ---------- */
const DAY = {};
[['mon', 'Mon', 30, 'Nov'], ['tue', 'Tue', 1, 'Dec'], ['wed', 'Wed', 2, 'Dec'], ['thu', 'Thu', 3, 'Dec'], ['fri', 'Fri', 4, 'Dec'], ['sat', 'Sat', 5, 'Dec'], ['sun', 'Sun', 6, 'Dec'],
 ['mon2', 'Mon', 7, 'Dec'], ['tue2', 'Tue', 8, 'Dec'], ['wed2', 'Wed', 9, 'Dec'], ['thu2', 'Thu', 10, 'Dec'], ['fri2', 'Fri', 11, 'Dec']]
  .forEach(([k, dow, num, mon], i) => { DAY[k] = {k, dow, num, mon, i}; });
const LONG = {Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'};
const TODAY = 'tue';
const WORK = ['mon', 'tue', 'wed', 'thu', 'fri'], WEEK = WORK.concat(['sat', 'sun']), NEXT = ['mon2', 'tue2', 'wed2', 'thu2', 'fri2'];
const FROM = 8, TO = 18;

const ev = (id, d, s, e, t, k, x = {}) => ({id, d, s: T(s), e: T(e), t, k, org: 'you', who: [], reply: 'yes', ...x});
const EVENTS = [
  ...['mon', 'tue', 'wed', 'thu', 'fri', 'mon2', 'tue2', 'wed2', 'thu2', 'fri2'].map(d => ev('su-' + d, d, '9:30', '9:45', 'Standup', 'team', {org: 'Lee', who: ['The team']})),
  ev('review', 'mon', '10:00', '11:00', 'Project review', 'mtg', {who: ['Alex', 'Morgan', 'Priya', 'Jo'], place: 'Cedar room'}),
  ev('lunch-mon', 'mon', '12:00', '12:45', 'Lunch', 'life'),
  ev('writing', 'mon', '14:00', '15:30', 'Writing time', 'own'),
  ev('sync', 'mon', '16:00', '16:30', 'Studio sync', 'mtg', {org: 'Jordan'}),
  ev('offsite', 'tue', '10:00', '11:00', 'Offsite planning', 'mtg', {org: 'Lee', reply: 'no'}),
  ev('lunch-tue', 'tue', '12:00', '13:00', 'Lunch', 'life'),
  ev('critique', 'tue', '13:00', '14:00', 'Design critique', 'mtg', {org: 'Ola'}),
  ev('hiring', 'tue', '15:30', '16:30', 'Hiring loop', 'mtg', {org: 'Noor'}),
  ev('vendor', 'wed', '10:00', '11:00', 'Vendor demo: Acme', 'ext', {org: 'Priya'}),
  ev('lunch-wed', 'wed', '12:00', '13:00', 'Lunch', 'life'),
  ev('research', 'wed', '13:00', '14:00', 'Research block', 'own'),
  ev('mktg', 'wed', '14:00', '14:30', 'Marketing sync', 'mtg', {org: 'Lee', reply: 'no'}),
  ev('checkin', 'wed', '15:00', '16:00', 'Studio check-in', 'mtg', {org: 'Jordan'}),
  ev('northwind', 'thu', '10:00', '11:00', 'Customer call: Northwind', 'ext', {who: ['Rae', 'Tom', 'Sam'], place: 'Video call'}),
  ev('interview', 'thu', '11:15', '12:00', 'Interview: designer', 'mtg', {org: 'Noor'}),
  ev('sam', 'thu', '11:30', '12:00', '1:1 with Sam', 'mtg', {who: ['Sam Rivera'], place: 'Video call'}),
  ev('lunch-thu', 'thu', '12:00', '13:00', 'Lunch', 'life'),
  ev('debrief', 'thu', '13:30', '14:15', 'Northwind debrief', 'mtg', {who: ['Sam', 'Priya']}),
  ev('roadmap', 'thu', '15:30', '16:00', 'Roadmap office hours', 'mtg', {org: 'Dana', reply: 'none'}),
  ev('dryrun', 'thu', '16:00', '17:00', 'Launch dry run', 'mtg', {org: 'Dana', reply: 'none'}),
  ev('reflection', 'fri', '11:00', '12:00', 'Weekly reflection', 'own'),
  ev('allhands', 'fri', '13:00', '14:00', 'All hands', 'team', {org: 'Lee'}),
  ev('board', 'fri', '14:30', '15:30', 'Board prep', 'mtg', {who: ['Morgan'], place: 'Cedar room'}),
  ev('climb', 'sat', '10:00', '12:00', 'Climbing', 'life'),
  ev('run', 'sun', '8:00', '9:30', 'Long run', 'life'),
  ev('review2', 'mon2', '10:00', '11:00', 'Project review', 'mtg'),
  ev('critique2', 'tue2', '13:00', '14:00', 'Design critique', 'mtg', {org: 'Ola'}),
  ev('offsite2', 'wed2', '13:00', '16:30', 'Planning offsite', 'mtg', {org: 'Lee'}),
  ev('planning', 'thu2', '10:00', '12:00', 'Quarterly planning', 'mtg', {org: 'Lee', reply: 'none'}),
  ev('lunch-thu2', 'thu2', '12:00', '13:00', 'Lunch', 'life'),
  ev('customer2', 'thu2', '14:00', '15:00', 'Customer call: Northwind', 'ext'),
  ev('allhands2', 'fri2', '13:00', '14:00', 'All hands', 'team', {org: 'Lee'})
];
const SAM = [
  ev('s-su', 'wed', '9:30', '9:45', 'Standup', 'team', {org: 'Lee'}),
  ev('s-hiring', 'wed', '9:45', '11:00', 'Hiring loop', 'mtg', {org: 'Noor'}),
  ev('s-lunch', 'wed', '12:30', '13:30', 'Lunch', 'life'),
  ev('s-prep', 'wed', '14:00', '15:00', 'Northwind prep', 'mtg')
];
const byId = id => EVENTS.find(e => e.id === id) || SAM.find(e => e.id === id);
const isMeeting = k => k === 'mtg' || k === 'ext' || k === 'team';

/* ---------- formatting ---------- */
const hm = t => { const h = Math.floor(t + 1e-6), m = Math.round((t - h) * 60); return [h, m]; };
function fmtT(t, h24) { const [h, m] = hm(t); return h24 ? pad(h) + ':' + pad(m) : (h % 12 || 12) + (m ? ':' + pad(m) : '') + ' ' + (h < 12 ? 'AM' : 'PM'); }
function fmtRange(s, e, h24) {
  if (h24) return fmtT(s, true) + ' – ' + fmtT(e, true);
  const same = (s < 12) === (e < 12), a = fmtT(s, false);
  return (same ? a.replace(/ (AM|PM)$/, '') : a) + ' – ' + fmtT(e, false);
}
function fmtLabel(h, h24) { return h24 ? pad(h % 24) + ':00' : ((h % 12) || 12) + ' ' + (h % 24 < 12 ? 'AM' : 'PM'); }
function fmtDur(x) { const m = Math.round(x * 60), h = Math.floor(m / 60), r = m % 60; return h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm'; }

/* ---------- state ---------- */
const base = (hourH = 36) => ({
  view: {mode: 'workweek'}, back: null,
  set: {weekends: false, h24: false, workStart: 9, workEnd: 17, hourH, tz2: '', showDeclined: false},
  layers: [], marks: {}, open: null, details: {},
  drafts: [], moved: {}, added: [], declined: [], canceled: [], rsvp: {},
  sel: [], label: null, answer: null, tray: null, flash: []
});
function commit(st) {
  for (const x of st.drafts) {
    if (x.k === 'move') st.moved[x.id] = x.to;
    else if (x.k === 'new') { const y = {...x}; delete y.note; delete y.group; st.added.push(y); }
    else if (x.k === 'decline') st.declined.push(x.id);
    else if (x.k === 'cancel') st.canceled.push(x.id);
    else if (x.k === 'rsvp') st.rsvp[x.id] = x.response;
  }
  st.drafts = []; st.marks = {}; st.open = null; st.details = {};
}
const UNDO = {label: 'Undo', undo: true};
const bar = (reply, sub, buttons = []) => ({reply, sub, buttons});
const commitAll = reply => st => { commit(st); st.answer = bar(reply, null, [UNDO]); };

/* ---------- what each sentence does ---------- */
const S = {};
const setting = (say, fn, flash, reply, voice) => ({say, voice, think: 'Changing the setting', fast: true, a: st => { fn(st); st.flash = flash; st.answer = bar(reply, null, [UNDO]); }});
S.weekend = setting('Show the weekend', st => { st.set.weekends = true; st.view = {mode: 'week'}; }, ['set-weekends', 'v-week'], 'Showing the weekend.');
S.h24 = setting('Use 24-hour time', st => { st.set.h24 = true; }, ['set-h24'], 'Times now use 24 hours.', true);
S.start8 = setting('My day starts at 8', st => { st.set.workStart = 8; }, ['set-hours'], 'Working hours are now 8 AM to 5 PM.');
S.london = setting('Add London time', st => { st.set.tz2 = 'London'; }, ['set-tz2'], 'London time is next to yours.', true);
S.roomy = setting('Make the rows roomier', st => { st.set.hourH = 46; }, ['set-rows'], 'Rows are roomy now.');
S.declined = setting('Show what I declined', st => { st.set.showDeclined = true; }, ['set-declined'], 'Showing the two meetings you declined.', true);

S.skip = {say: 'What can I skip this week?', think: 'Reading your week', a: st => {
  st.marks = {vendor: 'Recorded. Priya shares it after', roadmap: 'Drop-in. Nothing of yours on it', allhands: 'Optional. Notes go out Monday'};
  st.answer = bar('Three you could miss without losing anything.', null, [
    {label: 'Decline all 3', primary: true, act: st => { st.drafts = ['vendor', 'roadmap', 'allhands'].map(id => ({k: 'decline', id})); commit(st); st.answer = bar('Declined all three. Each organizer sees your answer.', null, [UNDO]); }}]);
}};
S.prep = {say: 'Prep me for Thursday', voice: true, think: 'Reading Thursday', a: st => {
  st.marks = {northwind: 'Read the renewal thread from Rae', sam: 'Two open items from last week', dryrun: 'No agenda yet. You haven’t replied'};
  st.answer = bar('Three Thursday meetings need something from you first.');
}};
S.notes = {say: 'What did we decide in Monday’s review?', think: 'Reading the meeting notes', a: st => {
  st.marks = {review: 'Ship the prototype Dec 8'}; st.open = 'review';
  st.details = {review: ['Ship the prototype on Dec 8', 'Alex owns the test plan', 'Yours: a cost estimate for Morgan']};
  st.drafts = [{k: 'new', id: 'est', d: 'wed', s: 11, e: 11.5, t: 'Cost estimate for Morgan', kind: 'own', note: 'Your item from the review'}];
  st.answer = bar('You agreed to ship Dec 8. Your item is the cost estimate for Morgan.', 'Add “Cost estimate for Morgan”, Wednesday, Dec 2, 11 – 11:30 AM.', [{label: 'Add', primary: true, act: commitAll('Added. It’s on Wednesday at 11.')}]);
}};
S.openSam = {say: 'Open my 1:1 with Sam', think: 'Finding it', a: st => {
  st.open = 'sam'; st.layers = ['clashes'];
  st.answer = bar('It’s Thursday at 11:30, inside the designer interview.');
}};
S.busy = {say: 'How busy is my week?', voice: true, think: 'Counting your week', a: st => {
  st.layers = ['load', 'open']; st.flash = ['layers'];
  st.answer = bar('Thursday is the full one. Tuesday morning is your longest open stretch.', 'Showing busy time and open time.');
}};
S.freeThu = {say: 'When am I free on Thursday?', think: 'Reading Thursday', a: st => {
  st.view = {mode: 'day', date: 'thu'}; st.back = 'the week of Nov 30'; st.layers = ['load', 'open']; st.flash = ['v-day', 'layers'];
  st.answer = bar('Your longest stretch is 2:15 to 3:30.', 'Showing busy time and open time.');
}};
S.clashes = {say: 'Where am I double-booked?', think: 'Checking for overlaps', a: st => {
  st.layers = ['clashes']; st.flash = ['layers'];
  st.drafts = [{k: 'move', id: 'sam', to: {d: 'thu', s: 14.5, e: 15}, note: 'Sam is free'}];
  st.answer = bar('Once, on Thursday. Sam is free at 2:30, so I drafted a move.', 'Move “1:1 with Sam” to Thursday, Dec 3, 2:30 – 3 PM, notifies Sam.', [{label: 'Move', primary: true, act: commitAll('Moved. Sam gets the update.')}]);
}};
S.replies = {say: 'What haven’t I answered?', voice: true, think: 'Reading your invitations', a: st => {
  st.layers = ['replies']; st.flash = ['layers'];
  st.answer = bar('Two invitations on Thursday are waiting on you.', 'Showing what needs your reply.', [{label: 'Yes to both', act: st => { st.drafts = ['roadmap', 'dryrun'].map(id => ({k: 'rsvp', id, response: 'yes'})); commit(st); st.answer = bar('Replied Yes to both. Dana sees your answers.', null, [UNDO]); }}]);
}};
S.fri = {say: 'Put Friday next to next Thursday', think: 'Lining up the two days', a: st => {
  st.view = {mode: 'days', days: ['fri', 'thu2']}; st.back = 'the week of Nov 30'; st.layers = ['load', 'open', 'replies'];
  st.answer = bar('Next Thursday is busier, and planning still needs your reply.', 'Showing busy time, open time and what needs your reply.');
}};
const samScene = (say, voice) => ({say, voice, think: 'Reading Sam’s calendar', a: st => {
  st.view = {mode: 'people', date: 'wed'}; st.back = 'the week of Nov 30'; st.layers = ['load', 'open']; st.flash = ['v-day'];
  st.answer = bar('You’re both free 11 to noon and after 4.', 'Showing busy time and open time.');
}});
S.sam = samScene('Compare my Wednesday with Sam’s', true);
S.next = {say: 'Show me next week', think: 'Going to next week', fast: true, a: st => {
  st.view = {mode: 'workweek', next: true}; st.back = 'the week of Nov 30';
  st.answer = bar('Wednesday’s offsite takes most of the afternoon.');
}};
S.move = {say: 'Move board prep to Thursday at 2:30', think: 'Checking Thursday', a: st => {
  st.drafts = [{k: 'move', id: 'board', to: {d: 'thu', s: 14.5, e: 15.5}, note: 'Morgan is free'}];
  st.answer = bar('Drafted the move.', 'Move “Board prep” to Thursday, Dec 3, 2:30 – 3:30 PM, notifies Morgan.', [
    {label: 'Why?', keep: true, act: st => { st.answer.reply = 'Thursday has a gap from 2:15, and Friday afternoon opens up.'; }},
    {label: 'Move', primary: true, act: commitAll('Moved. Morgan gets the update.')}]);
}};
function samOptions(st, outside) {
  const opts = [['o1', 'wed', 11, 'Wed 11 AM', 'Wednesday at 11'], ['o2', 'wed', 16, 'Wed 4 PM', 'Wednesday at 4'], ['o3', 'thu', 14.5, 'Thu 2:30 PM', 'Thursday at 2:30']];
  const who = outside ? 'Sam O.' : 'Sam';
  st.drafts = opts.map(([id, d, s]) => ({k: 'new', id, d, s, e: s + 0.5, t: 'Catch-up with ' + who, kind: outside ? 'ext' : 'mtg', note: who + ' is free', group: 'g'}));
  st.answer = bar('Three times work for both of you.', outside ? 'Each invites sam@northwind.example, outside your company. Pick one.' : 'Pick one. The others go away.',
    opts.map(([id, , , label, long]) => ({label, pick: id, act: st => { st.drafts = st.drafts.filter(x => x.id === id); commit(st); st.answer = bar('Added for ' + long + '. ' + who + ' gets the invite.', null, [UNDO]); }})));
}
S.findSam = {say: 'Find 30 minutes with Sam this week', voice: true, think: 'Checking when Sam is free', a: st => samOptions(st, false)};
S.which = {say: 'Find time with Sam', voice: true, think: 'Looking up Sam', a: st => {
  st.answer = {reply: 'Which Sam?', ask: true, buttons: [
    {label: 'Sam Rivera · Design', think: 'Checking when Sam is free', act: st => samOptions(st, false)},
    {label: 'Sam Okafor · Northwind', think: 'Checking when Sam is free', act: st => samOptions(st, true)}]};
}};
S.decline = {say: 'Decline the vendor demo', think: 'Finding it', a: st => {
  st.drafts = [{k: 'decline', id: 'vendor'}];
  st.answer = bar('Drafted the decline.', 'Decline “Vendor demo: Acme”. Priya sees that you won’t attend.', [{label: 'Decline', primary: true, act: commitAll('Declined. Priya sees your answer.')}]);
}};
S.cancel = {say: 'Cancel Friday’s board prep', voice: true, think: 'Finding it', a: st => {
  st.drafts = [{k: 'cancel', id: 'board'}];
  st.answer = bar('Drafted the cancellation.', 'Cancel “Board prep” for everyone. Morgan gets an email.', [{label: 'Cancel for everyone', primary: true, danger: true, act: commitAll('Canceled. Morgan gets the email.')}]);
}};
S.write = {say: 'Block two hours to write this morning', think: 'Checking this morning', a: st => {
  st.drafts = [{k: 'new', id: 'focus', d: 'tue', s: 9.75, e: 11.75, t: 'Writing', kind: 'own', note: 'Focus time'}];
  st.answer = bar('Drafted focus time before lunch.', 'Add “Writing” as focus time, today, 9:45 – 11:45 AM.', [{label: 'Add', primary: true, act: commitAll('Added as focus time.')}]);
}};
S.late = {say: 'Tell Thursday’s customer call I’m running 10 minutes late', voice: true, think: 'Writing the email', a: st => {
  st.marks = {northwind: 'Email drafted'};
  st.tray = {to: ['Rae', 'Tom', 'Sam'], subject: 'Running 10 minutes late', body: 'Hi all, I’m running about 10 minutes behind and will join at 10:10. Sorry for the wait.'};
  st.answer = bar('Drafted it. Nothing sends until you click Send.');
}};
S.these = {say: 'Decline these', pre: ['roadmap', 'allhands'], think: 'Reading the two meetings', a: st => {
  st.sel = []; st.label = null;
  st.drafts = [{k: 'decline', id: 'roadmap'}, {k: 'decline', id: 'allhands'}];
  st.answer = bar('Drafted both declines.', 'Decline 2 meetings. Dana and Lee see that you won’t attend.', [{label: 'Decline 2', primary: true, act: commitAll('Declined both. Dana and Lee see your answers.')}]);
}};
S.chatFri = {chat: true, say: 'Anything I can skip on Friday?', think: 'Reading Friday', a: st => {
  st.marks = {allhands: 'Optional. Notes go out Monday'};
  st.answer = bar('All hands is the one to skip.', null, [{label: 'Decline', primary: true, act: st => { st.drafts = [{k: 'decline', id: 'allhands'}]; commit(st); st.answer = bar('Declined. Lee sees your answer.', null, [UNDO]); }}]);
}, reply: 'All hands is optional and the notes go out Monday. It’s marked on your calendar.'};
S.chatDeck = {chat: true, say: 'Find an hour Thursday to prep the board deck', think: 'Checking Thursday', a: st => {
  st.drafts = [{k: 'new', id: 'deck', d: 'thu', s: 14.25, e: 15.25, t: 'Board deck prep', kind: 'own', note: 'Your longest gap that day'}];
  st.answer = bar('Drafted an hour on Thursday.', 'Add “Board deck prep”, Thursday, Dec 3, 2:15 – 3:15 PM.', [{label: 'Add', primary: true, act: commitAll('Added.')}]);
}, reply: 'Drafted Thursday 2:15 to 3:15. Accept it on the calendar.'};
S.chatSam = {...samScene('How does my Wednesday compare with Sam’s?', false), chat: true, reply: 'You’re both free 11 to noon and after 4. Your days are side by side on the calendar.'};

/* ---------- the figures ---------- */
const FIGS = {
  hero: {groups: [['Look', ['next', 'fri', 'sam', 'openSam']], ['Count', ['busy', 'clashes', 'replies']], ['Point', ['skip', 'prep', 'notes']], ['Change', ['move', 'findSam', 'decline', 'write', 'late']], ['Settings', ['weekend', 'h24', 'london', 'declined']]],
    reel: ['skip', 'busy', 'sam', 'move', 'weekend', 'findSam'], hourH: 42},
  settings: {chips: ['weekend', 'h24', 'start8', 'london', 'roomy', 'declined'], panel: true, auto: 'weekend'},
  point: {chips: ['skip', 'prep', 'notes', 'openSam'], auto: 'skip'},
  layers: {chips: ['busy', 'freeThu', 'clashes', 'replies'], auto: 'busy'},
  side: {chips: ['fri', 'sam', 'next'], auto: 'fri'},
  change: {chips: ['move', 'findSam', 'decline', 'cancel', 'write', 'late'], auto: 'move'},
  ask: {chips: ['which', 'these'], auto: 'which'},
  chat: {chips: ['chatFri', 'chatDeck', 'chatSam'], chat: true, auto: 'chatFri'}
};
const PANEL = [
  ['set-weekends', 'Show weekends', s => s.weekends ? 'On' : 'Off', true],
  ['set-h24', 'Time format', s => s.h24 ? '13:00' : '1:00 PM'],
  ['set-hours', 'Working hours', s => fmtLabel(s.workStart, s.h24) + ' to ' + fmtLabel(s.workEnd, s.h24)],
  ['set-tz2', 'Second time zone', s => s.tz2 || 'None'],
  ['set-rows', 'Row height', s => s.hourH > 40 ? 'Roomy' : 'Regular'],
  ['set-declined', 'Show events I declined', s => s.showDeclined ? 'On' : 'Off', true]
];

function Figure(fig) {
  const cfg = FIGS[fig.dataset.cc]; if (!cfg) return;
  const caption = fig.querySelector('figcaption');
  const wrap = el('div', 'cc-wrap' + (cfg.groups ? ' cc-hero' : '') + (cfg.chat ? ' cc-withchat' : ''));
  fig.insertBefore(wrap, caption);

  /* sentences to try */
  const chipOf = {};
  let started = false; // set once the figure has played, or the reader has picked a sentence
  const chip = id => { const sc = S[id], b = el('button', 'cc-chip' + (sc.voice ? ' voice' : ''), (sc.voice ? ICON.mic : '') + '<span>' + esc(sc.say) + '</span>'); b.type = 'button'; b.title = sc.voice ? 'Spoken' : 'Typed'; b.addEventListener('click', () => { started = true; stopReel(); play(id); }); chipOf[id] = b; return b; };
  let picker;
  if (cfg.groups) {
    picker = el('div', 'cc-groups');
    for (const [name, ids] of cfg.groups) { const g = el('div', 'cc-group', '<span class="cc-gl">' + name + '</span>'); const row = el('div', 'cc-grow'); ids.forEach(id => row.appendChild(chip(id))); g.appendChild(row); picker.appendChild(g); }
    const tour = el('button', 'cc-tour', '<span>Pause tour</span>'); tour.type = 'button'; picker.appendChild(tour);
    tour.addEventListener('click', () => { if (reelOn) stopReel(); else startReel(); });
    var tourBtn = tour;
  } else {
    picker = el('div', 'cc-chips'); cfg.chips.forEach(id => picker.appendChild(chip(id)));
  }
  wrap.appendChild(picker);

  const stage = el('div', 'cc-stage'); wrap.appendChild(stage);
  let chat;
  if (cfg.chat) {
    chat = el('div', 'cc-chat', '<div class="cc-chat-h">A chat</div><div class="cc-chat-log"></div><div class="cc-chat-in"><span class="cc-typed"></span><span class="cc-caret"></span><span class="cc-ph">Reply</span><span class="cc-send">' + ICON.up + '</span></div>');
    stage.appendChild(chat);
  }
  const app = el('div', 'cc-app');
  app.innerHTML = '<div class="cc-top"><span class="cc-back" hidden>‹ <span></span></span><b class="cc-title"></b><span class="cc-fill"></span><span class="cc-tool" data-ctl="layers">' + ICON.layers + '<span>Layers</span></span><span class="cc-seg"><i data-ctl="v-day">Day</i><i data-ctl="v-workweek"><span class="cc-long">Work week</span><span class="cc-short">Work</span></i><i data-ctl="v-week">Week</i></span></div>'
    + '<div class="cc-sheet" aria-hidden="true"><div class="cc-head"></div><div class="cc-body"></div><div class="cc-tray"></div></div>'
    + '<div class="cc-answer" aria-live="polite"></div>'
    + '<div class="cc-ask" aria-hidden="true"><span class="cc-label" hidden></span><span class="cc-line"><span class="cc-typed"></span><span class="cc-caret"></span><span class="cc-ph"></span></span><span class="cc-send">' + ICON.up + '</span><span class="cc-wave"><i></i><i></i><i></i><i></i><i></i></span><span class="cc-mic">' + ICON.mic + '</span></div>';
  stage.appendChild(app);
  let panel;
  if (cfg.panel) {
    panel = el('div', 'cc-panel', '<div class="cc-panel-h">Settings</div>');
    for (const [id, label, , toggle] of PANEL) panel.appendChild(el('div', 'cc-prow' + (toggle ? ' toggle' : ''), '<span>' + label + '</span><b data-v="' + id + '"></b>')).dataset.ctl = id;
    app.appendChild(panel);
  }

  const q = s => app.querySelector(s);
  const sheet = q('.cc-sheet'), head = q('.cc-head'), body = q('.cc-body'), tray = q('.cc-tray'), answerEl = q('.cc-answer'), ask = q('.cc-ask');
  const nodes = new Map(); let fresh = [];
  const ruler = el('div', 'cc-ev open cc-ruler'); body.appendChild(ruler);
  let st = base(cfg.hourH), undoSnap = null, token = 0, chatLog = [];

  /* ---------- layout ---------- */
  function columns() {
    const v = st.view;
    if (v.mode === 'people') return [{key: 'p:you', type: 'person', d: v.date, who: 'you'}, {key: 'p:sam', type: 'person', d: v.date, who: 'sam'}];
    const days = v.mode === 'days' ? v.days : v.mode === 'day' ? [v.date] : v.next ? NEXT : v.mode === 'week' ? WEEK : WORK;
    const out = [];
    days.forEach((d, i) => {
      if (i) { const gap = DAY[d].i - DAY[days[i - 1]].i - 1; if (gap > 0) out.push({key: 'f:' + d, type: 'fold', n: gap, a: days[i - 1], b: d}); }
      out.push({key: 'd:' + d, type: 'day', d, who: 'you'});
    });
    return out;
  }
  function build() {
    const items = [], s = st.set;
    const drafted = (id, k) => st.drafts.find(x => x.id === id && (!k || x.k === k));
    for (const [who, list] of [['you', EVENTS], ['sam', SAM]]) for (const e0 of list) {
      if (st.canceled.includes(e0.id)) continue;
      const reply = st.rsvp[e0.id] || (st.declined.includes(e0.id) ? 'no' : e0.reply);
      const dec = drafted(e0.id, 'decline'), can = drafted(e0.id, 'cancel'), mv = drafted(e0.id, 'move');
      if (reply === 'no' && !s.showDeclined && !dec) continue;
      const at = {...e0, ...(st.moved[e0.id] || {}), ...(mv ? mv.to : {})};
      const it = {key: who + ':' + e0.id, who, d: at.d, s: at.s, e: at.e, ev: e0, reply, cls: ['k-' + e0.k], tags: [], note: null};
      if (reply === 'no') it.cls.push('dec');
      if (reply === 'none') it.cls.push('nr');
      if (st.marks[e0.id]) { it.mark = true; it.note = st.marks[e0.id]; }
      if (st.open === e0.id) it.isOpen = true;
      if (st.sel.includes(e0.id)) it.cls.push('sel');
      if (dec) { it.cls.push('draft', 'dec'); it.tags.push(['Decline', 'clay']); it.draft = true; }
      if (can) { it.cls.push('draft', 'dec'); it.tags.push(['Cancel for everyone', 'danger']); it.draft = true; }
      if (mv) {
        it.cls.push('draft'); it.draft = true; it.proposal = true; it.note = mv.note;
        const was = {...e0, ...(st.moved[e0.id] || {})};
        items.push({key: 'ghost:' + e0.id, who, d: was.d, s: was.s, e: was.e, ev: e0, reply, cls: ['k-' + e0.k, 'ghost'], tags: [], ghost: true});
      }
      items.push(it);
    }
    for (const x of st.added) items.push({key: 'new:' + x.id, who: 'you', d: x.d, s: x.s, e: x.e, ev: {id: x.id, t: x.t, k: x.kind || 'mtg'}, reply: 'yes', cls: ['k-' + (x.kind || 'mtg'), 'fresh'], tags: []});
    for (const x of st.drafts) if (x.k === 'new') items.push({key: 'new:' + x.id, who: 'you', d: x.d, s: x.s, e: x.e, ev: {id: x.id, t: x.t, k: x.kind || 'mtg'}, reply: 'yes', cls: ['k-' + (x.kind || 'mtg'), 'draft'], tags: [], note: x.note, draft: true, proposal: true, pick: x.group ? x.id : null});
    const focus = items.some(it => it.mark || it.isOpen);
    for (const it of items) if (focus && !it.mark && !it.isOpen && !it.draft) it.cls.push('fade');
    return items;
  }
  const inCol = (it, c) => c.type !== 'fold' && it.who === c.who && it.d === c.d;
  function busyOf(list) {
    // the union of time taken by real bookings in a column, for the layers
    const iv = list.filter(it => !it.proposal && it.reply !== 'no').map(it => [it.s, it.e]).sort((a, b) => a[0] - b[0]);
    const out = []; for (const [a, b] of iv) { const last = out[out.length - 1]; if (last && a <= last[1]) last[1] = Math.max(last[1], b); else out.push([a, b]); }
    return out;
  }
  function gapsOf(list) {
    const w0 = st.set.workStart, w1 = st.set.workEnd, out = []; let t = w0;
    for (const [a, b] of busyOf(list)) { if (b <= w0 || a >= w1) continue; if (a - t >= 0.25 - 1e-6) out.push([t, Math.min(a, w1)]); t = Math.max(t, b); }
    if (w1 - t >= 0.25 - 1e-6) out.push([t, w1]);
    return out.filter(([a, b]) => b - a >= 0.25 - 1e-6);
  }
  function lanes(list) {
    const sorted = list.slice().sort((a, b) => a.s - b.s || b.e - a.e);
    let cluster = [], end = -1; const lane = new Map();
    const flush = () => { const ends = []; for (const it of cluster) { let i = ends.findIndex(x => x <= it.s + 1e-6); if (i < 0) { i = ends.length; ends.push(0); } ends[i] = it.e; lane.set(it, i); } for (const it of cluster) it.lanes = ends.length; cluster = []; };
    for (const it of sorted) { if (it.isOpen) { it.lanes = 1; lane.set(it, 0); continue; } if (it.s >= end - 1e-6 && cluster.length) flush(); cluster.push(it); end = Math.max(end, it.e); }
    if (cluster.length) flush();
    for (const it of sorted) it.lane = lane.get(it) || 0;
  }

  function place(key, cls, parent, make) {
    let n = nodes.get(key);
    const born = !n;
    if (born) { n = make ? make() : el('div'); n.dataset.k = key; parent.appendChild(n); nodes.set(key, n); fresh.push(n); }
    n.className = cls + (born ? ' enter' : '');
    n.dataset.live = '1';
    return n;
  }
  const pos = (n, x, y, w, h) => { n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.width = Math.max(0, w) + 'px'; n.style.height = Math.max(0, h) + 'px'; };
  const html = (n, s) => { if (n.dataset.h !== s) { n.innerHTML = s; n.dataset.h = s; } };

  function render() {
    const W = sheet.clientWidth; if (!W) return;
    const s = st.set, H = s.hourH, narrow = W < 520, cols = columns(), items = build();
    for (const n of nodes.values()) n.dataset.live = '';
    const g1 = narrow ? 38 : 50, g2 = s.tz2 ? (narrow ? 34 : 44) : 0, gx = g1 + g2, FOLD = narrow ? 24 : 34;
    const real = cols.filter(c => c.type !== 'fold');
    const focusCols = new Set(real.filter(c => items.some(it => inCol(it, c) && (it.mark || it.isOpen))).map(c => c.key));
    const openCol = real.find(c => items.some(it => inCol(it, c) && it.isOpen));
    const weight = c => c.type === 'fold' ? 0 : openCol && openCol.key === c.key && real.length > 2 ? (narrow ? 2.8 : 2.6) : focusCols.size && focusCols.size < real.length && focusCols.has(c.key) ? (narrow ? 1.9 : 1.45) : 1;
    const avail = W - gx - cols.filter(c => c.type === 'fold').length * FOLD, sum = cols.reduce((n, c) => n + weight(c), 0) || 1;
    const geo = new Map(); let x = gx;
    for (const c of cols) { const w = c.type === 'fold' ? FOLD : avail * weight(c) / sum; geo.set(c.key, {x, w}); x += w; }
    const load = st.layers.includes('load'), headH = 48 + (load ? (narrow ? 46 : 40) : 0), bodyH = (TO - FROM) * H;
    head.style.height = headH + 'px'; body.style.height = bodyH + 'px';

    /* toolbar */
    const v = st.view;
    q('.cc-title').textContent = v.mode === 'people' ? LONG[DAY[v.date].dow].slice(0, 3) + ', Dec ' + DAY[v.date].num + ', you and Sam'
      : v.mode === 'day' ? LONG[DAY[v.date].dow] + ', Dec ' + DAY[v.date].num
      : v.mode === 'days' ? v.days.map(d => DAY[d].mon + ' ' + DAY[d].num).join(' and ')
      : v.next ? 'Dec 7 – 11' : v.mode === 'week' ? 'Nov 30 – Dec 6' : 'Nov 30 – Dec 4';
    const back = q('.cc-back'); back.hidden = !st.back; back.lastChild.textContent = narrow ? 'Back' : 'Back to ' + (st.back || '');
    const segOn = v.mode === 'people' || v.mode === 'day' ? 'v-day' : v.mode === 'week' ? 'v-week' : v.mode === 'workweek' ? 'v-workweek' : '';
    app.querySelectorAll('.cc-seg i').forEach(i => i.classList.toggle('on', i.dataset.ctl === segOn));
    q('.cc-tool').classList.toggle('on', st.layers.length > 0);

    /* gutters and head */
    html(place('hz', 'cc-tz', head), '<span>EST</span>' + (s.tz2 ? '<span>GMT</span>' : ''));
    pos(nodes.get('hz'), 0, 0, gx, headH);
    for (const c of cols) {
      const {x, w} = geo.get(c.key);
      const hn = place('h:' + c.key, 'cc-hcell' + (c.type === 'fold' ? ' fold' : '') + (c.d === TODAY && c.type === 'day' ? ' today' : ''), head);
      pos(hn, x, 0, w, headH);
      if (c.type === 'fold') { html(hn, '<span class="cc-fn">' + c.n + '<small>days</small></span>'); continue; }
      const list = items.filter(it => inCol(it, c));
      let top = c.type === 'person' ? '<b class="cc-pn">' + (c.who === 'sam' ? '<i class="cc-sw"></i>Sam' : 'You') + '</b>' : '<span class="cc-dw">' + DAY[c.d].dow + '</span><b class="cc-dn">' + DAY[c.d].num + '</b>';
      if (load) {
        const mtg = list.filter(it => !it.ghost && !it.proposal && it.reply !== 'no' && isMeeting(it.ev.k));
        const own = list.filter(it => !it.proposal && it.reply !== 'no' && !isMeeting(it.ev.k));
        const n = mtg.length, hrs = busyOf(mtg).reduce((a, [p, q2]) => a + q2 - p, 0);
        const seg = (arr, cls) => busyOf(arr).map(([a, b]) => '<i class="' + cls + '" style="left:' + ((a - FROM) / (TO - FROM) * 100) + '%;width:' + ((b - a) / (TO - FROM) * 100) + '%"></i>').join('');
        const g = gapsOf(list), longest = g.reduce((m, [a, b]) => Math.max(m, b - a), 0), toAnswer = list.filter(it => it.reply === 'none').length;
        const lines = [n + (narrow ? ' mtg' : (n === 1 ? ' meeting' : ' meetings')) + ', ' + fmtDur(hrs)];
        if (st.layers.includes('open') && longest) lines.push(fmtDur(longest) + (narrow ? ' open' : ' longest open'));
        if (st.layers.includes('replies') && toAnswer && !narrow) lines[lines.length - 1] += ', ' + toAnswer + ' to answer';
        top += '<span class="cc-load"><span class="cc-lbar">' + seg(own, 'own') + seg(mtg, 'mtg') + '</span><small>' + lines.join('<br>') + '</small></span>';
      }
      html(hn, top);
    }

    /* the grid behind the meetings */
    for (let i = 0; i <= TO - FROM; i++) {
      const r = place('r:' + i, 'cc-rule', body); pos(r, gx, i * H, W - gx, 1);
      if (i === TO - FROM) continue;
      const l = place('l:' + i, 'cc-hl' + (i === 0 ? ' first' : ''), body); pos(l, 0, i * H, g1 - 6, 14); html(l, fmtLabel(FROM + i, s.h24));
      if (s.tz2) { const l2 = place('m:' + i, 'cc-hl two' + (i === 0 ? ' first' : ''), body); pos(l2, g1, i * H, g2 - 6, 14); html(l2, fmtLabel(FROM + i + 5, s.h24)); }
    }
    const shTop = place('sh:top', 'cc-off', body), shBot = place('sh:bot', 'cc-off', body);
    pos(shTop, gx, 0, W - gx, (s.workStart - FROM) * H); pos(shBot, gx, (s.workEnd - FROM) * H, W - gx, (TO - s.workEnd) * H);
    for (const c of cols) {
      const {x, w} = geo.get(c.key);
      const cn = place('c:' + c.key, 'cc-col' + (c.type === 'fold' ? ' fold' : '') + (c.d === TODAY && c.type === 'day' ? ' today' : ''), body);
      pos(cn, x, 0, w, bodyH);
      if (c.type === 'fold') html(cn, '<span>' + DAY[c.a].mon + ' ' + (DAY[c.a].num + 1) + ' – ' + (DAY[c.b].num - 1) + '</span>');
    }

    /* layers: open time and overlaps */
    const showOpen = st.layers.includes('open'), showClash = st.layers.includes('clashes'), showReplies = st.layers.includes('replies');
    for (const c of real) {
      const {x, w} = geo.get(c.key), list = items.filter(it => inCol(it, c));
      if (showOpen) {
        const g = gapsOf(list), longest = g.reduce((m, [a, b]) => Math.max(m, b - a), 0), firstLong = g.findIndex(([a, b]) => b - a === longest);
        for (const [gi, [a, b]] of g.entries()) {
          const isLong = gi === firstLong && g.length > 1, gn = place('gap:' + c.key + ':' + a, 'cc-gap' + (isLong ? ' long' : ''), body);
          pos(gn, x + 3, (a - FROM) * H + 2, w - 6, (b - a) * H - 4);
          html(gn, (b - a) * H >= 16 ? '<span>' + fmtDur(b - a) + ' open' + (isLong && !narrow && w > 90 ? ', longest' : '') + '</span>' : '');
        }
      }
      if (showClash) {
        const real2 = list.filter(it => !it.proposal && it.reply !== 'no' && isMeeting(it.ev.k));
        for (const a of real2) for (const b of real2) if (a !== b && a.s < b.e - 1e-6 && b.s < a.e - 1e-6) { const tgt = a.ghost ? null : a; if (tgt && !tgt.tags.some(t => t[0] === 'Overlap')) { tgt.cls.push('clash'); tgt.tags.push(['Overlap', 'danger']); } }
      }
      if (showReplies) for (const it of list) if (it.reply === 'none' && !it.ghost) { it.cls.push('ask'); it.tags.push(['No reply', 'danger']); }
    }

    /* meetings */
    for (const c of real) {
      const {x, w} = geo.get(c.key), list = items.filter(it => inCol(it, c)); lanes(list);
      for (const it of list) {
        const n = place('e:' + it.key, 'cc-ev ' + it.cls.join(' ') + (it.mark ? ' mark' : '') + (it.isOpen ? ' open' : ''), body);
        if (it.pick) n.dataset.pick = it.pick; else delete n.dataset.pick;
        const lw = (w - 4) / it.lanes; let top = (it.s - FROM) * H + 1, hgt = Math.max(14, (it.e - it.s) * H - 2), left = x + 2 + it.lane * lw, width = lw - (it.lanes > 1 ? 2 : 0);
        if (!it.isOpen && it.note && (it.mark || it.proposal)) {
          const per = Math.max(1, Math.floor((width - 12) / 5.7)), need = 8 + 15 + 13 + Math.ceil(it.note.length / per) * 13.5;
          // a mark may cover the faded meetings after it; a draft stops short of the next one
          const next = it.mark ? TO : list.filter(o => o !== it && !o.ghost && o.s >= it.e - 1e-6).reduce((m, o) => Math.min(m, o.s), TO);
          const cap = (next - it.s) * H - 3;
          if (hgt < need) { hgt = Math.max(hgt, Math.min(need, cap)); if (top + hgt > bodyH - 2) top = Math.max(1, bodyH - 2 - hgt); }
        }
        if (it.isOpen) {
          // an open meeting grows into a card as tall as what it shows, measured at its final width
          left = x + 3; width = w - 6;
          ruler.style.width = width + 'px'; ruler.innerHTML = card(it);
          hgt = Math.min(bodyH - 4, Math.max(hgt, ruler.offsetHeight + 2));
          if (top + hgt > bodyH - 2) top = Math.max(2, bodyH - 2 - hgt);
        }
        pos(n, left, top, width, hgt);
        n.style.setProperty('--c', COLOR[it.ev.k] || COLOR.mtg);
        n.classList.toggle('tiny', !it.isOpen && hgt < 26); n.classList.toggle('slim', width < 124); n.classList.toggle('thin', width < 54);
        html(n, it.isOpen ? card(it) : content(it, hgt));
      }
    }
    /* anything not drawn this time fades out */
    for (const [k, n] of nodes) if (!n.dataset.live) { nodes.delete(k); n.classList.add('leave'); setTimeout(() => n.remove(), RM ? 0 : 420); }

    /* new nodes start transparent; one layout read lets them fade in without waiting on animation frames */
    if (fresh.length) { void body.offsetWidth; fresh.forEach(n => n.classList.remove('enter')); fresh = []; }
    renderAnswer(); renderAsk(); renderTray(); renderPanel(); renderChat();
    if (st.flash.length) { const ids = st.flash; st.flash = []; for (const id of ids) fig.querySelectorAll('[data-ctl="' + id + '"]').forEach(n => { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); setTimeout(() => n.classList.remove('flash'), 1600); }); }
  }
  const COLOR = {team: '#7986CB', mtg: '#5B9BD5', ext: '#039BE5', own: '#33B679', life: '#E67C73'};
  function content(it, hgt) {
    const e = it.ev, h24 = st.set.h24, time = it.ghost ? '<s>' + fmtT(it.s, h24) + '</s>' : fmtT(it.s, h24);
    const tags = it.tags.map(([t, c]) => '<em class="cc-tag ' + c + '">' + t + '</em>').join('');
    if (hgt < 26) return '<span class="cc-row"><b>' + esc(e.t) + '</b><span class="cc-t' + (it.note ? ' cc-nt' : '') + '">' + (it.note ? esc(it.note) : time) + '</span>' + tags + '</span>';
    if (it.note && hgt < 46) return '<span class="cc-row"><b>' + esc(e.t) + '</b><span class="cc-t">' + time + '</span>' + tags + '</span><span class="cc-n">' + esc(it.note) + '</span>';
    return '<span class="cc-row"><b>' + esc(e.t) + '</b>' + tags + '</span><span class="cc-t">' + time + '</span>' + (it.note ? '<span class="cc-n">' + esc(it.note) + '</span>' : '');
  }
  function card(it) {
    const e = it.ev, h24 = st.set.h24, d = DAY[it.d];
    const who = e.who && e.who.length ? e.who.join(', ') + ', you' : 'Only you';
    const det = (st.details[e.id] || []).map(l => '<li>' + esc(l) + '</li>').join('');
    const r = it.reply;
    return '<b class="cc-ct">' + esc(e.t) + '</b><span class="cc-cw">' + LONG[d.dow] + ', ' + d.mon + ' ' + d.num + ' · ' + fmtRange(it.s, it.e, h24) + '</span>'
      + (e.place ? '<span class="cc-cp">' + esc(e.place) + '</span>' : '') + '<span class="cc-cp">' + esc(who) + '</span>'
      + (it.note && !det ? '<span class="cc-n">' + esc(it.note) + '</span>' : '') + (det ? '<span class="cc-src">From the meeting notes</span><ul>' + det + '</ul>' : '')
      + '<span class="cc-going"><span>Going?</span><u class="' + (r === 'yes' ? 'on' : '') + '">Yes</u><u>Maybe</u><u class="' + (r === 'no' ? 'on' : '') + '">No</u></span>'
      + '<span class="cc-cact"><u>Join</u><u>Ask</u><u>Delete</u></span>';
  }
  function renderAnswer() {
    const a = st.answer;
    const sig = a ? JSON.stringify([a.thinking, a.reply, a.sub, (a.buttons || []).map(b => b.label)]) : '';
    if (answerEl.dataset.sig === sig) return;
    answerEl.dataset.sig = sig;
    if (!a) { answerEl.className = 'cc-answer'; answerEl.innerHTML = ''; return; }
    answerEl.className = 'cc-answer on';
    if (a.thinking) { answerEl.innerHTML = '<div class="cc-card think"><span class="cc-spin" aria-hidden="true"></span><span>' + esc(a.thinking) + '</span></div>'; return; }
    const card2 = el('div', 'cc-card' + (a.ask ? ' asks' : ''));
    card2.innerHTML = '<div class="cc-cardh"><p>' + esc(a.reply) + '</p><button type="button" class="cc-x" aria-label="Clear the answer">' + ICON.x + '</button></div>' + (a.sub ? '<div class="cc-change"><span>' + esc(a.sub) + '</span></div>' : '');
    card2.querySelector('.cc-x').addEventListener('click', clearAnswer);
    if (a.buttons && a.buttons.length) {
      const row = el('div', 'cc-btns' + (a.ask || a.buttons.some(b => b.pick) ? ' choices' : ''));
      a.buttons.forEach((b, i) => { const bt = el('button', 'cc-btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''), esc(b.label)); bt.type = 'button'; bt.addEventListener('click', () => press(i)); row.appendChild(bt); });
      card2.appendChild(row);
    }
    answerEl.innerHTML = ''; answerEl.appendChild(card2);
  }
  function renderAsk() {
    q('.cc-ph').textContent = st.answer && !st.answer.thinking ? 'Follow up' : (sheet.clientWidth < 520 ? 'Ask about your week' : 'Ask about your week or make a change');
    const lab = q('.cc-label'); lab.hidden = !st.label; lab.textContent = st.label || '';
  }
  function renderTray() {
    const t = st.tray;
    tray.classList.toggle('on', !!t);
    if (!t) return;
    if (t.sent) { html(tray, '<div class="cc-tray-done">Sent to ' + t.to.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.</div>'); return; }
    html(tray, '<div class="cc-tray-h">New email</div><div class="cc-tf"><span>To</span>' + t.to.map(x => '<i>' + x + '</i>').join('') + '</div><div class="cc-tf"><span>Subject</span>' + esc(t.subject) + '</div><p>' + esc(t.body) + '</p><div class="cc-tray-b"><u class="plain">Discard</u><u class="send">Send</u></div>');
  }
  function renderPanel() {
    if (!panel) return;
    for (const [id, , val] of PANEL) { const b = panel.querySelector('[data-v="' + id + '"]'); const v = val(st.set); if (b.textContent !== v) b.textContent = v; b.classList.toggle('on', v === 'On'); }
  }
  function renderChat() {
    if (!chat) return;
    const log = chat.querySelector('.cc-chat-log');
    const want = chatLog.map(m => '<div class="cc-msg ' + m.who + '">' + (m.who === 'bot' ? '<span class="cc-mwho">Assistant</span>' : '') + (m.dots ? '<span class="cc-dots"><i></i><i></i><i></i></span>' : esc(m.text)) + '</div>').join('');
    if (log.dataset.h !== want) { log.innerHTML = want; log.dataset.h = want; }
  }

  /* the x clears the answer: its marks, layers and drafts; accepted changes stay */
  function clearAnswer() { stopReel(); Object.assign(st, {marks: {}, layers: [], drafts: [], open: null, details: {}, tray: null, sel: [], label: null, answer: null}); undoSnap = null; render(); }

  /* ---------- clicks on the figure ---------- */
  async function press(i) {
    const a = st.answer; if (!a || !a.buttons) return;
    const b = a.buttons[i]; if (!b) return;
    stopReel();
    if (b.undo) { if (undoSnap) { st = undoSnap; undoSnap = null; } st.answer = bar('Put back as it was.'); render(); return; }
    const snap = copy(st); snap.answer = null; snap.flash = [];
    if (b.think) { const my = ++token; st.answer = {thinking: b.think}; render(); await sleep(750); if (my !== token) return; }
    b.act(st);
    if (b.keep) { st.answer.buttons = a.buttons.filter(x => x !== b); }
    else if (st.answer && st.answer.buttons && st.answer.buttons.some(x => x.undo)) undoSnap = snap;
    render();
  }
  sheet.addEventListener('click', ev => {
    const p = ev.target.closest('[data-pick]');
    if (p && st.answer && st.answer.buttons) { const i = st.answer.buttons.findIndex(b => b.pick === p.dataset.pick); if (i >= 0) press(i); return; }
    if (ev.target.closest('.cc-tray .send') && st.tray) { stopReel(); st.tray.sent = true; st.marks = {}; st.answer = bar('Sent.'); render(); setTimeout(() => { if (st.tray && st.tray.sent) { st.tray = null; render(); } }, RM ? 0 : 1800); return; }
    if (ev.target.closest('.cc-tray .plain') && st.tray) { stopReel(); st.tray = null; st.marks = {}; st.answer = bar('Email discarded.'); render(); }
  });
  sheet.removeAttribute('aria-hidden'); sheet.setAttribute('role', 'img'); sheet.setAttribute('aria-label', 'A calendar week that redraws to answer each sentence');

  /* ---------- playing a sentence ---------- */
  async function type(target, sc, ok) {
    const typed = target.querySelector('.cc-typed');
    target.classList.add('on');
    if (sc.voice && target === ask) {
      target.classList.add('listening'); await sleep(420); if (!ok()) return;
      const words = sc.say.split(' ');
      for (let i = 1; i <= words.length; i++) { typed.textContent = words.slice(0, i).join(' '); await sleep(190); if (!ok()) return; }
      await sleep(520); target.classList.remove('listening');
    } else {
      for (let i = 1; i <= sc.say.length; i++) { typed.textContent = sc.say.slice(0, i); await sleep(24 + Math.random() * 34); if (!ok()) return; }
      await sleep(300);
    }
    if (!ok()) return;
    target.classList.add('sent'); await sleep(200);
    typed.textContent = ''; target.classList.remove('on', 'sent');
  }
  async function play(id) {
    const sc = S[id], my = ++token, ok = () => my === token;
    Object.values(chipOf).forEach(b => b.classList.toggle('on', b === chipOf[id]));
    st = base(cfg.hourH); undoSnap = null; chatLog = [];
    [ask, chat && chat.querySelector('.cc-chat-in')].forEach(t => { if (t) { t.classList.remove('on', 'sent', 'listening'); t.querySelector('.cc-typed').textContent = ''; } });
    render();
    if (sc.pre) { for (const pid of sc.pre) { await sleep(380); if (!ok()) return false; st.sel.push(pid); st.label = st.sel.length + (st.sel.length === 1 ? ' meeting' : ' meetings'); render(); } await sleep(300); }
    if (!ok()) return false;
    if (sc.chat) { await type(chat.querySelector('.cc-chat-in'), sc, ok); if (!ok()) return false; chatLog.push({who: 'you', text: sc.say}, {who: 'bot', dots: true}); render(); }
    else { await type(ask, sc, ok); if (!ok()) return false; }
    st.answer = {thinking: sc.think || 'Reading your calendar'}; render();
    await sleep(sc.fast ? 380 : 820); if (!ok()) return false;
    const pre = copy(st); pre.answer = null; pre.flash = [];
    sc.a(st); undoSnap = pre;
    render();
    if (sc.chat) { await sleep(500); if (!ok()) return false; chatLog[chatLog.length - 1] = {who: 'bot', text: sc.reply}; render(); }
    return true;
  }

  /* ---------- the tour in the first figure, and a first answer in the others ---------- */
  let reelOn = false, visible = false, reelRun = 0;
  function stopReel() { if (!reelOn) return; reelOn = false; reelRun++; if (tourBtn) tourBtn.firstChild.textContent = 'Play tour'; }
  async function startReel() {
    if (!cfg.reel) return;
    reelOn = true; const run = ++reelRun; if (tourBtn) tourBtn.firstChild.textContent = 'Pause tour';
    let i = 0;
    while (reelOn && run === reelRun) {
      if (!visible) { await sleep(500); continue; }
      const done = await play(cfg.reel[i % cfg.reel.length]);
      if (!reelOn || run !== reelRun) return;
      if (done) { await sleep(4600); i++; }
    }
  }
  new IntersectionObserver(es => {
    for (const e of es) {
      visible = e.isIntersecting;
      if (visible && !started) {
        started = true;
        if (RM) { play(cfg.reel ? cfg.reel[0] : cfg.auto); if (tourBtn) { reelOn = false; tourBtn.firstChild.textContent = 'Play tour'; } }
        else if (cfg.reel) startReel(); else if (cfg.auto) play(cfg.auto);
      }
    }
  }, {threshold: 0.35}).observe(stage);
  let lastW = 0;
  new ResizeObserver(() => { const w = sheet.clientWidth; if (w !== lastW) { lastW = w; render(); } }).observe(sheet);
  render();
}

document.querySelectorAll('figure[data-cc]').forEach(Figure);

/* the section list beside the text marks where you are */
const links = [...document.querySelectorAll('.layout nav a')];
const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if (secs.length) {
  const mark = () => { let cur = secs[0]; for (const s of secs) if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = s; links.forEach(a => a.classList.toggle('current', a.getAttribute('href') === '#' + cur.id)); };
  addEventListener('scroll', mark, {passive: true}); mark();
}
})();
