---
title: "Show me, don’t tell me"
date: 2026-11-22
description: "I’m a visual person, and chatbots answer in paragraphs. A calendar you type or talk to, where every answer is drawn on the calendar."
categories: Design
permalink: /writing/a-calendar-you-can-talk-to/
templateEngineOverride: njk
---
<!DOCTYPE html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Show me, don’t tell me · Dominic Critchlow</title><meta name="description" content="{{ description | escape }}"><link rel="stylesheet" href="/public/experiments/calendar-ask/ask.css"><div class="mast"><a href="https://critchlow.us/">Dominic Critchlow</a><a href="https://critchlow.us/writing/">Writing ↗</a></div>
<header class="title"><h1>Show me, don’t tell me</h1><small>Dominic Critchlow &nbsp;·&nbsp; November 22, 2026</small></header>
<p class="opening">I’m a very visual person, and LLM chatbots answer me in paragraphs. I just want to be able to talk to my calendar and it shows me what I care about at the right time.</p>
<figure class="cc-fig wide" data-cc="hero"><figcaption>A made-up week. Pick any sentence to stop the tour and try it; ones with a microphone are spoken. The buttons in each answer work.</figcaption></figure>
<div class="layout"><nav aria-label="Article sections"><a href="#settings">Settings</a><a href="#marks">Pointing at meetings</a><a href="#layers">How full the week is</a><a href="#side">Days and people side by side</a><a href="#drafts">Drafting a change</a><a href="#asks">When it has to ask</a><a href="#chat">From a conversation</a></nav><main>

<h2 id="settings">Settings</h2>
<p>Starting with settings, because they’re the part I expected to still need a menu for. Every row in the Settings panel has a sentence: show the weekend, use 24-hour time, start my day at 8, add London time, make the rows roomier, show what I declined. The change applies at once with an Undo, and nothing waits to be accepted because nothing leaves my screen. When the calendar runs as a desktop app, the window settings work the same way, so “keep this window on top” pins it.</p>
<figure class="cc-fig" data-cc="settings"><figcaption>The panel under the calendar is the one you would click. Each sentence lights the control it changed.</figcaption></figure>

<h2 id="marks">Pointing at meetings</h2>
<p>Ask which meetings I could skip and three come forward with the reason written inside each. Their days widen to fit the words, and the rest of the week fades but stays readable, so I can check each reason against what sits around it. Prep uses the same marks. With meeting notes connected, asking what we decided opens the meeting in place with the decisions and drafts time for the item that’s mine.</p>
<figure class="cc-fig" data-cc="point"><figcaption>Decline all 3 turns the marks into declines. Declined meetings leave the grid unless Settings shows them.</figcaption></figure>

<h2 id="layers">How full the week is</h2>
<p>How busy a week is shouldn’t tell me a number but show me where and why it’s busy. The layers count the real events: a bar under each date with meetings and hours, open stretches of 15 minutes or more with the longest called out, overlaps, and invitations still waiting on me. The sentence on top stays short because the counts are already drawn. Asking where I’m double-booked shows the overlap and, when there’s room, drafts the move.</p>
<figure class="cc-fig" data-cc="layers"><figcaption>The layers are computed from the events on screen, so the numbers under each date are the ones the answer used.</figcaption></figure>

<h2 id="side">Days and people side by side</h2>
<p>Comparing two days in a week view means remembering one while looking at the other. Asked for Friday next to next Thursday, the calendar puts the two days edge to edge and folds the days between into a strip that says how many. Asked how my Wednesday compares with Sam’s, the day splits into a column for each of us, counted separately. Sam’s column shows for that answer only and never joins my list.</p>
<figure class="cc-fig" data-cc="side"><figcaption>The toolbar names what’s on screen, and Back returns to the week you were on.</figcaption></figure>

<h2 id="drafts">Drafting a change</h2>
<p>A change is drawn where it would land before anything happens. A move leaves the current time as an outline. Three times for a meeting with Sam share a group, and picking one clears the others. The button names the verb and who hears about it: moving updates the guests, declining tells the organizer, canceling takes the meeting off everyone’s calendar. In early tests the model sometimes turned a decline into a cancellation, so that rule lives in the app as well as on the button.</p>
<p>Two more rules hold for anything drafted. Text the model wrote for someone outside my company, like an invite or a note to an outside organizer, is never part of Accept; it names every outside address and I accept it on its own. Email always opens as a draft that I edit and send.</p>
<figure class="cc-fig" data-cc="change"><figcaption>Pick an option by clicking it on the grid or its button. Undo puts the week back.</figcaption></figure>

<h2 id="asks">When it has to ask</h2>
<p>Some requests have two right answers. I work with two Sams, so “find time with Sam” comes back as a question with a button for each, and the pick carries into the draft. Pick the Sam at Northwind and the draft says the invite goes outside the company. “These” means what I have selected: shift-click two meetings, say decline these, and the line names what the request is about before I send it.</p>
<figure class="cc-fig" data-cc="ask"><figcaption>The label in the ask line shows what “these” refers to.</figcaption></figure>

<h2 id="chat">From a conversation</h2>
<p>The same answers can start in a chat somewhere else. An assistant in a separate conversation can read my calendar and send its answer to the calendar instead of into the chat. The calendar draws it, and the chat gets one line.</p>
<figure class="cc-fig" data-cc="chat"><figcaption>The conversation and the calendar are separate windows. The answer lands on the calendar either way.</figcaption></figure>

<p>This is an interesting way to think about a calendar, and potentially about other interfaces in the future: email, and the other productivity tools you can imagine.</p>
</main></div><script src="/public/experiments/calendar-ask/ask.js"></script></html>
