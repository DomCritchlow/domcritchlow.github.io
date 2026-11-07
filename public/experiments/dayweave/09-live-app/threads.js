import {clone,runOperations} from './workspace.js';
import {proposalSignature,captureView} from './decisions.js';
export const isConversation=d=>d?.id==='calendar-home'||d?.state?.threadType==='conversation';
export function workStatus(scope,now=Date.now()){
 const s=scope.state,w=s.work||{};
 if(s.pending){
  const elapsed=Math.max(0,Math.floor((now-(w.startedAt||now))/1000));
  const disconnected=w.lastHeardAt&&now-w.lastHeardAt>10000;
  const label=disconnected?'Connection interrupted':w.status==='queued'?'Queued':w.message?w.message:w.phase==='research'?'Working through options':w.phase==='verifying'?'Checking dates':'Reading your calendar';
  return {kind:disconnected?'disconnected':'working',label,elapsed,detail:disconnected?'Waiting to reconnect':elapsed>45?'Taking longer than usual':'',canStop:true};
 }
 if(s.executionRunning)return {kind:'working',label:'Applying confirmed actions',canStop:false};
 if(w.status==='error')return {kind:'error',label:'Could not finish',detail:w.error,canRetry:true};
 if(w.status==='cancelled')return {kind:'stopped',label:'Stopped',canRetry:true};
 if(scope.status==='needs_review')return {kind:'attention',label:'Calendar changed'};
 if(s.unread)return {kind:'ready',label:'Reply ready'};
 return {kind:'idle',label:({done:'Completed',waiting:'Awaiting reply',later:'For later',dismissed:'Left as is',obsolete:'No longer needed'})[scope.status]||(isConversation(scope)?'Conversation':'Ready to review')};
}
export function saveProposalVersion(scope){
 const s=scope.state;if(!Object.keys(s.edits||{}).length&&!s.created?.length&&!s.drafts?.length)return;
 const history=s.proposalHistory||=[];const signature=proposalSignature(s);
 if(history.at(-1)?.signature===signature)return;
 const fields=['edits','created','drafts','excluded','requestMessages','days','highlighted','selected'];
 history.push({number:(history.at(-1)?.number||0)+1,at:Date.now(),title:scope.title,reply:s.reply,signature,proposal:Object.fromEntries(fields.map(k=>[k,clone(s[k]??(['edits','requestMessages'].includes(k)?{}:[]))]))});
 s.proposalHistory=history.slice(-10);
}
export function restoreProposalVersion(scope,number){
 const item=scope.state.proposalHistory?.find(p=>p.number===number);if(!item)throw Error('That proposal is no longer available.');
 Object.assign(scope.state,clone(item.proposal),{reply:`Restored proposal ${number}. ${item.reply||''}`,check:null,result:null,executionId:null,source:false,responseNote:null,returnView:null});
 scope.state.highlighted=clone(item.proposal.highlighted??Object.keys(item.proposal.edits||{}));
 scope.state.selected=clone(item.proposal.selected??[]);
 scope.title=item.title;
 saveProposalVersion(scope);
}

export function mergeConversationTurns(origin,decision){
 const turns=new Map();for(const turn of [...origin.state.transcript,...decision.state.transcript])turns.set(JSON.stringify([turn.at,turn.role,turn.text]),turn);
 origin.state.transcript=clone([...turns.values()].sort((a,b)=>(a.at||0)-(b.at||0)).slice(-40));
 origin.state.lastInput=[...origin.state.transcript].reverse().find(t=>t.role==='you')?.text||origin.state.lastInput;
}

export function applyEarlyView(scope,partial,pending,snapshot){
 if(!partial||scope.state.earlyView||partial.calendarRevision!==(snapshot.calendarRevision||0))return false;
 if(proposalSignature(scope.state)!==pending.signature||JSON.stringify(captureView(scope.state))!==JSON.stringify(pending.requestView))return false;
 const ops=partial.operations;if(!Array.isArray(ops)||!ops.length||ops.some(o=>!['scope','view','highlight','select','gaps','inspect','compare'].includes(o.op)))return false;
 const before=captureView(scope.state),next=runOperations(scope.state,ops,snapshot.events);
 if(!isConversation(scope))next.returnView ||= before;
 next.earlyView={before,after:captureView(next),calendarRevision:partial.calendarRevision};scope.state=next;return true;
}
export function rollbackEarlyView(scope,snapshot){
 const early=scope.state.earlyView;if(!early)return;
 if(early.calendarRevision===(snapshot.calendarRevision||0)&&JSON.stringify(captureView(scope.state))===JSON.stringify(early.after))Object.assign(scope.state,clone(early.before));
 delete scope.state.earlyView;
}

// The browser remembers every conversation it has seen, and each new request after a finished one
// starts another. Old ones with nothing pending are dropped at start, as the server's list already
// does, so storage and every save stay bounded however long the app is used.
export function pruneConversations(scopes,keep=40,protect=[]){
 const parents=new Set(Object.values(scopes).filter(d=>!isConversation(d)&&['open','needs_review','running','later','waiting'].includes(d.status)).map(d=>d.state.parentConversation));
 const last=d=>Math.max((d.updated||0)*1000,d.state.work?.startedAt||0,...(d.state.transcript||[]).map(m=>m.at||0));
 const idle=Object.values(scopes).filter(d=>isConversation(d)&&d.id!=='calendar-home'&&!protect.includes(d.id)&&!parents.has(d.id)&&!d.state.pendingJob&&!d.state.suggestion&&!d.state.composer?.trim());
 // Conversations that never got a request are not history; the rest keep the most recent `keep`.
 const empty=idle.filter(d=>!(d.state.transcript||[]).length),used=idle.filter(d=>(d.state.transcript||[]).length).sort((a,b)=>last(b)-last(a));
 const drop=[...empty,...used.slice(keep)];
 for(const d of drop)delete scopes[d.id];
 return drop.map(d=>d.id);
}
