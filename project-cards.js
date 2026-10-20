// Interactive, locally hosted project slices. No iframe or video.
export const projects = [
  {id:'boso', number:'01 / ACTION RPG', title:'Boso — Look at me!', status:'Play a boss battle', image:'assets/projects/boso.png', alt:'Boso, the original game starring Seoli and Bomi.', description:'Enter the Vacuum Closet and take on the Vacuum King. One boss encounter, with keyboard and touch controls.', tags:['Original game assets','Boss battle','PC + mobile'], source:'https://github.com/legowen/Boso', detail:'A playable encounter adapted from Boso’s original Vacuum Closet. Choose your cat, learn the boss’s attacks, and clear the room.'},
  {id:'ptwithkitty', number:'02 / PERSONAL TRAINING', title:'PT w Kitty', status:'Try the app', image:'assets/projects/ptwithkitty.jpg', alt:'PT w Kitty’s companion room, workout records and session overview.', description:'A little training, a little company. Try the cat room and workout journal from the app’s current local build.', tags:['Workout journal','Cat companions','Interactive preview'], detail:'An English interactive slice of the original local app, using sample records. Your changes stay in this preview.'},
  {id:'lotto', number:'03 / DATA EXPLORATION', title:'LottoMax · Bomi’s number picker', status:'Generate a random pick', image:'assets/projects/lottomax.png', alt:'LottoMax’s original pixel-art number picker with Bomi.', description:'Let Bomi pick seven numbers. The original pixel-art interface, with a working random generator and recent picks.', tags:['Random generator','Original pixel art','Python / Keras project'], source:'https://github.com/legowen/lottomax-ai', detail:'Try the number-picker screen right here. This version generates random combinations locally; the original project’s Python model is separate.', notes:'The original project uses Python/FastAPI and TensorFlow/Keras. One research model processes 20 multi-hot draws with an LSTM (32 units), a 32-unit dense layer, and 52 sigmoid outputs, compared with a constant-probability baseline. This browser demo uses random sampling, with no model inference or claim of improved odds.'},
  {id:'weather', number:'04 / EVERYDAY UTILITY', title:'Hope no Rain', status:'Explore the dashboard', image:'assets/projects/weather.png', alt:'The original Hope no Rain weather dashboard.', description:'Explore the weather dashboard, switch cities, and compare a five-day outlook using sample data.', tags:['City explorer','Sample forecast','React project'], source:'https://github.com/legowen/weather_app', detail:'A compact interactive version of the original dashboard. Choose a sample city, select a day, or switch temperature units.'},
  {id:'renu', number:'05 / WEBSITE OPERATIONS', title:'Renu Bio Health · Web & store', status:'See the live sites', image:'assets/projects/renu-sites.jpg', alt:'The Renu Bio Health company website and the Royal Canadian online store.', description:'The company website and the Royal Canadian supplement store I managed at Renu Bio Health. Both are live.', tags:['Company website','Shopify store','Live sites'], detail:'Two live sites from my time at Renu Bio Health. Have a look here, or open them in a new tab.'}
];

const loaders = {
  boso: () => import('./boso-demo.js?v=3').then(m => m.mountBoso),
  ptwithkitty: () => import('./ptwithkitty-demo.js?v=4').then(m => m.mountPTwithKitty),
  lotto: () => import('./lotto-demo.js?v=3').then(m => m.mountLotto),
  weather: () => import('./utility-demos.js?v=4').then(m => m.mountWeather),
  renu: () => import('./renu-sites.js?v=1').then(m => m.mountRenuSites)
};

export function mountProjectCards(root, onOpen) {
  for (const project of projects) {
    const article=document.createElement('article');article.className=`project-card original-card project-${project.id}`;
    const button=document.createElement('button');button.className='project-open';button.dataset.project=project.id;button.setAttribute('aria-label',`Try ${project.title}`);
    const visual=document.createElement('div');visual.className='original-visual';
    if(project.image){const img=document.createElement('img');img.src=project.image;img.alt=project.alt;img.loading='lazy';img.decoding='async';visual.append(img);}
    const status=document.createElement('span');status.className='original-status';status.textContent=project.status;visual.append(status);
    const info=document.createElement('div');info.className='project-info';info.innerHTML=`<span class="project-number">${project.number}</span><h3>${project.title}<span>↗</span></h3><p>${project.description}</p><div class="tags">${project.tags.map(t=>`<span>${t}</span>`).join('')}</div>`;
    button.append(visual,info);button.addEventListener('click',()=>onOpen(project,button));article.append(button);root.append(article);
  }
}

export function mountOriginalProject(project, root) {
  let disposed=false, cleanup=()=>{};
  const intro=document.createElement('div');intro.className='original-intro';intro.innerHTML=`<span class="eyebrow">${project.status.toUpperCase()}</span><h2 id="demo-title">${project.title}</h2><p>${project.detail}</p>`;root.append(intro);
  const stage=document.createElement('div');stage.className=`interactive-stage interactive-${project.id}`;stage.innerHTML='<p class="demo-loading" role="status">Opening the interactive preview…</p>';root.append(stage);
  loaders[project.id]().then(mount=>{if(disposed)return;stage.replaceChildren();cleanup=mount(stage);}).catch(()=>{if(!disposed)stage.innerHTML='<p role="alert">This preview could not load. Please close it and try again.</p>';});
  if(project.notes){const details=document.createElement('details');details.className='model-notes';const summary=document.createElement('summary');summary.textContent='About the original Python model';const p=document.createElement('p');p.textContent=project.notes;details.append(summary,p);root.append(details);}
  if(project.source){const a=document.createElement('a');a.href=project.source;a.textContent='Explore the original source ↗';a.target='_blank';a.rel='noopener noreferrer';a.className='demo-source';root.append(a);}
  return ()=>{disposed=true;cleanup?.();root.replaceChildren();};
}
