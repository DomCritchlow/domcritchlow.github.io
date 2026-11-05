// The input rests at the bottom of the calendar, which runs full height behind it and can
// scroll its last hour clear of it. An answer or proposal grows upward over the calendar, and when its content
// changes the card slides left, center or right to stay off the events in focus.
// It never moves while someone is typing, because only content changes ask for it.
export function floatingWorkspace(panel,container,launcher,{onReserve}={}){
 let pinned=false,tucked=true,frame=0,reserve=-1,anchor='center',avoid=false,lift=0;
 const FOCUS='.event.highlighted,.event.selected,.event.inspected,.event.proposed,.event.ghost,.draft-target,.gap.draft-window,.month-day.draft-focus';
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 function setReserve(value){
  const next=Math.round(value);if(Math.abs(next-reserve)<4)return;
  reserve=next;container.style.setProperty('--pill-reserve',next+'px');onReserve?.(next);
 }
 function place(){
  if(tucked){setReserve(0);return;}
  const bounds=container.getBoundingClientRect(),mobile=innerWidth<=760;
  const legend=container.querySelector('.legend')?.offsetHeight||0,composer=panel.querySelector('.composer-wrap')?.offsetHeight||panel.offsetHeight;
  if(mobile){panel.style.width='';panel.style.left='10px';panel.style.top='';panel.style.bottom='12px';container.style.setProperty('--pill-clearance','0px');setReserve(Math.min(panel.offsetHeight+14,bounds.height*.42));return;}
  const bottom=legend+10,pad=16,full=Math.min(640,bounds.width-32),narrow=Math.min(460,full);
  if(avoid&&!pinned){
   const targets=[...container.querySelectorAll(FOCUS)].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
   // Try the full card in three places, then a narrower card, and keep the first that covers least.
   const options=[];for(const width of [full,narrow])for(const key of ['center','left','right'])options.push({key,width});
   const height=panel.offsetHeight,left=o=>o.key==='left'?pad:o.key==='right'?Math.max(pad,bounds.width-o.width-pad):Math.max(pad,(bounds.width-o.width)/2);
   const score=o=>{const box={left:bounds.left+left(o),right:bounds.left+left(o)+o.width,top:bounds.bottom-bottom-height,bottom:bounds.bottom-bottom};return targets.reduce((n,r)=>n+overlap(box,r),0);};
   const best=targets.length?options.reduce((a,b)=>score(b)<score(a)-500?b:a):{key:'center',width:full};
   anchor=best.key;panel.style.width=best.width===full?'':best.width+'px';avoid=false;
   // When no place is clear (a full width day, say), scroll the calendar just enough to lift
   // the covered events above the card, without pushing the first one under the header.
   const box={...best,x:left(best)},top=bounds.bottom-bottom-height;
   const covered=targets.filter(r=>r.right>bounds.left+box.x&&r.left<bounds.left+box.x+box.width&&r.bottom>top);
   lift=covered.length?height+bottom+12:0;
   if(covered.length){
    const region=container.querySelector('#calendar-scroll'),header=container.querySelector('#calendar .calendar-head')?.getBoundingClientRect().bottom||region?.getBoundingClientRect().top||0;
    const needed=Math.max(...covered.map(r=>r.bottom))-(top-12),room=Math.min(...targets.map(r=>r.top))-(header+8),delta=Math.min(needed,room);
    container.style.setProperty('--pill-clearance',lift+'px');
    if(region&&delta>4)requestAnimationFrame(()=>region.scrollBy({top:delta,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
   }
  }
  const width=panel.offsetWidth,x=anchor==='left'?pad:anchor==='right'?Math.max(pad,bounds.width-width-pad):Math.max(pad,(bounds.width-width)/2);
  panel.style.left=x+'px';panel.style.top='auto';panel.style.bottom=bottom+'px';
  container.style.setProperty('--pill-clearance',Math.max(lift,composer+bottom+12)+'px');setReserve(0);
 }
 function schedule({avoid:move=false}={}){if(move)avoid=true;cancelAnimationFrame(frame);frame=requestAnimationFrame(place);}
 new ResizeObserver(()=>schedule()).observe(container);
 new ResizeObserver(()=>schedule()).observe(panel);
 return {
  schedule,
  pin(){pinned=!pinned;panel.dataset.pinned=String(pinned);return pinned;},
  tuck(value=true,{focus=true}={}){tucked=value;panel.hidden=value;launcher.hidden=!value;container.classList.toggle('conversation-tucked',value);if(!value){anchor='center';panel.style.width='';}place();if(!value){if(focus)panel.querySelector('textarea').focus({preventScroll:true});}else if(focus)launcher.focus({preventScroll:true});},
  get tucked(){return tucked;}
 };
}
