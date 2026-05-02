// ═══════════════════════════════════════════════════════════════════
// TOURNAMENT MODE
// ═══════════════════════════════════════════════════════════════════
let tourney=null; // {players:[], matches:[], currentMatch:int, rounds:int}
let tourneyAI={left:false,right:false}; // which sides are AI-controlled in current tournament match
const TOURNEY_SCREENS=['tourney-setup','tourney-bracket','tourney-winner'];

function hideAllTourneyScreens(){TOURNEY_SCREENS.forEach(id=>document.getElementById(id).style.display='none');}

// --- SETUP ---
function showTournamentSetup(){
  hideAllTourneyScreens();
  ['menu','game-over','match-over','game-ui','surv-turn'].forEach(id=>document.getElementById(id).style.display='none');
  const sk=SKINS[currentSkin];
  ['pw','tourney-setup'].forEach(id=>{
    const el=document.getElementById(id);el.style.background=sk.menuBg;el.style.color=sk.menuFg;
  });
  document.body.style.background=sk.menuBg;
  document.getElementById('tourney-setup').style.display='flex';
  // Apply skin colors to buttons inside setup
  document.querySelectorAll('#tourney-setup .btn-o, #tourney-setup .btn, #tourney-setup .tp-rm').forEach(b=>{b.style.color=sk.menuFg;b.style.borderColor=sk.menuFg;});
  document.querySelectorAll('#tourney-setup .btn').forEach(b=>{b.style.background=sk.menuFg;b.style.color=sk.menuBg;});
  // Seed with existing names if empty
  if(!tourney||!tourney.players||tourney.players.length<2){
    usedBotNames=[];
    tourney={players:[
      {name:'Player 1',isAI:false},{name:'Player 2',isAI:false},
      {name:'Player 3',isAI:false},{name:randomBotName(),isAI:true}
    ],matches:[],currentMatch:0,rounds:0};
  }
  tourneyRenderPlayers();
}

function tourneyRenderPlayers(){
  const cont=document.getElementById('tourney-players');
  cont.innerHTML='';
  tourney.players.forEach((p,i)=>{
    const row=document.createElement('div');row.className='tp-row';
    row.innerHTML=`<input class="tp-name" maxlength="12" value="${escapeHtml(p.name)}" onchange="tourney.players[${i}].name=this.value">`
      +(p.isAI?`<span class="tp-ai-tag">AI</span>`:'')
      +`<button class="tp-rm" onclick="tourneyRemovePlayer(${i})">×</button>`;
    cont.appendChild(row);
  });
  const n=tourney.players.length;
  document.getElementById('tourney-add-human').disabled=n>=8;
  document.getElementById('tourney-add-ai').disabled=n>=8;
  document.getElementById('tourney-start-btn').disabled=n<2;
  const rounds=Math.ceil(Math.log2(n));
  const slots=Math.pow(2,rounds);
  const byes=slots-n;
  document.getElementById('tourney-hint').textContent=n<2?'need at least 2 players'
    :`${n} players · ${rounds} round${rounds>1?'s':''}`+(byes>0?` · ${byes} bye${byes>1?'s':''}`:'')+` · ${gameMode} mode`;
}

const BOT_NAMES=[
  'Bot Terry','Bot Wogan','Sir Pongs','McPaddle','DJ Bounce','The Wall',
  'Ping Lord','Paddle Me','Chad Bot','Botto','Net Ninja','Pixel Pete',
  'Beep Boop','Rallyton','Smashy','Wallbanger','Pongzilla','Ace Volley',
  'Spinmaster','Dr Lob','Netflicks','Bouncebot','Paddrick','Servo',
  'Turbo Nan','Big Dave','Tiny Rick','Mega Mum','El Poncho','Zig Zag',
  'Barry Bot','Jan 6000','The Hoff','RoboPong','Old Greg','Sue-perbot',
  'Captain Bat','Keith','Alan','Jeff 3000','Bev','Pat Sharp',
  'The Stig','Nbot','Unit 42','Mx Smash','Prof Lob','Archie',
  'Clive','Delia','Pongtastic','Sir Hits','Bonkbot','Whackamole'
];
let usedBotNames=[];
function randomBotName(){
  const avail=BOT_NAMES.filter(n=>!usedBotNames.includes(n)&&!(tourney&&tourney.players.some(p=>p.name===n)));
  const pick=avail.length?avail[Math.floor(Math.random()*avail.length)]:('Bot '+(tourney?tourney.players.length+1:1));
  usedBotNames.push(pick);
  return pick;
}
function tourneyAddPlayer(isAI){
  if(tourney.players.length>=8)return;
  const num=tourney.players.length+1;
  tourney.players.push({name:isAI?randomBotName():`Player ${num}`,isAI});
  tourneyRenderPlayers();
}
function tourneyRemovePlayer(i){
  if(tourney.players.length<=2)return;
  tourney.players.splice(i,1);
  tourneyRenderPlayers();
}
function tourneyShuffle(){
  for(let i=tourney.players.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [tourney.players[i],tourney.players[j]]=[tourney.players[j],tourney.players[i]];
  }
  tourneyRenderPlayers();
}

// --- BRACKET GENERATION ---
function tourneyStart(){
  // Read names from inputs
  document.querySelectorAll('#tourney-players .tp-name').forEach((inp,i)=>{
    tourney.players[i].name=inp.value.trim()||`Player ${i+1}`;
  });
  // Deduplicate names
  const seen={};
  tourney.players.forEach(p=>{
    if(seen[p.name]){p.name=p.name+' '+((seen[p.name]++)+1);}
    else seen[p.name]=1;
  });
  const n=tourney.players.length;
  const rounds=Math.ceil(Math.log2(Math.max(n,2)));
  const slots=Math.pow(2,rounds);
  tourney.rounds=rounds;
  // Build seeded bracket with byes
  const seeded=[];
  for(let i=0;i<slots;i++)seeded.push(i<n?tourney.players[i]:null);
  // Generate all matches for all rounds
  tourney.matches=[];
  let matchesInRound=slots/2;
  for(let r=0;r<rounds;r++){
    for(let m=0;m<matchesInRound;m++){
      const match={round:r,index:m,p1:null,p2:null,winner:null,score:''};
      if(r===0){
        match.p1=seeded[m*2];
        match.p2=seeded[m*2+1];
        // Auto-resolve BYEs
        if(!match.p2&&match.p1){match.winner=match.p1;match.score='BYE';}
        if(!match.p1&&match.p2){match.winner=match.p2;match.score='BYE';}
        if(!match.p1&&!match.p2){match.winner=null;match.score='BYE';}
      }
      tourney.matches.push(match);
    }
    matchesInRound/=2;
  }
  // Propagate BYE winners to next round
  tourneyPropagate();
  tourney.currentMatch=tourney.matches.findIndex(m=>!m.winner&&m.p1&&m.p2);
  showTourneyBracket();
}

function tourneyPropagate(){
  for(let r=0;r<tourney.rounds-1;r++){
    const thisRound=tourney.matches.filter(m=>m.round===r);
    const nextRound=tourney.matches.filter(m=>m.round===r+1);
    for(let i=0;i<thisRound.length;i+=2){
      const nextMatch=nextRound[Math.floor(i/2)];
      if(thisRound[i].winner)nextMatch.p1=thisRound[i].winner;
      if(thisRound[i+1]&&thisRound[i+1].winner)nextMatch.p2=thisRound[i+1].winner;
      // Auto-resolve if one side is BYE in propagated round
      if(nextMatch.p1&&!nextMatch.p2&&thisRound[i+1]&&thisRound[i+1].score==='BYE'){
        nextMatch.winner=nextMatch.p1;nextMatch.score='BYE';
      }
      if(nextMatch.p2&&!nextMatch.p1&&thisRound[i].score==='BYE'){
        nextMatch.winner=nextMatch.p2;nextMatch.score='BYE';
      }
    }
  }
}

// --- BRACKET DISPLAY ---
function showTourneyBracket(){
  hideAllTourneyScreens();
  ['menu','game-over','match-over','game-ui','surv-turn'].forEach(id=>document.getElementById(id).style.display='none');
  const sk=SKINS[currentSkin];
  ['pw','tourney-bracket'].forEach(id=>{
    const el=document.getElementById(id);el.style.background=sk.menuBg;el.style.color=sk.menuFg;
  });
  document.body.style.background=sk.menuBg;
  document.getElementById('tourney-bracket').style.display='flex';
  // Apply skin colors to buttons
  document.querySelectorAll('#tourney-bracket .btn-o').forEach(b=>{b.style.color=sk.menuFg;b.style.borderColor=sk.menuFg;});
  document.querySelectorAll('#tourney-bracket .btn').forEach(b=>{b.style.background=sk.menuFg;b.style.color=sk.menuBg;});
  tourneyRenderBracket('tourney-bracket-grid');
  // Find next match
  const next=tourney.matches.find(m=>!m.winner&&m.p1&&m.p2);
  if(next){
    const p1=next.p1.name,p2=next.p2.name;
    const roundNames=['Round 1','Semis','Final','Final'];
    const rName=next.round>=tourney.rounds-1?'Final':next.round===tourney.rounds-2?'Semis':`Round ${next.round+1}`;
    document.getElementById('tourney-next-label').textContent=`${rName}: ${p1} vs ${p2}`;
    document.getElementById('tourney-play-btn').style.display='';
    document.getElementById('tourney-title').textContent='Tournament — '+gameMode.toUpperCase();
  }else{
    // Tournament is over
    showTourneyWinner();
  }
}

function tourneyRenderBracket(containerId){
  const cont=document.getElementById(containerId);
  const sk=SKINS[currentSkin];
  let html='<div class="bracket">';
  const next=tourney.matches.find(m=>!m.winner&&m.p1&&m.p2);
  for(let r=0;r<tourney.rounds;r++){
    const roundMatches=tourney.matches.filter(m=>m.round===r);
    const label=r===tourney.rounds-1?'FINAL':r===tourney.rounds-2?'SEMIS':`ROUND ${r+1}`;
    html+=`<div class="bracket-round"><div class="bracket-round-label">${label}</div>`;
    for(const m of roundMatches){
      const isActive=next&&m===next;
      const isDone=!!m.winner;
      const cls='bracket-match'+(isActive?' active':'')+(isDone&&!isActive?' done':'');
      const border=isActive?'border-color:#f59e0b':`border-color:${sk.menuFg}33`;
      html+=`<div class="${cls}" style="${border}">`;
      if(m.p1){
        const w=m.winner&&m.winner===m.p1?'winner':(m.winner?'loser':'');
        html+=`<div class="bm-p ${w}"><span>${escapeHtml(m.p1.name)}${m.p1.isAI?' 🤖':''}</span>${m.score&&m.score!=='BYE'?`<span>${m.winner===m.p1?'✓':''}</span>`:''}</div>`;
      }else{html+=`<div class="bm-p bm-bye">TBD</div>`;}
      if(m.p2){
        const w=m.winner&&m.winner===m.p2?'winner':(m.winner?'loser':'');
        html+=`<div class="bm-p ${w}"><span>${escapeHtml(m.p2.name)}${m.p2.isAI?' 🤖':''}</span>${m.score&&m.score!=='BYE'?`<span>${m.winner===m.p2?'✓':''}</span>`:''}</div>`;
      }else if(m.score==='BYE'){html+=`<div class="bm-p bm-bye">bye</div>`;}
      else{html+=`<div class="bm-p bm-bye">TBD</div>`;}
      if(m.score&&m.score!=='BYE')html+=`<div style="font-size:9px;opacity:.4;text-align:center;">${m.score}</div>`;
      html+='</div>';
    }
    html+='</div>';
  }
  html+='</div>';
  cont.innerHTML=html;
}

// --- PLAY MATCH ---
function tourneyPlayNext(){
  const match=tourney.matches.find(m=>!m.winner&&m.p1&&m.p2);
  if(!match)return;
  tourney.currentMatch=tourney.matches.indexOf(match);
  // Set up names and AI flags for the match
  nameLeft=match.p1.name;nameRight=match.p2.name;
  tourneyAI={left:!!match.p1.isAI,right:!!match.p2.isAI};
  match._swapped=false;
  // If p1 is AI and p2 is human, swap so human is always on left
  if(match.p1.isAI&&!match.p2.isAI){
    nameLeft=match.p2.name;nameRight=match.p1.name;
    tourneyAI={left:false,right:true};
    match._swapped=true;
  }
  document.getElementById('name-left').value=nameLeft;
  document.getElementById('name-right').value=nameRight;
  // Use '2p' mode — AI control is handled per-side via tourneyAI
  const matchMode=tourneyAI.left&&tourneyAI.right?'ai':'2p';
  hideAllTourneyScreens();
  document.getElementById('tourney-bracket').style.display='none';
  if(gameMode==='survival'){
    survStartMatch(matchMode);
  }else{
    startMatch(matchMode);
  }
}

// --- MATCH END HOOK ---
function tourneyOnMatchEnd(winnerSide){
  if(!tourney)return false;
  const match=tourney.matches[tourney.currentMatch];
  if(!match)return false;
  // Determine who won based on side and swap
  let winnerPlayer;
  if(match._swapped){
    winnerPlayer=winnerSide==='left'?match.p2:match.p1;
  }else{
    winnerPlayer=winnerSide==='left'?match.p1:match.p2;
  }
  match.winner=winnerPlayer;
  match.score=`${state?state.left.score:''}–${state?state.right.score:''}`;
  if(matchFormat>1)match.score+=` (${matchSets.left}–${matchSets.right} sets)`;
  // Propagate winner
  tourneyPropagate();
  // Show bracket after a short delay
  setTimeout(()=>showTourneyBracket(),1500);
  return true;
}

function tourneyCancel(){
  tourney=null;tourneyAI={left:false,right:false};showMenu();
}

// --- WINNER ---
function showTourneyWinner(){
  hideAllTourneyScreens();
  ['menu','game-over','match-over','game-ui','surv-turn','tourney-bracket'].forEach(id=>document.getElementById(id).style.display='none');
  const sk=SKINS[currentSkin];
  ['pw','tourney-winner'].forEach(id=>{
    const el=document.getElementById(id);el.style.background=sk.menuBg;el.style.color=sk.menuFg;
  });
  document.body.style.background=sk.menuBg;
  const finalMatch=tourney.matches[tourney.matches.length-1];
  const champion=finalMatch.winner;
  document.getElementById('tourney-win-txt').textContent=`${champion.name} wins the tournament!`;
  document.getElementById('tourney-win-txt').style.color=sk.menuFg;
  // Count matches won (not byes)
  const matchesWon=tourney.matches.filter(m=>m.winner===champion&&m.score!=='BYE').length;
  document.getElementById('tourney-win-stats').textContent=`${tourney.players.length} players · ${matchesWon} match${matchesWon>1?'es':''} won · ${gameMode} mode`;
  document.getElementById('tourney-win-stats').style.color=sk.menuFg;
  document.getElementById('tourney-winner').style.display='flex';
  // Apply skin colors to buttons
  document.querySelectorAll('#tourney-winner .btn').forEach(b=>{b.style.background=sk.menuFg;b.style.color=sk.menuBg;});
  tourneyRenderBracket('tourney-bracket-final');
  // Play win sound
  SOUNDS[currentSkin].gameWin(true);
}
