// ═══════════════════════════════════════════════════════════════════
// SKINS
// ═══════════════════════════════════════════════════════════════════
const SKINS={
  retro:{name:'Retro',desc:'old & basic',bg:'#000',fg:'#fff',accent:'#fff',midline:'#2a2a2a',ballShape:'square',paddleShape:'rect',scoreFont:'bold 46px monospace',labelFont:'11px monospace',menuBg:'#000',menuFg:'#fff',particleColor:(l)=>{const v=Math.floor(180+l*75);return`rgb(${v},${v},${v})`;},puBg:'rgba(30,30,30,.95)',puText:'#fff',brickColors:['#fff','#ccc','#aaa','#888']},
  modern:{name:'Modern',desc:'21st Century',bg:'#121420',fg:'#f5f2f0',accent:'#b76d68',midline:'#403f4c',ballShape:'pixel',paddleShape:'pixel',scoreFont:"bold 46px 'Courier New',monospace",labelFont:"11px 'Courier New',monospace",menuBg:'#121420',menuFg:'#f5f2f0',menuPanel:'#1b2432',menuSoft:'#2c2b3c',particleColor:(l)=>`rgba(183,109,104,${l})`,puBg:'rgba(18,20,32,.95)',puText:'#f5f2f0',brickColors:['#b76d68','#403f4c','#2c2b3c','#1b2432'],modern:true},
  abstract:{name:'Abstract',desc:'bauhaus & bold',bg:'#0a0a0a',fg:'#cc2222',accent:'#f0e8d0',midline:'#1a1a1a',ballShape:'diamond',paddleShape:'thin',scoreFont:'bold 46px monospace',labelFont:'11px monospace',menuBg:'#0a0a0a',menuFg:'#cc2222',particleColor:(l)=>{const p=[[204,34,34],[50,80,180],[210,180,50]];const c=p[Math.floor(Math.random()*3)];return`rgba(${c[0]},${c[1]},${c[2]},${l})`;},chaos:true,bauhaus:true,puBg:'rgba(10,10,10,.95)',puText:'#f0e8d0',brickColors:['#cc2222','#f0e8d0','#3250b4','#d2b432']},
  forest:{name:'Forest',desc:'zen & tranquil',bg:'#060d06',fg:'#5a8a50',accent:'#d4a030',midline:'#0e1a0e',ballShape:'circle',paddleShape:'rounded',scoreFont:'bold 46px Georgia',labelFont:'11px Georgia',menuBg:'#060d06',menuFg:'#5a8a50',particleColor:(l)=>{const r=Math.floor(180+l*40),g=Math.floor(140+l*50);return`rgba(${r},${g},60,${l})`;},puBg:'rgba(6,13,6,.95)',puText:'#d4a030',brickColors:['#5a8a50','#3d6835','#8ab870','#d4a030'],zen:true},
  neon:{name:'Neon',desc:'cyberpunk glow',bg:'#05050f',fg:'#00f0ff',accent:'#ff00e6',midline:'#0a0a1a',ballShape:'circle',paddleShape:'rounded',scoreFont:"bold 46px 'Courier New',monospace",labelFont:"11px 'Courier New',monospace",menuBg:'#05050f',menuFg:'#00f0ff',particleColor:(l)=>`rgba(255,0,230,${l})`,puBg:'rgba(5,5,15,.95)',puText:'#00f0ff',brickColors:['#00f0ff','#ff00e6','#a855f7','#39ff14'],neonGlow:true},
  deco:{name:'Deco',desc:'art deco gold',bg:'#08080e',fg:'#c9a84c',accent:'#f0e2b6',midline:'#1a1510',ballShape:'circle',paddleShape:'deco',scoreFont:"bold 46px Georgia,serif",labelFont:"11px Georgia,serif",menuBg:'#08080e',menuFg:'#c9a84c',particleColor:(l)=>{const g=Math.floor(168+l*40),r=Math.floor(200+l*55);return`rgba(${r},${g},76,${l})`;},puBg:'rgba(8,8,14,.95)',puText:'#f0e2b6',brickColors:['#c9a84c','#a0853a','#7a6530','#f0e2b6'],deco:true}
};

// ═══════════════════════════════════════════════════════════════════
// POWER-UPS (tuned durations)
// ═══════════════════════════════════════════════════════════════════
const POWER_UPS={
  decoy:      {name:'DECOY',       desc:'Multi-ball chaos!',       icon:'🎭',color:'#ff6b35',duration:4500},
  bouncy:     {name:'BOUNCY BALL', desc:'Extra springy!',         icon:'🏀',color:'#ff9f1c',duration:5500},
  lead:       {name:'LEAD BALL',   desc:'Heavy & sluggish...',     icon:'⚫',color:'#888',   duration:4500},
  curve:      {name:'CURVE BALL',  desc:'Ball curves in flight!', icon:'🌀',color:'#a855f7',duration:5500},
  bigball:    {name:'BIG BALL',    desc:'Impossible to miss!',    icon:'🔵',color:'#3b82f6',duration:4500},
  smallball:  {name:'SMALL BALL',  desc:'Tiny & tricky...',       icon:'🔴',color:'#ef4444',duration:4500},
  widepaddle: {name:'WIDE PADDLE', desc:'Your paddle grows!',     icon:'_wide_',color:'#22c55e',duration:6000,paddle:true},
  shortpaddle:{name:'SHORT PADDLE',desc:"Opponent shrinks!",      icon:'_short_',color:'#f43f5e',duration:6000,paddle:true},
  blackhole:  {name:'BLACK HOLE',  desc:'Ball teleports randomly!',icon:'🕳️',color:'#6b21a8',duration:0},
  slowmo:     {name:'SLOW MO',     desc:'Opponent paddle slows!', icon:'🐌',color:'#f59e0b',duration:5000},
  defender:   {name:'DEFENDER',    desc:'AI ally guards your goal!',icon:'🛡️',color:'#06b6d4',duration:5500},
  shield:     {name:'SHIELD',      desc:'Blocks one goal!',       icon:'🔰',color:'#10b981',duration:20000},
  magnet:     {name:'MAGNET',      desc:'Returns gravitate to you!',icon:'🧲',color:'#ec4899',duration:5500},
  curvedpaddle:{name:'CURVED',     desc:'Opponent paddle curves!',icon:'🪃',color:'#f97316',duration:6000},
  ghost:      {name:'GHOST BALL',  desc:'Ball nearly invisible!', icon:'👻',color:'#94a3b8',duration:5000},
  invert:     {name:'INVERT',      desc:'Opponent controls flip!',icon:'🔄',color:'#8b5cf6',duration:5500},
  portal:     {name:'PORTAL',      desc:'Two linked portals!',    icon:'🌀',color:'#2dd4bf',duration:12000},
  // Survival-only power-ups
  laser:      {name:'LASER',       desc:'Paddle fires a laser!',  icon:'⚡',color:'#00bfff',duration:4000},
  freeze:     {name:'FREEZE',      desc:'Bricks stop moving!',    icon:'❄️',color:'#67e8f9',duration:5000},
  bomb:       {name:'BOMB',        desc:'Next hit explodes!',     icon:'💣',color:'#ff4500',duration:15000},
  multiball:  {name:'MULTI-BALL',  desc:'Ball splits into 3!',    icon:'⚪',color:'#e2e8f0',duration:0},
  survslowmo: {name:'SLOW-MO',     desc:'Bricks slow down!',      icon:'🐌',color:'#fbbf24',duration:8000},
  magnetpaddle:{name:'MAGNET PAD', desc:'Ball sticks to paddle!', icon:'🧲',color:'#f472b6',duration:10000},
  fireball:   {name:'FIREBALL',    desc:'Ball burns through!',    icon:'🔥',color:'#f97316',duration:5000},
  shrinkrow:  {name:'SHRINK ROW',  desc:'Bottom row vanishes!',   icon:'💨',color:'#a78bfa',duration:0},
};
const SURV_ONLY_PUS=new Set(['laser','freeze','bomb','multiball','survslowmo','magnetpaddle','fireball','shrinkrow']);
const PU_KEYS=Object.keys(POWER_UPS).filter(k=>!SURV_ONLY_PUS.has(k));
const BRICKS_PU_KEYS=[...PU_KEYS,'freeze'];
const POWERUP_SPAWN_INTERVAL=9000, POWERUP_LIFESPAN=11000;
const CHAOS_SPAWN_INTERVAL=2000;

// ═══════════════════════════════════════════════════════════════════
// GAME MODE
// ═══════════════════════════════════════════════════════════════════
let gameMode='classic';
function setGameMode(m){
  gameMode=m;
  document.querySelectorAll('#gamemode-opts .opt-btn').forEach(b=>b.classList.toggle('sel',b.dataset.gm===m));
  if(typeof updateTestPanelForMode==='function')updateTestPanelForMode();
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS & PERSISTENT STATE
// ═══════════════════════════════════════════════════════════════════
let currentSkin='modern', winScore=7, matchFormat=1, aiDiff='medium';
let nameLeft='Player 1', nameRight='Player 2';

function loadStats(){try{return JSON.parse(localStorage.getItem('pong_stats')||'{}');}catch{return {};}}
function saveStats(s){try{localStorage.setItem('pong_stats',JSON.stringify(s));}catch{}}
function getPlayerStats(name,gm){
  const s=loadStats();
  if(!s[name])s[name]={};
  if(!s[name][gm])s[name][gm]={wins:0,losses:0,rallypb:0,survpb:0,lastPlayed:null,gamesPlayed:0,bricksBroken:0};
  const p=s[name][gm];
  // Backfill for older saves missing new fields
  if(p.gamesPlayed===undefined)p.gamesPlayed=p.wins+p.losses;
  if(p.bricksBroken===undefined)p.bricksBroken=0;
  return{stats:s,player:p,save:()=>saveStats(s)};
}
function recordWin(name){
  const gm=gameMode||'classic';
  const{player,save}=getPlayerStats(name,gm);
  player.wins++;player.gamesPlayed++;player.lastPlayed=new Date().toISOString().slice(0,10);save();
}
function recordLoss(name){
  const gm=gameMode||'classic';
  const{player,save}=getPlayerStats(name,gm);
  player.losses++;player.gamesPlayed++;player.lastPlayed=new Date().toISOString().slice(0,10);save();
}
function recordBricks(name,count){
  if(count<=0)return;
  const gm=gameMode||'classic';
  const{player,save}=getPlayerStats(name,gm);
  player.bricksBroken=(player.bricksBroken||0)+count;save();
}
function recordRallyPB(name,rally){
  const gm=gameMode||'classic';
  const{player,save}=getPlayerStats(name,gm);
  if(rally>player.rallypb){player.rallypb=rally;save();return true;}
  return false;
}
function recordSurvivalTime(name,ms){
  const{player,save}=getPlayerStats(name,'survival');
  const secs=ms/1000;
  if(secs>player.survpb){player.survpb=secs;player.lastPlayed=new Date().toISOString().slice(0,10);save();return true;}
  player.lastPlayed=new Date().toISOString().slice(0,10);save();
  return false;
}
function globalRallyPB(){
  const s=loadStats();let pb=0;
  Object.values(s).forEach(p=>{Object.values(p).forEach(v=>{if(v.rallypb>pb)pb=v.rallypb;});});
  return pb;
}

// ═══════════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════════
const ACHIEVEMENTS={
  untouched:{name:'Untouched',icon:'🛡️',desc:'Win a set without opponent scoring'},
  railrider:{name:'Rail Rider',icon:'🔥',desc:'15+ rally hits in a match'},
  comeback:{name:'Come Back Kid',icon:'🔄',desc:'Win after being 3+ points down'},
  brickmaster:{name:'Brick Breaker',icon:'🧱',desc:'Break 10+ bricks in one game'},
  speedemon:{name:'Speed Demon',icon:'⚡',desc:'Hit rally 10+ in a match'},
  survivor60:{name:'Survivor',icon:'🕐',desc:'Last 60s in survival mode'},
  survivor120:{name:'Iron Will',icon:'💎',desc:'Last 120s in survival mode'},
  chaoswin:{name:'Chaos Champion',icon:'🌀',desc:'Win a match in chaos mode'},
};
function loadBadges(){try{return JSON.parse(localStorage.getItem('pong_badges')||'{}');}catch{return {};}}
function saveBadges(b){try{localStorage.setItem('pong_badges',JSON.stringify(b));}catch{}}
function awardBadge(player,id){
  const b=loadBadges();
  if(!b[player])b[player]=[];
  if(b[player].includes(id))return false;
  b[player].push(id);saveBadges(b);return true;
}
function playerBadges(player){const b=loadBadges();return(b[player]||[]);}
let newBadgesThisRound=[];
function checkAchievements(winner,loser,winnerScore,loserScore){
  newBadgesThisRound=[];
  const wname=playerName(winner),lname=opponentName(winner);
  // Untouched: opponent scored 0
  if(loserScore===0&&winnerScore>=5){if(awardBadge(wname,'untouched'))newBadgesThisRound.push({player:wname,id:'untouched'});}
  // Rail Rider: 15+ rally
  if(sessionRallyPB>=15){
    if(awardBadge(wname,'railrider'))newBadgesThisRound.push({player:wname,id:'railrider'});
    if(awardBadge(lname,'railrider'))newBadgesThisRound.push({player:lname,id:'railrider'});
  }
  // Speed Demon: 10+ rally
  if(sessionRallyPB>=10){
    if(awardBadge(wname,'speedemon'))newBadgesThisRound.push({player:wname,id:'speedemon'});
    if(awardBadge(lname,'speedemon'))newBadgesThisRound.push({player:lname,id:'speedemon'});
  }
  // Come Back Kid: winner was down by 3+
  if(state._maxDeficit&&state._maxDeficit[winner]>=3){
    if(awardBadge(wname,'comeback'))newBadgesThisRound.push({player:wname,id:'comeback'});
  }
  // Brick Breaker: 10+ bricks
  if(gameMode==='bricks'&&brickPoints[winner]>=10){
    if(awardBadge(wname,'brickmaster'))newBadgesThisRound.push({player:wname,id:'brickmaster'});
  }
  // Chaos Champion
  if(gameMode==='chaos'){
    if(awardBadge(wname,'chaoswin'))newBadgesThisRound.push({player:wname,id:'chaoswin'});
  }
}
function checkSurvivalAchievements(player,ms){
  newBadgesThisRound=[];
  const secs=ms/1000;
  if(secs>=60){if(awardBadge(player,'survivor60'))newBadgesThisRound.push({player,id:'survivor60'});}
  if(secs>=120){if(awardBadge(player,'survivor120'))newBadgesThisRound.push({player,id:'survivor120'});}
}

let currentLbTab='classic';
function switchLbTab(tab){
  currentLbTab=tab;
  document.querySelectorAll('.lb-tab').forEach(b=>{b.classList.toggle('active',b.textContent.toLowerCase()===tab);});
  buildLeaderboard();
}
function buildLeaderboard(){
  const s=loadStats();
  const lb=document.getElementById('lboard');
  const tab=currentLbTab;
  const isSurv=tab==='survival';
  // Gather entries for this mode
  const entries=[];
  for(const[name,modes]of Object.entries(s)){
    const v=modes[tab];
    if(!v)continue;
    if(isSurv){if(v.survpb>0)entries.push([name,v]);}
    else{if(v.wins>0||v.losses>0)entries.push([name,v]);}
  }
  if(!entries.length){lb.innerHTML='<div style="opacity:.3;font-size:11px;letter-spacing:1px;font-family:Georgia,serif;">no games played yet</div>';return;}
  if(isSurv){
    entries.sort((a,b)=>b[1].survpb-a[1].survpb);
    lb.innerHTML=`<div class="lb-row lb-head"><span>Name</span><span>Best Time</span><span>Last Played</span></div>`
      +entries.slice(0,8).map(([name,v])=>{
        const lp=v.lastPlayed?formatDate(v.lastPlayed):'—';
        const badges=playerBadges(name).map(id=>ACHIEVEMENTS[id]?.icon||'').join('');
        return`<div class="lb-row"><span>${escapeHtml(name)} ${badges}</span><span>${v.survpb.toFixed(1)}s</span><span>${lp}</span></div>`;
      }).join('');
  }else{
    entries.sort((a,b)=>b[1].wins-a[1].wins);
    const isBricks=tab==='bricks';
    lb.innerHTML=`<div class="lb-row lb-head"><span>Name</span><span>W</span><span>L</span><span>Rally PB</span>${isBricks?'<span>Bricks</span>':''}<span>Games</span></div>`
      +entries.slice(0,8).map(([name,v])=>{
        const badges=playerBadges(name).map(id=>ACHIEVEMENTS[id]?.icon||'').join('');
        return`<div class="lb-row"><span>${escapeHtml(name)} ${badges}</span><span>${v.wins}</span><span>${v.losses}</span><span>${v.rallypb||0}</span>${isBricks?`<span>${v.bricksBroken||0}</span>`:''}<span>${v.gamesPlayed||v.wins+v.losses}</span></div>`;
      }).join('');
  }
}

function formatDate(iso){
  if(!iso)return'—';
  const d=new Date(iso+'T00:00:00');
  const now=new Date(),today=now.toISOString().slice(0,10);
  const yesterday=new Date(now-864e5).toISOString().slice(0,10);
  if(iso===today)return'today';
  if(iso===yesterday)return'yesterday';
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return`${months[d.getMonth()]} ${d.getDate()}`;
}

// ═══════════════════════════════════════════════════════════════════
// MATCH STATE
// ═══════════════════════════════════════════════════════════════════
let matchSets={left:0,right:0};
let currentSet=0;
let lastMode='2p';

// ═══════════════════════════════════════════════════════════════════
// CANVAS & GAME STATE (High-DPI support)
// ═══════════════════════════════════════════════════════════════════
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
let W=700,H=450;const PW=12,PH=80;
const MARGIN=16;
const dpr=window.devicePixelRatio||1;
canvas.width=(W+MARGIN*2)*dpr;canvas.height=(H+MARGIN*2)*dpr;
canvas.style.width=(W+MARGIN*2)+'px';canvas.style.height=(H+MARGIN*2)+'px';
ctx.scale(dpr,dpr);

function resizeCanvas(w,h){
  W=w;H=h;
  canvas.width=(W+MARGIN*2)*dpr;canvas.height=(H+MARGIN*2)*dpr;
  canvas.style.width=(W+MARGIN*2)+'px';canvas.style.height=(H+MARGIN*2)+'px';
  ctx.setTransform(1,0,0,1,0,0);ctx.scale(dpr,dpr);
  fitCanvasToViewport();
}
function fillCanvasBg(color){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=color;ctx.fillRect(0,0,W+MARGIN*2,H+MARGIN*2);ctx.restore();}

// Responsive: scale canvas to fit viewport
let canvasScale=1;
function fitCanvasToViewport(){
  const wrap=document.getElementById('canvas-wrap');
  const gui=document.getElementById('game-ui');
  const pw=document.getElementById('pw');
  if(!wrap)return;
  wrap.style.position='relative';
  wrap.style.left='';wrap.style.top='';
  const cw=W+MARGIN*2,ch=H+MARGIN*2;
  const vw=window.innerWidth,vh=window.visualViewport?window.visualViewport.height:window.innerHeight;
  const isMobile=vw<760;

  if(inGameplay){
    const barH=isMobile?56:44;
    const maxW=vw-(isMobile?4:16);
    const maxH=vh-barH-(isMobile?4:16);
    const s=Math.min(1,maxW/cw,maxH/ch);
    canvasScale=s;
    const sw=Math.floor(cw*s),sh=Math.floor(ch*s);
    wrap.style.width=sw+'px';wrap.style.height=sh+'px';
    canvas.style.width=sw+'px';canvas.style.height=sh+'px';
    wrap.style.transform='';
    wrap.style.transformOrigin='top left';
    wrap.style.marginBottom='0px';
  }else{
    pw.style.padding='';
    if(gui){gui.style.height='';gui.style.maxHeight='';gui.style.overflow='visible';gui.style.justifyContent='center';}
    const maxW=vw-(isMobile?8:16);
    const barH=inGameplay?80:0;
    const maxH=vh-barH-(isMobile?8:16);
    const s=Math.min(1,maxW/cw,maxH/ch);
    canvasScale=s;
    const sw=Math.floor(cw*s),sh=Math.floor(ch*s);
    wrap.style.width=sw+'px';wrap.style.height=sh+'px';
    canvas.style.width=sw+'px';canvas.style.height=sh+'px';
    wrap.style.transform='';
    wrap.style.transformOrigin='top left';
    wrap.style.marginBottom='0px';
  }
}
window.addEventListener('resize',fitCanvasToViewport);
window.addEventListener('orientationchange',()=>setTimeout(fitCanvasToViewport,200));

// ═══════════════════════════════════════════════════════════════════
// LANDSCAPE PROMPT (mobile only)
// ═══════════════════════════════════════════════════════════════════
let rotateDismissed=false, inGameplay=false;
const isMobileDevice=('ontouchstart'in window)&&window.innerWidth<1024;

function isPortrait(){return window.innerHeight>window.innerWidth;}

function checkRotatePrompt(){
  if(!isMobileDevice||rotateDismissed||!inGameplay){
    document.getElementById('rotate-prompt').style.display='none';return;
  }
  document.getElementById('rotate-prompt').style.display=isPortrait()?'flex':'none';
}

function dismissRotatePrompt(){
  rotateDismissed=true;
  document.getElementById('rotate-prompt').style.display='none';
}

function enterGameplay(){
  inGameplay=true;rotateDismissed=false;
  window.scrollTo(0,0);
  document.body.classList.add('in-gameplay');checkRotatePrompt();
}
function exitGameplay(){
  inGameplay=false;document.body.classList.remove('in-gameplay');checkRotatePrompt();
}

window.addEventListener('resize',checkRotatePrompt);
window.addEventListener('orientationchange',()=>setTimeout(checkRotatePrompt,250));

const AI_SPEED={easy:2.2,medium:3.8,hard:5.6};
const AI_ERROR={easy:70,medium:38,hard:6};
const BASE_SPEED=4.5,SPEED_RAMP=0.06,MAX_SPEED=14;
function rallySpeedBonus(hits){
  // Linear ramp up to rally 10, then gentler logarithmic scaling
  if(hits<=10)return SPEED_RAMP*hits;
  const bonus=SPEED_RAMP*10+SPEED_RAMP*Math.log2(hits-9)*2;
  return Math.min(bonus,MAX_SPEED-BASE_SPEED); // never exceed max
}

let mode,animId,paused=false,state,particles=[];
const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TARGET_FRAME_MS=1000/60; // 16.667ms — normalize dt so 1.0 = 60fps
let lastFrameTime=0;
let _drawDt=1; // passed to draw functions for visual decay
let chaosHue=0,keys={};
let serving=false,serveSide='left',countdown=0,countdownT=0;
let shakeAmt=0;
let rallyHits=0,sessionRallyPB=0,rallyPopT=0;
let ballTrail=[];
let leftScoreFlash=0,rightScoreFlash=0;
let prevRallyHits=0,rallyShake=0;
let brickPoints={left:0,right:0},lastBrickToucher=null;
let brickMovePhase=0,brickRings=1;
let aiError=0;
let serveAimAngle=0;
let fieldPowerups=[],activePowerups=[],nextPuSpawn=0,puPopupTimeout=null;
// Helpers for querying active power-ups
function hasAPU(type){return activePowerups.some(p=>p.type===type);}
function getAPU(type){return activePowerups.find(p=>p.type===type);}
function anyAPU(){return activePowerups.length>0;}
function getAPUSide(type){const p=getAPU(type);return p?p.side:null;}
let decoyBalls=[],leadPreSpeed=null;
let shieldSide=null; // which side has an active shield
let defenderPaddle=null; // {side,y} — small AI-controlled paddle near goal
let portalA=null,portalB=null; // {x,y} for linked portals
let blackholePos=null; // {x,y} for the black hole on field
let introPhase=true,introT=0;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function getPH(side){
  let h=PH;
  for(const ap of activePowerups){
    if(ap.type==='widepaddle'&&ap.side===side)h=Math.max(h,PH*1.8);
    if(ap.type==='shortpaddle'&&ap.side!==side)h=Math.min(h,PH*.45);
  }
  return h;
}
function getBallSize(){
  if(hasAPU('bigball'))return 26;
  if(hasAPU('smallball'))return 5;
  return 10;
}
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,ch=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));
}
function playerName(side){return side==='left'?nameLeft:nameRight;}
function opponentName(side){return side==='left'?nameRight:nameLeft;}

// ═══════════════════════════════════════════════════════════════════
// MENU SETTERS
// ═══════════════════════════════════════════════════════════════════
function setWin(n){winScore=n;document.querySelectorAll('#score-opts .opt-btn').forEach(b=>b.classList.toggle('sel',+b.dataset.score===n));}
function setDiff(d){aiDiff=d;document.querySelectorAll('#diff-opts .opt-btn').forEach(b=>b.classList.toggle('sel',b.dataset.diff===d));}
function setMatch(n){matchFormat=n;document.querySelectorAll('#match-opts .opt-btn').forEach(b=>b.classList.toggle('sel',+b.dataset.match===n));}

function pongIcon(name){
  return `<span class="pong-icon pong-icon-${name}" aria-hidden="true"></span>`;
}
function setPongButton(id,icon,label){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=`${pongIcon(icon)}<span>${label}</span>`;
}

function decoratePongButtons(){
  const labels={
    btn2p:`${pongIcon('multiplayer')}<span>2 Players</span>`,
    btnai:`${pongIcon('bot')}<span>vs AI</span>`,
    btntourney:`${pongIcon('cup')}<span>Tournament</span>`,
    pbtn:`${pongIcon('pause')}<span>Pause</span>`,
    mutebtn:`${pongIcon('volume')}<span class="sr-only">Sound</span>`,
    rabtn:`${pongIcon('play')}<span>Continue</span>`,
    rmbtn:`${pongIcon('menu')}<span>Menu</span>`,
    mrabtn:`${pongIcon('play')}<span>Rematch</span>`,
    mrmbtn:`${pongIcon('menu')}<span>Menu</span>`,
    'tourney-add-human':`${pongIcon('p1')}<span>+ Player</span>`,
    'tourney-add-ai':`${pongIcon('bot')}<span>+ AI</span>`,
    'tourney-start-btn':`${pongIcon('play')}<span>Start Tournament</span>`,
    'tourney-play-btn':`${pongIcon('play')}<span>Play Next Match</span>`,
    'surv-go-btn':`${pongIcon('play')}<span>Start</span>`
  };
  Object.entries(labels).forEach(([id,html])=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});
}

// ═══════════════════════════════════════════════════════════════════
// SKIN GRID
// ═══════════════════════════════════════════════════════════════════
function buildSkinGrid(){
  const grid=document.getElementById('skin-grid');grid.innerHTML='';
  Object.entries(SKINS).forEach(([key,s])=>{
    const btn=document.createElement('div');
    btn.className='skin-btn'+(key===currentSkin?' active':'');
    btn.style.background=s.menuBg;btn.style.color=s.menuFg;
    btn.onclick=()=>{currentSkin=key;applyMenuSkin();buildSkinGrid();};
    const prev=document.createElement('div');prev.className='skin-preview';prev.style.background=s.bg;
    const rx=s.paddleShape==='rounded'?3:s.paddleShape==='thin'?1:0;
    const decoMidline=s.modern?`<rect x="39" y="7" width="2" height="6" fill="${s.midline}"/><rect x="39" y="18" width="2" height="6" fill="${s.midline}"/><rect x="39" y="29" width="2" height="6" fill="${s.midline}"/><rect x="39" y="40" width="2" height="6" fill="${s.midline}"/>`:s.deco?`<polygon points="40,10 43,15 40,20 37,15" fill="${s.fg}" opacity=".15"/><polygon points="40,22 43,27 40,32 37,27" fill="${s.fg}" opacity=".15"/><polygon points="40,34 43,39 40,44 37,39" fill="${s.fg}" opacity=".15"/><circle cx="40" cy="25" r="12" fill="none" stroke="${s.fg}" stroke-width=".5" opacity=".1"/>`:s.zen?`<path d="M40,0 Q44,12 38,25 Q42,38 40,50" stroke="#3d6835" stroke-width="1" fill="none" opacity=".3"/><ellipse cx="44" cy="15" rx="3" ry="1.5" fill="#4a7a40" opacity=".2"/><ellipse cx="36" cy="35" rx="3" ry="1.5" fill="#4a7a40" opacity=".2"/>`:s.bauhaus?`<line x1="40" y1="0" x2="40" y2="50" stroke="#f0e8d0" stroke-width="1.5" opacity=".12"/><circle cx="40" cy="12" r="3" fill="none" stroke="#f0e8d0" stroke-width=".5" opacity=".1"/><circle cx="40" cy="38" r="3" fill="none" stroke="#f0e8d0" stroke-width=".5" opacity=".1"/>`:`<line x1="40" y1="0" x2="40" y2="50" stroke="${s.midline}" stroke-width="1" stroke-dasharray="4,4"/>`;
    const decoPaddle=s.modern?`<rect x="4" y="9" width="9" height="32" fill="${s.accent}"/><rect x="7" y="12" width="2" height="26" fill="#e09791" opacity=".45"/><rect x="67" y="9" width="9" height="32" fill="${s.accent}"/><rect x="70" y="12" width="2" height="26" fill="#e09791" opacity=".45"/>`:s.deco?`<rect x="2" y="12" width="10" height="2" fill="${s.fg}"/><rect x="3" y="14" width="8" height="20" fill="${s.fg}"/><rect x="2" y="34" width="10" height="2" fill="${s.fg}"/><rect x="68" y="12" width="10" height="2" fill="${s.fg}"/><rect x="69" y="14" width="8" height="20" fill="${s.fg}"/><rect x="68" y="34" width="10" height="2" fill="${s.fg}"/>`:s.bauhaus?`<rect x="4" y="14" width="4" height="22" fill="#cc2222"/><rect x="72" y="14" width="4" height="22" fill="#cc2222"/>`:`<rect x="4" y="12" width="${s.paddleShape==='thin'?4:6}" height="26" rx="${rx}" fill="${s.fg}"/><rect x="${s.paddleShape==='thin'?72:70}" y="12" width="${s.paddleShape==='thin'?4:6}" height="26" rx="${rx}" fill="${s.fg}"/>`;
    const decoRays=s.deco?[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4;return`<line x1="40" y1="25" x2="${40+Math.cos(a)*35}" y2="${25+Math.sin(a)*22}" stroke="${s.fg}" stroke-width=".5" opacity=".04"/>`;}).join(''):'';
    const zenBg=s.zen?`<line x1="16" y1="0" x2="16" y2="50" stroke="#2a4a20" stroke-width="1.5" opacity=".08"/><line x1="64" y1="0" x2="64" y2="50" stroke="#2a4a20" stroke-width="1.5" opacity=".08"/><ellipse cx="22" cy="10" rx="4" ry="2" fill="#5a8a50" opacity=".12" transform="rotate(-20,22,10)"/><ellipse cx="58" cy="40" rx="4" ry="2" fill="#d4a030" opacity=".12" transform="rotate(15,58,40)"/>`:'';
    const bauhausBg=s.bauhaus?`<line x1="0" y1="0" x2="80" y2="50" stroke="#cc2222" stroke-width=".5" opacity=".06"/><line x1="80" y1="0" x2="0" y2="50" stroke="#cc2222" stroke-width=".5" opacity=".06"/><rect x="10" y="8" width="10" height="18" fill="#cc2222" opacity=".05"/><circle cx="62" cy="16" r="8" fill="#3250b4" opacity=".05"/><rect x="50" y="32" width="14" height="10" fill="#d2b432" opacity=".05"/>`:'';
    prev.innerHTML=`<svg width="80" height="50" xmlns="http://www.w3.org/2000/svg">
      ${decoRays}${zenBg}${bauhausBg}${decoMidline}${decoPaddle}
      ${s.ballShape==='pixel'?`<rect x="36" y="21" width="8" height="8" fill="${s.accent}"/><rect x="34" y="23" width="12" height="4" fill="${s.accent}"/>`
        :s.ballShape==='circle'?`<circle cx="40" cy="25" r="4" fill="${s.accent}"/>`
        :s.ballShape==='diamond'?`<polygon points="40,20 45,25 40,30 35,25" fill="${s.accent}"/>`
        :`<rect x="37" y="22" width="6" height="6" fill="${s.accent}"/>`}
      ${s.neonGlow?`<circle cx="40" cy="25" r="6" fill="none" stroke="${s.accent}" stroke-width="1" opacity=".3"/>`:''}
      ${s.zen?`<circle cx="40" cy="25" r="7" fill="#d4a030" opacity=".08"/>`:''}
      ${s.deco?`<circle cx="40" cy="25" r="6" fill="none" stroke="${s.fg}" stroke-width=".5" opacity=".2"/>`:''}
    </svg>`;
    btn.appendChild(prev);
    const lbl=document.createElement('div');lbl.textContent=s.name;
    const desc=document.createElement('div');desc.style.opacity='.5';desc.style.fontSize='10px';desc.textContent=s.desc;
    btn.appendChild(lbl);btn.appendChild(desc);grid.appendChild(btn);
  });
}
function applyMenuSkin(){
  const s=SKINS[currentSkin],pw=document.getElementById('pw');
  const bg=s.modern?`radial-gradient(circle at 50% 0%, ${s.menuPanel} 0%, ${s.menuBg} 58%, #0b111c 100%)`:s.menuBg;
  pw.style.background=bg;pw.style.color=s.menuFg;
  document.body.style.background=bg;
  document.documentElement.style.background=s.menuBg;
  document.body.classList.toggle('skin-modern',!!s.modern);
  document.getElementById('menu-title').style.color=s.menuFg;
  document.querySelectorAll('.btn').forEach(b=>{b.style.background=s.menuFg;b.style.color=s.menuBg;});
  document.querySelectorAll('.opt-btn').forEach(b=>{b.style.borderColor=s.menuFg;b.style.color=s.menuFg;b.style.setProperty('--menu-bg',s.menuBg);b.style.setProperty('--menu-fg',s.menuFg);});
  document.querySelectorAll('.name-input').forEach(b=>{b.style.borderColor=s.menuFg;b.style.color=s.menuFg;});
}
function applyGameSkin(){
  const s=SKINS[currentSkin];
  document.getElementById('pw').style.background=s.bg;
  document.body.style.background=s.bg;
  document.documentElement.style.background=s.bg;
  document.getElementById('bar').style.color=s.fg;
  document.querySelectorAll('.btn-o').forEach(b=>b.style.color=s.fg);
  document.getElementById('mlabel').style.color=s.fg;
  document.getElementById('kb-legend').style.color=s.fg;
  document.getElementById('vol-slider').style.color=s.fg;
}
