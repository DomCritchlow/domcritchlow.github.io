---
layout: post.njk
title: "Calendars Are Kind of Boring"
date: 2026-11-05
description: "An interactive look at what happens when a calendar can reshape itself around a question."
categories: Design
permalink: /writing/a-calendar-you-can-talk-to/
---

A calendar is already a pretty good picture of time. You can glance at a week and see the problem. Three meetings stacked on Thursday. Nothing uninterrupted on Tuesday. A suspiciously empty Friday.

The trouble begins when you try to do something about it. You drag blocks around, open forms, or ask an assistant to explain a proposed schedule in text. The picture stays mostly still while the thinking happens somewhere else.

What if the calendar could take part in the conversation?

These little experiments draw on the layout and interaction ideas implemented in Dayweave. All appointments are fictional and every response is scripted. This is a design exploration, not a connection to anyone's calendar.

## The week should be able to bend

Start with the ordinary week. Every day has an equal share of the width. Every hour has an equal share of the height. That is a useful default, but not a particularly good answer to every question.

**Choose Thursday, then click the Design review inside it.** Watch what happens to the rest of the calendar.

<div class="dwx-study" id="dwx-fisheye">
  <div class="dwx-head"><span>01 / FOCUS + CONTEXT</span><span id="dwx-fish-caption">The whole week, evenly spaced</span></div>
  <div class="dwx-fish" id="dwx-fish">
    <div class="dwx-times" id="dwx-times"></div>
    <div class="dwx-fish-days" id="dwx-fish-days"></div>
  </div>
  <div class="dwx-actions"><button type="button" id="dwx-fish-reset">Return to whole week</button><small>Click a day heading, then an event</small></div>
</div>

The selected day takes more room *horizontally*. When the event opens, its surrounding hours take more room *vertically*. Earlier and later hours compress. The time scale is shared across the day columns, so an hour still means the same thing everywhere.

This focus-and-context idea has a history. [DateLens, the 2003 fisheye calendar paper](https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p618-bederson.pdf), explored how to enlarge the useful part of a calendar without throwing away the surrounding dates. The interesting extension is to let the calendar choose a useful focus from the question you're asking, rather than making zoom a separate chore.

## Comparing days shouldn't mean losing the days between them

Say you're trying to decide between Tuesday and Thursday. Showing the whole week wastes space. Showing only those two days erases the fact that Wednesday exists.

**Compare two dates.** The intervening dates collapse into a labeled strip. Click that strip to bring them back.

<div class="dwx-study" id="dwx-compare">
  <div class="dwx-head"><span>02 / COMPARE WITHOUT LOSING YOUR PLACE</span><span id="dwx-compare-caption">Tuesday versus Thursday</span></div>
  <div class="dwx-pickers"><button type="button" data-pair="tue" aria-pressed="true">Tuesday + Thursday</button><button type="button" data-pair="wed" aria-pressed="false">Wednesday + Friday</button></div>
  <div class="dwx-comparison" id="dwx-comparison"></div>
  <div class="dwx-foot" id="dwx-comparison-foot">The missing day is compressed, not empty.</div>
</div>

This is not a trick for making two columns prettier. It's a way of keeping the mental map intact. You can look closely at two alternatives and still see where they sit in the week.

## The same thing works at the scale of a month

Looking for a free afternoon is a daily question. Looking for a pattern is a monthly one. Those shouldn't require entirely different calendar interfaces.

**Open a week in the month.** Other weeks shrink while the chosen week reveals its events. Then choose another date.

<div class="dwx-study" id="dwx-month">
  <div class="dwx-head"><span>03 / OVERVIEW INTO DETAIL</span><span id="dwx-month-caption">April 2027 · fictional appointments</span></div>
  <div class="dwx-month-grid" id="dwx-month-grid"></div>
  <div class="dwx-actions"><button type="button" id="dwx-month-reset">Back to month</button><small id="dwx-month-note">Select any date</small></div>
</div>

A month question can still be about the *whole* month while one week is open for inspection. The view on screen, the range being discussed, and the dates for which the calendar has reliable data are three different things. Compressing a week must never quietly turn its events into free time.

## Now let a question decide what comes forward

A useful AI calendar should do more than produce a list.

Take the question **“Which meetings could I skip this week?”** The interesting answer isn't five lines of prose. It is a set of meetings, in context, with a reason attached to each one.

**Ask the question**, then correct the answer.

<div class="dwx-study" id="dwx-highlight">
  <div class="dwx-head"><span>04 / SHOW, THEN REFINE</span><span id="dwx-highlight-caption">Fictional workweek</span></div>
  <div class="dwx-quote" id="dwx-question">"Which meetings could I skip this week?"</div>
  <div class="dwx-pickers">
    <button type="button" id="dwx-show-candidates">Show candidates</button>
    <button type="button" id="dwx-correct-candidates" disabled>Those reviews matter</button>
  </div>
  <div class="dwx-result-grid" id="dwx-results"></div>
  <div class="dwx-foot" id="dwx-highlight-note">The answer belongs on the events, not beside the calendar.</div>
</div>

The correction doesn't mean “forget the question.” It means that the original set of candidates needs refining. The remaining highlights stay in place. A question, its results and the events explicitly ruled out all belong to the same conversation.

That distinction matters when a request gets harder: “Show my planning time this month, but exclude anything that overlaps another meeting.” A protected block isn't necessarily an unbooked gap. You need the calendar's actual facts and the question's intent, not a search for event titles containing the word *planning*.

## And if the answer involves changing things?

Consider a fuller request: “Group the catch-ups, find time for the prototype and keep some space before Friday's review.”

There is no useful way to judge that from a sentence saying “I've rearranged your week.”

**Show the proposal.** Several changes appear together. Then set one move aside to see how a correction can change only part of the plan.

<div class="dwx-study" id="dwx-proposal">
  <div class="dwx-head"><span>05 / PROPOSE, DON'T PRETEND IT'S DONE</span><span id="dwx-proposal-caption">Current schedule</span></div>
  <div class="dwx-proposal-legend"><span><i></i>Booked</span><span><i></i>Proposed</span><span><i></i>Focus block</span></div>
  <div class="dwx-proposal-board" id="dwx-proposal-board"></div>
  <div class="dwx-actions"><button type="button" id="dwx-proposal-step">Show the proposal</button><small id="dwx-proposal-note">No changes have been made.</small></div>
</div>

The outline of a proposed meeting isn't the same as the booked meeting. If an organizer has to agree, the original meeting stays put. A proposed move can be checked, revised, rejected or applied, but the picture must never imply a calendar write before one happened.

The calendar can show a whole set of changes, and still make each change independently understandable.

## The calendar as the answer

None of this requires abandoning the grid. The grid is the good part.

What changes is its willingness to respond. The calendar can give more space to what matters, compare distant dates without losing the intervening time, move between month and day, identify the events that answer a question, and show the consequences of several proposed changes at once.

A conversation can supply the intent. The calendar can supply the understanding.

Maybe calendars don't need more chat. They need to be a little less static.

<style>
.dwx-study{background:#fafcf9;color:#344839;border:1px solid #dee8df;border-radius:13px;margin:20px 0 29px;padding:14px 15px;overflow:hidden;font:12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.dwx-study *{box-sizing:border-box}.dwx-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.dwx-head span:first-child{font-weight:750;letter-spacing:.09em;color:#789081;font-size:10px}.dwx-head span:last-child{font-size:11px;color:#718477;text-align:right}.dwx-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:12px}.dwx-actions button,.dwx-pickers button{font:inherit;color:#345c46;border:1px solid #c7dacb;background:#f4f9f5;border-radius:7px;padding:7px 11px;cursor:pointer}.dwx-actions button:hover,.dwx-pickers button:hover{background:#e4f0e6}.dwx-actions button:focus-visible,.dwx-pickers button:focus-visible,.dwx-day button:focus-visible,.dwx-gap:focus-visible,.dwx-month-day:focus-visible,.dwx-event:focus-visible{outline:2px solid #477e5b;outline-offset:2px}.dwx-pickers button[aria-pressed=true]{background:#315e46;color:#fff;border-color:#315e46}.dwx-pickers button:disabled{opacity:.4;cursor:default}.dwx-actions small,.dwx-foot{font-size:11px;color:#798d7e}.dwx-foot{margin-top:10px}.dwx-pickers{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}.dwx-fish{display:flex;border:1px solid #dee5df;border-radius:8px;overflow:hidden;background:#fff;height:350px}.dwx-times{position:relative;width:36px;flex-shrink:0;border-right:1px solid #e7ece7}.dwx-times span{position:absolute;right:4px;font-size:9px;color:#819386;transform:translateY(-40%);transition:top .5s ease}.dwx-fish-days{display:flex;gap:0;flex:1;min-width:0}.dwx-day{display:flex;flex-direction:column;flex:1;min-width:0;border-right:1px solid #e8eee8;transition:flex .52s cubic-bezier(.2,.8,.2,1),background .3s}.dwx-day.selected{flex:3.4;background:#f5faf5}.dwx-day.compressed{flex:.6}.dwx-day button{flex:none;width:100%;height:33px;padding:6px 2px;border:0;border-bottom:1px solid #e4eae4;background:#f8faf7;color:#456b54;font:inherit;font-size:10px;font-weight:750;cursor:pointer}.dwx-track{flex:1;position:relative;overflow:hidden}.dwx-rule{position:absolute;left:0;right:0;border-top:1px solid #edf0ec;pointer-events:none;transition:top .5s ease}.dwx-event{position:absolute;left:4px;right:4px;text-align:left;font:inherit;font-size:10px;background:#e2eee5;border:1px solid #c0d8c8;color:#346b4a;border-radius:5px;padding:3px 4px;overflow:hidden;cursor:pointer;transition:top .5s ease,height .5s ease,background .3s}.dwx-event b{display:block;overflow-wrap:anywhere}.dwx-event.expanded{background:#d2e8d9;border-color:#5b996e;box-shadow:0 0 0 1px #73a883}.dwx-event .dwxe-detail{display:block;font-size:10px;margin-top:6px;line-height:1.3}.dwx-day.compressed .dwx-event b{font-size:0}.dwx-day.compressed .dwx-event{padding:2px 1px}.dwx-comparison{display:flex;min-height:216px;border:1px solid #e0e7e1;border-radius:8px;overflow:hidden;background:#fff}.dwx-compare-day{flex:1;min-width:0;position:relative;padding:9px;background:repeating-linear-gradient(to bottom,#fff 0,#fff 42px,#eff2ed 43px);border-right:1px solid #e3e9e3}.dwx-compare-day strong{display:block;font-size:11px;color:#526d5b;background:#fff;width:max-content;padding:2px 5px;border-radius:4px}.dwx-compare-card{display:block;position:relative;margin:15px 0 0;padding:7px;border-radius:6px;background:#dcece1;color:#326a48;font-size:11px;max-width:95%}.dwx-gap{width:28px;flex:none;background:#eef2ed;border:0;border-left:1px solid #dfe7de;border-right:1px solid #dfe7de;padding:4px 0;writing-mode:vertical-rl;color:#69806d;font:inherit;font-size:9px;cursor:pointer}.dwx-gap:hover{background:#dfeadf}.dwx-compare-included{width:25%;flex:none;background:#f8faf7;border-left:1px solid #e5ebe5;padding:9px 6px;color:#58735e;font-size:10px}.dwx-month-grid{border:1px solid #dfe8df;border-radius:8px;background:#fff;overflow:hidden}.dwx-month-weekdays{display:grid;grid-template-columns:repeat(7,1fr);background:#f1f6f1}.dwx-month-weekdays span{padding:7px 0;text-align:center;color:#718774;font-size:10px;font-weight:700}.dwx-month-week{display:grid;grid-template-columns:repeat(7,1fr);height:47px;transition:height .5s ease;border-top:1px solid #e3eae4}.dwx-month-week.open{height:130px;background:#f6faf6}.dwx-month-day{font:inherit;min-width:0;text-align:left;border:0;border-right:1px solid #e7ece7;background:none;padding:4px;color:#536b58;cursor:pointer;overflow:hidden}.dwx-month-day.inactive{opacity:.35}.dwx-month-day.active{background:#e8f3e9}.dwx-month-day b{font-size:10px;font-weight:650}.dwx-month-marker{display:block;background:#c9dfcf;border-radius:4px;height:5px;margin-top:6px;max-width:65%}.dwx-month-week.open .dwx-month-marker{height:auto;background:#d8eade;color:#396950;padding:4px 2px;font-size:9px;margin-top:7px;line-height:1.25;max-width:none}.dwx-quote{padding:9px 11px;background:#eef4ef;border-radius:8px;margin-bottom:12px;color:#41634e;font-size:12px}.dwx-result-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.dwx-result-day{background:#fff;border:1px solid #e1e9e1;border-radius:6px;min-height:128px;padding:6px 4px}.dwx-result-day b{font-size:10px;display:block;color:#667d6a;margin-bottom:8px}.dwx-result-event{display:block;border-radius:5px;padding:5px 4px;background:#e6eee7;color:#536b59;font-size:10px;margin-bottom:6px;min-height:27px;overflow-wrap:anywhere}.dwx-result-event.candidate{background:#d1eada;border:1px solid #72a887;color:#2b6c47}.dwx-result-event em{display:block;font-size:9px;font-style:normal;margin-top:3px;font-weight:650}.dwx-result-event.excluded{opacity:.64}.dwx-proposal-legend{display:flex;flex-wrap:wrap;gap:13px;font-size:10px;color:#758b7a;margin-bottom:10px}.dwx-proposal-legend span{display:flex;gap:5px;align-items:center}.dwx-proposal-legend i{display:inline-block;height:9px;width:9px;background:#b7d2be;border-radius:2px}.dwx-proposal-legend span:nth-child(2) i{background:#e5b96e}.dwx-proposal-legend span:nth-child(3) i{background:#79bd93}.dwx-proposal-board{position:relative;height:405px;background:repeating-linear-gradient(to bottom,#fff 0,#fff 35px,#eaf0e9 36px);border:1px solid #e0e8df;border-radius:8px;overflow:hidden}.dwx-proposal-heading{position:absolute;top:0;height:28px;background:#f6f9f5;border-bottom:1px solid #e3ebe2;text-align:center;font-size:10px;font-weight:750;color:#5f7867;padding-top:8px}.dwx-proposal-colrule{position:absolute;top:28px;bottom:0;border-left:1px solid #e9eee9}.dwx-proposal-event{position:absolute;border:1px solid #bad6c1;border-radius:4px;background:#e1efe4;color:#366b4b;font-size:10px;padding:4px;overflow:hidden;transition:top .55s ease,left .55s ease,background .4s ease}.dwx-proposal-event.proposed{border:1px dashed #be934e;background:repeating-linear-gradient(135deg,#fff2d8,#fff2d8 5px,#fbe9c9 5px,#fbe9c9 10px);color:#795624}.dwx-proposal-event.ghost{opacity:.36;border-style:dotted;pointer-events:none}.dwx-proposal-event.focus{background:#d2ebda;border:1px dashed #5c9c70}.dwx-proposal-event b{display:block;font-weight:700}.dwx-proposal-event small{display:block;font-size:9px;margin-top:2px}@media(max-width:520px){.dwx-study{padding:12px}.dwx-fish{height:312px}.dwx-day.selected{flex:4}.dwx-event{font-size:9px}.dwx-head{align-items:flex-start}.dwx-result-event{font-size:9px;padding:4px 2px}.dwx-result-event em{font-size:8px}.dwx-month-week.open{height:115px}.dwx-compare-day{padding:6px}.dwx-proposal-event{font-size:9px;padding:2px}.dwx-proposal-event small{display:none}}@media(prefers-reduced-motion:reduce){.dwx-times span,.dwx-day,.dwx-rule,.dwx-event,.dwx-month-week,.dwx-proposal-event{transition:none}}
</style>
<script>
(function(){
const names=['MON','TUE','WED','THU','FRI'];
const calendar=[
 [{name:'Planning',from:9,to:10},{name:'Research',from:13,to:14}],
 [{name:'Team sync',from:9.5,to:10.5},{name:'Vendor demo',from:14,to:15}],
 [{name:'Prototype',from:10,to:11.5},{name:'Catch-up',from:15,to:16}],
 [{name:'Planning',from:9,to:10},{name:'Design review',from:11,to:12.5},{name:'Deep work',from:15,to:16.5}],
 [{name:'Project review',from:10,to:11},{name:'Wrap-up',from:14,to:15}]
];
function percent(time){return (time-8)/10*100}
let fishDays=[],fishActive=-1,fishEvent=null;
const fishHolder=document.getElementById('dwx-fish-days'),hours=document.getElementById('dwx-times');
function scale(focus){
 const cuts=[8,9,10,11,12,13,14,15,16,17,18];let slices=[],total=0;
 for(let i=0;i<cuts.length-1;i++){const a=cuts[i],b=cuts[i+1],near=focus&&a<focus[1]+.5&&b>focus[0]-.5;const size=focus?(near?2.05:.64):1;slices.push({a,b,y:total,h:size});total+=size}
 return {at:function(t){let segment=slices.find(x=>t<=x.b)||slices.at(-1);return (segment.y+Math.max(0,Math.min(1,(t-segment.a)/(segment.b-segment.a)))*segment.h)/total*100}};
}
for(let i=8;i<=18;i++){let label=document.createElement('span');label.textContent=(i%12||12)+(i<12?'a':'p');hours.appendChild(label)}
names.forEach((day,i)=>{
 const column=document.createElement('div');column.className='dwx-day';
 const button=document.createElement('button');button.type='button';button.textContent=day;button.setAttribute('aria-label','Focus '+day);
 button.addEventListener('click',()=>{fishActive=fishActive===i?-1:i;fishEvent=null;drawFish()});
 const track=document.createElement('div');track.className='dwx-track';
 const rules=[];for(let j=8;j<=18;j++){let rule=document.createElement('div');rule.className='dwx-rule';track.appendChild(rule);rules.push(rule)}
 const events=calendar[i].map((entry,k)=>{
  let button=document.createElement('button');button.type='button';button.className='dwx-event';const title=document.createElement('b');title.textContent=entry.name;button.appendChild(title);const detail=document.createElement('span');detail.className='dwxe-detail';detail.hidden=true;button.appendChild(detail);
  button.addEventListener('click',()=>{fishActive=i;fishEvent=fishEvent&&fishEvent[0]===i&&fishEvent[1]===k?null:[i,k];drawFish()});
  track.appendChild(button);return {button,entry,detail};
 });
 column.append(button,track);fishHolder.appendChild(column);fishDays.push({column,button,track,rules,events});
});
function drawFish(){
 const focus=fishEvent?calendar[fishEvent[0]][fishEvent[1]]:null;
 const map=scale(focus?[focus.from,focus.to]:null);
 const labels=hours.querySelectorAll('span');labels.forEach((l,i)=>{l.style.top='calc(33px + '+(map.at(i+8)*.906)+'%)'});
 fishDays.forEach((col,i)=>{
  col.column.classList.toggle('selected',i===fishActive);col.column.classList.toggle('compressed',fishActive>=0&&i!==fishActive);
  col.button.setAttribute('aria-pressed',String(i===fishActive));
  col.rules.forEach((rule,j)=>rule.style.top=map.at(j+8)+'%');
  col.events.forEach(({button,entry,detail},k)=>{
   button.style.top='calc('+map.at(entry.from)+'% + 2px)';
   button.style.height='calc('+(map.at(entry.to)-map.at(entry.from))+'% - 4px)';
   let open=!!fishEvent&&fishEvent[0]===i&&fishEvent[1]===k;button.classList.toggle('expanded',open);detail.hidden=!open;detail.textContent=open?'11:00–12:30 · 3 attendees · Join / Discuss':'';button.style.zIndex=open?'3':'1';
  });
 });
 document.getElementById('dwx-fish-caption').textContent=fishEvent?'Event inspection stretches nearby hours':fishActive>=0?names[fishActive]+' gets more room':'The whole week, evenly spaced';
}
document.getElementById('dwx-fish-reset').addEventListener('click',()=>{fishActive=-1;fishEvent=null;drawFish()});drawFish();
let pair='tue',gapOpen=false;
const compare=document.getElementById('dwx-comparison');
function compareDay(label,meetings){
 const el=document.createElement('div');el.className='dwx-compare-day';let title=document.createElement('strong');title.textContent=label;el.append(title);
 meetings.forEach(t=>{let item=document.createElement('span');item.className='dwx-compare-card';item.textContent=t;el.append(item)});return el;
}
function renderComparison(){
 compare.replaceChildren();
 const config=pair==='tue'?{days:['TUE','THU'],between:'WED',events:[['9:30 · Team sync','2:00 · Vendor demo'],['9:00 · Planning','11:00 · Design review']]}:{days:['WED','FRI'],between:'THU',events:[['10:00 · Prototype','3:00 · Catch-up'],['10:00 · Project review','2:00 · Wrap-up']]};
 compare.append(compareDay(config.days[0],config.events[0]));
 if(gapOpen){let middle=document.createElement('button');middle.className='dwx-compare-included';middle.textContent=config.between+' · 2 meetings (click to compress)';middle.style.cursor='pointer';middle.addEventListener('click',()=>{gapOpen=false;renderComparison()});compare.append(middle)}
 else{let gap=document.createElement('button');gap.type='button';gap.className='dwx-gap';gap.textContent=config.between+' · click to include';gap.addEventListener('click',()=>{gapOpen=true;renderComparison()});compare.append(gap)}
 compare.append(compareDay(config.days[1],config.events[1]));
 document.getElementById('dwx-compare-caption').textContent=config.days[0]+' compared with '+config.days[1];
 document.getElementById('dwx-comparison-foot').textContent=gapOpen?'The middle day is back in view. Click it to compress again.':'The missing day is compressed, not empty.';
 document.querySelectorAll('#dwx-compare [data-pair]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pair===pair)));
}
document.querySelectorAll('#dwx-compare [data-pair]').forEach(b=>b.addEventListener('click',()=>{pair=b.dataset.pair;gapOpen=false;renderComparison()}));renderComparison();
const month=document.getElementById('dwx-month-grid');
const weekdays=['M','T','W','T','F','S','S'];
let openWeek=-1;
const weekdayRow=document.createElement('div');weekdayRow.className='dwx-month-weekdays';weekdays.forEach(n=>{let s=document.createElement('span');s.textContent=n;weekdayRow.append(s)});month.append(weekdayRow);
const monthWeeks=[];
for(let week=0;week<5;week++){
 let row=document.createElement('div');row.className='dwx-month-week';
 const buttons=[];
 for(let day=0;day<7;day++){
  const d=week*7+day-2,btn=document.createElement('button');btn.type='button';btn.className='dwx-month-day'+(d<1||d>30?' inactive':'');
  let b=document.createElement('b');b.textContent=d<1?31+d:d>30?d-30:d;btn.append(b);
  if(d>=1&&d<=30&&[5,8,13,15,21,23,27,29].includes(d)){let mk=document.createElement('span');mk.className='dwx-month-marker';mk.dataset.title=({5:'Planning',8:'Review',13:'Project',15:'Design',21:'Prototype',23:'Meeting',27:'Review',29:'Research'})[d];btn.append(mk)}
  btn.addEventListener('click',()=>{openWeek=openWeek===week?-1:week;drawMonth(d)});
  row.append(btn);buttons.push(btn);
 }month.append(row);monthWeeks.push({row,buttons});
}
function drawMonth(selected){
 monthWeeks.forEach((week,i)=>{week.row.classList.toggle('open',i===openWeek);week.buttons.forEach(b=>{b.classList.toggle('active',i===openWeek);let marker=b.querySelector('.dwx-month-marker');if(marker)marker.textContent=i===openWeek?marker.dataset.title:''})});
 document.getElementById('dwx-month-note').textContent=openWeek<0?'Select any date':'One week expanded, the others remain visible';
 document.getElementById('dwx-month-caption').textContent=openWeek<0?'April 2027 · fictional appointments':'Week '+(openWeek+1)+' opened within April';
}
document.getElementById('dwx-month-reset').addEventListener('click',()=>{openWeek=-1;drawMonth()});drawMonth();
const results=document.getElementById('dwx-results');let highlighted=0;
const resultData=[
 [['Planning',false],['Standup',false]],
 [['Design review',true],['Email',false]],
 [['Vendor demo',true],['Research',false]],
 [['Project sync',false],['Office hours',true]],
 [['Friday review',true],['Wrap-up',false]]
];
function drawResults(){
 results.replaceChildren();
 resultData.forEach((day,i)=>{
  let col=document.createElement('div');col.className='dwx-result-day';let name=document.createElement('b');name.textContent=names[i];col.append(name);
  day.forEach(([title,candidate])=>{
   let e=document.createElement('div');e.className='dwx-result-event';let active=highlighted>0&&candidate&&!(highlighted===2&&title.toLowerCase().includes('review'));
   e.classList.toggle('candidate',active);e.classList.toggle('excluded',highlighted===2&&candidate&&!active);
   e.textContent=title;
   if(active){let why=document.createElement('em');why.textContent=title==='Vendor demo'?'Optional · recording':title==='Office hours'?'Drop-in': 'Needs your input?';e.append(why)}
   col.append(e);
  });results.append(col);
 });
 document.getElementById('dwx-highlight-caption').textContent=highlighted===0?'Fictional workweek':highlighted===1?'Four events considered':'Two candidates remain';
 document.getElementById('dwx-highlight-note').textContent=highlighted===0?'The answer belongs on the events, not beside the calendar.':highlighted===1?'These are possibilities, not permissions to decline. The reasons and uncertainty stay attached.':'The reviews are excluded from this candidate set. The original question remains active.';
 document.getElementById('dwx-correct-candidates').disabled=highlighted!==1;
 document.getElementById('dwx-show-candidates').textContent=highlighted===0?'Show candidates':'Start again';
 document.getElementById('dwx-question').textContent=highlighted===2?'"Those reviews matter."':'"Which meetings could I skip this week?"';
}
document.getElementById('dwx-show-candidates').addEventListener('click',()=>{highlighted=highlighted===0?1:0;drawResults()});
document.getElementById('dwx-correct-candidates').addEventListener('click',()=>{highlighted=2;drawResults()});drawResults();
const board=document.getElementById('dwx-proposal-board');
names.forEach((name,i)=>{let h=document.createElement('div');h.className='dwx-proposal-heading';h.style.left=(i*20)+'%';h.style.width='20%';h.textContent=name;board.append(h);if(i>0){let line=document.createElement('div');line.className='dwx-proposal-colrule';line.style.left=(i*20)+'%';board.append(line)}});
const items=[
 {id:'p',label:'Planning',d:0,t:9,dur:.8},
 {id:'mia',label:'Mia',d:0,t:11,dur:.8,to:{d:1,t:14}},
 {id:'build',label:'Prototype',d:0,t:14,dur:1,to:{d:2,t:13}},
 {id:'sync',label:'Team sync',d:1,t:10,dur:.8},
 {id:'leo',label:'Leo',d:2,t:11,dur:.8,to:{d:1,t:15}},
 {id:'design',label:'Design review',d:2,t:15,dur:1},
 {id:'client',label:'Client',d:3,t:10,dur:1},
 {id:'sam',label:'Sam',d:3,t:13,dur:.8,to:{d:1,t:16}},
 {id:'test',label:'Testing',d:3,t:15.5,dur:.8},
 {id:'fri',label:'Friday review',d:4,t:11,dur:1},
 {id:'wrap',label:'Wrap-up',d:4,t:15,dur:.8}
];
let proposalStage=0;const proposals=[];
function addProposalEvent(kind,label,d,t,dur){let e=document.createElement('div');e.className='dwx-proposal-event '+kind;let b=document.createElement('b');b.textContent=label;e.append(b);board.append(e);setPlacement(e,d,t,dur);return e}
function setPlacement(e,d,t,dur){e.style.left='calc('+(d*20)+'% + 4px)';e.style.width='calc(20% - 8px)';e.style.top=(28+(t-8)*36+2)+'px';e.style.height=Math.max(24,dur*36-4)+'px'}
const booked=items.map(item=>({item,element:addProposalEvent('',item.label,item.d,item.t,item.dur)}));
const proposed=items.filter(item=>item.to).map(item=>({item,element:addProposalEvent('proposed',item.label+' ↗',item.to.d,item.to.t,item.dur)}));
const focus=addProposalEvent('focus','Focus 2h',2,16,2);
function drawProposal(){
 booked.forEach(({item,element})=>{element.classList.toggle('ghost',proposalStage>0&&!!item.to);setPlacement(element,item.d,item.t,item.dur)});
 proposed.forEach(({item,element})=>{element.hidden=proposalStage===0||(proposalStage===2&&item.id==='mia')});
 focus.hidden=proposalStage===0;
 document.getElementById('dwx-proposal-caption').textContent=proposalStage===0?'Current schedule':proposalStage===1?'Four proposed moves · none booked':'Three proposed moves · one set aside';
 document.getElementById('dwx-proposal-note').textContent=proposalStage===0?'No changes have been made.':proposalStage===1?'The original meetings remain booked. Proposed destinations are dashed.':'Mia stays put. The other proposed changes remain visible.';
 document.getElementById('dwx-proposal-step').textContent=proposalStage===0?'Show the proposal':proposalStage===1?'Set aside Mia’s move':'Reset the schedule';
}
document.getElementById('dwx-proposal-step').addEventListener('click',()=>{proposalStage=(proposalStage+1)%3;drawProposal()});drawProposal();
})();
</script>
