// ═══════════════════════════════════════════════════════════════════
// ONLINE MULTIPLAYER (PeerJS WebRTC)
// ═══════════════════════════════════════════════════════════════════
let onlineRole=null,onlinePeer=null,onlineConn=null,guestPaddleY=null;
let onlineRoomCode='',onlineRTT=0,_onlinePingInterval=null;
let _guestAnimId=null,_lastStateSend=0;
const STATE_SEND_INTERVAL=33; // ~30 Hz

// ICE servers for NAT traversal
// STUN only works ~60% of the time across different networks
// TURN relay is needed when both players are behind strict NATs
let ICE_SERVERS=[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'stun:stun.relay.metered.ca:80'}
];

// Metered.ca TURN: free 50GB/month, fetches fresh credentials via API
// Saved in localStorage so user only needs to set it up once
let _meteredApp=localStorage.getItem('pong-turn-app')||'';
let _meteredApiKey=localStorage.getItem('pong-turn-key')||'';
let _turnReady=false;

async function _fetchTurnCreds(){
  if(!_meteredApiKey||!_meteredApp){_turnReady=false;return false;}
  try{
    const url='https://'+encodeURIComponent(_meteredApp)+'.metered.live/api/v1/turn/credentials?apiKey='+encodeURIComponent(_meteredApiKey);
    const r=await fetch(url);
    if(!r.ok){
      console.warn('[Online] TURN API returned',r.status);
      _turnReady=false;return false;
    }
    const creds=await r.json();
    if(!Array.isArray(creds)||creds.length===0){_turnReady=false;return false;}
    ICE_SERVERS=[
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'},
      {urls:'stun:stun.relay.metered.ca:80'},
      ...creds
    ];
    PEER_CONFIG.config.iceServers=ICE_SERVERS;
    _turnReady=true;
    console.log('[Online] Fetched',creds.length,'TURN servers from Metered.ca');
    return true;
  }catch(e){
    console.warn('[Online] Could not fetch TURN creds:',e);
    _turnReady=false;return false;
  }
}

function _saveTurnConfig(app,key){
  _meteredApp=(app||'').trim();
  _meteredApiKey=(key||'').trim();
  if(_meteredApp&&_meteredApiKey){
    localStorage.setItem('pong-turn-app',_meteredApp);
    localStorage.setItem('pong-turn-key',_meteredApiKey);
  }else{
    localStorage.removeItem('pong-turn-app');
    localStorage.removeItem('pong-turn-key');
  }
}

let PEER_CONFIG={
  debug:1,
  config:{iceServers:ICE_SERVERS}
};

// ── Room code helpers ──
function generateRoomCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';for(let i=0;i<5;i++)code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}
function peerIdFromCode(code){return 'pong-v1-'+code.toUpperCase();}

// ── Lobby UI ──
const _olEl={};
function _olCache(){
  ['online-lobby','online-choice','online-hosting','online-joining','online-pregame',
   'online-room-code','online-host-status','online-join-status','online-code-input',
   'online-host-settings','online-guest-wait','online-guest-settings-label',
   'online-opponent-name','online-ping','online-disconnect'].forEach(id=>{
    _olEl[id]=document.getElementById(id);
  });
}

function _olShowSub(sub){
  ['online-choice','online-hosting','online-joining','online-pregame'].forEach(id=>{
    if(_olEl[id])_olEl[id].style.display=id===sub?'flex':'none';
  });
}

function showOnlineLobby(){
  _olCache();
  ['menu','game-over','match-over','surv-turn','tourney-setup','tourney-bracket','tourney-winner'].forEach(id=>document.getElementById(id).style.display='none');
  document.getElementById('game-ui').style.display='none';
  _olEl['online-lobby'].style.display='flex';
  onlineShowChoice();
  const sk=SKINS[currentSkin];
  _olEl['online-lobby'].style.color=sk.menuFg;
  applyMenuSkin();
}

async function onlineShowChoice(){
  // Clean up any previous connection attempt
  if(onlinePeer){try{onlinePeer.destroy();}catch(e){}onlinePeer=null;}
  onlineConn=null;onlineRole=null;
  if(_hostConnTimeout){clearTimeout(_hostConnTimeout);_hostConnTimeout=null;}
  if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
  _olShowSub('online-choice');
  _updateTurnUI();
  // Auto-fetch TURN credentials if key exists
  if(_meteredApiKey){
    await _fetchTurnCreds();
    _updateTurnUI();
  }
}

function _updateTurnUI(){
  const el=document.getElementById('online-turn-status');
  const appInp=document.getElementById('online-turn-app');
  const keyInp=document.getElementById('online-turn-key');
  const setupEl=document.getElementById('online-turn-setup');
  if(!el)return;
  if(appInp&&_meteredApp)appInp.value=_meteredApp;
  if(keyInp&&_meteredApiKey)keyInp.value='••••'+_meteredApiKey.slice(-4);
  if(_meteredApiKey&&_meteredApp&&_turnReady){
    el.textContent='✓ relay server ready';
    el.style.color='#6c8';
    if(setupEl)setupEl.style.display='none';
  }else if((_meteredApiKey||_meteredApp)&&!_turnReady){
    el.textContent='✗ could not verify — check app name & key';
    el.style.color='#e66';
    if(setupEl)setupEl.style.display='';
  }else{
    el.textContent='⚠ relay server needed for online play';
    el.style.color='#eb4';
    if(setupEl)setupEl.style.display='';
  }
}

async function onlineSaveTurnKey(){
  const appInp=document.getElementById('online-turn-app');
  const keyInp=document.getElementById('online-turn-key');
  if(!appInp||!keyInp)return;
  const app=appInp.value.trim();
  const key=keyInp.value.trim();
  if(!app||!key||key.startsWith('••')){return;}
  _saveTurnConfig(app,key);
  const el=document.getElementById('online-turn-status');
  if(el){el.textContent='verifying...';el.style.color='#aaa';}
  await _fetchTurnCreds();
  _updateTurnUI();
}
function onlineShowJoin(){
  _olShowSub('online-joining');
  _olEl['online-join-status'].textContent='';
  _olEl['online-code-input'].value='';
  _olEl['online-code-input'].focus();
}

// ── HOST FLOW ──
let _hostConnTimeout=null;

function onlineHost(){
  _olShowSub('online-hosting');
  onlineRoomCode=generateRoomCode();
  _olEl['online-room-code'].textContent=onlineRoomCode;
  _olEl['online-host-status'].textContent='connecting to server...';

  onlineRole='host';

  // Clean up any previous peer
  if(onlinePeer){try{onlinePeer.destroy();}catch(e){}}

  try{
    onlinePeer=new Peer(peerIdFromCode(onlineRoomCode),PEER_CONFIG);
  }catch(e){
    _olEl['online-host-status'].textContent='failed to create room — try again';
    onlineRole=null;return;
  }

  // Wait for signaling server to confirm registration
  onlinePeer.on('open',id=>{
    console.log('[Online] Host registered:',id);
    _olEl['online-host-status'].textContent='✓ room created — waiting for opponent...';
  });

  onlinePeer.on('error',err=>{
    console.warn('[Online] Host error:',err.type,err.message||err);
    if(err.type==='unavailable-id'){
      _olEl['online-host-status'].textContent='code taken — trying new one...';
      onlineRoomCode=generateRoomCode();
      _olEl['online-room-code'].textContent=onlineRoomCode;
      onlinePeer.destroy();
      onlinePeer=new Peer(peerIdFromCode(onlineRoomCode),PEER_CONFIG);
      onlinePeer.on('open',()=>{
        _olEl['online-host-status'].textContent='✓ room created — waiting for opponent...';
      });
      onlinePeer.on('connection',_onHostConnection);
      onlinePeer.on('error',err2=>{
        _olEl['online-host-status'].textContent='error: '+err2.type+' — try again';
      });
    }else if(err.type==='network'||err.type==='server-error'||err.type==='socket-error'||err.type==='socket-closed'){
      _olEl['online-host-status'].textContent='✗ server unreachable — check connection & try again';
    }else{
      _olEl['online-host-status'].textContent='error: '+err.type;
    }
  });

  onlinePeer.on('disconnected',()=>{
    console.warn('[Online] Host lost signaling server, reconnecting...');
    _olEl['online-host-status'].textContent='reconnecting to server...';
    try{onlinePeer.reconnect();}catch(e){
      _olEl['online-host-status'].textContent='✗ lost connection to server — try again';
    }
  });

  onlinePeer.on('connection',_onHostConnection);
}

function _onHostConnection(conn){
  console.log('[Online] Incoming connection, opening data channel...');
  if(_hostConnTimeout){clearTimeout(_hostConnTimeout);_hostConnTimeout=null;}
  onlineConn=conn;
  _olEl['online-host-status'].textContent='opponent found — establishing link...';

  // Monitor ICE state on host side
  _monitorICE(conn,'host-status');

  conn.on('open',()=>{
    console.log('[Online] Host: data channel open');
    const myName=document.getElementById('name-left').value.trim()||'Player 1';
    conn.send({type:'hello',name:myName,skin:currentSkin});
    _olEl['online-host-status'].textContent='✓ connected!';
  });
  conn.on('data',data=>{
    if(data.type==='hello'){
      nameRight=data.name||'Guest';
      _olEl['online-opponent-name'].textContent='vs '+nameRight;
      _olShowSub('online-pregame');
      _olEl['online-host-settings'].style.display='';
      _olEl['online-guest-wait'].style.display='none';
    }else{
      onlineHostReceive(data);
    }
  });
  conn.on('close',()=>onlineDisconnected());
  conn.on('error',e=>{
    console.warn('[Online] Host data channel error:',e);
    _olEl['online-host-status'].textContent='✗ connection failed — ask opponent to retry';
  });
}

// ── ICE state monitoring ──
function _monitorICE(conn,statusElId){
  // PeerJS exposes the RTCPeerConnection after a short delay
  const candidateTypes={host:0,srflx:0,relay:0,prflx:0};
  const check=setInterval(()=>{
    const pc=conn.peerConnection;
    if(!pc){return;}
    clearInterval(check);

    console.log('[Online] ICE monitoring started, servers:',ICE_SERVERS.length,
      '(TURN:',ICE_SERVERS.filter(s=>(s.urls||'').startsWith('turn')).length,')');
    pc.oniceconnectionstatechange=()=>{
      const s=pc.iceConnectionState;
      console.log('[Online] ICE state:',s,'candidates:',JSON.stringify(candidateTypes));
      const el=statusElId==='host-status'?_olEl['online-host-status']:_olEl['online-join-status'];
      if(s==='connected'||s==='completed'){
        console.log('[Online] ICE connected! Candidate types used:',JSON.stringify(candidateTypes));
      }
      if(s==='failed'){
        if(el){
          if(candidateTypes.relay===0){
            el.textContent='✗ connection blocked by NAT — no relay servers available';
          }else{
            el.textContent='✗ connection failed — firewall blocking all routes';
          }
        }
      }
    };
    pc.onicegatheringstatechange=()=>{
      console.log('[Online] ICE gathering:',pc.iceGatheringState,'candidates:',JSON.stringify(candidateTypes));
    };
    pc.onicecandidate=e=>{
      if(e.candidate){
        const c=e.candidate;
        if(c.type)candidateTypes[c.type]=(candidateTypes[c.type]||0)+1;
        console.log('[Online] ICE candidate:',c.type||'unknown',c.protocol||'',c.address||'',
          c.relatedAddress?'(relay via '+c.relatedAddress+')':'');
      }else{
        console.log('[Online] ICE gathering complete. Types:',JSON.stringify(candidateTypes));
      }
    };
  },100);

  // Stop checking after 30s
  setTimeout(()=>clearInterval(check),30000);
}

function onlineCopyCode(){
  navigator.clipboard.writeText(onlineRoomCode).then(()=>{
    const btn=document.getElementById('online-copy-btn');
    if(btn){btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy Code',1500);}
  }).catch(()=>{});
}

// ── GUEST FLOW ──
let _guestConnTimeout=null;

function onlineJoin(){
  const code=(_olEl['online-code-input'].value||'').trim().toUpperCase();
  if(code.length<4){
    _olEl['online-join-status'].textContent='enter a valid code';return;
  }

  // Clean up any previous attempt
  if(onlinePeer){try{onlinePeer.destroy();}catch(e){}onlinePeer=null;}
  if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
  onlineConn=null;

  _olEl['online-join-status'].textContent='① connecting to server...';
  onlineRole='guest';

  try{
    onlinePeer=new Peer(PEER_CONFIG);
  }catch(e){
    _olEl['online-join-status'].textContent='✗ failed to connect — try again';
    onlineRole=null;return;
  }

  onlinePeer.on('open',()=>{
    console.log('[Online] Guest registered, looking for room:',code);
    _olEl['online-join-status'].textContent='② finding room '+code+'...';

    onlineConn=onlinePeer.connect(peerIdFromCode(code),{reliable:true,serialization:'json'});

    // Monitor ICE state on guest side
    _monitorICE(onlineConn,'join-status');

    // Timeout: if data channel doesn't open in 25s, connection failed
    _guestConnTimeout=setTimeout(()=>{
      if(!onlineConn||!onlineConn.open){
        // Check ICE state for specific diagnosis
        let diagnosis='connection timed out';
        try{
          const pc=onlineConn&&onlineConn.peerConnection;
          if(pc){
            const iceState=pc.iceConnectionState;
            console.log('[Online] Timeout with ICE state:',iceState);
            if(iceState==='checking'||iceState==='new'){
              diagnosis='✗ could not reach opponent — both players may be behind strict firewalls (NAT)';
            }else if(iceState==='failed'){
              diagnosis='✗ direct connection blocked by firewall/NAT';
            }else{
              diagnosis='✗ connection timed out (ICE: '+iceState+')';
            }
          }else{
            diagnosis='✗ connection timed out — room may not exist';
          }
        }catch(e){}
        _olEl['online-join-status'].textContent=diagnosis;
        console.warn('[Online] Guest connection timed out');
        onlineRole=null;
        if(onlinePeer){try{onlinePeer.destroy();}catch(e){}onlinePeer=null;}
        onlineConn=null;
      }
    },25000);

    onlineConn.on('open',()=>{
      console.log('[Online] Guest: data channel open');
      if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
      _olEl['online-join-status'].textContent='④ connected! exchanging info...';
      const myName=document.getElementById('name-right').value.trim()||document.getElementById('name-left').value.trim()||'Player 2';
      onlineConn.send({type:'hello',name:myName});
    });
    onlineConn.on('data',data=>{
      if(data.type==='hello'){
        nameLeft=data.name||'Host';
        if(data.skin){currentSkin=data.skin;applyMenuSkin();}
        _olEl['online-opponent-name'].textContent='vs '+nameLeft;
        _olShowSub('online-pregame');
        _olEl['online-host-settings'].style.display='none';
        _olEl['online-guest-wait'].style.display='';
        _olEl['online-guest-settings-label'].textContent='waiting for '+nameLeft+' to start...';
      }else{
        onlineGuestReceive(data);
      }
    });
    onlineConn.on('close',()=>onlineDisconnected());
    onlineConn.on('error',e=>{
      console.warn('[Online] Guest data channel error:',e);
      if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
      _olEl['online-join-status'].textContent='✗ connection failed — check code & try again';
      onlineRole=null;
    });
  });

  onlinePeer.on('error',err=>{
    console.warn('[Online] Guest peer error:',err.type,err.message||err);
    if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
    if(err.type==='peer-unavailable'){
      _olEl['online-join-status'].textContent='✗ room "'+code+'" not found — is the host ready?';
    }else if(err.type==='network'||err.type==='server-error'||err.type==='socket-error'||err.type==='socket-closed'){
      _olEl['online-join-status'].textContent='✗ server unreachable — check your internet';
    }else{
      _olEl['online-join-status'].textContent='✗ error: '+err.type;
    }
    onlineRole=null;
    if(onlinePeer){try{onlinePeer.destroy();}catch(e){}onlinePeer=null;}
  });

  onlinePeer.on('disconnected',()=>{
    console.warn('[Online] Guest lost signaling, reconnecting...');
    try{onlinePeer.reconnect();}catch(e){}
  });
}

// ── SETTINGS (host pregame) ──
let _onlineGameMode='classic',_onlineWinScore=7;

function onlineSetMode(m){
  _onlineGameMode=m;
  document.querySelectorAll('#online-gamemode-opts .opt-btn').forEach(b=>b.classList.toggle('sel',b.dataset.gm===m));
}
function onlineSetWin(n){
  _onlineWinScore=n;
  document.querySelectorAll('#online-score-opts .opt-btn').forEach(b=>b.classList.toggle('sel',+b.dataset.score===n));
}

// ── START GAME ──
function onlineStartGame(){
  if(onlineRole==='host'&&onlineConn&&onlineConn.open){
    nameLeft=document.getElementById('name-left').value.trim()||'Player 1';
    const msg={type:'gameStart',gameMode:_onlineGameMode,winScore:_onlineWinScore,
               skin:currentSkin,nameLeft,nameRight,matchFormat:1};
    onlineConn.send(msg);
    _onlineApplySettings(msg);
    _olEl['online-lobby'].style.display='none';
    startMatch('online');
    _startPing();
  }
}

function _onlineApplySettings(data){
  gameMode=data.gameMode;setGameMode(data.gameMode);
  winScore=data.winScore;setWin(data.winScore);
  matchFormat=data.matchFormat||1;setMatch(data.matchFormat||1);
  if(data.skin){currentSkin=data.skin;}
  nameLeft=data.nameLeft;nameRight=data.nameRight;
}

// ── HOST: receive guest messages ──
function onlineHostReceive(data){
  switch(data.type){
    case 'input':
      guestPaddleY=data.y;
      break;
    case 'serve':
      if(serving&&countdown===0&&serveSide==='right')launchBall('right');
      break;
    case 'pong':
      onlineRTT=performance.now()-data.t;
      _updatePingDisplay();
      break;
    case 'rematchReq':
      onlineStartGame();
      break;
  }
}

// ── HOST: send state snapshot ──
let _lastBricksAlive=-1;
function onlineSendState(now){
  if(!onlineConn||!onlineConn.open)return;
  if(now-_lastStateSend<STATE_SEND_INTERVAL)return;
  _lastStateSend=now;

  const msg={
    type:'state',
    left:{y:state.left.y,score:state.left.score},
    right:{y:state.right.y,score:state.right.score},
    ball:{x:state.ball.x,y:state.ball.y,vx:state.ball.vx,vy:state.ball.vy,
          size:state.ball.size,curve:state.ball.curve,spin:state.ball.spin},
    serving,serveSide,countdown,
    apu:activePowerups.map(p=>({type:p.type,side:p.side,st:p.startTime,et:p.endTime})),
    fpu:fieldPowerups.map(p=>({type:p.type,x:p.x,y:p.y,bo:p.bobOffset,st:p.spawnTime})),
    db:decoyBalls.map(d=>({x:d.x,y:d.y,vx:d.vx,vy:d.vy,spin:d.spin||0})),
    ss:shieldSide,rh:rallyHits,sa:shakeAmt,ch:chaosHue,
    dp:defenderPaddle?{side:defenderPaddle.side,y:defenderPaddle.y,x:defenderPaddle.x,h:defenderPaddle.h}:null,
    pa:portalA,pb:portalB,t:now
  };

  if(gameMode==='bricks'){
    const alive=bricks.reduce((n,b)=>n+(b.alive?1:0),0);
    if(alive!==_lastBricksAlive){
      msg.bricks=bricks.map(b=>({alive:b.alive,color:b.color,btype:b.btype,hp:b.hp,maxHp:b.maxHp,
        w:b.w,h:b.h,ring:b.ring,angle:b.angle,radius:b.radius,isCore:b.isCore}));
      msg.bmp=brickMovePhase;
      _lastBricksAlive=alive;
    }
  }

  onlineConn.send(msg);
}

// ── GUEST: receive host messages ──
function onlineGuestReceive(data){
  switch(data.type){
    case 'gameStart':
      _onlineApplySettings(data);
      _olEl['online-lobby'].style.display='none';
      state=initGameState();keys={};lastFrameTime=0;
      document.getElementById('menu').style.display='none';
      document.getElementById('game-ui').style.display='flex';
      applyGameSkin();enterGameplay();fitCanvasToViewport();
      serving=true;serveSide='left';countdown=3;
      _guestAnimId=requestAnimationFrame(guestRenderLoop);
      _startPing();
      break;
    case 'state':
      guestApplyState(data);
      break;
    case 'puPopup':
      showPuPopup(data.side,data.puType);
      (PU_SOUNDS[data.puType]||SOUNDS[currentSkin].powerup)();
      break;
    case 'sound':
      _playRemoteSound(data.name,data.args);
      break;
    case 'setEnd':
      if(_guestAnimId){cancelAnimationFrame(_guestAnimId);_guestAnimId=null;}
      exitGameplay();
      state.left.score=data.ls;state.right.score=data.rs;
      matchSets=data.matchSets||{left:0,right:0};
      endSet(data.winner);
      break;
    case 'matchEnd':
      matchSets=data.matchSets||{left:0,right:0};
      showMatchOver();
      break;
    case 'rematch':
      _onlineApplySettings(data);
      state=initGameState();keys={};lastFrameTime=0;
      document.getElementById('game-over').style.display='none';
      document.getElementById('match-over').style.display='none';
      document.getElementById('game-ui').style.display='flex';
      applyGameSkin();enterGameplay();fitCanvasToViewport();
      serving=true;serveSide='left';countdown=3;
      _guestAnimId=requestAnimationFrame(guestRenderLoop);
      break;
    case 'ping':
      if(onlineConn&&onlineConn.open)onlineConn.send({type:'pong',t:data.t,rt:performance.now()});
      break;
  }
}

function _playRemoteSound(name,args){
  try{
    if(name==='paddle')SOUNDS[currentSkin].paddle();
    else if(name==='wall')SOUNDS[currentSkin].wall();
    else if(name==='brick')SOUNDS[currentSkin].brick();
    else if(name==='serve')SOUNDS[currentSkin].serve();
    else if(name==='score')SOUNDS[currentSkin].score(args&&args[0]);
    else if(name==='gameWin')SOUNDS[currentSkin].gameWin(args&&args[0]);
  }catch(e){}
}

// ── GUEST: apply state snapshot ──
function guestApplyState(data){
  if(!state)return;
  state.left.y=data.left.y;
  state.left.score=data.left.score;
  state.right.score=data.right.score;
  state.ball.x=data.ball.x;state.ball.y=data.ball.y;
  state.ball.vx=data.ball.vx;state.ball.vy=data.ball.vy;
  state.ball.size=data.ball.size;state.ball.curve=data.ball.curve;state.ball.spin=data.ball.spin;

  serving=data.serving;serveSide=data.serveSide;countdown=data.countdown;
  rallyHits=data.rh;shakeAmt=data.sa;chaosHue=data.ch;
  shieldSide=data.ss;
  defenderPaddle=data.dp;portalA=data.pa;portalB=data.pb;

  activePowerups=data.apu.map(p=>({type:p.type,side:p.side,startTime:p.st,endTime:p.et}));
  fieldPowerups=data.fpu.map(p=>({type:p.type,x:p.x,y:p.y,bobOffset:p.bo,spawnTime:p.st}));
  decoyBalls=data.db;

  if(data.bricks){
    bricks=data.bricks;brickMovePhase=data.bmp||0;
  }
}

// ── GUEST: render loop (no physics) ──
let _guestLastFrame=0;
function guestRenderLoop(){
  if(!onlineRole){return;}
  const now=performance.now();
  if(!_guestLastFrame)_guestLastFrame=now;
  const dt=Math.min((now-_guestLastFrame)/TARGET_FRAME_MS,3);
  _guestLastFrame=now;

  if(state){
    const ph=getPH('right'),SPD=5;
    if(touchY.right!==null){
      state.right.y=Math.max(0,Math.min(H-ph,touchY.right-ph/2));
    }else{
      if(keys['w']||keys['W']||keys['ArrowUp'])state.right.y-=SPD*dt;
      if(keys['s']||keys['S']||keys['ArrowDown'])state.right.y+=SPD*dt;
      state.right.y=Math.max(0,Math.min(H-ph,state.right.y));
    }

    if(onlineConn&&onlineConn.open){
      onlineConn.send({type:'input',y:state.right.y+ph/2,t:now});
    }
  }

  updateParticles(dt);
  shakeAmt=prefersReducedMotion?0:Math.max(0,shakeAmt-.6*dt);
  if(SKINS[currentSkin].chaos)chaosHue=(chaosHue+.8*dt)%360;
  _drawDt=dt;

  if(serving)drawServe(now);
  else draw(now);

  _guestAnimId=requestAnimationFrame(guestRenderLoop);
}

// ── PING ──
function _startPing(){
  _stopPing();
  if(onlineRole==='host'){
    _onlinePingInterval=setInterval(()=>{
      if(onlineConn&&onlineConn.open)onlineConn.send({type:'ping',t:performance.now()});
    },2000);
  }
  const el=_olEl['online-ping']||document.getElementById('online-ping');
  if(el)el.style.display='inline';
}
function _stopPing(){
  if(_onlinePingInterval){clearInterval(_onlinePingInterval);_onlinePingInterval=null;}
  const el=document.getElementById('online-ping');
  if(el){el.style.display='none';el.textContent='';}
}
function _updatePingDisplay(){
  const el=document.getElementById('online-ping');
  if(el)el.textContent=Math.round(onlineRTT)+'ms';
}

// ── DISCONNECT ──
function onlineDisconnected(){
  _stopPing();
  if(_guestAnimId){cancelAnimationFrame(_guestAnimId);_guestAnimId=null;}
  if(animId){cancelAnimationFrame(animId);animId=null;}
  const overlay=document.getElementById('online-disconnect');
  if(overlay)overlay.style.display='flex';
}

function onlineDismissDisconnect(){
  const overlay=document.getElementById('online-disconnect');
  if(overlay)overlay.style.display='none';
  onlineCleanup();
  showMenu();
}

// ── CLEANUP ──
function onlineCleanup(){
  _stopPing();
  if(_hostConnTimeout){clearTimeout(_hostConnTimeout);_hostConnTimeout=null;}
  if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
  if(_guestAnimId){cancelAnimationFrame(_guestAnimId);_guestAnimId=null;}
  if(onlineConn){try{onlineConn.close();}catch(e){}onlineConn=null;}
  if(onlinePeer){try{onlinePeer.destroy();}catch(e){}onlinePeer=null;}
  onlineRole=null;guestPaddleY=null;onlineRTT=0;
  _lastBricksAlive=-1;_lastStateSend=0;_guestLastFrame=0;
  const lobby=document.getElementById('online-lobby');
  if(lobby)lobby.style.display='none';
  const disc=document.getElementById('online-disconnect');
  if(disc)disc.style.display='none';
}

function onlineCancel(){
  onlineCleanup();
  showMenu();
}

// ── HOST: rematch support ──
function onlineRematch(){
  if(onlineRole==='host'&&onlineConn&&onlineConn.open){
    const msg={type:'rematch',gameMode,winScore,skin:currentSkin,nameLeft,nameRight,matchFormat:1};
    onlineConn.send(msg);
    document.getElementById('game-over').style.display='none';
    document.getElementById('match-over').style.display='none';
    startMatch('online');
  }else if(onlineRole==='guest'&&onlineConn&&onlineConn.open){
    onlineConn.send({type:'rematchReq'});
  }
}
