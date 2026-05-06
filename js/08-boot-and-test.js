// ═══════════════════════════════════════════════════════════════════
// INTRO ANIMATION
// ═══════════════════════════════════════════════════════════════════
function runIntro(){
  // Title animation handled by CSS @keyframes titleBounce
}

// ═══════════════════════════════════════════════════════════════════
// TEST MODE
// ═══════════════════════════════════════════════════════════════════
let testPanelOpen=false;
function toggleTestPanel(){
  testPanelOpen=!testPanelOpen;
  if(testPanelOpen)buildTestButtons();
  document.getElementById('test-panel').style.display=testPanelOpen?'block':'none';
}
function buildTestButtons(){
  const cont=document.getElementById('test-pu-btns');
  const contR=document.getElementById('test-pu-btns-r');
  if(!cont||!contR)return;
  const leftFrag=document.createDocumentFragment();
  const rightFrag=document.createDocumentFragment();
  for(const key of PU_KEYS){
    const pu=POWER_UPS[key];
    const btnL=document.createElement('button');btnL.className='test-btn';
    btnL.style.borderLeft=`3px solid ${pu.color}`;
    btnL.innerHTML=safeTestPuLabel(key);
    btnL.onclick=()=>{if(state)activatePowerup(key,'left',performance.now());};
    leftFrag.appendChild(btnL);
    const btnR=document.createElement('button');btnR.className='test-btn';
    btnR.style.borderLeft=`3px solid ${pu.color}`;
    btnR.innerHTML=safeTestPuLabel(key);
    btnR.onclick=()=>{if(state)activatePowerup(key,'right',performance.now());};
    rightFrag.appendChild(btnR);
  }
  cont.replaceChildren(leftFrag);
  contR.replaceChildren(rightFrag);
  // Survival-only power-up test buttons
  const survCont=document.getElementById('test-surv-btns');
  if(!survCont)return;
  const survFrag=document.createDocumentFragment();
  const survOnlyKeys=(typeof SURV_PU_KEYS!=='undefined'?SURV_PU_KEYS:[]).filter(k=>SURV_ONLY_PUS.has(k));
  for(const key of survOnlyKeys){
    const pu=POWER_UPS[key];
    const btn=document.createElement('button');btn.className='test-btn';
    btn.style.borderLeft=`3px solid ${pu.color}`;
    btn.innerHTML=safeTestPuLabel(key);
    btn.onclick=()=>{if(survState)survActivatePU(key,performance.now());};
    survFrag.appendChild(btn);
  }
  survCont.replaceChildren(survFrag);
}
function updateTestPanelForMode(){
  const sec=document.getElementById('test-surv-section');
  if(sec)sec.style.display=gameMode==='survival'?'block':'none';
}
function testPuLabel(key){
  const pu=POWER_UPS[key];
  const icon=powerupIconHTML(key,pu.color,16);
  return `${icon}<span>${pu.name}</span>`;
}
function safeTestPuLabel(key){
  try{return testPuLabel(key);}
  catch(e){
    const pu=POWER_UPS[key]||{name:key,color:'#ccc'};
    console.warn('Power-up test icon failed',key,e);
    return `<span style="display:inline-block;width:16px;height:16px;background:${pu.color};"></span><span>${pu.name}</span>`;
  }
}
function testClearPU(){clearAllPowerups();fieldPowerups=[];}
function testScoreLeft(){if(state)state.left.score++;}
function testScoreRight(){if(state)state.right.score++;}
function testSpawnFieldPU(){spawnFieldPowerup(performance.now());}
function testResetBall(){if(state){state.ball.x=W/2;state.ball.y=H/2;state.ball.vx=BASE_SPEED;state.ball.vy=1;}}
function testMaxSpeed(){if(state){const spd=12;const ang=Math.atan2(state.ball.vy,state.ball.vx);state.ball.vx=Math.cos(ang)*spd;state.ball.vy=Math.sin(ang)*spd;}}
function testSlowSpeed(){if(state){const spd=2;const ang=Math.atan2(state.ball.vy,state.ball.vx);state.ball.vx=Math.cos(ang)*spd;state.ball.vy=Math.sin(ang)*spd;}}
// ═══════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════
decoratePongButtons();buildSkinGrid();applyMenuSkin();
setWin(7);setDiff('medium');setMatch(1);setGameMode('classic');
buildLeaderboard();
try{buildTestButtons();}catch(e){console.error('Test panel failed',e);}
setupTouch();
fitCanvasToViewport();
runIntro();

// Prevent stale cached game files while the visual theme is evolving.
if('serviceWorker'in navigator){
  navigator.serviceWorker.getRegistrations()
    .then(regs=>regs.forEach(reg=>reg.unregister()))
    .catch(e=>console.warn('SW cleanup failed',e));
}
