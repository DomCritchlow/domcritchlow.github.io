// Everything in Settings, described so the conversation can change it. A change is a
// plan the user previews and confirms, like a calendar change; nothing applies on its own.
export const MARKER_DEFAULTS={decision:'#c1995b',proposed:'#2f5a45',pending:'#b79a60'};
const CATEGORY_DEFAULTS={internal:'#2a78d6',external:'#dd5b25',solo:'#14995f'};
const LABELS={'colors.internal':'Internal meeting color','colors.external':'External meeting color','colors.solo':'Solo and focus color',
 'colors.decision':'Open decision marker','colors.proposed':'Proposed change outline','colors.pending':'Needs agreement marker',
 internalDomains:'Internal domains',internalAddresses:'Internal addresses',automaticReviews:'Automatic reviews per day',fastMode:'Fast replies (about twice the cost)',model:'Assistant model (default or test)',readAloud:'Read replies aloud','memory.add':'Remember'};
export const isColorKey=key=>key.startsWith('colors.');
export const markerVariable=key=>({'colors.decision':'--marker-decision','colors.proposed':'--marker-proposed','colors.pending':'--marker-pending'})[key];

export function settingsCatalog({calendar={},audienceMode=true,inference={},preferences={},hosted=false,testModel=false}={}){
 const colors={...CATEGORY_DEFAULTS,...MARKER_DEFAULTS,...(calendar.colors||{})};
 const rows=[];
 // In a semantic color scheme, category colors belong to the scheme and change through appearance.
 if(audienceMode)for(const k of ['internal','external','solo'])rows.push({key:'colors.'+k,type:'color',value:colors[k]});
 for(const k of ['decision','proposed','pending'])rows.push({key:'colors.'+k,type:'color',value:colors[k]});
 rows.push({key:'internalDomains',type:'list',value:[...(calendar.internalDomains||[])]},{key:'internalAddresses',type:'list',value:[...(calendar.internalAddresses||[])]});
 if(hosted&&inference.maxAutomaticReviews!==undefined)rows.push({key:'automaticReviews',type:'number',value:inference.maxAutomaticReviews});
 rows.push({key:'fastMode',type:'boolean',value:!!inference.fastMode});
 // Offered only when the server has a test model configured. Its real name is never sent here.
 if(testModel)rows.push({key:'model',type:'choice',options:['default','test'],value:inference.model==='test'?'test':'default'});
 rows.push({key:'readAloud',type:'boolean',value:!!preferences.readAloud},{key:'memory.add',type:'text',value:null});
 return rows.map(r=>({...r,label:LABELS[r.key]}));
}

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function normalize(row,value){
 if(row.type==='color')return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():undefined;
 if(row.type==='list')return Array.isArray(value)?[...new Set(value.map(v=>String(v).trim().toLowerCase().replace(/^@/,'')).filter(Boolean))].sort():undefined;
 if(row.type==='number')return Number.isInteger(value)&&value>=0&&value<=50?value:undefined;
 if(row.type==='boolean')return typeof value==='boolean'?value:undefined;
 if(row.type==='choice')return row.options.includes(value)?value:undefined;
 if(row.type==='text')return typeof value==='string'&&value.trim()?value.trim().slice(0,500):undefined;
}
// Keep only changes the app can make and that differ from what is set now.
export function planSettings(changes,catalog){
 const plan=[];
 for(const change of changes||[]){
  const row=catalog.find(r=>r.key===change?.key);if(!row)continue;
  const after=normalize(row,change.value);if(after===undefined||same(after,row.value))continue;
  const existing=plan.findIndex(p=>p.key===row.key);const step={key:row.key,label:row.label,type:row.type,before:row.value,after};
  if(existing>=0)plan[existing]=step;else plan.push(step);
 }
 return plan;
}
// Reverting restores the earlier values; a remembered preference is removed separately.
export function undoPlan(plan){return plan.filter(p=>p.type!=='text').map(p=>({...p,before:p.after,after:p.before}));}
export function describeValue(step,value){
 if(step.type==='list')return value.length?value.join(', '):'none';
 if(step.type==='boolean')return value?'On':'Off';
 if(step.key==='model')return value==='test'?'Test model':'Default';
 return String(value);
}
export function summarize(plan){
 if(plan.length===1){const p=plan[0];return p.type==='text'?`Remember “${p.after}”`:p.type==='boolean'?`Turn ${p.after?'on':'off'} ${p.label.toLowerCase()}`:p.key==='model'?`Switch to ${p.after==='test'?'the test model':'the default model'}`:`Change ${p.label.toLowerCase()}`;}
 return `Change ${plan.length} settings`;
}
