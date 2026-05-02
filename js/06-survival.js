// ═══════════════════════════════════════════════════════════════════
// SURVIVAL MODE
// ═══════════════════════════════════════════════════════════════════
const SURV_PU_KEYS=['decoy','widepaddle','bigball','shield','bouncy','laser','freeze','bomb','multiball','survslowmo','magnetpaddle','fireball','shrinkrow'];
let survState=null;
let survTimes={left:null,right:null};
let survTurn='left';
let survDecoyBalls=[];
let survExtraBalls=[];   // multi-ball extra balls
let survLaser=null;      // {active,endTime} — laser beam from paddle
let survFrozen=false;    // freeze: bricks stop descending
let survBomb=false;      // bomb: next brick hit explodes in radius
let survMagnetHeld=null; // magnet paddle: {ball held, angle aiming}
let survFireball=false;  // fireball: ball passes through bricks

function survBuildRow(y){
  const gap=4,bh=16;
  const cols=Math.floor((W+gap)/(60+gap));
  const bw=(W-gap*(cols-1))/cols;
  const row=[];
  const elapsed=survState?(performance.now()-survState.startTime)/1000:0;
  const crackChance=Math.min(.05+elapsed/300,.35);
  const puChance=.25;
  const sk=SKINS[currentSkin];
  const wave=survState?survState.waveNum:0;
  // Wave pattern determines which columns get bricks
  const pattern=wave%5;
  for(let c=0;c<cols;c++){
    let skip=false;
    if(pattern===0){// Scattered — random gaps
      skip=Math.random()<.15;
    }else if(pattern===1){// Full wall — no gaps, tougher
      skip=false;
    }else if(pattern===2){// Checkerboard
      skip=(c+wave)%2===0;
    }else if(pattern===3){// Cluster — bricks in center or edges
      const mid=cols/2;skip=Math.abs(c-mid)>mid*0.4&&Math.abs(c-mid)<mid*0.8;
    }else{// Zigzag gaps
      skip=c%3===((wave/5|0)%3);
    }
    if(skip)continue;
    const roll=Math.random();
    let btype='normal',hp=1,color;
    color=sk.brickColors?sk.brickColors[c%sk.brickColors.length]:'#888';
    // Full wall waves get extra cracking bricks
    const extraCrack=pattern===1?0.15:0;
    if(roll<crackChance+extraCrack){btype='cracking';color='#8b2252';hp=3;}
    else if(roll<crackChance+extraCrack+puChance){btype='powerup';color='#daa520';}
    row.push({x:c*(bw+gap),y,w:bw,h:bh,alive:true,color,btype,hp,maxHp:hp});
  }
  return row;
}

function survInit(){
  resizeCanvas(700,550);
  const sk=SKINS[currentSkin];
  const pw=130,ph=12;
  survDecoyBalls=[];survExtraBalls=[];
  fieldPowerups=[];activePowerups=[];
  shieldSide=null;defenderPaddle=null;portalA=null;portalB=null;
  survLaser=null;survFrozen=false;survBomb=false;survMagnetHeld=null;survFireball=false;
  particles=[];
  const bricks=[];
  // Start with 3 rows off-screen that scroll in
  for(let r=0;r<3;r++){
    survBuildRow(-60+r*22).forEach(b=>bricks.push(b));
  }
  survState={
    paddle:{x:W/2-pw/2,w:pw,h:ph,baseW:pw},
    ball:{x:W/2,y:H-40,vx:3.5,vy:-4,size:10},
    bricks,
    startTime:performance.now(),
    alive:true,
    brickSpeed:.2, // pixels per frame — gentler start
    lastRowTime:performance.now(),
    rowInterval:8000, // ms between new row spawns — starts slow
    score:0,
    nextPuSpawn:performance.now()+8000,
    waveNum:0,
  };
}

function survStartMatch(m){
  mode=m;lastMode=m;
  nameLeft=document.getElementById('name-left').value.trim()||'Player 1';
  nameRight=document.getElementById('name-right').value.trim()||'Player 2';
  if(m==='ai')nameRight='AI';
  survTimes={left:null,right:null};
  survTurn='left';
  survShowTurnScreen();
}

function survShowTurnScreen(){
  if(animId)cancelAnimationFrame(animId);
  resizeCanvas(700,450);window.scrollTo(0,0);
  const sk=SKINS[currentSkin];
  const name=survTurn==='left'?nameLeft:nameRight;
  const otherTime=survTurn==='left'?null:survTimes.left;
  document.querySelectorAll('#menu,#game-over,#match-over,#game-ui,#surv-turn').forEach(e=>e.style.display='none');
  ['pw','surv-turn'].forEach(id=>{
    const el=document.getElementById(id);el.style.background=sk.menuBg;el.style.color=sk.menuFg;
  });
  document.body.style.background=sk.menuBg;
  document.getElementById('surv-turn-txt').textContent=`${name}'s turn`;
  document.getElementById('surv-turn-txt').style.color=sk.menuFg;
  const info=otherTime!==null?`${nameLeft} survived ${(otherTime/1000).toFixed(1)}s — beat that!`:'Survive as long as you can!';
  document.getElementById('surv-turn-info').textContent=info;
  document.getElementById('surv-turn-info').style.color=sk.menuFg;
  document.getElementById('surv-go-btn').style.background=sk.menuFg;
  document.getElementById('surv-go-btn').style.color=sk.menuBg;
  document.getElementById('surv-turn').style.display='flex';
}

function survStartTurn(){
  document.querySelectorAll('#surv-turn,#menu,#game-over,#match-over').forEach(e=>e.style.display='none');
  document.getElementById('game-ui').style.display='flex';
  const name=survTurn==='left'?nameLeft:nameRight;
  document.getElementById('mlabel').textContent=`${name} · SURVIVAL`;
  document.getElementById('kb-legend').textContent='A/D or ←/→ move · P pause · +/− volume · space release magnet · T test panel';
  applyGameSkin();
  survInit();
  keys={};lastFrameTime=0;
  if(animId)cancelAnimationFrame(animId);
  animId=requestAnimationFrame(survUpdate);
  enterGameplay();
  fitCanvasToViewport();
}

function survUpdate(){
  if(paused){animId=requestAnimationFrame(survUpdate);return;}
  const now=performance.now();
  if(!lastFrameTime)lastFrameTime=now;
  let dt=(now-lastFrameTime)/TARGET_FRAME_MS;
  dt=Math.min(dt,3);if(dt<0.001)dt=1;
  lastFrameTime=now;
  const sv=survState;
  if(!sv||!sv.alive)return;

  // Paddle movement — horizontal
  const SPD=6;
  const isAI=mode==='ai'&&survTurn==='right';
  if(isAI){
    // AI tracks ball x
    const target=sv.ball.x-sv.paddle.w/2;
    const diff=target-sv.paddle.x;
    const step=SPD*dt;
    if(Math.abs(diff)>step)sv.paddle.x+=Math.sign(diff)*step;
    else sv.paddle.x=target;
    // AI auto-releases magnet paddle after brief hold
    if(survMagnetHeld){
      sv.ball.vx=survMagnetHeld.vx;sv.ball.vy=-Math.abs(survMagnetHeld.vy);
      survMagnetHeld=null;
    }
  }else{
    if(keys['a']||keys['A']||keys['ArrowLeft']||keys['w']||keys['W'])sv.paddle.x-=SPD*dt;
    if(keys['d']||keys['D']||keys['ArrowRight']||keys['s']||keys['S'])sv.paddle.x+=SPD*dt;
    // Touch: move paddle to touch X position
    if(touchX!==null)sv.paddle.x=Math.max(0,Math.min(W-sv.paddle.w,touchX-sv.paddle.w/2));
  }
  sv.paddle.x=Math.max(0,Math.min(W-sv.paddle.w,sv.paddle.x));

  // Wide paddle power-up
  const widePU=getAPU('widepaddle');
  sv.paddle.w=widePU?sv.paddle.baseW*1.6:sv.paddle.baseW;

  // Ball size
  let BS=10;
  if(hasAPU('bigball'))BS=26;
  sv.ball.size=BS;

  // Power-up expiry
  for(let i=activePowerups.length-1;i>=0;i--){
    if(now>=activePowerups[i].endTime){survClearPU(activePowerups[i].type);clearSinglePU(activePowerups[i]);activePowerups.splice(i,1);}
  }

  // Magnet paddle: if ball is held, skip normal ball physics
  if(survMagnetHeld){
    // Ball tracks paddle
    sv.ball.x=sv.paddle.x+sv.paddle.w/2-BS/2;
    sv.ball.y=H-24-BS-2;
    // Auto-release after 2 seconds to prevent permanent stall
    if(performance.now()-survMagnetHeld.grabbed>2000){
      sv.ball.vx=survMagnetHeld.vx;sv.ball.vy=-Math.abs(survMagnetHeld.vy);
      survMagnetHeld=null;
    }
    // Launch with spacebar (handled in keydown → sets survMagnetHeld=null and gives ball velocity)
  }else{
    // Ball physics (apply spin drift)
    if(sv.ball.spin){sv.ball.vy+=sv.ball.spin*0.025*dt;sv.ball.spin*=Math.pow(0.97,dt);}
    sv.ball.x+=sv.ball.vx*dt;sv.ball.y+=sv.ball.vy*dt;
    ballTrail.push({x:sv.ball.x,y:sv.ball.y});
    if(ballTrail.length>12)ballTrail.shift();
  }

  const bm=hasAPU('bouncy')?1.06:1;

  // Wall bounces (left, right, top)
  if(sv.ball.x<=0){sv.ball.x=0;sv.ball.vx=Math.abs(sv.ball.vx)*bm;SOUNDS[currentSkin].wall();shakeAmt=1.5;}
  if(sv.ball.x+BS>=W){sv.ball.x=W-BS;sv.ball.vx=-Math.abs(sv.ball.vx)*bm;SOUNDS[currentSkin].wall();shakeAmt=1.5;}
  if(sv.ball.y<=0){sv.ball.y=0;sv.ball.vy=Math.abs(sv.ball.vy)*bm;SOUNDS[currentSkin].wall();shakeAmt=1.5;}

  // Bottom — ball lost (check main ball + extra balls)
  if(sv.ball.y+BS>=H){
    if(shieldSide){
      sv.ball.y=H-BS-2;sv.ball.vy=-Math.abs(sv.ball.vy);
      shieldSide=null;shakeAmt=6;
      spawnPuParticles(sv.ball.x,H);SOUNDS[currentSkin].wall();
    }else if(survExtraBalls.some(eb=>eb.alive)){
      // Main ball lost but extra balls survive — swap first alive extra to main
      const eb=survExtraBalls.find(e=>e.alive);
      sv.ball.x=eb.x;sv.ball.y=eb.y;sv.ball.vx=eb.vx;sv.ball.vy=eb.vy;
      eb.alive=false;shakeAmt=4;
    }else{
      sv.alive=false;
      const elapsed=now-sv.startTime;
      survTimes[survTurn]=elapsed;
      shakeAmt=10;SOUNDS[currentSkin].score(false);
      survEndTurn(elapsed);
      return;
    }
  }

  // Paddle collision
  const px=sv.paddle.x,py=H-24,pw=sv.paddle.w,ph=sv.paddle.h;
  if(!survMagnetHeld&&sv.ball.vy>0&&sv.ball.y+BS>=py&&sv.ball.y+BS<=py+ph+4&&sv.ball.x+BS>=px&&sv.ball.x<=px+pw){
    if(hasAPU('magnetpaddle')){
      // Catch ball on paddle
      survMagnetHeld={vx:sv.ball.vx,vy:sv.ball.vy,grabbed:performance.now()};
      sv.ball.y=py-BS-2;
    }else{
      sv.ball.y=py-BS;
      const rel=(sv.ball.x+BS/2-(px+pw/2))/(pw/2);
      const ang=rel*1.1;
      const spd=Math.sqrt(sv.ball.vx**2+sv.ball.vy**2)*bm;
      const clampSpd=Math.min(spd,10);
      sv.ball.vx=Math.sin(ang)*clampSpd;
      sv.ball.vy=-Math.abs(Math.cos(ang)*clampSpd);
      sv.ball.spin=rel*0.35;
    }
    spawnParticles(sv.ball.x+BS/2,py,0);SOUNDS[currentSkin].paddle();shakeAmt=2;
  }

  // Helper: destroy brick & maybe drop powerup
  function destroyBrick(b){
    b.alive=false;sv.score++;
    spawnBrickParticles(b.x+b.w/2,b.y+b.h/2,b.color);
    if(b.btype==='powerup'){
      const type=SURV_PU_KEYS[Math.floor(Math.random()*SURV_PU_KEYS.length)];
      fieldPowerups.push({type,x:b.x+b.w/2,y:b.y+b.h/2,spawnTime:now,bobOffset:Math.random()*Math.PI*2});
    }
  }

  // Helper: bomb explosion at a point
  function bombExplode(cx,cy){
    const R=80;
    for(const b2 of sv.bricks){
      if(!b2.alive)continue;
      const bx=b2.x+b2.w/2,by=b2.y+b2.h/2;
      if(Math.sqrt((bx-cx)**2+(by-cy)**2)<R){destroyBrick(b2);}
    }
    // Big explosion particles
    for(let i=0;i<30;i++){
      const angle=Math.random()*Math.PI*2,spd=Math.random()*5+2;
      particles.push({x:cx,y:cy,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,life:1,decay:.02,size:Math.random()*5+2,hue:Math.random()*60,brickColor:`hsl(${Math.random()*40+10},100%,55%)`});
    }
    shakeAmt=12;SOUNDS[currentSkin].wall();
    survBomb=false;
  }

  // Brick collisions (main ball)
  for(const b of sv.bricks){
    if(!b.alive)continue;
    if(sv.ball.x+BS>b.x&&sv.ball.x<b.x+b.w&&sv.ball.y+BS>b.y&&sv.ball.y<b.y+b.h){
      if(!survFireball){
        const overlapL=sv.ball.x+BS-b.x,overlapR=b.x+b.w-sv.ball.x;
        const overlapT=sv.ball.y+BS-b.y,overlapB=b.y+b.h-sv.ball.y;
        const minH=Math.min(overlapL,overlapR),minV=Math.min(overlapT,overlapB);
        if(minH<minV)sv.ball.vx*=-1;else sv.ball.vy*=-1;
      }
      // Fireball: ball passes through (no bounce), still damages bricks
      b.hp--;
      if(b.hp<=0){
        if(survBomb){bombExplode(b.x+b.w/2,b.y+b.h/2);}
        else{destroyBrick(b);SOUNDS[currentSkin].wall();}
      }else{
        if(b.btype==='cracking')spawnBrickChips(b);
        SOUNDS[currentSkin].wall();shakeAmt=1;
      }
      if(!survFireball)break;
    }
  }

  // Multi-ball extra balls physics
  for(const eb of survExtraBalls){
    if(!eb.alive)continue;
    eb.x+=eb.vx*dt;eb.y+=eb.vy*dt;eb.size=BS;
    if(eb.x<=0){eb.x=0;eb.vx=Math.abs(eb.vx);}
    if(eb.x+BS>=W){eb.x=W-BS;eb.vx=-Math.abs(eb.vx);}
    if(eb.y<=0){eb.y=0;eb.vy=Math.abs(eb.vy);}
    if(eb.y+BS>=H){eb.alive=false;continue;}
    // Extra ball paddle collision
    if(eb.vy>0&&eb.y+BS>=py&&eb.y+BS<=py+ph+4&&eb.x+BS>=px&&eb.x<=px+pw){
      eb.y=py-BS;
      const rel=(eb.x+BS/2-(px+pw/2))/(pw/2);
      const ang=rel*1.1;
      const spd=Math.sqrt(eb.vx**2+eb.vy**2);
      eb.vx=Math.sin(ang)*Math.min(spd,10);
      eb.vy=-Math.abs(Math.cos(ang)*Math.min(spd,10));
    }
    // Extra ball brick collision
    for(const b of sv.bricks){
      if(!b.alive)continue;
      if(eb.x+BS>b.x&&eb.x<b.x+b.w&&eb.y+BS>b.y&&eb.y<b.y+b.h){
        if(!survFireball){
          const oL=eb.x+BS-b.x,oR=b.x+b.w-eb.x,oT=eb.y+BS-b.y,oB=b.y+b.h-eb.y;
          if(Math.min(oL,oR)<Math.min(oT,oB))eb.vx*=-1;else eb.vy*=-1;
        }
        b.hp--;
        if(b.hp<=0){if(survBomb)bombExplode(b.x+b.w/2,b.y+b.h/2);else{destroyBrick(b);SOUNDS[currentSkin].wall();}}
        else if(b.btype==='cracking'){spawnBrickChips(b);SOUNDS[currentSkin].wall();}
        if(!survFireball)break;
      }
    }
  }
  survExtraBalls=survExtraBalls.filter(e=>e.alive);

  // Decoy ball brick breaking
  for(const db of survDecoyBalls){
    db.x+=db.vx*dt;db.y+=db.vy*dt;
    if(db.x<0||db.x>W||db.y<0||db.y>H){db.dead=true;continue;}
    for(const b of sv.bricks){
      if(!b.alive)continue;
      if(db.x>b.x&&db.x<b.x+b.w&&db.y>b.y&&db.y<b.y+b.h){
        b.hp--;
        if(b.hp<=0){destroyBrick(b);}
        db.dead=true;break;
      }
    }
  }
  survDecoyBalls=survDecoyBalls.filter(d=>!d.dead);

  // Laser beam — fires upward from paddle, destroys bricks in path
  if(survLaser&&survLaser.active&&now<survLaser.endTime){
    const lx=sv.paddle.x+sv.paddle.w/2;
    const ly=py;
    // Plasma particles (blue + purple)
    if(Math.random()<.6){
      const hue=Math.random()<.5?200:280;
      const col=hue===200?'rgba(100,200,255,.6)':'rgba(180,100,255,.6)';
      particles.push({x:lx+(Math.random()-0.5)*16,y:ly-Math.random()*25,vx:(Math.random()-.5)*3,vy:-Math.random()*3-1,life:1,decay:.05,size:Math.random()*4+1,hue,brickColor:col});
    }
    // Destroy bricks in beam path (narrow column)
    const beamW=14;
    for(const b of sv.bricks){
      if(!b.alive)continue;
      if(b.x+b.w>lx-beamW/2&&b.x<lx+beamW/2&&b.y<ly&&b.y+b.h>0){
        b.hp--;
        if(b.hp<=0){destroyBrick(b);shakeAmt=Math.min(shakeAmt+1,4);}
        else if(b.btype==='cracking'&&Math.random()<.3)spawnBrickChips(b);
      }
    }
  }
  if(survLaser&&now>=survLaser.endTime)survLaser=null;

  // Move bricks down (freeze / slow-mo aware)
  const elapsed=(now-sv.startTime)/1000;
  sv.brickSpeed=.2+elapsed/240;
  let effectiveSpeed=sv.brickSpeed;
  if(survFrozen)effectiveSpeed=0;
  else if(hasAPU('survslowmo'))effectiveSpeed*=.4;
  for(const b of sv.bricks)b.y+=effectiveSpeed*dt;

  // Field power-ups also fall with bricks
  for(const fp of fieldPowerups)fp.y+=effectiveSpeed*dt;

  // Field power-up collection (ball hits OR paddle contact)
  for(let i=fieldPowerups.length-1;i>=0;i--){
    const fp=fieldPowerups[i];
    const dx=sv.ball.x+BS/2-fp.x,dy=sv.ball.y+BS/2-fp.y;
    if(Math.sqrt(dx*dx+dy*dy)<20+BS/2){
      spawnPuParticles(fp.x,fp.y);survActivatePU(fp.type,now);fieldPowerups.splice(i,1);continue;
    }
    if(fp.y>=py-10&&fp.y<=py+ph+4&&fp.x>=px&&fp.x<=px+pw){
      spawnPuParticles(fp.x,fp.y);survActivatePU(fp.type,now);fieldPowerups.splice(i,1);continue;
    }
    if(now-fp.spawnTime>POWERUP_LIFESPAN||fp.y>H+20){fieldPowerups.splice(i,1);}
  }

  // Spawn new rows
  sv.rowInterval=Math.max(2500,8000-elapsed*23);
  if(now-sv.lastRowTime>=sv.rowInterval){
    sv.lastRowTime=now;
    sv.waveNum++;
    const row=survBuildRow(-18);
    row.forEach(b=>sv.bricks.push(b));
  }

  // Check lose: any brick touches bottom (paddle area)
  const bottomLine=H-30;
  for(const b of sv.bricks){
    if(b.alive&&b.y+b.h>=bottomLine){
      sv.alive=false;
      const time=now-sv.startTime;
      survTimes[survTurn]=time;
      shakeAmt=12;SOUNDS[currentSkin].score(false);
      survEndTurn(time);
      return;
    }
  }

  // Clean dead bricks that scrolled off
  sv.bricks=sv.bricks.filter(b=>b.alive||b.y<H+50);

  updateParticles(dt);shakeAmt=prefersReducedMotion?0:Math.max(0,shakeAmt-.5*dt);
  _drawDt=dt;survDraw(now);
  animId=requestAnimationFrame(survUpdate);
}

function survActivatePU(type,now){
  activePowerups=activePowerups.filter(p=>p.type!==type);
  const sv=survState;
  const notify=()=>{showPuPopup(survTurn,type);(PU_SOUNDS[type]||SOUNDS[currentSkin].powerup)();};

  // Instant power-ups (no duration timer)
  if(type==='decoy'){
    for(let i=0;i<5;i++){
      survDecoyBalls.push({x:sv.ball.x+sv.ball.size/2,y:sv.ball.y+sv.ball.size/2,
        vx:(Math.random()-.5)*8,vy:-(Math.random()*5+2),dead:false});
    }
    notify();return;
  }
  if(type==='multiball'){
    for(let i=0;i<2;i++){
      survExtraBalls.push({x:sv.ball.x,y:sv.ball.y,
        vx:sv.ball.vx*(i===0?.8:-.8)+((Math.random()-.5)*2),
        vy:sv.ball.vy*(i===0?1:.9),size:sv.ball.size,alive:true});
    }
    notify();return;
  }
  if(type==='shrinkrow'){
    // Find the lowest row of alive bricks and destroy them
    let maxY=-Infinity;
    for(const b of sv.bricks)if(b.alive&&b.y>maxY)maxY=b.y;
    if(maxY>-Infinity){
      for(const b of sv.bricks){
        if(b.alive&&Math.abs(b.y-maxY)<4){
          b.alive=false;sv.score++;
          spawnBrickParticles(b.x+b.w/2,b.y+b.h/2,b.color);
        }
      }
      shakeAmt=6;
    }
    notify();return;
  }
  if(type==='bomb'){
    survBomb=true;notify();
    activePowerups.push({type,side:survTurn,startTime:now,endTime:now+POWER_UPS[type].duration});
    return;
  }

  // Duration-based power-ups
  if(type==='shield'){shieldSide='bottom';}
  if(type==='laser'){survLaser={active:true,endTime:now+POWER_UPS[type].duration};}
  if(type==='freeze'){survFrozen=true;}
  if(type==='survslowmo'){/* handled in update via hasAPU check */}
  if(type==='magnetpaddle'){survMagnetHeld=null;/* state managed in update */}
  if(type==='fireball'){survFireball=true;}

  activePowerups.push({type,side:survTurn,startTime:now,endTime:now+POWER_UPS[type].duration});
  notify();
}

function survClearPU(type){
  if(type==='freeze')survFrozen=false;
  if(type==='fireball')survFireball=false;
  if(type==='laser')survLaser=null;
  if(type==='bomb')survBomb=false;
  if(type==='magnetpaddle'){survMagnetHeld=null;}
  if(type==='shield')shieldSide=null;
}

function survDraw(now){
  const sv=survState,sk=SKINS[currentSkin];
  fillCanvasBg(sk.bg);
  ctx.save();ctx.translate(MARGIN,MARGIN);

  // Neon grid
  if(sk.neonGlow){
    ctx.save();ctx.strokeStyle=sk.midline;ctx.lineWidth=.5;ctx.globalAlpha=.12;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.globalAlpha=1;ctx.restore();
  }
  if(sk.deco){drawDecoBg(sk);}
  else if(sk.zen){drawForestBg(sk,performance.now());}
  else if(sk.bauhaus){drawBauhausBg(sk);}

  // Bottom danger line
  const bottomLine=H-30;
  ctx.save();ctx.strokeStyle='#f43f5e';ctx.lineWidth=1.5;ctx.globalAlpha=.3+.15*Math.sin(now/300);
  ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(0,bottomLine);ctx.lineTo(W,bottomLine);ctx.stroke();
  ctx.setLineDash([]);ctx.restore();

  // Timer
  const elapsed=(now-sv.startTime)/1000;
  ctx.fillStyle=sk.fg;ctx.font='bold 28px monospace';ctx.textAlign='center';
  ctx.save();ctx.shadowColor=sk.accent;ctx.shadowBlur=10;
  ctx.fillText(elapsed.toFixed(1)+'s',W/2,36);ctx.restore();

  // Score
  ctx.font='10px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.5;
  ctx.fillText(`bricks: ${sv.score}`,W/2,52);ctx.globalAlpha=1;

  // Player name
  const name=survTurn==='left'?nameLeft:nameRight;
  ctx.font='10px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.4;
  ctx.fillText(name,W/2,H-6);ctx.globalAlpha=1;

  // Draw bricks
  const rounded=sk.paddleShape==='rounded';
  const rad=3;
  for(const b of sv.bricks){
    if(!b.alive)continue;
    ctx.fillStyle=b.color;
    if(rounded){ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,rad);ctx.fill();}
    else ctx.fillRect(b.x,b.y,b.w,b.h);
    // Cracking: draw procedural cracks based on damage
    if(b.btype==='cracking'&&b.hp<b.maxHp){
      drawBrickCracks(b,rounded,rad);
    }
    // Gold border for power-up bricks
    if(b.btype==='powerup'){
      ctx.save();ctx.strokeStyle='#ffd700';ctx.lineWidth=1.5;ctx.globalAlpha=.6+.3*Math.sin(now/250);
      if(rounded){ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,rad);ctx.stroke();}
      else ctx.strokeRect(b.x,b.y,b.w,b.h);
      ctx.restore();
    }
    // Dark outline
    ctx.save();ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=1;
    if(rounded){ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,rad);ctx.stroke();}
    else ctx.strokeRect(b.x,b.y,b.w,b.h);
    ctx.restore();
  }

  // Draw paddle (horizontal)
  const px=sv.paddle.x,py=H-24,pw=sv.paddle.w,ph=sv.paddle.h;
  ctx.fillStyle=sk.fg;
  if(sk.paddleShape==='rounded'){ctx.beginPath();ctx.roundRect(px,py,pw,ph,6);ctx.fill();}
  else ctx.fillRect(px,py,pw,ph);
  if(sk.neonGlow){
    ctx.save();ctx.shadowColor=sk.fg;ctx.shadowBlur=14;
    ctx.fillStyle=sk.fg;
    if(sk.paddleShape==='rounded'){ctx.beginPath();ctx.roundRect(px,py,pw,ph,6);ctx.fill();}
    else ctx.fillRect(px,py,pw,ph);
    ctx.restore();
  }

  // Shield indicator — glowing line at bottom
  if(shieldSide){
    ctx.save();ctx.fillStyle=POWER_UPS.shield.color;ctx.globalAlpha=.5+.3*Math.sin(now/200);
    ctx.fillRect(0,H-4,W,4);
    ctx.shadowColor=POWER_UPS.shield.color;ctx.shadowBlur=12;ctx.fillRect(0,H-4,W,4);
    ctx.restore();
  }

  // Freeze overlay on bricks
  if(survFrozen){
    ctx.save();ctx.globalAlpha=.15;ctx.fillStyle='#67e8f9';ctx.fillRect(0,0,W,H);ctx.restore();
    // Icy sparkle on bricks — time-based pattern prevents random flicker
    const sparklePhase=Math.floor(now/120); // changes every 120ms
    ctx.save();ctx.fillStyle='#fff';
    for(let bi=0;bi<sv.bricks.length;bi++){
      const b=sv.bricks[bi];if(!b.alive)continue;
      // Deterministic sparkle: each brick gets 1-2 stable sparkles that shift position slowly
      const seed=(bi*7+sparklePhase)%17;
      if(seed<3){
        const sx=b.x+(((bi*13+sparklePhase*3)%100)/100)*b.w;
        const sy=b.y+(((bi*29+sparklePhase*7)%100)/100)*b.h;
        ctx.globalAlpha=.4+.2*Math.sin(now/200+bi);
        ctx.beginPath();ctx.arc(sx,sy,1.5,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }

  // Laser beam from paddle — plasma effect
  if(survLaser&&survLaser.active&&now<survLaser.endTime){
    const lx=sv.paddle.x+sv.paddle.w/2;
    const ly=py;
    const t=now/1000;
    ctx.save();
    // Wide outer glow (purple)
    ctx.shadowColor='#a020f0';ctx.shadowBlur=35;
    ctx.fillStyle='rgba(120,40,200,.15)';ctx.fillRect(lx-18,0,36,ly);
    ctx.shadowBlur=0;
    // Animated plasma tendrils (wobbly sine waves)
    for(let i=0;i<3;i++){
      ctx.beginPath();
      const phase=i*2.1+t*6;const amp=5+i*3;
      ctx.moveTo(lx+Math.sin(phase)*amp,0);
      for(let yy=0;yy<ly;yy+=4){
        const wx=lx+Math.sin(phase+yy*.04)*amp*Math.sin(t*3+yy*.02);
        ctx.lineTo(wx,yy);
      }
      ctx.strokeStyle=i===0?'rgba(0,180,255,.4)':i===1?'rgba(160,60,255,.35)':'rgba(255,100,255,.25)';
      ctx.lineWidth=3-i*.5;ctx.stroke();
    }
    // Main beam gradient (blue-purple shift)
    const beamGrd=ctx.createLinearGradient(lx,0,lx,ly);
    beamGrd.addColorStop(0,'rgba(140,60,255,.1)');
    beamGrd.addColorStop(.2,'rgba(0,180,255,.6)');
    beamGrd.addColorStop(.5,'rgba(100,40,220,.5)');
    beamGrd.addColorStop(.8,'rgba(0,200,255,.7)');
    beamGrd.addColorStop(1,'rgba(180,100,255,.8)');
    ctx.fillStyle=beamGrd;ctx.fillRect(lx-8,0,16,ly);
    // Hot white core (oscillates width)
    const coreW=2+Math.sin(t*12)*.8;
    ctx.fillStyle='rgba(220,240,255,.85)';ctx.fillRect(lx-coreW,0,coreW*2,ly);
    // Plasma particles along beam
    for(let i=0;i<6;i++){
      const ppx=lx+(Math.random()-.5)*24;
      const ppy=Math.random()*ly;
      const pr=1.5+Math.random()*3;
      const hue=Math.random()<.5?200:280; // blue or purple
      ctx.globalAlpha=.3+Math.random()*.4;
      ctx.fillStyle=`hsl(${hue},100%,${60+Math.random()*30}%)`;
      ctx.beginPath();ctx.arc(ppx,ppy,pr,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Impact point glow at paddle
    const impGrd=ctx.createRadialGradient(lx,ly,0,lx,ly,30);
    impGrd.addColorStop(0,'rgba(200,180,255,.6)');
    impGrd.addColorStop(.4,'rgba(100,50,200,.3)');
    impGrd.addColorStop(1,'rgba(0,100,255,0)');
    ctx.fillStyle=impGrd;ctx.beginPath();ctx.arc(lx,ly,30,0,Math.PI*2);ctx.fill();
    // Smoke wisps at base
    for(let i=0;i<4;i++){
      const smx=lx+(Math.random()-.5)*28,smy=ly-Math.random()*20;
      ctx.globalAlpha=.15+Math.random()*.2;
      ctx.fillStyle=Math.random()<.5?'rgba(180,160,255,.5)':'rgba(100,200,255,.4)';
      ctx.beginPath();ctx.arc(smx,smy,3+Math.random()*5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  // Draw ball trail (always in survival for visual flair)
  const BS=sv.ball.size||10;
  if(ballTrail.length>1){
    ctx.save();
    for(let i=0;i<ballTrail.length-1;i++){
      const t=ballTrail[i],a=(i+1)/ballTrail.length*0.25;
      ctx.globalAlpha=a;ctx.fillStyle=sk.accent;
      if(sk.ballShape==='circle'){ctx.beginPath();ctx.arc(t.x+BS/2,t.y+BS/2,BS/2*.7,0,Math.PI*2);ctx.fill();}
      else{ctx.fillRect(t.x+BS*.15,t.y+BS*.15,BS*.7,BS*.7);}
    }
    ctx.restore();
  }

  // Draw ball
  const bx=sv.ball.x,by=sv.ball.y;

  // Fireball effect — flame with smoke trail and embers (scales with ball size)
  if(survFireball){
    const cx=bx+BS/2,cy=by+BS/2;
    const vx=sv.ball.vx,vy=sv.ball.vy;
    const spd=Math.sqrt(vx*vx+vy*vy)||1;
    const tx=-vx/spd,ty=-vy/spd; // trail direction (opposite velocity)
    const sc=BS/10; // scale factor (1.0 at default size 10, 2.6 at big ball 26)
    ctx.save();
    // Smoke trail (grey puffs behind ball)
    for(let i=0;i<5;i++){
      const dist=(8+i*7)*sc+Math.random()*6*sc;
      const smx=cx+tx*dist+(Math.random()-.5)*8*sc;
      const smy=cy+ty*dist+(Math.random()-.5)*8*sc;
      const sr=(3+i*1.5+Math.random()*2)*sc;
      ctx.globalAlpha=.12-.02*i;
      ctx.fillStyle=`rgba(${80+i*20},${70+i*15},${60+i*10},.5)`;
      ctx.beginPath();ctx.arc(smx,smy,sr,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Ember trail (orange/yellow sparks)
    for(let i=0;i<6;i++){
      const dist=(4+Math.random()*20)*sc;
      const ex=cx+tx*dist+(Math.random()-.5)*12*sc;
      const ey=cy+ty*dist+(Math.random()-.5)*12*sc;
      const er=(1+Math.random()*2)*sc;
      ctx.globalAlpha=.5+Math.random()*.4;
      ctx.fillStyle=Math.random()<.6?'#ff8c00':'#ffcc00';
      ctx.beginPath();ctx.arc(ex,ey,er,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Outer flame layers
    for(let i=0;i<5;i++){
      const fx=cx+(Math.random()-.5)*BS*1.4;
      const fy=cy+(Math.random()-.5)*BS*1.4;
      const fr=BS/2+Math.random()*BS*.7;
      const grd=ctx.createRadialGradient(fx,fy,0,fx,fy,fr);
      grd.addColorStop(0,'rgba(255,220,80,.55)');
      grd.addColorStop(.3,'rgba(255,120,0,.35)');
      grd.addColorStop(.7,'rgba(200,40,0,.15)');
      grd.addColorStop(1,'rgba(100,0,0,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(fx,fy,fr,0,Math.PI*2);ctx.fill();
    }
    // Hot white-yellow core
    ctx.shadowColor='#ff6600';ctx.shadowBlur=20*sc;
    const coreGrd=ctx.createRadialGradient(cx,cy,0,cx,cy,BS/2);
    coreGrd.addColorStop(0,'rgba(255,255,220,.95)');
    coreGrd.addColorStop(.5,'#ffcc00');
    coreGrd.addColorStop(1,'#ff6600');
    ctx.fillStyle=coreGrd;ctx.beginPath();ctx.arc(cx,cy,BS/2+1,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // Spawn persistent smoke+ember particles behind ball
    if(Math.random()<.7){
      particles.push({x:cx+tx*6*sc+(Math.random()-.5)*6*sc,y:cy+ty*6*sc+(Math.random()-.5)*6*sc,vx:tx*.8+(Math.random()-.5),vy:ty*.8+(Math.random()-.5),life:1,decay:.04,size:(2+Math.random()*3)*sc,brickColor:'rgba(100,90,80,.4)'});
    }
    if(Math.random()<.5){
      particles.push({x:cx+tx*4*sc+(Math.random()-.5)*8*sc,y:cy+ty*4*sc+(Math.random()-.5)*8*sc,vx:tx*1.5+(Math.random()-.5)*2,vy:ty*1.5+(Math.random()-.5)*2-1,life:1,decay:.06,size:(1+Math.random()*2)*sc,brickColor:Math.random()<.5?'#ff8c00':'#ffcc00'});
    }
  }else{
    drawBall(bx,by,BS,sk,false,false);
  }

  // Bomb indicator on ball
  if(survBomb){
    ctx.save();ctx.strokeStyle='#ff4500';ctx.lineWidth=2;ctx.globalAlpha=.6+.4*Math.sin(now/150);
    ctx.beginPath();ctx.arc(bx+BS/2,by+BS/2,BS/2+4,0,Math.PI*2);ctx.stroke();
    ctx.font='bold 8px monospace';ctx.fillStyle='#ff4500';ctx.textAlign='center';ctx.globalAlpha=.8;
    ctx.fillText('💣',bx+BS/2,by-4);
    ctx.restore();
  }

  // Magnet held indicator
  if(survMagnetHeld){
    ctx.save();ctx.strokeStyle='#f472b6';ctx.lineWidth=1.5;ctx.globalAlpha=.5+.3*Math.sin(now/200);
    ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(bx+BS/2,by);ctx.lineTo(bx+BS/2,by-30);ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='bold 8px monospace';ctx.fillStyle='#f472b6';ctx.textAlign='center';
    ctx.fillText('SPACE to launch',bx+BS/2,by-35);
    ctx.restore();
  }

  // Draw multi-ball extra balls
  for(const eb of survExtraBalls){
    if(!eb.alive)continue;
    if(survFireball){
      ctx.save();
      const ecx=eb.x+BS/2,ecy=eb.y+BS/2;
      for(let i=0;i<3;i++){
        const fx=ecx+(Math.random()-.5)*BS;const fy=ecy+(Math.random()-.5)*BS;
        const fr=BS/2+Math.random()*BS*.4;
        const grd=ctx.createRadialGradient(fx,fy,0,fx,fy,fr);
        grd.addColorStop(0,'rgba(255,220,80,.5)');grd.addColorStop(.5,'rgba(255,100,0,.25)');grd.addColorStop(1,'rgba(200,40,0,0)');
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(fx,fy,fr,0,Math.PI*2);ctx.fill();
      }
      ctx.shadowColor='#ff6600';ctx.shadowBlur=15;
      const cg=ctx.createRadialGradient(ecx,ecy,0,ecx,ecy,BS/2);
      cg.addColorStop(0,'rgba(255,255,220,.9)');cg.addColorStop(.5,'#ffcc00');cg.addColorStop(1,'#ff6600');
      ctx.fillStyle=cg;ctx.beginPath();ctx.arc(ecx,ecy,BS/2,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }else{
      drawBall(eb.x,eb.y,BS,sk,false,false);
    }
  }

  // Draw decoy balls
  for(const db of survDecoyBalls){
    ctx.save();ctx.globalAlpha=.6;ctx.fillStyle=sk.accent;
    ctx.beginPath();ctx.arc(db.x,db.y,4,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  // Draw field power-ups
  drawFieldPowerup(now);

  // Draw particles
  drawParticles();

  // Active power-up HUD
  drawActivePuHud(now);

  // Mode label
  ctx.save();ctx.font='bold 9px monospace';ctx.fillStyle='#22c55e';
  ctx.globalAlpha=.7;ctx.textAlign='left';ctx.fillText('SURVIVAL',6,14);
  ctx.globalAlpha=1;ctx.restore();

  // Pause overlay
  if(paused){
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(-MARGIN,-MARGIN,W+MARGIN*2,H+MARGIN*2);
    ctx.fillStyle=sk.fg;ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.fillText('PAUSED',W/2,H/2-10);
    ctx.font='13px monospace';ctx.fillStyle=sk.accent;ctx.fillText('press P to resume',W/2,H/2+22);
  }

  ctx.restore();
}

function survEndTurn(time){
  cancelAnimationFrame(animId);
  const sk=SKINS[currentSkin];
  const name=survTurn==='left'?nameLeft:nameRight;
  recordSurvivalTime(name,time);
  checkSurvivalAchievements(name,time);

  if(mode==='2p'&&survTurn==='left'){
    survTurn='right';
    resizeCanvas(700,450);
    setTimeout(()=>survShowTurnScreen(),1500);
    return;
  }
  if(mode==='ai'&&survTurn==='left'){
    // Solo survival — skip AI turn, show player's result directly
    resizeCanvas(700,450);
    setTimeout(()=>{
      const t1=time;
      const wname=nameLeft;
      const isPB=recordSurvivalTime(wname,t1);
      ['pw','game-over'].forEach(id=>{
        const el=document.getElementById(id);el.style.background=sk.menuBg;el.style.color=sk.menuFg;
      });
      document.body.style.background=sk.menuBg;
      document.getElementById('wtxt').textContent=`${wname} survived!`;
      document.getElementById('wtxt').style.color=sk.menuFg;
      document.getElementById('wscr').textContent=`${(t1/1000).toFixed(1)}s`;
      document.getElementById('wscr').style.color=sk.menuFg;
      document.getElementById('wmatch').textContent=isPB?'New personal best!':'';
      document.getElementById('wmatch').style.color=sk.menuFg;
      ['rabtn','rmbtn'].forEach(id=>{document.getElementById(id).style.background=sk.menuFg;document.getElementById(id).style.color=sk.menuBg;});
      document.getElementById('rabtn').textContent='Play again';
      document.getElementById('rabtn').onclick=()=>survStartMatch(lastMode);
      const badgePop=document.getElementById('badge-pop');
      if(newBadgesThisRound.length){
        badgePop.innerHTML=newBadgesThisRound.map(b=>{
          const a=ACHIEVEMENTS[b.id];
          return`<div style="opacity:.9;">${a.icon} <b>${a.name}</b> unlocked! <span style="opacity:.5;">${a.desc}</span></div>`;
        }).join('');
      }else{badgePop.innerHTML='';}
      document.getElementById('game-ui').style.display='none';
      document.getElementById('game-over').style.display='flex';
      window.scrollTo(0,0);
    },1500);
    return;
  }

  // Both players done — show results
  resizeCanvas(700,450);
  setTimeout(()=>{
    const t1=survTimes.left||0,t2=survTimes.right||0;
    const winner=t1>=t2?'left':'right';
    const wname=winner==='left'?nameLeft:nameRight;
    ['pw','game-over'].forEach(id=>{
      const el=document.getElementById(id);el.style.background=sk.menuBg;el.style.color=sk.menuFg;
    });
    document.body.style.background=sk.menuBg;
    document.getElementById('wtxt').textContent=`${wname} wins!`;
    document.getElementById('wtxt').style.color=sk.menuFg;
    document.getElementById('wscr').textContent=`${nameLeft}: ${(t1/1000).toFixed(1)}s — ${nameRight}: ${(t2/1000).toFixed(1)}s`;
    document.getElementById('wscr').style.color=sk.menuFg;
    document.getElementById('wmatch').textContent=`${wname} survived longer!`;
    document.getElementById('wmatch').style.color=sk.menuFg;
    ['rabtn','rmbtn'].forEach(id=>{document.getElementById(id).style.background=sk.menuFg;document.getElementById(id).style.color=sk.menuBg;});
    document.getElementById('rabtn').textContent='Play again';
    document.getElementById('rabtn').onclick=()=>survStartMatch(lastMode);
    document.getElementById('game-ui').style.display='none';
    document.getElementById('surv-turn').style.display='none';
    // Show survival badges
    const allBadges=[...newBadgesThisRound];
    // Also check second player's badges (already checked in survEndTurn)
    const badgePop=document.getElementById('badge-pop');
    if(allBadges.length){
      badgePop.innerHTML=allBadges.map(b=>{
        const a=ACHIEVEMENTS[b.id];
        return`<div style="opacity:.9;">${a.icon} <b>${b.player}: ${a.name}</b> unlocked! <span style="opacity:.5;">${a.desc}</span></div>`;
      }).join('');
    }else{badgePop.innerHTML='';}
    document.getElementById('game-over').style.display='flex';
    window.scrollTo(0,0);
    recordWin(wname);recordLoss(wname===nameLeft?nameRight:nameLeft);
    // Tournament hook for survival mode
    if(tourney){
      matchSets[winner]=1;matchSets[winner==='left'?'right':'left']=0;
      setTimeout(()=>{
        document.getElementById('game-over').style.display='none';
        tourneyOnMatchEnd(winner);
      },2000);
    }
  },1500);
}

