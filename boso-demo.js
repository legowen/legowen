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
// The Vacuum King's attacks, adapted from Boso's pattern data (src/data/bossPatterns.js). Every attack is
// announced first (tele = warning seconds, never under 0.6 s). cd = cooldown, measured from the start of the attack.
const BOSS_HP = 340;
const PATTERNS = {
  suction: {name:'SUCTION!', hint:'Walk away from the king', weight:3, cd:5, tele:.8, dur:2.5},
  dust: {name:'DUST BALLS!', hint:'Step aside or jump the dust', weight:4, cd:1.8, tele:.7},
  sweep: {name:'FLOOR SWEEP!', hint:'Jump over him or climb a shelf', weight:3, cd:8, tele:1},
  flies: {name:'CALL FLIES!', hint:'Swat the flies', weight:2, cd:15, tele:.8},
  burst: {name:'BAG BURST!', hint:'Get out of the red zones', weight:3, cd:7, tele:1},
  full: {name:'FULL POWER SUCTION!', hint:'Walk away and do not touch him', weight:2, cd:12, tele:1, dur:3},
};
const PHASES = [
  {list:['suction','dust','sweep'], overlap:[], gap:1.3},
  {list:['suction','dust','sweep','flies'], overlap:['suction','dust'], gap:1.1, roar:'THE MOTOR ROARS LOUDER!'},
  {list:['suction','dust','sweep','flies','burst','full'], overlap:['suction','dust'], gap:.9, roar:'FULL POWER! THE DUST BAG IS BURSTING!', cdMult:.7, speedMult:1.3},
];
const keyActions = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'climb',KeyW:'climb',Space:'jump',KeyZ:'attack',KeyJ:'attack'};
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export function mountBoso(root) {
  root.innerHTML = `<section class="boso-demo" aria-label="Boso playable boss encounter">
    <div class="boso-toolbar"><div><strong>BOSO · VACUUM CLOSET</strong><span>One room. Two brave cats. One very loud king.</span></div><div class="boso-toolbar-actions"><button type="button" data-pause disabled>Pause</button><button type="button" data-restart disabled>Restart</button></div></div>
    <div class="boso-stage"><canvas width="1600" height="800" tabindex="0" aria-label="Boso game. Arrow keys or A and D to move, Space to jump, W or up to climb ropes, Z or J to attack, P to pause."></canvas>
      <div class="boso-overlay"><div class="boso-overlay-card"><h3 data-heading>Meet the Vacuum King</h3><p data-description>Climb the ropes, leap from the shelves, and land your claws. He changes his attacks as he gets angrier: watch for the red warnings.</p><div class="boso-characters"><button type="button" data-cat="seoli" aria-pressed="true">Seoli<small>Swift wind claws</small></button><button type="button" data-cat="bomi" aria-pressed="false">Bomi<small>Powerful paws · more HP</small></button></div><button type="button" class="boso-start" disabled>Loading room…</button></div></div>
    </div><p class="boso-help"><kbd>← → / A D</kbd> Move · <kbd>Space</kbd> Jump · <kbd>↑ / W</kbd> Climb ropes · <kbd>Z / J</kbd> Attack · <kbd>P</kbd> Pause. Hold attack for combos. Red areas warn you before every attack.</p>
    <div class="boso-touch" aria-label="Touch game controls"><div class="boso-touch-group"><button type="button" data-action="left" aria-label="Move left">◀</button><button type="button" data-action="right" aria-label="Move right">▶</button></div><div class="boso-touch-group"><button type="button" data-action="climb">Climb</button><button type="button" data-action="jump">Jump</button><button type="button" data-action="attack">Attack</button></div></div><p class="boso-live" role="status" aria-live="polite"></p></section>`;
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  const overlay = root.querySelector('.boso-overlay'), start = root.querySelector('.boso-start');
  const heading = root.querySelector('[data-heading]'), description = root.querySelector('[data-description]');
  const characterButtons = root.querySelector('.boso-characters'), pauseButton = root.querySelector('[data-pause]');
  const restartButton = root.querySelector('[data-restart]'), live = root.querySelector('.boso-live');
  const abort = new AbortController(), listen = (target,type,fn,options={}) => target.addEventListener(type,fn,{...options,signal:abort.signal});
  const images = {}, keyboard = new Set(), pointers = new Map(), taps = new Set();
  let disposed=false, loaded=false, selected='seoli', state='ready', previous=0, raf=0, clock=0, viewWidth=1600, camera=0;
  let player, boss, dust=[], flies=[], zones=[], effects=[], attack=null, combo=0, lastAttack=-10, nextAttack=0, shake=0;
  const held = action => taps.has(action) || [...keyboard].some(code=>keyActions[code]===action) || [...pointers.values()].includes(action);
  function resetInput(){keyboard.clear();pointers.clear();taps.clear();root.querySelectorAll('.is-held').forEach(el=>el.classList.remove('is-held'));}
  function reset(){
    const c=CHARACTERS[selected];clock=0;camera=0;dust=[];flies=[];zones=[];effects=[];attack=null;combo=0;lastAttack=-10;nextAttack=0;shake=0;
    player={x:140,y:740,vx:0,vy:0,hp:c.hp,maxHp:c.hp,ground:true,climbing:false,dir:1,invincible:0};
    boss={x:1100,y:430,hp:BOSS_HP,maxHp:BOSS_HP,dir:-1,flash:0,low:0,lowTarget:0,phase:0,next:1.6,cds:{},active:[],roarUntil:0,banner:null,hint:'Watch for the red warnings',shakeUntil:0};
    resetInput();
  }
  function setState(next){
    state=next;overlay.hidden=next==='playing';characterButtons.hidden=next==='paused';
    pauseButton.disabled=!loaded||!['playing','paused'].includes(next);restartButton.disabled=!loaded;
    pauseButton.textContent=next==='paused'?'Resume':'Pause';
    if(next==='paused'){heading.textContent='Take a breath';description.textContent='The room is paused. Jump back in when you are ready.';start.textContent='Resume';}
    else if(next==='won'){heading.textContent='The closet is quiet!';description.textContent=`${CHARACTERS[selected].name} defeated the Vacuum King. A brave little cat, a very big victory.`;start.textContent='Play again';live.textContent='Victory! Vacuum King defeated.';}
    else if(next==='lost'){heading.textContent='Nine lives. Another try.';description.textContent='Read the red warnings: jump the floor sweep, leave the burst zones and walk away from the suction.';start.textContent='Try again';live.textContent='Your cat is out of health. Try again.';}
    resetInput();
  }
  function play(){if(!loaded)return;if(state!=='paused')reset();setState('playing');canvas.focus({preventScroll:true});previous=performance.now();}
  function pause(){if(state==='playing')setState('paused');}
  function hurt(amount,direction){
    if(player.invincible>0||state!=='playing')return;
    player.hp=Math.max(0,player.hp-amount);player.invincible=1;player.x=clamp(player.x+direction*28,25,1575);
    effects.push({x:player.x,y:player.y-100,text:`−${amount}`,life:.8,color:'#ff9c95'});
    if(player.hp<=0)setState('lost');
  }
  function attackBoss(amount){
    if(clock<boss.roarUntil){effects.push({x:boss.x,y:boss.y-100,text:'GUARD!',life:.6,color:'#a9d8ff'});return;}
    boss.hp=Math.max(0,boss.hp-amount);boss.flash=.12;
    effects.push({x:boss.x,y:boss.y-100,text:String(amount),life:.75,color:'#fff1a1'});
    if(boss.hp<=0){dust=[];flies=[];zones=[];boss.active=[];setState('won');}
  }
  /* ---- the Vacuum King's pattern brain (after legowen/boso src/data/bossPatterns.js) ---- */
  function phaseIndex(){const f=boss.hp/boss.maxHp;return f<.25?2:f<.5?1:0;}
  function say(text,hint,roar=false){boss.banner={text,until:clock+1.4,roar};if(hint)boss.hint=hint;live.textContent=text;}
  function running(id){return boss.active.find(a=>a.id===id);}
  function startPattern(id){
    const def=PATTERNS[id],phase=PHASES[boss.phase],a={id,t0:clock,tele:clock+def.tele,fired:false};
    boss.cds[id]=clock+def.cd*(phase.cdMult||1);boss.active.push(a);say(def.name,def.hint);
    if(id==='sweep'){a.dir=Math.sign(player.x-boss.x)||boss.dir;boss.lowTarget=1;}
    if(id==='full'){boss.lowTarget=1;}
    if(id==='burst'){const xs=[];for(let tries=0;xs.length<3&&tries<40;tries++){const x=clamp(player.x+(Math.random()*2-1)*450,80,1520);if(xs.every(v=>Math.abs(v-x)>=230))xs.push(x);}if(!xs.some(x=>Math.abs(x-player.x)<70))xs[0]=clamp(player.x,80,1520);zones=xs.map(x=>({x,a}));}
  }
  function pickPattern(){
    const phase=PHASES[boss.phase],busy=boss.active.filter(a=>!phase.overlap.includes(a.id)).length>0;
    if(busy)return;
    const others=boss.active.map(a=>a.id);
    const choices=phase.list.filter(id=>clock>=(boss.cds[id]||0)&&!others.includes(id)&&(others.length===0||phase.overlap.includes(id)));
    if(!choices.length)return;
    let r=Math.random()*choices.reduce((sum,id)=>sum+PATTERNS[id].weight,0);
    for(const id of choices){r-=PATTERNS[id].weight;if(r<=0){startPattern(id);break;}}
    boss.next=clock+phase.gap;
  }
  function endPattern(a){boss.active=boss.active.filter(x=>x!==a);if(a.id==='sweep'||a.id==='full')boss.lowTarget=0;if(a.id==='burst')zones=[];}
  function bossPatterns(dt){
    const idx=phaseIndex();
    if(idx>boss.phase){boss.phase=idx;boss.active=[];zones=[];boss.lowTarget=0;boss.roarUntil=clock+1.1;boss.shakeUntil=clock+1.1;boss.next=clock+1.6;say(PHASES[idx].roar,'He is angrier: attacks come faster',true);}
    const speed=PHASES[boss.phase].speedMult||1;
    boss.low+=(boss.lowTarget-boss.low)*Math.min(1,dt*5);
    const floorY=740-94, floatY=430+Math.sin(clock*1.43)*24;
    const sweeping=boss.active.find(a=>a.id==='sweep'&&clock>=a.tele);
    if(!sweeping&&!running('full')&&boss.lowTarget===0){boss.x+=boss.dir*40*speed*dt;if(boss.x<=800||boss.x>=1400)boss.dir*=-1;boss.x=clamp(boss.x,800,1400);}
    boss.y=floatY+(floorY-floatY)*boss.low;
    if(clock<boss.roarUntil)return;
    if(clock>=boss.next)pickPattern();
    for(const a of [...boss.active]){
      const def=PATTERNS[a.id],on=clock>=a.tele;
      if(a.id==='suction'||a.id==='full'){if(on&&clock>=a.tele+def.dur)endPattern(a);}
      else if(a.id==='dust'&&on){const dx=player.x-boss.x,dy=player.y-45-boss.y,base=Math.atan2(dy,dx);for(const off of [-16,0,16]){const ang=base+off*Math.PI/180;dust.push({x:boss.x,y:boss.y+20,vx:Math.cos(ang)*200,vy:Math.sin(ang)*200,age:0});}endPattern(a);}
      else if(a.id==='flies'&&on){const room=4-flies.length;for(let i=0;i<Math.min(2,room);i++)flies.push({x:boss.x+(i?60:-60),y:boss.y-40,vx:0,vy:0,retarget:0,age:0});endPattern(a);}
      else if(a.id==='sweep'&&on){
        if(boss.low>.92){boss.x+=a.dir*520*speed*dt;if(boss.x<=90||boss.x>=1510){boss.x=clamp(boss.x,90,1510);boss.dir=-a.dir;endPattern(a);}}
      }
      else if(a.id==='burst'&&on&&!a.fired){a.fired=true;a.until=clock+.35;shake=.25;for(const z of zones){for(let i=0;i<10;i++)effects.push({x:z.x+(Math.random()-.5)*120,y:690-Math.random()*90,text:'•',life:.5+Math.random()*.3,color:'#d9c7a8'});if(player.y>740-130&&Math.abs(player.x-z.x)<70)hurt(24,Math.sign(player.x-z.x)||1);}}
      else if(a.id==='burst'&&a.fired&&clock>=a.until)endPattern(a);
    }
  }
  function pullStrength(){
    for(const a of boss.active){if(clock<a.tele)continue;if(a.id==='suction')return 150;if(a.id==='full'&&boss.low>.9)return 180;}
    return 0;
  }
  function update(dt){
    clock+=dt;const c=CHARACTERS[selected];player.invincible=Math.max(0,player.invincible-dt);boss.flash=Math.max(0,boss.flash-dt);shake=Math.max(0,shake-dt);
    bossPatterns(dt);
    let move=(held('right')?1:0)-(held('left')?1:0);
    if(move)player.dir=move;
    const rope=ropes.find(r=>Math.abs(player.x-r.x)<38&&player.y>=r.top&&player.y<=r.bottom+35);
    player.climbing=!!(held('climb')&&rope);
    const pull=pullStrength();
    if(player.climbing){player.x=rope.x;player.vx=0;player.vy=-200;player.ground=false;}
    else {player.vx=move*c.speed+(pull?Math.sign(boss.x-player.x)*pull:0);player.vy+=900*dt;}
    if(taps.has('jump')&&(player.ground||player.climbing)){player.vy=-c.jump;player.ground=false;player.climbing=false;if(rope&&held('climb'))player.x+=player.dir*42;}
    const oldFeet=player.y;player.x=clamp(player.x+player.vx*dt,25,1575);player.y+=player.vy*dt;player.ground=false;
    if(player.climbing&&player.y<=rope.top){player.y=rope.top;player.vy=0;player.ground=true;}
    else if(player.vy>=0){for(const p of platforms){if(oldFeet<=p.y+2&&player.y>=p.y&&player.x+20>p.x&&player.x-20<p.x+p.w){player.y=p.y;player.vy=0;player.ground=true;break;}}}
    if(held('attack')&&clock>=nextAttack){combo=clock-lastAttack<.85?(combo+1)%3:0;lastAttack=clock;nextAttack=clock+c.cooldown;attack={age:0,dir:player.dir,hit:false,swatted:new Set()};}
    if(attack){attack.age+=dt;const reach=selected==='seoli'?28+clamp(attack.age/.21,0,1)*(c.reach-28):c.reach;
      const ax=player.x+attack.dir*reach,ay=player.y-50;
      if(!attack.hit&&Math.abs(ax-boss.x)<90&&Math.abs(ay-boss.y)<(boss.low>.5?70:95)){attack.hit=true;attackBoss(Math.round(c.damage*[1,1.15,1.5][combo]));}
      for(const f of flies)if(!f.dead&&Math.abs(ax-f.x)<58&&Math.abs(ay-f.y)<58){f.dead=true;effects.push({x:f.x,y:f.y-30,text:'SWAT!',life:.6,color:'#c9edb7'});}
      if(attack.age>.23)attack=null;
    }
    if(state!=='playing')return;
    for(const d of dust){d.age+=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(Math.abs(d.x-player.x)<34&&d.y>player.y-82&&d.y<player.y+8){hurt(15,Math.sign(player.x-d.x)||1);d.age=5;}}
    dust=dust.filter(d=>d.age<4&&d.x>-30&&d.x<1630&&d.y<810);
    for(const f of flies){
      f.age+=dt;f.retarget-=dt;
      if(f.retarget<=0){const dx=player.x-f.x,dy=player.y-60-f.y,len=Math.hypot(dx,dy)||1,sp=140+Math.random()*70,jit=(Math.random()-.5)*1.4;f.vx=(dx/len*Math.cos(jit)-dy/len*Math.sin(jit))*sp;f.vy=(dy/len*Math.cos(jit)+dx/len*Math.sin(jit))*sp;f.retarget=.28+Math.random()*.34;}
      f.x=clamp(f.x+f.vx*dt,20,1580);f.y=clamp(f.y+f.vy*dt,140,720);
      if(!f.dead&&Math.abs(f.x-player.x)<30&&f.y>player.y-80&&f.y<player.y+4)hurt(10,Math.sign(player.x-f.x)||1);
    }
    flies=flies.filter(f=>!f.dead);
    // touching the king: in the air he bumps, on the floor (sweep / full power) he hits harder
    if(boss.low>.6){if(Math.abs(player.x-boss.x)<72&&player.y>740-75)hurt(running('full')?30:22,Math.sign(player.x-boss.x)||-1);}
    else if(Math.abs(player.x-boss.x)<68&&Math.abs(player.y-45-boss.y)<90)hurt(25,Math.sign(player.x-boss.x)||-1);
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
    ctx.fillStyle='#11142666';ctx.fillRect(0,0,viewWidth,800);ctx.save();ctx.translate(-camera+(shake?(Math.random()-.5)*12:0),shake?(Math.random()-.5)*8:0);
    for(const r of ropes){ctx.strokeStyle='#5a3828';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(r.x,r.top);ctx.lineTo(r.x,r.bottom);ctx.stroke();ctx.strokeStyle='#d6b37c';ctx.lineWidth=5;ctx.stroke();for(let y=r.top+8;y<r.bottom;y+=18){ctx.fillStyle='#8e643f';ctx.fillRect(r.x-5,y,10,4);}}
    const terrain=images.terrain;
    for(const p of platforms){ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.clip();for(let x=p.x;x<p.x+p.w;x+=128)ctx.drawImage(terrain,x,p.y,128,64);ctx.restore();ctx.fillStyle='#ffedbc';ctx.fillRect(p.x,p.y,p.w,3);ctx.fillStyle='#111420';ctx.fillRect(p.x,p.y+p.h-3,p.w,3);}
    if(state==='playing'||state==='paused'){
      // warnings first, so the attack art sits on top of them
      for(const a of boss.active){
        const warn=clock<a.tele,k=warn?clamp((clock-a.t0)/(a.tele-a.t0),0,1):1;
        if(a.id==='sweep'&&warn){const dir=a.dir,x0=boss.x,x1=dir>0?1510:90;ctx.fillStyle=`rgba(255,70,70,${.12+.22*k})`;ctx.fillRect(Math.min(x0,x1),740-72,Math.abs(x1-x0),72);ctx.fillStyle=`rgba(255,120,120,${.5+.4*Math.sin(clock*20)})`;ctx.font='bold 26px system-ui';ctx.textAlign='center';ctx.fillText(dir>0?'→ → →':'← ← ←',(x0+x1)/2,740-26);}
        if(a.id==='dust'&&warn){ctx.strokeStyle=`rgba(255,110,110,${.25+.5*k})`;ctx.lineWidth=3;ctx.setLineDash([12,10]);const base=Math.atan2(player.y-45-boss.y,player.x-boss.x);for(const off of [-16,0,16]){const ang=base+off*Math.PI/180;ctx.beginPath();ctx.moveTo(boss.x,boss.y+20);ctx.lineTo(boss.x+Math.cos(ang)*420,boss.y+20+Math.sin(ang)*420);ctx.stroke();}ctx.setLineDash([]);}
        if(a.id==='full'&&warn){ctx.strokeStyle=`rgba(255,80,80,${.3+.5*k})`;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(boss.x,738,120+40*Math.sin(clock*10),22,0,0,Math.PI*2);ctx.stroke();}
        if(a.id==='flies'&&warn){ctx.fillStyle=`rgba(201,237,183,${.4+.4*Math.sin(clock*18)})`;ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.fillText('bzz bzz',boss.x,boss.y-110);}
      }
      for(const z of zones){const a=z.a,k=clamp((clock-a.t0)/(a.tele-a.t0),0,1);ctx.fillStyle=a.fired?'rgba(255,214,160,.55)':`rgba(255,60,60,${.12+.38*k})`;ctx.fillRect(z.x-70,740-130,140,130);ctx.strokeStyle=`rgba(255,120,120,${.5+.5*k})`;ctx.lineWidth=3;ctx.strokeRect(z.x-70,740-130,140,130);}
      const pull=pullStrength(),warmup=boss.active.some(a=>(a.id==='suction'||a.id==='full')&&clock<a.tele);
      if(pull||warmup){ctx.strokeStyle=pull>150?'#ffb0b0cc':warmup?'#afe8ee55':'#afe8ee99';ctx.lineWidth=pull>150?4:3;
        for(let i=0;i<(pull>150?24:15);i++){const ang=i*2.4,dist=80+((i*29-clock*(pull>150?380:280))%320+320)%320;const x=boss.x+Math.cos(ang)*dist,y=boss.y+Math.sin(ang)*dist*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ang)*28,y-Math.sin(ang)*14);ctx.stroke();}}
    }
    if(state!=='won'){
      const shaking=clock<boss.shakeUntil||boss.active.some(a=>(a.id==='sweep'||a.id==='full')&&clock<a.tele);
      const jx=shaking?(Math.random()-.5)*8:0,squash=1-.55*boss.low;
      if(clock<boss.roarUntil){ctx.save();ctx.globalAlpha=.35+.25*Math.sin(clock*30);ctx.fillStyle='#ff6f6f';ctx.beginPath();ctx.ellipse(boss.x,boss.y,110,110*squash,0,0,Math.PI*2);ctx.fill();ctx.restore();}
      if(boss.flash)ctx.globalAlpha=.55;
      ctx.save();ctx.translate(boss.x+jx,boss.y+94*(1-squash));if(boss.dir>0)ctx.scale(-1,1);ctx.drawImage(images.boss,-75,-94*squash,150,188*squash);ctx.restore();ctx.globalAlpha=1;
    }
    for(const f of flies){ctx.save();ctx.translate(f.x,f.y+Math.sin(f.age*30)*3);if(f.vx<0)ctx.scale(-1,1);ctx.drawImage(images.fly,-24,-22,48,44);ctx.restore();}
    for(const d of dust){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.age*5);ctx.drawImage(images.dust,-16,-16,32,32);ctx.restore();}
    let frame=0;if(player.invincible>.75)frame=14;else if(attack)frame=9+combo;else if(player.climbing)frame=12+Math.floor(clock*6)%2;else if(!player.ground)frame=player.vy<0?6:7;else if(Math.abs(player.vx)>15)frame=2+Math.floor(clock*11)%4;else if(Math.floor(clock*3)%4===3)frame=1;
    ctx.save();ctx.translate(player.x,player.y);if(player.dir<0)ctx.scale(-1,1);if(player.invincible>0&&Math.floor(clock*12)%2===0)ctx.globalAlpha=.45;
    ctx.drawImage(images[selected],(frame%4)*96,Math.floor(frame/4)*96,96,96,-54,-99,108,108);ctx.restore();
    if(attack){const c=CHARACTERS[selected],reach=selected==='seoli'?28+attack.age/.21*(c.reach-28):c.reach;ctx.globalAlpha=1-attack.age*2;sprite(images[c.effect],player.x+attack.dir*reach,player.y-50,88,64,attack.dir<0);ctx.globalAlpha=1;}
    ctx.font='bold 28px system-ui';ctx.textAlign='center';for(const f of effects){ctx.globalAlpha=clamp(f.life*2,0,1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;ctx.restore();
    ctx.fillStyle='#141524e8';ctx.fillRect(0,0,viewWidth,100);ctx.font='bold 23px system-ui';ctx.textAlign='left';ctx.fillStyle='#f8e9c8';ctx.fillText(`${CHARACTERS[selected].name.toUpperCase()}  ${player.hp} / ${player.maxHp}`,28,37);bar(28,52,250,player.hp/player.maxHp,'#7ad8b3');
    const bw=Math.min(480,viewWidth*.4),bx=viewWidth-bw-28;ctx.fillStyle='#ffdaa0';ctx.fillText('VACUUM KING',bx,37);bar(bx,52,bw,boss.hp/boss.maxHp,'#d99071');ctx.fillStyle='#f8e9c8';for(const t of [.5,.25])ctx.fillRect(bx+bw*t-1,48,2,22);ctx.font='18px system-ui';ctx.fillStyle='#d8d5dd';ctx.fillText(`PHASE ${boss.phase+1} · ${boss.hint}`,bx,88);
    if(boss.banner&&clock<boss.banner.until&&state==='playing'){const k=clamp((boss.banner.until-clock)/1.4,0,1);ctx.globalAlpha=clamp(k*3,0,1);ctx.textAlign='center';ctx.font='bold 40px system-ui';ctx.lineWidth=6;ctx.strokeStyle='#141524';ctx.strokeText(boss.banner.text,viewWidth/2,160);ctx.fillStyle=boss.banner.roar?'#ffb3a8':'#ffe3a3';ctx.fillText(boss.banner.text,viewWidth/2,160);ctx.globalAlpha=1;}
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
  // read-only peek for the site's automated checks
  canvas.__bosoDebug=()=>({boss,player,state,flies:flies.length,zones:zones.length,dust:dust.length,setBossHp:v=>{boss.hp=v;}});
  reset();
  const files={background:'bg_cellar.png',terrain:'tile_cellar.png',boss:'boss_vacuum_king.png',dust:'proj_dust.png',fly:'monster_pari.png',wind:'fx_wind.png',paw:'fx_paw.png',seoli:'seoli.png',bomi:'bomi.png'};
  Promise.all(Object.entries(files).map(([key,file])=>new Promise((resolve,reject)=>{const img=new Image();images[key]=img;img.onload=resolve;img.onerror=reject;img.src=new URL(file,key==='seoli'||key==='bomi'?CATS:ASSETS).href;}))).then(()=>{
    if(disposed)return;loaded=true;start.disabled=false;restartButton.disabled=false;start.textContent='Enter the closet';raf=requestAnimationFrame(loop);
  }).catch(()=>{if(!disposed){heading.textContent='The room could not load';description.textContent='Please close this project and open it again to retry.';start.textContent='Unavailable';}});
  return ()=>{disposed=true;cancelAnimationFrame(raf);abort.abort();resize.disconnect();intersection.disconnect();resetInput();Object.values(images).forEach(img=>{img.onload=null;img.onerror=null;});root.replaceChildren();};
}
