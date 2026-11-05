// Reads what a draft names unambiguously, so the calendar can preview it while
// someone types or dictates. It never chooses an action or prepares a change:
// the model still interprets the request once it is sent.
import {weekDates,shiftDate} from './workspace.js';
import {dayKey,minutes} from './logic.js';

const WEEKDAYS=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
export const PARTS={morning:[480,720],'this morning':[480,720],afternoon:[720,1020],'this afternoon':[720,1020],'late afternoon':[900,1080],evening:[1020,1260],tonight:[1020,1260],lunch:[690,810],lunchtime:[690,810],'after lunch':[780,1020],'before lunch':[480,720],'end of day':[960,1080],'end of the day':[960,1080],'first thing':[480,600]};
const NUMBERS={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'1.5':1.5,'2.5':2.5};
const MINUTES={fifteen:15,twenty:20,thirty:30,'forty five':45,'forty-five':45,fortyfive:45,sixty:60,ninety:90};
// Capitalized words that are more often ordinary words or dates than names.
const NOT_NAMES=new Set(['may','will','june','april','august','mark','bill','art','max','rose','joy','hope','grant','dawn','summer','sunny','monday','tuesday','wednesday','thursday','friday','saturday','sunday','today','tomorrow','move','find','show','skip','what','when','can','could','the','and','with','lunch','morning','afternoon']);
const ACTIONS=[
 [/\b(move|moving|reschedule|push|shift|bump)\b/g,'move','Move'],
 [/\b(find|free time|open time|time for|block( out)?|hold|carve out|make time)\b/g,'find','Find time'],
 [/\b(skip|cancel|drop|miss|decline)\b/g,'skip','Skip'],
 [/\b(what'?s on|what is on|what do i have|show me|show|when is|how busy)\b/g,'show','Show'],
];
const words=text=>String(text||'').toLowerCase().replaceAll('’',"'").replace(/[^a-z0-9:' ]+/g,' ').replace(/\s+/g,' ').trim();
const clock=m=>{const h=Math.floor(m/60)%24,mm=m%60,hh=h%12||12;return mm?`${hh}:${String(mm).padStart(2,'0')}`:`${hh}`;};
export const lengthLabel=m=>m>=60?(m%60?`${Math.floor(m/60)}h ${m%60}m`:`${m/60}h`):`${m}m`;
const dateLabel=d=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(d+'T12:00:00Z'));

// Titles that appear in the loaded calendar, normalized once per snapshot.
function titleIndex(events){
 const byTitle=new Map();
 for(const e of events){const key=words(e.title);if(key.length<4)continue;if(!byTitle.has(key))byTitle.set(key,{title:e.title,refs:[]});byTitle.get(key).refs.push(e.ref);}
 return [...byTitle.entries()].sort((a,b)=>b[0].length-a[0].length);
}
function peopleIndex(events){
 const names=new Map();
 for(const e of events)for(const p of e.attendees||[]){
  if(p.self||p.resource)continue;const first=String(p.displayName||p.name||'').trim().split(/\s+/)[0];
  if(!first||first.length<3||NOT_NAMES.has(first.toLowerCase()))continue;
  const key=first.toLowerCase();if(!names.has(key))names.set(key,{name:first,refs:new Set()});names.get(key).refs.add(e.ref);
 }
 return names;
}

export function parseDraft(text,{events=[],days=[],today}={}){
 const raw=String(text||''),t=raw.toLowerCase().replaceAll('’',"'"),tokens=[];
 const anchor=days[0]||today,thisWeek=weekDates(anchor,true);
 const add=(re,kind,fn)=>{for(const m of t.matchAll(re)){const extra=fn(m);if(extra)tokens.push({start:m.index,end:m.index+m[0].length,kind,...extra});}};
 add(/\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\s+next week)?\b/g,'when',m=>{
  const index=WEEKDAYS.indexOf(m[2]),next=!!(m[1]||m[3]);
  const shown=!next&&days.find(d=>new Date(d+'T12:00:00Z').getUTCDay()===(index+1)%7);
  const date=shown||shiftDate(thisWeek[index],next?7:0);return {dates:[date],label:dateLabel(date)};});
 add(/\btoday\b/g,'when',()=>today&&{dates:[today],label:'Today'});
 add(/\btomorrow\b/g,'when',()=>today&&{dates:[shiftDate(today,1)],label:'Tomorrow'});
 add(/\b(this |the |over the )?weekend\b/g,'when',()=>({dates:thisWeek.slice(5),label:'Weekend',weekend:true}));
 add(/\bnext week\b/g,'when',()=>({dates:weekDates(shiftDate(anchor,7)),label:'Next week',week:true}));
 add(/\b(this week|the week)\b/g,'when',()=>({label:'This week',week:true}));
 add(new RegExp(`\\b(${MONTHS.join('|')}|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\\s+(\\d{1,2})(st|nd|rd|th)?\\b`,'g'),'when',m=>{
  const month=MONTHS.findIndex(n=>n.startsWith(m[1].slice(0,3)));const year=+anchor.slice(0,4);const date=`${year}-${String(month+1).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(date)&&shiftDate(date,0)===date?{dates:[date],label:dateLabel(date)}:null;});
 add(/\bthe (\d{1,2})(st|nd|rd|th)\b/g,'when',m=>{const date=anchor.slice(0,8)+String(+m[1]).padStart(2,'0');return shiftDate(date,0)===date?{dates:[date],label:dateLabel(date)}:null;});
 add(new RegExp(`\\b(${Object.keys(PARTS).sort((a,b)=>b.length-a.length).join('|')})\\b`,'g'),'when',m=>({part:PARTS[m[1]],label:m[1][0].toUpperCase()+m[1].slice(1)}));
 add(/\b(an?|one|two|three|four|five|six|half an?|1\.5|2\.5|[1-6])\s*-?\s*(hours?|hrs?|h)\b(\s+and a half)?/g,'long',m=>{const n=m[1].startsWith('half')?.5:NUMBERS[m[1]]??1;const v=Math.round((n+(m[3]?.5:0))*60);return {minutes:v,label:lengthLabel(v)};});
 add(/\b(\d{2,3}|fifteen|twenty|thirty|forty[- ]?five|sixty|ninety)\s*(minutes?|mins?|m)\b/g,'long',m=>{const v=MINUTES[m[1].replace(/\s+/,' ')]??+m[1];return v>=5&&v<=600?{minutes:v,label:lengthLabel(v)}:null;});
 add(/\bhalf an hour\b/g,'long',()=>({minutes:30,label:'30m'}));
 add(/\b(?:at\s+)?(\d{1,2})(?::(\d\d))?\s*(am|pm)\b|\bat\s+(\d{1,2})(?::(\d\d))?\b|\bnoon\b/g,'when',m=>{
  let h,mm;if(m[0]==='noon'){h=12;mm=0;}else if(m[3]){h=+m[1]%12+(m[3]==='pm'?12:0);mm=+(m[2]||0);}else{h=+m[4];mm=+(m[5]||0);if(h<8)h+=12;}
  if(h>23||mm>59)return null;return {time:h*60+mm,label:clock(h*60+mm)+(h<12?' AM':' PM')};});
 // Titles match as whole words, tolerating punctuation the draft left out ("1 1" for "1:1").
 const escape=w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 for(const [key,entry] of titleIndex(events)){
  const m=t.match(new RegExp('(?<![a-z0-9])'+key.split(' ').map(escape).join("[^a-z0-9]+")+'(?![a-z0-9])'));
  if(m)tokens.push({start:m.index,end:m.index+m[0].length,kind:'what',refs:entry.refs,label:entry.title});
 }
 const people=peopleIndex(events);
 for(const m of raw.matchAll(/\b([A-Za-z][a-z]{2,})\b/g)){
  const key=m[1].toLowerCase(),person=people.get(key);if(!person)continue;
  const precededByWith=/\bwith\s+$/i.test(raw.slice(Math.max(0,m.index-6),m.index));
  if(m[1][0]===m[1][0].toUpperCase()||precededByWith)tokens.push({start:m.index,end:m.index+m[1].length,kind:'who',refs:[...person.refs],label:person.name});
 }
 for(const [re,intent,label] of ACTIONS)add(new RegExp(re.source,'g'),'act',()=>({intent,label}));
 tokens.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
 const kept=[];for(const tok of tokens)if(!kept.some(k=>tok.start<k.end&&tok.end>k.start))kept.push(tok);
 const result={text:raw,tokens:kept,dates:[],part:null,partLabel:'',minutes:null,time:null,refs:[],people:[],intent:null,week:false,weekend:false,title:null};
 for(const tok of kept){
  for(const d of tok.dates||[])if(!result.dates.includes(d))result.dates.push(d);
  if(tok.part){result.part=tok.part;result.partLabel=tok.label;}
  if(tok.minutes)result.minutes=tok.minutes;
  if(tok.time!==undefined)result.time=tok.time;
  if(tok.kind==='what')for(const r of tok.refs)if(!result.refs.includes(r))result.refs.push(r);
  if(tok.kind==='who')result.people.push({name:tok.label,refs:tok.refs});
  if(tok.week)result.week=true;if(tok.weekend)result.weekend=true;
  if(tok.intent&&!result.intent)result.intent=tok.intent;
 }
 const purpose=t.match(/\bfor (?!the\b|a\b|an\b|me\b|it\b)([a-z][a-z ]{2,30}?)(?=\s+(?:on|this|next|in|at|by|before|after|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|morning|afternoon|evening)\b|[.?!,]?$)/);
 if(purpose)result.title=purpose[1][0].toUpperCase()+purpose[1].slice(1);
 if(!result.intent&&result.minutes&&!result.refs.length)result.intent='find';
 result.meaningful=!!(result.dates.length||result.part||result.minutes||result.refs.length||result.people.length||result.week||result.time!==null);
 return result;
}

// A preview is what the calendar can honestly show before the model answers:
// where to look, which events were named, and which open windows fit.
export function draftPreview(parsed,{events=[],days=[],findWindows=()=>[]}){
 if(!parsed?.meaningful)return null;
 const byRef=new Map(events.map(e=>[e.ref,e])),on=e=>e&&dayKey(e),focus=new Set(),ranges=[],highlight=new Set();
 const named=parsed.refs.filter(r=>byRef.has(r));
 const preview={dates:[],focusDays:[],ranges,highlight:[],windows:[],target:null,label:''};
 const span=e=>[minutes(e.start),Math.max(minutes(e.start)+15,dayKey({start:e.end})!==dayKey(e)?1440:minutes(e.end))];
 if(parsed.intent==='move'&&named.length&&!parsed.week){
  const destination=parsed.dates.at(-1)||null,candidates=named.map(r=>byRef.get(r)).filter(e=>!e.allDay);
  const event=candidates.find(e=>on(e)===destination)||candidates.find(e=>days.includes(on(e)))||candidates[0];
  if(!event)return null;
  focus.add(on(event));highlight.add(event.ref);ranges.push(span(event));
  if(destination){
   focus.add(destination);const length=Math.round((Date.parse(event.end)-Date.parse(event.start))/60000);
   const within=parsed.time!=null?[parsed.time,parsed.time+length]:parsed.part||[540,1080];
   const open=findWindows([destination],length,within,event.ref);
   if(open[0]){const start=minutes(open[0].start);preview.target={date:destination,start:open[0].start,minutes:length,startMinute:start,ref:event.ref,title:event.title};ranges.push([start,start+length]);}
   else if(parsed.part)ranges.push(parsed.part);
  }
  preview.label=`Move ${event.title}`;
 }else if(parsed.intent==='find'||(parsed.minutes&&!named.length)){
  const dates=parsed.dates.length?parsed.dates:days;
  if(parsed.dates.length)dates.forEach(d=>focus.add(d));
  if(parsed.part)ranges.push(parsed.part);
  preview.windows=findWindows(dates,parsed.minutes||30,parsed.part||[540,1080]);
  preview.label=`${parsed.minutes?lengthLabel(parsed.minutes)+' ':''}open time`;
 }else{
  const refs=named.length?named:parsed.people.flatMap(p=>p.refs).filter(r=>byRef.has(r));
  const inView=refs.filter(r=>days.includes(on(byRef.get(r))));
  for(const r of (inView.length?inView:refs).slice(0,24)){const e=byRef.get(r);highlight.add(r);if(!e.allDay)ranges.push(span(e));}
  const highlightedDays=[...highlight].map(r=>on(byRef.get(r)));
  if(parsed.dates.length)parsed.dates.forEach(d=>focus.add(d));
  else if(new Set(highlightedDays).size<=2)highlightedDays.forEach(d=>focus.add(d));
  if(!highlight.size&&parsed.dates.length)for(const e of events)if(!e.allDay&&parsed.dates.includes(on(e))&&(!parsed.part||(minutes(e.start)<parsed.part[1]&&minutes(e.end)>parsed.part[0])))highlight.add(e.ref);
  if(parsed.part)ranges.push(parsed.part);
  if(!highlight.size&&!focus.size&&!ranges.length)return null;
 }
 preview.focusDays=[...focus].sort();preview.dates=preview.focusDays.filter(d=>!days.includes(d));preview.highlight=[...highlight];
 return preview;
}
