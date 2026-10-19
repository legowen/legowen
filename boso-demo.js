// A compact, standalone adaptation of Boso's real Vacuum Closet encounter.
// Map/art/character references: legowen/boso, src/data/map_closet.js,
// src/data/characters.js and src/entities/VacuumKing.js. HP is shortened for a portfolio visit.
const ASSETS = new URL('./assets/boso-demo/', import.meta.url);
const CATS = new URL('./assets/', import.meta.url);
const CHARACTERS = {
  seoli: {name:'Seoli',hp:100,speed:250,jump:540,damage:14,reach:105,cooldown:.29,effect:'wind'},
  bomi: {name:'Bomi',hp:160,speed:190,jump:480,damage:24,reach:48,cooldown:.41,effect:'paw'}
};
const platforms = [{x:0,y:740,w:1600,h:60},{x:300,y:600,w:200,h:16},{x:1100,y:560,w:220,h:16}];
const ropes = [{x:380,top:600,bottom:710},{x:1180,top:560,bottom:710}];
const keyActions = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'climb',KeyW:'climb',Space:'jump',KeyZ:'attack',KeyJ:'attack'};
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export function mountBoso(root) {
  root.innerHTML = `<section class="boso-demo" aria-label="Boso playable boss encounter">
    <div class="boso-toolbar"><div><strong>BOSO · VACUUM CLOSET</strong><span>One room. Two brave cats. One very loud king.</span></div><div class="boso-toolbar-actions"><button type="button" data-pause disabled>Pause</button><button type="button" data-restart disabled>Restart</button></div></div>
    <div class="boso-stage"><canvas width="1600" height="800" tabindex="0" aria-label="Boso game. Arrow keys or A and D to move, Space to jump, W or up to climb ropes, Z or J to attack, P to pause."></canvas>
      <div class="boso-overlay"><div class="boso-overlay-card"><h3 data-heading>Meet the Vacuum King</h3><p data-description>Climb the ropes, leap from the shelves, and land your claws. Run against the suction and dodge the dust!</p><div class="boso-characters"><button type="button" data-cat="seoli" aria-pressed="true">Seoli<small>Swift wind claws</small></button><button type="button" data-cat="bomi" aria-pressed="false">Bomi<small>Powerful paws · more HP</small></button></div><button type="button" class="boso-start" disabled>Loading room…</button></div></div>
    </div><p class="boso-help"><kbd>← → / A D</kbd> Move · <kbd>Space</kbd> Jump · <kbd>↑ / W</kbd> Climb ropes · <kbd>Z / J</kbd> Attack · <kbd>P</kbd> Pause. Hold attack for combos. Use the shelves to reach the king.</p>
    <div class="boso-touch" aria-label="Touch game controls"><div class="boso-touch-group"><button type="button" data-action="left" aria-label="Move left">◀</button><button type="button" data-action="right" aria-label="Move right">▶</button></div><div class="boso-touch-group"><button type="button" data-action="climb">Climb</button><button type="button" data-action="jump">Jump</button><button type="button" data-action="attack">Attack</button></div></div><p class="boso-live" role="status" aria-live="polite"></p></section>`;
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const overlay = root.querySelector('.boso-overlay'), start = root.querySelector('.boso-start');
  const heading = root.querySelector('[data-heading]'), description = root.querySelector('[data-description]');
  const characterButtons = root.querySelector('.boso-characters'), pauseButton = root.querySelector('[data-pause]');
  const restartButton = root.querySelector('[data-restart]'), live = root.querySelector('.boso-live');
  const abort = new AbortController(), listen = (target,type,fn,options={}) => target.addEventListener(type,fn,{...options,signal:abort.signal});
  const images = {}, keyboard = new Set(), pointers = new Map(), taps = new Set();
  let disposed=false, loaded=false, selected='seoli', state='ready', previous=0, raf=0, clock=0, viewWidth=1600, camera=0;
  let player, boss, dust=[], effects=[], attack=null, combo=0, lastAttack=-10, nextAttack=0;
  const held = action => taps.has(action) || [...keyboard].some(code=>keyActions[code]===action) || [...pointers.values()].includes(action);
  function resetInput(){keyboard.clear();pointers.clear();taps.clear();root.querySelectorAll('.is-held').forEach(el=>el.classList.remove('is-held'));}
  function reset(){
    const c=CHARACTERS[selected];clock=0;camera=0;dust=[];effects=[];attack=null;combo=0;lastAttack=-10;nextAttack=0;
    player={x:140,y:740,vx:0,vy:0,hp:c.hp,maxHp:c.hp,ground:true,climbing:false,dir:1,invincible:0};
    boss={x:1100,y:430,hp:280,maxHp:280,dir:-1,phase:'idle',phaseEnd:2,nextDust:1,flash:0};
    resetInput();
  }
  function setState(next){
    state=next;overlay.hidden=next==='playing';characterButtons.hidden=next==='paused';
    pauseButton.disabled=!loaded||!['playing','paused'].includes(next);restartButton.disabled=!loaded;
    pauseButton.textContent=next==='paused'?'Resume':'Pause';
    if(next==='paused'){heading.textContent='Take a breath';description.textContent='The room is paused. Jump back in when you are ready.';start.textContent='Resume';}
    else if(next==='won'){heading.textContent='The closet is quiet!';description.textContent=`${CHARACTERS[selected].name} defeated the Vacuum King. A brave little cat, a very big victory.`;start.textContent='Play again';live.textContent='Victory! Vacuum King defeated.';}
    else if(next==='lost'){heading.textContent='Nine lives. Another try.';description.textContent='Climb onto a shelf before attacking. Keep moving when the king fires dust.';start.textContent='Try again';live.textContent='Your cat is out of health. Try again.';}
    resetInput();
  }
  function play(){if(!loaded)return;if(state!=='paused')reset();setState('playing');canvas.focus({preventScroll:true});previous=performance.now();}
  function pause(){if(state==='playing')setState('paused');}
  function hurt(amount,direction){
    if(player.invincible>0)return;
    player.hp=Math.max(0,player.hp-amount);player.invincible=1;player.x=clamp(player.x+direction*28,25,1575);
    effects.push({x:player.x,y:player.y-100,text:`−${amount}`,life:.8,color:'#ff9c95'});
    if(player.hp<=0)setState('lost');
  }
  function attackBoss(amount){
    boss.hp=Math.max(0,boss.hp-amount);boss.flash=.12;
    effects.push({x:boss.x,y:boss.y-100,text:String(amount),life:.75,color:'#fff1a1'});
    if(boss.hp<=0){dust=[];setState('won');}
  }
  function update(dt){
    clock+=dt;const c=CHARACTERS[selected];player.invincible=Math.max(0,player.invincible-dt);boss.flash=Math.max(0,boss.flash-dt);
    if(clock>boss.phaseEnd){boss.phase=boss.phase==='suck'?'idle':'suck';boss.phaseEnd=clock+(boss.phase==='suck'?3:2.5);boss.nextDust=clock+.4;}
    boss.x+=boss.dir*40*dt;if(boss.x<=800||boss.x>=1400)boss.dir*=-1;boss.y=430+Math.sin(clock*1.43)*24;
    let move=(held('right')?1:0)-(held('left')?1:0);
    if(move)player.dir=move;
    const rope=ropes.find(r=>Math.abs(player.x-r.x)<38&&player.y>=r.top&&player.y<=r.bottom+35);
    player.climbing=!!(held('climb')&&rope);
    if(player.climbing){player.x=rope.x;player.vx=0;player.vy=-200;player.ground=false;}
    else {player.vx=move*c.speed+(boss.phase==='suck'?Math.sign(boss.x-player.x)*150:0);player.vy+=900*dt;}
    if(taps.has('jump')&&(player.ground||player.climbing)){player.vy=-c.jump;player.ground=false;player.climbing=false;if(rope&&held('climb'))player.x+=player.dir*42;}
    const oldFeet=player.y;player.x=clamp(player.x+player.vx*dt,25,1575);player.y+=player.vy*dt;player.ground=false;
    if(player.climbing&&player.y<=rope.top){player.y=rope.top;player.vy=0;player.ground=true;}
    else if(player.vy>=0){for(const p of platforms){if(oldFeet<=p.y+2&&player.y>=p.y&&player.x+20>p.x&&player.x-20<p.x+p.w){player.y=p.y;player.vy=0;player.ground=true;break;}}}
    if(held('attack')&&clock>=nextAttack){combo=clock-lastAttack<.85?(combo+1)%3:0;lastAttack=clock;nextAttack=clock+c.cooldown;attack={age:0,dir:player.dir,hit:false};}
    if(attack){attack.age+=dt;const reach=selected==='seoli'?28+clamp(attack.age/.21,0,1)*(c.reach-28):c.reach;
      const ax=player.x+attack.dir*reach,ay=player.y-50;
      if(!attack.hit&&Math.abs(ax-boss.x)<90&&Math.abs(ay-boss.y)<95){attack.hit=true;attackBoss(Math.round(c.damage*[1,1.15,1.5][combo]));}
      if(attack.age>.23)attack=null;
    }
    if(state!=='playing')return;
    if(boss.phase==='idle'&&clock>=boss.nextDust){const dx=player.x-boss.x,dy=player.y-45-boss.y,len=Math.hypot(dx,dy)||1;dust.push({x:boss.x,y:boss.y+20,vx:dx/len*200,vy:dy/len*200,age:0});boss.nextDust=clock+1.2;}
    for(const d of dust){d.age+=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(Math.abs(d.x-player.x)<34&&d.y>player.y-82&&d.y<player.y+8){hurt(15,Math.sign(player.x-d.x)||1);d.age=5;}}
    dust=dust.filter(d=>d.age<4&&d.x>-30&&d.x<1630&&d.y<810);
    if(Math.abs(player.x-boss.x)<68&&Math.abs(player.y-45-boss.y)<90)hurt(25,Math.sign(player.x-boss.x)||-1);
    effects.forEach(f=>{f.life-=dt;f.y-=30*dt;});effects=effects.filter(f=>f.life>0);
    camera=clamp(player.x-viewWidth*.4,0,1600-viewWidth);
  }
  function sprite(image,x,y,w,h,flip=false){ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();}
  function bar(x,y,w,fraction,color){ctx.fillStyle='#151626dc';ctx.fillRect(x,y,w,14);ctx.fillStyle=color;ctx.fillRect(x,y,w*clamp(fraction,0,1),14);ctx.strokeStyle='#d5ccbb88';ctx.strokeRect(x,y,w,14);}
  function draw(){
    ctx.clearRect(0,0,viewWidth,800);ctx.imageSmoothingEnabled=false;
    if(!loaded){ctx.fillStyle='#151721';ctx.fillRect(0,0,viewWidth,800);return;}
    const bg=images.background,scale=Math.max(viewWidth/bg.width,800/bg.height);
    ctx.drawImage(bg,(viewWidth-bg.width*scale)/2,(800-bg.height*scale)/2,bg.width*scale,bg.height*scale);
    ctx.fillStyle='#11142666';ctx.fillRect(0,0,viewWidth,800);ctx.save();ctx.translate(-camera,0);
    for(const r of ropes){ctx.strokeStyle='#5a3828';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(r.x,r.top);ctx.lineTo(r.x,r.bottom);ctx.stroke();ctx.strokeStyle='#d6b37c';ctx.lineWidth=5;ctx.stroke();for(let y=r.top+8;y<r.bottom;y+=18){ctx.fillStyle='#8e643f';ctx.fillRect(r.x-5,y,10,4);}}
    const terrain=images.terrain;
    for(const p of platforms){ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.clip();for(let x=p.x;x<p.x+p.w;x+=128)ctx.drawImage(terrain,x,p.y,128,64);ctx.restore();ctx.fillStyle='#ffedbc';ctx.fillRect(p.x,p.y,p.w,3);ctx.fillStyle='#111420';ctx.fillRect(p.x,p.y+p.h-3,p.w,3);}
    if(boss.phase==='suck'&&state==='playing'){
      ctx.strokeStyle='#afe8ee99';ctx.lineWidth=3;
      for(let i=0;i<15;i++){const a=i*2.4,dist=80+((i*29-clock*280)%320+320)%320;const x=boss.x+Math.cos(a)*dist,y=boss.y+Math.sin(a)*dist*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*28,y-Math.sin(a)*14);ctx.stroke();}
    }
    if(state!=='won'){
      if(boss.flash)ctx.globalAlpha=.55;
      sprite(images.boss,boss.x,boss.y,150,188,boss.dir>0);ctx.globalAlpha=1;
    }
    for(const d of dust){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.age*5);ctx.drawImage(images.dust,-16,-16,32,32);ctx.restore();}
    let frame=0;if(player.invincible>.75)frame=14;else if(attack)frame=9+combo;else if(player.climbing)frame=12+Math.floor(clock*6)%2;else if(!player.ground)frame=player.vy<0?6:7;else if(Math.abs(player.vx)>15)frame=2+Math.floor(clock*11)%4;else if(Math.floor(clock*3)%4===3)frame=1;
    ctx.save();ctx.translate(player.x,player.y);if(player.dir<0)ctx.scale(-1,1);if(player.invincible>0&&Math.floor(clock*12)%2===0)ctx.globalAlpha=.45;
    ctx.drawImage(images[selected],(frame%4)*96,Math.floor(frame/4)*96,96,96,-54,-99,108,108);ctx.restore();
    if(attack){const c=CHARACTERS[selected],reach=selected==='seoli'?28+attack.age/.21*(c.reach-28):c.reach;ctx.globalAlpha=1-attack.age*2;sprite(images[c.effect],player.x+attack.dir*reach,player.y-50,88,64,attack.dir<0);ctx.globalAlpha=1;}
    ctx.font='bold 28px system-ui';ctx.textAlign='center';for(const f of effects){ctx.globalAlpha=clamp(f.life*2,0,1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;ctx.restore();
    ctx.fillStyle='#141524e8';ctx.fillRect(0,0,viewWidth,100);ctx.font='bold 23px system-ui';ctx.textAlign='left';ctx.fillStyle='#f8e9c8';ctx.fillText(`${CHARACTERS[selected].name.toUpperCase()}  ${player.hp} / ${player.maxHp}`,28,37);bar(28,52,250,player.hp/player.maxHp,'#7ad8b3');
    const bw=Math.min(480,viewWidth*.4),bx=viewWidth-bw-28;ctx.fillStyle='#ffdaa0';ctx.fillText('VACUUM KING',bx,37);bar(bx,52,bw,boss.hp/boss.maxHp,'#d99071');ctx.font='18px system-ui';ctx.fillStyle='#d8d5dd';ctx.fillText(boss.phase==='suck'?'SUCTION · keep moving!':'DUST · dodge and jump',bx,88);
    if(boss.x-camera>viewWidth-70){ctx.textAlign='right';ctx.fillStyle='#ffe3a3';ctx.font='bold 22px system-ui';ctx.fillText('King →',viewWidth-22,150);}
    else if(boss.x-camera<50){ctx.textAlign='left';ctx.fillStyle='#ffe3a3';ctx.font='bold 22px system-ui';ctx.fillText('← King',22,150);}
  }
  function loop(now){if(disposed)return;const dt=Math.min((now-previous)/1000,.035);previous=now;if(state==='playing')update(dt);taps.clear();draw();raf=requestAnimationFrame(loop);}
  listen(start,'click',play);
  listen(pauseButton,'click',()=>state==='paused'?play():pause());
  listen(restartButton,'click',()=>{reset();setState('playing');canvas.focus({preventScroll:true});});
  for(const button of root.querySelectorAll('[data-cat]'))listen(button,'click',()=>{selected=button.dataset.cat;root.querySelectorAll('[data-cat]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));reset();});
  listen(canvas,'keydown',event=>{
    if(event.code==='KeyP'&&!event.repeat){event.preventDefault();state==='paused'?play():pause();return;}
    if(!keyActions[event.code]||state!=='playing')return;event.preventDefault();if(!keyboard.has(event.code))taps.add(keyActions[event.code]);keyboard.add(event.code);
  });
  listen(window,'keyup',event=>keyboard.delete(event.code));
  listen(canvas,'blur',event=>{if(event.relatedTarget!==pauseButton&&event.relatedTarget!==restartButton)pause();});listen(window,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
  listen(canvas,'pointerdown',()=>canvas.focus({preventScroll:true}));
  for(const button of root.querySelectorAll('[data-action]')){
    listen(button,'pointerdown',event=>{if(state!=='playing')return;event.preventDefault();canvas.focus({preventScroll:true});button.setPointerCapture(event.pointerId);pointers.set(event.pointerId,button.dataset.action);taps.add(button.dataset.action);button.classList.add('is-held');});
    const release=event=>{pointers.delete(event.pointerId);if(![...pointers.values()].includes(button.dataset.action))button.classList.remove('is-held');};
    listen(button,'pointerup',release);listen(button,'pointercancel',release);listen(button,'lostpointercapture',release);
    listen(button,'click',event=>{if(event.detail===0&&state==='playing'){taps.add(button.dataset.action);canvas.focus({preventScroll:true});}});
  }
  const resize=new ResizeObserver(entries=>{viewWidth=entries[0].contentRect.width<=600?1000:1600;if(canvas.width!==viewWidth)canvas.width=viewWidth;canvas.style.aspectRatio=`${viewWidth} / 800`;camera=player?clamp(player.x-viewWidth*.4,0,1600-viewWidth):0;});resize.observe(root);
  const intersection=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();});intersection.observe(canvas);
  reset();
  const files={background:'bg_cellar.png',terrain:'tile_cellar.png',boss:'boss_vacuum_king.png',dust:'proj_dust.png',wind:'fx_wind.png',paw:'fx_paw.png',seoli:'seoli.png',bomi:'bomi.png'};
  Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{const img=new Image();images[key]=img;img.onload=resolve;img.onerror=reject;img.src=new URL(file,key==='seoli'||key==='bomi'?CATS:ASSETS).href;}))).then(()=>{
    if(disposed)return;loaded=true;start.disabled=false;restartButton.disabled=false;start.textContent='Enter the closet';raf=requestAnimationFrame(loop);
  }).catch(()=>{if(!disposed){heading.textContent='The room could not load';description.textContent='Please close this project and open it again to retry.';start.textContent='Unavailable';}});
  return ()=>{disposed=true;cancelAnimationFrame(raf);abort.abort();resize.disconnect();intersection.disconnect();resetInput();Object.values(images).forEach(img=>{img.onload=null;img.onerror=null;});root.replaceChildren();};
}
