// Calendar navigation, inquiry scope and provider coverage are independent.
// No event edits, inference or network calls belong in this module.
const copy=value=>JSON.parse(JSON.stringify(value));
export const shiftDay=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const validDay=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00Z'))&&shiftDay(date,0)===date;
export function dateRange(start,end,limit=366){
 if(!validDay(start)||!validDay(end))throw Error('Choose valid calendar dates.');
 const count=Math.round((Date.parse(end+'T12:00Z')-Date.parse(start+'T12:00Z'))/86400000);
 if(count<1||count>limit)throw Error(`Choose a range of one to ${limit} days.`);
 return Array.from({length:count},(_,i)=>shiftDay(start,i));
}
export function monthRange(anchor){if(!validDay(anchor))throw Error('Choose a valid month.');const start=anchor.slice(0,7)+'-01',d=new Date(start+'T12:00Z');d.setUTCMonth(d.getUTCMonth()+1);return {start,end:d.toISOString().slice(0,10)};}
export function monthGrid(anchor){const range=monthRange(anchor),start=weekStart(range.start),end=shiftDay(weekStart(shiftDay(range.end,-1)),7);return dateRange(start,end,42);}
export const weekStart=date=>shiftDay(date,-((new Date(date+'T12:00Z').getUTCDay()+6)%7));
export function inferMode(days){if(days.length===1)return 'day';for(const [mode,n]of [['workweek',5],['fullweek',7]])if(days.length===n&&days[0]===weekStart(days[0])&&days.every((d,i)=>d===shiftDay(days[0],i)))return mode;return 'custom';}
export function scopeDays(scope,fallback=[]){
 if(scope?.start&&scope?.end)return dateRange(scope.start,scope.end);
 const days=scope?.days||fallback;if(!Array.isArray(days)||days.length>366||days.some(d=>!validDay(d)))throw Error('Choose valid dates for this question.');return [...new Set(days)].sort();
}
export function normalizedScope(scope,fallback=[]){const days=scopeDays(scope,fallback);if(!days.length)return null;return days.every((d,i)=>d===shiftDay(days[0],i))?{start:days[0],end:shiftDay(days.at(-1),1)}:{days};}
export function viewFrame(state){return {mode:state.view?.mode||inferMode(state.days),anchor:state.view?.anchor||state.days[0],days:[...state.days],expandedWeek:state.view?.expandedWeek||null,focusDate:state.view?.focusDate||null};}
export function ensureView(state){
 if(!state.view||state.view.version!==1)state.view={version:1,...viewFrame(state),history:[],revision:0};
 // Legacy proposal framing may have changed days without a navigation operation.
 if(JSON.stringify(state.view.days)!==JSON.stringify(state.days)){state.view={...state.view,mode:inferMode(state.days),anchor:state.days[0],days:[...state.days],expandedWeek:null,focusDate:null};}
 state.view.history=Array.isArray(state.view.history)?state.view.history.slice(-12):[];
 return state.view;
}
export function navigateView(state,op,{remember=true}={}){
 ensureView(state);const before=viewFrame(state),anchor=op.date||state.view.anchor||state.days[0];
 if(!validDay(anchor))throw Error('Choose a valid calendar date.');
 if(op.mode==='back'){
  const previous=state.view.history.pop();if(previous){state.days=[...previous.days];Object.assign(state.view,previous,{revision:state.view.revision+1});}return state;
 }
 let days,mode=op.mode||'custom';
 if(mode==='month'){const range=monthRange(anchor);days=dateRange(range.start,range.end);}
 else if(mode==='day')days=[anchor];
 else if(mode==='workweek'||mode==='fullweek')days=Array.from({length:mode==='fullweek'?7:5},(_,i)=>shiftDay(weekStart(anchor),i));
 else if(mode==='expand'){
  if(state.view.mode!=='month')throw Error('Open Month to expand a week.');
  state.view.expandedWeek=state.view.expandedWeek===weekStart(anchor)&&state.view.focusDate===anchor?null:weekStart(anchor);state.view.focusDate=anchor;state.view.revision++;return state;
 }else if(mode==='custom'){
  days=scopeDays({days:op.days});if(!days.length||days.length>14)throw Error('Compare between one and fourteen dates.');mode=inferMode(days);
 }else throw Error('Choose Month, Day, Workweek, Full week, or specific dates.');
 if(remember&&(before.mode!==mode||JSON.stringify(before.days)!==JSON.stringify(days)||before.expandedWeek))state.view.history.push(before);
 state.days=days;state.view={version:1,mode,anchor:mode==='month'?monthRange(anchor).start:days[0],days:[...days],expandedWeek:null,focusDate:null,history:state.view.history.slice(-12),revision:state.view.revision+1};return state;
}
export function restoreView(state,frame){if(!frame)return;const history=state.view?.history||[],revision=(state.view?.revision||0)+1;state.days=[...frame.days];state.view={version:1,...copy(frame),history,revision};}
export function coverageRanges(snapshot){return Array.isArray(snapshot.coverage)?snapshot.coverage.filter(r=>r.state!=='unknown'&&r.state!=='failed'):snapshot.range?[snapshot.range]:[];}
export const dayCovered=(snapshot,date)=>coverageRanges(snapshot).some(r=>date>=r.start&&date<r.end);
export function coveredRange(snapshot,start,end){return dateRange(start,end,93).every(date=>dayCovered(snapshot,date));}
export function viewSummary(state){const v=ensureView(state);return {mode:v.mode,start:state.days[0],end:shiftDay(state.days.at(-1),1),dates:v.mode==='custom'?state.days:undefined,expandedWeek:v.expandedWeek,focusDate:v.focusDate,revision:v.revision};}
export function traceInteraction(state,event,details={}){
 state.interactionTrace=[...(state.interactionTrace||[]),{at:Date.now(),event,view:viewSummary(state),scope:state.questionScope?.days?{days:state.questionScope.days.slice(0,16),count:state.questionScope.days.length}:copy(state.questionScope||null),...details}].slice(-50);
}
const names=['january','february','march','april','may','june','july','august','september','october','november','december'];
export function explicitPeriod(text,anchor){
 const t=text.toLowerCase();let date=anchor;
 const named=t.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(20\d{2}))?\b/);
 if(named?.[1]==='may'&&!named[2]&&/\bmay (?:i|we|you|they|it|this|that|be|have|need|want)\b/.test(t))return null;
 if(named&&(/\bmonth\b/.test(t)||named[2]||!new RegExp(named[1]+'\\s+\\d{1,2}\\b').test(t)))date=`${named[2]||anchor.slice(0,4)}-${String(names.indexOf(named[1])+1).padStart(2,'0')}-01`;
 else if(/\b(this|next|last) month\b/.test(t)){const d=new Date(anchor.slice(0,7)+'-01T12:00Z');d.setUTCMonth(d.getUTCMonth()+(t.includes('next month')?1:t.includes('last month')?-1:0));date=d.toISOString().slice(0,10);}
 else return null;
 return monthRange(date);
}
export function monthCommand(text,anchor){const t=text.toLowerCase().trim().replace(/[?.!]+$/,'');if(!/^(?:(?:can|could) (?:i|we) (?:see|have)|show(?: me)?|open|go to|switch to)?\s*(?:the )?(?:(?:month|month view)(?: of)? ?|this month|next month|last month|january|february|march|april|may|june|july|august|september|october|november|december)/.test(t))return null;
 if(!/^(?:(?:(?:can|could) (?:i|we) (?:see|have)|show(?: me)?|open|go to|switch to) )?(?:the )?(?:(?:month|month view)(?: of)? ?)?(?:(?:this|next|last) month|january|february|march|april|may|june|july|august|september|october|november|december)?(?: 20\d{2})?$/.test(t))return null;
 return {op:'view',mode:'month',date:(explicitPeriod(t,anchor)||monthRange(anchor)).start};
}
