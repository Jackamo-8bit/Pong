// ═══════════════════════════════════════════════════════════════════
// INIT / MATCH FLOW
// ═══════════════════════════════════════════════════════════════════
function initGameState(){
  particles=[];decoyBalls=[];fieldPowerups=[];activePowerups=[];leadPreSpeed=null;rallyHits=0;prevRallyHits=0;aiError=0;aiErrorLeft=0;aiErrorRight=0;
  shieldSide=null;defenderPaddle=null;portalA=null;portalB=null;blackholePos=null;
  bricks=[];
  if(gameMode==='bricks')buildBricks();
  const gs={left:{y:H/2-PH/2,score:0},right:{y:H/2-PH/2,score:0},ball:{x:W/2,y:H/2,vx:0,vy:0,size:10,curve:0,spin:0,_portalCooldown:0},_maxDeficit:{left:0,right:0}};
  return gs;
}

function startMatch(m){
  if(gameMode==='survival'){survStartMatch(m);return;}
  if(W!==700||H!==450)resizeCanvas(700,450);
  mode=m;lastMode=m;
  if(m==='online'&&onlineRole){
    // Names already set by online lobby handshake
  }else if(!tourney){
    nameLeft =document.getElementById('name-left').value.trim()||'Player 1';
    nameRight=document.getElementById('name-right').value.trim()||'Player 2';
    if(m==='ai')nameRight='AI';
  }
  matchSets={left:0,right:0};currentSet=0;
  brickPoints={left:0,right:0};lastBrickToucher=null;
  startSet();
}

function startSet(){
  currentSet++;
  // Preserve pause/mute across sets (don't reset paused)
  nextPuSpawn=performance.now()+(gameMode==='chaos'?CHAOS_SPAWN_INTERVAL:POWERUP_SPAWN_INTERVAL);
  document.getElementById('menu').style.display='none';
  document.getElementById('game-over').style.display='none';
  document.getElementById('match-over').style.display='none';
  document.getElementById('game-ui').style.display='flex';
  setPongButton('pbtn',paused?'play':'pause',paused?'Resume':'Pause');
  const setInfo=matchFormat>1?` · Set ${currentSet}`:'';
  const modeTag=gameMode!=='classic'?` [${gameMode.toUpperCase()}]`:'';
  document.getElementById('mlabel').textContent=`${nameLeft} vs ${nameRight}${setInfo}${modeTag}`;
  document.getElementById('kb-legend').textContent='W/S left · \u2191/\u2193 right · P pause · +/\u2212 volume · space serve · aim W/S \u2191\u2193 · T test panel';
  applyGameSkin();
  state=initGameState();keys={};lastFrameTime=0;
  if(animId)cancelAnimationFrame(animId);
  beginServe('left');
  if(!paused)animId=requestAnimationFrame(update);
  enterGameplay();
  fitCanvasToViewport();
}

function beginServe(side){
  serving=true;serveSide=side;countdown=3;countdownT=performance.now();
  playCountdownBeep(3);
}
function launchBall(side){
  serving=false;rallyHits=0;prevRallyHits=0;
  const dir=side==='left'?1:-1;
  const paddle=state[side];
  const ph=getPH(side);
  const offset=(paddle.y+ph/2-H/2)/(H/2);
  const vyBias=offset*3.5;
  // In bricks mode, spawn ball on the serving player's side to avoid brick column
  const spawnX=gameMode==='bricks'?(side==='left'?W*0.25:W*0.75):W/2;
  state.ball.x=spawnX;state.ball.y=H/2;
  state.ball.vx=dir*BASE_SPEED;
  state.ball.vy=vyBias+(Math.random()*.5-.25);
  state.ball.vy=Math.max(-4.5,Math.min(4.5,state.ball.vy));
  state.ball.size=10;state.ball.curve=0;
  SOUNDS[currentSkin].serve();
}

function resetBall(loser){
  state.ball.x=W/2;state.ball.y=H/2;
  state.ball.vx=0;state.ball.vy=0;
  state.ball.size=10;state.ball.curve=0;state.ball.spin=0;state.ball._portalCooldown=false;ballTrail=[];
  decoyBalls=[];leadPreSpeed=null;defenderPaddle=null;portalA=null;portalB=null;
  if(activePowerups.length)clearAllPowerups();
  fieldPowerups=[];
  nextPuSpawn=performance.now()+(gameMode==='chaos'?CHAOS_SPAWN_INTERVAL:POWERUP_SPAWN_INTERVAL);
  lastBrickToucher=null;
  if(gameMode==='bricks')buildBricks();
  beginServe(loser);
}

function showMenu(){
  if(animId)cancelAnimationFrame(animId);
  if(typeof onlineCleanup==='function'&&onlineRole)onlineCleanup();
  if(W!==700||H!==450)resizeCanvas(700,450);
  ['menu','game-over','match-over','surv-turn','tourney-setup','tourney-bracket','tourney-winner','online-lobby'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=id==='menu'?'flex':'none';});
  document.getElementById('game-ui').style.display='none';
  document.getElementById('pu-popup').classList.remove('show');
  paused=false;applyMenuSkin();buildSkinGrid();buildLeaderboard();
  exitGameplay();
}

function togglePause(){
  paused=!paused;
  setPongButton('pbtn',paused?'play':'pause',paused?'Resume':'Pause');
  if(!paused){lastFrameTime=0;animId=requestAnimationFrame(gameMode==='survival'?survUpdate:update);}
}

// ═══════════════════════════════════════════════════════════════════
// AFTER A SET ENDS
// ═══════════════════════════════════════════════════════════════════
function endSet(winner){
  cancelAnimationFrame(animId);
  document.getElementById('pu-popup').classList.remove('show');
  exitGameplay();
  if(onlineRole==='host'&&onlineConn&&onlineConn.open){
    onlineConn.send({type:'setEnd',winner,ls:state.left.score,rs:state.right.score,matchSets});
  }
  const sk=SKINS[currentSkin];
  matchSets[winner]++;
  const setsNeeded=Math.ceil(matchFormat/2);
  const matchOver=matchSets.left>=setsNeeded||matchSets.right>=setsNeeded||matchFormat===1;

  ['pw','game-over'].forEach(id=>{
    const el=document.getElementById(id);
    el.style.background=sk.menuBg;el.style.color=sk.menuFg;
  });
  document.body.style.background=sk.menuBg;
  document.getElementById('wtxt').style.color=sk.menuFg;
  document.getElementById('wscr').style.color=sk.menuFg;
  document.getElementById('wmatch').style.color=sk.menuFg;
  ['rabtn','rmbtn'].forEach(id=>{document.getElementById(id).style.background=sk.menuFg;document.getElementById(id).style.color=sk.menuBg;});

  const wname=playerName(winner),lname=opponentName(winner);
  const brickNote=gameMode==='bricks'&&brickPoints[winner]>0?` (${brickPoints[winner]} bricks broken)`:'';
  document.getElementById('wtxt').textContent=`${wname} wins!${brickNote}`;
  document.getElementById('wscr').textContent=`${state.left.score} — ${state.right.score}`;

  let pbNote='';
  const isPB=recordRallyPB(wname,sessionRallyPB)||recordRallyPB(lname,sessionRallyPB);
  if(sessionRallyPB>0){
    pbNote=`rally: ${sessionRallyPB} hits${isPB?' 🏆 new pb!':''}`;
  }

  if(matchFormat>1){
    document.getElementById('wmatch').textContent=`Sets: ${nameLeft} ${matchSets.left} — ${matchSets.right} ${nameRight}${pbNote?' · '+pbNote:''}`;
  } else {
    document.getElementById('wmatch').textContent=pbNote;
  }

  setPongButton('rabtn','play',matchOver?'Play again':(matchSets[winner]>=setsNeeded?'Play again':'Next set'));
  // Check achievements
  const loser=winner==='left'?'right':'left';
  checkAchievements(winner,loser,state[winner].score,state[loser].score);
  const badgePop=document.getElementById('badge-pop');
  if(newBadgesThisRound.length){
    badgePop.innerHTML=newBadgesThisRound.map(b=>{
      const a=ACHIEVEMENTS[b.id];
      return`<div style="opacity:.9;">${a.icon} <b>${a.name}</b> unlocked! <span style="opacity:.5;">${a.desc}</span></div>`;
    }).join('');
  }else{badgePop.innerHTML='';}

  document.getElementById('game-ui').style.display='none';
  document.getElementById('game-over').style.display='flex';

  if(matchOver){
    recordWin(wname);recordLoss(lname);
    if(gameMode==='bricks'){recordBricks(nameLeft,brickPoints.left);recordBricks(nameRight,brickPoints.right);}
  }
}

function nextSetOrEnd(){
  if(onlineRole){onlineRematch();return;}
  const setsNeeded=Math.ceil(matchFormat/2);
  if(matchSets.left>=setsNeeded||matchSets.right>=setsNeeded||matchFormat===1){
    showMatchOver();
  } else {
    document.getElementById('game-over').style.display='none';
    startSet();
  }
}

function showMatchOver(){
  const winner=matchSets.left>matchSets.right?'left':'right';
  if(onlineRole==='host'&&onlineConn&&onlineConn.open){
    onlineConn.send({type:'matchEnd',winner,matchSets});
  }
  // Tournament hook — intercept and return to bracket
  if(tourney){
    if(tourneyOnMatchEnd(winner))return;
  }
  const sk=SKINS[currentSkin];
  const wname=playerName(winner);
  ['pw','match-over'].forEach(id=>{
    const el=document.getElementById(id);el.style.background=sk.menuBg;el.style.color=sk.menuFg;
  });
  document.body.style.background=sk.menuBg;
  document.getElementById('mtxt').textContent=`${wname} wins the match!`;
  document.getElementById('mtxt').style.color=sk.menuFg;
  document.getElementById('mscr').textContent=`${nameLeft} ${matchSets.left} — ${matchSets.right} ${nameRight}`;
  document.getElementById('mscr').style.color=sk.menuFg;
  ['mrabtn','mrmbtn'].forEach(id=>{document.getElementById(id).style.background=sk.menuFg;document.getElementById(id).style.color=sk.menuBg;});
  document.getElementById('game-over').style.display='none';
  document.getElementById('match-over').style.display='flex';
}

// ═══════════════════════════════════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════════════════════════════════
const _elGameUI=document.getElementById('game-ui');
const _elGameOver=document.getElementById('game-over');
const _elMatchOver=document.getElementById('match-over');
const _elSurvTurn=document.getElementById('surv-turn');
const _elVolSlider=document.getElementById('vol-slider');
const _elScoreLive=document.getElementById('score-live');
const _elMenu=document.getElementById('menu');

document.addEventListener('keydown',e=>{
  keys[e.key]=true;
  const inGame=_elGameUI.style.display==='flex';
  const overScreen=_elGameOver.style.display==='flex';
  const matchScreen=_elMatchOver.style.display==='flex';
  if(e.key==='m'||e.key==='M')toggleMute();
  // Volume keys: +/= to increase, - to decrease
  if(e.key==='='||e.key==='+'){const v=Math.min(100,Math.round(masterVolume*100)+10);_elVolSlider.value=v;setVolume(v);}
  if(e.key==='-'&&!e.ctrlKey&&!e.metaKey){const v=Math.max(0,Math.round(masterVolume*100)-10);_elVolSlider.value=v;setVolume(v);}
  if(e.key==='t'||e.key==='T'){if(inGame||_elMenu.style.display!=='none')toggleTestPanel();}
  if(inGame){
    if(e.key==='p'||e.key==='P'){e.preventDefault();togglePause();}
    if(serving&&e.key===' '){e.preventDefault();if(countdown===0){
      if(onlineRole==='guest'&&onlineConn){onlineConn.send({type:'serve'});}
      else{launchBall(serveSide);}
    }}
    // Magnet paddle release in survival mode
    if(gameMode==='survival'&&survMagnetHeld&&e.key===' '){
      e.preventDefault();
      const sv=survState;if(sv){
        const spd=Math.sqrt(survMagnetHeld.vx**2+survMagnetHeld.vy**2);
        sv.ball.vx=survMagnetHeld.vx;sv.ball.vy=-Math.abs(survMagnetHeld.vy);
        survMagnetHeld=null;
      }
    }
  }
  if(overScreen&&e.key===' '){e.preventDefault();if(gameMode==='survival')survStartMatch(lastMode);else nextSetOrEnd();}
  if(matchScreen&&e.key===' '){e.preventDefault();startMatch(lastMode);}
  const survScreen=_elSurvTurn.style.display==='flex';
  if(survScreen&&e.key===' '){e.preventDefault();survStartTurn();}
});
document.addEventListener('keyup',e=>{keys[e.key]=false;});

// ═══════════════════════════════════════════════════════════════════
// TOUCH CONTROLS (with visual feedback)
// ═══════════════════════════════════════════════════════════════════
const touchY={left:null,right:null};
let touchX=null; // For survival mode horizontal paddle
const touchIndLeft=document.getElementById('touch-ind-left');
const touchIndRight=document.getElementById('touch-ind-right');

let _touchSetup=false;
function setupTouch(){
  if(_touchSetup)return;_touchSetup=true;
  const wrap=document.getElementById('canvas-wrap');
  wrap.addEventListener('touchstart',e=>{e.preventDefault();handleTouch(e);},{passive:false});
  wrap.addEventListener('touchmove', e=>{e.preventDefault();handleTouch(e);},{passive:false});
  wrap.addEventListener('touchend',  e=>{e.preventDefault();
    Array.from(e.changedTouches).forEach(t=>{
      const rect=canvas.getBoundingClientRect();
      const side=t.clientX<rect.left+rect.width/2?'left':'right';
      touchY[side]=null;
      touchX=null;
      const ind=side==='left'?touchIndLeft:touchIndRight;
      ind.classList.remove('active');
      if(serving&&countdown===0){
        if(onlineRole==='guest'&&onlineConn){onlineConn.send({type:'serve'});}
        else{launchBall(serveSide);}
      }
      // Survival: release magnet on touch end
      if(survMagnetHeld&&gameMode==='survival'){
        const sv=survState;if(sv){sv.ball.vx=survMagnetHeld.vx;sv.ball.vy=survMagnetHeld.vy;survMagnetHeld=null;}
      }
    });
  },{passive:false});
}
function handleTouch(e){
  const rect=canvas.getBoundingClientRect();
  const scaleY=(H+MARGIN*2)/rect.height,scaleX=(W+MARGIN*2)/rect.width;
  Array.from(e.touches).forEach(t=>{
    const side=t.clientX<rect.left+rect.width/2?'left':'right';
    touchY[side]=(t.clientY-rect.top)*scaleY-MARGIN;
    // Track X for survival mode horizontal paddle (use first touch)
    touchX=(t.clientX-rect.left)*scaleX-MARGIN;
    // Visual feedback (account for CSS scale)
    const ind=side==='left'?touchIndLeft:touchIndRight;
    ind.classList.add('active');
    ind.style.left=((t.clientX-rect.left)/canvasScale-20)+'px';
    ind.style.top=((t.clientY-rect.top)/canvasScale-20)+'px';
    const sk=SKINS[currentSkin];
    ind.style.borderColor=sk.accent;
    ind.style.background=sk.accent.replace(')',',0.1)').replace('rgb','rgba');
  });
}

// ═══════════════════════════════════════════════════════════════════
// AI
// ═══════════════════════════════════════════════════════════════════
let aiErrorLeft=0,aiErrorRight=0;
// Predict where the ball will arrive at a given x, accounting for wall bounces
function predictBallY(ball,targetX){
  let bx=ball.x,by=ball.y,vx=ball.vx,vy=ball.vy,spin=ball.spin||0;
  if(vx===0)return by;
  if((targetX>bx&&vx<0)||(targetX<bx&&vx>0))return by;
  // Step simulation to account for spin curving the trajectory
  for(let i=0;i<300;i++){
    vy+=spin*0.025;
    spin*=0.97;
    bx+=vx;by+=vy;
    if(by<0){by=-by;vy=Math.abs(vy);}
    if(by>H){by=2*H-by;vy=-Math.abs(vy);}
    if((vx>0&&bx>=targetX)||(vx<0&&bx<=targetX))return by;
  }
  return by;
}
function moveAI(paddle,ball,side,dt){
  side=side||'right';dt=dt||1;
  const ph=getPH(side);
  let spd=AI_SPEED[aiDiff],maxErr=AI_ERROR[aiDiff];
  // Rubber-banding: AI adapts when score gap is large
  if(state){
    const myScore=state[side].score,oppScore=state[side==='left'?'right':'left'].score;
    const gap=oppScore-myScore; // positive = this AI losing
    if(gap>=3){spd*=1.08;maxErr*=0.8;}
    else if(gap>=2){spd*=1.04;maxErr*=0.9;}
    else if(gap<=-3){spd*=0.90;maxErr*=1.3;}
    else if(gap<=-2){spd*=0.95;maxErr*=1.15;}
  }
  // Per-side error tracking so two AIs don't share drift
  if(side==='left'){
    aiErrorLeft+=(Math.random()-.5)*4*dt;
    aiErrorLeft=Math.max(-maxErr,Math.min(maxErr,aiErrorLeft));
    var err=aiErrorLeft;
  }else{
    aiErrorRight+=(Math.random()-.5)*4*dt;
    aiErrorRight=Math.max(-maxErr,Math.min(maxErr,aiErrorRight));
    var err=aiErrorRight;
  }
  // Predict trajectory when ball is heading toward this paddle; otherwise drift to center
  const heading=(side==='left'&&ball.vx<0)||(side==='right'&&ball.vx>0);
  let targetY;
  if(serving){
    targetY=H/2+err*0.25;
  }else if(gameMode==='bricks'&&heading){
    const urgency=side==='left'?ball.x<W*.45:ball.x>W*.55;
    targetY=(urgency?ball.y+ball.size/2:H/2)+err*0.35;
  }else if(heading){
    const padX=side==='left'?24+PW:W-24-PW;
    targetY=predictBallY(ball,padX)+err;
  }else{
    // Ball heading away — drift toward center with some error
    targetY=H/2+err*0.5;
  }
  const c=paddle.y+ph/2,diff=targetY-c;
  const step=spd*dt;
  if(Math.abs(diff)>step)paddle.y+=diff>0?step:-step;
  paddle.y=Math.max(0,Math.min(H-ph,paddle.y));
}

// ═══════════════════════════════════════════════════════════════════
// DECOY BALLS
// ═══════════════════════════════════════════════════════════════════
function updateDecoyBall(db,dt){
  dt=dt||1;
  // Apply spin drift like the real ball
  if(db.spin){db.vy+=db.spin*0.025*dt;db.spin*=Math.pow(0.97,dt);}
  db.x+=db.vx*dt;db.y+=db.vy*dt;
  if(db.y<=0){db.y=0;db.vy*=-1;}if(db.y+10>=H){db.y=H-10;db.vy*=-1;}
  const LP=24,RP=W-24-PW;
  if(db.vx<0&&db.x<=LP+PW&&db.x>=LP-2&&db.y+10>=state.left.y&&db.y<=state.left.y+PH){
    db.x=LP+PW;db.vx=Math.abs(db.vx);
    const rel=(db.y+5-(state.left.y+PH/2))/(PH/2);db.spin=rel*0.3;
  }
  if(db.vx>0&&db.x+10>=RP&&db.x+10<=RP+PW+4&&db.y+10>=state.right.y&&db.y<=state.right.y+PH){
    db.x=RP-10;db.vx=-Math.abs(db.vx);
    const rel=(db.y+5-(state.right.y+PH/2))/(PH/2);db.spin=rel*0.3;
  }
  // Bounce off shields so decoys don't visually pass through
  if(shieldSide==='left'&&db.vx<0&&db.x<=4){db.x=4;db.vx=Math.abs(db.vx);}
  if(shieldSide==='right'&&db.vx>0&&db.x+10>=W-4){db.x=W-14;db.vx=-Math.abs(db.vx);}
  return db.x>-20&&db.x<W+20;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN UPDATE
// ═══════════════════════════════════════════════════════════════════
function announceScore(){if(_elScoreLive)_elScoreLive.textContent=`${nameLeft} ${state.left.score}, ${nameRight} ${state.right.score}`;}
function update(){
  try{return updateFrame();}
  catch(e){
    console.error('Pong update failed',e);
    fitCanvasToViewport();
    animId=requestAnimationFrame(update);
  }
}
function updateFrame(){
  if(paused)return;
  const now=performance.now();
  if(!lastFrameTime)lastFrameTime=now;
  let dt=(now-lastFrameTime)/TARGET_FRAME_MS;
  dt=Math.min(dt,3); // cap to prevent spiral on tab-switch
  if(dt<0.001)dt=1; // guard against zero/negative
  lastFrameTime=now;
  const s=state,SPD=5;

  // Touch paddle movement (skip AI-controlled sides)
  const _aiL=tourney?tourneyAI.left:false;
  const _aiR=tourney?tourneyAI.right:(mode==='ai');
  if(touchY.left!==null&&!_aiL){
    const ph=getPH('left');s.left.y=Math.max(0,Math.min(H-ph,touchY.left-ph/2));
  }
  if(touchY.right!==null&&!_aiR){
    const ph=getPH('right');s.right.y=Math.max(0,Math.min(H-ph,touchY.right-ph/2));
  }

  // Serve / countdown phase
  if(serving){
    if(countdown>0&&now-countdownT>=1000){
      countdown--;countdownT=now;
      if(countdown>0)playCountdownBeep(countdown);
      else playCountdownBeep(0);
    }
    movePaddles(s,SPD,dt);updateParticles(dt);drawServe(now);
    if(onlineRole==='host'&&onlineConn)onlineSendState(now);
    animId=requestAnimationFrame(update);return;
  }

  movePaddles(s,SPD,dt);

  // Power-up tick
  // Expire finished power-ups
  for(let i=activePowerups.length-1;i>=0;i--){
    if(now>=activePowerups[i].endTime){clearSinglePU(activePowerups[i]);activePowerups.splice(i,1);}
  }
  // Cache power-up lookups for this frame
  const _puCurve=hasAPU('curve'),_puLead=hasAPU('lead'),_puBouncy=hasAPU('bouncy');
  const _puDecoy=hasAPU('decoy'),_puPortal=hasAPU('portal'),_puGhost=hasAPU('ghost'),_puFreeze=hasAPU('freeze');
  const magnetPU=getAPU('magnet'),cpPU=getAPU('curvedpaddle');

  let BS=getBallSize();
  if(gameMode==='chaos'&&Math.random()<.003)BS=Math.max(6,Math.min(22,BS+(Math.random()*6-3)));
  s.ball.size=BS;
  // Apply ongoing power-up effects
  if(_puCurve){s.ball.curve=(s.ball.curve||0)+.07*dt;s.ball.vy+=Math.sin(s.ball.curve*.6)*.12*dt;}
  if(_puLead){const sp=Math.sqrt(s.ball.vx**2+s.ball.vy**2);if(sp>3){const ld=Math.pow(.995,dt);s.ball.vx*=ld;s.ball.vy*=ld;}}
  if(magnetPU){
    const mSide=magnetPU.side;
    const returning=(mSide==='left'&&s.ball.vx<0)||(mSide==='right'&&s.ball.vx>0);
    if(returning){
      const pad=s[mSide],ph=getPH(mSide);
      const padCX=mSide==='left'?24+PW:W-24;
      const padCY=pad.y+ph/2;
      const mdx=padCX-(s.ball.x+BS/2),mdy=padCY-(s.ball.y+BS/2);
      const md=Math.sqrt(mdx*mdx+mdy*mdy);
      if(md>5){const pull=.55;s.ball.vx+=mdx/md*pull*.3*dt;s.ball.vy+=mdy/md*pull*dt;}
    }
  }

  // Apply spin drift (English from off-center paddle hits)
  if(s.ball.spin){s.ball.vy+=s.ball.spin*0.025*dt;s.ball.spin*=Math.pow(0.97,dt);}
  s.ball.x+=s.ball.vx*dt;s.ball.y+=s.ball.vy*dt;
  // Record ball trail for high-rally visual
  ballTrail.push({x:s.ball.x,y:s.ball.y});
  if(ballTrail.length>12)ballTrail.shift();

  // Wall bounces
  const bm=_puBouncy?1.08:1;
  if(s.ball.y<=0){s.ball.y=0;s.ball.vy=Math.abs(s.ball.vy)*bm;SOUNDS[currentSkin].wall();shakeAmt=2;}
  if(s.ball.y+BS>=H){s.ball.y=H-BS;s.ball.vy=-Math.abs(s.ball.vy)*bm;SOUNDS[currentSkin].wall();shakeAmt=2;}

  // Paddle collisions (with swept check to prevent tunneling at high speeds)
  const LP=24,RP=W-24-PW,leftPH=getPH('left'),rightPH=getPH('right');
  const prevBX=s.ball.x-s.ball.vx*dt; // previous frame x position
  // Curved paddle: opponent's paddle gets a curved arc surface
  const curvedL=cpPU&&cpPU.side!=='left';
  const curvedR=cpPU&&cpPU.side!=='right';

  // Arc collision for curved paddles — ball bounces off the visual arc surface
  let curvedHitL=false,curvedHitR=false;
  if(curvedL&&s.ball.vx<0){
    const arcCX=LP+PW+12,arcCY=s.left.y+leftPH/2,arcR=leftPH*0.6;
    const bcx=s.ball.x+BS/2,bcy=s.ball.y+BS/2;
    const dx=bcx-arcCX,dy=bcy-arcCY,dist=Math.sqrt(dx*dx+dy*dy);
    const ang=Math.atan2(dy,dx);
    if(dist<arcR+BS/2+2&&ang>=-Math.PI*0.45&&ang<=Math.PI*0.45){
      curvedHitL=true;
      const nx=dx/dist,ny=dy/dist;
      s.ball.x=arcCX+nx*(arcR+BS/2+1)-BS/2;
      s.ball.y=arcCY+ny*(arcR+BS/2+1)-BS/2;
      rallyHits++;rallyPopT=performance.now();
      if(rallyHits>sessionRallyPB)sessionRallyPB=rallyHits;
      const spd=Math.min(Math.sqrt(s.ball.vx**2+s.ball.vy**2)*bm+rallySpeedBonus(rallyHits),MAX_SPEED);
      s.ball.vx=Math.abs(nx)*spd;if(s.ball.vx<spd*0.2)s.ball.vx=spd*0.2;
      s.ball.vy=ny*spd;
      s.ball.spin=ny*0.25;
      if(_puCurve)s.ball.curve=0;
      spawnParticles(s.ball.x,s.ball.y+BS/2,1);SOUNDS[currentSkin].paddle();shakeAmt=3;
      lastBrickToucher='left';
      checkFieldPuCollect('left',now);
    }
  }
  if(curvedR&&s.ball.vx>0){
    const arcCX=RP-12,arcCY=s.right.y+rightPH/2,arcR=rightPH*0.6;
    const bcx=s.ball.x+BS/2,bcy=s.ball.y+BS/2;
    const dx=bcx-arcCX,dy=bcy-arcCY,dist=Math.sqrt(dx*dx+dy*dy);
    const ang=Math.atan2(dy,dx);
    if(dist<arcR+BS/2+2&&(ang>=Math.PI*0.55||ang<=-Math.PI*0.55)){
      curvedHitR=true;
      const nx=dx/dist,ny=dy/dist;
      s.ball.x=arcCX+nx*(arcR+BS/2+1)-BS/2;
      s.ball.y=arcCY+ny*(arcR+BS/2+1)-BS/2;
      rallyHits++;rallyPopT=performance.now();
      if(rallyHits>sessionRallyPB)sessionRallyPB=rallyHits;
      const spd=Math.min(Math.sqrt(s.ball.vx**2+s.ball.vy**2)*bm+rallySpeedBonus(rallyHits),MAX_SPEED);
      s.ball.vx=-Math.abs(nx)*spd;if(s.ball.vx>-spd*0.2)s.ball.vx=-spd*0.2;
      s.ball.vy=ny*spd;
      s.ball.spin=ny*0.25;
      if(_puCurve)s.ball.curve=0;
      spawnParticles(s.ball.x+BS,s.ball.y+BS/2,-1);SOUNDS[currentSkin].paddle();shakeAmt=3;
      lastBrickToucher='right';
      checkFieldPuCollect('right',now);
    }
  }

  // Left paddle: flat collision (skipped if arc already handled it)
  const leftEdge=LP+PW;
  const crossedLeft=s.ball.vx<0&&prevBX>=leftEdge&&s.ball.x<=leftEdge;
  if(!curvedHitL&&s.ball.vx<0&&(crossedLeft||s.ball.x<=LP+PW&&s.ball.x>=LP-2)&&s.ball.y+BS>=s.left.y&&s.ball.y<=s.left.y+leftPH){
    s.ball.x=LP+PW;rallyHits++;rallyPopT=performance.now();
    if(rallyHits>sessionRallyPB)sessionRallyPB=rallyHits;
    const rel=(s.ball.y+BS/2-(s.left.y+leftPH/2))/(leftPH/2);
    const spd=Math.min(Math.sqrt(s.ball.vx**2+s.ball.vy**2)*bm+rallySpeedBonus(rallyHits),MAX_SPEED);
    s.ball.vx=Math.abs(Math.cos(rel*.8)*spd);s.ball.vy=Math.sin(rel*.8)*spd;
    s.ball.spin=rel*0.35;
    if(_puCurve)s.ball.curve=0;
    spawnParticles(LP+PW,s.ball.y+BS/2,1);SOUNDS[currentSkin].paddle();shakeAmt=3;
    lastBrickToucher='left';
    checkFieldPuCollect('left',now);
  }
  // Right paddle: flat collision (skipped if arc already handled it)
  const rightEdge=RP;
  const crossedRight=s.ball.vx>0&&prevBX+BS<=rightEdge&&s.ball.x+BS>=rightEdge;
  if(!curvedHitR&&s.ball.vx>0&&(crossedRight||s.ball.x+BS>=RP&&s.ball.x+BS<=RP+PW+4)&&s.ball.y+BS>=s.right.y&&s.ball.y<=s.right.y+rightPH){
    s.ball.x=RP-BS;rallyHits++;rallyPopT=performance.now();
    if(rallyHits>sessionRallyPB)sessionRallyPB=rallyHits;
    const rel=(s.ball.y+BS/2-(s.right.y+rightPH/2))/(rightPH/2);
    const spd=Math.min(Math.sqrt(s.ball.vx**2+s.ball.vy**2)*bm+rallySpeedBonus(rallyHits),MAX_SPEED);
    s.ball.vx=-Math.abs(Math.cos(rel*.8)*spd);s.ball.vy=Math.sin(rel*.8)*spd;
    s.ball.spin=rel*0.35;
    if(_puCurve)s.ball.curve=0;
    spawnParticles(RP,s.ball.y+BS/2,-1);SOUNDS[currentSkin].paddle();shakeAmt=3;
    lastBrickToucher='right';
    checkFieldPuCollect('right',now);
  }

  // Field PU hit / expire / spawn
  for(let i=fieldPowerups.length-1;i>=0;i--){
    const fp=fieldPowerups[i];
    const puR=20,dx=s.ball.x+BS/2-fp.x,dy=s.ball.y+BS/2-fp.y;
    if(Math.sqrt(dx*dx+dy*dy)<puR+BS/2){
      spawnPuParticles(fp.x,fp.y);
      activatePowerup(fp.type,s.ball.vx<0?'right':'left',now);
      fieldPowerups.splice(i,1);
      if(gameMode!=='chaos')nextPuSpawn=now+POWERUP_SPAWN_INTERVAL;
      continue;
    }
    if(now-fp.spawnTime>POWERUP_LIFESPAN){fieldPowerups.splice(i,1);if(gameMode!=='chaos')nextPuSpawn=Math.max(nextPuSpawn,now+POWERUP_SPAWN_INTERVAL/2);}
  }
  const maxField=gameMode==='chaos'?3:1;
  if(fieldPowerups.length<maxField&&now>=nextPuSpawn)spawnFieldPowerup(now);

  // Portal teleport
  if(_puPortal&&portalA&&portalB){
    const portalR=22,bcx=s.ball.x+BS/2,bcy=s.ball.y+BS/2;
    const daA=Math.sqrt((bcx-portalA.x)**2+(bcy-portalA.y)**2);
    const daB=Math.sqrt((bcx-portalB.x)**2+(bcy-portalB.y)**2);
    // Frame-count cooldown prevents infinite teleport loops between close portals
    if(s.ball._portalCooldown>0)s.ball._portalCooldown=Math.max(0,s.ball._portalCooldown-dt);
    if(daA<portalR+BS/2&&s.ball._portalCooldown<=0){
      s.ball.x=portalB.x-BS/2;s.ball.y=portalB.y-BS/2;s.ball._portalCooldown=12;
      shakeAmt=4;spawnPuParticles(portalB.x,portalB.y);SOUNDS[currentSkin].wall();
    }else if(daB<portalR+BS/2&&s.ball._portalCooldown<=0){
      s.ball.x=portalA.x-BS/2;s.ball.y=portalA.y-BS/2;s.ball._portalCooldown=12;
      shakeAmt=4;spawnPuParticles(portalA.x,portalA.y);SOUNDS[currentSkin].wall();
    }
  }

  // Defender paddle AI + collision
  if(defenderPaddle){
    const dp=defenderPaddle,dpH=dp.h,dpW=8;
    const target=s.ball.y-dpH/2;
    const dSpd=3.5;
    if(Math.abs(dp.y+dpH/2-s.ball.y)>dSpd)dp.y+=(target>dp.y?1:-1)*dSpd;
    dp.y=Math.max(0,Math.min(H-dpH,dp.y));
    // Collision with defender paddle
    if(dp.side==='left'&&s.ball.vx<0&&s.ball.x<=dp.x+dpW&&s.ball.x>=dp.x-2&&s.ball.y+BS>=dp.y&&s.ball.y<=dp.y+dpH){
      s.ball.x=dp.x+dpW;s.ball.vx=Math.abs(s.ball.vx);
      spawnParticles(dp.x+dpW,s.ball.y+BS/2,1);SOUNDS[currentSkin].paddle();shakeAmt=3;
    }
    if(dp.side==='right'&&s.ball.vx>0&&s.ball.x+BS>=dp.x&&s.ball.x+BS<=dp.x+dpW+4&&s.ball.y+BS>=dp.y&&s.ball.y<=dp.y+dpH){
      s.ball.x=dp.x-BS;s.ball.vx=-Math.abs(s.ball.vx);
      spawnParticles(dp.x,s.ball.y+BS/2,-1);SOUNDS[currentSkin].paddle();shakeAmt=3;
    }
  }

  // Brick collisions
  if(gameMode==='bricks'){
    if(!_puFreeze)brickMovePhase+=0.008*dt;
    checkBrickCollision(s.ball,BS);
    if(bricks.every(b=>!b.alive||b.btype==='indestructible'))buildBricks();
  }

  // Scoring (with shield save)
  if(s.ball.x<0){
    if(shieldSide==='left'){
      // Shield blocks the goal
      s.ball.x=10;s.ball.vx=Math.abs(s.ball.vx);
      shieldSide=null;shakeAmt=6;
      spawnPuParticles(5,s.ball.y+BS/2);SOUNDS[currentSkin].wall();
    }else{
      s.right.score++;shakeAmt=8;rightScoreFlash=1.0;announceScore();
      // Track deficit for comeback achievement
      const ldR=s.right.score-s.left.score;if(ldR>0)s._maxDeficit.left=Math.max(s._maxDeficit.left,ldR);
      if(s.right.score>=winScore){SOUNDS[currentSkin].gameWin(mode==='ai');endSet('right');return;}
      SOUNDS[currentSkin].score(false);resetBall('left');
    }
  }
  if(s.ball.x>W){
    if(shieldSide==='right'){
      s.ball.x=W-10-BS;s.ball.vx=-Math.abs(s.ball.vx);
      shieldSide=null;shakeAmt=6;
      spawnPuParticles(W-5,s.ball.y+BS/2);SOUNDS[currentSkin].wall();
    }else{
      s.left.score++;shakeAmt=8;leftScoreFlash=1.0;announceScore();
      const ldL=s.left.score-s.right.score;if(ldL>0)s._maxDeficit.right=Math.max(s._maxDeficit.right,ldL);
      if(s.left.score>=winScore){SOUNDS[currentSkin].gameWin(true);endSet('left');return;}
      SOUNDS[currentSkin].score(true);resetBall('right');
    }
  }

  if(_puDecoy){let died=false;for(let i=decoyBalls.length-1;i>=0;i--){if(!updateDecoyBall(decoyBalls[i],dt)){decoyBalls[i]=decoyBalls[decoyBalls.length-1];decoyBalls.pop();died=true;}}}
  if(SKINS[currentSkin].chaos)chaosHue=(chaosHue+.8*dt)%360;
  updateParticles(dt);shakeAmt=prefersReducedMotion?0:Math.max(0,shakeAmt-.6*dt);
  _drawDt=dt;draw(now);
  if(onlineRole==='host'&&onlineConn)onlineSendState(now);
  animId=requestAnimationFrame(update);
}

function movePaddles(s,SPD,dt){
  dt=dt||1;
  const leftPH=getPH('left'),rightPH=getPH('right');
  // Online mode: host controls left, guest input controls right
  if(onlineRole==='guest')return;
  if(onlineRole==='host'){
    const slowPU=getAPU('slowmo');
    const leftSPD=(slowPU&&slowPU.side!=='left')?SPD*.3*dt:SPD*dt;
    const invertPU=getAPU('invert');
    const lUp=(invertPU&&invertPU.side!=='left')?-1:1;
    if(touchY.left!==null){s.left.y=Math.max(0,Math.min(H-leftPH,touchY.left-leftPH/2));}
    else{
      if(keys['w']||keys['W']||keys['ArrowUp'])s.left.y-=leftSPD*lUp;
      if(keys['s']||keys['S']||keys['ArrowDown'])s.left.y+=leftSPD*lUp;
      s.left.y=Math.max(0,Math.min(H-leftPH,s.left.y));
    }
    if(guestPaddleY!==null){s.right.y=Math.max(0,Math.min(H-rightPH,guestPaddleY-rightPH/2));}
    return;
  }
  // Slowmo: opponent's paddle speed drops to 30%
  const slowPU=getAPU('slowmo');
  const leftSPD=(slowPU&&slowPU.side!=='left')?SPD*.3*dt:SPD*dt;
  const rightSPD=(slowPU&&slowPU.side!=='right')?SPD*.3*dt:SPD*dt;
  // Invert: opponent's controls are flipped
  const invertPU=getAPU('invert');
  const invertLeft=invertPU&&invertPU.side!=='left';
  const invertRight=invertPU&&invertPU.side!=='right';
  const lUp=invertLeft?-1:1, rUp=invertRight?-1:1;
  const aiLeft=tourney?tourneyAI.left:false;
  const aiRight=tourney?tourneyAI.right:(mode==='ai');
  if(aiLeft&&aiRight){
    // Both AI — no keyboard input
    moveAI(s.left,s.ball,'left',dt);moveAI(s.right,s.ball,'right',dt);
  }else if(aiRight){
    if(keys['w']||keys['W']||keys['ArrowUp'])s.left.y-=leftSPD*lUp;
    if(keys['s']||keys['S']||keys['ArrowDown'])s.left.y+=leftSPD*lUp;
    moveAI(s.right,s.ball,'right',dt);
  }else if(aiLeft){
    if(keys['w']||keys['W']||keys['ArrowUp'])s.right.y-=rightSPD*rUp;
    if(keys['s']||keys['S']||keys['ArrowDown'])s.right.y+=rightSPD*rUp;
    moveAI(s.left,s.ball,'left',dt);
  }else{
    if(keys['w']||keys['W'])s.left.y-=leftSPD*lUp;if(keys['s']||keys['S'])s.left.y+=leftSPD*lUp;
    if(keys['ArrowUp'])s.right.y-=rightSPD*rUp;if(keys['ArrowDown'])s.right.y+=rightSPD*rUp;
  }
  if(touchY.left===null)s.left.y=Math.max(0,Math.min(H-leftPH,s.left.y));
  if(touchY.right===null)s.right.y=Math.max(0,Math.min(H-rightPH,s.right.y));
}
