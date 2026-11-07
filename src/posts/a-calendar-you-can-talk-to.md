---
layout: post.njk
title: "AI tools should answer where the work is"
date: 2026-11-05
description: "A calendar assistant that answers on the calendar. Every figure is the working app."
categories: AI
permalink: /writing/a-calendar-you-can-talk-to/
---

Most AI tools answer in a chat panel beside the work. Ask an assistant about a busy Thursday and it writes a paragraph about Thursday, next to a calendar that already shows Thursday. You read the paragraph and map it back onto the week yourself.

AI tools should answer where the work is. For a calendar that means three things:

1. Put the answer on the calendar
2. Draw a change before making it
3. Keep the screen quiet until there is something to say

These ideas are not new. [DateLens](https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p618-bederson.pdf), a fisheye calendar from 2003, already gave the important day more room and kept the rest of the week in view. A language model makes them practical; it can decide what to show from a sentence.

I spent a week building Dayweave to test them, and every figure below is the app itself running in this page on a fictional week. You can click and type in any of them; the replies are scripted, so they follow days, times and meeting names.

## Put the answer on the calendar

<figure class="dw-stage" data-scene="skip">
  <div class="dw-frame"><picture><source media="(max-width: 760px)" srcset="/public/experiments/dayweave/scenes/skip-phone.webp"><img class="dw-poster" src="/public/experiments/dayweave/scenes/skip-wide.webp" width="1920" height="1140" loading="lazy" alt="A week calendar after the question: three meetings are outlined, each with a short reason written inside it, and the other meetings are dimmed."></picture></div>
  <figcaption><span>"Which meetings could I skip this week?"</span><button type="button" class="dw-replay">Replay</button></figcaption>
</figure>

A chat panel would answer this with a list. Here the three candidates are marked where they sit, with the rest of the week still in view around them, and the reason is written inside each meeting in a few words.

In the real app the model writes those reasons, and in one test it wrote "Reflection, no agenda, easy to skip" inside a Friday hold.

The view follows the question as well: ask about two days and the calendar shows those two, with the day between them folded into a strip that opens when you click it.

<figure class="dw-stage" data-scene="compare">
  <div class="dw-frame"><picture><source media="(max-width: 760px)" srcset="/public/experiments/dayweave/scenes/compare-phone.webp"><img class="dw-poster" src="/public/experiments/dayweave/scenes/compare-wide.webp" width="1920" height="1140" loading="lazy" alt="The calendar showing Tuesday and Thursday side by side, with Wednesday folded into a narrow labeled strip between them."></picture></div>
  <figcaption><span>"Compare Tuesday and Thursday"</span><button type="button" class="dw-replay">Replay</button></figcaption>
</figure>

## Draw a change before making it

<figure class="dw-stage" data-scene="move">
  <div class="dw-frame"><picture><source media="(max-width: 760px)" srcset="/public/experiments/dayweave/scenes/move-phone.webp"><img class="dw-poster" src="/public/experiments/dayweave/scenes/move-wide.webp" width="1920" height="1140" loading="lazy" alt="A proposed move: the meeting is hatched at its new time on Wednesday, its current time on Monday remains as a dashed outline, and a button reads Move meeting."></picture></div>
  <figcaption><span>"Move project review to Wednesday morning"</span><button type="button" class="dw-replay">Replay</button></figcaption>
</figure>

A sentence saying the meeting has been moved gives you nothing to check. Here the proposed time is hatched, the current time stays as an outline, and nothing is written to the calendar until you confirm.

The button names what will happen, because actions that look alike are different. Moving my own hold affects only me, while moving a shared meeting notifies its guests. Moving a meeting someone else organizes is a request, and the original time stays booked until they agree.

Declining, removing and canceling are also three different operations in Google Calendar, and only canceling emails every guest. The first test runs showed the model escalating a decline into a cancel. The instructions now forbid that, and the app rejects a plan that confuses the three.

Several changes arrive together, and each one can be dropped on its own.

<figure class="dw-stage" data-scene="decline">
  <div class="dw-frame"><picture><source media="(max-width: 760px)" srcset="/public/experiments/dayweave/scenes/decline-phone.webp"><img class="dw-poster" src="/public/experiments/dayweave/scenes/decline-wide.webp" width="1920" height="1140" loading="lazy" alt="Three proposed declines drawn on the week. One has been set aside, and the button reads Decline 2 meetings."></picture></div>
  <figcaption><span>"Decline those," then one is set aside</span><button type="button" class="dw-replay">Replay</button></figcaption>
</figure>

## Keep the screen quiet until there is something to say

<figure class="dw-stage" data-scene="quiet">
  <div class="dw-frame"><picture><source media="(max-width: 760px)" srcset="/public/experiments/dayweave/scenes/quiet-phone.webp"><img class="dw-poster" src="/public/experiments/dayweave/scenes/quiet-wide.webp" width="1920" height="1140" loading="lazy" alt="The request bar opened into a short list: three things to ask, then commands such as Show weekends, History and Settings."></picture></div>
  <figcaption><span>The request bar, then two commands chosen with the arrow keys</span><button type="button" class="dw-replay">Replay</button></figcaption>
</figure>

The first version had about 20 buttons and labels on screen at rest; it now has the dates, one request bar, three view buttons and settings. Saved decisions, history, weekends and the rest sit behind the request bar, and a command chosen there runs without calling the model.

Getting there was mostly removal, and four things were built and then cut:

- **A floating answer card.** It covered the meetings it described.
- **A preview while typing.** For one day the calendar widened Thursday as I typed the word. It was a local guess at what the model would decide a moment later.
- **An animation that swept across the week while the model worked.** It was motion without information.
- **A fast model that handed hard requests to a slower one.** One model with read-only tools replaced both.

## Speed and cost

Answering on the calendar only works if the calendar moves quickly, so these were measured on a fictional three-week calendar with Claude Opus 5.5.

| Request | Standard | Fast mode |
|---|---|---|
| A lookup | 3 to 4 seconds | 1.5 seconds |
| A plan for the week | about 12 seconds | about 6.5 seconds |

Fast mode costs twice as much per token. The model writes the view before it writes the reply, so the calendar moves at about 2 seconds on a lookup while the sentence is still arriving. Twelve test requests, run three times each, passed 36 of 36.

The [full demo](/public/experiments/dayweave/09-live-app/) opens the app on its own page.

<style>
.post-content ol{margin-bottom:1.1em}
.dw-stage{position:relative;left:50%;transform:translateX(-50%);width:min(1160px,calc(100vw - 32px));margin:30px 0 36px}
.dw-frame{position:relative;overflow:hidden;height:0;padding-bottom:59.375%;border:1px solid #dfe5da;border-radius:14px;background:#f8f9f5;box-shadow:0 1px 2px rgba(29,42,35,.05),0 18px 44px rgba(29,42,35,.10)}
.dw-frame.sized{padding-bottom:0}
.dw-frame picture{position:absolute;inset:0;display:block}
.post-content .dw-poster{display:block;width:100%;height:100%;max-width:none;margin:0;border-radius:0;object-fit:cover;object-position:top left}
.dw-frame iframe{position:absolute;top:0;left:0;border:0;transform-origin:0 0;background:#f8f9f5;opacity:0;transition:opacity .3s ease}
.dw-stage.live .dw-frame iframe{opacity:1}
.dw-stage figcaption{display:flex;align-items:baseline;justify-content:space-between;gap:16px;max-width:680px;margin:11px auto 0;padding:0 2px;font-size:.92rem;line-height:1.45;color:var(--gray,#666)}
.dw-replay{flex:0 0 auto;font:inherit;font-size:.82rem;color:var(--gray,#666);background:none;border:1px solid var(--border,#ddd);border-radius:999px;padding:3px 12px;cursor:pointer}
.dw-replay:hover{color:var(--fg,#1a1a1a);border-color:var(--gray-light,#999)}
.dw-replay:focus-visible{outline:2px solid var(--accent,#0066cc);outline-offset:2px}
@media (max-width:760px){.dw-frame{padding-bottom:0;height:680px}.post-content .dw-poster{object-position:top center}}
</style>
<script>
(function(){
 var APP='/public/experiments/dayweave/09-live-app/index.html';
 var still=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var stages=[].slice.call(document.querySelectorAll('.dw-stage'));
 // Wide screens show the desktop app scaled to the figure; narrow ones show its own phone layout.
 function size(stage){
  var frame=stage.querySelector('.dw-frame'),app=stage.querySelector('iframe'),width=frame.clientWidth,phone=width<700;
  frame.classList.add('sized');
  if(phone){frame.style.height='680px';if(app){app.style.width='100%';app.style.height='680px';app.style.transform='none';}}
  else{var scale=width/1280;frame.style.height=Math.round(760*scale)+'px';if(app){app.style.width='1280px';app.style.height='760px';app.style.transform='scale('+scale+')';}}
 }
 function play(stage){
  var app=stage.querySelector('iframe');
  if(!app){app=document.createElement('iframe');app.title='Dayweave running a scripted scene';app.addEventListener('load',function(){setTimeout(function(){stage.classList.add('live');},350);});stage.querySelector('.dw-frame').appendChild(app);}
  stage.classList.remove('live');size(stage);app.src=APP+'?scene='+encodeURIComponent(stage.dataset.scene)+'&run='+Date.now();
 }
 stages.forEach(function(stage){
  size(stage);
  var button=stage.querySelector('.dw-replay');
  if(still)button.textContent='Play';
  button.addEventListener('click',function(){button.textContent='Replay';play(stage);});
 });
 if(!still&&'IntersectionObserver' in window){
  var seen=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting&&!entry.target.dataset.started){entry.target.dataset.started='1';play(entry.target);}});},{threshold:.5});
  stages.forEach(function(stage){seen.observe(stage);});
 }
 window.addEventListener('resize',function(){stages.forEach(size);});
})();
</script>
