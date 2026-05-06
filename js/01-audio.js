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
  if(v==0&&!muted)toggleMute();
  if(v>0&&muted){muted=false;setPongButton('mutebtn','volume','Sound');}
}

// Power-up specific sounds
const PU_SOUNDS={
  // Ball modifiers: low bass thud + characteristic tone
  decoy:()=>{const ac=getAudio(),t=ac.currentTime;playTone(180,'triangle',.15,.2,t);playTone(360,'sine',.1,.12,t+.05);playTone(540,'sine',.08,.08,t+.1);},
  bouncy:()=>{const ac=getAudio(),t=ac.currentTime;playTone(200,'sine',.15,.2,t);playTone(400,'sine',.12,.12,t+.06,600);},
  lead:()=>{const ac=getAudio(),t=ac.currentTime;playTone(100,'sawtooth',.2,.25,t);playTone(80,'sawtooth',.15,.15,t+.08);},
  curve:()=>{const ac=getAudio(),t=ac.currentTime;playTone(300,'sine',.15,.2,t,500);playTone(500,'sine',.12,.12,t+.08,300);},
  bigball:()=>{const ac=getAudio(),t=ac.currentTime;playTone(150,'triangle',.2,.2,t);playTone(300,'sine',.15,.15,t+.06);},
  smallball:()=>{const ac=getAudio(),t=ac.currentTime;playTone(800,'sine',.12,.15,t);playTone(1200,'sine',.08,.1,t+.05);},
  // Paddle modifiers: bright chime + ping
  widepaddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(880,'sine',.12,.2,t);playTone(1100,'sine',.1,.12,t+.08);playTone(1320,'sine',.08,.08,t+.16);},
  shortpaddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(600,'triangle',.12,.2,t,400);playTone(400,'triangle',.1,.12,t+.06,200);},
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
  defender:()=>{const ac=getAudio(),t=ac.currentTime;playTone(523,'triangle',.1,.25,t);playTone(659,'triangle',.1,.25,t+.12);playTone(784,'triangle',.2,.25,t+.24);},
  // Black hole: deep rumble + warp
  blackhole:()=>{const ac=getAudio(),t=ac.currentTime;playTone(60,'sawtooth',.5,.25,t,30);playTone(400,'sine',.3,.15,t,1200);playNoise(.3,.08,t);},
  // Invert: glitchy scramble
  invert:()=>{const ac=getAudio(),t=ac.currentTime;for(let i=0;i<6;i++)playTone(200+Math.random()*800,'square',.05,.15,t+i*.04);},
  // Slow Mo: low stretch
  slowmo:()=>{const ac=getAudio(),t=ac.currentTime;playTone(400,'sine',.4,.2,t,150);playTone(300,'triangle',.3,.12,t+.1,100);},
  // Curved Paddle: bendy twang
  curvedpaddle:()=>{const ac=getAudio(),t=ac.currentTime;playTone(500,'triangle',.15,.2,t,800);playTone(800,'triangle',.15,.15,t+.1,400);},
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
function haptic(ms){try{navigator.vibrate&&navigator.vibrate(ms);}catch{}}
// Wrap a sound set so each call also triggers haptic feedback
function withHaptics(snd){
  return{
    paddle:(...a)=>{haptic(12);snd.paddle(...a);},
    wall:(...a)=>{haptic(8);snd.wall(...a);},
    brick:(...a)=>{haptic(15);snd.brick(...a);},
    powerup:(...a)=>{haptic([20,10,20]);snd.powerup(...a);},
    serve:(...a)=>{snd.serve(...a);},
    score:(...a)=>{haptic(40);snd.score(...a);},
    gameWin:(...a)=>{haptic([30,20,30,20,50]);snd.gameWin(...a);}
  };
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
