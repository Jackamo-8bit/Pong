// ═══════════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════════
function spawnParticles(x,y,dir,count){
  if(prefersReducedMotion)return;
  count=count||(SKINS[currentSkin].chaos?18+activePowerups.length*4:10);
  for(let i=0;i<count;i++){
    const spread=SKINS[currentSkin].chaos?Math.PI:Math.PI*.8;
    const angle=Math.random()*spread-spread/2,spd=Math.random()*(SKINS[currentSkin].chaos?4:2.5)+.8;
    particles.push({x,y,vx:Math.cos(angle)*spd*dir,vy:Math.sin(angle)*spd,life:1,decay:Math.random()*.05+.03,size:Math.random()*3+1,hue:Math.random()*360});
  }
}
function spawnPuParticles(x,y){
  if(prefersReducedMotion)return;
  for(let i=0;i<20;i++){
    const angle=(Math.PI*2/20)*i,spd=Math.random()*3+1;
    particles.push({x,y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,life:1,decay:Math.random()*.03+.02,size:Math.random()*4+2,hue:Math.random()*360,isPu:true});
  }
}
function updateParticles(dt){
  dt=dt||1;
  // Hard cap to prevent memory growth in long sessions
  if(particles.length>500)particles.splice(0,particles.length-500);
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.vy+=(p.isDebris?.12:.05)*dt; // debris falls faster
    if(p.isDebris&&p.rot!=null)p.rot+=p.rotSpd*dt;
    p.life-=p.decay*dt;
    if(p.life<=0)particles.splice(i,1);
  }
}
function drawParticles(){
  const sk=SKINS[currentSkin];
  for(const p of particles){
    ctx.globalAlpha=p.life*.75;
    ctx.fillStyle=p.brickColor?p.brickColor:(sk.chaos||p.isPu)?`hsl(${p.hue},100%,60%)`:sk.particleColor(p.life);
    ctx.beginPath();
    if(p.isDebris){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot||0);const s=p.life;ctx.fillRect(-p.w*s/2,-p.h*s/2,p.w*s,p.h*s);ctx.restore();}
    else if(sk.chaos&&!p.isPu&&!p.brickColor){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*5);ctx.fillRect(-p.size*p.life,-p.size*p.life,p.size*p.life*2,p.size*p.life*2);ctx.restore();}
    else{ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=1;
}

// ═══════════════════════════════════════════════════════════════════
// POWER-UP HELPERS
// ═══════════════════════════════════════════════════════════════════
function spawnFieldPowerup(now){
  const type=PU_KEYS[Math.floor(Math.random()*PU_KEYS.length)];
  const margin=80;
  fieldPowerups.push({type,x:margin+Math.random()*(W-margin*2),y:80+Math.random()*(H-160),spawnTime:now,bobOffset:Math.random()*Math.PI*2});
  // In chaos mode, schedule next spawn quickly while allowing multiple on field
  if(gameMode==='chaos'){nextPuSpawn=now+CHAOS_SPAWN_INTERVAL;}
}
// Draw paddle-shaped icon on canvas at (cx,cy) with given height
function drawPaddleIcon(cx,cy,h,color){
  const w=h*.25;const r=w/2;
  ctx.save();ctx.fillStyle=color;
  ctx.beginPath();ctx.roundRect(cx-w/2,cy-h/2,w,h,r);ctx.fill();ctx.restore();
}
// Create SVG paddle icon as HTML string for popup
function paddleIconSVG(tall,color){
  const h=tall?32:16,w=tall?8:8,r=4;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin:auto"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="${color}"/></svg>`;
}
function pixelPuRects(type){
  const alias={survslowmo:'slowmo',magnetpaddle:'magnet',multiball:'decoy'};
  type=alias[type]||type;
  const shapes={
    decoy:[[3,5,4,4],[9,3,4,4],[8,10,4,4]],
    bouncy:[[5,4,6,6],[11,2,2,2],[3,11,2,2],[11,12,2,2]],
    lead:[[4,5,8,7],[3,13,10,2],[6,3,4,2]],
    curve:[[7,2,5,2],[11,4,2,4],[8,8,4,2],[5,6,2,5],[4,11,7,2],[3,3,2,2]],
    bigball:[[4,4,8,8],[3,5,10,6],[5,3,6,10]],
    smallball:[[7,7,3,3]],
    widepaddle:[[3,3,10,2],[3,5,10,8],[3,13,10,2]],
    shortpaddle:[[6,5,4,6],[5,11,6,2]],
    blackhole:[[3,6,10,4],[5,4,6,8],[7,7,2,2]],
    slowmo:[[4,3,8,2],[5,6,6,2],[7,8,2,2],[5,11,6,2],[4,14,8,2]],
    defender:[[7,2,3,3],[5,6,7,5],[3,9,2,4],[12,9,2,4]],
    shield:[[4,2,8,2],[3,4,10,5],[5,9,6,3],[7,12,2,2]],
    magnet:[[3,3,3,10],[10,3,3,10],[5,11,6,3],[5,3,2,2],[9,3,2,2]],
    curvedpaddle:[[4,3,4,2],[7,5,3,2],[9,7,2,5],[7,12,3,2],[4,14,4,1]],
    ghost:[[5,3,6,2],[3,5,10,7],[3,12,2,2],[7,12,2,2],[11,12,2,2]],
    invert:[[3,5,7,2],[10,3,3,4],[6,11,7,2],[3,10,3,4]],
    laser:[[7,1,2,10],[4,7,8,2],[9,11,2,4]],
    freeze:[[7,2,2,12],[2,7,12,2],[4,4,2,2],[10,4,2,2],[4,10,2,2],[10,10,2,2]],
    bomb:[[5,6,7,6],[4,8,9,3],[7,4,4,2],[11,3,3,2]],
    fireball:[[7,2,3,5],[5,6,6,4],[4,9,8,4],[6,13,5,2]],
    shrinkrow:[[2,5,12,2],[4,9,8,2],[6,13,4,2]],
  };
  return shapes[type]||[[5,3,6,2],[3,5,10,8],[5,13,6,1]];
}
function drawPixelPuIcon(type,cx,cy,size,color){
  const alias={survslowmo:'slowmo',magnetpaddle:'magnet',multiball:'decoy',portal:'curve'};
  const iconType=alias[type]||type;
  const unit=size/16,rects=pixelPuRects(type),sk=SKINS[currentSkin];
  ctx.save();
  try{
    ctx.translate(cx-size/2,cy-size/2);
    ctx.fillStyle=color;
    rects.forEach(([x,y,w,h])=>ctx.fillRect(Math.round(x*unit),Math.round(y*unit),Math.ceil(w*unit),Math.ceil(h*unit)));
    if(iconType==='ghost'||iconType==='defender'||iconType==='blackhole'){
      ctx.fillStyle=sk.modern?sk.bg:'rgba(0,0,0,.85)';
      [[6,7,2,2],[10,7,2,2]].forEach(([x,y,w,h])=>ctx.fillRect(Math.round(x*unit),Math.round(y*unit),Math.ceil(w*unit),Math.ceil(h*unit)));
    }
  }finally{
    ctx.restore();
  }
}
function safeDrawPixelPuIcon(type,cx,cy,size,color){
  try{drawPixelPuIcon(type,cx,cy,size,color);}
  catch(e){
    ctx.save();
    ctx.fillStyle=color;
    ctx.fillRect(cx-size*.28,cy-size*.28,size*.56,size*.56);
    const sk=SKINS[currentSkin]||{};
    ctx.fillStyle=sk.bg||'#000';
    ctx.font=`bold ${Math.max(8,Math.floor(size*.42))}px monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(type||'?').charAt(0).toUpperCase(),cx,cy+1);
    ctx.restore();
  }
}
function pixelPuSVG(type,color,size){
  return powerupIconHTML(type,color,size);
}
function powerupIconHTML(type,color,size){
  const alias={survslowmo:'slowmo',magnetpaddle:'magnet',multiball:'decoy',portal:'curve'};
  const iconType=alias[type]||type;
  const rects=pixelPuRects(type).map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('');
  const cutouts=(iconType==='ghost'||iconType==='defender'||iconType==='blackhole')
    ? '<rect x="6" y="7" width="2" height="2"/><rect x="10" y="7" width="2" height="2"/>'
    : '';
  return `<svg class="pu-pixel-svg" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true"><g fill="${color}">${rects}</g><g fill="#121420">${cutouts}</g></svg>`;
}
function showPuPopup(side,type){
  const pu=POWER_UPS[type],sk=SKINS[currentSkin];
  const popup=document.getElementById('pu-popup'),inner=document.getElementById('pu-popup-inner');
  const iconEl=document.getElementById('pu-icon-big');
  iconEl.innerHTML=powerupIconHTML(type,pu.color,34);
  iconEl.style.fontSize='0';
  document.getElementById('pu-who').textContent=playerName(side).toUpperCase();
  document.getElementById('pu-name').textContent=pu.name;document.getElementById('pu-name').style.color=pu.color;
  document.getElementById('pu-desc').textContent=pu.desc;
  inner.style.background=sk.puBg;inner.style.borderColor=pu.color;inner.style.color=sk.puText;
  popup.classList.add('show');
  if(puPopupTimeout)clearTimeout(puPopupTimeout);
  const popupMs=SKINS[currentSkin].chaos?3500:2200;
  puPopupTimeout=setTimeout(()=>popup.classList.remove('show'),popupMs);
}
function activatePowerup(type,side,now){
  if(hasAPU('decoy'))decoyBalls=[];
  // In chaos mode, stack power-ups; in normal mode, clear old one first
  if(gameMode!=='chaos'&&activePowerups.length)clearAllPowerups();
  // In chaos mode, cap active power-ups to 3 — remove oldest if over limit
  if(gameMode==='chaos'&&activePowerups.length>=3){
    clearSinglePU(activePowerups[0]);activePowerups.shift();
  }
  // Remove duplicate type if re-activating same power-up
  activePowerups=activePowerups.filter(p=>p.type!==type);
  // Black hole is instant — no duration-based active state
  if(type==='blackhole'){
    showPuPopup(side,type);(PU_SOUNDS[type]||SOUNDS[currentSkin].powerup)();
    spawnPuParticles(W/2,H/2);
    const margin=100;
    state.ball.x=margin+Math.random()*(W-margin*2);
    state.ball.y=60+Math.random()*(H-120);
    const spd=Math.sqrt(state.ball.vx**2+state.ball.vy**2)||BASE_SPEED;
    const ang=(Math.random()>.5?1:-1)*(Math.random()*.6+.2);
    state.ball.vx=Math.cos(ang)*spd*(Math.random()>.5?1:-1);
    state.ball.vy=Math.sin(ang)*spd;
    shakeAmt=6;
    return;
  }
  const ap={type,side,startTime:now,endTime:now+POWER_UPS[type].duration};
  activePowerups.push(ap);
  if(type==='lead')leadPreSpeed=Math.sqrt(state.ball.vx**2+state.ball.vy**2);
  if(type==='decoy'){for(let i=0;i<3;i++)decoyBalls.push({x:state.ball.x,y:state.ball.y,vx:(Math.random()>.5?1:-1)*(3+Math.random()*3),vy:(Math.random()*4+1)*(Math.random()>.5?1:-1)});}
  if(type==='shield')shieldSide=side;
  if(type==='defender'){
    const dx=side==='left'?60:W-60-PW;
    defenderPaddle={side,y:H/2-25,x:dx,h:50};
  }
  if(type==='portal'){
    const mx=120;
    portalA={x:mx+Math.random()*(W/2-mx-40),y:60+Math.random()*(H-120)};
    portalB={x:W/2+40+Math.random()*(W/2-mx-40),y:60+Math.random()*(H-120)};
  }
  showPuPopup(side,type);(PU_SOUNDS[type]||SOUNDS[currentSkin].powerup)();
  spawnPuParticles(W/2,H/2);
}
function clearSinglePU(ap){
  if(ap.type==='decoy')decoyBalls=[];
  if(ap.type==='lead'&&leadPreSpeed!==null){
    const cur=Math.sqrt(state.ball.vx**2+state.ball.vy**2);
    if(cur>0){const sc=leadPreSpeed/cur;state.ball.vx*=sc;state.ball.vy*=sc;}
    leadPreSpeed=null;
  }
  if(ap.type==='shield')shieldSide=null;
  if(ap.type==='defender')defenderPaddle=null;
  if(ap.type==='portal'){portalA=null;portalB=null;}
}
function clearAllPowerups(){
  for(const ap of activePowerups)clearSinglePU(ap);
  activePowerups=[];
}
function checkFieldPuCollect(side,now){
  if(!fieldPowerups.length)return;
  const paddle=state[side],ph=getPH(side),LP=24,RP=W-24-PW;
  const padX=side==='left'?LP+PW:RP;
  for(let i=fieldPowerups.length-1;i>=0;i--){
    const fp=fieldPowerups[i];
    const dx=padX-fp.x,dy=(paddle.y+ph/2)-fp.y;
    if(Math.sqrt(dx*dx+dy*dy)<30){
      spawnPuParticles(fp.x,fp.y);
      activatePowerup(fp.type,side,now);
      fieldPowerups.splice(i,1);
      if(gameMode!=='chaos')nextPuSpawn=now+POWERUP_SPAWN_INTERVAL;
    }
  }
}

// Brick mode state
let bricks=[];

function buildBricks(){
  bricks=[];
  const sk=SKINS[currentSkin];
  const bw=42,bh=16;
  // Central indestructible core
  bricks.push({x:0,y:0,w:20,h:20,alive:true,color:'#666',btype:'indestructible',hp:Infinity,maxHp:Infinity,ring:-1,angle:0,radius:0,isCore:true});
  // Randomize 1 or 2 rings
  brickRings=Math.random()<0.5?1:2;
  function addBrick(i,count,ring,radius,w){
    const angle=(i/count)*Math.PI*2;
    const roll=Math.random();
    let btype='normal',hp=1,color=sk.brickColors[i%sk.brickColors.length];
    if(roll<.12){btype='indestructible';color='#666';hp=Infinity;}
    else if(roll<.30){btype='cracking';color='#8b2252';hp=3;}
    else if(roll<.55){btype='powerup';color='#daa520';}
    bricks.push({x:0,y:0,w,h:bh,alive:true,color,btype,hp,maxHp:hp,ring,angle,radius,isCore:false});
  }
  if(brickRings===1){
    for(let i=0;i<10;i++)addBrick(i,10,0,80,bw);
  }else{
    for(let i=0;i<6;i++)addBrick(i,6,0,55,Math.floor(bw*.8));
    for(let i=0;i<10;i++)addBrick(i,10,1,100,bw);
  }
  brickMovePhase=0;
}

function getBrickWorldPos(b){
  const cx=W/2,cy=H/2;
  if(b.isCore)return{x:cx-b.w/2,y:cy-b.h/2,rot:0};
  const dir=b.ring===0?1:-1;
  const a=b.angle+brickMovePhase*dir;
  return{x:cx+Math.cos(a)*b.radius-b.w/2,y:cy+Math.sin(a)*b.radius-b.h/2,rot:a};
}
function checkBrickCollision(ball,bs){
  const bcx=ball.x+bs/2,bcy=ball.y+bs/2,br=bs/2;
  for(const b of bricks){
    if(!b.alive)continue;
    const wp=getBrickWorldPos(b);
    const bCX=wp.x+b.w/2,bCY=wp.y+b.h/2;
    // Quick distance check
    const maxD=Math.max(b.w,b.h)/2+br+5;
    const ddx=bcx-bCX,ddy=bcy-bCY;
    if(ddx*ddx+ddy*ddy>maxD*maxD)continue;
    // Transform ball into brick local space (rotated)
    const rot=b.isCore?0:wp.rot;
    const cs=Math.cos(-rot),sn=Math.sin(-rot);
    const lx=cs*ddx-sn*ddy,ly=sn*ddx+cs*ddy;
    // Closest point on AABB in local space
    const hw=b.w/2,hh=b.h/2;
    const cpx=Math.max(-hw,Math.min(hw,lx)),cpy=Math.max(-hh,Math.min(hh,ly));
    const dx=lx-cpx,dy=ly-cpy;
    if(dx*dx+dy*dy>br*br)continue;
    // Hit — determine bounce normal in local space
    let nx,ny;
    if(Math.abs(lx)/hw>Math.abs(ly)/hh){nx=lx>0?1:-1;ny=0;}
    else{nx=0;ny=ly>0?1:-1;}
    // Rotate normal to world space and reflect velocity
    const wnx=Math.cos(rot)*nx-Math.sin(rot)*ny;
    const wny=Math.sin(rot)*nx+Math.cos(rot)*ny;
    const dot=ball.vx*wnx+ball.vy*wny;
    ball.vx-=2*dot*wnx;ball.vy-=2*dot*wny;
    if(b.btype==='indestructible'){
      SOUNDS[currentSkin].wall();shakeAmt=2;return true;
    }
    b.hp--;
    if(b.hp<=0){
      b.alive=false;
      spawnBrickParticles(bCX,bCY,b.color);
      if(b.btype==='powerup'){
        const puKeys=gameMode==='bricks'?BRICKS_PU_KEYS:PU_KEYS;
        const type=puKeys[Math.floor(Math.random()*puKeys.length)];
        fieldPowerups.push({type,x:bCX,y:bCY,spawnTime:performance.now(),bobOffset:Math.random()*Math.PI*2});
      }
      if(lastBrickToucher)brickPoints[lastBrickToucher]++;
    }else if(b.btype==='cracking'){
      b.x=wp.x;b.y=wp.y;spawnBrickChips(b);
    }
    SOUNDS[currentSkin].brick();shakeAmt=3;
    return true;
  }
  return false;
}

function spawnBrickParticles(x,y,color){
  // Burst of round particles
  for(let i=0;i<6;i++){
    const angle=Math.random()*Math.PI*2,spd=Math.random()*3+1;
    particles.push({x,y,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,life:1,decay:Math.random()*.06+.04,size:Math.random()*3+1,hue:0,brickColor:color});
  }
  // Rectangular debris chunks that fall with gravity
  for(let i=0;i<5;i++){
    const angle=Math.random()*Math.PI*2,spd=Math.random()*2+.5;
    particles.push({x:x+(Math.random()-.5)*10,y:y+(Math.random()-.5)*6,vx:Math.cos(angle)*spd,vy:-Math.random()*2-1,life:1,decay:Math.random()*.03+.02,size:Math.random()*3+2,brickColor:color,isDebris:true,rot:Math.random()*Math.PI*2,rotSpd:(Math.random()-.5)*.3,w:Math.random()*5+3,h:Math.random()*3+2});
  }
}
// Small chip particles when a durable brick takes a hit but doesn't break
function spawnBrickChips(b){
  const cx=b.x+b.w/2,cy=b.y+b.h/2;
  const sk=SKINS[currentSkin];
  const col=b.color;
  // Small dust puff
  for(let i=0;i<4;i++){
    const angle=Math.random()*Math.PI*2,spd=Math.random()*1.5+.5;
    particles.push({x:cx+(Math.random()-.5)*b.w*.6,y:cy+(Math.random()-.5)*b.h,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,life:1,decay:.07+Math.random()*.04,size:Math.random()*2+1,brickColor:'rgba(200,200,200,.5)'});
  }
  // A few falling chips in brick color
  for(let i=0;i<3;i++){
    particles.push({x:cx+(Math.random()-.5)*b.w*.5,y:cy+(Math.random()-.5)*b.h,vx:(Math.random()-.5)*2,vy:-Math.random()*1.5-.5,life:1,decay:.025+Math.random()*.02,size:Math.random()*2+1,brickColor:col,isDebris:true,rot:Math.random()*Math.PI*2,rotSpd:(Math.random()-.5)*.4,w:Math.random()*4+2,h:Math.random()*2+1});
  }
}
// Generate random crack paths for a brick (stored on brick, consistent across frames)
function ensureCracks(b){
  if(b._cracks)return;
  b._cracks=[];
  // Generate 3 sets of cracks (one revealed per hp lost)
  for(let lvl=0;lvl<3;lvl++){
    const paths=[];
    const numCracks=1+Math.floor(Math.random()*2);
    for(let n=0;n<numCracks;n++){
      const pts=[];
      // Start from a random edge or near-center point
      let sx=Math.random()*b.w,sy=Math.random()*b.h;
      pts.push({x:sx,y:sy});
      const segs=2+Math.floor(Math.random()*3);
      for(let s=0;s<segs;s++){
        sx+=((Math.random()-.5)*b.w*.4);
        sy+=((Math.random()-.5)*b.h*.6);
        sx=Math.max(0,Math.min(b.w,sx));
        sy=Math.max(0,Math.min(b.h,sy));
        pts.push({x:sx,y:sy});
      }
      paths.push(pts);
    }
    b._cracks.push(paths);
  }
}
function drawBrickCracks(b,rounded,rad,ox,oy){
  // ox,oy override brick position for drawing (used by orbiting bricks)
  const dx=ox!==undefined?ox:b.x, dy=oy!==undefined?oy:b.y;
  ensureCracks(b);
  const damage=b.maxHp-b.hp;
  if(damage<=0)return;
  ctx.save();
  ctx.beginPath();
  if(rounded)ctx.roundRect(dx,dy,b.w,b.h,rad);
  else ctx.rect(dx,dy,b.w,b.h);
  ctx.clip();
  for(let d=0;d<damage&&d<b._cracks.length;d++){
    const alpha=.35+d*.2;
    const width=.8+d*.4;
    ctx.strokeStyle=`rgba(0,0,0,${alpha+.1})`;ctx.lineWidth=width+.8;
    for(const path of b._cracks[d]){
      ctx.beginPath();
      ctx.moveTo(dx+path[0].x,dy+path[0].y);
      for(let i=1;i<path.length;i++)ctx.lineTo(dx+path[i].x,dy+path[i].y);
      ctx.stroke();
    }
    ctx.strokeStyle=`rgba(255,255,255,${alpha*.6})`;ctx.lineWidth=width;
    for(const path of b._cracks[d]){
      ctx.beginPath();
      ctx.moveTo(dx+path[0].x+.5,dy+path[0].y+.5);
      for(let i=1;i<path.length;i++)ctx.lineTo(dx+path[i].x+.5,dy+path[i].y+.5);
      ctx.stroke();
    }
  }
  // Darkening overlay as brick gets more damaged
  if(damage>=2){
    ctx.fillStyle=`rgba(0,0,0,${.08*damage})`;
    ctx.fillRect(dx,dy,b.w,b.h);
  }
  ctx.restore();
}

function drawBricks(){
  const sk=SKINS[currentSkin];
  const rounded=currentSkin!=='retro';
  const rad=rounded?3:0;
  const cx=W/2,cy=H/2;
  const now=performance.now();
  const pulse=.5+.5*Math.sin(now/400);

  // Draw faint orbit ring paths (behind bricks)
  ctx.save();
  const radii=new Set();
  for(const b of bricks){if(!b.isCore&&b.alive)radii.add(b.radius);}
  radii.forEach(r=>{
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle=sk.accent;ctx.lineWidth=.5;ctx.globalAlpha=.08+.04*pulse;
    ctx.setLineDash([4,8]);ctx.stroke();ctx.setLineDash([]);
  });
  ctx.restore();

  for(const b of bricks){
    if(!b.alive)continue;
    const wp=getBrickWorldPos(b);
    ctx.save();
    if(b.isCore){
      // Pulsing accent glow rings
      const coreR=10;
      ctx.save();
      ctx.globalAlpha=.06+.06*pulse;
      ctx.fillStyle=sk.accent;
      ctx.beginPath();ctx.arc(cx,cy,coreR+12+pulse*6,0,Math.PI*2);ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha=.12+.08*pulse;
      ctx.fillStyle=sk.accent;
      ctx.beginPath();ctx.arc(cx,cy,coreR+5+pulse*3,0,Math.PI*2);ctx.fill();
      ctx.restore();
      // Core body
      ctx.shadowColor=sk.accent;ctx.shadowBlur=14+6*pulse;
      ctx.fillStyle=b.color;
      ctx.beginPath();ctx.arc(cx,cy,coreR,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      // Cross-hatch inside core
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,coreR,0,Math.PI*2);ctx.clip();
      ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;
      for(let i=-coreR*2;i<coreR*2;i+=4){
        ctx.beginPath();ctx.moveTo(cx+i,cy-coreR);ctx.lineTo(cx+i+coreR*2,cy+coreR);ctx.stroke();
      }
      ctx.restore();
      // Bright accent ring around core
      ctx.strokeStyle=sk.accent;ctx.lineWidth=1.5;ctx.globalAlpha=.5+.3*pulse;
      ctx.beginPath();ctx.arc(cx,cy,coreR+1,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
      ctx.restore();
      continue;
    }
    // Translate to brick center and rotate tangent to orbit
    const bx=wp.x+b.w/2,by=wp.y+b.h/2;
    ctx.translate(bx,by);ctx.rotate(wp.rot);
    if(b.btype==='powerup'){ctx.shadowColor='#daa520';ctx.shadowBlur=8;}
    ctx.fillStyle=b.color;
    if(rounded){ctx.beginPath();ctx.roundRect(-b.w/2,-b.h/2,b.w,b.h,rad);ctx.fill();}
    else{ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h);}
    ctx.shadowBlur=0;
    // Indestructible: cross-hatch
    if(b.btype==='indestructible'){
      ctx.save();ctx.beginPath();ctx.rect(-b.w/2,-b.h/2,b.w,b.h);ctx.clip();
      ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;
      for(let i=-b.h;i<b.w;i+=6){
        ctx.beginPath();ctx.moveTo(-b.w/2+i,-b.h/2);ctx.lineTo(-b.w/2+i+b.h,b.h/2);ctx.stroke();
      }
      ctx.restore();
    }
    // Cracking: draw procedural cracks in local space
    if(b.btype==='cracking'&&b.hp<b.maxHp){
      drawBrickCracks(b,rounded,rad,-b.w/2,-b.h/2);
    }
    ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=1;
    if(rounded){ctx.beginPath();ctx.roundRect(-b.w/2,-b.h/2,b.w,b.h,rad);ctx.stroke();}
    else{ctx.strokeRect(-b.w/2,-b.h/2,b.w,b.h);}
    ctx.restore();
  }
}
