---
layout: post.njk
title: "What if a calendar could move with you?"
date: 2026-11-05
description: "A few small interactive sketches about calendars, attention, and changing things where you can see them."
categories: Design
permalink: /writing/a-calendar-you-can-talk-to/
---

I keep coming back to calendars. They are one of the few apps where the layout is the information. A crowded morning looks crowded. An empty afternoon feels open. You understand the shape of a day before reading any event names.

But editing that picture still feels strangely mechanical. Drag a rectangle. Open a form. Change a time. Save. More recently, we have another option: ask an assistant to do it. That's easier to say, but the result often arrives as a sentence about what changed, rather than something you can actually see.

I've been playing with a few ideas about this. Not a finished design, and certainly not a new way to schedule meetings for its own sake. I am interested in what the calendar itself could do differently.

All the events in these sketches are fictional.

## The grid gets one thing right

I don't think the answer is to throw the calendar grid away. The spatial view is why calendars work in the first place. The awkward part is that the grid gives every hour exactly the same amount of space, whether it's relevant or not.

Here's an ordinary day. **Click the design review.**

<div class="ds-visual" id="ds-one">
  <div class="ds-eyebrow">01 / THE GRID</div>
  <div class="ds-visual-title">A day, laid out evenly</div>
  <div class="ds-day" id="ds-flat" aria-label="Fictional day calendar, with a clickable design review"></div>
  <p class="ds-note" id="ds-flat-note" aria-live="polite">The same amount of room is reserved for every hour.</p>
</div>

The event is only forty-five minutes long, but it is the part of the day I'm thinking about. A regular grid doesn't know the difference. It can highlight the event, but it can't make any more room to understand what surrounds it.

## What if the calendar bent around your attention?

This led me to a fisheye idea. The area you're looking at gets more space. The rest of the day compresses, but doesn't disappear.

**Move your focus over the timeline.** Watch the hour markers spread out around it. The events never change times. The view changes its shape.

<div class="ds-visual" id="ds-two">
  <div class="ds-eyebrow">02 / THE FISHEYE</div>
  <div class="ds-visual-title">More detail where it matters</div>
  <div class="ds-focus-line"><label for="ds-focus">Where you're looking</label><output for="ds-focus" id="ds-focus-label">1:00 pm</output></div>
  <input id="ds-focus" class="ds-range" type="range" min="8" max="18" step=".25" value="13" aria-label="Move the calendar's focus through the day">
  <div class="ds-day" id="ds-fish" aria-label="Fisheye calendar day with hours that expand around the selected focus"></div>
  <p class="ds-note">The review gets room without losing the morning or the evening.</p>
</div>

What interests me isn't just the magnification. It is the motion between states. As your focus shifts, you can follow the events. Nothing jumps into a completely different interface, and you don't lose the context you had a second ago.

There is a balance to find here. Distort time too aggressively and the view becomes hard to read. Distort it just enough and you get something conventional zooming doesn't offer: detail without completely giving up the rest of the day.

## Then let an instruction change the picture

The natural-language part becomes more interesting once the calendar is able to respond visually. Suppose I say, "Move the review to Thursday at 2."

I don't want a paragraph telling me that the event has been moved. I want to see where it would land.

**Click the review on Tuesday.** The proposed move appears in Thursday's column. Click the destination to accept it, or click the original event again to cancel.

<div class="ds-visual" id="ds-three">
  <div class="ds-eyebrow">03 / THE MOVE</div>
  <div class="ds-visual-title">An instruction you can see</div>
  <div class="ds-quote">“Move the design review to Thursday at 2.”</div>
  <div class="ds-week" id="ds-week" aria-label="Fictional Tuesday and Thursday schedule with a proposed calendar move"></div>
  <p class="ds-note" id="ds-move-note" aria-live="polite">Select the Tuesday review to preview its new position.</p>
</div>

In a real calendar, the next step would be to handle conflicts, show alternatives, and make undo effortless. But this tiny interaction gets at the bit I care about. A request is not the end of the interaction. It's the beginning of a visible change that you can assess.

## Putting it together

These started as questions about a calendar's visual design, but they're really questions about how software responds to people.

The grid gives us the shape of time. A fisheye view could give us more detail where our attention happens to be. Language could let us express what we want without making us translate it into dozens of clicks. And movement could make every proposed change understandable as it happens.

I think the missing piece in a lot of AI interfaces is the space *between* asking and getting an answer. The model might know what to do, but I still want to see it working on the thing in front of me. I want to notice a conflict, change my mind, and stay involved without starting a new conversation.

Maybe the most useful AI calendar won't feel much like chatting with an assistant. It might just feel like a calendar that finally understands what you're trying to do.

<style>
.ds-visual{--ds-border:#e1e6ec;--ds-ink:#26354b;--ds-blue:#3b5eab;--ds-bluebg:#e5edfe;--ds-green:#287968;--ds-greenbg:#e1f3ec;--ds-amber:#986d2a;--ds-amberbg:#fff1d8;position:relative;margin:22px 0 28px;border:1px solid var(--ds-border);border-radius:12px;background:#fff;padding:17px;color:var(--ds-ink);font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.ds-visual *{box-sizing:border-box}.ds-eyebrow{font-size:10px;color:#7a8798;font-weight:750;letter-spacing:.12em}.ds-visual-title{font-size:17px;font-weight:650;margin:4px 0 13px}.ds-note{font-size:12px;color:#69798a;margin:11px 0 0;line-height:1.5}.ds-day{height:290px;position:relative;border:1px solid #e7ebf0;border-radius:7px;overflow:hidden;background:white}.ds-hour{position:absolute;left:0;right:0;display:flex;align-items:flex-start;border-top:1px solid #edf0f4;min-height:3px;transition:top .3s ease}.ds-hour:first-child{border-top:0}.ds-hour-label{width:56px;flex-shrink:0;font-size:10px;color:#92a0ad;padding:2px 5px}.ds-block{position:absolute;left:62px;right:7px;border:0;border-left:3px solid #6486d0;background:var(--ds-bluebg);border-radius:4px;padding:5px 8px;color:var(--ds-blue);overflow:hidden;text-align:left;font:inherit;font-size:11px;transition:top .3s ease,height .3s ease,opacity .2s ease;z-index:2}.ds-block strong{display:block;font-weight:700;line-height:1.25}.ds-block small{font-size:10px;opacity:.8}.ds-block.ds-green{background:var(--ds-greenbg);color:var(--ds-green);border-left-color:#5ea991}.ds-block.ds-amber{background:var(--ds-amberbg);color:var(--ds-amber);border-left-color:#e3aa55}.ds-block.ds-click{cursor:pointer;outline-offset:2px}.ds-block.ds-click:focus-visible,.ds-week-event:focus-visible,.ds-range:focus-visible{outline:3px solid #93b5f2;outline-offset:2px}.ds-block.ds-selected{box-shadow:0 0 0 2px #6388dc inset}.ds-focus-line{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:5px}.ds-focus-line output{font-weight:700}.ds-range{width:100%;accent-color:#4569ba;cursor:pointer;margin:0 0 14px}.ds-quote{padding:9px 11px;margin-bottom:13px;background:#f5f7fb;border-radius:7px;font-size:13px;font-style:italic;color:#4b5b72}.ds-week{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ds-week-column{border:1px solid #e4e9f0;border-radius:8px;overflow:hidden;min-width:0}.ds-week-head{background:#f8fafc;border-bottom:1px solid #e4e9f0;padding:8px 10px;font-size:12px;font-weight:700}.ds-week-track{height:200px;position:relative;background:repeating-linear-gradient(to bottom,#fff 0px,#fff 48px,#edf0f5 49px,#fff 50px)}.ds-week-time{position:absolute;left:5px;color:#9aa5b3;font-size:9px}.ds-week-event{position:absolute;left:39px;right:5px;padding:7px 6px;border-radius:5px;background:#e6ecfd;border:1px solid #94a9dc;color:#345aa6;text-align:left;font:inherit;font-size:11px;cursor:pointer;transition:top .35s ease,opacity .35s ease,transform .35s ease}.ds-week-event strong{display:block}.ds-week-event small{display:block;font-size:10px}.ds-week-event.ds-ghost{border:1px dashed #5272bc;background:#eef3ff;animation:ds-pulse 1.5s ease-in-out infinite}.ds-week-event.ds-muted{opacity:.35}.ds-week-event.ds-confirmed{background:#dff1e9;border-color:#64a28d;color:#287968}.ds-week-event.ds-reset{cursor:pointer;border-color:#b5bdcc;color:#65748a;background:#f3f5f8}.ds-help{font-size:10px;color:#8290a0;padding:6px 10px;border-top:1px solid #e4e9f0}@keyframes ds-pulse{50%{box-shadow:0 0 0 3px #aabbea50}}@media(max-width:520px){.ds-visual{padding:12px}.ds-week-event{left:27px;padding:5px 4px;font-size:10px}.ds-week-event small{font-size:9px}.ds-week-time{font-size:8px}.ds-hour-label{width:48px}.ds-block{left:53px}}@media(prefers-reduced-motion:reduce){.ds-hour,.ds-block,.ds-week-event{transition:none}.ds-week-event.ds-ghost{animation:none}}
</style>
<script>
(function(){
  var events=[
    {start:9.5,end:10.5,title:'Planning',color:'ds-green'},
    {start:11,end:12,title:'Sketching',color:'ds-amber'},
    {start:13,end:13.75,title:'Design review',color:'',review:true},
    {start:15.25,end:16.25,title:'Prototype notes',color:'ds-green'}
  ];
  var min=8,max=19,H=290;
  function label(t){var h=Math.floor(t),m=Math.round((t-h)*60);return (h%12||12)+':'+String(m).padStart(2,'0')+(h>=12?' pm':' am')}
  function fixed(t){return (t-min)/(max-min)*H}
  function fisheye(t,f){var samples=120;var total=0,part=0,step=(max-min)/samples;for(var i=0;i<samples;i++){var x=min+(i+.5)*step;var w=.3+2.6*Math.exp(-Math.pow((x-f)/1.45,2));total+=w*step;if(x<t)part+=w*step}return H*part/total}
  function buildDay(target,mode){
    var el=document.getElementById(target);el.replaceChildren();
    var items=[];
    for(var h=8;h<=19;h++){var row=document.createElement('div');row.className='ds-hour';var t=document.createElement('span');t.className='ds-hour-label';t.textContent=h===19?'':(h%12||12)+(h>=12?' pm':' am');row.appendChild(t);el.appendChild(row);items.push({node:row,time:h})}
    var blocks=[];
    events.forEach(function(e){
      var b=document.createElement(e.review&&mode==='fixed'?'button':'div');
      if(e.review&&mode==='fixed')b.type='button';
      b.className='ds-block '+e.color+(e.review&&mode==='fixed'?' ds-click':'');
      var title=document.createElement('strong');title.textContent=e.title;
      var subtitle=document.createElement('small');subtitle.textContent=label(e.start);
      b.append(title,subtitle);el.appendChild(b);blocks.push({node:b,event:e});
      if(e.review&&mode==='fixed')b.addEventListener('click',function(){b.classList.toggle('ds-selected');document.getElementById('ds-flat-note').textContent=b.classList.contains('ds-selected')?'You can select the review, but the surrounding hours still take exactly the same space.':'The same amount of room is reserved for every hour.'});
    });
    function draw(f){var scale=mode==='fish'?function(t){return fisheye(t,f)}:fixed;items.forEach(function(it){it.node.style.top=scale(it.time)+'px'});blocks.forEach(function(it){it.node.style.top=scale(it.event.start)+'px';it.node.style.height=Math.max(17,scale(it.event.end)-scale(it.event.start)-2)+'px'})}
    draw(13);return draw;
  }
  buildDay('ds-flat','fixed');
  var updateFish=buildDay('ds-fish','fish'),slider=document.getElementById('ds-focus'),out=document.getElementById('ds-focus-label');
  slider.addEventListener('input',function(){var v=Number(slider.value);out.textContent=label(v);updateFish(v)});
  var week=document.getElementById('ds-week'),status=document.getElementById('ds-move-note'),stage=0;
  function makeColumn(day){
    var col=document.createElement('div');col.className='ds-week-column';
    var head=document.createElement('div');head.className='ds-week-head';head.textContent=day;
    var track=document.createElement('div');track.className='ds-week-track';
    [12,13,14,15].forEach(function(h){var t=document.createElement('span');t.className='ds-week-time';t.style.top=(h-12)*50+2+'px';t.textContent=(h%12||12)+' pm';track.appendChild(t)});
    var help=document.createElement('div');help.className='ds-help';help.textContent=day==='Tuesday'?'Current position':'Proposed position';
    col.append(head,track,help);week.appendChild(col);return track;
  }
  var tue=makeColumn('TUESDAY'),thu=makeColumn('THURSDAY');
  function event(parent,title,at,kind,handler){
    var b=document.createElement('button');b.type='button';b.className='ds-week-event '+(kind||'');b.style.top=((at-12)*50+3)+'px';b.style.height='45px';
    var strong=document.createElement('strong');strong.textContent=title;
    var small=document.createElement('small');small.textContent=label(at);b.append(strong,small);parent.appendChild(b);b.addEventListener('click',handler);return b;
  }
  function render(){
    tue.querySelectorAll('button').forEach(function(b){b.remove()});thu.querySelectorAll('button').forEach(function(b){b.remove()});
    event(tue,stage===2?'Review moved':'Design review',13,stage===1?'ds-muted':stage===2?'ds-reset':'',function(){if(stage===0){stage=1;status.textContent='Preview: the review would move to Thursday at 2 pm. Click the outlined destination to accept.'}else if(stage===1){stage=0;status.textContent='Preview cancelled. The review remains on Tuesday at 1 pm.'}else{stage=0;status.textContent='Undone. The review is back on Tuesday at 1 pm.'}render()});
    if(stage===1)event(thu,'Design review',14,'ds-ghost',function(){stage=2;status.textContent='Moved to Thursday at 2 pm. Click the Tuesday placeholder to undo.';render()});
    if(stage===2)event(thu,'Design review',14,'ds-confirmed',function(){stage=0;status.textContent='Undone. The review is back on Tuesday at 1 pm.';render()});
  }
  render();
})();
</script>
