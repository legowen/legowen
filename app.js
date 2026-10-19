import { mountProjectCards, mountOriginalProject } from './project-cards.js?v=3';

const capabilities = {
  endpoints: { icon:'▣', title:'A better first login.', description:'Mac, Windows, and Android management that supports the whole device lifecycle — enrollment, configuration, application delivery, compliance, and retirement.', example:'Managed mixed Mac and Windows fleets at Sprung Studios with Jamf Pro and Intune. Built enrollment through Apple Business Manager and PreStage, and standardized profiles and application delivery.', tags:['Microsoft Intune','Jamf Pro','Apple Business Manager','Windows 11','macOS'] },
  workplace: { icon:'◈', title:'One connected workplace.', description:'Make collaboration easier to navigate, govern, and support. Microsoft 365, SharePoint architecture, Teams governance, and business applications that fit how people work.', example:'Led the Google Workspace to Microsoft 365 migration across Vancouver and Brighton. Built a Power Apps + SharePoint List service desk and automated recurring IT processes.', tags:['Microsoft 365','Exchange Online','SharePoint','Teams','Power Platform'] },
  infrastructure: { icon:'⌘', title:'Reliable foundations. Clear ownership.', description:'Windows Server and hybrid identity, network administration, virtualization, backup, and access control. Diagnose the root cause, document the change, and make the next handover easier.', example:'Operated Active Directory, Entra Connect, domain controllers, and Group Policy. Managed Palo Alto policy and GlobalProtect VPN, and rebuilt Hyper-V, Synology, and UniFi infrastructure with documented service accounts.', tags:['Windows Server','Entra ID / AD','Palo Alto','DNS / DHCP / VLAN','Hyper-V','PowerShell'] },
  automation: { icon:'✳', title:'Less repetition. More possibility.', description:'Turn recurring work into reliable workflows. Connect data and business needs with PowerShell, Power Automate, reporting, and governed AI enablement.', example:'Built an Azure Automation runbook to warn Azure DevOps token owners before expiry. Established access and data-handling rules for Copilot Studio agents, keeping NDA-covered client material out of them.', tags:['PowerShell','Azure Automation','Power Automate','Copilot Studio','Dataverse','Power BI / Fabric'] }
};
const panel = document.querySelector('#capability-panel');
const tabs = [...document.querySelectorAll('[data-capability]')];
function showCapability(button) {
  const item=capabilities[button.dataset.capability];
  tabs.forEach(t=>{t.setAttribute('aria-selected',String(t===button));t.tabIndex=t===button?0:-1;});
  panel.setAttribute('aria-labelledby',button.id);
  panel.innerHTML=`<div class="panel-icon" aria-hidden="true">${item.icon}</div><h3>${item.title}</h3><p>${item.description}</p><div class="case-note"><strong>IN PRACTICE</strong><p>${item.example}</p></div><div class="tags">${item.tags.map(t=>`<span>${t}</span>`).join('')}</div>`;
}
tabs.forEach((button,i)=>{button.addEventListener('click',()=>showCapability(button));button.addEventListener('keydown',e=>{let next;if(['ArrowDown','ArrowRight'].includes(e.key))next=(i+1)%tabs.length;if(['ArrowUp','ArrowLeft'].includes(e.key))next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();showCapability(tabs[next]);}});});showCapability(tabs[0]);

const career=[
  ['SS','Mar 2026 — Sep 2026','Sprung Studios','IT Engineering Specialist','Vancouver, BC','Led Microsoft 365 migration, hybrid identity, endpoint management, and network security across the Vancouver and Brighton studios.'],
  ['FT','Mar 2025 — Mar 2026','Sunia Technology Inc.','IT Infrastructure Engineer','Burnaby, BC · Rebranded as FluxInk','Supported nine international offices at Tier 3, with Tier 4 vendor escalation. Operated Microsoft data platforms, cloud infrastructure, networks, and AI workload environments.'],
  ['RB','Aug 2023 — Feb 2025','Renu Bio Health Ltd.','IT Specialist','Burnaby, BC','Moved from full-stack development into IT operations, connecting cloud services, Microsoft 365, network infrastructure, and business systems.'],
  ['CN','Jun 2023 — Dec 2023','Code Ninjas','Coding Instructor','Burnaby, BC','Taught programming logic, problem solving, and debugging. Helped maintain the curriculum and track student progress.'],
  ['AU','Dec 2020 — Jul 2023','Audi Canada','Technician','North Vancouver, BC','Performed diagnostic programming and electric vehicle system setup, alongside workshop IT support and connectivity troubleshooting.'],
  ['DE','Jan 2016 — Aug 2016','Daesung Energy Co., Ltd.','IT Intern','Daegu, Korea','Built interactive components for internal web applications and supported system configuration and application testing.']
];
const timeline=document.querySelector('#timeline');
career.forEach(([mark,date,company,title,location,summary],i)=>{const article=document.createElement('article');article.className='timeline-item';article.dataset.mark=mark;article.dataset.date=date;article.innerHTML=`<span class="time-mobile">${date}</span><h3>${company}</h3><p class="timeline-role">${title}</p><p class="timeline-location">${location}</p><p>${summary}</p><details><summary>Read responsibilities</summary><ul id="career-${i}"></ul></details>`;timeline.append(article);});
fetch('./career.json').then(r=>{if(!r.ok)throw new Error('Resume details unavailable');return r.json();}).then(data=>data.forEach((bullets,i)=>{const list=document.querySelector(`#career-${i}`);bullets.forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});})).catch(()=>document.querySelectorAll('.timeline-item details').forEach(d=>{d.innerHTML='<a class="text-link" href="assets/OwenKim_Resume.pdf">Read the full résumé ↗</a>';}));

const dialog=document.querySelector('#project-dialog'),content=document.querySelector('#demo-content');
let cleanupDemo=()=>{},lastTrigger;
mountProjectCards(document.querySelector('#project-cards'),(project,button)=>{lastTrigger=button;cleanupDemo();content.replaceChildren();cleanupDemo=mountOriginalProject(project,content);dialog.showModal();document.body.classList.add('modal-open');roomController?.setActive(false);const layer=document.querySelector('#cat-layer');layer.classList.add('in-dialog');dialog.append(layer);dialog.scrollTop=0;document.querySelector('#close-demo').focus();});
document.querySelector('#close-demo').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{cleanupDemo();cleanupDemo=()=>{};document.body.classList.remove('modal-open');const layer=document.querySelector('#cat-layer');layer.classList.remove('in-dialog');document.body.append(layer);syncRoomVisibility();lastTrigger?.focus();});
document.querySelector('#year').textContent=new Date().getFullYear();
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)document.querySelectorAll('.topbar nav a').forEach(a=>a.classList.toggle('active',a.hash===`#${entry.target.id}`));});},{rootMargin:'-20% 0px -50% 0px'});document.querySelectorAll('main>section').forEach(s=>observer.observe(s));

// Two small companions live at the viewport edge and never intercept clicks.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let catsMoving=!reducedMotion.matches;
try{const stored=localStorage.getItem('owen-cats');if(stored!==null)catsMoving=stored==='on'&&!reducedMotion.matches;}catch{}
const toggle=document.querySelector('#cat-toggle');
function updateToggle(){toggle.innerHTML=`<span>🐾</span> ${catsMoving?'Cats on':'Cats resting'}`;toggle.setAttribute('aria-pressed',String(catsMoving));toggle.setAttribute('aria-label',catsMoving?'Pause roaming cats':'Let cats roam');}
toggle.addEventListener('click',()=>{catsMoving=!catsMoving;roomController?.setCatsMoving(catsMoving);updateToggle();try{localStorage.setItem('owen-cats',catsMoving?'on':'off');}catch{}});updateToggle();
reducedMotion.addEventListener('change',e=>{if(e.matches){catsMoving=false;roomController?.setCatsMoving(false);updateToggle();}});
const cats=[{el:document.querySelector('#bomi'),x:70,target:200,speed:20,idleUntil:0},{el:document.querySelector('#seoli'),x:190,target:420,speed:25,idleUntil:0}];
let last=0;
function moveCats(time){const dt=Math.min((time-last)/1000,.05);last=time;const max=Math.max(0,(dialog.open?dialog.clientWidth-85:innerWidth-165));cats.forEach((cat,index)=>{cat.x=Math.max(0,Math.min(cat.x,max));cat.target=Math.min(cat.target,max);const sprite=cat.el.firstElementChild;let frame=0;if(catsMoving&&!document.hidden&&time>cat.idleUntil){if(Math.abs(cat.x-cat.target)<2){cat.target=Math.random()*max;cat.idleUntil=time+2000+Math.random()*3500;}else{const dir=cat.target>cat.x?1:-1;cat.x+=dir*cat.speed*dt;sprite.style.transform=`scaleX(${dir})`;frame=2+Math.floor(time/170)%4;}}else if(catsMoving&&Math.floor(time/2500)%4===0)frame=1;sprite.style.setProperty('--frame-x',`${(frame%4)*100/3}%`);sprite.style.setProperty('--frame-y',`${Math.floor(frame/4)*100/3}%`);cat.el.style.left=`${cat.x}px`;cat.el.style.bottom=`${8+index*5}px`;});requestAnimationFrame(moveCats);}requestAnimationFrame(moveCats);

// The résumé and project sections work independently of the optional 3D module.
let roomController=null,roomAbort=null,roomInView=true,roomSkipped=false,roomLoading=false;
const roomHost=document.querySelector('#room-canvas');
const roomFallback=document.querySelector('#room-fallback');
const roomStart=document.querySelector('#enable-3d');
const roomStatus=document.querySelector('#room-status');
const roomReset=document.querySelector('#reset-room');
function syncRoomVisibility(){
  const active=!!roomController&&roomInView&&!dialog.open&&!document.hidden;
  roomController?.setActive(active);
  document.body.classList.toggle('room-live',active);
}
function releaseRoom(){roomAbort?.abort();roomAbort=null;roomController?.dispose();roomController=null;roomLoading=false;roomFallback.hidden=false;roomStart.hidden=false;roomStart.disabled=false;roomReset.hidden=true;syncRoomVisibility();}
function navigateTo(id){const target=document.getElementById(id);if(target){target.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth'});history.replaceState(null,'',`#${id}`);const heading=target.querySelector('h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}}
async function startRoom(){
  if(roomLoading||roomController)return;
  roomSkipped=false;roomLoading=true;roomStart.disabled=true;roomStatus.textContent='Opening the workspace…';
  const abort=new AbortController();roomAbort=abort;
  try{
    const {mountRoom}=await import('./room3d.js?v=3');
    if(abort.signal.aborted)return;
    const controller=await mountRoom(roomHost,{signal:abort.signal,catsMoving,onNavigate:navigateTo,onError:()=>{roomStatus.textContent='3D unavailable. All experience and projects are still below.';}});
    if(abort.signal.aborted){controller.dispose();return;}
    roomController=controller;roomFallback.hidden=true;roomStart.hidden=true;roomReset.hidden=false;roomStatus.textContent='Drag to look around. Click a screen, server, or frame.';syncRoomVisibility();
  }catch(error){if(!abort.signal.aborted){releaseRoom();roomStatus.textContent='3D unavailable. Continue to experience and projects below.';}}
  finally{if(roomAbort===abort){roomLoading=false;roomStart.disabled=false;}}
}
roomStart.addEventListener('click',startRoom);
roomReset.addEventListener('click',()=>roomController?.resetView());
document.querySelector('#skip-3d').addEventListener('click',e=>{e.preventDefault();roomSkipped=true;releaseRoom();roomStatus.textContent='3D is off. Explore it whenever you like.';navigateTo('experience');});
const roomObserver=new IntersectionObserver(([entry])=>{roomInView=entry.isIntersecting;syncRoomVisibility();},{threshold:.08});roomObserver.observe(document.querySelector('#home'));
document.addEventListener('visibilitychange',syncRoomVisibility);
window.addEventListener('pagehide',()=>{roomAbort?.abort();roomController?.dispose();});
if(!reducedMotion.matches&&!matchMedia('(max-width:760px)').matches&&!navigator.connection?.saveData){
  const begin=()=>{if(!roomSkipped&&roomInView)startRoom();};
  if('requestIdleCallback' in window)requestIdleCallback(begin,{timeout:1200});else setTimeout(begin,300);
}
