// Presentation and bounded local intents. These functions never mutate bookings.
import {dayKey,minutes} from './logic.js';
import {weekDates,shiftDate} from './workspace.js';

// A compressed interval is not an empty day or evidence of availability.
// UTC date arithmetic keeps DST and month/year boundaries from changing the count.
export function calendarSlots(days){
 const dates=[...new Set(days)].sort(),slots=[];
 for(const [index,date] of dates.entries()){
  const previous=dates[index-1];
  const count=previous?Math.round((Date.parse(date+'T12:00Z')-Date.parse(previous+'T12:00Z'))/86400000)-1:0;
  if(count>0)slots.push({kind:'gap',start:shiftDate(previous,1),end:shiftDate(date,-1),count});
  slots.push({kind:'day',date});
 }
 return slots;
}
export function expandedGapDays(days,gap,limit=14){
 if(days.length+gap.count>limit)return null;
 return [...new Set([...days,...Array.from({length:gap.count},(_,i)=>shiftDate(gap.start,i))])].sort();
}
export function calendarViewMode(days){
 if(days.length===1)return 'day';
 for(const [mode,weekends] of [['workweek',false],['fullweek',true]])if(JSON.stringify(days)===JSON.stringify(weekDates(days[0],weekends)))return mode;
 return 'custom';
}

export function eventHasEnded(event,now=Date.now()){
 return event.allDay?event.end.slice(0,10)<=dayKey({start:new Date(now).toISOString()}):Date.parse(event.end)<=now;
}

// An incidental click is session focus, not a standing instruction to revisit a meeting.
// Keep the targets of work that really is being resumed, including "these" in a draft.
export function clearIdleFocus(scope){
 const s=scope.state;
 const hasProposal=Object.keys(s.edits||{}).length||s.created?.length||s.drafts?.length;
 const workingDecision=scope.id!=='calendar-home'&&s.threadType!=='conversation'&&['open','needs_review','running'].includes(scope.status)&&(hasProposal||s.threadType==='decision');
 if(s.pendingJob||s.composer?.trim()||workingDecision)return false;
 const changed=!!(s.selected?.length||s.highlighted?.length||s.attentionDays?.length||s.selectionLabel||s.inspected);
 Object.assign(s,{selected:[],highlighted:[],attentionDays:[],selectionLabel:'',inspected:null});
 delete s.earlyView;
 return changed;
}

export function timeScale(from,to,focus=[],base=68){
 const bands=[];let height=0;
 for(let start=from;start<to;start+=30){
  const end=Math.min(to,start+30);
  const near=focus.some(([a,b])=>start<b+30&&end>a-30);
  const pixels=(end-start)/60*base*(focus.length?(near?1.65:.62):1);
  bands.push({start,end,y:height,pixels});height+=pixels;
 }
 const at=value=>{const b=bands.find(b=>value<b.end)||bands.at(-1);return b?b.y+(value-b.start)/(b.end-b.start)*b.pixels:0;};
 const minute=value=>{const b=bands.find(b=>value<b.y+b.pixels)||bands.at(-1);return b?b.start+(value-b.y)/b.pixels*(b.end-b.start):from;};
 return {height,at,minute,bands};
}

export function focusGeometry(events,state,days){
 const refs=new Set([...state.selected,...state.highlighted,...Object.keys(state.edits||{})]);
 const focused=events.filter(e=>!e.allDay&&(refs.has(e.ref)||e.created));
 const focusDays=new Set([...focused.map(dayKey),...(state.attentionDays||[])]);
 // A draft can open hours (for example "afternoon") before any event is chosen.
 const times=[...focused.map(e=>[minutes(e.start),dayKey(e)!==dayKey({start:e.end})?1440:minutes(e.end)]),...(state.draftRanges||[])];
 // Quiet weekend days in a seven-day view give their room to the working week until they matter.
 const weekend=d=>[0,6].includes(new Date(d+'T12:00:00Z').getUTCDay()),busy=new Set(events.filter(e=>!e.allDay).map(dayKey));
 const rest=d=>days.length>=7&&weekend(d)&&!busy.has(d)&&!days.every(weekend)?.6:1;
 return {times,weights:days.map(d=>focusDays.size&&focusDays.size<days.length?(focusDays.has(d)?2.1:.72*rest(d)):rest(d))};
}

const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
function namedDay(text,anchor){
 const match=text.toLowerCase().match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
 if(!match)return null;
 const monday=weekDates(anchor,true)[0],index=(weekdays.indexOf(match[1])+6)%7;
 return shiftDate(monday,index+(/\bnext week\b/.test(text)?7:0));
}
export function localIntent(text,days){
 const t=text.toLowerCase().trim().replace(/[.!?,]+$/,'').replaceAll('’',"'");
 if(/^(back to (the )?week|reset (the )?view)$/.test(t))return {kind:'back-week'};
 if(/^(today|go to today|back to today)$/.test(t))return {kind:'today'};
 if(/^(yes|yes please|confirm|do it|go ahead|let'?s do it|yes let'?s (do|action) (it|that)|action that|apply (it|that|this))$/.test(t))return {kind:'confirm'};
 if(/^(later|later is good|save (it |this )?for later|let'?s come back to (it|this))$/.test(t))return {kind:'later'};
 if(/^(leave (it )?as is|leave as it is|keep it as is|never ?mind|dismiss( this| it)?|cancel( that| this| it)?|forget (it|that)|scratch that|close( this| it)?|no thanks|not that|stop)$/.test(t))return {kind:'dismiss'};
 if(/^(include|add|also show|show (me )?.*too|what about)\b/.test(t)){
  const date=namedDay(t,days[0]);if(date)return {kind:'view',days:[...new Set([...days,date])].sort()};
 }
 return null;
}

export function anticipateView(text,events,days){
 if(!/\b(move|moving|reschedule|shift)\b/i.test(text))return null;
 const normalized=text.toLowerCase();
 const matches=events.filter(e=>!e.allDay&&e.title.length>=4&&normalized.includes(e.title.toLowerCase()));
 if(matches.length!==1)return null; // Repeated titles need the model/user to disambiguate.
 const e=matches[0],date=namedDay(text,days.length>14?dayKey(e):days[0]);if(!date)return null;return {days:[...new Set([...(days.length>14?[]:days),dayKey(e),date])].sort(),refs:[e.ref],destination:date};
}

// Bind spoken or typed assent to the exact proposal visible at input time.
export function confirmationAnchor(scope,signature,revision){
 return scope&&scope.id!=='calendar-home'&&!scope.state.freshEntry&&!scope.state.responseNote&&!scope.state.pending&&!scope.state.executionRunning&&!scope.state.source&&!scope.state.stale&&scope.status==='open'&&scope.state.threadType!=='conversation'?{id:scope.id,signature,revision}:null;
}
export function sameConfirmation(anchor,scope,signature,revision){
 return !!anchor&&JSON.stringify(anchor)===JSON.stringify(confirmationAnchor(scope,signature,revision));
}

// Keep the invitation beside its source, or above/below it with a scrollable body.
export function eventCardPlacement(rect,viewport,preferred={width:400,height:500}){
 const pad=14,gap=12,top=66,width=Math.min(preferred.width,viewport.width-pad*2),bottom=viewport.height-pad;
 const height=Math.min(preferred.height,bottom-top),clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
 const y=clamp(rect.top,top,bottom-height);
 if(rect.right+gap+width<=viewport.width-pad)return {left:rect.right+gap,top:y,width,maxHeight:bottom-top};
 if(rect.left-gap-width>=pad)return {left:rect.left-gap-width,top:y,width,maxHeight:bottom-top};
 const above=rect.top-gap-top,below=bottom-rect.bottom-gap;
 if(Math.max(above,below)>=180){
  const under=below>=height||below>=above,space=under?below:above;
  return {left:clamp(rect.left,pad,viewport.width-pad-width),top:under?rect.bottom+gap:rect.top-gap-Math.min(height,space),width,maxHeight:space};
 }
 return {rail:true,left:viewport.width-width-pad,top,width,maxHeight:bottom-top};
}
