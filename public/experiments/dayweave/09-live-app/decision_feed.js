import {isConversation} from './threads.js';

export const decisionBucket=status=>['open','running','needs_review'].includes(status)?'open':['later','waiting'].includes(status)?'later':'closed';

// One entry per decision, regardless of where it started. Findings are evidence,
// not work items, and a linked suggestion must never count a second time.
export function decisionFeed(scopes,records=[],now=Date.now()/1000){
 const decisions=scopes.filter(d=>!isConversation(d)),known=new Set(decisions.map(d=>d.id));
 const takenUp=new Set(decisions.map(d=>d.state.receivedContext?.id).filter(Boolean));
 const linked=new Map(records.filter(r=>r.decision_id).map(r=>[r.decision_id,r]));
 const entries=decisions.map(d=>({kind:'decision',id:d.id,title:d.title,status:d.status,bucket:decisionBucket(d.status),
  source:linked.get(d.id)?.source||d.state.receivedContext?.source||d.state.origin||'',decision:d,updated:d.updated||0}));
 for(const r of records){
  if(r.kind!=='suggestion'||known.has(r.decision_id)||takenUp.has(r.id)||r.status==='removed')continue;
  let status=r.decision_status;
  if(!r.decision_id)status=r.status==='active'?(r.expires<=now?'obsolete':r.problem?'needs_review':'open'):r.status==='dismissed'?'dismissed':'obsolete';
  if(!status)continue;
  entries.push({kind:'context',id:r.id,title:r.payload.title,status,bucket:!r.decision_id&&['open','needs_review'].includes(status)?'incoming':decisionBucket(status),source:r.source,record:r,updated:r.updated||0});
 }
 return entries.sort((a,b)=>(a.decision?.state.priority||2)-(b.decision?.state.priority||2)||b.updated-a.updated||a.id.localeCompare(b.id));
}
