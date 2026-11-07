import {TZ, dayKey, minutes, onDay, overlap} from './logic.js';
import {canEdit} from './event_facts.js';
import {ensureView,navigateView,normalizedScope,scopeDays,dayCovered} from './view_state.js';

export const clone = value => JSON.parse(JSON.stringify(value));
export const unchangedTime = (event,change) => ['move','resize'].includes(change?.kind)&&['start','end'].every(k=>Date.parse(event[k])===Date.parse(change[k]));
export function pruneSelection(state,events){
 const known=new Set([...events,...(state.created||[])].map(e=>e.ref));
 state.selected=(state.selected||[]).filter(ref=>known.has(ref));state.highlighted=(state.highlighted||[]).filter(ref=>known.has(ref));
 if(state.inspected&&!known.has(state.inspected))state.inspected=null;
 if(state.focusContext)state.focusContext.excludedIds=(state.focusContext.excludedIds||[]).filter(ref=>known.has(ref));
}
export function focusContext(state){
 const target=state.focusContext?.target||(state.highlighted?.length?'highlighted':'selected');
 return {target,label:state.selectionLabel||'',request:state.focusContext?.request||'',ids:[...(state[target]||[])],excludedIds:[...(state.focusContext?.excludedIds||[])]};
}
export function shiftDate(date, days) {const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function validDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(date||'')&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&shiftDate(date,0)===date;}
export function weekDates(date,weekends=false){const day=new Date(date+'T12:00:00Z').getUTCDay();const monday=shiftDate(date,-((day+6)%7));return Array.from({length:weekends?7:5},(_,i)=>shiftDate(monday,i));}
export function localISO(date,time){
 if(!validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))throw Error('Choose a valid date and time.');
 const nominal=Date.parse(`${date}T${time}:00Z`);let candidate=nominal;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const p=Object.fromEntries(parts.formatToParts(new Date(candidate)).map(x=>[x.type,x.value]));const represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);candidate+=nominal-represented;}
 const iso=new Date(candidate).toISOString();if(dayKey({start:iso})!==date||minutes(iso)!==+time.slice(0,2)*60+ +time.slice(3))throw Error('That local time does not exist in this timezone.');return iso;
}
export function timeString(iso){const m=minutes(iso);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function daySegments(events,date){
 const start=localISO(date,'00:00'),end=localISO(shiftDate(date,1),'00:00');
 return events.filter(e=>!e.allDay&&onDay(e,date)).map(e=>({...e,start:Date.parse(e.start)<Date.parse(start)?start:e.start,end:Date.parse(e.end)>Date.parse(end)?end:e.end,
  startMinute:Date.parse(e.start)<Date.parse(start)?0:minutes(e.start),endMinute:Date.parse(e.end)>=Date.parse(end)?1440:minutes(e.end)}));
}
export function newState(snapshot){const state={snapshotKey:snapshot.snapshotKey,revision:0,days:weekDates(snapshot.defaultDate||snapshot.range.start),questionScope:null,selected:[],highlighted:[],selectionLabel:'',focusContext:null,edits:{},created:[],drafts:[],undo:[],redo:[],source:false,gapMinutes:0,gapKind:'unbooked',gapTitle:'Focus',reviewIndex:0,reviewStatus:{},visited:[],guided:true,inspected:null,transcript:[],reply:'',lastInput:'',savedAt:null};ensureView(state);return state;}
export function scenario(state){return clone({edits:state.edits,created:state.created,drafts:state.drafts,reviewStatus:state.reviewStatus});}
export function restoreScenario(state,s){Object.assign(state,clone(s));}
export function checkpoint(state){state.undo.push(scenario(state));state.undo=state.undo.slice(-30);state.redo=[];}
export function projectedEvents(events,state){return [...events,...state.created].map(e=>{
 const c=state.edits[e.ref];if(!c||unchangedTime(e,c))return {...e};
 return {...e,...(c.kind==='move'||c.kind==='resize'?{start:c.start,end:c.end}:{}),previewKind:c.kind,previewDeclined:['decline','remove','cancel'].includes(c.kind),previewAccepted:c.kind==='accept',previewTentative:c.kind==='tentative',pending:['move','resize'].includes(c.kind)&&!canEdit(e),original:e};
});}
export function blockingEvents(events,state){
 const projected=projectedEvents(events,state).filter(e=>!e.transparent&&(e.response!=='declined'||e.previewAccepted||e.previewTentative)&&!e.previewDeclined);
 // Another organizer's proposed move does not release its existing slot.
 for(const e of projected.filter(e=>e.pending))projected.push({...e.original,pendingOriginal:true});
 return projected;
}
export function findGaps(events,state,range,minMinutes=30,from=9*60,to=18*60){
 const all=blockingEvents(events,state),out=[];
 for(const date of scopeDays(state.questionScope,state.days)){
  if(!dayCovered(range.range?range:{range},date))continue;
  const start=Date.parse(localISO(date,`${String(Math.floor(from/60)).padStart(2,'0')}:${String(from%60).padStart(2,'0')}`));
  const end=Date.parse(localISO(date,`${String(Math.floor(to/60)).padStart(2,'0')}:${String(to%60).padStart(2,'0')}`));
  const busy=all.flatMap(e=>{if(e.allDay)return onDay(e,date)?[[start,end]]:[];const a=Math.max(start,Date.parse(e.start)),b=Math.min(end,Date.parse(e.end));return b>a?[[a,b]]:[];}).sort((a,b)=>a[0]-b[0]);
  let cursor=start;for(const [a,b] of [...busy,[end,end]]){if((a-cursor)/60000>=minMinutes)out.push({date,start:new Date(cursor).toISOString(),end:new Date(a).toISOString(),minutes:(a-cursor)/60000});cursor=Math.max(cursor,b);}
 }return out;
}
export function timeWindows(events,state,snapshot,minMinutes=30){
 const free=findGaps(events,state,snapshot,minMinutes).map(g=>({...g,kind:'unbooked'}));
 if(state.gapKind!=='alone')return free;
 const all=blockingEvents(events,state),solo=e=>!e.allDay&&(e.audience==='solo'||(e.organizerSelf&&!e.attendees?.some(p=>!p.self)));
 // Search continuous time without other people, then describe the existing holds
 // within it. Adjacent solo and unbooked portions are one usable window.
 const windows=findGaps(all.filter(e=>!solo(e)),{...state,edits:{},created:[]},snapshot,minMinutes);
 return windows.map(g=>{const holds=all.filter(e=>solo(e)&&Date.parse(e.start)<Date.parse(g.end)&&Date.parse(e.end)>Date.parse(g.start));return {...g,kind:holds.length?'solo':'unbooked',ref:holds[0]?.ref,soloRefs:[...new Set(holds.map(e=>e.ref))]};});
}
export function sceneConflicts(events,state){const active=projectedEvents(events,state).filter(e=>!e.allDay&&!e.transparent&&(e.response!=='declined'||e.previewAccepted||e.previewTentative)&&!e.previewDeclined);return active.flatMap((e,i)=>active.slice(i+1).filter(b=>overlap(e,b)).map(b=>[e.ref,b.ref]));}
export function operationIds(op,state){return op.ids?.length?op.ids:state.selected.length?state.selected:state.highlighted;}
export function queryEvents(events,predicates){
 const fields=['title','audience','format','peopleCount','organizerSelf','response','optional','allDay','date','startTime','endTime','tags','participation','canEdit','organizer','location'];
 if(!Array.isArray(predicates)||predicates.length>16||predicates.some(p=>!fields.includes(p.field)||!['eq','ne','contains','gte','lte'].includes(p.cmp)))throw Error('That event filter is not supported.');
 return events.filter(e=>{
 const response=e.previewDeclined?'declined':e.previewAccepted?'accepted':e.previewTentative?'tentative':e.response;
 if(!predicates.some(p=>p.field==='allDay')&&e.allDay)return false;
 if(!predicates.some(p=>p.field==='response')&&response==='declined')return false;
 return predicates.every(p=>{const value=p.field==='participation'?(e.participation&&e.participation!=='unknown'?e.participation:e.participationEstimate?.value||'unknown'):p.field==='canEdit'?canEdit(e):p.field==='date'?dayKey(e):p.field==='startTime'?!e.allDay&&timeString(e.start):p.field==='endTime'?!e.allDay&&timeString(e.end):p.field==='response'?response:e[p.field],wanted=p.value;
  if(p.cmp==='eq')return value===wanted;if(p.cmp==='ne')return value!==wanted;
  const comparable=(typeof value==='number'&&typeof wanted==='number')||(['date','startTime','endTime'].includes(p.field)&&typeof value==='string'&&typeof wanted==='string');
  if(p.cmp==='gte')return comparable&&value>=wanted;
  if(p.cmp==='lte')return comparable&&value<=wanted;
  if(p.cmp==='contains')return Array.isArray(value)?value.some(v=>String(v).toLowerCase()===String(wanted).toLowerCase()):String(value??'').toLowerCase().includes(String(wanted).toLowerCase());
 });});
}
function requireIds(ids,events){if(!ids.length)throw Error('Select the events you mean first.');if(ids.some(id=>!events.some(e=>e.ref===id)))throw Error('An event in that request is no longer available.');}
export function runOperations(original,operations,events,options={}){
 const state=clone(original);ensureView(state);const all=[...events,...state.created];
 if(!Array.isArray(operations)||operations.length>24)throw Error('That instruction is too large.');
 const mutable=operations.some(o=>['edit','create','draft'].includes(o.op)||o.op==='clear'&&o.mode==='scenario');
 if(mutable)checkpoint(state);
 for(const op of operations){
  const ids=operationIds(op,state);
  if(['select','highlight'].includes(op.op)){
   let target=op.op==='select'?'selected':'highlighted';const exact=op.where?queryEvents(projectedEvents(events,state),op.where).map(e=>e.ref):(op.ids||[]);
   if(op.mode==='remove'&&!state[target].length&&state.focusContext?.target!==target)target=target==='selected'?'highlighted':'selected';
   if(exact.some(id=>!all.some(e=>e.ref===id)))throw Error('The selected events are not in this snapshot.');
   state[target]=op.mode==='add'?[...new Set([...state[target],...exact])]:op.mode==='remove'?state[target].filter(id=>!exact.includes(id)):[...exact];
   state[target]=state[target].filter(id=>!(op.excludeIds||[]).includes(id));
   // Short reasons written by the model travel with the set; removed events lose theirs.
   const notes=Object.fromEntries((op.notes||[]).filter(n=>n&&typeof n.id==='string'&&typeof n.text==='string'&&state[target].includes(n.id)).map(n=>[n.id,n.text.slice(0,90)]));
   state.eventNotes=Object.fromEntries(Object.entries({...(['add','remove'].includes(op.mode)?state.eventNotes||{}:{}),...notes}).filter(([id])=>state.selected.includes(id)||state.highlighted.includes(id)));
   if(!op.mode||op.mode==='replace')state[target==='selected'?'highlighted':'selected']=[];
   const refining=['add','remove'].includes(op.mode),previous=state.focusContext?.target===target?state.focusContext:null;
   const excluded=new Set(refining?previous?.excludedIds||[]:[]);
   if(op.mode==='remove')exact.forEach(ref=>excluded.add(ref));
   if(op.mode==='add')exact.forEach(ref=>excluded.delete(ref));
   (op.excludeIds||[]).forEach(ref=>excluded.add(ref));
   state.selectionLabel=op.label??(refining?state.selectionLabel:'');
   state.focusContext={target,request:refining?previous?.request||'':state.lastInput||'',excludedIds:[...excluded]};
   state.guided=false;
  }else if(op.op==='scope'){
   let scope=op.range||{days:op.days};if(op.mode){const frame=clone(state);navigateView(frame,op,{remember:false});scope={days:frame.days};}
   state.questionScope=normalizedScope(scope);if(!state.questionScope)throw Error('Choose dates for this question.');
  }else if(op.op==='view'){
   navigateView(state,op);state.guided=false;
  }else if(op.op==='edit'){
   requireIds(ids,all);if(!['decline','accept','tentative','move','resize','remove','cancel','restore'].includes(op.action))throw Error('Unknown calendar change.');
   for(const id of ids){const source=all.find(e=>e.ref===id),current=projectedEvents(all.filter(e=>!e.created),{...state,created:state.created}).find(e=>e.ref===id)||source;
    if(source.allDay&&['move','resize'].includes(op.action))throw Error('All-day events cannot be moved here yet.');
    if(op.action==='restore'){delete state.edits[id];continue;}
    const guests=source.attendees?.some(p=>!p.self&&!p.resource);
    if(op.action==='remove'&&source.organizerSelf&&guests)throw Error('This meeting has guests. Cancel it for everyone instead.');
    if(op.action==='cancel'&&!(source.organizerSelf&&guests))throw Error('Only meetings you organize with guests can be cancelled for everyone.');
    if(source.created&&op.action==='remove'){state.created=state.created.filter(e=>e.ref!==id);delete state.edits[id];continue;}
    const change={kind:op.action,fromDecision:options.decisionId||null,stepId:op.stepId,after:op.after||[]};
    if(op.note&&['decline','accept','tentative'].includes(op.action))change.note=String(op.note).slice(0,500);
    if(op.scope==='series'&&source.seriesId&&!['move','resize'].includes(op.action))change.scope='series';
    if(['move','resize'].includes(op.action)){
     if(op.deltaDays!==undefined&&(!Number.isInteger(op.deltaDays)||Math.abs(op.deltaDays)>366))throw Error('Use a whole number of days within one year.');
     let start=current.start;
     if(op.date||op.time||op.deltaDays)start=localISO(op.date||shiftDate(dayKey(current),op.deltaDays||0),op.time||timeString(current.start));
     if(op.deltaMinutes){if(!Number.isInteger(op.deltaMinutes)||Math.abs(op.deltaMinutes)>44640)throw Error('That time change is too large.');start=new Date(Date.parse(start)+op.deltaMinutes*60000).toISOString();}
     const duration=op.minutes??((Date.parse(current.end)-Date.parse(current.start))/60000);
     if(!Number.isFinite(duration)||duration<5||duration>1440)throw Error('Use a duration between 5 minutes and 24 hours.');
     change.start=start;change.end=new Date(Date.parse(start)+duration*60000).toISOString();
    }
    if(unchangedTime(source,change))delete state.edits[id];else state.edits[id]=change;
   }state.source=false;state.guided=!!options.decisionId;
  }else if(op.op==='create'){
   const duration=op.minutes||30;if(!Number.isInteger(duration)||duration<5||duration>1440)throw Error('Use a duration between 5 minutes and 24 hours.');
   const start=localISO(op.date,op.time),ref='new-'+Math.random().toString(36).slice(2,10);
   const guests=[...new Set((op.attendees||[]).filter(a=>typeof a==='string'&&a.includes('@')).map(a=>a.trim().toLowerCase()))].slice(0,50);
   const eventType=['focusTime','outOfOffice'].includes(op.eventType)&&!guests.length?op.eventType:'default';
   const event={ref,id:ref,title:(op.title||(eventType==='outOfOffice'?'Out of office':'Focus')).slice(0,180),start,end:new Date(Date.parse(start)+duration*60000).toISOString(),allDay:false,transparent:false,organizerSelf:true,organizer:'You',peopleCount:1+guests.length,audience:guests.length?'unknown':'solo',format:guests.length?'meeting':'solo',created:true,fromDecision:options.decisionId||null,response:'accepted',attendees:guests.map(email=>({email,responseStatus:'needsAction'})),type:eventType,meet:!!op.meet&&guests.length>0,description:typeof op.description==='string'?op.description.slice(0,4000):''};
   event.stepId=op.stepId;event.after=op.after||[];state.created.push(event);all.push(event);state.selected=[ref];state.source=false;
  }else if(op.op==='draft'){
   if(['remove','update'].includes(op.action)){
    if(!op.draftIds?.length||op.draftIds.some(id=>!state.drafts.some(d=>d.id===id)))throw Error('Choose an existing draft to change.');
    if(op.action==='remove')state.drafts=state.drafts.filter(d=>!op.draftIds.includes(d.id));
    else for(const draft of state.drafts.filter(d=>op.draftIds.includes(d.id))){for(const field of ['channel','recipient','body'])if(op[field]!==undefined)draft[field]=String(op[field]).slice(0,field==='body'?6000:200);draft.fromDecision=null;}
    continue;
   }
   state.drafts.push({id:'draft-'+Math.random().toString(36).slice(2,10),channel:['slack','email'].includes(op.channel)?op.channel:'unspecified',recipient:(op.recipient||'Recipient not chosen').slice(0,200),body:(op.body||'').slice(0,6000),ids:op.ids||[],stepId:op.stepId,after:op.after||[],fromDecision:options.decisionId||null});
  }else if(op.op==='gaps'){
   const duration=op.minutes||30;if(!Number.isInteger(duration)||duration<5||duration>720)throw Error('Choose a gap between 5 minutes and 12 hours.');if(op.mode&&!['unbooked','alone'].includes(op.mode))throw Error('Choose unbooked time or time alone.');state.gapKind=op.mode||'unbooked';state.gapMinutes=duration;state.gapTitle=op.title||'Focus';state.guided=false;
  }else if(op.op==='compare'){state.source=op.mode==='source';
  }else if(op.op==='clear'){
   if(op.mode==='scenario'){state.edits={};state.created=[];state.drafts=[];}
   else if(op.mode==='gaps')state.gapMinutes=0;
   else {state.selected=[];state.highlighted=[];state.selectionLabel='';state.focusContext=null;}
  }else if(op.op==='undo'){
   if(state.undo.length){state.redo.push(scenario(state));restoreScenario(state,state.undo.pop());}
  }else if(op.op==='redo'){
   if(state.redo.length){state.undo.push(scenario(state));restoreScenario(state,state.redo.pop());}
  }else if(op.op==='inspect'){
   requireIds(ids,all);state.inspected=ids[0];state.selected=[ids[0]];
  }else if(op.op!=='review')throw Error('Unknown workspace action.');
 }
 state.revision++;return state;
}
export function quickCommand(text,state){
 const t=text.trim().toLowerCase().replace(/[.!?]+$/,'');const day=state.days[0];
 if(/^(?:show |switch to |go to |zoom out to )?(?:the )?(?:full|whole|seven day|7 day) week$/.test(t))return [{op:'view',days:weekDates(day,true)}];
 if(/^(?:show |switch to |go to |zoom out to )?(?:the )?(?:work ?week|week view)$/.test(t))return [{op:'view',days:weekDates(day)}];
 if(/^(?:show |go to )?(?:the )?(?:original|source|before)(?: calendar)?$/.test(t))return [{op:'compare',mode:'source'}];
 if(/^(?:show )?(?:the )?(?:scenario|preview|after)(?: calendar)?$/.test(t))return [{op:'compare',mode:'scenario'}];
 if(/^(?:undo|undo that|go back one step)$/.test(t))return [{op:'undo'}];
 if(t==='redo')return [{op:'redo'}];
 if(/^(?:back to|resume|continue)(?: the)? review$/.test(t))return [{op:'review',mode:'resume'}];
 const match=t.match(/^(?:show |focus on |go to |zoom into |zoom in on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?: only)?$/);
 if(match)return [{op:'view',days:[weekDates(day,true)[['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(match[1])]]}];
 return null;
}
