// ═══════════════════════════════════════════════════════════════════
// AI LADDER — five AI opponents in a row; beat one to unlock the next.
// Each rung is its own AI difficulty key: its numbers are added to
// AI_SPEED / AI_ERROR / AI_AIM, so moveAI needs no changes.
// ═══════════════════════════════════════════════════════════════════
const LADDER=[
  {id:'rookie',   name:'Rookie',   blurb:'Still learning which way is up.',         speed:2.4,error:60,aim:0,  mode:'classic',to:5},
  {id:'wall',     name:'The Wall', blurb:'Steady but sloppy. Never aims.',           speed:3.9,error:42,aim:0,  mode:'classic',to:5},
  {id:'sniper',   name:'Sniper',   blurb:'Aims every shot at the corners.',         speed:3.7,error:16,aim:.75,mode:'classic',to:7},
  {id:'trickster',name:'Trickster',blurb:'Only plays Chaos.',                       speed:4.2,error:20,aim:.5, mode:'chaos',  to:7},
  {id:'champion', name:'Champion', blurb:'The hard AI at full strength.',           speed:5.6,error:6, aim:.75,mode:'classic',to:7},
];
LADDER.forEach(r=>{AI_SPEED[r.id]=r.speed;AI_ERROR[r.id]=r.error;AI_AIM[r.id]=r.aim;});

let ladder=null;  // {idx, saved:{...menu settings}} while a ladder match is in progress
let ladderSel=0;  // rung highlighted on the ladder screen

// Progress = number of rungs beaten, saved per device
function ladderProgress(){try{return Math.min(LADDER.length,+localStorage.getItem('pong_ladder')||0);}catch{return 0;}}
function saveLadderProgress(n){try{localStorage.setItem('pong_ladder',String(n));}catch{}}

function showLadder(){
  showMenu(); // hides every other screen and restores menu settings via ladderExit()
  document.getElementById('menu').style.display='none';
  document.getElementById('ladder').style.display='flex';
  ladderSel=Math.min(ladderProgress(),LADDER.length-1);
  renderLadder();
}
function renderLadder(){
  const beaten=ladderProgress();
  document.getElementById('ladder-list').innerHTML=LADDER.map((r,i)=>{
    const st=i<beaten?'beaten':i===beaten?'next':'locked';
    const label={beaten:'Beaten',next:'Next up',locked:'Locked'}[st];
    return `<li><button type="button" class="rung ${st}${i===ladderSel?' sel':''}" ${st==='locked'?'disabled':''} aria-pressed="${i===ladderSel}" onclick="ladderSelect(${i})">
      <span class="rung-num">${i+1}</span>
      <span class="rung-who"><span class="rung-name">${r.name}</span><span class="rung-blurb">${r.blurb}</span></span>
      <span class="rung-status">${label}</span></button></li>`;
  }).join('');
  document.getElementById('ladder-sub').textContent=beaten>=LADDER.length
    ?'You beat the whole ladder. Pick anyone for a rematch.'
    :`Beat each opponent to unlock the next. ${beaten} of ${LADDER.length} beaten.`;
  setPongButton('ladder-play','play',`Play ${LADDER[ladderSel].name}`);
}
function ladderSelect(i){
  if(i>ladderProgress())return;
  ladderSel=i;renderLadder();
  document.querySelectorAll('.rung')[i]?.focus();
}
function ladderPlay(i){
  const r=LADDER[i];
  // Remember the menu's own settings once, so leaving the ladder puts them back
  if(!ladder)ladder={saved:{gameMode,aiDiff,winScore,matchFormat}};
  ladder.idx=i;
  document.getElementById('ladder').style.display='none';
  gameMode=r.mode;aiDiff=r.id;winScore=r.to;matchFormat=1;
  startMatch('ai');
}
function ladderExit(){
  if(!ladder)return;
  ({gameMode,aiDiff,winScore,matchFormat}=ladder.saved);
  ladder=null;
}
// Called from showMatchOver instead of the normal rematch screen
function ladderOnMatchEnd(winner){
  const i=ladder.idx,r=LADDER[i],won=winner==='left',last=i===LADDER.length-1;
  if(won&&i>=ladderProgress())saveLadderProgress(i+1);
  document.getElementById('mtxt').textContent=won?(last?'You beat the ladder!':`You beat ${r.name}!`):`${r.name} wins`;
  document.getElementById('mscr').textContent=`${state.left.score} — ${state.right.score}`;
  const again=document.getElementById('mrabtn'),back=document.getElementById('mrmbtn');
  if(won&&!last){setPongButton('mrabtn','play',`Next: ${LADDER[i+1].name}`);again.onclick=()=>ladderPlay(i+1);}
  else{setPongButton('mrabtn','play',won?'Play again':'Try again');again.onclick=()=>ladderPlay(i);}
  setPongButton('mrmbtn','menu','Ladder');back.onclick=showLadder;
  document.getElementById('game-over').style.display='none';
  document.getElementById('match-over').style.display='flex';
}
