// Appearance is separate from invitation audience, permissions and proposals.
const clone=v=>structuredClone(v),sameMeaning=p=>JSON.stringify({mode:p.mode,description:p.description,categories:p.categories.map(({id,definition})=>({id,definition}))});
const palette=['#8753bb','#2878bf','#cf6a25','#278477','#bc4473','#9a781e','#5a6eb1','#708075'];
export const purposePolicy={mode:'semantic',description:'Color by the purpose of my time. Leave unclear events neutral.',categories:[
 {id:'focus',label:'Focus & preparation',color:palette[0],definition:'Concentrated individual work, reading, writing and preparation.'},
 {id:'together',label:'Working together',color:palette[1],definition:'Sessions to make, review, decide, solve or develop something together.'},
 {id:'coordination',label:'Updates & coordination',color:palette[2],definition:'Sharing status, aligning people, checking in or arranging work.'},
 {id:'life',label:'Life & logistics',color:palette[3],definition:'Breaks, personal appointments, travel and practical commitments.'}]};
const key=e=>(e.calendarId||'primary')+':'+e.id;
export function createAppearance({api,waitJob,snapshot,days,render,receive,openDrawer,closeDrawer,esc,colorPalette,toast}){
 let draft=null,result=null,jobId=null,revision=0,generation=0,busy=false,redesign=false,compare=false,keeping=false,corrections=[],message='',contextIds=[];
 const saved=()=>snapshot()?.appearance;
 const bar=document.createElement('div');bar.className='color-preview-bar';bar.hidden=true;document.querySelector('#calendar-scroll').before(bar);
 const policy=()=>result&&!compare?draft:saved()?.policy;
 function colorFact(e){
  if(result&&!compare){const correction=corrections.findLast(c=>c.ref===e.ref);if(correction)return {...correction,state:'corrected',reason:'Set by you for this event.'};return result.assignments[key(e)]||{categoryId:null,state:'unclassified',reason:'Outside this preview.'};}
  return e.displayCategory||{categoryId:e.audience};
 }
 function presentation(e){
  const fact=colorFact(e),fallback=fact.state==='unclassified';
  const labels={internal:'Internal',external:'External',solo:'Solo / focus'};
  const category=fallback?{id:e.audience,label:labels[e.audience],color:snapshot().calendarSettings?.colors?.[e.audience]}:policy().categories.find(c=>c.id===fact.categoryId);
  return {fact,category,fallback};
 }
 function paint(){
  const p=policy();if(!p)return;
  const events=new Map(snapshot().events.map(e=>[e.ref,e])),defaults=new Map(),uncategorized=new Set();
  for(const el of document.querySelectorAll('#calendar [data-event]')){
   const e=events.get(el.dataset.event);if(!e)continue;
   const {category,fallback}=presentation(e),colors=colorPalette(category?.color||'#849087');
   for(const [part,value] of Object.entries(colors))el.style.setProperty('--category-'+part,value);
   el.dataset.colorCategory=fallback?'default-'+e.audience:category?.id||'unclassified';
   if(fallback){uncategorized.add(e.ref);if(category?.color&&!p.categories.some(c=>c.id===category.id&&c.color.toLowerCase()===category.color.toLowerCase()&&c.label===category.label))defaults.set(category.id,category);}
  }
  const legend=document.querySelector('#category-legend');
  if(legend)legend.innerHTML=p.categories.map(c=>`<button class="legend-color" data-color-action="open" aria-label="Customize ${esc(c.label)} color"><i class="legend-dot" style="background:${esc(c.color)};border:0"></i>${esc(c.label)}</button>`).join('')+(p.mode==='semantic'?'<span class="neutral-legend"><i class="legend-dot" style="background:#849087;border:0"></i>Unclassified</span>':'')+[...defaults.values()].map(c=>`<span><i class="legend-dot" style="background:${esc(c.color)};border:0"></i>${esc(c.label)} · default</span>`).join('')+(uncategorized.size?`<button data-color-action="open" title="Preview these dates to assign custom categories">${uncategorized.size} using default colors</button>`:'');
  bar.hidden=!result;
  if(result)bar.innerHTML=`<span>${compare?'Current colors':'Preview'} · ${result.sampled} events${result.total>result.sampled?` of ${result.total}`:''}</span><button data-color-action="compare" aria-pressed="${compare}">${compare?'Show preview':'Compare current'}</button><button data-color-action="edit">Edit</button><button data-color-action="apply" class="primary">Use these colors</button><button data-color-action="cancel">Cancel</button>`;
 }
 function summary(){const p=saved()?.policy;return p?`<div class="category-settings-summary"><p>${esc(p.description)}</p><div class="category-chips">${p.categories.map(c=>`<span><i style="background:${esc(c.color)}"></i>${esc(c.label)}</span>`).join('')}</div><button type="button" data-color-action="open" class="category-edit-button">Categories & meaning ↗</button>${saved().canUndo?'<button type="button" data-color-action="undo">Undo last color change</button>':''}</div>`:'';}
 function invalidate(){generation++;if(busy){busy=false;if(jobId)api('/api/jobs/cancel',{id:jobId}).catch(()=>{});}if(result&&sameMeaning(draft)!==sameMeaning(result.policy)){result=null;jobId=null;corrections=[];compare=false;render();}message='Unsaved changes';updateControls();}
 function readForm(){
  const form=document.querySelector('#appearance-form');if(!form)return;
  draft.description=form.querySelector('#category-description').value;
  for(const row of form.querySelectorAll('[data-category-row]')){
   const c=draft.categories.find(c=>c.id===row.dataset.categoryRow);if(!c)continue;
   c.label=row.querySelector('[data-category-field=label]').value;c.color=row.querySelector('[data-category-field=color]').value;c.definition=row.querySelector('[data-category-field=definition]').value;
  }
 }
 function updateControls(){
  const form=document.querySelector('#appearance-form');if(!form||!draft)return;
  form.querySelector('[role=status]').textContent=message;
  form.querySelector('[data-color-action=preview]').disabled=busy;
  form.querySelector('[data-color-action=apply]').disabled=busy||(!result&&sameMeaning(draft)!==sameMeaning(saved().policy)&&draft.mode!=='audience')||redesign;
  const stop=form.querySelector('[data-color-action=stop]');stop.hidden=!busy;
 }
 function markup(){
  return `<form id="appearance-form"><label for="category-description">What should the colors mean?</label><textarea id="category-description" rows="3" maxlength="2000" placeholder="Client delivery, building the product, growing the team, and personal time…">${esc(draft.description)}</textarea><div class="category-presets"><button type="button" data-color-action="purpose">Start with purpose</button><button type="button" data-color-action="audience">Use attendee groups</button></div><div class="category-rows">${draft.categories.map((c,i)=>`<section class="category-row" data-category-row="${esc(c.id)}"><div class="category-row-head"><input type="color" data-category-field="color" value="${esc(c.color)}" aria-label="${esc(c.label||'New category')} color"><input data-category-field="label" value="${esc(c.label)}" aria-label="Category name ${i+1}" maxlength="50" required><button type="button" data-color-action="up" data-category="${esc(c.id)}" ${i?'':'disabled'} aria-label="Move ${esc(c.label)} up">↑</button><button type="button" data-color-action="remove" data-category="${esc(c.id)}" aria-label="Remove ${esc(c.label)}">×</button></div><textarea data-category-field="definition" aria-label="Meaning of ${esc(c.label||'new category')}" rows="2" maxlength="500" required>${esc(c.definition)}</textarea>${draft.categories.length>1?`<label class="category-merge-label">Merge into <select data-category-merge="${esc(c.id)}" aria-label="Merge ${esc(c.label)} into"><option value="">Choose category…</option>${draft.categories.filter(x=>x.id!==c.id).map(x=>`<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('')}</select></label>`:''}</section>`).join('')}</div><button type="button" data-color-action="add" ${draft.categories.length>=8?'disabled':''}>＋ Add category</button><p class="field-note">First matching definition wins. Preview applies to the dates on screen. Events awaiting a custom category keep their usual attendee-group colors; unclear events stay neutral.</p>${result?`<div class="color-examples"><strong>${result.sampled} events previewed</strong>${Object.entries(result.assignments).slice(0,5).map(([id,a])=>{const e=snapshot().events.find(e=>key(e)===id),c=draft.categories.find(c=>c.id===a.categoryId);return `<button type="button" data-event="${esc(e?.ref||'')}"><span>${esc(e?.title||'Event')} → ${esc(c?.label||'Unclassified')}</span><small>${esc(a.reason)}</small></button>`;}).join('')}</div>`:''}<div class="color-editor-actions"><button type="button" data-color-action="preview">${result?'Preview again':'Preview colors'}</button><button type="button" data-color-action="stop" hidden>Stop</button><button type="button" data-color-action="apply" class="primary">Use these colors</button>${result?'<button type="button" data-color-action="view">View calendar</button>':''}<span role="status" aria-live="polite">${esc(message)}</span></div></form>`;
 }
 function show(){openDrawer('Calendar colors',markup(),'colors');updateControls();}
 function open(instruction='',ids=[]){
  if(!draft){revision=saved().revision;draft=clone(saved().policy);result=null;jobId=null;corrections=[];message='';}
  contextIds=ids;
  if(instruction){draft.description=instruction.slice(0,2000);draft.mode='semantic';redesign=true;invalidate();}
  keeping=true;closeDrawer();keeping=false;show();
 }
 function cancel(){if(busy&&jobId)api('/api/jobs/cancel',{id:jobId}).catch(()=>{});generation++;draft=null;result=null;jobId=null;compare=false;corrections=[];busy=false;render();}
 function closed(kind){if(kind==='colors'&&!keeping)cancel();}
 async function preview(){
  readForm();if(!document.querySelector('#appearance-form').reportValidity())return;
  const version=++generation;busy=true;message='Reading invitations…';updateControls();
  try{
   const response=await api('/api/appearance-preview',{revision,policy:draft,days:days(),redesign,draftToken:String(version),contextIds});
   if(generation!==version){api('/api/jobs/cancel',{id:response.jobId}).catch(()=>{});return;}
   jobId=response.jobId;
   const value=await waitJob(jobId,job=>{if(generation===version&&job.partial?.message){message=job.partial.message;updateControls();}});
   if(generation!==version)return;
   draft=clone(value.policy);result=value;redesign=false;compare=false;message=`Preview ready · ${value.sampled} events${value.total>value.sampled?` (${value.total-value.sampled} outside this batch)` : ''}`;
   render();show();
  }catch(error){if(generation===version){message=error.message;updateControls();}}
  finally{if(generation===version){busy=false;updateControls();}}
 }
 async function apply(){
  readForm();if(document.querySelector('#appearance-form')&&!document.querySelector('#appearance-form').reportValidity())return;
  if(busy||redesign)return;
  busy=true;message='Saving colors…';updateControls();
  try{const response=await api('/api/appearance',{revision,policy:draft,...(result?{jobId,corrections}:{})});keeping=true;closeDrawer();keeping=false;draft=null;result=null;compare=false;jobId=null;await receive(response);render();toast('Calendar colors saved');}
  catch(error){message=error.message;updateControls();toast(error.message);}
  finally{busy=false;updateControls();}
 }
 function eventMarkup(e){const p=policy();if(!p)return '';const {fact:a,category:c,fallback}=presentation(e);return `<div class="event-category"><button data-color-action="correct" data-color-ref="${esc(e.ref)}"><i style="background:${esc(c?.color||'#849087')}"></i>${esc(c?.label||'Unclassified')}${fallback?' · default color':''} <span>Change</span></button><small>${esc(fallback?'No custom category yet; showing the usual attendee-group color.':a.reason||'')}</small></div>`;}
 function correct(ref){
  const e=snapshot().events.find(e=>e.ref===ref);if(!e)return;
  keeping=true;closeDrawer();keeping=false;
  const p=policy(),a=colorFact(e);openDrawer('Event color',`<p>${esc(e.title)}</p><form id="category-correction" data-ref="${esc(ref)}"><label for="event-category-choice">Category</label><select id="event-category-choice"><option value="">Unclassified</option>${p.categories.map(c=>`<option value="${esc(c.id)}" ${c.id===a.categoryId?'selected':''}>${esc(c.label)}</option>`).join('')}</select>${e.seriesId&&!result?'<label for="category-correction-scope">Apply to</label><select id="category-correction-scope"><option value="event">This event</option><option value="series">This recurring series</option></select>':'<p class="field-note">This event only. Category definitions stay the same.</p>'}<div class="actions"><button type="submit" class="primary">Save category</button>${a.state==='corrected'?'<button type="button" data-color-action="reset-correction" data-color-ref="'+esc(ref)+'">Use automatic category</button>':''}</div><span role="status"></span></form>`,'category-correction');
 }
 document.addEventListener('input',e=>{
  if(!e.target.closest('#appearance-form'))return;
  const before=sameMeaning(draft);readForm();if(e.target.id==='category-description'){redesign=true;draft.mode='semantic';}
  if(e.target.dataset.categoryField==='definition'){draft.mode='semantic';redesign=false;}
  if(sameMeaning(draft)!==before||redesign||busy)invalidate();else{message='Unsaved changes';updateControls();if(result){render();}}
 });
 document.addEventListener('change',e=>{if(!e.target.dataset.categoryMerge)return;readForm();const from=draft.categories.find(c=>c.id===e.target.dataset.categoryMerge),into=draft.categories.find(c=>c.id===e.target.value);if(!into)return;into.definition=(into.definition+' Also includes: '+from.definition).slice(0,500);draft.categories=draft.categories.filter(c=>c!==from);draft.mode='semantic';redesign=false;invalidate();show();});
 document.addEventListener('submit',async e=>{
  if(e.target.id==='appearance-form'){e.preventDefault();return preview();}
  if(e.target.id!=='category-correction')return;e.preventDefault();
  const data={ref:e.target.dataset.ref,categoryId:document.querySelector('#event-category-choice').value||null,scope:document.querySelector('#category-correction-scope')?.value||'event'};
  try{if(result){corrections=corrections.filter(c=>c.ref!==data.ref);corrections.push(data);keeping=true;closeDrawer();keeping=false;render();}else{await receive(await api('/api/appearance',{action:'correct',revision:saved().revision,...data}));closeDrawer();render();}}
  catch(error){e.target.querySelector('[role=status]').textContent=error.message;}
 });
 document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-color-action]');if(!button)return;e.preventDefault();const action=button.dataset.colorAction;
  try{
   if(action==='open')return open();if(action==='edit')return show();if(action==='correct')return correct(button.dataset.colorRef);
   if(action==='undo'){await receive(await api('/api/appearance',{action:'undo',revision:saved().revision}));keeping=true;closeDrawer();keeping=false;cancel();return;}
   if(action==='reset-correction'){if(result){corrections=corrections.filter(c=>c.ref!==button.dataset.colorRef);keeping=true;closeDrawer();keeping=false;render();return;}await receive(await api('/api/appearance',{action:'correct',revision:saved().revision,ref:button.dataset.colorRef,categoryId:null,scope:document.querySelector('#category-correction-scope')?.value||'event',reset:true}));closeDrawer();render();return;}
   if(!draft)return;
   if(action==='preview')return preview();if(action==='apply')return apply();
   if(action==='view'){keeping=true;closeDrawer();keeping=false;return;}
   if(action==='compare'){compare=!compare;render();return;}
   if(action==='cancel'){keeping=true;closeDrawer();keeping=false;cancel();return;}
   if(action==='stop'){generation++;busy=false;if(jobId)await api('/api/jobs/cancel',{id:jobId});message='Stopped';updateControls();return;}
   readForm();
   if(action==='purpose'){draft=clone(purposePolicy);redesign=false;}
   if(action==='audience'){draft={mode:'audience',description:'Internal and external meetings, and time on my own.',categories:[['internal','Internal','Everyone else matches my internal domains or addresses.'],['external','External','At least one participant is outside my internal domains and addresses.'],['solo','Solo / focus','Time without other people on the invitation; rooms do not count.']].map(([id,label,definition])=>({id,label,definition,color:snapshot().calendarSettings.colors[id]}))};redesign=false;}
   if(action==='add'){draft.mode='semantic';draft.categories.push({id:'category-'+crypto.randomUUID().slice(0,8),label:'New category',color:palette[draft.categories.length%palette.length],definition:''});redesign=false;}
   if(action==='remove'&&draft.categories.length>1){draft.categories=draft.categories.filter(c=>c.id!==button.dataset.category);draft.mode='semantic';redesign=false;}
   if(action==='up'){const i=draft.categories.findIndex(c=>c.id===button.dataset.category);if(i>0)[draft.categories[i-1],draft.categories[i]]=[draft.categories[i],draft.categories[i-1]];draft.mode='semantic';redesign=false;}
   invalidate();show();
  }catch(error){toast(error.message);}
 });
 return {paint,summary,eventMarkup,open,closed,get previewing(){return !!result;}};
}
