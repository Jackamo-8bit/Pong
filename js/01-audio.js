// ═══════════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════════
let audioCtx=null, muted=false, masterVolume=0.8, audioUnlocked=false;
function getAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
// Mobile audio unlock — iOS/Chrome require AudioContext.resume() on a user gesture
function unlockAudio(){
  if(audioUnlocked)return;
  const ac=getAudio();
  if(ac.state==='suspended'){
    ac.resume().then(()=>{audioUnlocked=true;});
  }else{audioUnlocked=true;}
  // Also play a silent buffer to fully unlock on iOS WebKit
  const buf=ac.createBuffer(1,1,ac.sampleRate);
  const src=ac.createBufferSource();src.buffer=buf;src.connect(ac.destination);src.start(0);
}
['touchstart','touchend','click','keydown'].forEach(evt=>{
  document.addEventListener(evt,unlockAudio,{once:false,passive:true});
});

// Master gain node for volume control
let masterGain=null;
function getMasterGain(){
  if(!masterGain){const ac=getAudio();masterGain=ac.createGain();masterGain.connect(ac.destination);masterGain.gain.value=masterVolume;}
  return masterGain;
}

function playTone(freq,type,dur,vol,st,endFreq){
  if(muted)return;
  const ac=getAudio(),o=ac.createOscillator(),g=ac.createGain();
  o.connect(g);g.connect(getMasterGain());
  o.type=type;o.frequency.setValueAtTime(freq,st);
  if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,st+dur);
  g.gain.setValueAtTime(vol,st);g.gain.exponentialRampToValueAtTime(0.001,st+dur);
  o.start(st);o.stop(st+dur);
  o.onended=()=>{o.disconnect();g.disconnect();};
}
function playNoise(dur,vol,st){
  if(muted)return;
  const ac=getAudio(),buf=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const src=ac.createBufferSource();src.buffer=buf;
  const g=ac.createGain();src.connect(g);g.connect(getMasterGain());
  g.gain.setValueAtTime(vol,st);g.gain.exponentialRampToValueAtTime(0.001,st+dur);
  src.start(st);src.stop(st+dur);
  src.onended=()=>{src.disconnect();g.disconnect();};
}
function toggleMute(){muted=!muted;setPongButton('mutebtn','volume',muted?'Muted':'Sound');}
function setVolume(v){
  masterVolume=v/100;
  if(masterGain)masterGain.gain.value=masterVolume;
  saveSetting('vol',+v);
  document.querySelectorAll('.vol-slider').forEach(s=>s.value=v);
  if(v==0&&!muted)toggleMute();
  if(v>0&&muted){muted=false;setPongButton('mutebtn','volume','Sound');}
}

// Power-up specific sounds
const PU_SOUNDS={
  // Ball modifiers: low bass thud + characteristic tone
  decoy:()=>{const ac=getAudio(),t=ac.currentTime;playTone(180,'triangle',.15,.2,t);playTone(360,'sine',.1,.12,t+.05);playTone(540,'sine',.08,.08,t+.1);},
  bouncy:()=>{const ac=getAudio(),t=ac.currentTime;playTone(200,'sine',.15,.2,t);playTone(400,'sine',.12,.12,t+.06,600);},
  curve:()=>{const ac=getAudio(),t=ac.currentTime;playTone(300,'sine',.15,.2,t,500);playTone(500,'sine',.12,.12,t+.08,300);},
  bigball:()=>{const ac=getAudio(),t=ac.currentTime;playTone(150,'triangle',.2,.2,t);playTone(300,'sine',.15,.15,t+.06);},
  smallball:()=>{const ac=getAudio(),t=ac.currentTime;playTone(800,'sine',.12,.15,t);playTone(1200,'sine',.08,.1,t+.05);},
  // Paddle modifiers: bright chime + ping
  widepaddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(880,'sine',.12,.2,t);playTone(1100,'sine',.1,.12,t+.08);playTone(1320,'sine',.08,.08,t+.16);},
  slowmo:()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'sine',.4,.2,t,150);playTone(300,'triangle',.3,.12,t+.1,100);},
  // Portal: spacey whoosh — descending sweep with noise
  portal:()=>{const ac=getAudio(),t=ac.currentTime;playTone(1200,'sine',.4,.2,t,200);playTone(800,'triangle',.5,.12,t+.05,150);playNoise(.3,.06,t);},
  // Shield: metallic clang + rising tone
  shield:()=>{const ac=getAudio(),t=ac.currentTime;playTone(220,'square',.08,.3,t);playTone(440,'triangle',.15,.2,t+.05);playTone(880,'sine',.2,.15,t+.1);playTone(1320,'sine',.15,.1,t+.18);},
  // Ghost: eerie descending whisper
  ghost:()=>{const ac=getAudio(),t=ac.currentTime;playTone(900,'sine',.5,.15,t,300);playTone(700,'sine',.4,.1,t+.1,200);playNoise(.2,.04,t+.05);},
  // Magnet: buzzing electromagnetic hum
  magnet:()=>{const ac=getAudio(),t=ac.currentTime;playTone(120,'sawtooth',.3,.2,t);playTone(240,'sawtooth',.25,.12,t+.05);playTone(360,'sine',.2,.1,t+.1);},
  // Defender: military horn/alert
  // Black hole: deep rumble + warp
  blackhole:()=>{const ac=getAudio(),t=ac.currentTime;playTone(60,'sawtooth',.5,.25,t,30);playTone(400,'sine',.3,.15,t,1200);playNoise(.3,.08,t);},
  // Invert: glitchy scramble
  invert:()=>{const ac=getAudio(),t=ac.currentTime;for(let i=0;i<6;i++)playTone(200+Math.random()*800,'square',.05,.15,t+i*.04);},
  // Slow Mo: low stretch
  slowmo:()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'sine',.4,.2,t,150);playTone(300,'triangle',.3,.12,t+.1,100);},
  // Curved Paddle: bendy twang
  // Laser: high-energy zap
  laser:()=>{const ac=getAudio(),t=ac.currentTime;playTone(1800,'sawtooth',.3,.2,t,600);playTone(2400,'sine',.2,.1,t+.05);playNoise(.15,.06,t);},
  // Freeze: crystalline chime
  freeze:()=>{const ac=getAudio(),t=ac.currentTime;[1200,1600,2000,2400].forEach((f,i)=>playTone(f,'sine',.12,.12,t+i*.06));},
  // Bomb: deep boom
  bomb:()=>{const ac=getAudio(),t=ac.currentTime;playTone(80,'sawtooth',.4,.3,t,40);playNoise(.5,.15,t);playTone(200,'square',.2,.12,t+.05,60);},
  // Multiball: rapid ping cascade
  multiball:()=>{const ac=getAudio(),t=ac.currentTime;[500,700,900].forEach((f,i)=>playTone(f,'triangle',.08,.15,t+i*.06));},
  // Slow-mo survival: stretchy low tone
  survslowmo:()=>{const ac=getAudio(),t=ac.currentTime;playTone(300,'sine',.5,.2,t,120);playTone(200,'triangle',.4,.15,t+.1,80);},
  // Magnet paddle: magnetic hum
  magnetpaddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(150,'sawtooth',.3,.2,t);playTone(300,'sine',.25,.15,t+.08);},
  // Fireball: crackling flame
  fireball:()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'sawtooth',.15,.2,t,800);playNoise(.3,.1,t);playTone(600,'triangle',.1,.12,t+.08);},
  // Shrink row: swoosh away
  shrinkrow:()=>{const ac=getAudio(),t=ac.currentTime;playTone(800,'sine',.2,.15,t,200);playTone(400,'sine',.15,.1,t+.1,100);},
};
// Add haptics to all PU sounds
for(const k of Object.keys(PU_SOUNDS)){const orig=PU_SOUNDS[k];PU_SOUNDS[k]=(...a)=>{haptic([20,10,20]);orig(...a);};}

// Pitched countdown: 3=low, 2=mid, 1=high, 0=GO (higher+longer)
function playCountdownBeep(n){
  if(muted)return;
  const ac=getAudio(),t=ac.currentTime;
  const freqs={3:330,2:440,1:550,0:880};
  const dur=n===0?0.25:0.12, vol=n===0?0.35:0.25;
  playTone(freqs[n]??440,'square',dur,vol,t);
  if(n===0)playTone(freqs[n]*1.25,'square',dur*.8,vol*.6,t+0.06);
}

// Haptic feedback for mobile
function haptic(ms){if(SETTINGS.haptics===false)return;try{navigator.vibrate&&navigator.vibrate(ms);}catch{}}
// Wrap a sound set so each call also triggers haptic feedback,
// and an online host replays it on the guest (power-ups go via puPopup instead)
const BUZZ={paddle:12,wall:8,brick:15,powerup:[20,10,20],score:40,gameWin:[30,20,30,20,50]};
function withHaptics(snd){
  const out={};
  for(const k of Object.keys(snd))out[k]=(...a)=>{
    if(BUZZ[k])haptic(BUZZ[k]);
    if(k!=='powerup'&&onlineRole==='host'&&onlineConn&&onlineConn.open)onlineConn.send({type:'sound',name:k,args:a});
    snd[k](...a);
  };
  return out;
}

const SOUNDS={
  retro:{
    paddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(480,'square',.07,.3,t);},
    wall:  ()=>{const ac=getAudio(),t=ac.currentTime;playTone(240,'square',.06,.2,t);},
    brick: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'square',.08,.25,t);},
    powerup:()=>{const ac=getAudio(),t=ac.currentTime;[600,800,1000,1200].forEach((f,i)=>playTone(f,'square',.08,.25,t+i*.06));},
    serve: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(660,'square',.15,.3,t);},
    score: (won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[523,659,784,1047].forEach((f,i)=>playTone(f,'square',.12,.25,t+i*.13));}else{[300,220,180].forEach((f,i)=>playTone(f,'square',.15,.25,t+i*.16));}},
    gameWin:(won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[523,659,784,659,784,1047].forEach((f,i)=>playTone(f,'square',.14,.3,t+i*.13));}else{[400,320,260,200].forEach((f,i)=>playTone(f,'square',.18,.3,t+i*.18));}}
  },
  modern:{
    paddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(600,'sine',.08,.18,t,400);},
    wall:  ()=>{const ac=getAudio(),t=ac.currentTime;playTone(350,'sine',.07,.12,t,250);},
    brick: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'sine',.08,.18,t,300);},
    powerup:()=>{const ac=getAudio(),t=ac.currentTime;[[440,0],[554,.1],[659,.2],[880,.3]].forEach(([f,d])=>playTone(f,'sine',.15,.2,t+d));},
    serve: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(880,'sine',.15,.2,t,660);},
    score: (won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[440,0],[554,.12],[659,.24],[880,.36]].forEach(([f,d])=>playTone(f,'sine',.2,.2,t+d));}else{playTone(300,'sine',.4,.2,t,150);}},
    gameWin:(won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[440,0],[554,.15],[659,.3],[880,.45],[1108,.6]].forEach(([f,d])=>playTone(f,'sine',.25,.25,t+d));}else{playTone(220,'sine',.8,.2,t,80);}}
  },
  abstract:{
    paddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(800+Math.random()*400,'sawtooth',.06,.15,t,200+Math.random()*200);playNoise(.05,.08,t);},
    wall:  ()=>{const ac=getAudio(),t=ac.currentTime;playTone(1200,'sawtooth',.04,.1,t,300);},
    brick: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(600,'sawtooth',.08,.15,t,300);playTone(1200,'sawtooth',.04,.08,t);},
    powerup:()=>{const ac=getAudio(),t=ac.currentTime;for(let i=0;i<5;i++)playTone(400+Math.random()*1000,'sawtooth',.08,.15,t+i*.05);},
    serve: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(1000,'sawtooth',.1,.2,t,500);playNoise(.08,.06,t);},
    score: (won)=>{const ac=getAudio(),t=ac.currentTime;if(won){for(let i=0;i<6;i++)playTone(400+Math.random()*800,'sawtooth',.1,.15,t+i*.08);}else{playTone(150,'sawtooth',.5,.2,t,60);playNoise(.4,.1,t);}},
    gameWin:(won)=>{const ac=getAudio(),t=ac.currentTime;if(won){for(let i=0;i<10;i++)playTone(300+Math.random()*1000,'sawtooth',.12,.15,t+i*.07);}else{playTone(200,'sawtooth',1,.2,t,40);playNoise(.8,.12,t);}}
  },
  forest:{
    paddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(320,'sine',.15,.12,t,280);playTone(480,'sine',.1,.08,t,440);},
    wall:  ()=>{const ac=getAudio(),t=ac.currentTime;playTone(260,'sine',.12,.1,t,220);},
    brick: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(280,'sine',.08,.12,t,220);},
    powerup:()=>{const ac=getAudio(),t=ac.currentTime;[[392,0],[494,.12],[587,.24],[784,.36]].forEach(([f,d])=>{playTone(f,'sine',.2,.15,t+d);playTone(f*1.5,'sine',.15,.07,t+d);});},
    serve: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(523,'sine',.2,.18,t);playTone(784,'sine',.15,.1,t+.08);},
    score: (won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[392,0],[494,.18],[587,.36]].forEach(([f,d])=>{playTone(f,'sine',.25,.18,t+d);playTone(f*1.5,'sine',.2,.08,t+d);});}else{playTone(220,'sine',.5,.15,t,160);}},
    gameWin:(won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[261,0],[329,.2],[392,.4],[523,.6],[659,.8],[784,1]].forEach(([f,d])=>{playTone(f,'sine',.3,.2,t+d);playTone(f*1.25,'sine',.25,.1,t+d+.05);});}else{[300,240,200,160].forEach((f,i)=>playTone(f,'sine',.3,.15,t+i*.2));}}
  },
  neon:{
    paddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(700,'triangle',.06,.2,t,500);playTone(1400,'sine',.03,.08,t);},
    wall:  ()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'triangle',.05,.12,t,300);},
    brick: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'sine',.08,.15,t,300);},
    powerup:()=>{const ac=getAudio(),t=ac.currentTime;[800,1000,1200,1400,1600].forEach((f,i)=>playTone(f,'triangle',.1,.18,t+i*.05));},
    serve: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(900,'triangle',.12,.22,t,600);playTone(1800,'sine',.06,.08,t+.04);},
    score: (won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[600,0],[800,.1],[1000,.2],[1200,.3],[1600,.4]].forEach(([f,d])=>playTone(f,'triangle',.15,.2,t+d));}else{playTone(250,'triangle',.5,.18,t,100);}},
    gameWin:(won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[523,0],[659,.12],[784,.24],[1047,.36],[1319,.48],[1568,.6]].forEach(([f,d])=>playTone(f,'triangle',.2,.25,t+d));}else{[350,280,220,160,100].forEach((f,i)=>playTone(f,'triangle',.2,.2,t+i*.15));}}
  },
  deco:{
    paddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(392,'sine',.12,.2,t);playTone(784,'sine',.06,.1,t+.02);},
    wall:  ()=>{const ac=getAudio(),t=ac.currentTime;playTone(294,'triangle',.08,.15,t);playTone(588,'sine',.04,.06,t);},
    brick: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(349,'sine',.1,.18,t);playTone(523,'triangle',.06,.08,t+.03);},
    powerup:()=>{const ac=getAudio(),t=ac.currentTime;[[349,0],[440,.1],[523,.2],[659,.3],[784,.4]].forEach(([f,d])=>{playTone(f,'sine',.12,.18,t+d);playTone(f*1.5,'sine',.06,.06,t+d);});},
    serve: ()=>{const ac=getAudio(),t=ac.currentTime;playTone(523,'sine',.18,.22,t);playTone(659,'sine',.12,.12,t+.1);playTone(784,'sine',.08,.08,t+.18);},
    score: (won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[523,0],[659,.14],[784,.28],[1047,.42]].forEach(([f,d])=>{playTone(f,'sine',.2,.2,t+d);playTone(f*1.5,'sine',.1,.08,t+d+.04);});}else{playTone(262,'sine',.5,.2,t,130);playTone(196,'triangle',.3,.15,t+.12);}},
    gameWin:(won)=>{const ac=getAudio(),t=ac.currentTime;if(won){[[523,0],[659,.16],[784,.32],[1047,.48],[1319,.64],[1568,.8]].forEach(([f,d])=>{playTone(f,'sine',.25,.22,t+d);playTone(f*1.5,'sine',.12,.08,t+d);});}else{[392,330,262,220,165].forEach((f,i)=>playTone(f,'sine',.25,.18,t+i*.18));}}
  }
};
// Apply haptics to all sound sets
for(const k of Object.keys(SOUNDS))SOUNDS[k]=withHaptics(SOUNDS[k]);

// ═══════════════════════════════════════════════════════════════════
// MUSIC: a short chord loop per skin, synthesised live (no audio files).
// Plays during matches only, and stops while paused, muted or switched off in Settings.
// ═══════════════════════════════════════════════════════════════════
const CHORD={M:[0,4,7,12],m:[0,3,7,12],M7:[0,4,7,11],m7:[0,3,7,10],d7:[0,4,7,10],s:[0,2,7,12]};
// div: steps per beat. chords: [semitones from root, quality], one bar each.
// arp: chord-tone index per step (null = rest). bass: steps in each bar that get a bass note.
const MUSIC={
  retro:   {bpm:140,div:4,root:220,lead:'square',  bassW:'square',  lv:.035,len:.8, chords:[[0,'m'],[-4,'M'],[3,'M'],[-2,'M']],arp:[0,1,2,3,2,1],bass:[0,4,8,12]},
  modern:  {bpm:108,div:2,root:262,lead:'sine',    bassW:'triangle',lv:.06, len:1.6,chords:[[0,'M7'],[9,'m7'],[5,'M7'],[7,'d7']],arp:[0,2,null,1,3,null,2,null],bass:[0,3,6]},
  abstract:{bpm:96, div:2,root:196,lead:'sawtooth',bassW:'square',  lv:.025,len:.6, chords:[[0,'s'],[6,'s'],[1,'s'],[7,'s']],arp:[0,null,3,1,null,2,null,null,3],bass:[0,5]},
  forest:  {bpm:66, div:2,root:196,lead:'sine',    bassW:'sine',    lv:.07, len:3,  chords:[[0,'s'],[5,'s'],[-3,'s'],[-5,'s']],arp:[0,null,2,null,1,null,3,null],bass:[0]},
  neon:    {bpm:100,div:4,root:165,lead:'triangle',bassW:'sawtooth',lv:.04, len:.9, chords:[[0,'m'],[-4,'M'],[-7,'M'],[-2,'M']],arp:[0,1,2,1,3,2,1,2],bass:[0,2,4,6,8,10,12,14]},
  deco:    {bpm:120,div:2,root:220,lead:'triangle',bassW:'sine',    lv:.05, len:1.2,chords:[[2,'m7'],[7,'d7'],[0,'M7'],[9,'d7']],arp:[0,1,2,3,2,null,1,null],bass:[0,2,4,6],swing:.33}
};
let _musicStep=0,_musicNext=0;
function _musicTick(){
  const tr=MUSIC[currentSkin];
  if(!tr||!inGameplay||paused||muted||SETTINGS.music===false||document.hidden||!audioCtx){_musicNext=0;return;}
  const ac=audioCtx,stepDur=60/tr.bpm/tr.div,bar=4*tr.div,f=n=>tr.root*2**(n/12);
  if(_musicNext<ac.currentTime){_musicNext=ac.currentTime+.05;_musicStep=0;} // (re)start from the top
  while(_musicNext<ac.currentTime+.2){
    const s=_musicStep,[root,q]=tr.chords[Math.floor(s/bar)%tr.chords.length],tones=CHORD[q];
    const t=_musicNext+(s%2&&tr.swing?tr.swing*stepDur:0),a=tr.arp[s%tr.arp.length];
    if(a!=null)playTone(f(root+tones[a]+12),tr.lead,stepDur*tr.len,tr.lv,t);
    if(tr.bass.includes(s%bar)){ // bass rings until the next bass note
      const next=tr.bass.find(x=>x>s%bar)??bar+tr.bass[0];
      playTone(f(root-12),tr.bassW,(next-s%bar)*stepDur*.9,tr.lv*1.6,t);
    }
    _musicStep++;_musicNext+=stepDur;
  }
}
setInterval(_musicTick,50);
