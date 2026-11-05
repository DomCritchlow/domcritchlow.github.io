import {newState,clone,runOperations} from './workspace.js';
import {adaptContext,actionBundle,includedActions} from './decisions.js';

const fields=['edits','created','drafts','excluded','requestMessages','days','highlighted','selected','reply','detail'];
const optionState=s=>Object.fromEntries(fields.map(k=>[k,clone(s[k]??(['edits','requestMessages'].includes(k)?{}:['reply','detail'].includes(k)?'':[]))]));

// Compare what would actually happen, not selection, prose, or conversation provenance.
export function actionSignature(snapshot,state){
 const actions=includedActions(snapshot,state);
 const semantic=a=>JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k])=>!['key','dependsOn','draftId'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));
 const keys=new Map(actions.map(a=>[a.key,semantic(a)]));
 return JSON.stringify(actions.map(a=>[semantic(a),a.dependsOn.map(k=>keys.get(k)||k).sort()]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
const alternativeState=(snapshot,decision,option)=>option.state?{...newState(snapshot),...clone(option.state)}:runOperations(newState(snapshot),option.operations,snapshot.events,{decisionId:decision.id});
export function distinctAlternatives(snapshot,decision){
 const seen=new Set([actionSignature(snapshot,decision.state)]);
 return (decision.state.alternatives||[]).filter(option=>{
  // Preserve stale options for inspection; never reinterpret them against changed facts.
  if(option.calendarRevision!==(snapshot.calendarRevision||0))return true;
  try{const signature=actionSignature(snapshot,alternativeState(snapshot,decision,option));if(seen.has(signature))return false;seen.add(signature);return true;}catch{return true;}
 });
}

export function hydrateDecision(snapshot,decision){
 const d=clone(decision);d.state={...newState(snapshot),excluded:[],requestMessages:{},...d.state};d.refs||=snapshot.events.filter(e=>d.eventIds?.includes(e.id)).map(e=>e.ref);
 const pending=d.state.pendingProposal;
 if(pending){
  if(pending.calendarRevision!==(snapshot.calendarRevision||0)){d.status='needs_review';d.state.stale=true;d.state.source=true;}
  else{
   try{d.state=adaptContext(runOperations(d.state,pending.operations,snapshot.events,{decisionId:d.id}),snapshot.events);delete d.state.pendingProposal;}
   catch(error){d.status='needs_review';d.state.stale=true;d.state.source=true;d.state.detail=error.message;}
  }
 }
 return d;
}

export function chooseAlternative(snapshot,decision,id){
 const s=decision.state,option=s.alternatives?.find(a=>a.id===id);
 if(!option)throw Error('That option is no longer available.');
 if(option.calendarRevision!==(snapshot.calendarRevision||0))throw Error('The calendar changed. Ask the assistant to refresh this option.');
 const old={id:'option-'+crypto.randomUUID(),title:'Previous option',reason:s.reply,state:optionState(s),calendarRevision:snapshot.calendarRevision||0,source:s.receivedContext||null};
 let selected=alternativeState(snapshot,decision,option);
 if(actionSignature(snapshot,selected)===actionSignature(snapshot,s))return;
 Object.assign(s,optionState(selected),{reply:option.reason||selected.reply,detail:option.detail||'',receivedContext:option.source||null,
  check:null,result:null,executionId:null,source:false,responseNote:null,returnView:null,stale:false});
 s.removedAlternatives=[...(s.removedAlternatives||[]),id];
 s.alternatives=s.alternatives.filter(a=>a.id!==id);s.alternatives.push(old);
 decision.status='open';s.reviewedCalendarRevision=snapshot.calendarRevision||0;adaptContext(s,snapshot.events);
}

export function relatedOverlaps(snapshot,scope,others){
 const moves=d=>actionBundle(snapshot,d.state).filter(a=>a.start&&a.end);
 const mine=moves(scope);
 return others.filter(d=>d.id!==scope.id&&['open','needs_review'].includes(d.status)&&moves(d).some(b=>mine.some(a=>a.ref!==b.ref&&Date.parse(a.start)<Date.parse(b.end)&&Date.parse(b.start)<Date.parse(a.end))));
}
