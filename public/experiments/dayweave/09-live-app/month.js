import {monthGrid,monthRange,weekStart,dayCovered} from './view_state.js';
import {onDay,dayKey,timeLabel} from './logic.js';
// Month is a projection of the same events and state used by the time grid.
export function monthMarkup({snapshot,state,events,esc,dateLabel,eventClasses,eventStatus,timeline,phone=false,loading=false,windows=[],focusDates=[]}){
 const view=state.view,range=monthRange(view.anchor),days=monthGrid(view.anchor),today=dayKey({start:new Date().toISOString()});
 const event=(e)=>`<button class="${eventClasses(e).join(' ')} month-event ${e.allDay?'month-all-day':''}" data-event="${esc(e.ref)}" data-ref="${esc(e.ref)}" data-end="${esc(e.end)}" data-all-day="${!!e.allDay}" aria-pressed="${state.inspected===e.ref||state.selected.includes(e.ref)}" title="${esc(e.title+' · '+(e.allDay?'All day':timeLabel(e.start))+(eventStatus(e)?' · '+eventStatus(e):''))}">${!e.allDay?`<time>${esc(timeLabel(e.start))}</time>`:''}<span class="event-title">${e.previewKind||e.created?'Proposed · ':''}${esc(e.title)}</span></button>`;
 let html=`<div class="month-grid ${view.expandedWeek?'is-expanded':''}" aria-label="${dateLabel(range.start,{month:'long',year:'numeric'})}"><div class="month-weekdays">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div>`;
 for(let i=0;i<days.length;i+=7){
  const week=days.slice(i,i+7),expanded=week[0]===view.expandedWeek;
  html+=`<section class="month-week ${expanded?'expanded':''}" aria-label="Week of ${dateLabel(week[0])}">`;
  for(const date of week){
   const items=events.filter(e=>onDay(e,date)).sort((a,b)=>Number(b.allDay)-Number(a.allDay)||a.start.localeCompare(b.start)),known=dayCovered(snapshot,date),inMonth=date>=range.start&&date<range.end,compact=!!view.expandedWeek;
   const count=compact?0:phone?2:4,shown=items.slice(0,count),open=windows.filter(w=>w.date===date),duration=open.reduce((n,w)=>n+w.minutes,0),matches=items.filter(e=>state.highlighted.includes(e.ref)||state.selected.includes(e.ref)).length;
   html+=`<div class="month-day ${inMonth?'':'outside-month'} ${known?'':'unknown'} ${today===date?'today':''} ${view.focusDate===date?'focused':''} ${focusDates.includes(date)?'draft-focus':''}" data-month-date="${date}"><button class="month-date" data-month-day="${date}" aria-label="Expand ${dateLabel(date)}" aria-expanded="${expanded&&view.focusDate===date}"><strong>${+date.slice(-2)}</strong>${compact?`<span class="month-count">${items.length||''}</span>`:''}</button><div class="month-events">${shown.map(event).join('')}</div>${items.length>count&&!compact?`<button class="month-more" data-month-day="${date}" aria-label="Show all ${items.length} events on ${dateLabel(date)}">+${items.length-count} more</button>`:''}${matches?`<span class="month-matches">${matches} ${matches===1?'match':'matches'}</span>`:''}${duration&&!compact?`<button class="month-window" data-month-day="${date}" title="${open.length} windows of ${state.gapMinutes} minutes or more">${Math.round(duration/6)/10}h ${state.gapKind==='alone'?'alone':'unbooked'}</button>`:''}${!known&&!compact?`<span class="month-unknown">${loading?'Loading…':'Not loaded'}</span>`:''}</div>`;
  }
  html+='</section>';
  if(expanded)html+=`<section class="month-expansion"><div class="month-expansion-heading"><span>${phone?dateLabel(view.focusDate||week[0],{weekday:'long',month:'short',day:'numeric'}):dateLabel(week[0])+' – '+dateLabel(week.at(-1))}</span><button data-action="collapse-month">Back to month <span class="ico ico-up" aria-hidden="true"></span></button></div>${timeline(phone?[view.focusDate||week[0]]:week)}</section>`;
 }
 return html+'</div>';
}
