---
layout: post.njk
title: "AI tools should answer where the work is"
date: 2026-11-09
description: "A calendar that can respond to a sentence, taken apart one piece at a time. Every figure is live."
categories: Design
permalink: /writing/a-calendar-you-can-talk-to/
---

A calendar view is a fixed grid. Every hour gets the same height and every day the same width, whether the day is empty or holds the one meeting you are deciding about. The grid cannot change shape, so the rest is your job: you find the meeting, open a card that covers the week, flip between weeks to compare two days, and edit one meeting at a time through a form.

<figure data-dwf="fixed"><figcaption>An ordinary week view. The grid treats every hour the same, and the details float over it.</figcaption></figure>

Adding an AI assistant has mostly meant adding a chat panel beside that grid. Ask about a busy Thursday and it writes a paragraph about Thursday, next to a calendar that already shows Thursday. You read the paragraph and map it back onto the week yourself.

## What a language model changes

A language model can turn one sentence into several steps of different kinds: which days to show, which meetings to mark, which changes to draft. The request below is one sentence. The model returns a view and an edit that covers two meetings, and a calendar can draw both.

<figure data-dwf="sentence"><figcaption>One request becomes a view and an edit. The names on the left are the fields the app receives.</figcaption></figure>

If the calendar can draw whatever those steps describe, the answer does not need a chat panel. It can land where the work is. That asks more of the calendar than a fixed grid can give, and the rest of this piece takes one apart to show what it needs:

1. A grid that gives room to what matters
2. Meetings that open in place
3. Any days side by side
4. The view as the subject of the conversation
5. Changes drawn before they are made
6. Suggestions from other agents, drawn the same way

These ideas are not new. [DateLens](https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p618-bederson.pdf), a fisheye calendar from 2003, already gave the important day more room and kept the rest of the week in view. A language model makes them practical; it can decide what to show from a sentence.

I built Dayweave to test them. Each figure below isolates one piece on a fictional week, and the layout math in them is the app's own code.

## A grid that gives room to what matters

The fisheye is the piece the others depend on. Meetings in focus get more room: their days are 1.42 times as wide as the rest, and their hours up to 1.38 times as tall. The other hours give up a little and never drop below 84 percent of their size. The day keeps its length, so nothing is squeezed until it clips and nothing is pushed off the bottom.

<figure data-dwf="fisheye"><figcaption>Click any meetings to bring them forward, or ask the question.</figcaption></figure>

An answer uses the same motion. Ask which meetings you could skip and three come forward, with the reason written inside each one in a few words. In one test run the model wrote "Reflection, no agenda, easy to skip" inside a Friday hold.

The first version of this went too far. It squeezed the other hours to 26 px and their text was cut off. The limits above are what fixed it.

## Meetings that open in place

Most calendars open a card that floats over the week. Here the meeting's own slot grows to hold its details, on its own color, at three depths:

- **Selected.** Where it is and who is in it. Up to four meetings show this at once; from five on they only come forward.
- **Opened.** When, where, who, your answer if it is an invitation, and three actions.
- **Details.** The description and the files, one click deeper.

<figure data-dwf="depths"><figcaption>One meeting at each depth. The slot asks the grid for exactly the room it needs.</figcaption></figure>

Deciding what goes on the first click took two passes. The first put everything there, and one hour grew to 336 px. The opened meeting is now 186 px tall in the app, on a 1440 by 900 window. The category is not on it, because the color already says it.

## Any days side by side

A week view shows five or seven days in a row. A question is often about two days that are not next to each other, or are in different weeks. The calendar shows the days that were named and folds what lies between them into a strip.

<figure data-dwf="compare"><figcaption>Pick days from two weeks. Whatever lies between them folds into a labeled strip.</figcaption></figure>

## The view as the subject of the conversation

A chat panel has to guess which dates "this week" or "these" mean. Here every request is sent with the dates on screen, so there is no question about which days the conversation is about. Change the view and the same sentence is about different meetings.

<figure data-dwf="scope"><figcaption>The same sentence over four views.</figcaption></figure>

## Changes drawn before they are made

A sentence saying the meeting has been moved gives you nothing to check. A proposed change is drawn where it would land, the current time stays as an outline, and nothing is written to the calendar until you confirm.

<figure data-dwf="draft"><figcaption>Ask for the move, then confirm or discard it.</figcaption></figure>

The button names what will happen, because actions that look alike are different. Declining, removing and canceling are three different operations in Google Calendar, and only canceling emails every guest. The first test runs showed the model escalating a decline into a cancel. The instructions now forbid that, and the app rejects a plan that confuses the three.

## Suggestions from other agents

The calendar is not the only place a scheduling problem shows up. An agent connected over MCP (Model Context Protocol, a standard way for one AI tool to read from and write to another) can read calendar context, and it can send a suggestion with its source. The suggestion waits in Saved; publishing it never writes to the calendar. The app's own model checks each new one against the current calendar and decides whether it becomes a decision, an alternative to work already open, or nothing.

<figure data-dwf="agent"><figcaption>A suggestion from another agent, checked by the app, then drawn like any other change.</figcaption></figure>

Checking costs model calls, so the app does at most five automatic checks a day by default. The rest wait until you open them.

## The pieces together

This is the app itself, running in the page on a fictional week with scripted replies. Step through it, or click and type in it yourself.

<figure data-dwf="walk"><figcaption>Ten steps through the app, including a suggestion sent by a connected agent. The <a href="/public/experiments/dayweave/09-live-app/">full demo</a> opens it on its own page.</figcaption></figure>

Each of these pieces works without a model; DateLens had a fisheye in 2003. What a model adds is the choice of which piece to use, made from one sentence, so the calendar can answer in its own terms instead of in a paragraph beside it. I expect the same holds for other tools where the work is already a picture, like a spreadsheet, a map or a project plan, but I have only built this one.

<link rel="stylesheet" href="/public/experiments/dayweave/figures.css">
<script type="module" src="/public/experiments/dayweave/figures.js"></script>
