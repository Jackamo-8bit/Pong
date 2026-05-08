// ═══════════════════════════════════════════════════════════════════
// ONLINE MULTIPLAYER (PeerJS WebRTC)
// ═══════════════════════════════════════════════════════════════════

// ── Connection state ──
let onlineRole=null;   // null | 'host' | 'guest'
let onlinePeer=null;   // PeerJS Peer instance
let onlineConn=null;   // PeerJS DataConnection
let guestPaddleY=null; // raw Y from guest input (host physics)
let onlineRoomCode='';
let onlineRTT=0;
let _onlinePingInterval=null;
let _guestAnimId=null;

// ── Send-rate management ──
let _lastStateSend=0, _lastInputSend=0;
let _isRelayed=false;  // true when connection uses TURN relay
const SEND_HZ_DIRECT=16;  // ~60 Hz when P2P direct (cheap)
const SEND_HZ_RELAY=33;   // ~30 Hz when relayed (saves bandwidth)
const INPUT_SEND_HZ=33;   // guest paddle input at ~30 Hz (sufficient with prediction)

// ── Client-side prediction ──
// Guest moves the ball locally every frame using host velocity,
// host snapshots gently correct the predicted position each tick.
const PADDLE_LERP=0.35;  // per-frame blend for opponent paddle
const BALL_CORRECT=0.3;  // how aggressively to snap toward server ball pos
let _netTargets={
  leftY:null,              // host paddle Y target (guest lerps toward this)
  ballX:null, ballY:null,  // last authoritative ball pos from host
  _started:false           // set after first state snapshot received
};


// ═══════════════════════════════════════════════════════════════════
// ICE / TURN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

// STUN discovers public IPs (~60% success across different NATs).
// TURN relays traffic when direct P2P fails — required for strict NATs.
let ICE_SERVERS=[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'stun:stun.relay.metered.ca:80'}
];

// Metered.ca TURN: free 500MB/month, fetches fresh credentials via API.
// Saved in localStorage so user only configures once.
let _turnApp=localStorage.getItem('pong-turn-app')||'';
let _turnKey=localStorage.getItem('pong-turn-key')||'';
let _turnReady=false;

let PEER_CONFIG={
  debug:1,
  config:{iceServers:ICE_SERVERS}
};

function _cleanAppName(raw){
  return(raw||'').trim().replace(/\.metered\.live$/i,'').replace(/^https?:\/\//,'');
}

async function _fetchTurnCreds(){
  if(!_turnApp||!_turnKey){_turnReady=false;return false;}
  try{
    const url='https://'+_turnApp+'.metered.live/api/v1/turn/credentials?apiKey='+encodeURIComponent(_turnKey);
    console.log('[Online] Fetching TURN from',_turnApp+'.metered.live');
    const r=await fetch(url);
    if(!r.ok){
      console.warn('[Online] TURN API:',r.status===401?'invalid API key':'status '+r.status);
      _turnReady=false;return false;
    }
    const creds=await r.json();
    if(!Array.isArray(creds)||!creds.length){_turnReady=false;return false;}
    ICE_SERVERS=[
      {urls:'stun:stun.l.google.com:19302'},
      {urls:'stun:stun1.l.google.com:19302'},
      {urls:'stun:stun.relay.metered.ca:80'},
      ...creds
    ];
    PEER_CONFIG.config.iceServers=ICE_SERVERS;
    _turnReady=true;
    console.log('[Online] Got',creds.length,'TURN servers');
    return true;
  }catch(e){
    console.warn('[Online] Could not fetch TURN creds:',e);
    _turnReady=false;return false;
  }
}

function _saveTurnConfig(app,key){
  _turnApp=_cleanAppName(app);
  _turnKey=(key||'').trim();
  if(_turnApp&&_turnKey){
    localStorage.setItem('pong-turn-app',_turnApp);
    localStorage.setItem('pong-turn-key',_turnKey);
  }else{
    localStorage.removeItem('pong-turn-app');
    localStorage.removeItem('pong-turn-key');
  }
}


// ═══════════════════════════════════════════════════════════════════
// ROOM CODES
// ═══════════════════════════════════════════════════════════════════

function generateRoomCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous I/O/0/1
  let code='';
  for(let i=0;i<5;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}
function peerIdFromCode(code){ return 'pong-v1-'+code.toUpperCase(); }


// ═══════════════════════════════════════════════════════════════════
// LOBBY UI
// ═══════════════════════════════════════════════════════════════════

const _olEl={};

function _olCache(){
  ['online-lobby','online-choice','online-hosting','online-joining','online-pregame',
   'online-room-code','online-host-status','online-join-status','online-code-input',
   'online-host-settings','online-guest-wait','online-guest-settings-label',
   'online-opponent-name','online-ping','online-disconnect','online-name'].forEach(id=>{
    _olEl[id]=document.getElementById(id);
  });
}

function _olShowSub(sub){
  ['online-choice','online-hosting','online-joining','online-pregame'].forEach(id=>{
    if(_olEl[id]) _olEl[id].style.display=(id===sub?'flex':'none');
  });
}

function _getOnlineName(){
  const el=_olEl['online-name']||document.getElementById('online-name');
  const name=(el?el.value:'').trim();
  if(name) localStorage.setItem('pong-online-name',name);
  return name||localStorage.getItem('pong-online-name')||'';
}

function showOnlineLobby(){
  _olCache();
  ['menu','game-over','match-over','surv-turn','tourney-setup',
   'tourney-bracket','tourney-winner'].forEach(id=>{
    document.getElementById(id).style.display='none';
  });
  document.getElementById('game-ui').style.display='none';
  _olEl['online-lobby'].style.display='flex';
  onlineShowChoice();
  // Restore saved player name
  const saved=localStorage.getItem('pong-online-name')||'';
  if(_olEl['online-name']) _olEl['online-name'].value=saved;
  _olEl['online-lobby'].style.color=SKINS[currentSkin].menuFg;
  applyMenuSkin();
}

async function onlineShowChoice(){
  // Clean up any previous connection attempt
  if(onlinePeer){try{onlinePeer.destroy();}catch(e){} onlinePeer=null;}
  onlineConn=null; onlineRole=null;
  if(_hostConnTimeout){clearTimeout(_hostConnTimeout);_hostConnTimeout=null;}
  if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
  _olShowSub('online-choice');
  _updateTurnUI();
  if(_turnApp&&_turnKey){
    const el=document.getElementById('online-turn-status');
    if(el){el.textContent='verifying relay...';el.style.color='#aaa';}
    await _fetchTurnCreds();
    _updateTurnUI();
  }
}

function _updateTurnUI(){
  const el=document.getElementById('online-turn-status');
  const setupEl=document.getElementById('online-turn-setup');
  if(!el) return;
  if(_turnReady){
    el.textContent='✓ relay server ready';
    el.style.color='#6c8';
    if(setupEl) setupEl.style.display='none';
  }else if(_turnApp&&_turnKey){
    el.textContent='✗ invalid API key — copy the key from your Metered.ca dashboard';
    el.style.color='#e66';
    if(setupEl) setupEl.style.display='';
  }else{
    el.textContent='⚠ relay server needed for online play';
    el.style.color='#eb4';
    if(setupEl) setupEl.style.display='';
  }
  const appInp=document.getElementById('online-turn-app');
  const keyInp=document.getElementById('online-turn-key');
  if(appInp) appInp.value=_turnApp||'';
  if(keyInp) keyInp.value=_turnKey?'••••'+_turnKey.slice(-4):'';
}

async function onlineSaveTurnKey(){
  const appInp=document.getElementById('online-turn-app');
  const keyInp=document.getElementById('online-turn-key');
  if(!appInp||!keyInp) return;
  const app=appInp.value.trim(), key=keyInp.value.trim();
  if(!app||!key||key.startsWith('••')) return;
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


// ═══════════════════════════════════════════════════════════════════
// HOST FLOW
// ═══════════════════════════════════════════════════════════════════

let _hostConnTimeout=null;

function onlineHost(){
  _olShowSub('online-hosting');
  onlineRoomCode=generateRoomCode();
  _olEl['online-room-code'].textContent=onlineRoomCode;
  const turnN=ICE_SERVERS.filter(s=>(s.urls||'').startsWith('turn')).length;
  _olEl['online-host-status'].textContent='connecting... ('+ICE_SERVERS.length+' servers, '+turnN+' TURN)';
  onlineRole='host';

  if(onlinePeer){try{onlinePeer.destroy();}catch(e){}}
  try{
    onlinePeer=new Peer(peerIdFromCode(onlineRoomCode),PEER_CONFIG);
  }catch(e){
    _olEl['online-host-status'].textContent='failed to create room — try again';
    onlineRole=null; return;
  }

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
      onlinePeer.on('error',e2=>{
        _olEl['online-host-status'].textContent='error: '+e2.type+' — try again';
      });
    }else if(['network','server-error','socket-error','socket-closed'].includes(err.type)){
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
  _monitorICE(conn,'host-status');

  conn.on('open',()=>{
    console.log('[Online] Host: data channel open');
    conn.send({type:'hello',name:_getOnlineName()||'Player 1',skin:currentSkin});
    _olEl['online-host-status'].textContent='✓ connected!';
    _detectRelay(conn); // check if using TURN relay for send-rate adaptation
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

function onlineCopyCode(){
  navigator.clipboard.writeText(onlineRoomCode).then(()=>{
    const btn=document.getElementById('online-copy-btn');
    if(btn){btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy Code',1500);}
  }).catch(()=>{});
}


// ═══════════════════════════════════════════════════════════════════
// GUEST FLOW
// ═══════════════════════════════════════════════════════════════════

let _guestConnTimeout=null;

function onlineJoin(){
  const code=(_olEl['online-code-input'].value||'').trim().toUpperCase();
  if(code.length<4){
    _olEl['online-join-status'].textContent='enter a valid code'; return;
  }

  if(onlinePeer){try{onlinePeer.destroy();}catch(e){} onlinePeer=null;}
  if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
  onlineConn=null;
  _olEl['online-join-status'].textContent='① connecting to server...';
  onlineRole='guest';

  try{
    onlinePeer=new Peer(PEER_CONFIG);
  }catch(e){
    _olEl['online-join-status'].textContent='✗ failed to connect — try again';
    onlineRole=null; return;
  }

  onlinePeer.on('open',()=>{
    console.log('[Online] Guest registered, looking for room:',code);
    _olEl['online-join-status'].textContent='② finding room '+code+'...';

    onlineConn=onlinePeer.connect(peerIdFromCode(code),{reliable:true,serialization:'json'});
    _monitorICE(onlineConn,'join-status');

    // 25s timeout with ICE-aware diagnosis
    _guestConnTimeout=setTimeout(()=>{
      if(onlineConn&&onlineConn.open) return;
      let diagnosis='✗ connection timed out';
      try{
        const pc=onlineConn&&onlineConn.peerConnection;
        if(pc){
          const ice=pc.iceConnectionState;
          console.log('[Online] Timeout ICE:',ice);
          if(ice==='checking'||ice==='new')
            diagnosis='✗ could not reach opponent — both players may be behind strict firewalls (NAT)';
          else if(ice==='failed')
            diagnosis='✗ direct connection blocked by firewall/NAT';
          else
            diagnosis='✗ connection timed out (ICE: '+ice+')';
        }else{
          diagnosis='✗ connection timed out — room may not exist';
        }
      }catch(e){}
      _olEl['online-join-status'].textContent=diagnosis;
      console.warn('[Online] Guest connection timed out');
      onlineRole=null;
      if(onlinePeer){try{onlinePeer.destroy();}catch(e){} onlinePeer=null;}
      onlineConn=null;
    },25000);

    onlineConn.on('open',()=>{
      console.log('[Online] Guest: data channel open');
      if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
      _olEl['online-join-status'].textContent='④ connected! exchanging info...';
      onlineConn.send({type:'hello',name:_getOnlineName()||'Player 2'});
      _detectRelay(onlineConn);
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
    }else if(['network','server-error','socket-error','socket-closed'].includes(err.type)){
      _olEl['online-join-status'].textContent='✗ server unreachable — check your internet';
    }else{
      _olEl['online-join-status'].textContent='✗ error: '+err.type;
    }
    onlineRole=null;
    if(onlinePeer){try{onlinePeer.destroy();}catch(e){} onlinePeer=null;}
  });

  onlinePeer.on('disconnected',()=>{
    console.warn('[Online] Guest lost signaling, reconnecting...');
    try{onlinePeer.reconnect();}catch(e){}
  });
}


// ═══════════════════════════════════════════════════════════════════
// ICE MONITORING & RELAY DETECTION
// ═══════════════════════════════════════════════════════════════════

function _monitorICE(conn,statusElId){
  const ct={host:0,srflx:0,relay:0,prflx:0};
  const el=(statusElId==='host-status')?_olEl['online-host-status']:_olEl['online-join-status'];
  const check=setInterval(()=>{
    const pc=conn.peerConnection;
    if(!pc) return;
    clearInterval(check);
    const turnN=ICE_SERVERS.filter(s=>(s.urls||'').startsWith('turn')).length;
    console.log('[Online] ICE started, servers:',ICE_SERVERS.length,'TURN:',turnN);
    if(el) el.textContent='③ negotiating... ('+turnN+' relay servers)';
    // IMPORTANT: use addEventListener — PeerJS uses pc.onicecandidate internally.
    // Overwriting with "=" would break candidate exchange.
    pc.addEventListener('iceconnectionstatechange',()=>{
      const s=pc.iceConnectionState;
      const info='h:'+ct.host+' s:'+ct.srflx+' r:'+ct.relay;
      console.log('[Online] ICE:',s,info);
      if(!el) return;
      if(s==='connected'||s==='completed') el.textContent='✓ linked! ('+info+')';
      else if(s==='checking')              el.textContent='③ checking... ('+info+')';
      else if(s==='disconnected')          el.textContent='✗ disconnected ('+info+')';
      else if(s==='failed')                el.textContent=(ct.relay===0?'✗ no relay candidates':'✗ all routes failed')+' ('+info+')';
    });
    pc.addEventListener('icegatheringstatechange',()=>{
      console.log('[Online] gathering:',pc.iceGatheringState,'h:'+ct.host,'s:'+ct.srflx,'r:'+ct.relay);
    });
    pc.addEventListener('icecandidate',e=>{
      if(e.candidate&&e.candidate.type) ct[e.candidate.type]=(ct[e.candidate.type]||0)+1;
    });
  },100);
  setTimeout(()=>clearInterval(check),30000);
}

// Detect if the connection is routed through a TURN relay.
// If so, halve the send rate to conserve the free 500MB/month quota.
function _detectRelay(conn){
  setTimeout(()=>{
    try{
      const pc=conn.peerConnection;
      if(!pc) return;
      pc.getStats().then(stats=>{
        stats.forEach(report=>{
          if(report.type==='candidate-pair'&&report.state==='succeeded'){
            const local=stats.get(report.localCandidateId);
            if(local&&local.candidateType==='relay'){
              _isRelayed=true;
              console.log('[Online] Using TURN relay — reduced send rate to save bandwidth');
            }
          }
        });
      });
    }catch(e){}
  },2000); // check 2s after open to let ICE settle
}


// ═══════════════════════════════════════════════════════════════════
// PREGAME SETTINGS (host only)
// ═══════════════════════════════════════════════════════════════════

let _onlineGameMode='classic', _onlineWinScore=7;

function onlineSetMode(m){
  _onlineGameMode=m;
  document.querySelectorAll('#online-gamemode-opts .opt-btn').forEach(b=>{
    b.classList.toggle('sel',b.dataset.gm===m);
  });
}
function onlineSetWin(n){
  _onlineWinScore=n;
  document.querySelectorAll('#online-score-opts .opt-btn').forEach(b=>{
    b.classList.toggle('sel',+b.dataset.score===n);
  });
}


// ═══════════════════════════════════════════════════════════════════
// GAME START / SETTINGS
// ═══════════════════════════════════════════════════════════════════

function onlineStartGame(){
  if(onlineRole!=='host'||!onlineConn||!onlineConn.open) return;
  nameLeft=_getOnlineName()||'Player 1';
  const msg={type:'gameStart',gameMode:_onlineGameMode,winScore:_onlineWinScore,
             skin:currentSkin,nameLeft,nameRight,matchFormat:1};
  onlineConn.send(msg);
  _onlineApplySettings(msg);
  _olEl['online-lobby'].style.display='none';
  startMatch('online');
  _startPing();
}

function _onlineApplySettings(data){
  gameMode=data.gameMode;   setGameMode(data.gameMode);
  winScore=data.winScore;   setWin(data.winScore);
  matchFormat=data.matchFormat||1; setMatch(data.matchFormat||1);
  if(data.skin) currentSkin=data.skin;
  nameLeft=data.nameLeft;
  nameRight=data.nameRight;
}

// Shared helper: set up guest game state (used by gameStart and rematch)
function _guestEnterGame(data){
  _onlineApplySettings(data);
  state=initGameState(); keys={}; lastFrameTime=0;
  document.getElementById('game-over').style.display='none';
  document.getElementById('match-over').style.display='none';
  document.getElementById('menu').style.display='none';
  document.getElementById('game-ui').style.display='flex';
  applyGameSkin(); enterGameplay(); fitCanvasToViewport();
  serving=true; serveSide='left'; countdown=3;
  _guestAnimId=requestAnimationFrame(guestRenderLoop);
}


// ═══════════════════════════════════════════════════════════════════
// HOST: RECEIVE GUEST MESSAGES
// ═══════════════════════════════════════════════════════════════════

function onlineHostReceive(data){
  switch(data.type){
    case 'input':
      guestPaddleY=data.y;
      break;
    case 'serve':
      if(serving&&countdown===0&&serveSide==='right') launchBall('right');
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


// ═══════════════════════════════════════════════════════════════════
// HOST: SEND STATE SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════

let _lastBricksAlive=-1;

function onlineSendState(now){
  if(!onlineConn||!onlineConn.open) return;
  const interval=_isRelayed?SEND_HZ_RELAY:SEND_HZ_DIRECT;
  if(now-_lastStateSend<interval) return;
  _lastStateSend=now;

  const msg={
    type:'state',
    left:{y:state.left.y,score:state.left.score},
    right:{y:state.right.y,score:state.right.score},
    ball:{x:state.ball.x,y:state.ball.y,vx:state.ball.vx,vy:state.ball.vy,
          size:state.ball.size,curve:state.ball.curve,spin:state.ball.spin},
    serving, serveSide, countdown,
    apu:activePowerups.map(p=>({type:p.type,side:p.side,st:p.startTime,et:p.endTime})),
    fpu:fieldPowerups.map(p=>({type:p.type,x:p.x,y:p.y,bo:p.bobOffset,st:p.spawnTime})),
    db:decoyBalls.map(d=>({x:d.x,y:d.y,vx:d.vx,vy:d.vy,spin:d.spin||0})),
    ss:shieldSide, rh:rallyHits, sa:shakeAmt, ch:chaosHue,
    dp:defenderPaddle?{side:defenderPaddle.side,y:defenderPaddle.y,x:defenderPaddle.x,h:defenderPaddle.h}:null,
    pa:portalA, pb:portalB
  };

  // Only include bricks when the count changes (avoids sending large arrays every frame)
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


// ═══════════════════════════════════════════════════════════════════
// GUEST: RECEIVE HOST MESSAGES
// ═══════════════════════════════════════════════════════════════════

function onlineGuestReceive(data){
  switch(data.type){
    case 'gameStart':
      _olEl['online-lobby'].style.display='none';
      _guestEnterGame(data);
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
      state.left.score=data.ls; state.right.score=data.rs;
      matchSets=data.matchSets||{left:0,right:0};
      endSet(data.winner);
      break;
    case 'matchEnd':
      matchSets=data.matchSets||{left:0,right:0};
      showMatchOver();
      break;
    case 'rematch':
      _guestEnterGame(data);
      break;
    case 'ping':
      if(onlineConn&&onlineConn.open) onlineConn.send({type:'pong',t:data.t,rt:performance.now()});
      break;
  }
}

const _soundMap={paddle:'paddle',wall:'wall',brick:'brick',serve:'serve',score:'score',gameWin:'gameWin'};
function _playRemoteSound(name,args){
  try{
    const fn=SOUNDS[currentSkin][_soundMap[name]];
    if(fn) fn(args&&args[0]);
  }catch(e){}
}


// ═══════════════════════════════════════════════════════════════════
// GUEST: APPLY STATE + CLIENT-SIDE PREDICTION
// ═══════════════════════════════════════════════════════════════════

function guestApplyState(data){
  if(!state) return;

  // Paddle: store target for per-frame lerp interpolation
  _netTargets.leftY=data.left.y;

  // Scores: snap immediately (no point interpolating integers)
  state.left.score=data.left.score;
  state.right.score=data.right.score;

  // Ball velocity + properties: always update (guest uses these to extrapolate)
  state.ball.vx=data.ball.vx; state.ball.vy=data.ball.vy;
  state.ball.size=data.ball.size; state.ball.curve=data.ball.curve; state.ball.spin=data.ball.spin;

  // Ball position: blend predicted position toward host's authoritative position.
  // Snap on first update or when serving (ball just teleported to paddle).
  if(!_netTargets._started||data.serving){
    state.ball.x=data.ball.x; state.ball.y=data.ball.y;
    state.left.y=data.left.y;
    _netTargets._started=true;
  }else{
    state.ball.x+=(data.ball.x-state.ball.x)*BALL_CORRECT;
    state.ball.y+=(data.ball.y-state.ball.y)*BALL_CORRECT;
  }
  _netTargets.ballX=data.ball.x; _netTargets.ballY=data.ball.y;

  // Game state flags
  serving=data.serving; serveSide=data.serveSide; countdown=data.countdown;
  rallyHits=data.rh; shakeAmt=data.sa; chaosHue=data.ch;
  shieldSide=data.ss;
  defenderPaddle=data.dp; portalA=data.pa; portalB=data.pb;

  // Power-ups and decoys
  activePowerups=data.apu.map(p=>({type:p.type,side:p.side,startTime:p.st,endTime:p.et}));
  fieldPowerups=data.fpu.map(p=>({type:p.type,x:p.x,y:p.y,bobOffset:p.bo,spawnTime:p.st}));
  decoyBalls=data.db;

  // Bricks: only sent when count changes
  if(data.bricks){
    bricks=data.bricks; brickMovePhase=data.bmp||0;
  }
}


// ═══════════════════════════════════════════════════════════════════
// GUEST: RENDER LOOP (no physics — prediction only)
// ═══════════════════════════════════════════════════════════════════

let _guestLastFrame=0;

function guestRenderLoop(){
  if(!onlineRole) return;
  const now=performance.now();
  if(!_guestLastFrame) _guestLastFrame=now;
  const dt=Math.min((now-_guestLastFrame)/TARGET_FRAME_MS,3);
  _guestLastFrame=now;

  if(state){
    // ── Own paddle: fully local, instant response ──
    const ph=getPH('right'), SPD=5;
    if(touchY.right!==null){
      state.right.y=Math.max(0,Math.min(H-ph,touchY.right-ph/2));
    }else{
      if(keys['w']||keys['W']||keys['ArrowUp'])   state.right.y-=SPD*dt;
      if(keys['s']||keys['S']||keys['ArrowDown'])  state.right.y+=SPD*dt;
      state.right.y=Math.max(0,Math.min(H-ph,state.right.y));
    }

    // ── Opponent paddle: smooth lerp toward network target ──
    if(_netTargets.leftY!==null){
      state.left.y+=(_netTargets.leftY-state.left.y)*PADDLE_LERP*dt;
    }

    // ── Ball: client-side prediction ──
    // Move ball forward every frame using host velocity. Host corrections
    // arrive in guestApplyState() and blend the position back on track.
    if(!serving){
      state.ball.x+=state.ball.vx*dt;
      state.ball.y+=state.ball.vy*dt;
      // Predict wall bounces so ball doesn't fly off-screen between corrections
      if(state.ball.y<=0||state.ball.y>=H){
        state.ball.vy*=-1;
        state.ball.y=Math.max(0,Math.min(H,state.ball.y));
      }
    }

    // ── Send paddle input (throttled to ~30Hz — sufficient with prediction) ──
    if(onlineConn&&onlineConn.open&&(now-_lastInputSend>=INPUT_SEND_HZ)){
      _lastInputSend=now;
      onlineConn.send({type:'input',y:state.right.y+ph/2});
    }
  }

  // Particles, effects, and drawing
  updateParticles(dt);
  shakeAmt=prefersReducedMotion?0:Math.max(0,shakeAmt-.6*dt);
  if(SKINS[currentSkin].chaos) chaosHue=(chaosHue+.8*dt)%360;
  _drawDt=dt;

  if(serving) drawServe(now);
  else draw(now);

  _guestAnimId=requestAnimationFrame(guestRenderLoop);
}


// ═══════════════════════════════════════════════════════════════════
// PING DISPLAY
// ═══════════════════════════════════════════════════════════════════

function _startPing(){
  _stopPing();
  if(onlineRole==='host'){
    _onlinePingInterval=setInterval(()=>{
      if(onlineConn&&onlineConn.open) onlineConn.send({type:'ping',t:performance.now()});
    },2000);
  }
  const el=_olEl['online-ping']||document.getElementById('online-ping');
  if(el) el.style.display='inline';
}
function _stopPing(){
  if(_onlinePingInterval){clearInterval(_onlinePingInterval);_onlinePingInterval=null;}
  const el=document.getElementById('online-ping');
  if(el){el.style.display='none';el.textContent='';}
}
function _updatePingDisplay(){
  const el=document.getElementById('online-ping');
  if(el) el.textContent=Math.round(onlineRTT)+'ms';
}


// ═══════════════════════════════════════════════════════════════════
// DISCONNECT / CLEANUP / REMATCH
// ═══════════════════════════════════════════════════════════════════

function onlineDisconnected(){
  _stopPing();
  if(_guestAnimId){cancelAnimationFrame(_guestAnimId);_guestAnimId=null;}
  if(animId){cancelAnimationFrame(animId);animId=null;}
  const overlay=document.getElementById('online-disconnect');
  if(overlay) overlay.style.display='flex';
}

function onlineDismissDisconnect(){
  const overlay=document.getElementById('online-disconnect');
  if(overlay) overlay.style.display='none';
  onlineCleanup();
  showMenu();
}

function onlineCleanup(){
  _stopPing();
  if(_hostConnTimeout){clearTimeout(_hostConnTimeout);_hostConnTimeout=null;}
  if(_guestConnTimeout){clearTimeout(_guestConnTimeout);_guestConnTimeout=null;}
  if(_guestAnimId){cancelAnimationFrame(_guestAnimId);_guestAnimId=null;}
  if(onlineConn){try{onlineConn.close();}catch(e){} onlineConn=null;}
  if(onlinePeer){try{onlinePeer.destroy();}catch(e){} onlinePeer=null;}
  onlineRole=null; guestPaddleY=null; onlineRTT=0;
  _lastBricksAlive=-1; _lastStateSend=0; _lastInputSend=0; _guestLastFrame=0;
  _isRelayed=false;
  _netTargets={leftY:null,ballX:null,ballY:null,_started:false};
  document.getElementById('online-lobby').style.display='none';
  document.getElementById('online-disconnect').style.display='none';
}

function onlineCancel(){
  onlineCleanup();
  showMenu();
}

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
