// Appearance is separate from invitation audience, permissions and proposals.
// This module paints events with their category, draws the rail that adds the hours on screen up by
// category, and runs the editor where categories are described in words and the model sorts the calendar.
import {dayKey} from './logic.js';
const clone=v=>structuredClone(v);
const sameMeaning=p=>JSON.stringify({mode:p.mode,description:p.description,categories:p.categories.map(({id,definition})=>({id,definition})),rules:p.rules?.length?p.rules:undefined});
// Eight defaults that stay distinct in this order for common color vision deficiencies. Keep in step with calendar_appearance.PALETTE.
export const palette=['#2a78d6','#eb6834','#1baf7a','#b8328a','#eda100','#6250d6','#0e9bb0','#d6455a'];
export const purposePolicy={mode:'semantic',description:'Color by the purpose of my time. Leave unclear events neutral.',categories:[
 {id:'focus',label:'Focus & preparation',color:'#1baf7a',definition:'Concentrated individual work, reading, writing and preparation.'},
 {id:'together',label:'Working together',color:'#2a78d6',definition:'Sessions to make, review, decide, solve or develop something together.'},
 {id:'coordination',label:'Updates & coordination',color:'#eb6834',definition:'Sharing status, aligning people, checking in or arranging work.'},
 {id:'life',label:'Life & logistics',color:'#b8328a',definition:'Breaks, personal appointments, travel and practical commitments.'}]};
const STARTS=[['What my time is for','Color by the purpose of my time: focus, working together, coordination and life. Leave unclear events neutral.'],
 ['Who I am meeting','Color by who is in the meeting: my own team, other teams, people outside the company, and time on my own.'],
 ['Client or project','Color by the client or project each meeting belongs to. Internal and personal time get their own colors.']];
const NEUTRAL='#849087',AUDIENCE={internal:'Internal',external:'External',solo:'Solo / focus'};
// Markers are drawn on meetings whatever their category: a saved decision, a proposed change, a change that needs someone's agreement.
const MARKERS=[['decision','Open decision','#c1995b'],['proposed','Proposed change','#2f5a45'],['pending','Needs agreement','#b79a60']];
const key=e=>(e.calendarId||'primary')+':'+e.id;
const luminance=hex=>{const [r,g,b]=hex.slice(1).match(/../g).map(x=>{const v=parseInt(x,16)/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
// Text on a solid block of the color: white where it reads, dark ink on the lighter hues.
export const onColor=hex=>/^#[0-9a-f]{6}$/i.test(hex)&&luminance(hex)>.26?'#14201a':'#ffffff';
export const hoursLabel=hours=>{const total=Math.round(hours*60),h=Math.floor(total/60),m=total%60;return h&&m?`${h} h ${m}`:h||!m?`${h} h`:`${m} min`;};

export function createAppearance({api,waitJob,snapshot,days,render,receive,openDrawer,closeDrawer,esc,colorPalette,toast,canvas=()=>false}){
 let draft=null,result=null,jobId=null,revision=0,generation=0,busy=false,compare=false,corrections=[],message='',contextIds=[];
 let editing=false,peek=false,restart=false,swatch=null,filter=null,filling=false,fillTimer=0,lastRail='';
 const tried=new Map(),shell=document.querySelector('.shell');
 const saved=()=>snapshot()?.appearance;
 const rail=document.createElement('aside');rail.id='mix';rail.className='mix';rail.hidden=true;rail.setAttribute('aria-label','Hours by category');document.querySelector('.topbar').after(rail);
 const policy=()=>editing&&draft&&!compare?draft:saved()?.policy;
 const introSeen=()=>{try{return localStorage.getItem('dayweave-categories-intro')==='seen';}catch{return true;}};
 function colorFact(e){
  if(result&&!compare){const correction=corrections.findLast(c=>c.ref===e.ref);if(correction)return {...correction,state:'corrected',reason:'Set by you for this event.'};return result.assignments[key(e)]||{categoryId:null,state:'unclassified',reason:'Outside this preview.'};}
  return e.displayCategory||{categoryId:e.audience};
 }
 function presentation(e){
  const fact=colorFact(e),fallback=fact.state==='unclassified';
  const category=fallback?{id:e.audience,label:AUDIENCE[e.audience],color:snapshot().calendarSettings?.colors?.[e.audience]}:policy().categories.find(c=>c.id===fact.categoryId);
  return {fact,category,fallback};
 }
 // The rail and the filter treat everything without one of the person's categories as one group.
 const groupOf=p=>p.fallback||!p.category?'unsorted':p.category.id;
 function shown(){
  const visible=new Set(days());
  return snapshot().events.filter(e=>!e.allDay&&e.response!=='declined'&&visible.has(dayKey(e))).map(e=>({e,...presentation(e),hours:Math.max(0,(Date.parse(e.end)-Date.parse(e.start))/36e5)}));
 }
 function blocks(){
  const list=shown(),groups=policy().categories.map(c=>({id:c.id,label:c.label,color:c.color,hours:0,count:0})),loose={id:'unsorted',label:filling?'Sorting…':'Not sorted',color:NEUTRAL,hours:0,count:0};
  for(const item of list){const group=groups.find(g=>g.id===groupOf(item))||loose;group.hours+=item.hours;group.count++;}
  return {groups:[...groups,loose],total:list.reduce((sum,item)=>sum+item.hours,0)};
 }
 function paint(){
  const p=policy();if(!p)return;
  const events=new Map(snapshot().events.map(e=>[e.ref,e])),defaults=new Map(),uncategorized=new Set();
  for(const el of document.querySelectorAll('#calendar [data-event]')){
   const e=events.get(el.dataset.event);if(!e)continue;
   const shownAs=presentation(e),{category,fallback}=shownAs,colors=colorPalette(category?.color||NEUTRAL);
   for(const [part,value] of Object.entries(colors))el.style.setProperty('--category-'+part,value);
   el.style.setProperty('--category-on',onColor(category?.color||NEUTRAL));
   el.dataset.colorCategory=fallback?'default-'+e.audience:category?.id||'unclassified';
   el.classList.toggle('mix-out',!!filter&&groupOf(shownAs)!==filter);el.classList.toggle('mix-in',!!filter&&groupOf(shownAs)===filter);
   if(fallback){uncategorized.add(e.ref);if(category?.color&&!p.categories.some(c=>c.id===category.id&&c.color.toLowerCase()===category.color.toLowerCase()&&c.label===category.label))defaults.set(category.id,category);}
  }
  const legend=document.querySelector('#category-legend');
  if(legend)legend.innerHTML=p.categories.map(c=>`<button class="legend-color" data-color-action="open" aria-label="Customize ${esc(c.label)} color"><i class="legend-dot" style="background:${esc(c.color)};border:0"></i>${esc(c.label)}</button>`).join('')+(p.mode==='semantic'?`<span class="neutral-legend"><i class="legend-dot" style="background:${NEUTRAL};border:0"></i>Unclassified</span>`:'')+[...defaults.values()].map(c=>`<span><i class="legend-dot" style="background:${esc(c.color)};border:0"></i>${esc(c.label)} · default</span>`).join('')+(uncategorized.size?`<button data-color-action="open" title="These meetings have not been sorted into your categories yet">${uncategorized.size} using default colors</button>`:'');
 }

 // ---- The rail: the hours on screen, by category. It is the legend, the totals and the filter. ----
 function railMarkup(){
  const s=saved(),{groups,total}=blocks(),visible=groups.filter(g=>g.hours>0||g.id===filter);
  const intro=canvas()&&s.revision===0&&s.policy.mode==='audience'&&!introSeen();
  const block=g=>`<button type="button" class="mix-kind ${filter?(filter===g.id?'on':'off'):''}" data-mix="${esc(g.id)}" aria-pressed="${filter===g.id}" style="flex-grow:${Math.max(g.hours,.05).toFixed(2)};--c:${esc(g.color)};--on:${onColor(g.color)}" title="${esc(g.label)}: ${hoursLabel(g.hours)} in ${g.count} ${g.count===1?'meeting':'meetings'}${total?`, ${Math.round(g.hours/total*100)}% of booked time`:''}"><b>${esc(g.label)}</b><strong>${hoursLabel(g.hours)}</strong></button>`;
  return `<button type="button" class="mix-all" data-mix="" aria-pressed="${!filter}" ${filter?'title="Show every category · Esc"':''}><small>${filter?'Show all':'Booked'}</small><strong>${hoursLabel(total)}</strong></button>
  <div class="mix-stack" role="group" aria-label="Categories">${visible.length?visible.map(block).join(''):'<p class="mix-empty">Nothing booked on these dates.</p>'}</div>
  <div class="mix-foot">${intro?`<div class="mix-intro"><b>Color by what your time is for.</b><span><button type="button" class="primary" data-color-action="open">Set up</button><button type="button" data-color-action="later">Not now</button></span></div>`:''}<button type="button" class="mix-edit" data-color-action="open">Edit categories</button></div>`;
 }
 function frame(){
  const chosen=filter&&!editing&&blocks().groups.find(g=>g.id===filter);
  shell.classList.toggle('mixed',!!chosen);shell.classList.toggle('categories-open',editing);
  if(chosen){shell.style.setProperty('--mix',chosen.color);shell.style.setProperty('--mix-on',onColor(chosen.color));}
 }
 function drawRail(){
  if(!saved()||!snapshot()){rail.hidden=true;return;}
  rail.hidden=false;
  if(filter&&filter!=='unsorted'&&!policy().categories.some(c=>c.id===filter))filter=null;
  frame();
  if(editing)return;
  rail.classList.remove('editing','peek');
  const html=railMarkup();if(html!==lastRail){rail.innerHTML=html;lastRail=html;}
  if(canvas()){clearTimeout(fillTimer);fillTimer=setTimeout(fill,500);}
 }
 function refresh(){render();drawRail();}
 function setFilter(id){filter=id&&id!==filter?id:null;refresh();}
 // Meetings that arrived after the categories were saved are sorted in the background, one bounded request per set of dates.
 async function fill(){
  const s=saved();if(!s||s.policy.mode!=='semantic'||editing||filling)return;
  const dates=days(),range=dates.join(',');
  if((tried.get(range)||0)>=3||!shown().some(item=>item.fact.state==='unclassified'))return;
  tried.set(range,(tried.get(range)||0)+1);filling=true;drawRail();
  try{
   const started=await api('/api/appearance-preview',{revision:s.revision,policy:s.policy,days:dates,redesign:false,draftToken:'fill'});
   await waitJob(started.jobId);
   if(editing||saved().revision!==s.revision)return;
   await receive(await api('/api/appearance',{action:'fill',revision:s.revision,jobId:started.jobId}));
  }catch{tried.set(range,3);}
  finally{filling=false;refresh();}
 }

 // ---- The editor: describe the categories, let the model sort the calendar, adjust, then keep them. ----
 const valid=()=>draft.categories.every(c=>c.label.trim()&&c.definition.trim());
 const sorted=()=>draft.mode==='audience'||sameMeaning(draft)===sameMeaning(saved().policy)||(!!result&&sameMeaning(result.policy)===sameMeaning(draft));
 function editorMarkup(){
  const fixed=draft.mode==='audience',starting=fixed||restart,{groups}=blocks(),hours=id=>groups.find(g=>g.id===id)?.hours||0,loose=groups.at(-1);
  const card=(c,i)=>`<section class="kind-card" data-kind="${esc(c.id)}" style="--c:${esc(c.color)};--on:${onColor(c.color)}"><div class="kind-top"><button type="button" class="kind-swatch" data-color-action="swatch" data-kind-id="${esc(c.id)}" aria-label="Color of ${esc(c.label||'new category')}" aria-expanded="${swatch===c.id}"></button><input data-kind-field="label" value="${esc(c.label)}" aria-label="Category name ${i+1}" maxlength="50" placeholder="Name" required><span class="kind-hours">${hoursLabel(hours(c.id))}</span>${fixed||draft.categories.length<2?'':`<button type="button" class="kind-remove" data-color-action="remove" data-kind-id="${esc(c.id)}" aria-label="Remove ${esc(c.label||'new category')}">×</button>`}</div>
   ${swatch===c.id?`<div class="kind-colors" role="group" aria-label="Colors">${palette.map(color=>`<button type="button" data-color-action="color" data-kind-id="${esc(c.id)}" data-color="${color}" style="background:${color}" aria-label="${color}" aria-pressed="${color===c.color.toLowerCase()}"></button>`).join('')}<label title="Another color"><input type="color" data-kind-field="color" value="${esc(c.color)}" aria-label="Custom color for ${esc(c.label||'new category')}"></label></div>`:''}
   ${fixed?`<p class="kind-fixed">${esc(c.definition)}</p>`:`<textarea data-kind-field="definition" rows="3" maxlength="500" aria-label="What belongs in ${esc(c.label||'the new category')}" placeholder="What belongs here" required>${esc(c.definition)}</textarea>`}</section>`;
  return `<header class="kinds-head"><h2>Categories and colors</h2><button type="button" data-color-action="peek" class="kinds-peek">${peek?'Edit':'View calendar'}</button><button type="button" data-color-action="cancel" class="kinds-close" aria-label="Close without saving">×</button></header>
  <div class="kinds-body">
  <form id="kinds-ask" class="kinds-ask"><label for="kinds-instruction">${starting?'How should your time be sorted?':'What should change?'}</label><textarea id="kinds-instruction" rows="2" maxlength="500" placeholder="${starting?'By client, with internal work and personal time on their own':'Split 1:1s out of working together'}"></textarea><button type="submit" class="primary">${starting?'Sort my calendar':'Change'}</button></form>
  ${starting?`<div class="kinds-starts"><span>Or start from</span>${STARTS.map(([label],i)=>`<button type="button" data-color-action="start" data-start="${i}">${label}</button>`).join('')}</div>`:''}
  <p class="kinds-status" role="status" aria-live="polite"></p>
  <fieldset class="kinds-list"><legend>${fixed?'Now: by who is invited':'Categories, first match wins'}</legend>${draft.categories.map(card).join('')}${loose.hours&&!fixed?`<p class="kinds-loose"><i></i>${hoursLabel(loose.hours)} not sorted. Open a meeting to set its category.</p>`:''}${fixed||draft.categories.length>=8?'':'<button type="button" class="kinds-add" data-color-action="add">＋ Add a category</button>'}</fieldset>
  ${fixed?'':`<section class="kinds-rules"><h3>Rules</h3><p>A rule wins over the descriptions above.</p><ul>${(draft.rules||[]).map((rule,i)=>`<li><span>${esc(rule)}</span><button type="button" data-color-action="unrule" data-rule="${i}" aria-label="Remove rule: ${esc(rule)}">×</button></li>`).join('')}</ul><form id="kinds-rule"><input id="kinds-rule-text" maxlength="200" aria-label="New rule" placeholder="Lunch is always ${esc(draft.categories.at(-1).label)}" ${(draft.rules||[]).length>=20?'disabled':''}><button type="submit">Add rule</button></form></section>`}
  <section class="kinds-markers"><h3>Markers on meetings</h3><div>${MARKERS.map(([id,label,fallback])=>`<label><input type="color" data-marker="${id}" value="${esc(snapshot().calendarSettings?.colors?.[id]||fallback)}" aria-label="${label} color"><span>${label}</span></label>`).join('')}</div><p>Saved as you pick. <button type="button" data-color-action="reset-markers">Reset</button></p></section>
  <div class="kinds-more">${fixed?'':'<button type="button" data-color-action="restart">Start over</button><button type="button" data-color-action="audience">Back to Internal, External, Solo</button>'}${saved().canUndo?'<button type="button" data-color-action="undo">Undo last saved change</button>':''}</div>
  </div>
  <footer class="kinds-actions"><button type="button" class="primary" data-color-action="apply"></button>${result?`<button type="button" data-color-action="compare" aria-pressed="${compare}">${compare?'Show new colors':'Compare with current'}</button>`:''}<button type="button" data-color-action="stop" hidden>Stop</button><button type="button" data-color-action="cancel">Cancel</button></footer>`;
 }
 function sync(){
  if(!editing||!draft)return;
  const status=rail.querySelector('.kinds-status'),primary=rail.querySelector('.kinds-actions [data-color-action=apply]');if(!status)return;
  status.textContent=message;status.hidden=!message;
  primary.textContent=busy?'Working…':sorted()?'Use these':'Sort again';primary.disabled=busy;
  rail.querySelector('[data-color-action=stop]').hidden=!busy;
  rail.querySelector('.kinds-list').disabled=busy;
  for(const control of rail.querySelectorAll('#kinds-ask button,#kinds-rule button,.kinds-starts button,.kinds-more button'))control.disabled=busy;
 }
 function show(){
  editing=true;rail.hidden=false;rail.classList.add('editing');rail.classList.toggle('peek',peek);lastRail='';
  const typed=rail.querySelector('#kinds-instruction')?.value||'';
  rail.innerHTML=editorMarkup();if(typed)rail.querySelector('#kinds-instruction').value=typed;
  frame();sync();
 }
 function readForm(){
  if(!editing||!draft)return;
  for(const cardEl of rail.querySelectorAll('[data-kind]')){
   const c=draft.categories.find(c=>c.id===cardEl.dataset.kind);if(!c)continue;
   c.label=cardEl.querySelector('[data-kind-field=label]').value;
   const definition=cardEl.querySelector('[data-kind-field=definition]');if(definition)c.definition=definition.value;
  }
 }
 // A change to what a category means makes the last sort out of date.
 function invalidate(){
  generation++;if(busy){busy=false;if(jobId)api('/api/jobs/cancel',{id:jobId}).catch(()=>{});}
  if(result&&sameMeaning(draft)!==sameMeaning(result.policy)){result=null;jobId=null;corrections=[];compare=false;render();}
  message=sorted()?'':'Changed. Sort again to see it on the calendar.';sync();
 }
 async function run(options={}){
  readForm();
  if(!valid()){message='Give each category a name and say what belongs in it.';sync();return;}
  const version=++generation;busy=true;message=options.redesign||options.instruction?'Reading your calendar…':'Sorting meetings…';sync();
  try{
   const started=await api('/api/appearance-preview',{revision,policy:draft,days:days(),redesign:!!options.redesign,...(options.instruction?{instruction:options.instruction}:{}),draftToken:String(version),contextIds});
   if(generation!==version){api('/api/jobs/cancel',{id:started.jobId}).catch(()=>{});return;}
   jobId=started.jobId;
   const value=await waitJob(jobId,job=>{if(generation===version&&job.partial?.message){message=job.partial.message;sync();}});
   if(generation!==version)return;
   draft=clone(value.policy);result=value;compare=false;restart=false;busy=false;
   message=`${value.sampled} ${value.sampled===1?'meeting':'meetings'} sorted${value.total>value.sampled?` of ${value.total} on these dates`:''}. Nothing is saved yet.`;
   const box=rail.querySelector('#kinds-instruction');if(box)box.value='';
   render();show();
  }catch(error){if(generation===version){busy=false;message=error.message;sync();}}
 }
 function ask(text){
  text=text.trim();if(!text||!draft||busy)return;
  if(draft.mode==='audience'||restart){draft={...draft,mode:'semantic',description:text.slice(0,2000)};delete draft.rules;return run({redesign:true});}
  return run({instruction:text.slice(0,500)});
 }
 function open(instruction='',ids=[]){
  if(!saved())return;
  if(!draft){revision=saved().revision;draft=clone(saved().policy);result=null;jobId=null;corrections=[];message='';compare=false;restart=false;swatch=null;}
  contextIds=ids;filter=null;peek=false;closeDrawer();render();show();
  if(instruction)ask(instruction);else if(!matchMedia('(max-width: 760px)').matches)rail.querySelector('#kinds-instruction')?.focus();
 }
 function cancel(){
  if(busy&&jobId)api('/api/jobs/cancel',{id:jobId}).catch(()=>{});
  generation++;draft=null;result=null;jobId=null;compare=false;corrections=[];busy=false;editing=false;peek=false;swatch=null;message='';refresh();
 }
 async function apply(){
  readForm();if(busy)return;
  if(!valid()){message='Give each category a name and say what belongs in it.';sync();return;}
  if(!sorted())return run();
  busy=true;message='Saving…';sync();
  try{
   const current=result&&sameMeaning(result.policy)===sameMeaning(draft);
   const response=await api('/api/appearance',{revision,policy:draft,...(current?{jobId,corrections}:{})});
   busy=false;draft=null;result=null;compare=false;jobId=null;corrections=[];editing=false;peek=false;swatch=null;message='';
   try{localStorage.setItem('dayweave-categories-intro','seen');}catch{}
   await receive(response);refresh();toast('Categories saved');
  }catch(error){busy=false;message=error.message;sync();toast(error.message);}
 }
 function summary(){const p=saved()?.policy;return p?`<div class="category-settings-summary"><div class="category-chips">${p.categories.map(c=>`<span><i style="background:${esc(c.color)}"></i>${esc(c.label)}</span>`).join('')}</div><button type="button" data-color-action="open" class="category-edit-button">Edit categories and colors</button>${saved().canUndo?'<button type="button" data-color-action="undo">Undo last color change</button>':''}</div>`:'';}
 function eventMarkup(e){const p=policy();if(!p)return '';const {fact:a,category:c,fallback}=presentation(e);return `<div class="event-category"><button data-color-action="correct" data-color-ref="${esc(e.ref)}"><i style="background:${esc(c?.color||NEUTRAL)}"></i>${esc(c?.label||'Unclassified')}${fallback?' · default color':''} <span>Change</span></button><small>${esc(fallback?'No custom category yet; showing the usual attendee-group color.':a.reason||'')}</small></div>`;}
 function correct(ref){
  const e=snapshot().events.find(e=>e.ref===ref);if(!e)return;
  const p=policy(),a=colorFact(e),scopes=[['event','This event'],...(e.seriesId&&!result?[['series','This recurring series']]:[]),...(p.mode==='semantic'&&!result?[['rule','Every meeting like this (adds a rule)']]:[])];
  closeDrawer();
  openDrawer('Event color',`<p>${esc(e.title)}</p><form id="category-correction" data-ref="${esc(ref)}"><label for="event-category-choice">Category</label><select id="event-category-choice"><option value="">Unclassified</option>${p.categories.map(c=>`<option value="${esc(c.id)}" ${c.id===a.categoryId?'selected':''}>${esc(c.label)}</option>`).join('')}</select>${scopes.length>1?`<label for="category-correction-scope">Apply to</label><select id="category-correction-scope">${scopes.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select>`:'<p class="field-note">This event only. Category definitions stay the same.</p>'}<div class="actions"><button type="submit" class="primary">Save category</button>${a.state==='corrected'?'<button type="button" data-color-action="reset-correction" data-color-ref="'+esc(ref)+'">Use automatic category</button>':''}</div><span role="status"></span></form>`,'category-correction');
 }
 rail.addEventListener('input',e=>{
  if(!editing||!draft)return;
  const field=e.target.dataset.kindField,cardEl=e.target.closest('[data-kind]'),c=cardEl&&draft.categories.find(c=>c.id===cardEl.dataset.kind);if(!field||!c)return;
  if(field==='color'){c.color=e.target.value;cardEl.style.setProperty('--c',c.color);render();return;}
  const before=sameMeaning(draft);readForm();
  if(sameMeaning(draft)!==before)invalidate();else render();
 });
 const saveMarkers=async colors=>{try{await receive(await api('/api/calendar-settings',{colors}));render();}catch(error){toast(error.message);}};
 rail.addEventListener('change',e=>{
  if(editing&&e.target.dataset.kindField==='color')show();
  if(e.target.dataset.marker)saveMarkers({[e.target.dataset.marker]:e.target.value});
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id==='kinds-ask'){e.preventDefault();return ask(e.target.querySelector('textarea').value);}
  if(e.target.id==='kinds-rule'){
   e.preventDefault();const text=e.target.querySelector('input').value.trim();if(!text||busy)return;
   readForm();draft.rules=[...(draft.rules||[]),text.slice(0,200)];invalidate();show();return run();
  }
  if(e.target.id!=='category-correction')return;e.preventDefault();
  const data={ref:e.target.dataset.ref,categoryId:document.querySelector('#event-category-choice').value||null,scope:document.querySelector('#category-correction-scope')?.value||'event'};
  try{
   if(data.scope==='rule'){
    const event=snapshot().events.find(x=>x.ref===data.ref),category=policy().categories.find(c=>c.id===data.categoryId);
    if(!category)throw new Error('Choose a category for the rule.');
    closeDrawer();open(`Always put meetings like “${event.title}” in ${category.label}.`);return;
   }
   if(result){corrections=corrections.filter(c=>c.ref!==data.ref);corrections.push(data);closeDrawer();render();show();}
   else{await receive(await api('/api/appearance',{action:'correct',revision:saved().revision,...data}));closeDrawer();refresh();}
  }catch(error){e.target.querySelector('[role=status]').textContent=error.message;}
 });
 rail.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='kinds-instruction'){e.preventDefault();ask(e.target.value);}});
 document.addEventListener('click',async e=>{
  const mix=e.target.closest('[data-mix]');if(mix&&rail.contains(mix)){setFilter(mix.dataset.mix);return;}
  // The colored frame around the calendar is also a way back to everything.
  if(filter&&(e.target===shell||e.target===rail)){setFilter(null);return;}
  const button=e.target.closest('[data-color-action]');if(!button)return;e.preventDefault();const action=button.dataset.colorAction;
  try{
   if(action==='open')return open();if(action==='correct')return correct(button.dataset.colorRef);
   if(action==='later'){try{localStorage.setItem('dayweave-categories-intro','seen');}catch{}return drawRail();}
   if(action==='undo'){await receive(await api('/api/appearance',{action:'undo',revision:saved().revision}));closeDrawer();cancel();return;}
   if(action==='reset-correction'){
    if(result){corrections=corrections.filter(c=>c.ref!==button.dataset.colorRef);closeDrawer();render();show();return;}
    await receive(await api('/api/appearance',{action:'correct',revision:saved().revision,ref:button.dataset.colorRef,categoryId:null,scope:document.querySelector('#category-correction-scope')?.value==='series'?'series':'event',reset:true}));closeDrawer();refresh();return;
   }
   if(action==='reset-markers'){await saveMarkers(Object.fromEntries(MARKERS.map(([id,,color])=>[id,color])));if(editing){readForm();show();}return;}
   if(!draft)return;
   if(action==='apply')return apply();if(action==='cancel')return cancel();
   if(action==='compare'){compare=!compare;render();show();return;}
   if(action==='peek'){peek=!peek;show();return;}
   if(action==='stop'){generation++;busy=false;if(jobId)await api('/api/jobs/cancel',{id:jobId});message='Stopped. Nothing changed.';sync();return;}
   if(busy)return;
   readForm();const c=draft.categories.find(c=>c.id===button.dataset.kindId);
   if(action==='start')return ask(STARTS[Number(button.dataset.start)][1]);
   if(action==='swatch'){swatch=swatch===c.id?null:c.id;return show();}
   if(action==='color'){c.color=button.dataset.color;swatch=null;render();return show();}
   if(action==='restart'){restart=true;show();rail.querySelector('#kinds-instruction')?.focus();return;}
   if(action==='audience'){draft={mode:'audience',description:'Internal and external meetings, and time on my own.',categories:[['internal','Everyone else matches my internal domains or addresses.'],['external','At least one participant is outside my internal domains and addresses.'],['solo','Time without other people on the invitation; rooms do not count.']].map(([id,definition])=>({id,label:AUDIENCE[id],definition,color:snapshot().calendarSettings.colors[id]}))};restart=false;}
   if(action==='add'){draft.mode='semantic';draft.categories.push({id:'category-'+crypto.randomUUID().slice(0,8),label:'',color:palette.find(color=>!draft.categories.some(c=>c.color.toLowerCase()===color))||palette[draft.categories.length%palette.length],definition:''});}
   if(action==='remove'&&draft.categories.length>1)draft.categories=draft.categories.filter(x=>x!==c);
   if(action==='unrule'){draft.rules=(draft.rules||[]).filter((_,i)=>i!==Number(button.dataset.rule));if(!draft.rules.length)delete draft.rules;}
   invalidate();show();
   if(action==='add')rail.querySelector('.kind-card:last-of-type [data-kind-field=label]')?.focus();
   else if(['remove','unrule'].includes(action)&&!sorted())run();
  }catch(error){toast(error.message);}
 });
 return {paint,rail:drawRail,summary,eventMarkup,open,closed(){},clearFilter(){if(filter)setFilter(null);},get filter(){return filter;},get previewing(){return !!result;},get editing(){return editing;}};
}
