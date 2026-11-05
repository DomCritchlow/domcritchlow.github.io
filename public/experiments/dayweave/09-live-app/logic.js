export let TZ = 'America/New_York';
let clock = new Intl.DateTimeFormat('en-GB', {timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
let date = new Intl.DateTimeFormat('en-CA', {timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
// Formatter construction dominates render time, so each timezone builds its formatters once.
let label = new Intl.DateTimeFormat('en-US', {timeZone:TZ,hour:'numeric',minute:'2-digit'});
let zone = new Intl.DateTimeFormat('en-US', {timeZone:TZ,timeZoneName:'short'});
export function setTimezone(value){
 const nextClock=new Intl.DateTimeFormat('en-GB',{timeZone:value,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const nextDate=new Intl.DateTimeFormat('en-CA',{timeZone:value,year:'numeric',month:'2-digit',day:'2-digit'});
 const nextLabel=new Intl.DateTimeFormat('en-US',{timeZone:value,hour:'numeric',minute:'2-digit'});
 const nextZone=new Intl.DateTimeFormat('en-US',{timeZone:value,timeZoneName:'short'});
 TZ=value;clock=nextClock;date=nextDate;label=nextLabel;zone=nextZone;
}
export function dayKey(event) { return event.allDay ? event.start.slice(0,10) : date.format(new Date(event.start)); }
export function minutes(iso) { const [h,m]=clock.format(new Date(iso)).split(':').map(Number);return h*60+m; }
export function timeLabel(iso) { return label.format(new Date(iso)); }
export function timezoneLabel(iso=new Date()) { return zone.formatToParts(new Date(iso)).find(p=>p.type==='timeZoneName').value; }
export function onDay(event, key) { return event.allDay ? event.start.slice(0,10)<=key && event.end.slice(0,10)>key : dayKey(event)<=key && dayKey({start:new Date(Date.parse(event.end)-1).toISOString()})>=key; }
export function overlap(a,b) { return !a.allDay && !b.allDay && Date.parse(a.start)<Date.parse(b.end) && Date.parse(b.start)<Date.parse(a.end); }
export function conflictPairs(events) { const active=events.filter(e=>!e.allDay&&!e.transparent&&e.response!=='declined'&&!e.previewDeclined);return active.flatMap((a,i)=>active.slice(i+1).filter(b=>overlap(a,b)).map(b=>[a.id,b.id])); }
// Partition interval graphs into lanes. Position is always derived from timestamps,
// never from the height or order of preceding event cards.
export function layoutEvents(events) {
  const sorted=events.filter(e=>!e.allDay).map(e=>({...e})).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)||Date.parse(b.end)-Date.parse(a.end));
  let group=[],end=-Infinity; const result=[];
  function flush(){
    const lanes=[];
    for(const e of group){let lane=lanes.findIndex(until=>until<=Date.parse(e.start));if(lane<0)lane=lanes.length;lanes[lane]=Date.parse(e.end);e.lane=lane;}
    group.forEach(e=>result.push({...e,lanes:lanes.length}));group=[];
  }
  for(const e of sorted){if(Date.parse(e.start)>=end&&group.length)flush();group.push(e);end=Math.max(group.length===1?-Infinity:end,Date.parse(e.end));}flush();return result;
}
export function applyChanges(events, changes) { return events.map(e=>{const change=changes.find(c=>c.eventId===e.id);return change?{...e,previewDeclined:change.kind==='decline',previewAccepted:change.kind==='accept',pending:change.kind==='request',previewKind:change.kind}:e;}); }
