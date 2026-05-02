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
  document.getElementById('test-panel').style.display=testPanelOpen?'block':'none';
}
function buildTestButtons(){
  const cont=document.getElementById('test-pu-btns');
  const contR=document.getElementById('test-pu-btns-r');
  for(const key of PU_KEYS){
    const pu=POWER_UPS[key];
    const btnL=document.createElement('button');btnL.className='test-btn';
    btnL.style.borderLeft=`3px solid ${pu.color}`;
    btnL.textContent=`${pu.name}`;
    btnL.onclick=()=>{if(state)activatePowerup(key,'left',performance.now());};
    cont.appendChild(btnL);
    const btnR=document.createElement('button');btnR.className='test-btn';
    btnR.style.borderLeft=`3px solid ${pu.color}`;
    btnR.textContent=`${pu.name}`;
    btnR.onclick=()=>{if(state)activatePowerup(key,'right',performance.now());};
    contR.appendChild(btnR);
  }
  // Survival-only power-up test buttons
  const survCont=document.getElementById('test-surv-btns');
  const survOnlyKeys=SURV_PU_KEYS.filter(k=>SURV_ONLY_PUS.has(k));
  for(const key of survOnlyKeys){
    const pu=POWER_UPS[key];
    const btn=document.createElement('button');btn.className='test-btn';
    btn.style.borderLeft=`3px solid ${pu.color}`;
    btn.textContent=`${pu.icon} ${pu.name}`;
    btn.onclick=()=>{if(survState)survActivatePU(key,performance.now());};
    survCont.appendChild(btn);
  }
}
function updateTestPanelForMode(){
  const sec=document.getElementById('test-surv-section');
  if(sec)sec.style.display=gameMode==='survival'?'block':'none';
}
function testClearPU(){clearAllPowerups();fieldPowerups=[];}
function testScoreLeft(){if(state)state.left.score++;}
function testScoreRight(){if(state)state.right.score++;}
function testSpawnFieldPU(){spawnFieldPowerup(performance.now());}
function testResetBall(){if(state){state.ball.x=W/2;state.ball.y=H/2;state.ball.vx=BASE_SPEED;state.ball.vy=1;}}
function testMaxSpeed(){if(state){const spd=12;const ang=Math.atan2(state.ball.vy,state.ball.vx);state.ball.vx=Math.cos(ang)*spd;state.ball.vy=Math.sin(ang)*spd;}}
function testSlowSpeed(){if(state){const spd=2;const ang=Math.atan2(state.ball.vy,state.ball.vx);state.ball.vx=Math.cos(ang)*spd;state.ball.vy=Math.sin(ang)*spd;}}
buildTestButtons();

// ═══════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════
buildSkinGrid();applyMenuSkin();
setWin(7);setDiff('medium');setMatch(1);setGameMode('classic');
buildLeaderboard();
setupTouch();
fitCanvasToViewport();
runIntro();

// PWA: register service worker
if('serviceWorker'in navigator){
  navigator.serviceWorker.register('./sw.js').then(()=>console.log('SW registered')).catch(e=>console.warn('SW failed',e));
}
