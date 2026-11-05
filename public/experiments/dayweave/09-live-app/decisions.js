import {ensureView,navigateView} from './view_state.js';
import {clone,newState,runOperations,weekDates,unchangedTime} from './workspace.js';
import {dayKey} from './logic.js';
import {canEdit} from './event_facts.js';
export const proposalSignature=s=>JSON.stringify([s.edits,s.created,s.drafts,s.excluded||[],s.requestMessages||{}]);
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(36);};
export function makeDecision(snapshot,proposal={}){
 const id=proposal.id||'decision-'+crypto.randomUUID();let state=newState(snapshot);
 if(proposal.operations?.length)state=runOperations(state,proposal.operations,snapshot.events,{decisionId:id});
 Object.assign(state,{decisionId:id,origin:proposal.origin||'Your change',days:proposal.days?.length?proposal.days:state.days,highlighted:proposal.ids||[],guided:true,reply:proposal.reason||'',detail:proposal.tradeoff||'',excluded:[],requestMessages:{}});
 return {id,title:proposal.title||'New decision',refs:proposal.ids||[],status:'open',state};
}
export function decisionFromOverview(snapshot,origin,response,request){
 const actions=response.operations.filter(o=>['edit','create','draft'].includes(o.op));if(!actions.length)return null;
 const inherited=actions.some(o=>o.op!=='create'&&!o.ids?.length),source=origin.state;
 const refs=[...new Set(actions.flatMap(o=>o.ids||[]))];
 const d=makeDecision(snapshot,{title:response.title||'New decision',days:[...source.days]});
 Object.assign(d.state,{threadType:'decision',parentConversation:origin.id,transcript:clone(source.transcript.slice(-8)),lastInput:request,selected:inherited?[...source.selected]:[],highlighted:inherited?[...source.highlighted]:refs});
 return d;
}
const proposalFields=['view','questionScope','gapKind','edits','created','drafts','excluded','requestMessages','days','selected','highlighted','selectionLabel','focusContext','gapMinutes','proposalFrame','reply','detail'];
export function suggestionFromDecision(decision,revision){
 return {title:decision.title,calendarRevision:revision,linkedDecisionId:decision.id,state:clone(Object.fromEntries(proposalFields.filter(k=>decision.state[k]!==undefined).map(k=>[k,decision.state[k]])))};
}
export function considerSuggestion(snapshot,origin,response){
 const mutates=response.decision?.relationship==='evidence'||response.operations.some(o=>['edit','create','draft'].includes(o.op)||o.op==='clear'&&o.mode==='scenario'||['undo','redo'].includes(o.op));
 if(!mutates)return origin.state.suggestion||null;
 const previous=origin.state.suggestion,d=makeDecision(snapshot,{title:response.title||previous?.title||'Possible change',days:[...origin.state.days]});
 if(previous)Object.assign(d.state,clone(previous.state));
 else Object.assign(d.state,{view:clone(ensureView(origin.state)),questionScope:clone(origin.state.questionScope||null),selected:[...origin.state.selected],highlighted:[...origin.state.highlighted]});
 applyModelResponse(d,response,proposalSignature(d.state),snapshot.events);
 if(response.decision?.relationship!=='evidence'&&!Object.keys(d.state.edits).length&&!d.state.created.length&&!d.state.drafts.length){origin.state.suggestion=null;return null;}
 if(d.title==='Possible change'){
  const actions=actionBundle(snapshot,d.state),first=actions[0],verb={create:'Add',move:'Move',resize:'Resize',remove:'Remove',accept:'Accept',decline:'Decline',tentative:'Mark tentative:',request:'Reschedule',email:'Send'}[first?.kind]||'Review';
  d.title=actions.length===1?`${verb} ${first.title||first.subject||'message'}`:`Review ${actions.length} changes`;
 }
 const suggestion=suggestionFromDecision(d,snapshot.calendarRevision||0);suggestion.linkedDecisionId=previous?.linkedDecisionId||null;
 suggestion.assessment={decision:response.decision,operations:response.operations,contextSummary:response.contextSummary};
 origin.state.suggestion=suggestion;return suggestion;
}
export function decisionFromSuggestion(snapshot,origin,existing){
 const suggestion=origin.state.suggestion;if(!suggestion)throw Error('There is no suggested change to review.');
 if(suggestion.calendarRevision!==(snapshot.calendarRevision||0))throw Error('The calendar changed. Ask me to refresh this suggestion first.');
 const d=makeDecision(snapshot,{title:suggestion.title,days:suggestion.state.days});
 if(existing){d.id=existing.id;d.state.proposalHistory=clone(existing.state.proposalHistory||[]);}
 Object.assign(d.state,clone(suggestion.state),{decisionId:d.id,threadType:'decision',parentConversation:origin.id,transcript:clone(origin.state.transcript.slice(-8)),lastInput:origin.state.lastInput,source:false});
 d.state.origin='Your conversation';
 d.refs=[...new Set([...Object.keys(d.state.edits),...d.state.drafts.flatMap(x=>x.ids||[])])];
 return d;
}
export function actionBundle(snapshot,state){
 const actions=[];
 for(const [ref,c] of Object.entries(state.edits)){
  const e=snapshot.events.find(e=>e.ref===ref);if(!e||unchangedTime(e,c))continue;
  const action={ref,kind:c.kind,title:e.title,stepId:c.stepId,after:c.after||[]};
  if(c.start){action.start=c.start;action.end=c.end;}
  if(['move','resize'].includes(c.kind)&&!canEdit(e)){
   const when=new Intl.DateTimeFormat('en-US',{timeZone:snapshot.timezone,weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(c.start));
   Object.assign(action,{kind:'request',channel:'email',to:e.organizer||'',subject:'New time for '+e.title,body:`Could we move ${e.title} to ${when}? Please let me know if that works.`},state.requestMessages?.[ref]||{});
  }
  action.key='event-'+ref+'-'+hash(JSON.stringify(action));actions.push(action);
 }
 for(const e of state.created){const c=state.edits[e.ref];if(c?.kind==='remove')continue;const action={kind:'create',stepId:e.stepId,after:e.after||[],ref:e.ref,title:e.title,start:c?.start||e.start,end:c?.end||e.end};action.key='create-'+e.ref+'-'+hash(JSON.stringify(action));actions.push(action);}
 for(const d of state.drafts){const action={kind:'email',stepId:d.stepId,after:d.after||[],draftId:d.id,channel:d.channel,to:d.recipient,subject:d.subject||'Calendar coordination',body:d.body};action.key='message-'+d.id+'-'+hash(JSON.stringify(action));actions.push(action);}
 const stepKeys=new Map();for(const a of actions)if(a.stepId)stepKeys.set(a.stepId,[...(stepKeys.get(a.stepId)||[]),a.key]);
 for(const a of actions){a.dependsOn=(a.after||[]).flatMap(id=>{const matched=stepKeys.get(id)||[];return matched.length?matched:['missing-'+id];});delete a.stepId;delete a.after;}
 return actions;
}
export function includedActions(snapshot,state){
 let actions=actionBundle(snapshot,state).filter(a=>!state.excluded?.includes(a.key));
 for(let i=0;i<100;i++){const next=actions.filter(a=>a.dependsOn.every(key=>actions.some(b=>b.key===key)));if(next.length===actions.length)break;actions=next;}return actions;
}
export function visibleProposal(snapshot,state){const included=includedActions(snapshot,state),refs=new Set(included.map(a=>a.ref));return {...state,edits:Object.fromEntries(Object.entries(state.edits).filter(([ref])=>refs.has(ref))),created:state.created.filter(e=>refs.has(e.ref))};}
export function adaptContext(state,events){
 ensureView(state);
 const dates=new Set();
 for(const [ref,c] of Object.entries(state.edits))if(c.start){const e=events.find(e=>e.ref===ref);if(e)dates.add(dayKey(e));dates.add(dayKey({start:c.start}));}
 for(const e of state.created)dates.add(dayKey(e));
 const needed=[...dates].sort();if(!needed.length)return state;
 if(state.view.mode==='month'&&!state.proposalFrame){navigateView(state,{days:needed.slice(0,14)});state.proposalFrame=[...state.days];return state;}
 if(state.proposalFrame&&JSON.stringify(state.days)===JSON.stringify(state.proposalFrame)){
  state.days=needed.slice(0,14);state.proposalFrame=[...state.days];return state;
 }
 if(needed.every(d=>state.days.includes(d)))return state;
 const all=[...new Set([...needed,...state.days])].sort();
 state.days=all.length<=3?all:needed.length<=3?needed:weekDates(needed[0],needed.some(d=>[0,6].includes(new Date(d+'T12:00Z').getUTCDay())));
 if(!needed.every(d=>state.days.includes(d)))state.days=needed.slice(0,14);
 state.proposalFrame=[...state.days];
 return state;
}
export function applyModelResponse(scope,response,expectedSignature,events){
 if(proposalSignature(scope.state)!==expectedSignature){scope.state.pendingResponse=response;return false;}
 if(response.contextSummary)scope.state.contextSummary=response.contextSummary;
 const before=scope.state,hadProposal=Object.keys(before.edits).length||before.created.length||before.drafts.length;
 const next=runOperations(scope.state,response.operations.filter(o=>o.op!=='review'),events,{decisionId:scope.id});
 const changed=proposalSignature(next)!==expectedSignature;
 next.guided=false;next.pendingResponse=null;
 if(hadProposal&&!changed){
  next.responseNote={text:response.reply,detail:response.detail||'',question:before.lastInput};
  next.returnView=before.returnView||captureView(before);
  scope.state=next;
 }else{
  next.reply=response.reply;next.detail=response.detail||'';next.responseNote=null;next.returnView=null;
  if(response.title)scope.title=response.title;
  scope.state=adaptContext(next,events);
 }
 return true;
}
export const captureView=s=>clone(Object.fromEntries(['days','view','questionScope','selected','highlighted','selectionLabel','focusContext','gapMinutes','gapKind','source'].map(k=>[k,s[k]])));
export function returnToProposal(scope){
 if(scope.state.returnView)Object.assign(scope.state,clone(scope.state.returnView));
 scope.state.returnView=null;scope.state.responseNote=null;
}
export function sharedConflicts(scope,scopes){
 const mine=new Set([...scope.refs,...Object.keys(scope.state.edits)]);
 return Object.values(scopes).filter(d=>d.id!==scope.id&&['open','needs_review','running'].includes(d.status)&&[...d.refs,...Object.keys(d.state.edits)].some(id=>mine.has(id)));
}
export function serializeDecision(scope){const copy=clone(scope);delete copy.state.check;delete copy.state.checkProgress;delete copy.state.pending;delete copy.state.executionRunning;return copy;}
