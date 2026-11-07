import {createAppearance} from './appearance.js';
import {ensureView,navigateView,viewFrame,viewSummary,normalizedScope,scopeDays,monthRange,monthGrid,monthCommand,explicitPeriod,dayCovered,traceInteraction} from './view_state.js';
import {monthMarkup} from './month.js';
import {timeScale,focusGeometry,localIntent,anticipateView,confirmationAnchor,sameConfirmation,clearIdleFocus,eventHasEnded,calendarSlots,expandedGapDays,calendarViewMode,eventCardPlacement} from './canvas.js';
import {floatingWorkspace} from './floating.js';
import {settingsCatalog,planSettings,undoPlan,summarize,describeValue,isColorKey,markerVariable,MARKER_DEFAULTS} from './settings_chat.js';
import {hydrateDecision,chooseAlternative,distinctAlternatives,relatedOverlaps} from './decision_lifecycle.js';
import {TZ,setTimezone,timezoneLabel,dayKey,minutes,timeLabel,onDay,layoutEvents} from './logic.js';
import {clone,newState,daySegments,weekDates,shiftDate,localISO,timeString,projectedEvents,findGaps,timeWindows,runOperations,quickCommand,checkpoint,pruneSelection,focusContext} from './workspace.js';
import {canEdit,canRespond,organizerLabel,permissionLabel,participationLabel,importanceLabel,locationLabel,isOpen,decisionRefs,safeWebUrl,meetingLink,conferenceLabel,eventPlace,googleEventUrl} from './event_facts.js';
import {makeDecision,actionBundle,includedActions,adaptContext,proposalSignature,applyModelResponse,sharedConflicts,serializeDecision,visibleProposal,captureView,returnToProposal,considerSuggestion,decisionFromSuggestion,suggestionFromDecision} from './decisions.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {decisionFeed} from './decision_feed.js';
import {isConversation,workStatus,saveProposalVersion,restoreProposalVersion,mergeConversationTurns,applyEarlyView,rollbackEarlyView,pruneConversations} from './threads.js';
const HOME='calendar-home',CLIENT_BUILD='elastic-categories-v3';
const operationTrace=ops=>ops.map(o=>Object.fromEntries(['op','mode','date','days','ids','excludeIds','range'].filter(k=>o[k]!==undefined).map(k=>[k,Array.isArray(o[k])?o[k].slice(0,60):o[k]])));
const rangeLoads=new Map();let rangeQueue=Promise.resolve();
let STORE='calendar-decisions-v3',PREFERENCES='calendar-settings-v4',lastCalendarPoll=0,mail=null,received=null,receivedRecords=[];
let queueTab='open',panelOpen=true,polling=false,lastConversationId='calendar-home',entryFresh=false,pillPinned=false;
let preferences={readAloud:false};
const CALENDAR_DEFAULTS={internalDomains:['fractional.ai'],internalAddresses:[],colors:{internal:'#2a78d6',external:'#eb6834',solo:'#1baf7a',decision:'#c1995b',proposed:'#2f5a45',pending:'#b79a60'}};
const calendarSettings=()=>{const shown=displaySnapshot(),settings=shown?.calendarSettings||CALENDAR_DEFAULTS;return shown?.appearance?.policy.mode==='audience'?{...settings,colors:Object.fromEntries(shown.appearance.policy.categories.map(c=>[c.id,c.color]))}:settings;};
function displaySnapshot(){
 const plan=state?.settingsProposal?.plan;if(!snapshot||!plan)return snapshot;
 const colors=Object.fromEntries(plan.filter(p=>isColorKey(p.key)).map(p=>[p.key.slice(7),p.after]));if(!Object.keys(colors).length)return snapshot;
 const settings=snapshot.calendarSettings||CALENDAR_DEFAULTS,appearance=snapshot.appearance;
 return {...snapshot,calendarSettings:{...settings,colors:{...settings.colors,...colors}},appearance:appearance&&appearance.policy.mode==='audience'?{...appearance,policy:{...appearance.policy,categories:appearance.policy.categories.map(c=>colors[c.id]?{...c,color:colors[c.id]}:c)}}:appearance};
}
const markerColors=()=>({...MARKER_DEFAULTS,...(displaySnapshot()?.calendarSettings?.colors||{})});
function colorPalette(hex){
 const rgb=hex.slice(1).match(/../g).map(part=>parseInt(part,16));
 const mix=(target,amount)=>'#'+rgb.map(value=>Math.round(value+(target-value)*amount).toString(16).padStart(2,'0')).join('');
 return {background:mix(255,.83),border:mix(255,.55),accent:hex,text:mix(0,.62)};
}
function applyCalendarColors(){
 for(const [category,color] of Object.entries(calendarSettings().colors)){
  if(!['internal','external','solo'].includes(category)||!/^#[0-9a-f]{6}$/i.test(color))continue;
  for(const [part,value] of Object.entries(colorPalette(color)))document.documentElement.style.setProperty(`--event-${category}-${part}`,value);
 }
 for(const [key,color] of Object.entries(markerColors()))if(markerVariable('colors.'+key)&&/^#[0-9a-f]{6}$/i.test(color))document.documentElement.style.setProperty(markerVariable('colors.'+key),color);
}
let snapshot,review={decisions:[]},state,status,scopes={},activeId,drawerType,reading=false,drag,suppressClick=false,toastTimer,saveTimer,checkTimer;
const requests=new Map(),checks=new Map();
let calendarScale,clockMinute;
function updateClock(){
 if(!snapshot||!calendarScale)return;
 const now=new Date(),iso=now.toISOString(),today=dayKey({start:iso}),minute=minutes(iso),label=timeLabel(iso);
 const track=$(`.day-track[data-date="${today}"]`);
 if(track&&!drag&&(minute<calendarScale.bands[0].start||minute>=calendarScale.bands.at(-1).end)){renderCalendar();return;}
 for(const heading of document.querySelectorAll('.day-heading'))heading.classList.toggle('today',heading.querySelector('[data-day]')?.dataset.day===today);
 for(const line of document.querySelectorAll('.now-line'))if(line.parentElement!==track)line.remove();
 if(track){
  let line=track.querySelector('.now-line');
  if(!line){line=document.createElement('div');line.className='now-line';track.append(line);}
  line.style.top=calendarScale.at(minute)+'px';line.setAttribute('aria-label','Current time '+label);
  line.innerHTML=`<span>${esc(label)}</span>`;
 }
 for(const el of document.querySelectorAll('[data-event][data-end]'))el.classList.toggle('past',eventHasEnded({end:el.dataset.end,allDay:el.dataset.allDay==='true'},now.getTime()));
 clockMinute=iso.slice(0,16);
}
// When the pill grows or tucks away, the hours re-fit at once so nothing lands under it.
const floating=floatingWorkspace($('.decision-panel'),$('.workspace'),$('#conversation-return'),{onReserve:()=>{if(snapshot&&state)renderCalendar();}});
function confirmation(){return entryFresh?null:confirmationAnchor(current(),proposalSignature(state),snapshot.calendarRevision||0);}
const appearance=createAppearance({api,waitJob,snapshot:()=>displaySnapshot(),days:()=>ensureView(state).mode==='month'?monthGrid(state.view.anchor):displayedDays(),render:()=>{applyCalendarColors();renderCalendar();},receive:receiveCalendar,openDrawer,closeDrawer,esc,colorPalette,toast,canvas:()=>SURFACE==='canvas'});
// Phone focus is presentation state: it never narrows a decision's calendar context.
const phoneLayout=matchMedia('(max-width: 760px)'),phoneFocus=new Map();
// Two surfaces share all logic. Canvas: a command bar, one headline line over the calendar and
// changes drafted on the grid. Docked: the side column. Choose with ?surface= or in Settings.
const SURFACE=(()=>{const asked=new URLSearchParams(location.search).get('surface');try{if(asked)localStorage.setItem('dayweave-surface',asked);return (asked||localStorage.getItem('dayweave-surface'))==='docked'?'docked':'canvas';}catch{return asked==='docked'?'docked':'canvas';}})();
function placeSurface(){
 if(SURFACE!=='canvas')return;
 $('.shell').classList.add('canvas');
 const headline=$('#headline');if(!$('#headline-main')){headline.innerHTML='<div id="headline-main" class="headline-main"></div>';headline.append($('#selection-bar'));}
 const slot=phoneLayout.matches?$('#bottom-command'):$('#topbar-command');if($('#composer').parentElement!==slot)slot.append($('#composer'));
 if(!$('#palette'))slot.insertAdjacentHTML('beforeend','<div id="palette" class="palette" role="listbox" aria-label="Suggestions and commands" hidden></div>');else slot.append($('#palette'));
 // Weekends are one step away (the day control beside the dates, or the palette), so the switch reads Day, Week, Month.
 $('[data-action="workweek"]').textContent='Week';$('[data-action="fullweek"]').hidden=true;
 $('#conversation-return').hidden=true;
 try{$('.shell').classList.toggle('no-mix',localStorage.getItem('dayweave-rail')==='hidden');}catch{}
}
placeSurface();phoneLayout.addEventListener('change',placeSurface);
let phoneRange=true,selectionMode=false,drawerReturnFocus,layoutScope,inspectionOwner,weekView=[];
function focusedDate(){
 const key=state.days.join(','),saved=phoneFocus.get(activeId);
 if(saved?.key===key&&state.days.includes(saved.date))return saved.date;
 const proposalDates=Object.values(state.edits||{}).filter(e=>e.start).map(e=>dayKey({start:e.start}));
 const highlightedDates=state.highlighted.map(ref=>eventByRef(ref)).filter(Boolean).map(dayKey);
 const date=[...proposalDates,...highlightedDates].find(d=>state.days.includes(d))||state.days[0];
 phoneFocus.set(activeId,{key,date});return date;
}
function displayedDays(){const v=ensureView(state);return v.mode==='month'?state.days:phoneLayout.matches&&!phoneRange?[state.draftDay||focusedDate()]:state.days;}
function chooseDay(date,reveal=true){
 const restoreFocus=$('#week-strip').contains(document.activeElement);phoneRange=false;
 if(!state.days.includes(date))apply([{op:'view',days:[date]}]);
 else{phoneFocus.set(activeId,{key:state.days.join(','),date});state.viewChangedSinceRequest ||= reveal;renderHeader();renderCalendar();}
 if(reveal){const refs=[...snapshot.events,...currentEvents()].filter(e=>onDay(e,date)&&(state.edits[e.ref]||e.created)).map(e=>e.ref);scrollCalendarToRefs(refs);}
 if(restoreFocus)$(`[data-focus-day="${date}"]`)?.focus({preventScroll:true});
}
function setCalendarView(mode){
 const v=ensureView(state),anchor=v.focusDate||(phoneLayout.matches?focusedDate():state.days[0]);
 phoneRange=mode!=='day';closeDrawer();selectionMode=false;
 apply([{op:'view',mode,date:anchor}]);
 if(['workweek','fullweek'].includes(mode))weekView=[...state.days];
}
function backView(){
 closeDrawer();selectionMode=false;
 if(phoneLayout.matches&&!phoneRange&&ensureView(state).mode!=='month'&&state.days.length>1){phoneRange=true;state.viewChangedSinceRequest=true;traceInteraction(state,'unfocus-day');render();return;}
 if(ensureView(state).expandedWeek){state.view.expandedWeek=null;state.view.focusDate=null;state.view.revision++;traceInteraction(state,'collapse-month');render();$('#calendar-scroll').scrollTop=0;return;}
 if(state.view.history.length){apply([{op:'view',mode:'back'}]);return;}
 showWeek(weekView);
}
function showWeek(days,{range=true}={}){
 const restoreFocus=document.activeElement?.id==='clear-selection'||document.activeElement?.id==='today-button';
 closeDrawer();selectionMode=false;phoneRange=range;state.attentionDays=[];
 if(state.pending)state.navigationReset=true;
 // This changes the view only. Draft text, decisions and their undo history survive.
 if(apply([{op:'view',days},{op:'clear',mode:'selection'},{op:'clear',mode:'gaps'}]))weekView=[...days];
 $('#calendar-scroll').scrollLeft=0;renderHeader();if(restoreFocus)$('#calendar-scroll').focus({preventScroll:true});
}
function expandDates(start){
 const gap=calendarSlots(state.days).find(slot=>slot.kind==='gap'&&slot.start===start);if(!gap)return;
 const days=expandedGapDays(state.days,gap);
 if(days){phoneRange=true;apply([{op:'view',days}]);$(`[data-day="${gap.start}"]`)?.focus({preventScroll:true});return;}
 // Very distant comparisons remain compact. Let the user choose a date rather
 // than adding an arbitrary slice of the interval or exceeding the view limit.
 openDrawer('Between these dates',`<p>${dateLabel(gap.start)} – ${dateLabel(gap.end)} · ${gap.count} compressed days</p><form id="compressed-date-form"><label for="compressed-date">Explore a date</label><input id="compressed-date" type="date" min="${gap.start}" max="${gap.end}" value="${gap.start}" required><div class="compressed-date-actions"><button type="submit" value="week">Show this week</button>${state.days.length<14?'<button type="submit" value="include">Include day</button>':''}</div></form>`,'dates');
}
function shiftCalendar(direction){
 if(ensureView(state).mode==='month'){const date=new Date(state.view.anchor+'T12:00Z');date.setUTCMonth(date.getUTCMonth()+direction);return apply([{op:'view',mode:'month',date:date.toISOString().slice(0,10)}]);}
 // A phone's day picker navigates weeks; the desktop day view navigates days.
 const delta=direction*(!phoneLayout.matches&&state.days.length===1?1:7),date=shiftDate(focusedDate(),delta);
 const days=state.days.map(d=>shiftDate(d,delta));phoneFocus.set(activeId,{key:days.join(','),date});
 if(calendarViewMode(days)==='workweek'||calendarViewMode(days)==='fullweek')showWeek(days,{range:!phoneLayout.matches||phoneRange});
 else {weekView=days.length===1?weekDates(days[0],weekView.length===7):weekView.map(d=>shiftDate(d,delta));apply([{op:'view',days}]);}
}
function renderDayPicker(){
 const el=$('#week-strip');el.hidden=!phoneLayout.matches||ensureView(state).mode==='month';
 if(el.hidden)return;
 const date=focusedDate(),days=state.days.length===1?weekDates(date,true):state.days;
 const changed=new Set([...Object.keys(state.edits).map(ref=>eventByRef(ref)).filter(Boolean).map(dayKey),...Object.values(state.edits).filter(e=>e.start).map(e=>dayKey({start:e.start})),...state.created.map(dayKey)]);
 const events=currentEvents();
 el.innerHTML=calendarSlots(days).map(slot=>{if(slot.kind==='gap')return `<button class="day-picker-gap" data-expand-dates="${slot.start}" aria-label="${slot.count} compressed ${slot.count===1?'day':'days'}. Explore ${dateLabel(slot.start)} through ${dateLabel(slot.end)}"><span>···</span><small>${slot.count}d</small></button>`;const d=slot.date;return `<button data-focus-day="${d}" class="${d===date&&!phoneRange?'active':''} ${changed.has(d)?'has-proposal':''}" aria-pressed="${d===date&&!phoneRange}" aria-label="${dateLabel(d)}${changed.has(d)?', has proposed changes':''}"><span>${dateLabel(d,{weekday:'short'})}</span><strong>${dateLabel(d,{day:'numeric'})}</strong><i class="${events.some(e=>onDay(e,d))?'has-events':''}" aria-hidden="true"></i></button>`;}).join('');
}
const inOverview=()=>isConversation(current());
const decisions=()=>Object.values(scopes).filter(d=>!isConversation(d));
const openDecisions=()=>decisions().filter(isOpen);
const dateFormats=new Map(),dateLabel=(d,options={weekday:'short',month:'short',day:'numeric'})=>{const key=JSON.stringify(options);let format=dateFormats.get(key);if(!format){format=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...options});dateFormats.set(key,format);}return format.format(new Date(d+'T12:00:00Z'));};
const current=()=>scopes[activeId];
const decision=()=>({...(review.decisions.find(d=>d.id===activeId)||{}),title:current()?.title,days:state.days});
const allEvents=()=>[...snapshot.events,...state.created],eventByRef=ref=>allEvents().find(e=>e.ref===ref);
const human=text=>String(text||'').replace(/\be\d+\b/g,ref=>eventByRef(ref)?.title||'this meeting');
const activeIds=()=>state.selected.length?state.selected:state.highlighted;
const currentEvents=()=>inOverview()||state.source||current().status==='needs_review'||['dismissed','obsolete','later','done','waiting'].includes(current().status)?snapshot.events:projectedEvents(snapshot.events,visibleProposal(snapshot,state));
const actionName=c=>{const ev=c.ref&&snapshot?.events?.find(e=>e.ref===c.ref),series=c.scope==='series'?' series':'';
 if(c.kind==='remove')return ev&&!ev.organizerSelf?'Remove from my calendar'+series:'Delete hold'+series;
 if(c.kind==='create')return c.eventType==='focusTime'?'Add focus time':c.eventType==='outOfOffice'?'Add out of office':c.attendees?.length?'Invite':'Add hold';
 return ({decline:'Decline'+series,accept:'Accept'+series,tentative:'Mark tentative'+series,move:'Move',resize:'Resize',cancel:'Cancel for everyone'+series,email:'Send message',request:'Ask to move'}[c.kind]||'Change');};
async function api(path,data){const res=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-Calendar-Session':status?.csrf||''}:undefined,body:data?JSON.stringify(data):undefined});const result=await res.json();if(res.status===401&&result.login){location.assign(result.login);throw Error('Sign in to continue.');}if(status?.user?.id&&res.headers.get('X-Calendar-Account')&&res.headers.get('X-Calendar-Account')!==status.user.id){location.reload();throw Error('Account changed. Reloading.');}if(!res.ok)throw Error(result.error||'The request could not finish.');return result;}
async function waitJob(id,onUpdate){
 const result=job=>{onUpdate?.(job);if(job.status==='complete')return job.result;if(job.status==='cancelled')throw Error('Stopped');if(job.status==='error')throw Error(job.error);return undefined;};
 return new Promise((resolve,reject)=>{
  let finished=false,failures=0,stream=null;
  const end=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);stream?.close();error?reject(error):resolve(value);};
  const timer=setTimeout(()=>end(Error('The request is taking too long. It is saved; stop or retry.')),600000);
  const poll=async()=>{while(!finished){try{const value=result(await api('/api/jobs/'+id));if(value!==undefined)return end(null,value);}catch(error){if(!/fetch|network/i.test(error.message))return end(error);}await new Promise(r=>setTimeout(r,1000));}};
  // The stream is where hosted chat turns actually run, so reconnect it rather than switching to polling.
  const open=()=>{if(finished)return;stream=new EventSource('/api/jobs/'+encodeURIComponent(id)+'/stream');
   stream.onmessage=e=>{failures=0;try{const value=result(JSON.parse(e.data));if(value!==undefined)end(null,value);}catch(error){end(error);}};
   stream.onerror=()=>{stream.close();if(finished)return;failures++;if(failures<=5)setTimeout(open,Math.min(4000,400*failures));else poll();};};
  open();
 });
}

async function saveScope(scope){scope.state.saveVersion=Math.max(Date.now(),(scope.state.saveVersion||0)+1);try{await api('/api/decisions',serializeDecision(scope));}catch(error){setStatus('Could not save · '+error.message);}}
function persist(serverDelay=350){if(!current())return;current().state=state;try{localStorage.setItem(STORE,JSON.stringify({snapshotKey:snapshot.snapshotKey,activeId,lastConversationId,uiVersion:7,scopes:Object.fromEntries(Object.values(scopes).map(d=>[d.id,serializeDecision(d)]))}));}catch{setStatus('Browser storage is full. Decisions are also saved on the server.');}clearTimeout(saveTimer);const scope=current();saveTimer=setTimeout(()=>saveScope(scope),serverDelay);}
function setStatus(text){if($('#request-status'))$('#request-status').textContent=text;}
let toastUndo=null;
function toast(text,{undo}={}){const el=$('#toast');toastUndo=undo||null;el.innerHTML=`<span>${esc(text)}</span>${undo?'<button type="button" data-toast-undo>Undo</button>':''}`;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;toastUndo=null;},undo?7000:4000);}
function say(text){if(!reading||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(human(text));u.rate=1.05;window.speechSynthesis.speak(u);}
function record(scope,role,text,extra={}){scope.state.transcript.push({role,text:human(text),at:Date.now(),...extra});scope.state.transcript=scope.state.transcript.slice(-40);}
function animateReply(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=inOverview()?$('#conversation-panel'):$('#decision-content');el.animate([{opacity:.4,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});}
function revealCalendar(refs){
 if(phoneLayout.matches&&!phoneRange){const target=currentEvents().find(e=>refs.includes(e.ref)&&state.days.includes(dayKey(e)));if(target&&dayKey(target)!==focusedDate())chooseDay(dayKey(target),false);}
 scrollCalendarToRefs(refs);
}
function scrollCalendarToRefs(refs){
 const region=$('#calendar-scroll'),bounds=region.getBoundingClientRect();
 const targets=[...document.querySelectorAll('.event[data-ref],.event[data-source-ref]')].filter(el=>refs.includes(el.dataset.ref||el.dataset.sourceRef));
 if(!targets.length)return;
 const first=targets.map(el=>el.getBoundingClientRect()).sort((a,b)=>a.top-b.top)[0];
 const inset=$('.calendar-head')?.getBoundingClientRect().height||48;
 const top=first.top<bounds.top+inset||first.bottom>bounds.bottom?Math.max(0,region.scrollTop+first.top-bounds.top-inset-8):region.scrollTop;
 const left=first.left<bounds.left+58||first.right>bounds.right?Math.max(0,region.scrollLeft+first.left-bounds.left-62):region.scrollLeft;
 region.scrollTo({top,left,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function render(){current().state=state;persist();applyCalendarColors();renderHeader();renderCalendar();renderAssistant();renderSelection();floating.schedule({avoid:true});renderHeadline();appearance.rail();}
function renderHeader(){
 $('#mail-button').hidden=!status?.hosted;
 const viewMode=ensureView(state).mode==='month'?'month':phoneLayout.matches&&!phoneRange?'day':ensureView(state).mode;
 $('#phone-view').hidden=!phoneLayout.matches;$('#phone-view').value=viewMode;
 if(layoutScope!==activeId){$('#proposal-details').open=false;layoutScope=activeId;}
 const shownDays=displayedDays(),nextDay=shiftDate(shownDays.at(-1),1),addDay=$('#include-next-day');
 addDay.dataset.includeDay=nextDay;addDay.textContent='＋ '+dateLabel(nextDay);addDay.setAttribute('aria-label','Show '+dateLabel(nextDay));
 addDay.disabled=shownDays.length>=14;addDay.title=addDay.disabled?'Up to 14 days can be shown together':'Show '+dateLabel(nextDay)+' alongside these dates';
 const first=state.days[0],last=state.days.at(-1),sameMonth=first.slice(0,7)===last.slice(0,7);
 $('#date-title').textContent=viewMode==='month'?dateLabel(state.view.anchor,{month:'long',year:'numeric'}):phoneLayout.matches?dateLabel(focusedDate(),{month:'long',year:'numeric'}):state.days.length===1?dateLabel(first,{month:'long',day:'numeric'}):`${dateLabel(first,{month:'long',day:'numeric'})}–${dateLabel(last,sameMonth?{day:'numeric'}:{month:'short',day:'numeric'})}`;
 for(const action of ['day','workweek','fullweek','month']){const active=action===viewMode||(SURFACE==='canvas'&&action==='workweek'&&viewMode==='fullweek');const button=$(`[data-action="${action}"]`);button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 for(const [action,direction] of [['previous-week','Previous'],['next-week','Next']]){const label=`${direction} ${viewMode==='month'?'month':!phoneLayout.matches&&state.days.length===1?'day':'week'}`;$(`[data-action="${action}"]`).setAttribute('aria-label',label);$(`[data-action="${action}"]`).title=label;}
 $('[data-action="undo"]').disabled=!state.undo.length;$('[data-action="redo"]').disabled=!state.redo.length;
 const compareLabel=state.source?'Show proposal':'Show current calendar';$('#compare-button').textContent=phoneLayout.matches?(state.source?'Proposal':'Current'):compareLabel;$('#compare-button').setAttribute('aria-label',compareLabel);$('#compare-button').setAttribute('aria-pressed',String(state.source));
 const previous=state.view.history.at(-1),backLabel=state.view.expandedWeek?'Back to month':previous?`Back to ${previous.mode==='month'?'month':previous.mode==='day'?'day':['workweek','fullweek'].includes(previous.mode)?'week':'dates'}`:'Back to week';
 $('#clear-selection').hidden=!previous&&!state.view.expandedWeek&&!activeIds().length&&!state.gapMinutes&&!selectionMode&&['workweek','fullweek'].includes(viewMode);
 $('#clear-selection').textContent=backLabel;$('#clear-selection').title=previous?'Restore the previous view; keep this question and highlights':'Return to the regular week';
 $('#clear-focus').hidden=!activeIds().length&&!state.gapMinutes;$('#include-next-day').hidden=viewMode==='month';
 const unknown=displayedDays().filter(d=>!dayCovered(snapshot,d)).length,loading=[...rangeLoads.values()].some(x=>x.status==='loading');
 $('#coverage-note').textContent=unknown?(loading?'Loading calendar…':status.google?.calendar?'Some dates not loaded · Retry':'Some dates not loaded · Connect Google'):'';
 const thisWeek=weekDates(dayKey({start:new Date().toISOString()}));
 $('#today-button').hidden=JSON.stringify(state.days)===JSON.stringify(thisWeek)&&viewMode==='workweek';
 const hasProposal=isOpen(current())&&current().status!=='needs_review'&&actionBundle(snapshot,state).length>0;
 $('#compare-button').hidden=!hasProposal;
 $('[data-action="undo"]').hidden=!state.undo.length&&!state.redo.length;$('[data-action="redo"]').hidden=!state.undo.length&&!state.redo.length;
 $('#select-toggle').setAttribute('aria-pressed',String(selectionMode));
 const context=selectionMode?(phoneLayout.matches?'Tap events to add or remove':'Click events to add or remove'):state.source||['dismissed','obsolete','later','done','waiting'].includes(current().status)?'Current calendar':state.responseNote?'Exploring · proposal unchanged':hasProposal?`Proposal ${state.proposalHistory?.at(-1)?.number||1} · preview`:state.gapMinutes?`${state.gapKind==='alone'?'Time alone':'Unbooked time'} · ${state.gapMinutes} min or more`:state.selectionLabel|| (phoneLayout.matches&&!phoneRange?dateLabel(focusedDate(),{weekday:'long',month:'short',day:'numeric'}):'');
 $('#context-label').textContent=context;$('#context-label').title=context;
 $('.calendar-main').classList.toggle('has-proposal',hasProposal);$('.shell').classList.toggle('selecting',selectionMode);
 if(SURFACE==='canvas'){
  // The headline already says what a proposal or an answer is about and has its own way out,
  // so this row keeps only what the headline does not offer: compare, undo, a real way back, and notices.
  const voiced=!!headlineView();
  if(voiced){$('#clear-focus').hidden=true;if(!previous&&!state.view.expandedWeek&&!selectionMode&&['workweek','fullweek'].includes(viewMode))$('#clear-selection').hidden=true;}
  // "Current calendar" only means something while a proposal is being compared against it.
  if((hasProposal&&!state.source&&!selectionMode)||(voiced&&context&&context===state.selectionLabel)||(context==='Current calendar'&&!state.source)){$('#context-label').textContent='';$('#context-label').title='';}
  const shown=id=>!$(id).hidden;
  $('.context-bar').classList.toggle('quiet',!$('#context-label').textContent&&!$('#coverage-note').textContent&&!shown('#compare-button')&&!shown('[data-action="undo"]')&&!shown('#clear-focus')&&!shown('#clear-selection'));
 }
 const count=decisionFeed(decisions(),receivedRecords).filter(d=>d.bucket==='open').length;$('#open-count').innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="6" width="16" height="15" rx="3"/><path d="M8 3h8M8 11h8M8 16h5"/></svg><span>Saved</span><b>${count}</b>`;$('#open-count').setAttribute('aria-label',`${count} saved suggestions and decisions`);$('#open-count').setAttribute('aria-expanded',String(drawerType==='decisions'));const waiting=count-(SURFACE==='canvas'&&hasProposal&&!entryFresh?1:0);$('#open-count').classList.toggle('empty',waiting<1);if(SURFACE==='canvas'&&$('#open-count b'))$('#open-count b').textContent=waiting;measureTopbar();
 $('.shell').classList.toggle('panel-hidden',!panelOpen);$('.shell').classList.toggle('overview',inOverview());
 const sync=status.sync||{},age=sync.lastSuccessAt?Math.floor((Date.now()/1000-sync.lastSuccessAt)/60):null;$('#sync-status').textContent=!sync.connected?'Snapshot':sync.error?'Sync paused':sync.running?'Syncing…':age===null?'Waiting for sync':age<1?'Synced just now':`Synced ${age}m ago`;
 $('#sync-status').classList.toggle('offline',!sync.connected||!!sync.error);
 if($('#model-status')){$('#model-status').hidden=!usingTest();$('#model-status').textContent=testLabel();}
 // The footer speaks up only when something needs saying: sync trouble or the test model.
 $('.legend').classList.toggle('attention',(!!sync.connected&&!!sync.error)||usingTest());
 $('.timezone').textContent=TZ.split('/').at(-1).replaceAll('_',' ')+' · '+timezoneLabel(state.days[0]+'T12:00Z');
 renderDayPicker();
}
function draftKeys(){return new Map((snapshot&&state&&isOpen(current())&&!inOverview()?actionBundle(snapshot,state):[]).filter(a=>a.ref).map(a=>[a.ref,a.key]));}
function eventClasses(e){
 const focus=state.inspected?[state.inspected]:activeIds(),classes=['event'];if(openDecisions().some(d=>decisionRefs(d).includes(e.ref)))classes.push('has-decision');if(e.audience==='solo')classes.push('solo');if(e.audience==='external')classes.push('external');
 if(eventHasEnded(e))classes.push('past');
 if(e.response==='declined'&&!e.previewAccepted&&!e.previewTentative)classes.push('source-declined');
 if(e.previewKind||e.created)classes.push('proposed');if(e.previewDeclined)classes.push('proposed-decline');if(e.pending)classes.push('pending');
 if(state.highlighted.includes(e.ref))classes.push('highlighted');if(state.selected.includes(e.ref))classes.push('selected');if(state.inspected===e.ref)classes.push('inspected');if(reviewRef===e.ref)classes.push('review-focus');
 if(focus.length&&!focus.includes(e.ref)&&!e.previewKind)classes.push('dimmed');return classes;
}
function eventStatus(e){return e.previewKind==='remove'?(e.organizerSelf?'Delete hold · proposed':'Remove from calendar · proposed'):e.previewKind==='cancel'?'Cancel for everyone · proposed':e.previewDeclined?'Proposed decline':e.pending?'Proposed time · needs agreement':e.previewKind==='move'?'Proposed move':e.previewKind==='resize'?'Proposed duration':e.previewAccepted?'Proposed accept':e.previewTentative?'Proposed tentative':e.created?'New hold · proposed':e.response==='declined'?'Declined':'';}
// While someone types, the calendar renders a preview copy of the state: it can widen
// days, open hours and light up events, but nothing it changes is kept or saved.
function renderCalendar(){drawCalendar();}
function revealDay(date){const region=$('#calendar-scroll'),track=$(`.day-track[data-date="${date}"]`);if(!track)return;const a=region.getBoundingClientRect(),b=track.getBoundingClientRect();if(b.left<a.left+54||b.right>a.right)region.scrollTo({left:Math.max(0,region.scrollLeft+b.left-a.left-58),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
let headGuess=0,headRedraw=false;
// The view switch sits a fixed gap left of whatever is in the corner, so the request bar never shifts.
function measureTopbar(){if(SURFACE==='canvas'&&!phoneLayout.matches)$('.topbar').style.setProperty('--actions-width',$('.topbar-actions').offsetWidth+'px');}
function drawCalendar(){
 const oldRects=new Map([...document.querySelectorAll('.event[data-ref]')].map(el=>[el.dataset.ref,el.getBoundingClientRect()]));
 const view=ensureView(state);calendarScale=null;
 $('#calendar').innerHTML=view.mode==='month'?monthMarkup({snapshot,state,events:currentEvents(),esc,dateLabel,eventClasses,eventStatus,timeline:timelineMarkup,phone:phoneLayout.matches,windows:[...(state.gapMinutes?timeWindows(snapshot.events,visibleProposal(snapshot,state),snapshot,state.gapMinutes):[]),...(state.draftWindows||[])],focusDates:state.draftFocus||[],loading:[...rangeLoads.values()].some(x=>x.status==='loading')}):timelineMarkup(displayedDays());
 // Set the final palette before layout reads can start a transition from default colors.
 appearance.paint();
 const head=view.mode==='month'?0:$('#calendar .calendar-head')?.offsetHeight||0;
 if(head&&Math.abs(head-headGuess)>6&&!headRedraw){headRedraw=true;try{drawCalendar();}finally{headRedraw=false;}return;}
 updateClock();
 const overflows=$('#calendar-scroll').scrollWidth>$('#calendar-scroll').clientWidth+1;$('.calendar-main').classList.toggle('wide-range',overflows);$('#range-hint').hidden=!overflows;
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const el of document.querySelectorAll('.event[data-ref]')){const before=oldRects.get(el.dataset.ref),after=el.getBoundingClientRect();if(el.dataset.ref!==state.inspected&&before&&Math.abs(before.x-after.x)+Math.abs(before.y-after.y)>2){const dx=before.x-after.x,dy=before.y-after.y,far=Math.abs(dx)>40,lift=far?-Math.min(70,Math.abs(dx)*.12+20):0;el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:`translate(${dx*.45}px,${dy*.45+lift}px)`,offset:.5},{transform:'translate(0,0)'}],{duration:far?560:320,easing:'cubic-bezier(.3,.7,.2,1)'});}}
 ensureVisibleCoverage();
 if(drawerType==='event')requestAnimationFrame(positionEventCard);
}
function timelineMarkup(days){
 const events=currentEvents(),timed=events.filter(e=>!e.allDay&&days.some(d=>onDay(e,d)));
 const segments=days.flatMap(date=>daySegments(timed,date));
 const now=new Date(),today=dayKey({start:now.toISOString()}),nowMinute=minutes(now.toISOString());
 const from=Math.min(9*60,...segments.map(e=>Math.floor(e.startMinute/60)*60),...(days.includes(today)?[Math.floor(nowMinute/60)*60]:[]));
 const to=Math.max(18*60,...segments.map(e=>Math.ceil(e.endMinute/60)*60),...(days.includes(today)?[Math.min(1440,Math.ceil((nowMinute+1)/60)*60)]:[]));
 const focusState=isOpen(current())||inOverview()||state.draftRanges?state:{...state,selected:[],highlighted:[],attentionDays:[],edits:{}};
 const geometry=focusGeometry([...snapshot.events,...events],state.inspected?{...focusState,selected:[state.inspected]}:focusState,days);
 // When something is in focus, the whole working day should fit on screen with the focus
 // expanded, so the hours shrink before anything important scrolls out of view.
 headGuess=$('#calendar .calendar-head')?.offsetHeight||116;
 const available=$('#calendar-scroll').clientHeight-headGuess;
 let hour=phoneLayout.matches?76:Math.max(64,Math.min(88,Math.floor(available/((to-from)/60))));
 if(!phoneLayout.matches&&geometry.times.length)hour=Math.max(40,Math.min(hour,Math.floor(available/timeScale(from,to,geometry.times,1).height)));
 // Fisheye: an opened event grows in place, in its own column and time span, to hold its whole card.
 const lensEvent=lensTarget(timed,days),lens=lensEvent?{start:minutes(lensEvent.start),end:dayKey(lensEvent)!==dayKey({start:lensEvent.end})?1440:minutes(lensEvent.end),pixels:Math.max(lensHeight,200)}:null;
 calendarScale=timeScale(from,to,geometry.times,hour,lens);const height=calendarScale.height,y=iso=>calendarScale.at(minutes(iso));
 const slots=calendarSlots(days),lensDay=lensEvent?dayKey(lensEvent):null;
 const columns=slots.map(slot=>slot.kind==='gap'?'42px':lensDay?(slot.date===lensDay?`minmax(${LENS_WIDTH}px,3.2fr)`:'minmax(56px,.7fr)'):`minmax(${phoneLayout.matches&&days.length>1?115:70}px,${geometry.weights[days.indexOf(slot.date)]}fr)`).join(' ');
 const gapLabel=slot=>slot.count===1?dateLabel(slot.start):`${slot.count} days · ${dateLabel(slot.start)} – ${dateLabel(slot.end)}`;
 const gapHeading=slot=>{const label=gapLabel(slot),action=state.days.length+slot.count<=14?'Show':'Explore';return `<div class="date-gap-heading"><button data-expand-dates="${slot.start}" aria-label="${action} ${esc(label)}; currently compressed" title="${action} ${esc(label)}"><span>${slot.count===1?dateLabel(slot.start,{weekday:'short'}):slot.count}</span><strong>${slot.count===1?dateLabel(slot.start,{day:'numeric'}):'days'}</strong><i aria-hidden="true">‹ ›</i></button></div>`;};
 const rules=Array.from({length:Math.ceil((to-from)/60)},(_,i)=>`<i class="hour-rule" style="top:${calendarScale.at(from+i*60)}px"></i>`).join('');
 const gaps=!state.source&&state.gapMinutes?timeWindows(snapshot.events,visibleProposal(snapshot,state),snapshot,state.gapMinutes):[];
 let html=`<div class="calendar-grid ${days.length===1?'single':''}" style="--count:${days.length};--hour:${hour}px;--day-columns:${columns}" data-from="${from}" data-hour="${hour}"><div class="calendar-head"><div class="zone-head">${esc(timezoneLabel(days[0]+'T12:00Z'))}</div>`;
 html+=slots.map(slot=>{if(slot.kind==='gap')return gapHeading(slot);const d=slot.date;return `<div class="day-heading ${geometry.weights[days.indexOf(d)]>1?'focus-day':''} ${today===d?'today':''}"><button data-day="${d}" title="Focus ${dateLabel(d)}"><span>${dateLabel(d,{weekday:'short'})}</span><strong>${dateLabel(d,{day:'numeric'})}</strong></button></div>`;}).join('');
 // An all-day event is one bar across the consecutive days it covers; a compressed strip ends a bar.
 const runs=[];
 for(const e of events.filter(e=>e.allDay)){let from=null;slots.forEach((slot,i)=>{const on=slot.kind==='day'&&onDay(e,slot.date);if(on&&from===null)from=i;if(from!==null&&(!on||i===slots.length-1)){runs.push({e,from,to:on?i:i-1});from=null;}});}
 runs.sort((a,b)=>a.from-b.from||(b.to-b.from)-(a.to-a.from));const lanes=[];
 for(const run of runs){let lane=lanes.findIndex(end=>end<run.from);if(lane<0)lane=lanes.length;lanes[lane]=run.to;run.lane=lane;}
 if(runs.length){
  html+='<div class="all-day-label" style="grid-row:2;grid-column:1">all day</div>'+slots.map((slot,i)=>`<div class="${slot.kind==='gap'?'date-gap-all-day':'all-day-cell'}" ${slot.kind==='gap'?'aria-hidden="true"':''} style="grid-row:2;grid-column:${i+2};min-height:${lanes.length*26+8}px"></div>`).join('');
  html+=runs.map(({e,from,to,lane})=>`<button class="all-day-event span ${esc(e.audience||'internal')} ${eventHasEnded(e)?'past':''} ${state.inspected===e.ref?'inspected':''}" style="grid-row:2;grid-column:${from+2}/${to+3};margin-top:${4+lane*26}px" data-event="${e.ref}" data-end="${esc(e.end)}" data-all-day="true" aria-pressed="${state.inspected===e.ref||state.selected.includes(e.ref)}" title="${esc(e.title)}">${esc(e.title)}</button>`).join('');
 }
 html+='</div>';
 html+=`<div class="time-axis" style="height:${height}px">${Array.from({length:Math.ceil((to-from)/60)},(_,i)=>{const h=from/60+i;return `<span class="time-label" style="top:${calendarScale.at(from+i*60)}px">${h===0?'12 AM':h===12?'12 PM':h>12?h-12+' PM':h+' AM'}</span>`;}).join('')}</div>`;
 for(const slot of slots){
  if(slot.kind==='gap'){html+=`<div class="date-gap-track" data-gap-start="${slot.start}" style="height:${height}px"><span>${esc(gapLabel(slot))} · compressed</span></div>`;continue;}
  const date=slot.date;
  const known=dayCovered(snapshot,date);
  html+=`<div class="day-track ${geometry.weights[days.indexOf(date)]>1?'focus-day':''} ${new Date(date+'T12:00Z').getUTCDay()%6===0?'weekend':''} ${!known?'unknown':''}" data-date="${date}" style="height:${height}px">${rules}`;
  if(!known)html+='<span class="unknown-label">Not loaded<br>Availability unknown</span>';
  html+=gaps.filter(g=>g.date===date).map(g=>`<button class="gap" ${g.kind==='solo'?`data-event="${g.ref}"`:`data-gap="${g.start}"`} style="top:${y(g.start)}px;height:${calendarScale.at(minutes(g.start)+g.minutes)-y(g.start)}px" title="${g.kind==='solo'?'Inspect booked solo time':'Preview a hold'} at ${timeLabel(g.start)}">${g.minutes}m ${g.kind==='solo'?'alone · includes holds':'unbooked'}</button>`).join('');
  if(isOpen(current())&&!state.source&&current().status!=='needs_review')for(const e of daySegments(snapshot.events,date).filter(e=>['move','resize'].includes(visibleProposal(snapshot,state).edits[e.ref]?.kind))){html+=`<div class="event ghost" data-source-ref="${e.ref}" style="top:${calendarScale.at(e.startMinute)}px;height:${Math.max(19,calendarScale.at(e.endMinute)-calendarScale.at(e.startMinute))}px;left:1%;width:97%"><span class="event-title">${SURFACE==='canvas'?'':'Current · '}${esc(e.title)}</span><span class="event-status">${canEdit(e)?'Current time':'Current time · still booked'}</span></div>`;}
  for(let e of layoutEvents(daySegments(timed,date))){
   const h=calendarScale.at(e.endMinute)-calendarScale.at(e.startMinute),classes=eventClasses(e);if(h<43)classes.push('compact');
   if(lensEvent&&e.ref===lensEvent.ref){classes.push('lens-host');e={...e,lane:0,lanes:1};}
   const title=`${e.title} · ${timeLabel(e.start)}–${timeLabel(e.end)}${eventStatus(e)?' · '+eventStatus(e):''} · Organizer: ${organizerLabel(e)} · ${permissionLabel(e)} · ${locationLabel(e)} · ${participationLabel(e)}`;
   html+=`<button class="${classes.join(' ')}" data-ref="${e.ref}" data-event="${e.ref}" data-end="${esc(e.end)}" aria-label="${esc(title)}" aria-pressed="${state.selected.includes(e.ref)||state.inspected===e.ref}" title="${esc(title)}" style="top:${calendarScale.at(e.startMinute)}px;height:${Math.max(19,h-2)}px;left:calc(${e.lane/e.lanes*100}% + 3px);width:calc(${100/e.lanes}% - 6px)"><span class="event-title">${SURFACE!=='canvas'&&(e.previewKind||e.created)?'Proposed · ':''}${esc(e.title)}</span><span class="event-time">${esc(timeLabel(e.start))}${e.lanes<3?' – '+esc(timeLabel(e.end)):''}</span><span class="event-status">${esc(eventStatus(e))}</span>${state.eventNotes?.[e.ref]&&activeIds().includes(e.ref)?`<span class="event-note">${esc(state.eventNotes[e.ref])}</span>`:''}${eventPlace(e)?`<span class="event-location">${esc(eventPlace(e))}</span>`:''}</button>`;
   if(SURFACE==='canvas'&&!state.source){const key=draftKeys().get(e.ref);if(key){const aside=state.excluded?.includes(key);html+=`<button class="draft-toggle ${aside?'aside':''}" data-draft-toggle="${esc(key)}" aria-label="${aside?'Bring back this change':'Set this change aside'}" title="${aside?'Bring back this change':'Set this change aside'}" style="top:${calendarScale.at(e.startMinute)+3}px;left:calc(${(e.lane+1)/e.lanes*100}% - 27px)">${aside?'↺':'×'}</button>`;}}
  }html+='</div>';
 }
 return html+'</div>';
}
function stepMeta(a){const e=a.kind==='create'?null:eventByRef(a.ref);if(a.start)return `${e?dateLabel(dayKey(e))+' '+timeLabel(e.start)+' → ':''}${dateLabel(dayKey({start:a.start}))} ${timeLabel(a.start)}–${timeLabel(a.end)}`;return e?`${dateLabel(dayKey(e),{weekday:'short'})} · ${timeLabel(e.start)}`:a.to||'Choose recipient';}
function executionLabel(actions){if(!actions.length)return 'Choose steps';const count=n=>n===1?'meeting':n+' meetings';if(actions.every(a=>a.kind==='decline'))return `Decline ${count(actions.length)}`;if(actions.every(a=>a.kind==='accept'))return `Accept ${count(actions.length)}`;if(actions.every(a=>a.kind==='cancel'))return `Cancel ${count(actions.length)} for everyone`;if(actions.length>1&&actions.every(a=>a.kind==='remove'))return `Remove ${actions.length} from my calendar`;if(actions.length===1)return actions[0].kind==='request'?'Send request':actions[0].kind==='move'?'Move meeting':actionName(actions[0]);return `Do these ${actions.length} steps`;}
function chatMarkup(scope,limit=12,omitLatest=false){
 let turns=scope.state.transcript||[];if(omitLatest&&turns.at(-1)?.role==='assistant')turns=turns.slice(0,-1);
 return (turns.length>limit?'<button class="earlier-chat" data-action="history">Earlier conversation ↗</button>':'')+turns.slice(-limit).map(m=>`<div class="chat-turn ${m.role==='you'?'you':'assistant'}"><small>${m.role==='you'?'You':'Assistant'}</small><p>${esc(m.text.slice(0,320))}</p>${m.text.length>320||m.detail?`<details><summary>Details</summary><p>${esc(m.detail||m.text.slice(320))}</p></details>`:''}${m.decisionId&&scopes[m.decisionId]?`<button class="thread-link" data-decision="${esc(m.decisionId)}">${esc(scopes[m.decisionId].title)} <span>Open decision ↗</span></button>`:''}</div>`).join('');
}
// The headline is the assistant's one voice in the canvas surface: status while it works, the
// answer when it is done, a proposal's summary with its controls, and a step-through review.
let reviewIndex=null,reviewRef=null,whyOpen=false;
function headlineView(){
 const scope=current(),w=workStatus(scope),all=actionBundle(snapshot,state),included=includedActions(snapshot,state);
 const proposal=!entryFresh&&!inOverview()&&isOpen(scope)&&scope.status!=='needs_review'&&all.length>0;
 const last=state.transcript.findLast?.(m=>m.role==='assistant')||[...state.transcript].reverse().find(m=>m.role==='assistant');
 const money=v=>v==null?'':v<0.01?' · under 1¢':` · about ${(v*100).toFixed(1)}¢`;
 if(state.settingsProposal)return {kind:'proposal',text:summarize(state.settingsProposal.plan),buttons:'<button class="primary" data-action="apply-settings">Apply</button><button data-action="close-thread">Cancel</button>'};
 const progress=state.checkProgress;
 if(progress?.executing){const done=progress.steps.filter(x=>!['pending','unknown'].includes(x.status)).length;
  return {kind:'working',text:done<progress.steps.length?`Applying ${done} of ${progress.steps.length}`:`Applied ${progress.steps.length}`,meta:progress.steps.map(x=>`<i class="step-dot ${esc(x.status)}" title="${esc(x.title)}"></i>`).join('')};}
 if(state.executionRunning)return {kind:'working',text:'Checking the latest calendar before applying'};
 if(state.pending&&state.work?.replyDraft)return {kind:'working',text:human(state.work.replyDraft),meta:esc(w.label),buttons:'<button data-action="stop">Stop</button>'};
 if(state.pending)return {kind:'working',text:w.label+(w.elapsed>=3?` · ${w.elapsed}s`:''),meta:w.detail?esc(w.detail):'',buttons:'<button data-action="stop">Stop</button>'};
 // Receipts and errors stay in history, but a closed conversation has no headline.
 if(entryFresh)return null;
 if(w.kind==='error')return {kind:'error',text:w.detail||'Could not finish.',buttons:'<button data-action="retry">Retry</button><button data-action="close-thread" aria-label="Dismiss">×</button>'};
 if(!inOverview()&&scope.status==='needs_review'){
  const changed=(state.sourceChanges||[]).slice(0,3).map(c=>esc(c.title)+(c.change==='removed'?' was removed':' changed')).join(' · ');
  return {kind:'error',text:'The calendar changed since this was prepared.',meta:changed||'Review it against the current calendar before applying.',buttons:'<button class="primary" data-action="recheck">Review changes</button><button data-action="close-thread" aria-label="Dismiss">×</button>'};
 }
 if(proposal&&state.responseNote){
  const note=state.responseNote;
  return {kind:'answer',text:human(note.text),meta:`${included.length} ${included.length===1?'change is':'changes are'} still drafted · nothing applied`,
   buttons:`${note.detail?`<button data-action="toggle-why" aria-expanded="${whyOpen}">${whyOpen?'Hide':'Why'}</button>`:''}<button data-action="return-proposal">Back to proposal</button><button data-action="close-thread">Discard</button>`,why:note.detail?`<p>${esc(human(note.detail))}</p>`:''};
 }
 if(proposal&&reviewIndex!==null){
  const i=Math.min(reviewIndex,all.length-1),a=all[i],e=eventByRef(a.ref),aside=state.excluded?.includes(a.key);
  return {kind:'review',text:`${actionName(a)} ${a.title||a.subject||''}`,meta:`Change ${i+1} of ${all.length} · ${esc(stepMeta(a))} · ${esc(actionConsequence(a,e))}${aside?' · set aside':''}`,
   buttons:`<button data-action="review-prev" aria-label="Previous change" ${i?'':'disabled'}>‹</button><button data-action="review-next" aria-label="Next change" ${i<all.length-1?'':'disabled'}>›</button><button data-draft-toggle="${esc(a.key)}">${aside?'Bring back':'Set aside'}</button><button data-action="review-done" class="primary">Done</button>`};
 }
 if(proposal){
  const primary=$('#review-actions .primary')?.outerHTML||'',notice=$('#review-actions .execution-notice')?.outerHTML||'';
  const asideCount=all.length-included.length,checking=progress?.message&&!state.check?.ticket?esc(progress.message):'';
  const rows=included.map(a=>state.check?.steps.find(r=>r.key===a.key)),blocked=rows.filter(r=>r&&r.status!=='ready'&&!r.message?.startsWith('Connect G'));
  const account=status.google?.account?.toLowerCase();
  const findings=[...new Set(rows.flatMap(r=>r?.availability?.people||[]).filter(p=>p.status!=='free').map(p=>`${p.resource?'Room '+p.name:p.email?.toLowerCase()===account?'You':p.name} ${p.status}`))];
  const refresh=included.find((a,i)=>rows[i]&&rows[i].status!=='ready'&&rows[i].latest&&a.ref);
  const facts=[blocked.length?`<span class="headline-blocked">Can’t apply yet: ${esc([...new Set(blocked.map(r=>r.message||'Review this step.'))].join(' '))}</span>${refresh?` <button type="button" class="headline-inline" data-refresh-event="${esc(refresh.ref)}">Refresh event</button>`:''}`:'',findings.length?esc(findings.slice(0,3).join(', ')+(findings.length>3?` and ${findings.length-3} more`:'')):''].filter(Boolean).join(' · ');
  const changes=included.map((a,i)=>`<li><button type="button" class="headline-change" data-step-details="${esc(a.key)}" title="${['email','request'].includes(a.kind)?'Edit this message':'Open this event'}"><strong>${esc(actionName(a))} ${esc(a.title||a.subject||'')}</strong> <span>${esc(stepMeta(a))} · ${esc(actionConsequence(a,eventByRef(a.ref)))}</span>${['email','request'].includes(a.kind)?' <em>Edit</em>':''}${rows[i]&&rows[i].status!=='ready'&&rows[i].message?` <span class="headline-blocked">${esc(rows[i].message)}</span>`:''}</button></li>`).join('');
  return {kind:'proposal',text:human(state.reply||scope.title),meta:`${included.length} ${included.length===1?'change':'changes'} drafted on the calendar${asideCount?` · ${asideCount} set aside`:''}${checking?' · '+checking:''}${facts?' · '+facts:''}`,
   buttons:`<button data-action="toggle-why" aria-expanded="${whyOpen}">${whyOpen?'Hide':'Why'}</button>${all.length>1?'<button data-action="review-changes">Review</button>':''}<button data-action="close-thread">Discard</button>${primary}`,
   why:`${state.detail?`<p>${esc(human(state.detail))}</p>`:''}<ul class="headline-changes">${changes}</ul>${notice}`};
 }
 if(state.result&&['done','waiting','needs_review'].includes(scope.status)){
  const ok=state.result.steps.filter(x=>['success','awaiting_reply'].includes(x.status)).length;
  return {kind:'done',text:ok===state.result.steps.length?`Done. ${state.result.steps.map(x=>x.message).filter(Boolean)[0]||'Applied.'}${ok>1?` ${ok} changes applied.`:''}`:`${ok} of ${state.result.steps.length} applied. Some steps need attention.`,
   buttons:`<button data-action="toggle-why">${whyOpen?'Hide':'Details'}</button><button data-action="close-thread" aria-label="Dismiss">×</button>`,
   why:`<ul class="headline-changes">${state.result.steps.map(x=>`<li><strong>${['success','awaiting_reply'].includes(x.status)?'✓':'!'} ${esc(x.title)}</strong> <span>${esc(x.message||x.status)}</span></li>`).join('')}</ul>`};
 }
 if(last&&!entryFresh){
  const m=state.lastMetrics;
  return {kind:'answer',text:human(last.text),meta:m?.totalMs&&m.model===testLabel()?`${esc(testLabel())} · ${(m.totalMs/1000).toFixed(1)}s`:'',buttons:`${last.detail?`<button data-action="toggle-why">${whyOpen?'Hide':'Why'}</button>`:''}${suggestionMarkup(current(),last)}<button data-action="close-thread" aria-label="Dismiss">×</button>`,why:last.detail?`<p>${esc(human(last.detail))}</p>`:''};
 }
 return null;
}
function renderHeadline(){
 if(SURFACE!=='canvas'||!state||!snapshot||!current())return;
 const box=$('#headline-main'),view=headlineView(),selecting=!$('#selection-bar').hidden;
 $('#headline').hidden=!view&&!selecting;$('#headline').dataset.kind=view?.kind||'selection';
 const markup=view?`<div class="headline-row"><span class="headline-mark ${view.kind}" aria-hidden="true"></span><div class="headline-text"><p>${esc(view.text)}</p>${view.meta?`<small>${view.meta}</small>`:''}</div><div class="headline-actions">${view.buttons||''}</div></div>${view.why&&whyOpen?`<div class="headline-why">${view.why}</div>`:''}`:'';
 if(box.innerHTML!==markup)box.innerHTML=markup;
}
function focusReview(){
 const all=actionBundle(snapshot,state);if(!all.length){reviewIndex=null;reviewRef=null;return renderHeadline();}
 reviewIndex=Math.max(0,Math.min(reviewIndex??0,all.length-1));reviewRef=all[reviewIndex].ref||null;renderCalendar();renderHeadline();if(reviewRef)revealCalendar([reviewRef]);
}
function renderWork(){
 if(!current())return;queueMicrotask(renderHeadline);const w=workStatus(current()),el=$('#work-status');
 const draftReply=state.pending&&state.work?.replyDraft?`<p class="answer-text reply-draft">${esc(human(state.work.replyDraft))}</p>`:'';if(SURFACE!=='canvas'&&$('#pending-response').innerHTML!==draftReply&&(draftReply||$('#pending-response .reply-draft')))$('#pending-response').innerHTML=draftReply;
 const progress=state.checkProgress,box=$('#check-progress');box.hidden=entryFresh||!progress;
 if(progress?.executing){const icon={pending:'·',unknown:'…',success:'✓',awaiting_reply:'✓',failed:'!',skipped:'–'},done=progress.steps.filter(x=>!['pending','unknown'].includes(x.status)).length;
  box.innerHTML=`<strong>${done<progress.steps.length?`Applying ${done} of ${progress.steps.length}`:`Applied ${progress.steps.length}`}</strong><ul class="step-progress">${progress.steps.map(x=>`<li class="${esc(x.status)}"><i>${icon[x.status]||'·'}</i><span>${esc(x.title)}${x.message&&!['pending','unknown'].includes(x.status)?` <small>${esc(x.message)}</small>`:''}</span></li>`).join('')}</ul>`;}
 else box.textContent=progress?.message||'';
 $('#conversation-return span').textContent=state.pending?'Working…':state.executionRunning?'Applying…':'';$('.shell').classList.toggle('thinking',!!state.pending);
 el.hidden=entryFresh||(!state.pending&&!['error','stopped'].includes(w.kind)&&!state.executionRunning);
 const content=`<span class="work-dot ${w.kind}"></span><span><strong>${esc(w.label)}${w.elapsed>=3?` · ${w.elapsed}s`:''}</strong>${w.detail?`<small>${esc(w.detail)}</small>`:''}</span>${w.canStop?'<button data-action="stop">Stop</button>':w.canRetry?'<button data-action="retry">Retry</button>':''}`;
 if(el.innerHTML!==content)el.innerHTML=content;
 const all=Object.values(scopes),working=all.filter(d=>d.state.pending||d.state.executionRunning),unread=all.filter(d=>d.state.unread);
 $('#work-indicator').textContent=working.length?`${working.length} working`:unread.length?`${unread.length} ready`:'History';$('#work-indicator').classList.toggle('working',!!working.length);
 // On canvas, History sits in the palette; this only appears for work in another conversation.
 $('#work-indicator').classList.toggle('quiet',!Object.values(scopes).some(d=>d.id!==activeId&&(d.state.pending||d.state.executionRunning||d.state.unread)));measureTopbar();
 $('#composer-target').innerHTML='';
}
function showThreads(){
 const rows=Object.values(scopes).filter(d=>d.id===HOME||d.state.transcript.length||isOpen(d)).sort((a,b)=>Number(!!b.state.pending)-Number(!!a.state.pending)||Number(!!b.state.unread)-Number(!!a.state.unread));
 const markup=rows.map(d=>{const w=workStatus(d);return `<button class="thread-row" data-decision="${esc(d.id)}"><span class="work-dot ${w.kind}"></span><span><strong>${esc(d.title)}</strong><small>${esc(w.label)}${w.elapsed!==undefined?` · ${w.elapsed}s`:''}</small><p>${esc((d.state.lastInput||d.state.reply||'').slice(0,110))}</p></span><span>↗</span></button>`;}).join('');if(drawerType==='threads'&&$('#thread-list'))$('#thread-list').innerHTML=markup;else openDrawer('Conversation history',`<div id="thread-list">${markup}</div>`,'threads');
}
async function stopThinking(){
 const scope=current(),pending=scope.state.pendingJob;
 requests.set(scope.id,(requests.get(scope.id)||0)+1);rollbackEarlyView(scope,snapshot);scope.state.pending=false;scope.state.pendingJob=null;scope.state.attentionDays=[];scope.state.work={...scope.state.work,status:'cancelled'};scope.state.unread=false;
 if(activeId===scope.id){state=scope.state;render();setStatus('');}
 await saveScope(scope);
 try{if(pending)await api('/api/jobs/cancel',{id:pending.id});}catch(error){toast('Reply stopped here; could not reach the model to cancel: '+error.message);}
}
function showProposalHistory(){
 const versions=state.proposalHistory||[];openDrawer('Proposal versions',[...versions].reverse().map((v,i)=>{const bundle=actionBundle(snapshot,{...state,...v.proposal});return `<section class="proposal-version"><h3>Proposal ${v.number}${i===0?' · latest':''}</h3><p>${esc(v.reply||v.title)}</p>${bundle.map(a=>`<div><strong>${esc(actionName(a))} ${esc(a.title||a.subject)}</strong><small>${esc(stepMeta(a))}</small></div>`).join('')}${i?`<button data-restore-proposal="${v.number}">Use this version</button>`:''}</section>`;}).join(''),'versions');
}
function suggestionMarkup(scope,last){
 const idea=scope.state.suggestion,linked=scopes[last?.decisionId];
 if(idea)return `<div class="possible-change"><div><small>Possible change</small><span>${esc(idea.title)}</span></div><button data-action="review-suggestion" ${scope.state.pending?'disabled':''}>Review changes</button><button data-action="hide-suggestion" aria-label="Hide suggestion">×</button></div>`;
 if(!scope.state.hiddenSuggestion&&linked&&isOpen(linked))return `<button class="resume-decision" data-decision="${esc(linked.id)}">${esc(linked.title)} <span>Resume decision ↗</span></button>`;
 return '';
}
function briefMarkup(scope){
 const turns=scope.state.transcript,lastIndex=turns.findLastIndex(m=>m.role==='assistant'),last=turns[lastIndex];
 if(!last&&scope.state.pending)return '';
 if(!last)return '';
 return `<div class="current-answer"><p class="answer-text">${esc(last.text)}</p>${last.detail?`<details><summary>Details</summary><p>${esc(last.detail)}</p></details>`:''}${suggestionMarkup(scope,last)}</div>`;
}
function schedulingNotes(row,compact=false){
 const summarized=compact&&row?.availability?.people?.some(p=>p.status!=='free');
 const notes=[...new Set((row?.warnings||[]).filter(w=>!summarized||!['Availability could not be confirmed.','Overlaps another booking.'].includes(w.message)).map(w=>w.message))];
 return notes.length?`<div class="overlap-note">${notes.map(esc).join(' ')}</div>`:'';
}
function actionConsequence(action,event){
 const every=action.scope==='series'?' · every occurrence':'';
 if(action.kind==='decline')return (action.note?`Tells the organizer you won't attend, with your note: “${action.note}”`:'Tells the organizer you won\'t attend · stays on your calendar as declined')+every;
 if(['accept','tentative'].includes(action.kind))return 'Sends your RSVP to the organizer'+(action.note?` with your note: “${action.note}”`:'')+every;
 if(action.kind==='cancel')return 'Cancels it for every guest and emails them a cancellation'+every;
 if(action.kind==='remove')return (event&&!event.organizerSelf?'Takes it off your calendar · Google tells the organizer you declined':'Deletes your hold')+every;
 if(action.kind==='create'&&action.eventType==='focusTime')return 'Blocks focus time · declines new conflicting invitations';
 if(action.kind==='create'&&action.eventType==='outOfOffice')return 'Marks you out of office · declines conflicting meetings';
 if(action.kind==='create'&&action.attendees?.length)return `Invites ${action.attendees.length===1?action.attendees[0]:action.attendees.length+' people'}${action.meet?' · with a Google Meet link':''}`;
 if(action.kind==='request')return 'Ask the organizer · current booking stays until they change it';
 if(action.kind==='email')return `To ${action.to||'recipient not set'}`;
 if(['move','resize'].includes(action.kind))return event?.attendees?.some(p=>!p.self)?'Notifies attendees':'Only your calendar changes';
 return 'Adds a hold to your calendar';
}
function renderAssistant(){
 renderSettingsProposal();
 const hasContent=!!state.settingsProposal||(!entryFresh&&!!(state.pending||state.executionRunning||state.transcript.length||!inOverview()));
 $('.decision-panel').classList.toggle('composer-only',!hasContent);
 $('#queue-panel').hidden=true;$('#conversation-panel').hidden=!inOverview();$('#decision-content').hidden=inOverview();
 $('#command').placeholder=phoneLayout.matches?'Ask or change':'Ask or change anything';renderWork();renderQueue();
 $('#overview-reply').hidden=true;
 if(entryFresh||inOverview()){$('#conversation-panel').innerHTML=entryFresh?'':briefMarkup(current());$('#review-actions').innerHTML='';$('#pending-response').innerHTML='';return;}
 const scope=current(),all=actionBundle(snapshot,state),included=includedActions(snapshot,state),check=state.check;
 const note=state.responseNote;
 $('#decision-conversation').innerHTML=note?`<div class="followup-answer"><p>${esc(note.text)}</p>${note.detail?`<details><summary>Details</summary><p>${esc(note.detail)}</p></details>`:''}<button data-action="return-proposal">Review proposed change ↗</button></div>`:'';
 const versions=state.proposalHistory||[];$('#proposal-heading').innerHTML=all.length?`<span>${included.length} ${included.length===1?'action':'actions'}</span>${versions.length>1?'<button data-action="proposal-history">Earlier versions</button>':''}`:'';
 $('#assistant-label').textContent=scope.status==='done'?'COMPLETED':scope.status==='waiting'?'AWAITING REPLY':'';
 $('#assistant-title').textContent=all.length||note?'':scope.title;$('#decision-origin').innerHTML='';
 const noTimeChange=!all.length&&Object.values(state.edits).some(c=>['move','resize'].includes(c.kind));
 $('#assistant-detail').innerHTML=all.length||note?'':esc(human(noTimeChange?'Already at that time. No changes to apply.':state.reply||''));
 $('#proposal-rationale').innerHTML=`${state.reply?`<p>${esc(human(state.reply))}</p>`:''}${state.detail?`<p>${esc(human(state.detail))}</p>`:''}${state.receivedContext?`<button data-context-action="open" data-context-id="${esc(state.receivedContext.id)}">Source ↗</button>`:''}`;
 const overlaps=relatedOverlaps(snapshot,scope,decisions());
 const shared=sharedConflicts(scope,scopes);$('#shared-notice').innerHTML=scope.status==='needs_review'?`<div class="subtle-note">${(state.sourceChanges||[]).slice(0,3).map(c=>esc(c.title)+(c.change==='removed'?' was removed.':' changed.')).join('<br>')||'The calendar changed.'}<button data-action="recheck">Review changes →</button></div>`:shared.length?`<button class="shared-note" data-action="queue">Also involved in ${shared.length} other ${shared.length===1?'decision':'decisions'} ↗</button>`:'';
 $('#shared-notice').innerHTML+=overlaps.length?`<button class="shared-note" data-action="queue">Proposed times overlap ${overlaps.length} other decision(s). You can keep both. ↗</button>`:'';
 const alternatives=distinctAlternatives(snapshot,scope);
 $('#decision-options').innerHTML=alternatives.length?`<details><summary>Other options (${alternatives.length})</summary>${alternatives.map(a=>`<div class="option-row"><strong>${esc(a.title)}</strong><p>${esc(a.reason)}</p><button data-option="${esc(a.id)}" ${state.pending||state.executionRunning?'disabled':''}>Preview this option</button></div>`).join('')}</details>`:'';
 $('#decision-options').innerHTML+=(state.evidenceNotes||[]).map(n=>`<details><summary>New context</summary><p>${esc(n.text)}</p><p>${esc(n.detail||'')}</p></details>`).join('');
 $('#steps').innerHTML=all.map(a=>{
  const enabled=included.some(x=>x.key===a.key),row=check?.steps.find(r=>r.key===a.key),avail=row?.availability;
  const recipient=a.kind==='request'||a.kind==='email',event=eventByRef(a.ref);const facts=event?`<button class="step-facts" data-event="${esc(event.ref)}"><span>${esc(event.audience==='solo'?'Your hold':organizerLabel(event))} · ${esc(['decline','accept','tentative'].includes(a.kind)?'Respond to invitation':permissionLabel(event))}</span>${event.audience==='solo'&&!event.location?'':`<span>${esc(locationLabel(event))}${event.audience==='solo'?'':' · '+esc(participationLabel(event))}</span>`}</button>`:'';
  return `<section class="step ${enabled?'':'excluded'}"><label class="step-line"><input type="checkbox" data-step="${a.key}" ${enabled?'checked':''} ${state.executionRunning?'disabled':''}><span><strong>${esc(actionName(a))}</strong><span class="step-title">${esc(a.title||a.subject)}</span><small>${esc(stepMeta(a))}</small></span><button type="button" data-step-details="${a.key}" aria-label="Edit ${esc(a.title||'message')}">↗</button></label>${facts}${recipient?`<button class="message-preview" data-step-details="${a.key}">From: ${esc(state.check?.connection?.account||status.google?.account||'Not connected')}<br>To: ${esc(a.to)}<br>Subject: ${esc(a.subject)}<br>${esc(a.body)}</button>`:''}${row?.status==='blocked'&&!row.message?.startsWith('Connect Google')?`<div class="step-warning">${esc(row.message)}${row.latest?` <button data-refresh-event="${esc(a.ref)}">Refresh event</button>`:''}</div>`:''}${schedulingNotes(row)}${row?.afterRemovals?.length?`<p class="step-prerequisite">After removing ${row.afterRemovals.map(esc).join(', ')}.</p>`:''}${avail?`<details class="availability"><summary>${avail.status==='free'?(row?.afterRemovals?.length?'✓ Available after the earlier removal':'✓ Everyone checked is free'):avail.status==='busy'?'A calendar is busy':'Availability not confirmed'}</summary>${avail.people.map(p=>`<div><span>${esc(p.name)}${p.resource?' · room':''}${p.optional?' · optional':''}</span><b class="${p.status}">${p.status}</b></div>`).join('')}</details>`:''}</section>`;
 }).join('');
 $('#proposal-details').hidden=!all.length;
 const consequences=[...new Set(included.map(a=>actionConsequence(a,eventByRef(a.ref))))],sharedConsequence=included.length>1&&consequences.length===1;
 $('#impact-summary').classList.toggle('multi',included.length>1);
 $('#impact-summary').innerHTML=included.map(a=>{
  const row=check?.steps.find(r=>r.key===a.key),e=eventByRef(a.ref),people=row?.availability?.people||[];
  const badges=people.filter(p=>p.status!=='free').map(p=>`<span class="finding ${esc(p.status)}">${esc(p.resource?'Room: '+p.name:p.email?.toLowerCase()===status.google?.account?.toLowerCase()?'You':p.name)} · ${esc(p.status)}</span>`).join('');
  return `<div class="impact-item"><strong>${esc(actionName(a))} ${esc(a.title||a.subject)}</strong><small class="impact-time">${esc(stepMeta(a))}</small>${sharedConsequence?'':`<small>${esc(actionConsequence(a,e))}</small>`}${a.kind==='request'?`<small>To ${esc(a.to||'recipient not set')}</small>`:''}${badges}${schedulingNotes(row,true)}</div>`;
 }).join('');if(sharedConsequence)$('#impact-summary').innerHTML+=`<p class="impact-common">${esc(consequences[0])}</p>`;
 const blockers=included.map(a=>check?.steps.find(r=>r.key===a.key)).filter(r=>r&&r.status!=='ready');
 const needsConnection=blockers.some(r=>r.message?.startsWith('Connect Google')||r.message?.startsWith('Connect Gmail'));
 const blockedNote=blockers.length&&!needsConnection?`<p class="execution-notice" role="status">${[...new Set(blockers.map(r=>r.message||'Review this step.'))].map(esc).join(' ')} <button data-action="show-blocked-steps">Details</button></p>`:'';
 const receipt=state.result;
 $('#execution-result').innerHTML=receipt?`<div class="receipt">${receipt.steps.map(s=>`<div><span class="receipt-icon">${['success','awaiting_reply'].includes(s.status)?'✓':'!'}</span><span><strong>${esc(s.title)}</strong><small>${esc(s.message||s.status)}</small></span></div>`).join('')}</div>`:'';
 $('#review-actions').innerHTML=all.length?`${blockedNote}<button data-action="${needsConnection?'about':'execute'}" class="primary" ${state.executionRunning||state.pending||state.source||scope.status==='needs_review'||!included.length||(!needsConnection&&blockers.length)?'disabled':''}>${state.executionRunning?'Applying…':needsConnection?'Connect Google to apply':esc(executionLabel(included))}</button>`:'';
 // An answer to a follow-up isn't assent to the previous, potentially unrelated proposal.
 if(note){$('#impact-summary').innerHTML='';$('#decision-options').innerHTML='';$('#proposal-details').hidden=true;$('#review-actions').innerHTML='';$('#shared-notice').innerHTML='';}
 if(['dismissed','obsolete','later','done','waiting'].includes(scope.status)){$('#impact-summary').innerHTML='';$('#proposal-details').hidden=true;$('#review-actions').innerHTML=`<span class="closed-label">${{dismissed:'Left as is',obsolete:'No longer needed',later:'For later',done:'Completed',waiting:'Awaiting reply'}[scope.status]}</span>${['dismissed','later'].includes(scope.status)?'<button data-action="reopen">Reopen</button>':''}`;$('#steps').innerHTML='';$('#assistant-detail').innerHTML='';$('#proposal-heading').innerHTML='';$('#shared-notice').innerHTML='';$('#decision-conversation').innerHTML='';}
 if(scope.status==='needs_review')$('#steps').innerHTML='';
 $('#pending-response').innerHTML=state.pendingResponse?'<button data-action="use-response">Review the assistant’s alternative ↗</button>':'';
 if(state.pending)setStatus('');
}
function selectionGroups(ids){const events=ids.map(ref=>snapshot.events.find(e=>e.ref===ref)).filter(Boolean),guests=e=>e.attendees?.some(p=>!p.self&&!p.resource);
 return {invites:events.filter(e=>canRespond(e)&&!e.organizerSelf),removable:events.filter(e=>!e.allDay||!e.organizerSelf).filter(e=>!(e.organizerSelf&&guests(e))),hosted:events.filter(e=>e.organizerSelf&&guests(e)),events};}
function toggleEventSelection(ref){
 const removing=state.selected.includes(ref),ids=removing?[ref]:[...new Set([...(state.inspected?[state.inspected]:[]),ref])];
 // An inspected meeting already looks selected. Carry it into the explicit set,
 // then close its card so it cannot hide or dim the rest of that set.
 closeDrawer();selectionMode=true;
 apply([{op:'select',ids,mode:removing?'remove':'add'}]);
}
let selectionNote=null;
function renderSelection(){queueMicrotask(renderHeadline);const ids=activeIds(),el=$('#selection-bar');el.hidden=!state.selected.length||(!selectionMode&&state.selected.length===1);if(el.hidden){selectionNote=null;el.innerHTML='';return;}
 const g=selectionGroups(ids),n=k=>k.length===ids.length?'':` (${k.length} of ${ids.length})`;
 const buttons=[];
 if(g.invites.length){buttons.push(`<button data-action="bulk-decline">Decline${n(g.invites)}</button>`,`<button data-action="bulk-decline-note">Decline with a note${n(g.invites)}</button>`,`<button data-action="bulk-accept">Accept${n(g.invites)}</button>`);}
 if(g.removable.length)buttons.push(`<button data-action="bulk-remove" class="danger">Remove from my calendar${n(g.removable)}</button>`);
 if(g.hosted.length)buttons.push(`<button data-action="bulk-cancel" class="danger">Cancel for everyone${n(g.hosted)}</button>`);
 buttons.push('<button data-action="move-set">Move…</button>','<button data-action="ask-selection">Ask about these</button>');
 const note=selectionNote!==null?`<form class="note-row" id="selection-note-form"><input id="selection-note" maxlength="500" placeholder="Note to the organizer" value="${esc(selectionNote)}" aria-label="Note to the organizer"><button type="submit">Decline${n(g.invites)}</button></form>`:'';
 el.innerHTML=`<span class="selection-count">${ids.length} selected</span>${buttons.join('')}<button data-action="clear-selection" aria-label="Clear selected events">Clear ×</button>${note}`;
 if(selectionNote!==null)requestAnimationFrame(()=>$('#selection-note')?.focus());}
function apply(ops,reply='',options={}){
 if((entryFresh||inOverview()||['done','waiting','dismissed','obsolete','later'].includes(current().status))&&ops.some(o=>['edit','create','draft'].includes(o.op))){const event=eventByRef(ops.find(o=>o.ids?.length)?.ids[0]);newDecision();if(event)current().title=event.title;}
 if(state.executionRunning)return toast('These steps are executing. Start another decision to keep working.');
 try{if(state.pendingJob&&ops.some(o=>o.op==='view'))state.pendingJob.manualView=true;const before=proposalSignature(state),beforeView=viewSummary(state);state=runOperations(state,ops.filter(o=>o.op!=='review'),snapshot.events,{decisionId:activeId,...options});
  if(before!==proposalSignature(state)){state.responseNote=null;state.returnView=null;state=adaptContext(state,snapshot.events);state.check=null;state.result=null;state.executionId=null;current().status='open';scheduleCheck();}
  if(ops.some(o=>o.op==='edit'&&['move','resize'].includes(o.action))&&!actionBundle(snapshot,state).length)reply='Already at that time. No changes to apply.';
  if(ops.some(o=>['undo','redo'].includes(o.op)))reply=actionBundle(snapshot,state).length?'Here is the proposed change.':'No changes to apply.';
  if(ops.some(o=>o.op==='view'))state.viewChangedSinceRequest=true;
  if(reply){state.reply=reply;state.detail='';}current().state=state;traceInteraction(state,'interaction',{beforeView,operations:operationTrace(ops)});saveProposalVersion(current());render();return true;
 }catch(e){traceInteraction(state,'operation-rejected',{operations:operationTrace(ops),reason:e.message});toast(e.message);setStatus(e.message);return false;}
}
function activate(id,{reveal=true}={}){entryFresh=false;if(reveal)floating.tuck(false);panelOpen=true;selectionMode=false;if(!scopes[id])return;if(current()){current().state=state;saveScope(current());}activeId=id;state=adaptContext(current().state,snapshot.events);state.freshEntry=false;if(inOverview())lastConversationId=id;state.unread=false;$('#command').value=state.composer||'';resizeComposer();closeDrawer();render();$('.assistant-stage').scrollTop=0;revealCalendar(Object.keys(state.edits));scheduleCheck();setStatus('');}
function directAction(kind,ids,extra={}){
 const g=selectionGroups(ids),targets=(['decline','accept','tentative'].includes(kind)?g.invites:kind==='remove'?g.removable:kind==='cancel'?g.hosted:[]).map(e=>e.ref);
 if(!targets.length)return toast(kind==='cancel'?'Only meetings you organize with guests can be cancelled for everyone.':kind==='remove'?'Meetings you organize with guests need Cancel for everyone.':'RSVP applies only to invitations from other people.');
 const skipped=ids.length-targets.length,label=`${actionName({kind,ref:targets[0]})} ${targets.length===1?snapshot.events.find(e=>e.ref===targets[0])?.title||'meeting':targets.length+' events'}`;
 const d=makeDecision(snapshot,{title:label,ids:targets,days:[...state.days],operations:[{op:'edit',action:kind,ids:targets,...extra}]});scopes[d.id]=d;selectionNote=null;activate(d.id);
 if(skipped)toast(`${skipped} selected ${skipped===1?'event does':'events do'} not fit this action and ${skipped===1?'was':'were'} left as is.`);
 execute();}
function newConversation(){const d=makeDecision(snapshot,{title:'New conversation'});d.state.threadType='conversation';d.state.days=[...state.days];d.state.view=clone(ensureView(state));scopes[d.id]=d;activate(d.id);$('#command').focus();}
// Opening input changes the presentation, not the saved decision or its consent.
function openEntry(){
 if(!state.composer?.trim()&&!state.pending&&!state.executionRunning){entryFresh=true;state.freshEntry=true;}
 else entryFresh=!!state.freshEntry;
 renderAssistant();setStatus('');persist();floating.tuck(false);
}
function beginFreshConversation(){
 const previous=current(),context={id:previous.id,title:previous.title,conversation:clone(state.transcript.slice(-4)),proposal:actionBundle(snapshot,state),focusContext:focusContext(state),status:previous.status};
 const focused=focusedDate(),view=clone({view:ensureView(state),questionScope:activeIds().length?state.questionScope:normalizedScope(null,displayedDays()),selected:state.selected,highlighted:state.highlighted,selectionLabel:state.selectionLabel,focusContext:state.focusContext});
 const summary=state.contextSummary||'';
 state.composer='';state.freshEntry=false;
 newConversation();Object.assign(state,view);phoneFocus.set(activeId,{key:state.days.join(','),date:focused});state.previousContext=context;state.contextSummary=summary;
}
function showPillMenu(){
 openDrawer('Options',`${status.testModel?.available?`<div class="model-choice-slot pill-model">${modelChoiceMarkup()}</div>`:''}<div class="pill-options"><button data-action="new">New topic</button><button data-action="history">History</button><button data-action="pin-conversation" aria-pressed="${pillPinned}">${pillPinned?'Unpin':'Pin'} in place</button>${!entryFresh&&isOpen(current())?'<button data-action="later">Later</button><button data-action="dismiss">Leave as is</button>':''}</div>`,'pill-options');
}
async function backToConversation(){
 const d=current();if(isConversation(d))return;
 let origin=scopes[d.state.parentConversation];
 if(!origin){origin=makeDecision(snapshot,{title:d.title,days:[...state.days]});origin.state.threadType='conversation';origin.state.transcript=clone(d.state.transcript);origin.state.lastInput=d.state.lastInput;scopes[origin.id]=origin;d.state.parentConversation=origin.id;await saveScope(d);}
 mergeConversationTurns(origin,d);if(['done','waiting','obsolete'].includes(d.status))origin.state.incomingSuggestion=null;
 origin.state.suggestion=['done','waiting','obsolete'].includes(d.status)?null:suggestionFromDecision(d,d.status==='needs_review'?-1:(snapshot.calendarRevision||0));origin.state.hiddenSuggestion=false;
 await saveScope(origin);activate(origin.id);
}
async function openSuggestion(id,viewing){
 const origin=scopes[id];if(!origin?.state.suggestion)return;
 const suggestion=origin.state.suggestion,assessment=suggestion.assessment||{},source=origin.state.incomingSuggestion?origin.state.receivedContext:null;
 const requestVersion=requests.get(id);
 let d;
 const linked=scopes[suggestion.linkedDecisionId];
 if(linked&&!assessment.decision?.targetId&&!source){d=decisionFromSuggestion(snapshot,origin,linked);await saveScope(d);}
 else{
  const response=await api('/api/decisions/reconcile',{proposal:{...assessment,title:suggestion.title,reply:suggestion.state.reply,detail:suggestion.state.detail,
   proposalState:suggestion.state,parentConversation:origin.id,conversation:origin.state.transcript},source,
   contributionId:source?`mcp-${source.id}-${source.version}`:(suggestion.contributionId||=crypto.randomUUID())});
  if(!response.decision){origin.state.suggestion=null;await saveScope(origin);return;}
  d=hydrateDecision(snapshot,response.decision);
  if(source)await api('/api/context/'+source.id+'/take-up',{version:source.version,calendarRevision:snapshot.calendarRevision||0,state:d.state,decisionId:d.id});
 }
 if(origin.state.suggestion!==suggestion||requests.get(id)!==requestVersion){if(!linked)await api('/api/decisions/status',{id:d.id,status:'dismissed'});return;}
 d.state.days=[...new Set([...origin.state.days,...d.state.days])].sort().slice(0,14);d.state.unread=!viewing;saveProposalVersion(d);scopes[d.id]=d;
 origin.state.suggestion.linkedDecisionId=d.id;origin.state.unread=false;
 saveScope(d);saveScope(origin);
 if(viewing&&activeId===origin.id&&origin.state.suggestion===suggestion&&requests.get(id)===requestVersion){
  if(origin.state.composer){d.state.composer=origin.state.composer;origin.state.composer='';saveScope(origin);}
  // Persistence/reconciliation can take time. A newer topic keeps the screen.
  if(activeId===origin.id){activate(d.id,{reveal:!floating.tucked});animateReply();return;}
 }
 d.state.unread=true;persist();renderWork();toast(`${d.title} · ready to review`);
}
async function finishConversationReply(scope,response,signature,navigation=null){
 const viewing=activeId===scope.id;
 const colorRequest=response.operations.find(o=>o.op==='appearance');
 if(colorRequest)response={...response,interaction:'discuss',operations:response.operations.filter(o=>o.op!=='appearance')};
 response=takeSettings(scope,response);
 considerSuggestion(snapshot,scope,response);scope.state.hiddenSuggestion=false;
 const known=new Set(snapshot.events.map(e=>e.ref));const viewOnly={...response,operations:response.operations.filter(o=>(['scope','view','highlight','select','gaps','inspect','compare'].includes(o.op)||(o.op==='clear'&&['gaps','selection'].includes(o.mode)))&&(!o.ids?.length||o.ids.every(id=>known.has(id))))};
 const applied=applyModelResponse(scope,viewOnly,signature,snapshot.events);includeReferencedDays(scope.state);
 if(navigation)Object.assign(scope.state,navigation);
 if(applied&&viewOnly.operations.some(o=>o.op==='gaps')){
  const windows=timeWindows(snapshot.events,visibleProposal(snapshot,scope.state),snapshot,scope.state.gapMinutes),days=scopeDays(scope.state.questionScope,scope.state.days),unknown=days.filter(d=>!dayCovered(snapshot,d)).length;
  const kind=scope.state.gapKind==='alone'?'alone (including booked solo time)':'unbooked';
  response.reply=`${windows.length?`${windows.length} ${windows.length===1?'window':'windows'} of ${scope.state.gapMinutes} minutes or more ${kind}`:`No ${kind} windows of ${scope.state.gapMinutes} minutes or more`}${unknown?` in loaded dates; ${unknown} ${unknown===1?'day is':'days are'} still unknown`:''}.`;scope.state.reply=response.reply;
 }
 traceInteraction(scope.state,'reply-applied',{requestId:scope.state.requestId,operations:operationTrace(viewOnly.operations),navigationPreserved:!!navigation});
 scope.state.pending=false;scope.state.pendingJob=null;scope.state.work={...scope.state.work,status:'complete'};scope.state.unread=!viewing;
 if(scope.id===HOME)scope.title='Calendar';
 record(scope,'assistant',response.reply,{detail:response.detail||''});saveScope(scope);
 const stillViewing=activeId===scope.id;
 if(response.interaction==='propose'&&scope.state.suggestion&&!navigation){if(stillViewing)state=scope.state;await openSuggestion(scope.id,stillViewing);return;}
 if(stillViewing){state=scope.state;render();setStatus('');if(applied)revealCalendar(activeIds());animateReply();say(response.reply);if(colorRequest)appearance.open(colorRequest.body||scope.state.lastInput,colorRequest.ids||activeIds());}
 else{persist();renderWork();toast(`${scope.title} · reply ready`);}
}
function newDecision(){const d=makeDecision(snapshot);d.state.days=[...state.days];d.state.view=clone(ensureView(state));d.state.questionScope=clone(state.questionScope);d.state.selected=[...state.selected];d.state.highlighted=[...state.highlighted];scopes[d.id]=d;activate(d.id);$('#command').focus();}
function home(toggle=false){if(inOverview()&&toggle){panelOpen=!panelOpen;renderHeader();renderCalendar();return;}const days=[...state.days];activate(HOME);state.days=days;render();}
function nextDecision(){const next=decisionFeed(decisions(),receivedRecords).find(d=>d.bucket==='open'&&d.id!==activeId);if(next?.kind==='context')received.work(next.id).catch(error=>toast(error.message));else if(next)activate(next.id);else home();}
async function disposition(value,id=activeId){
 const scope=scopes[id];if(!scope||scope.state.executionRunning)return;
 if(value!=='open'){requests.set(id,(requests.get(id)||0)+1);const job=scope.state.pendingJob;scope.state.pending=false;scope.state.pendingJob=null;scope.state.checkProgress=null;checks.delete(id);if(job)api('/api/jobs/cancel',{id:job.id}).catch(()=>{});}
 await saveScope(scope);
 const saved=await api('/api/decisions/status',{id,status:value});scope.status=saved.status;scope.state={...scope.state,...saved.state};if(id===activeId)state=scope.state;
 if(id===activeId&&value!=='open'){state.responseNote=null;state.returnView=null;render();restPill();toast(value==='dismissed'?'Left as is · calendar unchanged':'Saved for later · return from Saved',{undo:async()=>{await disposition('open',id);activate(id);}});}
 else if(id===activeId){state=scope.state;render();}else render();
}
function compactState(scope){const s=scope.state,p=isConversation(scope)&&s.suggestion?s.suggestion.state:s,days=displayedDays(),view={...viewSummary(s),...(days.length===1?{mode:'day'}:{}),start:days[0],end:shiftDate(days.at(-1),1),dates:days};return {calendarRevision:snapshot.calendarRevision||0,decisionId:scope.id,days,view,visibleScope:normalizedScope(null,days),questionScope:s.questionScope,clientBuild:CLIENT_BUILD,requestId:s.requestId,viewRevision:ensureView(s).revision,gapKind:s.gapKind,selection:s.selected,highlights:s.highlighted,selectionLabel:s.selectionLabel,focusContext:focusContext(s),threadType:isConversation(scope)?'conversation':'decision',possibleChange:s.suggestion?{title:s.suggestion.title,hypothetical:true}:null,currentDecision:{id:scope.id,title:scope.title,ids:scope.refs},edits:p.edits,created:p.created,drafts:p.drafts,source:s.source,gapMinutes:s.gapMinutes,availabilityWarnings:(s.check?.steps||[]).filter(row=>row.warnings?.length).slice(0,12).map(row=>({ref:row.ref,title:row.title,warnings:row.warnings})),conversation:s.transcript.slice(-8),contextSummary:s.contextSummary||'',previousContext:s.previousContext||null,receivedContext:s.receivedContext,evidenceContexts:s.evidenceContexts||[],incomingSuggestion:s.incomingSuggestion,mailThreadIds:s.mailThreadIds||[],settings:currentSettings().map(({key,label,value})=>({key,label,value})),visibleGaps:s.gapMinutes?timeWindows(snapshot.events,visibleProposal(snapshot,s),snapshot,s.gapMinutes):[],excludedActions:actionBundle(snapshot,p).filter(a=>p.excluded?.includes(a.key))};}
async function submit(text){
 if(!state)return;text=text.trim();if(!text)return $('#command').focus();if(state.executionRunning)return toast('This change is being applied.');
 appearance.clearFilter();
 
 // Only plain assent, dismissal, "later" and returning to the week are handled locally; everything else goes to the model.
 const local=localIntent(text,state.days),intent=['confirm','dismiss','later','back-week','today'].includes(local?.kind)?local:null;
 if(intent?.kind==='back-week'||intent?.kind==='today'){
  state.composer='';$('#command').value='';resizeComposer();showWeek(intent.kind==='today'?weekDates(dayKey({start:new Date().toISOString()})):weekView);setStatus('');return;
 }
 if(intent?.kind==='confirm'&&state.settingsProposal){record(current(),'you',text);state.composer='';$('#command').value='';resizeComposer();return applySettings();}
 if(intent?.kind==='confirm'){
  const accepted=confirmation();
  if(entryFresh||!sameConfirmation(accepted,current(),proposalSignature(state),snapshot.calendarRevision||0)||!includedActions(snapshot,state).length){state.composer='';$('#command').value='';resizeComposer();persist();setStatus(state.pending?'Let the preview finish, then confirm the version you see.':'Open a current proposal before confirming.');return;}
  record(current(),'you',text);state.composer='';$('#command').value='';resizeComposer();return execute(accepted);
 }
 if(intent?.kind==='dismiss'){state.composer='';$('#command').value='';resizeComposer();if(!entryFresh)record(current(),'you',text);return closeThread();}
 if(intent?.kind==='later'){
  if(entryFresh){state.composer='';$('#command').value='';resizeComposer();restPill();return;}
  record(current(),'you',text);state.composer='';$('#command').value='';resizeComposer();
  if(inOverview()){await stopThinking();state.suggestion=null;render();restPill();return;}
  return disposition('later');
 }
 whyOpen=false;reviewIndex=null;reviewRef=null;if(entryFresh)beginFreshConversation();
 if(['dismissed','obsolete','later','done','waiting'].includes(current().status))await backToConversation();
 setStatus('');const scope=current();scope.state=state;record(scope,'you',text);state.lastInput=text;state.composer='';$('#command').value='';resizeComposer();
 const seq=(requests.get(scope.id)||0)+1;requests.set(scope.id,seq);
 if(scope.state.pendingJob){const previous=scope.state.pendingJob;delete scope.state.earlyView;api('/api/jobs/cancel',{id:previous.id}).catch(()=>{});scope.state.pending=false;scope.state.pendingJob=null;}
 state.navigationReset=false;
 const visibleDays=displayedDays(),period=explicitPeriod(text,visibleDays[0]);
 // Manual navigation changes the default for the next question without retargeting
 // work already in flight or an explicitly highlighted set being discussed.
 scope.state.questionScope=period||(state.viewChangedSinceRequest&&!activeIds().length?normalizedScope(null,visibleDays):scope.state.questionScope)||normalizedScope(null,visibleDays);
 state.viewChangedSinceRequest=false;scope.state.requestId=crypto.randomUUID();
 traceInteraction(scope.state,'request',{requestId:scope.state.requestId,build:CLIENT_BUILD});
 const signature=proposalSignature(state),requestView=captureView(state);
 const workspace=compactState(scope);
 state.pending=true;state.work={status:'queued',phase:'command',startedAt:Date.now(),lastHeardAt:Date.now(),request:text};state.unread=false;persist();renderAssistant();
 try{await ensureScopeCoverage(scope.state.questionScope);if(requests.get(scope.id)!==seq)return;workspace.calendarRevision=snapshot.calendarRevision||0;const job=await api('/api/command',{text,state:workspace});if(requests.get(scope.id)!==seq){await api('/api/jobs/cancel',{id:job.jobId});return;}scope.state.pendingJob={id:job.jobId,seq,signature,workspace,text,phase:'command',requestView,manualView:JSON.stringify(captureView(scope.state))!==JSON.stringify(requestView)};
  // The reply stream opens at once; the pending job is saved to the server alongside it, not before it.
  persist();saveScope(scope);await finishReply(scope);}
 catch(error){if(requests.get(scope.id)===seq)replyError(scope,error,text);}
}
function replyError(scope,error,text){traceInteraction(scope.state,'request-error',{requestId:scope.state.requestId,error:error.message});scope.state.attentionDays=[];rollbackEarlyView(scope,snapshot);scope.state.pending=false;scope.state.pendingJob=null;scope.state.work={...scope.state.work,status:'error',error:error.message};scope.state.unread=activeId!==scope.id;scope.state.composer=text;if(isConversation(scope))scope.state.reply=error.message;saveScope(scope);if(activeId===scope.id){state=scope.state;$('#command').value=text;resizeComposer();renderAssistant();setStatus('Could not finish. Your request is ready to retry.');}}
function showEarlyView(scope,job,pending){
 if(scope.id!==activeId||scope.state.navigationReset||scope.state.pendingJob?.manualView)return;
 try{if(applyEarlyView(scope,job.partial,pending,snapshot)){scope.state.work.firstVisualMs=Date.now()-scope.state.work.startedAt;traceInteraction(scope.state,'early-view',{requestId:scope.state.requestId,operations:operationTrace(job.partial.operations)});state=scope.state;renderHeader();renderCalendar();revealCalendar(activeIds());}}catch{}
}
async function finishReply(scope){
 const pending=scope.state.pendingJob;if(!pending)return;const {signature,seq,text,workspace}=pending;
 try{
  const update=job=>{if(requests.get(scope.id)!==seq)return;showEarlyView(scope,job,pending);scope.state.work={...scope.state.work,status:job.status,message:job.partial?.message||scope.state.work?.message,replyDraft:job.partial?.replyDraft||scope.state.work?.replyDraft,phase:job.partial?.phase||scope.state.pendingJob?.phase||pending.phase,lastHeardAt:Date.now()};renderWork();};
  let response=await waitJob(pending.id,update);
  if(requests.get(scope.id)!==seq)return;
  if(response.result.needsResearch){const job=await api('/api/research',{text,state:workspace});scope.state.pendingJob={...pending,id:job.jobId,phase:'research'};await saveScope(scope);if(activeId===scope.id)persist();scope.state.work.phase='research';renderWork();response=await waitJob(job.jobId,update);}
  if(requests.get(scope.id)!==seq)return;
  // The assistant may have loaded more dates from Google while answering; take them in before comparing revisions.
  if(response.calendarLoaded){try{await receiveCalendar(await api('/api/calendar-state'));}catch{}}
  if(activeId===scope.id)scope.state=state;
  if((response.calendarRevision??workspace.calendarRevision)!==(snapshot.calendarRevision||0)){rollbackEarlyView(scope,snapshot);scope.status=scope.id===HOME?'open':'needs_review';scope.state.stale=scope.id!==HOME;delete scope.state.earlyView;scope.state.pending=false;scope.state.pendingJob=null;scope.state.reply=scope.id===HOME?'The calendar changed while I was answering. Please ask again.':'';await saveScope(scope);if(activeId===scope.id){state=scope.state;render();}return;}
  scope.state.attentionDays=[];
  // A proposal's own dates replace Month; in a day or week view, dates already on screen need no navigation.
  response.result.navigated=response.result.operations.some(o=>o.op==='view');
  if(response.result.operations.some(o=>['edit','create'].includes(o.op))&&ensureView(scope.state).mode!=='month'){response.result.operations=response.result.operations.filter(o=>!(o.op==='view'&&o.days?.every(d=>scope.state.days.includes(d))));}
  const navigation=(scope.state.navigationReset||pending.manualView||scope.state.pendingJob?.manualView)?captureView(scope.state):null;
  if(pending.manualView||scope.state.pendingJob?.manualView||navigation){response.result.operations=response.result.operations.filter(o=>!['view','highlight','select','inspect','compare','gaps'].includes(o.op));}
  traceInteraction(scope.state,'reply-received',{requestId:workspace.requestId,navigationPreserved:!!navigation,operations:operationTrace(response.result.operations)});
  delete scope.state.earlyView;scope.state.lastMetrics={...response.metrics,firstVisualMs:scope.state.work.firstVisualMs,totalMs:Date.now()-scope.state.work.startedAt};
  if(isConversation(scope)){await finishConversationReply(scope,response.result,signature,navigation);return;}
  response.result=takeSettings(scope,response.result);
  const proposalBefore=proposalSignature(scope.state),applied=applyModelResponse(scope,response.result,signature,snapshot.events);includeReferencedDays(scope.state);if(applied){scope.state.stale=false;scope.state.source=false;scope.state.reviewedCalendarRevision=snapshot.calendarRevision||0;scope.state.sourceChanges=[];if(!['dismissed','later','done','waiting','obsolete'].includes(scope.status))scope.status='open';}scope.state.pending=false;scope.state.pendingJob=null;scope.state.check=null;scope.state.executionId=null;scope.state.result=null;
  if(navigation)Object.assign(scope.state,navigation);
  scope.state.work={...scope.state.work,status:'complete'};scope.state.unread=activeId!==scope.id;
  if(scope.id===HOME)scope.title='Calendar';
  record(scope,'assistant',response.result.reply,{detail:response.result.detail||''});if(applied&&proposalBefore!==proposalSignature(scope.state))scope.refs=[...new Set([...scope.refs,...Object.keys(scope.state.edits),...scope.state.drafts.flatMap(d=>d.ids||[])])];
  saveProposalVersion(scope);saveScope(scope);
  if(activeId===scope.id){state=scope.state;render();scheduleCheck();setStatus(applied?'':'Alternative ready · your edits are preserved');if(applied)revealCalendar([...new Set([...Object.keys(state.edits),...state.created.map(e=>e.ref),...activeIds()])]);animateReply();say(response.result.reply);}
  else{persist();renderWork();toast(`${scope.title} · reply ready`);}
 }catch(error){if(requests.get(scope.id)===seq)replyError(scope,error,text);}
}
function scheduleCheck(){clearTimeout(checkTimer);const id=activeId;checkTimer=setTimeout(()=>checkDecision(id),450);}
async function checkDecision(id){
 const scope=scopes[id];if(!scope||scope.state.executionRunning||!isOpen(scope)||scope.status==='needs_review')return;
 const actions=includedActions(snapshot,scope.state);if(!actions.length)return;
 const signature=proposalSignature(scope.state),revision=snapshot.calendarRevision||0,key=signature+'@'+revision;
 if(checks.get(id)?.key===key)return;
 const token={key};checks.set(id,token);
 const valid=()=>checks.get(id)===token&&isOpen(scope)&&scope.status!=='needs_review'&&!scope.state.executionRunning&&proposalSignature(scope.state)===signature&&(snapshot.calendarRevision||0)===revision;
 scope.state.checkProgress={message:'Reading the latest invitation…'};if(id===activeId)renderWork();
 try{
  const job=await api('/api/actions/check',{decisionId:id,actions}),check=await waitJob(job.jobId,job=>{
   if(!valid()||!job.partial)return;
   scope.state.checkProgress=job.partial;
   if(job.partial.steps?.length)scope.state.check={steps:job.partial.steps};
   if(id===activeId){state=scope.state;renderAssistant();}
  });
  if(!valid())return;scope.state.check=check;scope.state.checkProgress=null;
  if(id===activeId){state=scope.state;renderAssistant();floating.schedule();}
 }catch(e){if(valid()){scope.state.checkProgress={message:'Checks could not finish · '+e.message};if(id===activeId)renderWork();}}
 finally{if(checks.get(id)===token){if(!valid())scope.state.checkProgress=null;checks.delete(id);}}
}
async function execute(anchor=confirmation()){
 if(!sameConfirmation(anchor,current(),proposalSignature(state),snapshot.calendarRevision||0))return setStatus('The preview changed. Review it before confirming.');
 const scope=current();scope.state=state;const actions=includedActions(snapshot,state);if(!actions.length)return;
 if(!status.google?.calendar&&actions.some(a=>!['email','request'].includes(a.kind))){showAbout();return;}
 const signature=proposalSignature(state),revision=snapshot.calendarRevision||0;checks.delete(scope.id);state.checkProgress=null;state.executionRunning=true;renderAssistant();setStatus('Checking the latest calendar…');
 try{
  const job=await api('/api/actions/check',{decisionId:scope.id,actions}),check=await waitJob(job.jobId,job=>{if(job.partial&&activeId===scope.id){scope.state.checkProgress=job.partial;renderWork();}});scope.state.check=check;
  if(proposalSignature(scope.state)!==signature||(snapshot.calendarRevision||0)!==revision||scope.status!=='open')throw Error('The steps changed. Review them before confirming.');
  if(!check.ready){if(activeId===scope.id)setStatus('Review the marked steps before confirming.');return;}
  scope.state.executionId ||= 'run-'+crypto.randomUUID();await saveScope(scope);
  scope.state.checkProgress={executing:true,steps:check.steps.map(x=>({key:x.key,title:x.title,status:'pending'}))};if(activeId===scope.id)renderWork();
  const running=await api('/api/actions/execute',{ticket:check.ticket,requestId:scope.state.executionId}),result=await waitJob(running.jobId,job=>{if(job.partial?.steps?.length){scope.state.checkProgress={executing:true,steps:job.partial.steps};if(activeId===scope.id)renderWork();}});scope.state.result=result;
  for(const step of result.steps||[]){if(!['success','awaiting_reply','unknown'].includes(step.status))continue;const action=actions.find(a=>a.key===step.key);if(!action)continue;
   if(step.status==='unknown'){scope.state.excluded=[...(scope.state.excluded||[]),action.key];continue;}
   if(action.kind==='create')scope.state.created=scope.state.created.filter(e=>e.ref!==action.ref);
   else if(action.kind==='email')scope.state.drafts=scope.state.drafts.filter(d=>d.id!==action.draftId);
   else delete scope.state.edits[action.ref];
  }
  scope.state.undo=[];scope.state.redo=[];scope.state.check=null;scope.state.executionId=null;
  snapshot=await api('/api/snapshot');const saved=await api('/api/decisions');for(const row of saved.decisions)if(scopes[row.id])scopes[row.id].status=row.status;
  for(const d of Object.values(scopes))pruneSelection(d.state,snapshot.events);
  scope.status=result.status==='success'?(result.steps.some(s=>s.status==='awaiting_reply')?'waiting':'done'):'needs_review';
  scope.state.reply=result.status==='success'?'Confirmed.': 'Some steps need your attention.';
  if(activeId===scope.id)setStatus(result.status==='success'?'Confirmed with Google':'See the results for each step');
 }catch(e){scope.state.reply=e.message;if(activeId===scope.id)setStatus(e.message);}
 finally{scope.state.checkProgress=null;scope.state.executionRunning=false;await saveScope(scope);if(activeId===scope.id){state=scope.state;render();}else persist();}
}
function openDrawer(title,body,type='details'){
 const drawer=$('#drawer');if(drawer.hidden)drawerReturnFocus=document.activeElement;
 drawer.innerHTML=`<div class="drawer-head"><h2 id="drawer-title">${esc(title)}</h2><button data-action="close-drawer" aria-label="Close details">×</button></div><div class="drawer-body">${body}</div>`;
 drawer.hidden=false;drawer.dataset.kind=type;drawer.style.left='';drawer.style.top='';drawer.style.width='';drawer.style.maxHeight='';// On desktop every side view docks into the panel column, so the calendar stays usable; phones keep modal sheets.
 const modal=phoneLayout.matches;drawer.setAttribute('aria-modal',String(modal));$('#drawer-shade').hidden=!modal;drawerType=type;$('.shell').inert=modal;
 drawer.querySelector('[data-action="close-drawer"]').focus({preventScroll:true});
}
function closeDrawer(){
 const closingKind=drawerType;
 $('.calendar-main').style.marginRight='';
 const inspectedScope=drawerType==='event'?scopes[inspectionOwner]:null,releasedRef=inspectedScope?.state.inspected;if(inspectedScope){inspectedScope.state.inspected=null;inspectionOwner=null;}
 const wasOpen=!$('#drawer').hidden;$('#drawer').hidden=true;$('#drawer-shade').hidden=true;$('.shell').inert=false;drawerType=null;$('#open-count').setAttribute('aria-expanded','false');
 if(inspectedScope&&activeId===inspectedScope.id){renderHeader();renderCalendar();renderSelection();persist();}
 if(wasOpen){const target=releasedRef?$(`[data-event="${CSS.escape(releasedRef)}"]`)||$('#calendar-scroll'):drawerReturnFocus?.isConnected?drawerReturnFocus:$('#calendar-scroll');target.focus({preventScroll:true});drawerReturnFocus=null;}
 appearance.closed(closingKind);
}
function safeDescription(value){
 const template=document.createElement('template');template.innerHTML=String(value||'');
 const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','IMG','VIDEO','AUDIO','SVG','MATH','FORM','INPUT','BUTTON','LINK','META']);
 const block=new Set(['P','DIV','UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4','PRE']);
 const plain=node=>node.nodeType===Node.TEXT_NODE?node.textContent:blocked.has(node.nodeName)?'':[...node.childNodes].map(plain).join('')+(node.nodeName==='BR'||block.has(node.nodeName)?'\n':'');
 const clean=node=>{
  if(node.nodeType===Node.TEXT_NODE)return esc(node.textContent);
  if(node.nodeType!==Node.ELEMENT_NODE||blocked.has(node.nodeName))return '';
  const content=[...node.childNodes].map(clean).join(''),tag=node.nodeName.toLowerCase();
  if(tag==='br')return '<br>';
  if(tag==='a'){const url=safeWebUrl(node.getAttribute('href'));return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${content}</a>`:content;}
  if(['p','div','ul','ol','li','strong','b','em','i','blockquote','pre'].includes(tag))return `<${tag}>${content}</${tag}>`;
  return content;
 };
 return {html:[...template.content.childNodes].map(clean).join(''),text:[...template.content.childNodes].map(plain).join('').replace(/\n{3,}/g,'\n\n').trim()};
}
function eventWhen(e){
 if(e.allDay){const start=e.start.slice(0,10),last=shiftDate(e.end.slice(0,10),-1);return `${dateLabel(start)}${last!==start?' – '+dateLabel(last):''} · All day`;}
 const date=dayKey(e),endDate=dayKey({start:e.end});
 return `${dateLabel(date)} · ${timeLabel(e.start)}–${date!==endDate?dateLabel(endDate)+' ':''}${timeLabel(e.end)} ${timezoneLabel(e.start)}`;
}
let eventCardFrame=0,lensHeight=420;const LENS_WIDTH=400;
// The opened event becomes the lens on desktop timed views; phones keep their sheet, all-day events their card.
function lensTarget(timed,days){
 if(drawerType!=='event'||!state.inspected||phoneLayout.matches||ensureView(state).mode==='month')return null;
 const e=timed.find(e=>e.ref===state.inspected);return e&&days.includes(dayKey(e))?e:null;
}
function positionEventCard(){
 if(drawerType!=='event')return;
 const drawer=$('#drawer'),mobile=phoneLayout.matches,main=$('.calendar-main');
 drawer.setAttribute('aria-modal',String(mobile));$('.shell').inert=mobile;$('#drawer-shade').hidden=!mobile;
 if(mobile){drawer.classList.remove('lens');drawer.style.left='';drawer.style.top='';drawer.style.width='';drawer.style.maxHeight='';drawer.style.height='';main.style.marginRight='';return;}
 const host=$('#calendar').querySelector(`.event.lens-host[data-event="${CSS.escape(state.inspected||'')}"]`);
 if(host){
  // Measure the card's natural height at the lens width; if the lens is the wrong size, redraw the calendar around it.
  drawer.classList.add('lens');const box=host.getBoundingClientRect();
  drawer.style.width=box.width+'px';drawer.style.height='auto';drawer.style.maxHeight='none';
  const natural=Math.min(drawer.scrollHeight,Math.max(260,$('#calendar-scroll').clientHeight-40));
  if(Math.abs(natural-lensHeight)>12){lensHeight=natural;renderCalendar();return;}
  const view=$('#calendar-scroll').getBoundingClientRect();
  drawer.style.left=box.left+'px';drawer.style.top=box.top+'px';drawer.style.height=box.height+'px';drawer.style.maxHeight=box.height+'px';
  drawer.classList.toggle('offscreen',box.bottom<view.top+20||box.top>view.bottom-20);
  return;
 }
 drawer.classList.remove('lens','offscreen');drawer.style.height='';
 const targets=[...$('#calendar').querySelectorAll(`[data-event="${CSS.escape(state.inspected||'')}"]`)];
 const bounds=$('#calendar-scroll').getBoundingClientRect();
 const target=targets.find(el=>{const r=el.getBoundingClientRect();return r.bottom>bounds.top&&r.top<bounds.bottom&&r.right>bounds.left&&r.left<bounds.right;})||targets[0];
 if(!target)return;
 // Measure the natural card again after opening subpanels or resizing.
 drawer.style.width='400px';drawer.style.maxHeight='calc(100% - 80px)';
 const rect=target.getBoundingClientRect(),size={width:drawer.offsetWidth,height:drawer.offsetHeight};
 const place=eventCardPlacement(rect,{width:innerWidth,height:innerHeight},size);
 if(place.rail&&!main.style.marginRight){main.style.marginRight=(place.width+28)+'px';renderCalendar();return;}
 if(main.style.marginRight){place.left=innerWidth-place.width-14;place.top=66;place.maxHeight=innerHeight-80;}
 drawer.style.left=place.left+'px';drawer.style.top=place.top+'px';drawer.style.width=place.width+'px';drawer.style.maxHeight=place.maxHeight+'px';
}
$('#calendar-scroll').addEventListener('scroll',()=>{cancelAnimationFrame(eventCardFrame);eventCardFrame=requestAnimationFrame(positionEventCard);},{passive:true});
function inspectedEvent(){return currentEvents().find(e=>e.ref===state.inspected)||eventByRef(state.inspected);}
const guestName=p=>p.displayName||p.name||p.email||'Guest';
const responseLabels={needsAction:'Not answered',accepted:'Going',declined:'Declined',tentative:'Maybe'};
function inspect(ref){
 const e=currentEvents().find(e=>e.ref===ref)||eventByRef(ref);if(!e)return;
 state.inspected=ref;inspectionOwner=activeId;
 const original=eventByRef(ref),rooms=(e.attendees||[]).filter(p=>p.resource),others=(e.attendees||[]).filter(p=>!p.self&&!p.resource);
 const join=meetingLink(e),place=eventPlace(e),provider=conferenceLabel(e),description=safeDescription(e.description);
 const changedTime=['move','resize'].includes(e.previewKind),proposal=eventStatus(e);
 let body=`<div class="event-when">${esc(eventWhen(e))}</div>${changedTime&&original?`<p class="event-preview-note">Proposed time · currently ${esc(eventWhen(original))}</p>`:proposal?`<p class="event-preview-note">${esc(proposal)}</p>`:''}`;
 const type={focusTime:'Focus time',outOfOffice:'Out of office',workingLocation:'Working location',fromGmail:'From Gmail',birthday:'Birthday'}[e.type];
 if(type||e.transparent)body+=`<p class="event-kind">${esc([type,e.transparent?'Shown as free':''].filter(Boolean).join(' · '))}</p>`;
 if(place)body+=`<div class="event-place">${esc(place)}</div>`;
 const roomIssues=rooms.filter(p=>(p.responseStatus||p.response)&&!['accepted'].includes(p.responseStatus||p.response));
 if(roomIssues.length)body+=`<p class="event-room-note">${roomIssues.map(p=>esc(guestName(p))+' · '+esc((p.responseStatus||p.response)==='declined'?'room declined':(p.responseStatus||p.response)==='tentative'?'room tentative':'room not confirmed')).join('<br>')}</p>`;
 if(join)body+=`<a class="event-join" href="${esc(join)}" target="_blank" rel="noopener noreferrer">${esc(provider==='Video meeting'?'Join meeting':'Join '+provider)} ↗</a>`;
 body+=`<div class="event-host">${e.organizerSelf?"You're organizing":e.organizerName||e.organizer?'Organized by '+esc(e.organizerName||e.organizer):'Organizer not supplied'}${e.optional?' · Your attendance is optional':''}</div>`;
 body+=appearance.eventMarkup(e);
 if(description.text)body+=`<section class="event-agenda">${description.text.length>260?`<p>${esc(description.text.slice(0,260))}…</p><button class="event-text-link" data-action="event-description">Read full description</button>`:`<div class="event-description">${description.html}</div>`}</section>`;
 const attachments=(e.attachments||[]).filter(a=>safeWebUrl(a.fileUrl));
 if(attachments.length)body+=`<div class="event-attachments">${attachments.map(a=>`<a href="${esc(safeWebUrl(a.fileUrl))}" target="_blank" rel="noopener noreferrer">${esc(a.title||'Attachment')} ↗</a>`).join('')}</div>`;
 if(others.length||rooms.length)body+=`<button class="event-people" data-action="event-guests" aria-label="View guests and responses"><span class="event-avatars" aria-hidden="true">${others.slice(0,3).map(p=>`<i>${esc(guestName(p).split(/[\s@.]+/).slice(0,2).map(w=>w[0]).join('').toUpperCase())}</i>`).join('')}</span><span>${e.attendeesOmitted||e.guestsCanSeeOtherGuests===false?'Guests shown':others.slice(0,2).map(p=>esc(guestName(p).split('@')[0])).join(', ')}${others.length>2?` +${others.length-2}`:''}${rooms.length?`${others.length?' · ':''}${rooms.length} ${rooms.length===1?'room':'rooms'}`:''}</span><span aria-hidden="true">↗</span></button>`;
 if(!e.organizerSelf&&canRespond(e))body+=`<div class="event-rsvp" role="group" aria-label="Your response"><span>Your response</span><div>${[['accept','Going'],['tentative','Maybe'],['decline','Decline']].map(([action,label])=>{const selected={accept:'accepted',decline:'declined',tentative:'tentative'}[action]===e.response;return `<button data-event-action="${action}" data-id="${esc(ref)}" aria-pressed="${selected}" ${selected?'disabled':''}>${selected?'✓ ':''}${label}</button>`;}).join('')}</div></div>`;
 body+=`<div class="event-footer"><button class="event-discuss" data-action="discuss-event">Discuss</button>${!e.allDay?`<button data-action="event-move">${canEdit(e)?'Change time':'Suggest time'}</button>`:''}<button class="event-overflow" data-action="event-options" aria-label="More event options" title="More event options">⋯</button></div>`;
 const source=googleEventUrl(e);if(source)body+=`<a class="source-link" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Open in Google Calendar ↗</a>`;
 openDrawer(e.title,body,'event');renderHeader();renderCalendar();
 if(!phoneLayout.matches){const host=$('#calendar').querySelector(`.event.lens-host[data-event="${CSS.escape(ref)}"]`);host?.scrollIntoView({block:'nearest',behavior:'instant'});}
 positionEventCard();
}
function eventPanel(kind){
 const e=inspectedEvent();if(!e)return;
 const ref=e.ref;let title='',body='';
 if(kind==='guests'){
  title='People';body=(e.attendees||[]).map(p=>`<div class="event-guest"><span>${esc(guestName(p))}${p.self?' · You':''}${p.resource?' · Room':''}${p.optional?' · Optional':''}</span><small>${esc(responseLabels[p.responseStatus||p.response]||'Not answered')}</small>${p.comment?`<p>${esc(p.comment)}</p>`:''}</div>`).join('');
  if(e.attendeesOmitted||e.guestsCanSeeOtherGuests===false)body+='<p>The invitation does not include the complete guest list.</p>';
 }else if(kind==='move'){
  title=canEdit(e)?'Change time':'Suggest a new time';
  body=`<p class="event-panel-context">${esc(e.title)} · ${esc(eventWhen(e))}</p><form id="move-form" data-ids="${esc(ref)}"><div class="row"><div><label for="move-date">Date</label><input id="move-date" type="date" value="${dayKey(e)}" required></div><div><label for="move-time">Start</label><input id="move-time" type="time" value="${timeString(e.start)}" required></div></div><label for="move-duration">Minutes</label><input id="move-duration" type="number" min="5" max="1440" value="${(Date.parse(e.end)-Date.parse(e.start))/60000}"><div class="actions"><button type="submit" class="primary">${canEdit(e)?'Preview move':'Preview request'}</button></div></form>`;
 }else if(kind==='description'){
  title='About this meeting';body=`<div class="event-description">${safeDescription(e.description).html}</div>`;
 }else{
  title='Event options';
  const points=(e.conference||e.conferenceData)?.entryPoints||[],notes=safeDescription((e.conference||e.conferenceData)?.notes);
  const pointMarkup=points.map(p=>{
   const url=p.entryPointType==='phone'&&/^tel:\+?[\d(),;*# .-]+$/.test(p.uri||'')?p.uri:['video','more'].includes(p.entryPointType)?safeWebUrl(p.uri):null;
   const codes=['meetingCode','accessCode','passcode','password','pin'].filter(k=>p[k]).map(k=>`${{meetingCode:'Meeting code',accessCode:'Access code',passcode:'Passcode',password:'Password',pin:'PIN'}[k]}: ${esc(p[k])}`).join(' · ');
   if(p.entryPointType==='video'&&!codes)return '';
   return `${url?`<p><a href="${esc(url)}" ${p.entryPointType!=='phone'?'target="_blank" rel="noopener noreferrer"':''}>${esc(p.label||p.uri)}</a></p>`:''}${codes?`<p>${codes}</p>`:''}`;
  }).join('');
  if(pointMarkup||notes.text)body+=`<section class="event-option-section"><h3>Dial-in</h3>${pointMarkup}${notes.html}</section>`;
  body+=`<p>${esc(permissionLabel(e))}${e.seriesId?' · This occurrence of a recurring event':''}${e.visibility&&e.visibility!=='default'?' · '+esc(e.visibility):''}</p><label for="participation">Your participation</label><select id="participation" data-ref="${esc(ref)}"><option value="unknown" ${!e.participation||e.participation==='unknown'?'selected':''}>Automatic estimate</option><option value="active" ${e.participation==='active'?'selected':''}>Actively participating</option><option value="listening" ${e.participation==='listening'?'selected':''}>Listening</option></select>${e.participationBasis==='Set by you'&&e.participation!=='unknown'?'<small class="field-note">Set by you · this occurrence</small>':''}${(e.participationEstimate?.reasons||[]).length?`<p>${esc(participationLabel(e))}: ${esc(e.participationEstimate.reasons.join('. '))}</p>`:''}${(e.importanceEstimate?.reasons||[]).length?`<p>${esc(importanceLabel(e))}: ${esc(e.importanceEstimate.reasons.join('. '))}</p>`:''}`;
  const related=decisions().filter(d=>isOpen(d)&&decisionRefs(d).includes(ref));
  if(related.length)body+=`<section class="event-option-section"><h3>Proposed changes</h3>${related.map(d=>`<button data-decision="${esc(d.id)}">${esc(d.title)} ↗</button>`).join('')}</section>`;
  if(state.edits[ref])body+=`<button class="event-text-link" data-event-action="restore" data-id="${esc(ref)}">Undo proposal</button>`;
  if(!e.allDay&&e.organizerSelf&&!e.attendees?.some(p=>!p.self))body+=`<button class="event-text-link" data-event-action="remove" data-id="${esc(ref)}">Remove hold…</button>`;
 }
 openDrawer(title,body,'event');$('#drawer-title').insertAdjacentHTML('beforebegin','<button class="event-back" data-action="event-back" aria-label="Back to meeting">‹</button>');positionEventCard();
}
function showStep(key){const a=actionBundle(snapshot,state).find(a=>a.key===key);if(!a)return;if(!['email','request'].includes(a.kind))return inspect(a.ref);
 openDrawer(a.kind==='request'?'Request a new time':'Message',`<form id="message-form" data-ref="${esc(a.ref||'')}" data-draft="${esc(a.draftId||'')}"><label for="message-channel">Send via</label><select id="message-channel"><option value="email" ${a.channel==='email'?'selected':''}>Email</option><option value="slack" ${a.channel==='slack'?'selected':''}>Slack · not connected</option><option value="unspecified" ${a.channel==='unspecified'?'selected':''}>Choose channel</option></select><p>From: ${esc(state.check?.connection?.account||status.google?.account||'Not connected')}</p><label for="message-to">To</label><input id="message-to" value="${esc(a.to)}" required><label for="message-subject">Subject</label><input id="message-subject" value="${esc(a.subject)}" required><label for="message-body">Message</label><textarea id="message-body" rows="8" required>${esc(a.body)}</textarea>${a.kind==='request'?'<p>The original time stays booked until the organizer changes it.</p>':''}<div class="actions"><button type="submit" class="primary">Update step</button></div></form>`,'message');
}
function renderQueue(){
 const entries=decisionFeed(decisions(),receivedRecords),list=entries.filter(d=>d.bucket===queueTab),count=entries.filter(d=>d.bucket==='open').length;
 const cards=list.map(item=>{
  const d=item.decision,refs=d?decisionRefs(d):snapshot.events.filter(e=>item.record.payload.events?.some(ref=>ref.eventId===e.id)).map(e=>e.ref),dates=[...new Set(refs.map(r=>eventByRef(r)).filter(Boolean).map(e=>dayKey(e)))].sort();
  const label=d?.state.pending?workStatus(d).label:d?.state.unread?'Reply ready':item.status==='needs_review'?'Needs review':({dismissed:'Left as is',obsolete:'No longer needed',done:'Completed',waiting:'Awaiting reply',later:'For later'}[item.status]||dates.map(date=>dateLabel(date,{weekday:'short'})).join(' · '));
  const target=d?`data-decision="${esc(d.id)}"`:`data-context-action="work" data-context-id="${esc(item.id)}"`;
  const dismiss=d?`data-dismiss="${esc(d.id)}"`:`data-context-action="dismiss-decision" data-context-id="${esc(item.id)}"`;
  return `<section class="decision-card"><button class="decision-card-main" ${target}><strong>${esc(item.title)}</strong><small>${[label,item.source].filter(Boolean).map(esc).join(' · ')}</small></button>${item.bucket==='open'?`<button class="dismiss-card" ${dismiss} aria-label="Leave ${esc(item.title)} as is" title="Leave as is">×</button>`:''}</section>`;
 }).join('');
 ($('#decision-list')||$('#queue-panel')).innerHTML=`<div class="queue-tabs">${['open','incoming','later','closed'].map(t=>`<button data-bucket="${t}" class="${queueTab===t?'active':''}">${{open:'Exploring',incoming:'Incoming',later:'For later',closed:'Past'}[t]}${t==='open'?` <span>${count}</span>`:t==='incoming'?` <span>${entries.filter(e=>e.bucket==='incoming').length}</span>`:''}</button>`).join('')}</div><div class="queue-cards">${cards||`<div class="queue-empty"><p>${queueTab==='open'?'Room for a new thought':queueTab==='later'?'Nothing saved for later':queueTab==='incoming'?'Nothing new has arrived':'Your past conversations will be here'}</p></div>`}</div>`;
}
async function showQueue(){openDrawer('Saved','<div id="decision-list"></div>','decisions');renderQueue();renderHeader();if(received)try{await received.poll();}catch(error){toast(error.message);}}
function moveSet(){if(!activeIds().length)return;openDrawer('Move selected events',`<form id="shift-form" data-ids="${activeIds().join(',')}"><label for="shift-days">Days later</label><input id="shift-days" type="number" min="-31" max="31" value="0"><label for="shift-minutes">Minutes later</label><input id="shift-minutes" type="number" min="-1440" max="1440" step="15" value="30"><div class="actions"><button class="primary" type="submit">Preview move</button></div></form>`);}
function showAbout(){const g=status.google||{};if(status.hosted){openDrawer('Google connection',`<p>${esc(g.account||status.user.email)}</p><p>Calendar · ${g.calendar?'connected':'permission needed'}<br>Gmail · ${g.mailRead?'read, draft, and send':'permission needed'}</p><div class="actions"><a class="source-link" href="/auth/google">Reconnect Google</a><button data-action="sign-out">Sign out</button></div>`,'about');return;}openDrawer('Google connection',`<p>${g.calendar?`Connected as ${esc(g.account)}.`:'This local app needs its own Google connection to carry out your decisions.'}</p><form id="connect-form">${g.configured?'':`<details open><summary>One-time setup</summary><p>Create a Desktop OAuth client with Calendar API enabled. Enable Gmail API too if you want to send email. <a href="https://developers.google.com/identity/protocols/oauth2/native-app" target="_blank" rel="noreferrer">Google setup guide ↗</a></p><label for="client-id">Client ID</label><input id="client-id" autocomplete="off" required><label for="client-secret">Client secret</label><input id="client-secret" type="password" autocomplete="off" required></details>`}<label class="check-label"><input type="checkbox" id="gmail-permission" ${g.email?'checked':''}> Also allow sending email</label><div class="actions"><button type="submit" class="primary">${g.calendar?'Update connection':'Connect Google'}</button></div><div id="oauth-link" role="status"></div></form><hr class="divider"><p>${g.calendar?'Calendar changes are checked every 30 seconds.':'Live updates start after connecting Google.'}</p><p>Slack sending and other calendars are not connected.</p>`,'about');}
async function showActivity(){const memory=await api('/api/memory');openDrawer('Activity & memory',`<h3>Preferences</h3>${memory.preferences.map(p=>`<div class="preference"><span>${esc(p.body)}</span><button data-forget="${p.id}" aria-label="Remove preference">×</button></div>`).join('')||'<p>No standing preferences yet.</p>'}<form id="preference-form"><label for="preference">Remember for future decisions</label><input id="preference" maxlength="500" placeholder="e.g. Keep Friday mornings free" required><div class="actions"><button type="submit">Remember</button></div></form><h3>Recent actions</h3>${memory.outcomes.map(r=>`<div class="activity-item"><strong>${esc(scopes[r.decisionId]?.title||'Decision')}</strong>${r.steps.map(s=>`<p>${esc(s.title)} · ${esc(s.message||s.status)}</p>`).join('')}</div>`).join('')||'<p>No actions executed yet.</p>'}<details><summary>How memory works</summary><p>Each decision keeps its own conversation locally. Requests receive recent turns, relevant decision summaries, recent confirmed outcomes, and the preferences you save here. A one-off choice is not automatically made permanent.</p></details>`,'activity');}
async function refreshReview(){
 setStatus('Preparing suggestions…');closeDrawer();
 try{const job=await api('/api/review',{});review=await waitJob(job.jobId);
  for(const proposal of review.decisions){
   const result=await api('/api/decisions/reconcile',{proposal:{...proposal,reply:proposal.reason,origin:'Calendar review'},contributionId:proposal.id});
   if(result.decision)scopes[result.decision.id]=hydrateDecision(snapshot,result.decision);
  }
  render();showQueue();setStatus('Suggestions ready');
 }catch(error){setStatus(error.message);}
}
function savePreferences(){localStorage.setItem(PREFERENCES,JSON.stringify(preferences));reading=preferences.readAloud;}
// Settings is five short groups of label and control rows. Anything longer than a line of explanation,
// and anything used once a month, sits behind More.
const switchRow=(label,note,checked,attrs)=>`<label class="set-row"><span><b>${label}</b>${note?`<small>${note}</small>`:''}</span><input type="checkbox" class="set-switch" ${attrs} ${checked?'checked':''}></label>`;
function calendarSettingsMarkup(){
 const settings=calendarSettings();
 return `<form id="calendar-settings-form"><section class="set-group"><h3>Categories and colors</h3>${appearance.summary()}</section><section class="set-group"><h3>Who counts as internal</h3><label class="set-field" for="internal-domains"><span>Domains</span><textarea id="internal-domains" rows="1" spellcheck="false" autocapitalize="none" autocomplete="off" maxlength="12000" placeholder="example.com">${esc(settings.internalDomains.join(', '))}</textarea></label><label class="set-field" for="internal-addresses"><span>People</span><textarea id="internal-addresses" rows="1" spellcheck="false" autocapitalize="none" autocomplete="off" maxlength="12000" placeholder="person@example.com">${esc(settings.internalAddresses.join(', '))}</textarea></label><p class="set-note">Separate with commas. A meeting is internal when everyone else on it matches.</p></section><div class="set-save"><button type="submit" class="primary">Save</button><span id="calendar-settings-status" role="status" aria-live="polite"></span></div></form>`;
}
async function saveCalendarSettings(form){
 const button=form.querySelector('[type=submit]'),message=form.querySelector('[role=status]');button.disabled=true;message.textContent='Saving…';
 const entries=id=>form.querySelector('#'+id).value.split(/[\s,;]+/).filter(Boolean);
 try{
  const data={internalDomains:entries('internal-domains'),internalAddresses:entries('internal-addresses')};
  await receiveCalendar(await api('/api/calendar-settings',data));
  message.textContent='Saved';
 }catch(error){message.textContent=error.message;}
 finally{button.disabled=false;}
}
// Default or test model. The test model's real name stays on the server; the page only has its label.
const testLabel=()=>status?.testModel?.label||'Test model',usingTest=()=>!!status?.testModel?.available&&status.inference?.model==='test';
function modelChoiceMarkup(){
 const t=status.testModel;if(!t)return '';
 return `<div class="model-choice" role="radiogroup" aria-label="Assistant model">${[['default','Default'],['test',testLabel()]].map(([value,label])=>`<button type="button" role="radio" data-model-choice="${value}" aria-checked="${(usingTest()?'test':'default')===value}" ${value==='test'&&!t.available?'disabled':''}>${esc(label)}</button>`).join('')}</div>`;
}
async function setModel(choice){
 try{const saved=await api('/api/assistant-settings',{model:choice});status.inference={...status.inference,...saved};try{status=await api('/api/status');}catch{}
  renderHeader();for(const slot of document.querySelectorAll('.model-choice-slot'))slot.innerHTML=modelChoiceMarkup();
  toast(usingTest()?`Using ${testLabel()}`:'Using the default model');}
 catch(error){toast(error.message);}
}
function assistantSettingsMarkup(){
 const u=status.inference||{},m=state.lastMetrics,t=status.testModel,cost=v=>v<0.01?'under 1¢':v<1?`${(v*100).toFixed(1)}¢`:'$'+v.toFixed(2);
 return `<section class="set-group"><h3>Assistant</h3>${t?`<div class="set-row"><span><b>Model</b>${t.available?'':`<small>${esc(testLabel())} needs ${esc((t.missing||[]).join(' and '))} on the server</small>`}</span><span class="model-choice-slot">${modelChoiceMarkup()}</span></div>`:''}${switchRow('Fast replies','About twice as fast, at twice the price per token',u.fastMode,'id="fast-mode"')}${switchRow('Read replies aloud','',preferences.readAloud,'data-setting="readAloud"')}<p class="set-note">${esc(status.interactionModel||'')}${status.transport==='api'?'':' · Claude CLI, no API key'}<br>Today: ${u.modelCalls||0} model ${u.modelCalls===1?'call':'calls'}${u.costUsd?`, about ${cost(u.costUsd)}`:''}${m?.totalMs?` · Last reply: ${(m.totalMs/1000).toFixed(1)} s${m.costUsd!=null?`, ${cost(m.costUsd)}`:''}`:''}</p></section>`;
}
function connectionSettingsMarkup(){
 const g=status.google||{},sync=status.sync||{},age=sync.lastSuccessAt?Math.floor((Date.now()/1000-sync.lastSuccessAt)/60):null;
 const line=!g.calendar?'Changes cannot be applied until Google is connected':sync.error?esc(sync.error):age===null?'Connected':age<1?'Synced just now':`Synced ${age} min ago`;
 return `<section class="set-group"><h3>Google Calendar</h3><div class="set-row"><span><b>${g.calendar?esc(g.account||'Connected'):'Not connected'}</b><small>${line}</small></span><span class="set-buttons">${g.calendar?'<button data-action="sync">Sync</button>':''}<button data-action="about">${g.calendar?'Connection':'Connect'}</button></span></div></section>`;
}
function layoutSettingsMarkup(){
 const option=(value,label)=>`<button type="button" role="radio" aria-checked="${SURFACE===value}" ${SURFACE===value?'':'data-action="set-surface"'}>${label}</button>`;
 return `<section class="set-group"><h3>Layout</h3><div class="set-row"><span><b>${SURFACE==='canvas'?'Canvas':'Side panel'}</b><small>${SURFACE==='canvas'?'Answers on one line above the calendar':'Answers in a column beside the calendar'}</small></span><div class="model-choice" role="radiogroup" aria-label="Layout">${option('canvas','Canvas')}${option('docked','Side panel')}</div></div></section>`;
}
function settingsStatusMarkup(){return assistantSettingsMarkup()+connectionSettingsMarkup()+layoutSettingsMarkup();}
function moreSettingsMarkup(){
 const u=status.inference||{},hosted=received?.capabilitiesMarkup(status.capabilities)||'';
 return `<section class="set-group"><h3>More</h3><div class="set-links"><button data-action="activity">Memory and activity</button><button data-action="threads">History</button><button data-action="refresh-review">Refresh suggestions</button><button data-action="view-trace">Diagnostics</button></div>${hosted?`<details class="set-details"><summary>Account and connected assistant</summary>${hosted}<form id="assistant-settings-form" class="set-row"><span><b>Automatic reviews per day</b><small>Suggestions from a connected assistant</small></span><span class="set-buttons"><input id="automatic-limit" type="number" min="0" max="50" value="${u.maxAutomaticReviews??5}" aria-label="Automatic reviews per day"><button>Save</button></span></form></details>`:''}<p class="set-note">Primary calendar from ${dateLabel(snapshot.range.start)}. ${snapshot.lastSyncedAt?'Last sync '+new Date(snapshot.lastSyncedAt*1000).toLocaleString():'Snapshot from '+new Date(snapshot.capturedAt).toLocaleString()}. Other calendars and Slack are not connected.</p></section>`;
}
function showSettings(refresh=true){if(refresh)api('/api/status').then(fresh=>{status=fresh;if(drawerType==='settings'){const section=$('#settings-live-status');if(section&&!section.contains(document.activeElement)&&!section.dataset.dirty){const replacement=document.createElement('div');replacement.innerHTML=settingsStatusMarkup();section.replaceChildren(...replacement.childNodes);}}}).catch(()=>{});openDrawer('Settings',`<div id="settings-live-status">${settingsStatusMarkup()}</div>${calendarSettingsMarkup()}${moreSettingsMarkup()}`,'settings');}
async function receiveCalendar(data){
 const calendarChanged=(data.snapshot.calendarRevision||0)!==(snapshot.calendarRevision||0),appearanceChanged=(data.snapshot.appearance?.revision||0)!==(snapshot.appearance?.revision||0);
 const changed=calendarChanged||appearanceChanged||JSON.stringify(data.snapshot.calendarSettings)!==JSON.stringify(snapshot.calendarSettings)||JSON.stringify(data.snapshot.coverage)!==JSON.stringify(snapshot.coverage);snapshot=data.snapshot;status.sync=data.sync;
 for(const saved of data.decisions){let d=scopes[saved.id];if(!d){scopes[saved.id]=hydrateDecision(snapshot,saved);continue;}
  for(const field of ['alternatives','evidenceNotes','evidenceContexts']){const entries=new Map((d.state[field]||[]).map(x=>[x.id,x]));for(const x of saved.state[field]||[])if(!(d.state.removedAlternatives||[]).includes(x.id))entries.set(x.id,x);d.state[field]=[...entries.values()];}
  const known=new Set(d.state.contributions||[]),incoming=(saved.state.contributions||[]).filter(id=>!known.has(id));
  if(incoming.length){
   const seen=new Set((d.state.transcript||[]).map(m=>m.contributionId));
   d.state.transcript=[...(d.state.transcript||[]),...(saved.state.transcript||[]).filter(m=>m.contributionId&&!seen.has(m.contributionId))].slice(-40);
   d.state.contributions=[...new Set([...(d.state.contributions||[]),...(saved.state.contributions||[])])].slice(-100);
   d.state.priority=saved.state.priority;d.title=saved.title;d.updated=saved.updated;d.state.unread=true;
  }
  const pending=d.state.pendingJob,working=d.state.pending;
  if(saved.state.stale&&['needs_review','obsolete'].includes(saved.status)){
   d.state={...d.state,...saved.state,...captureView(d.state),composer:d.state.composer,transcript:d.state.transcript,interactionTrace:d.state.interactionTrace,pendingJob:pending,pending:working};d.status=saved.status;
  }else d.status=saved.status;
 }
 for(const d of Object.values(scopes))pruneSelection(d.state,snapshot.events);
 state=current().state;
 if(changed){if(calendarChanged){for(const d of Object.values(scopes)){d.state.check=null;d.state.checkProgress=null;}checks.clear();}render();if(calendarChanged)scheduleCheck();if(drawerType==='event'){if(state.inspected&&eventByRef(state.inspected))inspect(state.inspected);else closeDrawer();}}
 else {renderHeader();renderQueue();if(!inOverview())renderAssistant();}
}
function ensureVisibleCoverage(){
 const v=ensureView(state),days=v.mode==='month'?monthGrid(v.anchor):displayedDays();
 ensureScopeCoverage({start:days[0],end:shiftDate(days.at(-1),1)}).catch(()=>{});
}
async function ensureScopeCoverage(scope){
 if(!status.google?.calendar)return;
 const days=scopeDays(scope),missing=days.filter(d=>!dayCovered(snapshot,d));if(!missing.length)return;
 // Serial reads share the provider sync lock and cannot compete with one another.
 if(Date.parse(missing.at(-1))-Date.parse(missing[0])>=93*86400000){for(let i=0;i<days.length;i+=90)await ensureScopeCoverage({days:days.slice(i,i+90)});return;}
 const start=missing[0],end=shiftDate(missing.at(-1),1),key=start+'/'+end;
 if(rangeLoads.has(key))return rangeLoads.get(key).promise;
 const record={status:'loading'};rangeLoads.set(key,record);
 record.promise=rangeQueue=rangeQueue.catch(()=>{}).then(async()=>{
  if(scopeDays({start,end}).every(d=>dayCovered(snapshot,d))){record.status='loaded';renderHeader();return;}
  const owner=current();traceInteraction(owner.state,'coverage-request',{range:{start,end}});
  try{
   const job=await api('/api/calendar-range',{range:{start,end}}),result=await waitJob(job.jobId);
   if(result.status!=='loaded')throw Error(result.error||'These dates could not be loaded yet.');
   record.status='loaded';await receiveCalendar(await api('/api/calendar-state'));
   traceInteraction(owner.state,'coverage-loaded',{range:{start,end}});
  }catch(error){record.status='error';traceInteraction(owner.state,'coverage-error',{range:{start,end},error:error.message});}
  renderHeader();
 });
 return record.promise;
}
async function pollCalendar(){if(polling||!snapshot||document.hidden)return;polling=true;lastCalendarPoll=Date.now();try{await receiveCalendar(await api('/api/calendar-state'));}catch{}finally{polling=false;}}
async function syncNow(){setStatus('Syncing…');const job=await api('/api/sync',{});const result=await waitJob(job.jobId);await pollCalendar();if(result.status==='disconnected')showAbout();else setStatus(result.error||'Calendar updated');if(drawerType==='settings')showSettings();}
const actions={
 tuck:()=>floating.tuck(),untuck:openEntry,'close-thread':()=>closeThread(),'apply-settings':()=>applySettings(),
 'pill-menu':showPillMenu,
 'event-guests':()=>eventPanel('guests'),'event-description':()=>eventPanel('description'),'event-move':()=>eventPanel('move'),'event-options':()=>eventPanel('options'),'event-back':()=>inspect(state.inspected),
 'discuss-event':()=>{const ref=state.inspected,days=[...state.days];if(state.created.some(e=>e.ref===ref)||state.edits[ref]){closeDrawer();floating.tuck(false,{focus:true});return;}newConversation();state.days=days;state.selected=[ref];current().title=eventByRef(ref)?.title||'Calendar';render();$('#command').focus();},
 'pin-conversation':()=>{pillPinned=floating.pin();closeDrawer();},
 mail:()=>mail.open(),
 'received-context':()=>received.queue(),
 'sign-out':async()=>{await api('/auth/logout',{});localStorage.removeItem(STORE);localStorage.removeItem(PREFERENCES);location.assign('/login');},
 month:()=>setCalendarView('month'),'collapse-month':()=>backView(),'view-back':()=>backView(),day:()=>setCalendarView('day'),workweek:()=>setCalendarView('workweek'),fullweek:()=>setCalendarView('fullweek'),
 'back-week':()=>backView(),'today':()=>showWeek(weekDates(dayKey({start:new Date().toISOString()}))),
 'view-trace':()=>openDrawer('View diagnostics',`<p>${CLIENT_BUILD} · Latest 50 transitions in this conversation</p><pre class="view-trace">${esc(JSON.stringify(state.interactionTrace||[],null,2))}</pre>`,'view-trace'),
 'load-dates':()=>{if(!status.google?.calendar)return showAbout();for(const [key,job] of rangeLoads)if(job.status==='error')rangeLoads.delete(key);ensureVisibleCoverage();},
 'previous-week':()=>shiftCalendar(-1),'next-week':()=>shiftCalendar(1),
 'toggle-selection-mode':()=>{selectionMode=!selectionMode;renderHeader();},
 undo:()=>apply([{op:'undo'}]),redo:()=>apply([{op:'redo'}]),compare:()=>apply([{op:'compare',mode:state.source?'scenario':'source'}]),
 'clear-selection':()=>{closeDrawer();selectionMode=false;apply([{op:'clear',mode:'selection'},{op:'clear',mode:'gaps'}]);},
 'show-blocked-steps':()=>{if(SURFACE==='canvas'){whyOpen=true;return renderHeadline();}$('#proposal-details').open=true;$('.step-warning')?.scrollIntoView({block:'center',behavior:'smooth'});},
 'bulk-accept':()=>directAction('accept',activeIds()),
 'review-changes':()=>{reviewIndex=0;whyOpen=false;focusReview();},
 'review-next':()=>{reviewIndex++;focusReview();},'review-prev':()=>{reviewIndex--;focusReview();},
 'review-done':()=>{reviewIndex=null;reviewRef=null;renderCalendar();renderHeadline();},
 'toggle-why':()=>{whyOpen=!whyOpen;renderHeadline();},
 'set-surface':()=>{const next=SURFACE==='canvas'?'docked':'canvas';try{localStorage.setItem('dayweave-surface',next);}catch{}const url=new URL(location.href);url.searchParams.set('surface',next);location.assign(url);},
 'bulk-decline':()=>directAction('decline',activeIds()),
 'bulk-decline-note':()=>{selectionNote=selectionNote===null?'':null;renderSelection();},
 'bulk-remove':()=>directAction('remove',activeIds()),
 'bulk-cancel':()=>directAction('cancel',activeIds()),
 'ask-selection':()=>{const field=$('#command');if(!field.value.trim())field.value='About these '+activeIds().length+' selected: ';resizeComposer();field.focus();},
 'move-set':moveSet,threads:showThreads,stop:stopThinking,retry:()=>submit(state.lastInput),'proposal-history':showProposalHistory,queue:showQueue,home:()=>home(true),back:showQueue,new:newConversation,next:nextDecision,later:()=>{closeDrawer();return disposition('later');},dismiss:()=>{closeDrawer();return disposition('dismissed');},reopen:()=>disposition('open'),settings:showSettings,sync:syncNow,recheck:reviewChanges,execute,about:showAbout,activity:showActivity,
 history:()=>openDrawer('This conversation',chatMarkup(current(),40)||'<p>Your conversation will appear here.</p>','history'),
 'review-suggestion':()=>openSuggestion(current().id,true),'hide-suggestion':()=>{state.suggestion=null;state.hiddenSuggestion=true;render();},'back-conversation':backToConversation,'return-proposal':()=>{returnToProposal(current());state=current().state;render();},'close-drawer':closeDrawer,'response-details':()=>openDrawer('Context',`<p style="white-space:pre-wrap">${esc(human(state.detail))}</p>`),
 'use-response':()=>{const response=state.pendingResponse;if(!response)return;try{applyModelResponse(current(),response,proposalSignature(state),snapshot.events);state=current().state;render();scheduleCheck();}catch(e){toast(e.message);}},
 'refresh-review':refreshReview
};
document.addEventListener('submit',e=>{
 if(e.target.id!=='compressed-date-form')return;e.preventDefault();
 const input=$('#compressed-date');if(!input.reportValidity())return;const date=input.value;
 if(e.submitter?.value==='include'){const days=[...new Set([...state.days,date])].sort();closeDrawer();phoneRange=true;apply([{op:'view',days}]);}
 else showWeek(weekDates(date));
});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!state)return;
 if(b.dataset.draftToggle){e.stopPropagation();const key=b.dataset.draftToggle;setStepIncluded(key,!!state.excluded?.includes(key));return;}
 if(b.dataset.modelChoice){setModel(b.dataset.modelChoice);return;}
 if(b.dataset.prompt){$('#command').value=b.dataset.prompt;$('#command').dispatchEvent(new Event('input'));$('#command').focus();return;}
 if(b.dataset.monthDay){closeDrawer();apply([{op:'view',mode:'expand',date:b.dataset.monthDay}]);const expanded=$('.month-week.expanded');if(expanded)$('#calendar-scroll').scrollTop=expanded.offsetTop-$('.month-grid').offsetTop-32;return;}
 if(b.dataset.focusDay)return chooseDay(b.dataset.focusDay);
 if(b.dataset.expandDates)return expandDates(b.dataset.expandDates);
 if(b.dataset.includeDay){const shown=displayedDays(),days=[...new Set([...shown,b.dataset.includeDay])].sort();
  if(phoneLayout.matches&&!phoneRange&&state.days.length>1)navigateView(state,{mode:'day',date:shown[0]},{remember:false});
  phoneRange=true;return apply([{op:'view',days}]);}
 if(b.dataset.action){Promise.resolve().then(()=>actions[b.dataset.action]?.()).catch(e=>{toast(e.message);setStatus(e.message);});return;}
 if(b.dataset.decision)return activate(b.dataset.decision);
 if(b.dataset.restoreProposal){restoreProposalVersion(current(),+b.dataset.restoreProposal);state=current().state;closeDrawer();render();scheduleCheck();animateReply();return;}
 if(b.dataset.bucket){queueTab=b.dataset.bucket;renderQueue();return;}
 if(b.dataset.dismiss){disposition('dismissed',b.dataset.dismiss).catch(e=>toast(e.message));return;}
 if(b.dataset.day)return phoneLayout.matches?chooseDay(b.dataset.day):apply([{op:'view',days:[b.dataset.day]}]);
 if(b.dataset.stepDetails)return showStep(b.dataset.stepDetails);
 if(b.dataset.refreshEvent){api('/api/events/refresh',{ref:b.dataset.refreshEvent}).then(r=>{snapshot=r.snapshot;state.check=null;render();scheduleCheck();}).catch(e=>toast(e.message));return;}
 if(b.dataset.forget){api('/api/memory',{remove:+b.dataset.forget}).then(showActivity).catch(e=>toast(e.message));return;}
 if(b.dataset.eventAction){const ref=b.dataset.id;if(inOverview()){const title=eventByRef(ref)?.title;newDecision();current().title=title||'Change event';}if(apply([{op:'edit',ids:[ref],action:b.dataset.eventAction}],'Updated the steps.')){closeDrawer();}return;}
 if(b.dataset.event){if(suppressClick){suppressClick=false;return;}const ref=b.dataset.event,multiple=selectionMode||e.shiftKey||e.metaKey||e.ctrlKey;if(!multiple&&(floating.tucked||entryFresh||state.responseNote)&&isOpen(current())&&state.edits[ref]){returnToProposal(current());activate(activeId);return;}if(multiple)toggleEventSelection(ref);else if(state.inspected===ref){closeDrawer();}else if(state.selected.includes(ref)){apply([{op:'select',ids:[ref],mode:'remove'}]);closeDrawer();}else{inspect(ref);}return;}
 if(b.dataset.gap)apply([{op:'create',title:state.gapTitle,date:dayKey({start:b.dataset.gap}),time:timeString(b.dataset.gap),minutes:state.gapMinutes}],'Here is the new hold.');
});
$('#drawer-shade').onclick=closeDrawer;
$('#toast').addEventListener('click',e=>{if(!e.target.closest('[data-toast-undo]')||!toastUndo)return;const undo=toastUndo;toastUndo=null;$('#toast').hidden=true;Promise.resolve(undo()).catch(error=>toast(error.message));});
document.addEventListener('pointerdown',e=>{if(drawerType==='event'&&!phoneLayout.matches&&!$('#drawer').contains(e.target)&&!e.target.closest('[data-event]'))closeDrawer();});
$('#drawer').addEventListener('toggle',()=>{if(drawerType==='event')positionEventCard();},true);
$('#composer').onsubmit=e=>{e.preventDefault();submit($('#command').value);};
$('#phone-view').onchange=e=>setCalendarView(e.target.value);
function resizeComposer(){const field=$('#command');if(!field.value)field.style.height='';else{field.style.height='0px';field.style.height=Math.max(44,Math.min(112,field.scrollHeight))+'px';}}
function currentSettings(){return settingsCatalog({calendar:snapshot?.calendarSettings||CALENDAR_DEFAULTS,audienceMode:snapshot?.appearance?.policy.mode!=='semantic',inference:status?.inference,preferences,hosted:!!status?.hosted,testModel:!!status?.testModel?.available});}
const SETTING_VIEWS={settings:'settings',memory:'activity',diagnostics:'view-trace',connection:'about',history:'threads',saved:'queue',sync:'sync'};
function takeSettings(scope,result){
 const ops=(result.operations||[]).filter(o=>o.op==='settings');if(!ops.length)return result;
 const plan=planSettings(ops.flatMap(o=>o.changes||[]),currentSettings()),show=ops.find(o=>o.show)?.show;
 scope.state.settingsProposal=plan.length?{plan,at:Date.now()}:null;
 if(show&&SETTING_VIEWS[show]&&scope.id===activeId)setTimeout(()=>actions[SETTING_VIEWS[show]]?.(),0);
 return {...result,operations:result.operations.filter(o=>o.op!=='settings'),reply:plan.length||show?result.reply:result.reply||'Those settings are already set that way.'};
}
function renderSettingsProposal(){
 const el=$('#settings-proposal'),p=state?.settingsProposal;if(!el)return;el.hidden=!p;if(!p){if(el.innerHTML)el.innerHTML='';return;}
 const value=step=>step.type==='color'?`<span class="settings-swatches"><i style="background:${esc(step.before)}"></i><span aria-hidden="true">→</span><i style="background:${esc(step.after)}"></i><code>${esc(step.after)}</code></span>`:step.type==='text'?`<span>${esc(step.after)}</span>`:`<span><s>${esc(describeValue(step,step.before))}</s> → ${esc(describeValue(step,step.after))}</span>`;
 const markup=`<strong class="settings-title">${esc(summarize(p.plan))}</strong>${p.plan.map(step=>`<div class="settings-step"><span>${esc(step.label)}</span>${value(step)}</div>`).join('')}<div class="settings-actions"><button class="primary" data-action="apply-settings">Apply</button><button data-action="close-thread">Cancel</button><small>Previewing · say yes or press ⌘↵</small></div>`;
 if(el.innerHTML!==markup)el.innerHTML=markup;
}
let applyingSettings=false;
async function commitSettings(plan){
 const colors={},calendar={};
 for(const p of plan){if(isColorKey(p.key))colors[p.key.slice(7)]=p.after;else if(['internalDomains','internalAddresses'].includes(p.key))calendar[p.key]=p.after;}
 if(Object.keys(colors).length)calendar.colors=colors;
 if(Object.keys(calendar).length)await receiveCalendar(await api('/api/calendar-settings',calendar));
 const fast=plan.find(p=>p.key==='fastMode');if(fast){const saved=await api('/api/assistant-settings',{fastMode:fast.after});status.inference={...status.inference,...saved};}
 const model=plan.find(p=>p.key==='model');if(model){const saved=await api('/api/assistant-settings',{model:model.after});status.inference={...status.inference,...saved};try{status=await api('/api/status');}catch{}}
 const reviews=plan.find(p=>p.key==='automaticReviews');if(reviews){const saved=await api('/api/assistant-settings',{maxAutomaticReviews:reviews.after});status.inference={...status.inference,...saved};}
 const read=plan.find(p=>p.key==='readAloud');if(read){preferences.readAloud=read.after;try{savePreferences();}catch{reading=preferences.readAloud;}}
 const memory=plan.find(p=>p.key==='memory.add');if(memory)await api('/api/memory',{body:memory.after});
}
async function applySettings(){
 const proposal=state.settingsProposal;if(!proposal||applyingSettings)return;applyingSettings=true;setStatus('Saving…');
 try{
  await commitSettings(proposal.plan);state.settingsProposal=null;record(current(),'assistant',summarize(proposal.plan)+'. Done.');
  render();restPill();setStatus('');
  const reverse=undoPlan(proposal.plan);
  toast(summarize(proposal.plan)+' · done',reverse.length?{undo:async()=>{await commitSettings(reverse);render();toast('Settings restored');}}:{});
 }catch(error){setStatus(error.message);toast(error.message);}
 finally{applyingSettings=false;}
}
// The palette (canvas): under the request bar, a few things worth asking, recent requests, and the
// commands that used to be buttons. Nothing is chosen until a row is picked; Enter alone still asks the model.
let paletteItems=[],paletteIndex=-1;
function paletteCatalog(){
 const view=ensureView(state).mode,weekends=state.days.length===7,scope=current();
 const proposal=!inOverview()&&isOpen(scope)&&actionBundle(snapshot,state).length>0;
 const span=view==='month'?'this month':displayedDays().length===1?'this day':'this week';
 const asks=(proposal?['Show me other options','Why this change?']:[`What does ${span} look like?`,`Find two hours of focus time ${span==='this day'?'today':span}`,`Which meetings could I skip ${span==='this day'?'today':span}?`]).map(text=>({kind:'ask',group:'Ask',label:text}));
 const seen=new Set(asks.map(a=>a.label.toLowerCase()));
 const recent=Object.values(scopes).flatMap(d=>(d.state.transcript||[]).filter(m=>m.role==='you'&&m.text&&m.text.length>3&&!localIntent(m.text,state.days))).sort((a,b)=>(b.at||0)-(a.at||0))
  .filter(m=>!seen.has(m.text.toLowerCase())&&seen.add(m.text.toLowerCase())).slice(0,3).map(m=>({kind:'ask',group:'Recent',label:m.text.slice(0,120)}));
 const thisWeek=JSON.stringify(state.days)===JSON.stringify(weekDates(dayKey({start:new Date().toISOString()})))&&view==='workweek';
 const count=decisionFeed(decisions(),receivedRecords).filter(d=>d.bucket==='open').length;
 // `search` rows have a button or a shortcut already, so they only appear when typed for.
 const go=[!thisWeek&&{label:'Today',hint:'This week',run:()=>actions.today()},
  ['workweek','fullweek'].includes(view)&&{label:weekends?'Hide weekends':'Show weekends',keywords:'full week saturday sunday',run:()=>setCalendarView(weekends?'workweek':'fullweek')},
  {label:view==='month'?'Next month':'Next week',search:true,run:()=>shiftCalendar(1)},{label:view==='month'?'Previous month':'Previous week',search:true,run:()=>shiftCalendar(-1)},
  view!=='month'&&{label:'Month',hint:'View',search:true,run:()=>setCalendarView('month')},!['workweek','fullweek'].includes(view)&&{label:'Week',hint:'View',search:true,run:()=>setCalendarView('workweek')},view!=='day'&&{label:'Day',hint:'View',search:true,run:()=>setCalendarView('day')}].filter(Boolean).map(c=>({kind:'command',group:'Go to',...c}));
 const open=[{label:count?`Saved (${count})`:'Saved',keywords:'decisions proposals later',search:!count,run:showQueue},{label:'History',keywords:'conversations past',run:showThreads},
  threadOpen()&&{label:'New topic',keywords:'conversation fresh',search:true,run:newConversation},
  {label:selectionMode?'Stop selecting':'Select events',keywords:'multiple bulk',search:!selectionMode,run:actions['toggle-selection-mode']},
  status?.testModel?.available&&{label:usingTest()?'Use the default model':`Use ${testLabel()}`,keywords:'model switch',run:()=>setModel(usingTest()?'default':'test')},
  {label:'Categories and colors',keywords:'kinds color code sort rules legend',run:()=>appearance.open()},
  SURFACE==='canvas'&&{label:railHidden()?'Show hours by category':'Hide hours by category',keywords:'rail side panel mix legend',search:!railHidden(),run:toggleRail},
  status?.hosted&&mail&&{label:'Mail',search:true,run:()=>mail.open()},{label:'Settings',keywords:'preferences connection',run:showSettings}].filter(Boolean).map(c=>({kind:'command',group:'Open',...c}));
 return [...asks,...recent,...go,...open];
}
// The rail can be put away; the choice is remembered on this device.
function railHidden(){return $('.shell').classList.contains('no-mix');}
function toggleRail(){const hide=!railHidden();if(hide)appearance.clearFilter();$('.shell').classList.toggle('no-mix',hide);try{localStorage.setItem('dayweave-rail',hide?'hidden':'shown');}catch{}render();}
function renderPalette(){
 const el=$('#palette');if(!el||!state||!snapshot)return;
 const query=$('#command').value.trim().toLowerCase(),all=paletteCatalog();
 // While typing, only matching rows stay: the palette steps aside for a real request.
 paletteItems=query?all.filter(item=>(item.label+' '+(item.keywords||'')).toLowerCase().includes(query)&&(item.kind!=='ask'||item.label.toLowerCase()!==query)).slice(0,6):all.filter(item=>!item.search);
 paletteIndex=Math.min(paletteIndex,paletteItems.length-1);
 el.hidden=!paletteItems.length;if(el.hidden){el.innerHTML='';return;}
 let group='';
 el.innerHTML=paletteItems.map((item,i)=>`${item.group!==group?`<div class="palette-group">${esc(group=item.group)}</div>`:''}<button type="button" class="palette-row ${item.kind}" role="option" data-palette="${i}" aria-selected="${i===paletteIndex}"><span>${esc(item.label)}</span>${item.hint?`<small>${esc(item.hint)}</small>`:''}</button>`).join('')+'<div class="palette-foot"><span><kbd>↵</kbd> ask</span><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd>esc</kbd> close</span></div>';
 el.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});
}
function openPalette(){if(SURFACE!=='canvas'||!state)return;paletteIndex=-1;renderPalette();}
function closePalette(){const el=$('#palette');if(el){el.hidden=true;el.innerHTML='';}paletteItems=[];paletteIndex=-1;}
const paletteShown=()=>!!$('#palette')&&!$('#palette').hidden;
function runPalette(i){
 const item=paletteItems[i];if(!item)return;closePalette();
 if(item.kind==='ask'){$('#command').value=item.label;submit(item.label);return;}
 state.composer='';$('#command').value='';resizeComposer();$('#command').blur();
 Promise.resolve().then(item.run).catch(error=>toast(error.message));
}
document.addEventListener('pointerdown',e=>{const row=e.target.closest?.('[data-palette]');if(row){e.preventDefault();return;}if(paletteShown()&&!e.target.closest?.('#composer'))closePalette();});
document.addEventListener('click',e=>{const row=e.target.closest?.('[data-palette]');if(row)runPalette(+row.dataset.palette);});
$('#command').addEventListener('click',()=>{if(!paletteShown())openPalette();});
$('#command').addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==$('#command'))closePalette();},150));
// Anything on screen can be put away the same way: the close button, Escape, or "never mind".
function threadOpen(){return !!state.settingsProposal||(!entryFresh&&!!(state.pending||state.transcript.length||!inOverview()))||activeIds().length>0||!!state.gapMinutes;}
async function closeThread(){
 closeDrawer();selectionMode=false;reviewIndex=null;reviewRef=null;whyOpen=false;
 if(state.settingsProposal){state.settingsProposal=null;render();restPill();toast('Settings unchanged');return;}
 if(state.pending)await stopThinking();
 const scope=current(),proposal=!inOverview()&&isOpen(scope)&&scope.status!=='needs_review'&&actionBundle(snapshot,state).length>0;
 if(proposal){await disposition('dismissed',scope.id);}
 if(ensureView(state).mode==='month')apply([{op:'clear',mode:'selection'},{op:'clear',mode:'gaps'}]);
 else showWeek(weekView.length?weekView:state.days);
 state.view.history=[];state.composer='';$('#command').value='';resizeComposer();renderHeader();
 restPill();
}
// Whatever the conversation is about stays on screen: days of highlighted or changed events join the view.
function includeReferencedDays(s){
 if(ensureView(s).mode==='month')return;
 const refs=[...new Set([...Object.keys(s.edits||{}),...(s.highlighted||[]),...(s.selected||[])])];
 const missing=[...new Set(refs.map(ref=>[...snapshot.events,...(s.created||[])].find(e=>e.ref===ref)).filter(e=>e&&!e.allDay).map(dayKey))].filter(d=>!s.days.includes(d));
 if(!missing.length)return;const days=[...new Set([...s.days,...missing])].sort();if(days.length>14)return;
 try{Object.assign(s,runOperations(s,[{op:'view',days}],snapshot.events));}catch{}
}
// The pill never disappears on its own; finishing a thread returns it to a bare input.
function restPill(){entryFresh=true;state.freshEntry=true;renderAssistant();setStatus('');persist();floating.tuck(false,{focus:false});}
// Keystrokes serialize every conversation only after a pause,
// and reach the server only after a longer one. Leaving or hiding the page flushes the local write.
let composerTimer=null;
function flushComposer(){if(composerTimer===null)return;clearTimeout(composerTimer);composerTimer=null;persist(1500);}
$('#command').oninput=()=>{if(!state)return;state.composer=$('#command').value;resizeComposer();clearTimeout(composerTimer);composerTimer=setTimeout(flushComposer,300);if(SURFACE==='canvas'&&document.activeElement===$('#command')){paletteIndex=-1;renderPalette();}};
addEventListener('pagehide',flushComposer);document.addEventListener('visibilitychange',()=>{if(document.hidden)flushComposer();});
$('#command').onkeydown=e=>{
 if(paletteShown()&&['ArrowDown','ArrowUp'].includes(e.key)&&!$('#command').value.includes('\n')){e.preventDefault();const n=paletteItems.length;paletteIndex=e.key==='ArrowDown'?(paletteIndex+1)%n:paletteIndex<=0?-1:paletteIndex-1;renderPalette();return;}
 if(paletteShown()&&e.key==='Enter'&&!e.shiftKey&&!e.metaKey&&!e.ctrlKey&&!e.isComposing&&paletteIndex>=0){e.preventDefault();runPalette(paletteIndex);return;}
 if(e.key==='Escape'&&paletteShown()){e.preventDefault();const idle=!$('#command').value.trim()&&!threadOpen();closePalette();if(idle){$('#command').blur();return;}}
 if(e.key==='Enter')closePalette();
 // Cmd/Ctrl+Enter applies the proposal on screen; plain Enter only ever sends text.
 if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&!$('#command').value.trim()&&state.settingsProposal){e.preventDefault();applySettings();return;}
 if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&!$('#command').value.trim()){const anchor=confirmation();if(anchor&&includedActions(snapshot,state).length){e.preventDefault();execute(anchor);}return;}
 if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit($('#command').value);return;}
 if(e.key==='Escape'){e.preventDefault();if(!$('#command').value.trim())closeThread();}
};
document.addEventListener('input',e=>{
 if(e.target.closest('#settings-live-status'))$('#settings-live-status').dataset.dirty='true';
 const form=e.target.closest('#calendar-settings-form');if(!form)return;
 form.querySelector('[role=status]').textContent='Unsaved changes';
});
document.addEventListener('change',async e=>{if(e.target.dataset.setting){preferences[e.target.dataset.setting]=e.target.checked;savePreferences();if(!reading)window.speechSynthesis?.cancel();return;}if(e.target.id==='participation'){try{const r=await api('/api/events/participation',{ref:e.target.dataset.ref,value:e.target.value});await receiveCalendar(r);render();eventPanel('options');}catch(error){toast(error.message);}return;}if(!e.target.dataset.step)return;if(!setStepIncluded(e.target.dataset.step,e.target.checked))e.target.checked=false;});
// Include or set aside one proposed change; dependent steps follow the step they depend on.
function setStepIncluded(key,on){
 const all=actionBundle(snapshot,state),selected=all.find(a=>a.key===key);if(!selected)return false;
 if(on&&selected.dependsOn.some(k=>state.excluded?.includes(k))){toast('Include the earlier step first.');return false;}
 state.excluded=on?(state.excluded||[]).filter(k=>k!==key):[...new Set([...(state.excluded||[]),key])];
 if(!on){let changed=true;while(changed){changed=false;for(const a of all)if(!state.excluded.includes(a.key)&&a.dependsOn.some(k=>state.excluded.includes(k))){state.excluded.push(a.key);changed=true;}}}
 state.check=null;state.executionId=null;state.responseNote=null;state.returnView=null;render();scheduleCheck();return true;
}
document.addEventListener('change',async e=>{
 if(e.target.id!=='fast-mode')return;
 try{const saved=await api('/api/assistant-settings',{fastMode:e.target.checked});status.inference={...status.inference,...saved};toast(saved.fastMode?'Fast replies on':'Fast replies off');}
 catch(error){e.target.checked=!e.target.checked;toast(error.message);}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='selection-note-form'){e.preventDefault();const note=$('#selection-note').value.trim();return directAction('decline',activeIds(),note?{note}:{});}
 const id=e.target.id;if(!['move-form','shift-form','message-form','connect-form','preference-form','calendar-settings-form','assistant-settings-form'].includes(id))return;e.preventDefault();
 try{
 if(id==='move-form'){if(inOverview()){const title=eventByRef(e.target.dataset.ids.split(',')[0])?.title;newDecision();current().title=title||'Move meeting';}if(apply([{op:'edit',ids:e.target.dataset.ids.split(','),action:'move',date:$('#move-date').value,time:$('#move-time').value,minutes:+$('#move-duration').value}],'Here is the proposed time.'))closeDrawer();}
 if(id==='shift-form'){if(apply([{op:'edit',ids:e.target.dataset.ids.split(','),action:'move',deltaDays:+$('#shift-days').value,deltaMinutes:+$('#shift-minutes').value}],'Here is the proposed move.'))closeDrawer();}
 if(id==='message-form'){checkpoint(state);const data={channel:$('#message-channel').value,to:$('#message-to').value,subject:$('#message-subject').value,body:$('#message-body').value};if(e.target.dataset.ref)state.requestMessages[e.target.dataset.ref]=data;else{const d=state.drafts.find(d=>d.id===e.target.dataset.draft);Object.assign(d,{...data,recipient:data.to});}state.check=null;state.executionId=null;closeDrawer();render();scheduleCheck();}
 if(id==='assistant-settings-form'){const saved=await api('/api/assistant-settings',{maxAutomaticReviews:+$('#automatic-limit').value});status.inference={...status.inference,...saved};showSettings();return;}
 if(id==='calendar-settings-form'){await saveCalendarSettings(e.target);return;}
 if(id==='preference-form'){await api('/api/memory',{body:$('#preference').value});await showActivity();}
 if(id==='connect-form'){const email=$('#gmail-permission').checked;if(!status.google.configured){await api('/api/google/configure',{client_id:$('#client-id').value.trim(),client_secret:$('#client-secret').value.trim()});status.google.configured=true;}const {url}=await api('/api/google/connect',{email});$('#oauth-link').innerHTML=`<a href="${esc(url)}" target="_blank" rel="noreferrer" class="oauth-button">Continue to Google ↗</a><p>Open in your regular browser and approve the requested connection. Return here when finished.</p>`;}
 }catch(error){toast(error.message);}
});
document.addEventListener('keydown',e=>{
 if(!$('#drawer').hidden){
  if(e.key==='Escape'){e.preventDefault();closeDrawer();return;}
  if(e.key==='Tab'&&$('#drawer').getAttribute('aria-modal')==='true'){const items=[...$('#drawer').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  return;
 }
 if(!state)return;
 if(e.key==='Escape'&&reviewIndex!==null){e.preventDefault();return actions['review-done']();}
 // A category chosen in the rail is the first thing Escape lets go of.
 if(e.key==='Escape'&&appearance.filter&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();appearance.clearFilter();return;}
 if(e.key==='Escape'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();if(threadOpen()&&(!state.view.history.length||state.result||workStatus(current()).kind==='error'))closeThread();else actions['back-week']();return;}
 if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();if(SURFACE==='canvas'||!floating.tucked){$('#command').focus();openPalette();}else openEntry();}
 if(SURFACE==='canvas'&&reviewIndex!==null&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&['j','k','ArrowRight','ArrowLeft','x'].includes(e.key)){
  e.preventDefault();if(e.key==='x'){const a=actionBundle(snapshot,state)[reviewIndex];if(a)setStepIncluded(a.key,!!state.excluded?.includes(a.key));return;}
  reviewIndex+=['j','ArrowRight'].includes(e.key)?1:-1;return focusReview();}
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();actions[e.shiftKey?'redo':'undo']();}
});
$('#calendar').addEventListener('pointerdown',e=>{const el=e.target.closest('.event[data-ref]');if(!el||e.pointerType==='touch'||selectionMode||e.button!==0||e.shiftKey||e.metaKey||e.ctrlKey||state.source||state.executionRunning)return;const track=el.closest('.day-track');if(!track)return;drag={el,ref:el.dataset.ref,x:e.clientX,y:e.clientY,startDate:track.dataset.date,originMinute:calendarScale.minute(e.clientY-track.getBoundingClientRect().top),moved:false,dy:0,target:track.dataset.date};el.setPointerCapture(e.pointerId);});
$('#calendar').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<8)return;drag.moved=true;const track=[...document.querySelectorAll('.day-track')].find(t=>{const r=t.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<r.right;});drag.target=track?.dataset.date;drag.dy=track?Math.round((calendarScale.minute(e.clientY-track.getBoundingClientRect().top)-drag.originMinute)/15)*15:0;drag.el.classList.add('dragging');drag.el.style.transform=`translate(${dx}px,${dy}px)`;setStatus(`Preview · ${drag.target?dateLabel(drag.target):'choose a visible day'} · ${drag.dy>0?'+':''}${drag.dy} minutes`);});
$('#calendar').addEventListener('pointerup',()=>{if(!drag)return;const d=drag;drag=null;if(!d.moved)return;suppressClick=true;setTimeout(()=>suppressClick=false,150);if(!d.target){renderCalendar();return toast('Drop inside a visible day, or choose a date in event details.');}const deltaDays=Math.round((Date.parse(d.target)-Date.parse(d.startDate))/86400000);apply([{op:'edit',ids:state.selected.includes(d.ref)?state.selected:[d.ref],action:'move',deltaDays,deltaMinutes:d.dy}],'Here is the proposed move.');setStatus('Proposed move · drag again or Undo');});
$('#calendar').addEventListener('pointercancel',()=>{drag=null;renderCalendar();});
function syncViewport(){
 const viewport=window.visualViewport;if(viewport&&viewport.scale===1)document.documentElement.style.setProperty('--app-height',`${viewport.height}px`);
 $('.shell').classList.toggle('keyboard-open',phoneLayout.matches&&!!viewport&&window.innerHeight-viewport.height>120);
}
let resizeTimer;function onResize(){syncViewport();clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(snapshot&&state){renderHeader();renderCalendar();positionEventCard();}},100);}
window.addEventListener('resize',onResize);window.visualViewport?.addEventListener('resize',onResize);phoneLayout.addEventListener('change',onResize);syncViewport();
async function reviewChanges(){
 if(state.receivedContext&&status.hosted){
  const scope=current(),fresh=await api('/api/context/'+scope.state.receivedContext.id);
  if(fresh.problem)throw Error(fresh.problem);
  scope.state.receivedContext={id:fresh.id,version:fresh.version,findings:fresh.payload.findings,source:fresh.source};
  if(current()!==scope)return;
 }
 await submit('Reassess this decision against the current calendar and evidence. Preserve my intent, drop obsolete steps, and show the updated recommendation.');
}
async function takeUpReceived(record){
 await pollCalendar();const fresh=await api('/api/context/'+record.id);
 if(fresh.decision_id){
  if(scopes[fresh.decision_id])return activate(fresh.decision_id);
  const result=await api('/api/context/'+record.id+'/take-up',{version:fresh.version,calendarRevision:snapshot.calendarRevision||0,state:{}});
  scopes[result.decision.id]=hydrateDecision(snapshot,result.decision);return activate(result.decision.id);
 }
 if(fresh.problem)throw Error(fresh.problem);
 newConversation();
 state.receivedContext={id:fresh.id,version:fresh.version,findings:fresh.payload.findings,source:fresh.source};
 state.incomingSuggestion={title:fresh.payload.title,rationale:fresh.payload.rationale,operations:fresh.operations};
 await submit('Review this incoming suggestion against my existing decisions and its supporting evidence. Prepare useful work, add an alternative or evidence to an existing decision, or explain why no action is needed.');
}
async function initializeHostedTools(){
 if(status.hosted){const {createMail}=await import('./mail.js');mail=createMail({api,openDrawer,esc,account:()=>status?.user?.email||'',onDiscuss:thread=>{closeDrawer();state.mailThreadIds=[thread.id];submit('Help me work through this email discussion in the context of my calendar and current decision.');}});const {createReceivedContext}=await import('./received-context.js');received=createReceivedContext({api,openDrawer,esc,takeUp:takeUpReceived,toast,onChange:records=>{receivedRecords=records;if(state){renderHeader();if(drawerType==='decisions')renderQueue();}},showDecisions:showQueue});}
 if(received){renderHeader();received.poll().catch(()=>{});received.deepLink();}
}
async function start(){
 try{const boot=await api('/api/bootstrap');status=boot.status;if(status.user?.id){STORE+=':'+status.user.id;PREFERENCES+=':'+status.user.id;}try{const savedPreferences=JSON.parse(localStorage.getItem(PREFERENCES)||'{}');preferences.readAloud=savedPreferences.readAloud===true;}catch{}const loaded=[boot.snapshot,boot.review,status,{decisions:boot.decisions}];[snapshot,review,status]=loaded;setTimezone(snapshot.timezone||'America/New_York');if(review.snapshotKey!==snapshot.snapshotKey)review={decisions:[],annotations:[]};
  for(const note of review.annotations||[]){const e=snapshot.events.find(e=>e.ref===note.id);if(e){e.tags=note.tags;e.tagBasis=note.basis;}}
  let saved;try{saved=JSON.parse(localStorage.getItem(STORE));}catch{}
  if(saved?.snapshotKey===snapshot.snapshotKey){scopes=saved.scopes||{};activeId=saved.activeId;}
  for(const d of loaded[3].decisions){if(d.state.snapshotKey!==snapshot.snapshotKey)continue;if(!scopes[d.id]||(d.state.saveVersion||0)>(scopes[d.id].state.saveVersion||0))scopes[d.id]={...d,refs:[...new Set([...Object.keys(d.state.edits||{}),...snapshot.events.filter(e=>d.eventIds?.includes(e.id)).map(e=>e.ref)])]};else scopes[d.id].status=d.status;}
  if(!Object.keys(scopes).length){for(const proposal of review.decisions){const d=makeDecision(snapshot,{...proposal,origin:'Calendar review'});scopes[d.id]=d;await saveScope(d);}}
  if(!Object.keys(scopes).length){const d=makeDecision(snapshot);scopes[d.id]=d;}
  if(!scopes[HOME])scopes[HOME]=makeDecision(snapshot,{id:HOME,title:'Calendar'});
  for(const d of Object.values(scopes))pruneSelection(d.state,snapshot.events);
  for(const [id,d] of Object.entries(scopes))scopes[id]=hydrateDecision(snapshot,d);
  for(const d of Object.values(scopes)){d.state.pending=!!d.state.pendingJob;d.state.executionRunning=false;d.state.check=null;d.state.requestMessages||={};d.refs||=[];if(!d.state.edits||!Object.keys(d.state.edits).length){if(!d.state.created?.length&&!d.state.drafts?.length&&d.status==='open'&&!d.state.receivedContext&&d.state.threadType!=='decision')d.state.threadType='conversation';}saveProposalVersion(d);}
  lastConversationId=scopes[saved?.lastConversationId]&&isConversation(scopes[saved.lastConversationId])?saved.lastConversationId:HOME;activeId=saved?.uiVersion===7&&scopes[activeId]?activeId:lastConversationId;pruneConversations(scopes,40,[activeId,lastConversationId]);clearIdleFocus(current());state=current().state;state.inspected=null;navigateView(state,{mode:'workweek',date:snapshot.defaultDate||dayKey({start:new Date().toISOString()})},{remember:false});state.view.history=[];weekView=[...state.days];if(state.pendingJob)state.pendingJob.manualView=true;entryFresh=!!state.freshEntry;state.unread=false;$('#command').disabled=false;reading=preferences.readAloud;render();$('#command').value=state.composer||'';resizeComposer();if(!state.composer?.trim()&&!state.pending){entryFresh=true;state.freshEntry=true;renderAssistant();}floating.tuck(false,{focus:false});revealCalendar(Object.keys(state.edits));setStatus('');lastCalendarPoll=Date.now();requestAnimationFrame(()=>{initializeHostedTools().catch(()=>toast('Additional tools could not load. Reload to retry.'));});for(const d of Object.values(scopes))if(d.state.pendingJob){requests.set(d.id,d.state.pendingJob.seq);finishReply(d);}
 }catch(e){$('#assistant-title').textContent='Could not load the calendar';$('#assistant-detail').textContent=e.message;}
}
window.addEventListener('focus',async()=>{if(!status)return;try{const fresh=await api('/api/status');status=fresh;renderHeader();pollCalendar();}catch{}});
setInterval(()=>{if(received&&!document.hidden)received.poll().catch(()=>{});},30000);
setInterval(()=>{if(!status?.hosted||Date.now()-lastCalendarPoll>=30000)pollCalendar();},5000);
setInterval(()=>{if(snapshot){renderWork();if(clockMinute!==new Date().toISOString().slice(0,16))updateClock();if(drawerType==='threads')showThreads();}},1000);
start();

document.addEventListener('click',event=>{const button=event.target.closest('[data-option]');if(!button)return;try{chooseAlternative(snapshot,current(),button.dataset.option);state=current().state;saveProposalVersion(current());render();scheduleCheck();}catch(error){toast(error.message);}});
