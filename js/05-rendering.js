// ═══════════════════════════════════════════════════════════════════
// DRAWING
// ═══════════════════════════════════════════════════════════════════
function drawDecoBg(sk){
  ctx.save();
  // Sunburst rays from center
  ctx.strokeStyle=sk.fg;ctx.lineWidth=1;ctx.globalAlpha=.035;
  const cx=W/2,cy=H/2,maxR=Math.sqrt(W*W+H*H)/2;
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*maxR,cy+Math.sin(a)*maxR);ctx.stroke();
  }
  // Corner ornaments — stepped Art Deco brackets
  ctx.strokeStyle=sk.fg;ctx.lineWidth=1;ctx.globalAlpha=.08;
  const co=6,cl=28,cs=14;
  [[co,co,1,1],[W-co,co,-1,1],[co,H-co,1,-1],[W-co,H-co,-1,-1]].forEach(([ox,oy,dx,dy])=>{
    ctx.beginPath();ctx.moveTo(ox,oy+dy*cl);ctx.lineTo(ox,oy);ctx.lineTo(ox+dx*cl,oy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ox+dx*4,oy+dy*cs);ctx.lineTo(ox+dx*4,oy+dy*4);ctx.lineTo(ox+dx*cs,oy+dy*4);ctx.stroke();
  });
  // Midline: chain of diamonds
  ctx.fillStyle=sk.fg;ctx.globalAlpha=.12;
  for(let y=6;y<H;y+=18){
    ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx+4,y+5);ctx.lineTo(cx,y+10);ctx.lineTo(cx-4,y+5);ctx.closePath();ctx.fill();
  }
  // Center circle ornament (double ring)
  ctx.strokeStyle=sk.fg;ctx.lineWidth=1.5;ctx.globalAlpha=.1;
  ctx.beginPath();ctx.arc(cx,cy,30,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,24,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}
// Bauhaus hue: step between primaries (red, yellow, blue) instead of smooth rainbow
function bauhausColor(offset,sat,lum){
  const h=(chaosHue+(offset||0))%360;
  const primaries=[5,50,220];
  const bh=primaries[Math.floor(((h%360+360)%360)/120)];
  return`hsl(${bh},${sat||85}%,${lum||50}%)`;
}
// Helper: returns chaos fill — delegates to bauhaus stepping when active
function chaosColorFill(sk,offset,sat,lum){
  if(sk.bauhaus)return bauhausColor(offset,sat,lum);
  return`hsl(${chaosHue+(offset||0)},${sat||100}%,${lum||60}%)`;
}
// Bauhaus background: bold diagonals, overlapping geometry
function drawBauhausBg(sk){
  ctx.save();
  const cx=W/2,cy=H/2;
  // Bold diagonal slashes
  ctx.strokeStyle=sk.fg;ctx.lineWidth=1.5;ctx.globalAlpha=.04;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W,H);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W,0);ctx.lineTo(0,H);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W*.3,0);ctx.lineTo(W,H*.7);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,H*.3);ctx.lineTo(W*.7,H);ctx.stroke();
  // Overlapping geometric shapes
  ctx.globalAlpha=.025;
  ctx.fillStyle='#cc2222';ctx.fillRect(W*.08,H*.15,W*.12,H*.35);
  ctx.fillStyle='#3250b4';ctx.beginPath();ctx.arc(W*.75,H*.3,H*.15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d2b432';ctx.fillRect(W*.6,H*.6,W*.2,H*.2);
  // Horizontal parallel lines (bottom left, top right)
  ctx.strokeStyle=sk.accent;ctx.lineWidth=1;ctx.globalAlpha=.04;
  for(let i=0;i<5;i++){
    ctx.beginPath();ctx.moveTo(8,H-40+i*6);ctx.lineTo(W*.25,H-40+i*6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(W*.75,30+i*6);ctx.lineTo(W-8,30+i*6);ctx.stroke();
  }
  // Midline: bold vertical with small circles
  ctx.strokeStyle=sk.accent;ctx.lineWidth=2;ctx.globalAlpha=.1;
  ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,H);ctx.stroke();
  ctx.globalAlpha=.08;ctx.lineWidth=1;
  for(let y=20;y<H;y+=40){
    ctx.beginPath();ctx.arc(cx,y,5,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
}
// Forest zen background: tree trunks, vine midline, ambient leaves
let forestLeaves=[];
function drawForestBg(sk,now){
  ctx.save();
  const cx=W/2;
  // Faint vertical tree trunks
  ctx.strokeStyle='#2a4a20';ctx.globalAlpha=.06;ctx.lineWidth=3;
  const trunkXs=[W*.1,W*.22,W*.38,W*.62,W*.78,W*.9];
  for(const tx of trunkXs){
    ctx.beginPath();ctx.moveTo(tx,0);ctx.lineTo(tx+1,H);ctx.stroke();
    // Small branch stubs
    const by1=H*.25+tx%30,by2=H*.6+tx%20;
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(tx,by1);ctx.lineTo(tx+(tx<cx?-12:12),by1-8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(tx,by2);ctx.lineTo(tx+(tx<cx?-10:10),by2-6);ctx.stroke();
    ctx.lineWidth=3;
  }
  // Vine midline — sinuous curve instead of straight dashes
  ctx.strokeStyle='#3d6835';ctx.lineWidth=1.5;ctx.globalAlpha=.12;
  ctx.beginPath();ctx.moveTo(cx,0);
  for(let y=0;y<=H;y+=4){
    const wave=Math.sin(y*.02+now*.0005)*6;
    ctx.lineTo(cx+wave,y);
  }
  ctx.stroke();
  // Small vine leaves along midline
  ctx.fillStyle='#4a7a40';ctx.globalAlpha=.08;
  for(let y=30;y<H;y+=45){
    const wave=Math.sin(y*.02+now*.0005)*6;
    const side=y%90<45?1:-1;
    ctx.beginPath();
    ctx.ellipse(cx+wave+side*5,y,4,2.5,side*.5,0,Math.PI*2);
    ctx.fill();
  }
  // Falling leaf particles
  if(forestLeaves.length<18&&Math.random()<.04){
    forestLeaves.push({x:Math.random()*W,y:-10,vx:(Math.random()-.5)*.4,vy:.3+Math.random()*.4,rot:Math.random()*Math.PI*2,rotV:(Math.random()-.5)*.04,size:3+Math.random()*4,color:Math.random()<.5?'#5a8a50':Math.random()<.5?'#d4a030':'#8ab870',alpha:.25+Math.random()*.2});
  }
  for(let i=forestLeaves.length-1;i>=0;i--){
    const lf=forestLeaves[i];
    lf.x+=lf.vx+Math.sin(now*.001+i)*.15;
    lf.y+=lf.vy;lf.rot+=lf.rotV;
    if(lf.y>H+10){forestLeaves.splice(i,1);continue;}
    ctx.save();ctx.translate(lf.x,lf.y);ctx.rotate(lf.rot);
    ctx.fillStyle=lf.color;ctx.globalAlpha=lf.alpha;
    ctx.beginPath();ctx.ellipse(0,0,lf.size,lf.size*.5,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
function drawModernBg(sk,now){
  ctx.save();
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#1b2432');
  bg.addColorStop(.52,'#121420');
  bg.addColorStop(1,'#2c2b3c');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  ctx.globalAlpha=.42;
  ctx.fillStyle=sk.midline;
  for(let y=10;y<H;y+=26)ctx.fillRect(W/2-2,y,4,13);

  const pulse=.35+.18*Math.sin(now/650);
  const glow=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,W*.62);
  glow.addColorStop(0,`rgba(183,109,104,${pulse*.16})`);
  glow.addColorStop(.35,'rgba(183,109,104,.035)');
  glow.addColorStop(1,'rgba(18,20,32,0)');
  ctx.globalAlpha=1;ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);

  ctx.strokeStyle='rgba(183,109,104,.16)';ctx.lineWidth=1;
  ctx.strokeRect(8,8,W-16,H-16);
  ctx.strokeStyle='rgba(245,242,240,.055)';
  ctx.strokeRect(14,14,W-28,H-28);
  ctx.restore();
}
function drawPaddle(x,y,ph,sk,glow){
  ctx.save();
  if(sk.neonGlow||(glow&&!sk.modern)){
    ctx.shadowColor=sk.neonGlow?sk.fg:(activePowerups.length?POWER_UPS[activePowerups[activePowerups.length-1].type].color:sk.fg);
    ctx.shadowBlur=sk.neonGlow?16:12;
  }
  ctx.fillStyle=sk.chaos?chaosColorFill(sk,120,100,60):sk.fg;
  if(sk.paddleShape==='rounded'){ctx.beginPath();ctx.roundRect(x,y,PW,ph,5);ctx.fill();}
  else if(sk.paddleShape==='pixel'){
    ctx.fillStyle=sk.accent;
    ctx.fillRect(x-1,y,PW+2,ph);
    ctx.fillStyle='rgba(245,242,240,.18)';
    ctx.fillRect(x+1,y+3,2,Math.max(0,ph-6));
    ctx.fillStyle='rgba(0,0,0,.25)';
    ctx.fillRect(x+PW-1,y+3,2,Math.max(0,ph-6));
  }
  else if(sk.paddleShape==='thin'){ctx.fillRect(x+3,y,PW-6,ph);}
  else if(sk.paddleShape==='deco'){
    // Art Deco stepped column paddle
    const cx=x+PW/2,capH=ph*0.08,stepH=ph*0.04;
    // Top ornamental cap (wide)
    ctx.fillRect(x-2,y,PW+4,capH);
    ctx.fillRect(x-1,y+capH,PW+2,stepH);
    // Main column body
    ctx.fillRect(x,y+capH+stepH,PW,ph-2*(capH+stepH));
    // Bottom ornamental cap (wide)
    ctx.fillRect(x-1,y+ph-capH-stepH,PW+2,stepH);
    ctx.fillRect(x-2,y+ph-capH,PW+4,capH);
    // Central accent line
    ctx.strokeStyle=sk.accent;ctx.lineWidth=.7;ctx.globalAlpha=.5;
    ctx.beginPath();ctx.moveTo(cx,y+capH+stepH+4);ctx.lineTo(cx,y+ph-capH-stepH-4);ctx.stroke();
    // Horizontal accent bars
    ctx.globalAlpha=.3;ctx.lineWidth=.5;
    const barY1=y+ph*0.3,barY2=y+ph*0.7;
    ctx.beginPath();ctx.moveTo(x+1,barY1);ctx.lineTo(x+PW-1,barY1);ctx.moveTo(x+1,barY2);ctx.lineTo(x+PW-1,barY2);ctx.stroke();
  }
  else{ctx.fillRect(x,y,PW,ph);}
  // Chaos: add dashed outline for colorblind differentiation
  if(sk.chaos){ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.globalAlpha=.4;ctx.setLineDash([3,3]);ctx.strokeRect(x,y,PW,ph);ctx.setLineDash([]);}
  ctx.restore();
}
function drawBall(x,y,BS,sk,isDecoy,isGhost){
  ctx.save();
  ctx.globalAlpha=isGhost?(.06+.04*Math.sin(performance.now()/300)):(isDecoy?.55:1);
  if(sk.neonGlow&&!isDecoy&&!isGhost){ctx.shadowColor=sk.accent;ctx.shadowBlur=20;}
  // Zen forest: warm firefly glow
  if(sk.zen&&!isDecoy&&!isGhost){ctx.shadowColor='#d4a030';ctx.shadowBlur=18+4*Math.sin(performance.now()/400);}
  ctx.fillStyle=isDecoy?(sk.chaos?chaosColorFill(sk,90,80,50):sk.fg):(sk.chaos?chaosColorFill(sk,0,100,60):sk.accent);
  if(sk.ballShape==='pixel'){
    const px=Math.round(x),py=Math.round(y),s=Math.max(4,BS);
    ctx.fillRect(px+Math.floor(s*.2),py,s-Math.floor(s*.4),s);
    ctx.fillRect(px,py+Math.floor(s*.2),s,s-Math.floor(s*.4));
    ctx.fillStyle='rgba(245,242,240,.2)';
    ctx.fillRect(px+Math.floor(s*.25),py+Math.floor(s*.18),Math.max(1,Math.floor(s*.2)),Math.max(1,Math.floor(s*.2)));
  }
  else if(sk.ballShape==='circle'){ctx.beginPath();ctx.arc(x+BS/2,y+BS/2,BS/2,0,Math.PI*2);ctx.fill();}
  else if(sk.ballShape==='diamond'){ctx.beginPath();ctx.moveTo(x+BS/2,y);ctx.lineTo(x+BS,y+BS/2);ctx.lineTo(x+BS/2,y+BS);ctx.lineTo(x,y+BS/2);ctx.closePath();ctx.fill();}
  else{ctx.fillRect(x,y,BS,BS);}
  // Zen forest: outer firefly halo
  if(sk.zen&&!isDecoy&&!isGhost){
    const bcx=x+BS/2,bcy=y+BS/2,pulse=.12+.06*Math.sin(performance.now()/300);
    const grd=ctx.createRadialGradient(bcx,bcy,BS/2,bcx,bcy,BS*2);
    grd.addColorStop(0,'rgba(212,160,48,.15)');grd.addColorStop(.5,`rgba(212,160,48,${pulse})`);grd.addColorStop(1,'rgba(212,160,48,0)');
    ctx.fillStyle=grd;ctx.beginPath();ctx.arc(bcx,bcy,BS*2,0,Math.PI*2);ctx.fill();
  }
  // Deco: sunburst rays around the ball
  if(sk.deco&&!isDecoy&&!isGhost){
    ctx.strokeStyle=sk.fg;ctx.lineWidth=.6;ctx.globalAlpha=.25;
    const bcx=x+BS/2,bcy=y+BS/2;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      ctx.beginPath();ctx.moveTo(bcx+Math.cos(a)*BS*.55,bcy+Math.sin(a)*BS*.55);
      ctx.lineTo(bcx+Math.cos(a)*BS*1.3,bcy+Math.sin(a)*BS*1.3);ctx.stroke();
    }
    // Outer ring
    ctx.globalAlpha=.15;ctx.beginPath();ctx.arc(bcx,bcy,BS*.9,0,Math.PI*2);ctx.stroke();
  }
  // Chaos: crosshair on real ball, X on decoys for colorblind differentiation
  if(sk.chaos&&!isGhost){
    ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.globalAlpha=isDecoy?.3:.5;
    if(isDecoy){ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+BS-2,y+BS-2);ctx.moveTo(x+BS-2,y+2);ctx.lineTo(x+2,y+BS-2);ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(x+BS/2,y+1);ctx.lineTo(x+BS/2,y+BS-1);ctx.moveTo(x+1,y+BS/2);ctx.lineTo(x+BS-1,y+BS/2);ctx.stroke();}
  }
  ctx.restore();
}
function drawModernPowerupGlyph(type,x,y,size,color){
  safeDrawPixelPuIcon(type,x,y,size,color);
}
function drawFieldPowerup(now){
  for(const fp of fieldPowerups){
    const pu=POWER_UPS[fp.type],elapsed=now-fp.spawnTime,lr=1-elapsed/POWERUP_LIFESPAN;
    const bob=Math.sin((now/400)+fp.bobOffset)*5,px=fp.x,py=fp.y+bob,R=22;
    const pulse=.5+.5*Math.sin(now/200);
    ctx.save();
    ctx.globalAlpha=.2+.15*pulse;ctx.strokeStyle=pu.color;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(px,py,R+4+pulse*4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(px,py,R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fill();
    ctx.strokeStyle=pu.color;ctx.lineWidth=2;ctx.globalAlpha=lr;ctx.stroke();
    ctx.strokeStyle=pu.color;ctx.lineWidth=3;ctx.globalAlpha=.6*lr;
    ctx.beginPath();ctx.arc(px,py,R+2,-Math.PI/2,-Math.PI/2+Math.PI*2*lr);ctx.stroke();
    ctx.globalAlpha=1;
    drawModernPowerupGlyph(fp.type,px,py,24,pu.color);
    ctx.font='bold 8px monospace';ctx.fillStyle=pu.color;ctx.globalAlpha=lr;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText(fp.type.toUpperCase(),px,py+R+12);
    ctx.globalAlpha=1;ctx.restore();
  }
}
function drawActivePuHud(now){
  if(!activePowerups.length)return;
  const sk=SKINS[currentSkin];
  const barW=130,barH=20;
  // Stack bars: left-side PUs on bottom-left, right-side on bottom-right
  let leftIdx=0,rightIdx=0;
  for(const ap of activePowerups){
    const pu=POWER_UPS[ap.type],ratio=pu.duration>0?Math.max(0,Math.min(1,1-(now-ap.startTime)/pu.duration)):0;
    const idx=ap.side==='left'?leftIdx++:rightIdx++;
    const bx=ap.side==='left'?30:W-30-barW;
    const by=H-32-idx*(barH+4);
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.7)';ctx.beginPath();ctx.roundRect(bx,by,barW,barH,7);ctx.fill();
    ctx.strokeStyle=sk.accent;ctx.lineWidth=1.5;ctx.globalAlpha=.5;ctx.beginPath();ctx.roundRect(bx,by,barW,barH,7);ctx.stroke();
    if(ratio>0){
      ctx.globalAlpha=.85;ctx.fillStyle=pu.color;ctx.beginPath();ctx.roundRect(bx,by,barW*ratio,barH,Math.min(7,barW*ratio/2));ctx.fill();
    }
    ctx.globalAlpha=1;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#fff';
    drawModernPowerupGlyph(ap.type,bx+11,by+barH/2,14,pu.color);
    ctx.font='bold 9px monospace';ctx.fillStyle='#fff';ctx.fillText(pu.name,bx+22,by+barH/2);
    ctx.textBaseline='alphabetic';ctx.restore();
  }
}
function drawRallyHud(){
  if(rallyHits<1)return;
  const sk=SKINS[currentSkin];
  const gb=globalRallyPB();
  // Detect rally hit increase for shake
  if(rallyHits>prevRallyHits)rallyShake=0.8;
  prevRallyHits=rallyHits;
  rallyShake*=Math.pow(0.88,_drawDt);if(rallyShake<0.02)rallyShake=0;
  ctx.save();ctx.textAlign='center';
  const rallyAlpha=Math.min(1,(rallyHits)/4)*.8;
  ctx.globalAlpha=rallyAlpha;
  // Pop scale animation
  const popElapsed=performance.now()-rallyPopT;
  const popScale=popElapsed<250?1+.3*(1-popElapsed/250):1;
  // Growth scale based on rally length
  const growScale=rallyHits>=3?Math.min(1+(rallyHits-3)*0.04,1.6):1;
  const totalScale=popScale*growScale;
  const shakeX=rallyShake>0?(Math.random()-0.5)*rallyShake*2:0;
  const shakeY=rallyShake>0?(Math.random()-0.5)*rallyShake*2:0;
  ctx.translate(W/2+shakeX,H-28+shakeY);ctx.scale(totalScale,totalScale);
  ctx.font='bold 13px monospace';ctx.fillStyle=sk.chaos?chaosColorFill(sk,60,100,70):sk.accent;
  ctx.fillText(`RALLY  ${rallyHits}`,0,0);
  if(rallyHits>=sessionRallyPB&&rallyHits>=5){
    ctx.globalAlpha=rallyAlpha*.75;
    ctx.font='9px monospace';ctx.fillStyle=sk.fg;
    ctx.fillText('best rally!',0,14);
  }
  ctx.globalAlpha=1;ctx.restore();
}

// Serve aim indicator — improved with gradient line, speed dots, and wider arrow
function drawServeAim(now,side){
  const sk=SKINS[currentSkin];
  const paddle=state[side],ph=getPH(side);
  const offset=(paddle.y+ph/2-H/2)/(H/2);
  const vy=offset*3.5,vx=(side==='left'?1:-1)*BASE_SPEED;
  const len=90,scale=len/Math.sqrt(vx*vx+vy*vy);
  const dx=vx*scale,dy=vy*scale;
  const sx=W/2,sy=H/2;
  const pulse=.5+.4*Math.sin(now/200);
  const ang=Math.atan2(dy,dx);

  ctx.save();

  // Gradient line
  const grad=ctx.createLinearGradient(sx,sy,sx+dx,sy+dy);
  grad.addColorStop(0,sk.accent);
  grad.addColorStop(1,'rgba(255,255,255,0)');
  ctx.globalAlpha=pulse;ctx.strokeStyle=grad;ctx.lineWidth=2.5;ctx.setLineDash([6,4]);
  ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+dx,sy+dy);ctx.stroke();
  ctx.setLineDash([]);

  // Speed dots along the line
  const dotCount=4;
  const dotPhase=(now/150)%1;
  for(let i=0;i<dotCount;i++){
    const t=((i+dotPhase)/dotCount);
    if(t>1)continue;
    const dotX=sx+dx*t,dotY=sy+dy*t;
    ctx.globalAlpha=pulse*(1-t)*.7;
    ctx.fillStyle=sk.accent;
    ctx.beginPath();ctx.arc(dotX,dotY,2,0,Math.PI*2);ctx.fill();
  }

  // Arrowhead (wider)
  ctx.globalAlpha=pulse;ctx.fillStyle=sk.accent;ctx.beginPath();
  ctx.moveTo(sx+dx,sy+dy);
  ctx.lineTo(sx+dx-12*Math.cos(ang-.35),sy+dy-12*Math.sin(ang-.35));
  ctx.lineTo(sx+dx-12*Math.cos(ang+.35),sy+dy-12*Math.sin(ang+.35));
  ctx.closePath();ctx.fill();

  // Angle strength indicator text
  const strength=Math.abs(offset);
  if(strength>.15){
    ctx.globalAlpha=.4*pulse;ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle=sk.fg;
    const label=strength>.7?'sharp':strength>.4?'angled':'slight';
    ctx.fillText(label,sx+dx*.5,sy+dy*.5-10);
  }

  ctx.globalAlpha=1;ctx.restore();
}

function drawServe(now){
  const s=state,sk=SKINS[currentSkin];
  fillCanvasBg(sk.chaos?chaosColorFill(sk,200,60,5):sk.bg);
  ctx.save();ctx.translate(MARGIN,MARGIN);
  if(sk.modern)drawModernBg(sk,now);
  // Neon skin: subtle grid lines
  if(sk.neonGlow){
    ctx.save();ctx.strokeStyle=sk.midline;ctx.lineWidth=.5;ctx.globalAlpha=.15;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.globalAlpha=1;ctx.restore();
  }
  if(sk.modern){}
  else if(sk.deco){drawDecoBg(sk);}
  else if(sk.zen){drawForestBg(sk,performance.now());}
  else if(sk.bauhaus){drawBauhausBg(sk);}
  else{ctx.strokeStyle=sk.midline;ctx.setLineDash([8,8]);ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);}
  ctx.fillStyle=sk.chaos?chaosColorFill(sk,60,100,75):sk.fg;
  ctx.font=sk.scoreFont;ctx.textAlign='center';
  ctx.save();ctx.shadowColor=sk.accent;ctx.shadowBlur=12;
  ctx.fillText(s.left.score,W/2-80,60);ctx.fillText(s.right.score,W/2+80,60);
  ctx.restore();
  ctx.font='12px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.7;
  ctx.fillText(nameLeft,W/2-80,78);ctx.fillText(nameRight,W/2+80,78);ctx.globalAlpha=1;
  const LP=24,RP=W-24-PW,dlPH=getPH('left'),drPH=getPH('right');
  const lG=hasAPU('widepaddle')&&getAPU('widepaddle').side==='left'||hasAPU('shortpaddle')&&getAPU('shortpaddle').side==='right';
  const rG=hasAPU('widepaddle')&&getAPU('widepaddle').side==='right'||hasAPU('shortpaddle')&&getAPU('shortpaddle').side==='left';
  drawPaddle(LP,s.left.y,dlPH,sk,lG);drawPaddle(RP,s.right.y,drPH,sk,rG);
  drawParticles();
  if(gameMode==='bricks')drawBricks();

  ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(-MARGIN,-MARGIN,W+MARGIN*2,H+MARGIN*2);

  if(countdown>0){
    ctx.font='bold 80px monospace';ctx.textAlign='center';ctx.fillStyle=sk.fg;
    ctx.globalAlpha=.9;ctx.fillText(countdown,W/2,H/2+28);ctx.globalAlpha=1;
  }else{
    const sideIsAI=(tourney&&tourneyAI[serveSide])||(mode==='ai'&&serveSide==='right');
    const humanServes=!sideIsAI;
    if(humanServes)drawServeAim(now,serveSide);

    const serveName=playerName(serveSide);
    ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillStyle=sk.fg;
    ctx.fillText(`${serveName}'s serve`,W/2,H/2-18);
    ctx.font='11px monospace';ctx.fillStyle=sk.accent;
    ctx.globalAlpha=.5+.5*Math.sin(now/300);
    if(humanServes){
      const isMobile='ontouchstart'in window;
      ctx.fillText(isMobile?'touch to aim \u00b7 release to serve':'W/S or \u2191/\u2193 to aim \u00b7 space to serve',W/2,H/2+14);
    }
    ctx.globalAlpha=1;
    if(sideIsAI&&now-countdownT>800)launchBall(serveSide);
  }

  if(matchFormat>1){
    ctx.font='10px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.45;ctx.textAlign='center';
    ctx.fillText(`Set ${currentSet}  \u00b7  ${nameLeft} ${matchSets.left}\u2013${matchSets.right} ${nameRight}`,W/2,20);ctx.globalAlpha=1;
  }
  ctx.font='11px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.4;ctx.textAlign='center';
  ctx.fillText(nameLeft,W/2-70,H-18);ctx.fillText(nameRight,W/2+70,H-18);ctx.globalAlpha=1;
  ctx.restore();
}

function draw(now){
  const s=state,sk=SKINS[currentSkin];
  fillCanvasBg(sk.chaos?chaosColorFill(sk,200,60,5):sk.bg);
  ctx.save();ctx.translate(MARGIN,MARGIN);
  if(sk.modern)drawModernBg(sk,now);

  // Subtle zoom at high rallies — centered on ball
  if(rallyHits>=10&&!serving){
    const zoomAmt=Math.min((rallyHits-9)*0.008,0.08);
    const bx=s.ball.x+s.ball.size/2,by=s.ball.y+s.ball.size/2;
    ctx.translate(bx,by);ctx.scale(1+zoomAmt,1+zoomAmt);ctx.translate(-bx,-by);
  }

  // Neon skin: grid overlay
  if(sk.neonGlow){
    ctx.save();ctx.strokeStyle=sk.midline;ctx.lineWidth=.5;ctx.globalAlpha=.12;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.globalAlpha=1;ctx.restore();
  }

  if(sk.modern){}
  else if(sk.deco){drawDecoBg(sk);}
  else if(sk.zen){drawForestBg(sk,performance.now());}
  else if(sk.bauhaus){drawBauhausBg(sk);}
  else{
    ctx.strokeStyle=sk.midline;ctx.setLineDash([8,8]);ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
  }

  // Midline proximity glow
  const midProximity=1-Math.min(Math.abs(s.ball.x-W/2)/(W/2),1);
  if(midProximity>0.3){
    ctx.save();
    const glowAlpha=(midProximity-0.3)*0.5;
    ctx.strokeStyle=sk.accent;ctx.setLineDash([8,8]);
    ctx.globalAlpha=glowAlpha*0.4;ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();
    ctx.globalAlpha=glowAlpha;ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
  }

  // Decay score flash (dt-aware — computed in update() before draw())
  const vizDt=Math.min(_drawDt,1.5); // cap visual decay so animations stay smooth at low FPS
  leftScoreFlash*=Math.pow(0.88,vizDt);rightScoreFlash*=Math.pow(0.88,vizDt);
  if(leftScoreFlash<0.05)leftScoreFlash=0;
  if(rightScoreFlash<0.05)rightScoreFlash=0;

  ctx.fillStyle=sk.chaos?chaosColorFill(sk,60,100,75):sk.fg;
  ctx.textAlign='center';
  ctx.save();ctx.shadowColor=sk.accent;ctx.shadowBlur=12;
  // Left score with flash
  ctx.save();
  const lFlashScale=1+leftScoreFlash*0.4;
  ctx.font=sk.scoreFont;
  if(leftScoreFlash>0){ctx.globalAlpha=Math.min(1,1+leftScoreFlash*0.3);ctx.translate(W/2-80,60);ctx.scale(lFlashScale,lFlashScale);ctx.fillText(s.left.score,0,0);}
  else{ctx.fillText(s.left.score,W/2-80,60);}
  ctx.restore();
  // Right score with flash
  ctx.save();ctx.shadowColor=sk.accent;ctx.shadowBlur=12;
  ctx.fillStyle=sk.chaos?chaosColorFill(sk,60,100,75):sk.fg;
  const rFlashScale=1+rightScoreFlash*0.4;
  ctx.font=sk.scoreFont;
  if(rightScoreFlash>0){ctx.globalAlpha=Math.min(1,1+rightScoreFlash*0.3);ctx.translate(W/2+80,60);ctx.scale(rFlashScale,rFlashScale);ctx.fillText(s.right.score,0,0);}
  else{ctx.fillText(s.right.score,W/2+80,60);}
  ctx.restore();
  ctx.restore();
  ctx.font='12px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.7;
  ctx.fillText(nameLeft,W/2-80,78);ctx.fillText(nameRight,W/2+80,78);ctx.globalAlpha=1;

  if(matchFormat>1){
    ctx.font='10px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.4;ctx.textAlign='center';
    ctx.fillText(`Set ${currentSet}  \u00b7  ${nameLeft} ${matchSets.left}\u2013${matchSets.right} ${nameRight}`,W/2,20);ctx.globalAlpha=1;
  }

  const LP=24,RP=W-24-PW,dlPH=getPH('left'),drPH=getPH('right');
  const lG=hasAPU('widepaddle')&&getAPU('widepaddle').side==='left'||hasAPU('shortpaddle')&&getAPU('shortpaddle').side==='right';
  const rG=hasAPU('widepaddle')&&getAPU('widepaddle').side==='right'||hasAPU('shortpaddle')&&getAPU('shortpaddle').side==='left';
  // Curved paddle visual — draw convex bulge on opponent's paddle
  const cpPU=getAPU('curvedpaddle');
  const curvedL=cpPU&&cpPU.side!=='left';
  const curvedR=cpPU&&cpPU.side!=='right';
  drawPaddle(LP,s.left.y,dlPH,sk,lG);
  if(curvedL){ctx.save();ctx.strokeStyle=POWER_UPS.curvedpaddle.color;ctx.lineWidth=2.5;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(LP+PW+12,s.left.y+dlPH/2,dlPH*.6,-Math.PI*.45,Math.PI*.45);ctx.stroke();ctx.restore();}
  drawPaddle(RP,s.right.y,drPH,sk,rG);
  if(curvedR){ctx.save();ctx.strokeStyle=POWER_UPS.curvedpaddle.color;ctx.lineWidth=2.5;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(RP-12,s.right.y+drPH/2,drPH*.6,Math.PI*.55,Math.PI*1.45);ctx.stroke();ctx.restore();}
  // Defender paddle
  if(defenderPaddle){
    const dp=defenderPaddle;
    ctx.save();ctx.globalAlpha=.7;ctx.fillStyle=POWER_UPS.defender.color;
    ctx.fillRect(dp.x,dp.y,8,dp.h);
    ctx.strokeStyle=POWER_UPS.defender.color;ctx.lineWidth=1;ctx.globalAlpha=.3;
    ctx.strokeRect(dp.x-1,dp.y-1,10,dp.h+2);
    ctx.restore();
  }
  // Shield indicator — glowing line at the goal
  if(shieldSide){
    const sx2=shieldSide==='left'?2:W-4;
    ctx.save();ctx.fillStyle=POWER_UPS.shield.color;ctx.globalAlpha=.5+.3*Math.sin(now/200);
    ctx.fillRect(sx2,0,4,H);
    ctx.shadowColor=POWER_UPS.shield.color;ctx.shadowBlur=12;ctx.fillRect(sx2,0,4,H);
    ctx.restore();
  }
  // Portal visuals — black centre with purple swirling pixels
  if(hasAPU('portal')&&portalA&&portalB){
    [portalA,portalB].forEach((p,i)=>{
      ctx.save();
      // Black void centre
      const grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,22);
      grd.addColorStop(0,'rgba(0,0,0,.95)');
      grd.addColorStop(.7,'rgba(20,0,30,.8)');
      grd.addColorStop(1,'rgba(80,0,120,.0)');
      ctx.fillStyle=grd;
      ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.fill();
      // Outer purple ring
      const pulse=.5+.3*Math.sin(now/250+(i*Math.PI));
      ctx.globalAlpha=.4+.2*pulse;ctx.strokeStyle='#a855f7';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.stroke();
      // Swirling purple pixels/dots
      const dotCount=12;
      const baseAng=now/500+(i*Math.PI);
      for(let d=0;d<dotCount;d++){
        const ang=baseAng+(Math.PI*2/dotCount)*d;
        const r=8+6*Math.sin(now/300+d*1.3);
        const dx=p.x+Math.cos(ang)*r;
        const dy=p.y+Math.sin(ang)*r;
        const sz=1.5+Math.sin(now/200+d*2)*.8;
        ctx.globalAlpha=.5+.4*Math.sin(now/180+d);
        ctx.fillStyle=d%3===0?'#c084fc':d%3===1?'#a855f7':'#7c3aed';
        ctx.fillRect(dx-sz/2,dy-sz/2,sz,sz);
      }
      // Inner swirl — second layer, tighter orbit
      for(let d=0;d<8;d++){
        const ang=-baseAng*1.4+(Math.PI*2/8)*d;
        const r=3+3*Math.sin(now/250+d*.9);
        const dx=p.x+Math.cos(ang)*r;
        const dy=p.y+Math.sin(ang)*r;
        ctx.globalAlpha=.6+.3*Math.sin(now/150+d);
        ctx.fillStyle='#e9d5ff';
        ctx.fillRect(dx-1,dy-1,2,2);
      }
      ctx.restore();
    });
  }
  drawParticles();drawFieldPowerup(now);
  if(hasAPU('decoy')){for(const db of decoyBalls)drawBall(db.x,db.y,10,sk,true);}
  const BS=s.ball.size||10;
  const isGhost=hasAPU('ghost');
  // Ball trail — fades in from rally 4, full at rally 10 (always in chaos mode)
  const trailIntensity=gameMode==='chaos'?1:Math.min(1,Math.max(0,(rallyHits-4)/6));
  if(trailIntensity>0&&ballTrail.length>1){
    ctx.save();
    for(let i=0;i<ballTrail.length-1;i++){
      const t=ballTrail[i],a=(i+1)/ballTrail.length*0.3*trailIntensity;
      ctx.globalAlpha=a;ctx.fillStyle=sk.accent;
      if(sk.ballShape==='circle'){ctx.beginPath();ctx.arc(t.x+BS/2,t.y+BS/2,BS/2*.7,0,Math.PI*2);ctx.fill();}
      else{ctx.fillRect(t.x+BS*.15,t.y+BS*.15,BS*.7,BS*.7);}
    }
    ctx.restore();
  }
  drawBall(s.ball.x,s.ball.y,BS,sk,false,isGhost);
  drawActivePuHud(now);drawRallyHud();
  if(gameMode==='bricks')drawBricks();
  if(gameMode==='chaos'){
    ctx.save();ctx.font='bold 9px monospace';ctx.fillStyle='#ff4444';
    ctx.globalAlpha=.7;ctx.textAlign='left';ctx.fillText('CHAOS',6,14);
    ctx.globalAlpha=1;ctx.restore();
    // Intensity vignette when 3+ power-ups active
    const puCount=activePowerups.length;
    if(puCount>=3){
      ctx.save();
      const intensity=Math.min((puCount-2)*0.04,0.18);
      const pulse=0.5+0.5*Math.sin(now/150);
      const vg=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.75);
      vg.addColorStop(0,'transparent');
      vg.addColorStop(1,`hsla(${chaosHue},100%,50%,${intensity*pulse})`);
      ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
  }
  if(gameMode==='bricks'){
    const rem=bricks.filter(b=>b.alive).length;
    ctx.save();ctx.font='bold 9px monospace';ctx.fillStyle=sk.accent;
    ctx.globalAlpha=.7;ctx.textAlign='left';ctx.fillText(`BRICKS ${rem}`,6,14);
    ctx.globalAlpha=1;ctx.restore();
    // Brick points HUD
    ctx.save();ctx.font='12px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.4;ctx.textAlign='center';
    if(brickPoints.left>0)ctx.fillText(`+${brickPoints.left} bricks`,W*.25,85);
    if(brickPoints.right>0)ctx.fillText(`+${brickPoints.right} bricks`,W*.75,85);
    ctx.globalAlpha=1;ctx.restore();
  }

  if(paused){
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(-MARGIN,-MARGIN,W+MARGIN*2,H+MARGIN*2);
    ctx.fillStyle=sk.fg;ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.fillText('PAUSED',W/2,H/2-10);
    ctx.font='13px monospace';ctx.fillStyle=sk.accent;ctx.fillText('press P to resume',W/2,H/2+22);
  }

  ctx.font='11px monospace';ctx.fillStyle=sk.fg;ctx.globalAlpha=.4;ctx.textAlign='center';
  ctx.fillText(nameLeft,W/2-70,H-18);ctx.fillText(nameRight,W/2+70,H-18);ctx.globalAlpha=1;
  ctx.restore();
}
