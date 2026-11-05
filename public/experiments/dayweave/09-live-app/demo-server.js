// A stand-in for the Dayweave server that runs entirely in the browser, so the real
// app code can be tried with a fictional calendar. Nothing leaves the page: there
// is no model, no Google account and no network request. Replies are scripted from
// the same local parser the app uses for its live preview.
import {parseDraft} from './draft.js';

const realFetch=window.fetch.bind(window);
const KEY='dayweave-demo-v1',zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return ymd(d);};
const at=(date,hhmm)=>{const [y,m,d]=date.split('-').map(Number),[h,mi]=hhmm.split(':').map(Number);return new Date(y,m-1,d,h,mi).toISOString();};
const localDay=iso=>ymd(new Date(iso)),localMinutes=iso=>{const d=new Date(iso);return d.getHours()*60+d.getMinutes();};
const clock=m=>{const h=Math.floor(m/60),mm=m%60;return `${h%12||12}${mm?':'+pad(mm):''} ${h<12?'AM':'PM'}`;};
const weekday=date=>new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'});
const today=ymd(new Date()),monday=addDays(today,-((new Date(today+'T12:00:00').getDay()+6)%7));
const ME={email:'you@example.test',self:true,responseStatus:'accepted'};
const PEOPLE={alex:{displayName:'Alex Kim',email:'alex@example.test'},priya:{displayName:'Priya Shah',email:'priya@example.test'},sam:{displayName:'Sam Ortiz',email:'sam@example.test'},jordan:{displayName:'Jordan Lee',email:'jordan@example.test'},mei:{displayName:'Mei Chen',email:'mei@example.test'},lumen:{displayName:'Rae from Lumen',email:'rae@lumen.example'},northwind:{displayName:'Ola from Northwind',email:'ola@northwind.example'}};
const ROOM={displayName:'Cedar',email:'cedar@resource.example.test',resource:true,responseStatus:'accepted'};
// Day offsets are from this week's Monday; times are local to whoever opens the demo.
const PLAN=[
 [0,'08:30','09:00','Morning notes','solo'],[0,'10:00','11:00','Project review','internal',{people:['alex','priya'],room:true,description:'Review the prototype and agree on the next iteration.'}],
 [0,'12:00','12:45','Lunch','solo'],[0,'14:00','15:30','Writing time','solo'],[0,'16:00','16:30','Studio sync','internal',{people:['jordan','mei']}],
 [1,'09:30','09:45','Standup','internal',{people:['alex','sam','mei']}],[1,'12:00','13:00','Lunch','solo'],[1,'13:00','14:00','Design exchange','external',{people:['northwind'],organizer:'northwind'}],[1,'15:30','16:30','Hiring loop','internal',{people:['jordan','mei']}],
 [2,'09:30','09:45','Standup','internal',{people:['alex','sam','mei']}],[2,'10:00','11:00','Vendor demo','external',{people:['lumen'],organizer:'lumen',optional:true,description:'Product walkthrough. A recording is shared afterwards.'}],[2,'13:00','14:00','Research block','solo'],[2,'15:00','16:00','Studio check-in','internal',{people:['alex','priya','jordan']}],
 [3,'09:30','09:45','Standup','internal',{people:['alex','sam','mei']}],[3,'10:00','11:00','Customer call','external',{people:['lumen'],organizer:'lumen'}],[3,'11:30','12:00','1:1 with Sam','internal',{people:['sam']}],[3,'12:00','13:00','Lunch','solo'],[3,'15:30','16:00','Roadmap office hours','internal',{people:['priya','jordan','mei'],organizer:'priya',optional:true,description:'Drop in with questions about the roadmap.'}],
 [4,'09:30','09:45','Standup','internal',{people:['alex','sam','mei']}],[4,'11:00','12:00','Weekly reflection','solo'],[4,'13:00','14:00','All hands','internal',{people:['alex','priya','sam','jordan','mei'],organizer:'priya',optional:true,description:'Company update. Notes and the recording go out Monday.'}],[4,'14:30','15:30','Board prep','internal',{people:['priya']}],
 [5,'10:00','11:30','Farmers market','solo'],
 [7,'10:00','11:00','Project review','internal',{people:['alex','priya'],room:true}],[8,'09:30','09:45','Standup','internal',{people:['alex','sam','mei']}],[8,'14:00','15:00','Design exchange','external',{people:['northwind'],organizer:'northwind'}],
 [9,'09:30','09:45','Standup','internal',{people:['alex','sam','mei']}],[10,'11:30','12:00','1:1 with Sam','internal',{people:['sam']}],[11,'13:00','14:00','All hands','internal',{people:['alex','priya','sam','jordan','mei'],organizer:'priya',optional:true}],
 [-4,'10:00','11:00','Project review','internal',{people:['alex','priya'],room:true}],[-3,'09:30','09:45','Standup','internal',{people:['alex','sam','mei']}],
];
const SKIP_REASONS={'Vendor demo':'Optional, and the recording is shared after','All hands':'Optional for you, notes go out Monday','Roadmap office hours':'Drop-in, nothing of yours on the agenda'};

function freshSnapshot(){
 const events=PLAN.map(([day,start,end,title,audience,extra={}],i)=>{
  const date=addDays(monday,day),others=(extra.people||[]).map(k=>({...PEOPLE[k],responseStatus:'accepted'}));
  const organizer=extra.organizer?PEOPLE[extra.organizer].email:ME.email;
  return {ref:'e'+(i+1),id:'demo-'+(i+1),title,start:at(date,start),end:at(date,end),allDay:false,calendarId:'primary',organizerSelf:!extra.organizer,canEdit:!extra.organizer,guestsCanModify:false,locked:false,
   organizer,organizerName:extra.organizer?PEOPLE[extra.organizer].displayName:'You',response:'accepted',optional:!!extra.optional,attendees:audience==='solo'?[ME]:[ME,...others,...(extra.room?[ROOM]:[])],
   audience,peopleCount:audience==='solo'?1:others.length+1,location:extra.room?'Cedar':'',format:audience==='solo'?'solo':'meeting',description:extra.description||'',transparent:false,participation:'unknown',status:'confirmed',type:'default'};
 });
 events.push({ref:'e900',id:'demo-900',title:'Studio week',start:monday,end:addDays(monday,5),allDay:true,transparent:true,calendarId:'primary',organizerSelf:true,canEdit:true,organizer:ME.email,response:'accepted',attendees:[],audience:'solo',peopleCount:1,format:'solo',participation:'unknown'});
 const start=addDays(monday,-70),end=addDays(monday,77);
 return {events,snapshotKey:'dayweave-demo-'+monday,calendarRevision:1,timezone:zone,defaultDate:today,range:{start:addDays(monday,-7),end:addDays(monday,28)},coverage:[{start,end}],capturedAt:new Date().toISOString(),
  calendarSettings:{internalDomains:['example.test'],internalAddresses:[],colors:{internal:'#2878bf',external:'#cf6a25',solo:'#8753bb'}},
  appearance:{revision:0,policy:{mode:'audience',description:'Internal and external meetings, and time on my own.',categories:[{id:'internal',label:'Internal',color:'#2878bf',definition:'Everyone else is on the team.'},{id:'external',label:'External',color:'#cf6a25',definition:'Someone outside the team is invited.'},{id:'solo',label:'Solo / focus',color:'#8753bb',definition:'Time on my own.'}]}}};
}
let db;
try{db=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{db=null;}
if(!db||db.snapshot?.snapshotKey!=='dayweave-demo-'+monday)db={snapshot:freshSnapshot(),decisions:{},preferences:[{id:1,body:'Keep lunch free from 12 to 1.'}],outcomes:[],tickets:{},next:100};
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify({...db,tickets:{}}));}catch{}};
const jobs=new Map(),listeners=new Map();
const status=()=>({hosted:false,demo:true,researcher:true,interactionModel:'Scripted demo',researchModel:'Scripted demo',transport:'demo',csrf:'demo',google:{calendar:true,availability:true,email:false,account:'you@example.test',configured:true},
 sync:{connected:true,running:false,lastSuccessAt:Date.now()/1000,error:null,intervalSeconds:30},inference:{automaticReviews:0,modelCalls:0,inputTokens:0,outputTokens:0,cachedInputTokens:0,maxAutomaticReviews:5,maxCallsPerTurn:2,idleModelCalls:0}});
const list=()=>Object.values(db.decisions).sort((a,b)=>b.updated-a.updated);
const calendarState=()=>({snapshot:db.snapshot,decisions:list(),sync:status().sync});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function startJob(kind,work){
 const id='demo-job-'+(db.next++),job={id,kind,status:'running',queuedAt:Date.now()/1000,updatedAt:Date.now()/1000};jobs.set(id,job);
 const update=values=>{if(job.status==='cancelled')return;Object.assign(job,values,{updatedAt:Date.now()/1000});for(const fn of listeners.get(id)||[])fn({...job});};
 Promise.resolve().then(()=>work(update)).then(result=>update({status:'complete',result})).catch(e=>update({status:'error',error:e.message||'The demo could not finish.'}));
 return id;
}

/* ---------- the scripted stand-in for the model ---------- */
const byRef=ref=>db.snapshot.events.find(e=>e.ref===ref);
function freeSlot(date,length,[from,to],ignore){
 const busy=db.snapshot.events.filter(e=>!e.allDay&&!e.transparent&&e.ref!==ignore&&localDay(e.start)===date&&e.response!=='declined').map(e=>[localMinutes(e.start),localMinutes(e.end)]).sort((a,b)=>a[0]-b[0]);
 let t=Math.max(from,540);for(const [s,e] of busy){if(s-t>=length&&t+length<=to)return t;t=Math.max(t,e);}return t+length<=Math.min(to,1080)?t:null;
}
function respond(text,state){
 const days=state.days?.length?state.days:[today],parsed=parseDraft(text,{events:db.snapshot.events,days,today}),lower=text.toLowerCase();
 const result=(r)=>({calendarRevision:db.snapshot.calendarRevision,metrics:{model:'scripted demo'},result:{needsResearch:false,interaction:'discuss',...r,operations:[...(r.operations||[]).some(o=>o.op==='gaps')||!state.gapMinutes?[]:[{op:'clear',mode:'gaps'}],...(r.operations||[])]}});
 const week=parsed.week||/\bweek\b/.test(lower)?[0,1,2,3,4].map(i=>addDays(addDays(days[0],-((new Date(days[0]+'T12:00:00').getDay()+6)%7)),i)):null;
 const focus=state.focusContext||{};
 const setting=settingsRequest(lower,state.settings||[]);if(setting)return result(setting);
 if(focus.label==='Could skip'&&parsed.refs.length&&/\b(keep|important|need|matters|must)\b/.test(lower)){
  const ref=parsed.refs.find(r=>focus.ids?.includes(r))||parsed.refs[0];
  return result({reply:`Keeping ${byRef(ref).title}. The other candidates are still highlighted.`,operations:[{op:'highlight',ids:[ref],mode:'remove'}],contextSummary:'Finding meetings to skip; the user wants to keep '+byRef(ref).title+'.'});
 }
 if(/\b(skip|drop|miss|cancel)\b/.test(lower)&&!parsed.refs.length){
  const scope=parsed.dates.length?parsed.dates:week||days,ids=db.snapshot.events.filter(e=>!e.allDay&&e.optional&&scope.includes(localDay(e.start))&&e.response!=='declined').map(e=>e.ref);
  if(!ids.length)return result({reply:'Nothing in view is optional or recorded. Everything here has you presenting or deciding.'});
  return result({reply:`${ids.length===1?'One is':ids.length+' are'} optional, recorded or drop-in. Everything else has you presenting or deciding.`,operations:[...(week&&days.length<5?[{op:'view',days:week}]:[]),{op:'highlight',ids,label:'Could skip',notes:ids.map(id=>({id,text:SKIP_REASONS[byRef(id).title]||'Optional for you'}))}]});
 }
 if(/\bdecline\b/.test(lower)){
  const ids=(parsed.refs.length?parsed.refs:/\b(those|them|these|all|both)\b/.test(lower)?focus.ids||[]:[]).filter(r=>{const e=byRef(r);return e&&!e.organizerSelf&&e.response!=='declined';});
  if(ids.length)return result({interaction:'propose',title:ids.length===1?`Decline ${byRef(ids[0]).title}`:`Decline ${ids.length} meetings`,reply:'Organizers get your RSVP when you confirm. Nothing else changes.',operations:[{op:'edit',action:'decline',ids}]});
 }
 if(parsed.intent==='move'&&parsed.refs.length){
  const destination=parsed.dates.at(-1),candidates=parsed.refs.map(byRef).filter(Boolean),event=candidates.find(e=>localDay(e.start)===destination)||candidates.find(e=>days.includes(localDay(e.start)))||candidates[0];
  if(!destination)return result({reply:`Where should ${event.title} go? Name a day or a time.`,operations:[{op:'highlight',ids:[event.ref]}]});
  const length=(Date.parse(event.end)-Date.parse(event.start))/60000,start=parsed.time??freeSlot(destination,length,parsed.part||[540,1080],event.ref);
  if(start==null)return result({reply:`${weekday(destination)} has no ${length} minute gap${parsed.partLabel?' in the '+parsed.partLabel.toLowerCase():''}. Try the afternoon or another day.`,operations:[{op:'view',days:[...new Set([localDay(event.start),destination])].sort()},{op:'highlight',ids:[event.ref]}]});
  const others=event.attendees.filter(p=>!p.self&&!p.resource).map(p=>p.displayName.split(' ')[0]);
  return result({interaction:'propose',title:`Move ${event.title}`,reply:`Here is a time on ${weekday(destination)} at ${clock(start)}. ${others.length?others.join(' and ')+' get an update when you confirm.':'Only your calendar changes.'}`,
   operations:[{op:'view',days:[...new Set([localDay(event.start),destination])].sort()},{op:'edit',action:'move',ids:[event.ref],date:destination,time:`${pad(Math.floor(start/60))}:${pad(start%60)}`}]});
 }
 if(parsed.intent==='find'||parsed.minutes){
  const scope=parsed.dates.length?parsed.dates:week||days,length=parsed.minutes||60,within=parsed.part||[540,1080];
  const open=scope.map(d=>[d,freeSlot(d,length,within)]).filter(([,s])=>s!=null);
  return result({reply:open.length?`${open.length===1?weekday(open[0][0])+' has':open.length+' days have'} room for ${length>=60?length/60+' hour'+(length>60?'s':''):length+' minutes'}. Choose a highlighted window to hold it.`:'No window that long is open in that range.',
   operations:[...(parsed.dates.length?[{op:'view',days:[...new Set(parsed.dates)].sort()}]:[]),{op:'gaps',minutes:length}]});
 }
 if(parsed.refs.length){
  const events=parsed.refs.map(byRef).filter(e=>e&&days.includes(localDay(e.start))),shown=events.length?events:parsed.refs.map(byRef).slice(0,1);
  const first=shown[0];return result({reply:`${first.title} is ${weekday(localDay(first.start))} at ${clock(localMinutes(first.start))}${first.attendees.length>1?' with '+first.attendees.filter(p=>!p.self&&!p.resource).map(p=>p.displayName.split(' ')[0]).join(', '):''}.`,
   operations:[...(shown.some(e=>!days.includes(localDay(e.start)))?[{op:'view',days:[...new Set(shown.map(e=>localDay(e.start)))].sort()}]:[]),{op:'highlight',ids:shown.map(e=>e.ref)}]});
 }
 if(parsed.dates.length){
  const date=parsed.dates[0],list=db.snapshot.events.filter(e=>!e.allDay&&localDay(e.start)===date&&(!parsed.part||(localMinutes(e.start)<parsed.part[1]&&localMinutes(e.end)>parsed.part[0]))).sort((a,b)=>a.start.localeCompare(b.start));
  return result({reply:list.length?`${weekday(date)}${parsed.partLabel?' '+parsed.partLabel.toLowerCase():''}: ${list.map(e=>e.title+' at '+clock(localMinutes(e.start))).join(', ')}.`:`${weekday(date)} is clear${parsed.partLabel?' that '+parsed.partLabel.toLowerCase():''}.`,
   operations:[{op:'view',days:[...new Set(parsed.dates)].sort()},...(list.length?[{op:'highlight',ids:list.map(e=>e.ref)}]:[])]});
 }
 return result({reply:'This demo uses a scripted stand-in for the model, so it understands days, times, lengths and meeting names. Try “move the design exchange to Thursday afternoon” or “which meetings could I skip?”'});
}

/* ---------- settings through the conversation ---------- */
const COLORS={'dark green':'#2f5a45','forest green':'#2f5a45',green:'#3f8a5c','light green':'#7fb08f',teal:'#2a8a87',blue:'#2f72ad','dark blue':'#1f3a68',navy:'#1f3a68','light blue':'#79b2e6',purple:'#7652ad',violet:'#7652ad',red:'#c0392b',orange:'#d9822b',amber:'#b97a1f',gold:'#c9a227',yellow:'#d4a72c',pink:'#c2577a',magenta:'#b03a8c',gray:'#7d8a80',grey:'#7d8a80',black:'#1d2a23',brown:'#8a5a3b'};
const TARGETS=[[/open decisions?|decision (markers?|dots?)/,'colors.decision','open decision marker'],[/proposed( changes?)?|proposals?/,'colors.proposed','proposed change outline'],[/needs? agreement|pending/,'colors.pending','needs agreement marker'],[/internal( meetings?)?/,'colors.internal','internal meeting color'],[/external( meetings?)?/,'colors.external','external meeting color'],[/solo|focus( time)?/,'colors.solo','solo and focus color']];
const VIEWS=[[/settings|preferences page/,'settings'],[/memory|what you (know|remember)/,'memory'],[/history|past conversations/,'history'],[/saved|decisions list/,'saved'],[/diagnostics/,'diagnostics']];
function settingsRequest(lower,settings){
 const current=key=>settings.find(s=>s.key===key)?.value;
 const color=lower.match(/\b(?:change|make|set|turn|color|colour|paint)\s+(?:the\s+|my\s+)?(.+?)\s+(?:to|into|as)?\s*(?:a\s+)?(#[0-9a-f]{6}|[a-z]+(?: [a-z]+)?)[.!?]?$/);
 if(color){const target=TARGETS.find(([re])=>re.test(color[1])),value=color[2].startsWith('#')?color[2]:COLORS[color[2]]||COLORS[color[2].split(' ').at(-1)];
  if(target&&value)return {reply:`I can make the ${target[2]} ${color[2]}. Here is a preview.`,operations:[{op:'settings',changes:[{key:target[1],value}]}]};}
 const domain=lower.match(/\badd\s+(?:@)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\s+(?:as|to)\s+(?:an?\s+)?internal/);
 if(domain)return {reply:`I can treat ${domain[1]} as internal. Meetings with only them and your team will turn internal.`,operations:[{op:'settings',changes:[{key:'internalDomains',value:[...(current('internalDomains')||[]),domain[1]]}]}]};
 if(/\bread (replies|answers|responses)? ?aloud\b|\bread aloud\b/.test(lower))return {reply:`I can turn ${/\b(off|stop|don't|do not)\b/.test(lower)?'off':'on'} read aloud.`,operations:[{op:'settings',changes:[{key:'readAloud',value:!/\b(off|stop|don't|do not)\b/.test(lower)}]}]};
 const remember=lower.match(/^(?:please )?remember (?:that )?(.+)/);
 if(remember)return {reply:'I can remember that for future suggestions.',operations:[{op:'settings',changes:[{key:'memory.add',value:remember[1].replace(/^./,c=>c.toUpperCase())}]}]};
 if(/^(open|show)( me)?\b/.test(lower)){const view=VIEWS.find(([re])=>re.test(lower));if(view)return {reply:'Opening it.',operations:[{op:'settings',show:view[1]}]};}
 return null;
}

/* ---------- checks and applying a change ---------- */
function check(actions){
 const ticket='demo-ticket-'+(db.next++);db.tickets[ticket]=actions;
 const steps=actions.map(a=>{const e=byRef(a.ref);const people=(e?.attendees||[]).map(p=>({name:p.displayName||p.email,email:p.email,resource:!!p.resource,optional:false,status:'free'}));
  return {key:a.key,kind:a.kind,ref:a.ref,title:a.title||e?.title,status:'ready',latest:e,availability:people.length?{status:'free',people,checkedAt:Date.now()/1000}:undefined,warnings:[]};});
 return {ticket,ready:true,steps,connection:status().google,expiresAt:Date.now()/1000+600};
}
function execute(ticket){
 const actions=db.tickets[ticket];if(!actions)throw Error('This preview expired. Review it again.');delete db.tickets[ticket];
 const steps=[];
 for(const a of actions){
  const e=byRef(a.ref);let message='Done.',state='success';
  if(['move','resize'].includes(a.kind)&&e){e.start=a.start;e.end=a.end;message='Moved.';}
  else if(['decline','accept','tentative'].includes(a.kind)&&e){e.response={decline:'declined',accept:'accepted',tentative:'tentative'}[a.kind];message='RSVP sent.';}
  else if(a.kind==='remove'&&e){db.snapshot.events=db.snapshot.events.filter(x=>x!==e);message='Removed.';}
  else if(a.kind==='create'){db.snapshot.events.push({ref:'h'+(db.next++),id:'demo-hold-'+db.next,title:a.title||'Focus',start:a.start,end:a.end,allDay:false,calendarId:'primary',organizerSelf:true,canEdit:true,organizer:ME.email,response:'accepted',attendees:[ME],audience:'solo',peopleCount:1,format:'solo',participation:'unknown'});message='Added.';}
  else {state='awaiting_reply';message='Request drafted. Nothing was sent in the demo.';}
  steps.push({key:a.key,kind:a.kind,ref:a.ref,title:a.title||e?.title||'Change',status:state,message});
 }
 db.snapshot.calendarRevision++;db.outcomes.unshift({decisionId:actions[0]?.decisionId,summary:steps.map(s=>s.message).join(' '),at:Date.now()});save();
 return {id:'run-'+(db.next++),status:'success',steps};
}
function reconcile({proposal={},contributionId}){
 const key='decision-'+crypto.randomUUID(),now=Date.now();
 const refs=new Set((proposal.operations||[]).flatMap(o=>o.ids||[]));
 const state={snapshotKey:db.snapshot.snapshotKey,threadType:'decision',decisionId:key,edits:{},created:[],drafts:[],selected:[],highlighted:[...refs],reply:proposal.reply||'',detail:proposal.detail||'',origin:'Your conversation',
  ...(proposal.proposalState||{}),contributions:[contributionId||key],priority:2,unread:true,saveVersion:now,transcript:[...(proposal.conversation||[]).slice(-8),{role:'assistant',text:proposal.reply||'',at:now,contributionId}]};
 Object.assign(state,{threadType:'decision',decisionId:key,snapshotKey:db.snapshot.snapshotKey});if(proposal.parentConversation)state.parentConversation=proposal.parentConversation;
 const decision={id:key,title:proposal.title||'Review this change',status:'open',state,eventIds:[],updated:now/1000};db.decisions[key]=decision;save();return {decision};
}

/* ---------- routing ---------- */
const json=(body,code=200)=>new Response(JSON.stringify(body),{status:code,headers:{'Content-Type':'application/json'}});
async function route(path,method,body){
 if(method==='GET'){
  if(path==='/api/bootstrap')return json({status:status(),snapshot:db.snapshot,review:{decisions:[],annotations:[]},decisions:list()});
  if(path==='/api/status')return json(status());
  if(path==='/api/calendar-state')return json(calendarState());
  if(path==='/api/snapshot')return json(db.snapshot);
  if(path==='/api/decisions')return json({decisions:list()});
  if(path==='/api/review')return json({decisions:[],annotations:[]});
  if(path==='/api/memory')return json({preferences:db.preferences,outcomes:db.outcomes.slice(0,8)});
  const job=path.match(/^\/api\/jobs\/([^/]+)$/);if(job)return jobs.has(job[1])?json(jobs.get(job[1])):json({error:'That request is no longer available.'},404);
  return json({error:'Not part of the demo.'},404);
 }
 if(path==='/api/command'||path==='/api/research'){
  const text=String(body.text||''),state=body.state||{};
  return json({jobId:startJob('command',async update=>{
   await sleep(320);const answer=respond(text,state);const early=answer.result.operations.filter(o=>['view','highlight','gaps'].includes(o.op));
   if(early.length)update({partial:{phase:'command',operations:early,calendarRevision:db.snapshot.calendarRevision}});
   await sleep(520);return answer;})},202);
 }
 if(path==='/api/decisions'){const d={...body,updated:Date.now()/1000};db.decisions[d.id]=d;save();return json({saved:true});}
 if(path==='/api/decisions/status'){const d=db.decisions[body.id];if(d){d.status=body.status;d.updated=Date.now()/1000;save();}return json({status:body.status,state:{}});}
 if(path==='/api/decisions/reconcile')return json(reconcile(body));
 if(path==='/api/actions/check')return json({jobId:startJob('check',async update=>{update({partial:{phase:'reading',message:'Reading the latest invitation…'}});await sleep(380);return check(body.actions||[]);})},202);
 if(path==='/api/actions/execute')return json({jobId:startJob('execute',async()=>{await sleep(420);return execute(body.ticket);})},202);
 if(path==='/api/calendar-range')return json({jobId:startJob('range',async()=>({status:'loaded',range:body.range,changedCount:0,calendarRevision:db.snapshot.calendarRevision}))},202);
 if(path==='/api/sync')return json({jobId:startJob('sync',async()=>({status:'ok'}))},202);
 if(path==='/api/jobs/cancel'){const job=jobs.get(body.id);if(job&&!['complete','error'].includes(job.status))job.status='cancelled';return json(job||{status:'cancelled'});}
 if(path==='/api/memory'){if('remove' in body)db.preferences=db.preferences.filter(p=>p.id!==body.remove);else if(body.body)db.preferences.push({id:db.next++,body:String(body.body).slice(0,500)});save();return json({preferences:db.preferences});}
 if(path==='/api/calendar-settings'){const prev=db.snapshot.calendarSettings;db.snapshot.calendarSettings={...prev,...body,colors:{...prev.colors,...(body.colors||{})}};const pol=db.snapshot.appearance?.policy;if(pol?.mode==='audience')for(const c of pol.categories)if(body.colors?.[c.id])c.color=body.colors[c.id];db.snapshot.appearance.revision++;save();return json(calendarState());}
 if(['/api/events/participation','/api/events/refresh'].includes(path))return json({...calendarState(),snapshot:db.snapshot});
 return json({error:'That part of Dayweave is not in the demo.'},422);
}
window.fetch=async(input,init={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(!url.pathname.startsWith('/api/'))return realFetch(input,init);
 let body={};try{body=init.body?JSON.parse(init.body):{};}catch{}
 return route(url.pathname,(init.method||'GET').toUpperCase(),body);
};
// Job updates arrive the way the server streams them.
window.EventSource=class{
 constructor(url){
  this.id=decodeURIComponent(new URL(url,location.href).pathname.split('/')[3]);this.closed=false;
  const send=job=>{if(!this.closed)setTimeout(()=>this.onmessage?.({data:JSON.stringify(job)}),0);};
  const set=listeners.get(this.id)||new Set();set.add(send);listeners.set(this.id,set);this.send=send;
  const job=jobs.get(this.id);setTimeout(()=>{if(job)send({...job});else this.onerror?.(new Event('error'));},0);
 }
 close(){this.closed=true;listeners.get(this.id)?.delete(this.send);}
};
