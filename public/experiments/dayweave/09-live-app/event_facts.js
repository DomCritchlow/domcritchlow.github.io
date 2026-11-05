export function canEdit(event){return !event?.locked&&!!(event?.organizerSelf||event?.guestsCanModify||event?.canModify);}
export function canRespond(event){return !!event&&!event.created&&!event.allDay&&!!event.attendees?.some(a=>a.self);}
export function organizerLabel(event){if(event.organizerSelf)return 'You';const name=event.organizerName||event.organizer;if(!name)return 'Organizer unknown';return name.includes('@')?name.split('@')[0].replaceAll('.',' '):name;}
export function permissionLabel(event){return event.locked?'Locked':canEdit(event)?'Can edit':'Ask organizer to change';}
export function participationLabel(event){if(['active','listening'].includes(event.participation))return event.participation==='active'?'Active · set by you':'Listening · set by you';const estimate=event.participationEstimate;return estimate?.value==='active'?'Likely active':estimate?.value==='listening'?'Likely listening':'Role unclear';}
export function importanceLabel(event){return {high:'Likely important',lower:'Likely flexible'}[event.importanceEstimate?.value]||'Importance unclear';}
export function locationLabel(event){const rooms=(event.attendees||[]).filter(a=>a.resource);const loc=event.location||'';const text=loc.replace(/https?:\/\/[^\s,]+/g,'').replace(/^[,\s]+|[,\s]+$/g,'');if(text)return text;if(rooms.length)return rooms.map(a=>a.displayName||a.name||a.email).join(', ');return event.meetingUrl||/https?:\/\//.test(loc)?'Online':'Location not set';}
export function isOpen(decision){return decision.id!=='calendar-home'&&decision.state?.threadType!=='conversation'&&['open','needs_review','running'].includes(decision.status);}
export function decisionRefs(decision){return [...new Set([...(decision.refs||[]),...Object.keys(decision.state.edits||{}),...(decision.state.returnView?.highlighted||decision.state.highlighted||[]),...(decision.state.drafts||[]).flatMap(d=>d.ids||[])])];}

export function safeWebUrl(value){
 if(typeof value!=='string'||/[\u0000-\u0020\u007f]/.test(value))return null;
 try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function meetingLink(event){
 const points=(event.conference||event.conferenceData)?.entryPoints||[];
 for(const raw of [event.meetingUrl,event.hangoutLink,...points.filter(p=>p.entryPointType==='video').map(p=>p.uri)]){
  const url=safeWebUrl(raw);if(url)return url;
 }
 // A plain location URL is a join link only for a recognizable conference service.
 const url=safeWebUrl(event.location?.trim());
 if(url){const host=new URL(url).hostname;if(['meet.google.com','teams.microsoft.com','teams.live.com'].includes(host)||['zoom.us','webex.com'].some(domain=>host===domain||host.endsWith('.'+domain)))return url;}
 return null;
}
export function conferenceLabel(event){
 const url=meetingLink(event);if(!url)return '';
 const host=new URL(url).hostname;
 if(host==='meet.google.com')return 'Google Meet';
 if(host==='zoom.us'||host.endsWith('.zoom.us'))return 'Zoom';
 if(['teams.microsoft.com','teams.live.com'].includes(host))return 'Microsoft Teams';
 return event.conference?.name||event.conferenceData?.conferenceSolution?.name||'Video meeting';
}
export function eventPlace(event){
 const rooms=(event.attendees||[]).filter(p=>p.resource).map(p=>p.displayName||p.name||p.email).filter(Boolean);
 const text=(event.location||'').replace(/https?:\/\/[^\s,]+/g,'').replace(/^[,;\s]+|[,;\s]+$/g,'').trim();
 const work=event.workingLocation;
 return text||rooms.join(', ')||work?.officeLocation?.label||work?.customLocation?.label||(work?.type==='homeOffice'?'Home':null)||conferenceLabel(event)||'';
}
export function googleEventUrl(event){
 const value=safeWebUrl(event.url||event.htmlLink);if(!value)return null;
 const url=new URL(value);return url.protocol==='https:'&&(url.hostname==='calendar.google.com'||['google.com','www.google.com'].includes(url.hostname)&&url.pathname.startsWith('/calendar'))?value:null;
}
