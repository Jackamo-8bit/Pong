#!/usr/bin/env node
// Smoke test: serves the game, opens it in headless Chrome or Edge and plays it.
// No npm install needed (Node 22+ for the built-in WebSocket).
//
//   node tests/smoke.mjs              all checks (online needs internet)
//   node tests/smoke.mjs --no-online  skip the online check
//   CHROME=/path/to/browser node tests/smoke.mjs   if no browser is found
//
// Exits 1 if any check fails.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONLINE = !process.argv.includes('--no-online');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BROWSERS = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function freePort() {
  return new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
}
async function waitFor(check, ms, what) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = await check().catch(() => null); if (v) return v; await sleep(200); }
  throw new Error('timed out waiting for ' + what);
}

// ── Minimal Chrome DevTools Protocol client (one socket, flat sessions) ──
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.listeners = new Set();
    this.ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) {
        const [res, rej] = this.pending.get(d.id); this.pending.delete(d.id);
        d.error ? rej(new Error(d.error.message)) : res(d.result);
      } else for (const l of this.listeners) l(d);
    };
  }
  open() { return new Promise((r, j) => { this.ws.onopen = r; this.ws.onerror = j; }); }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((res, rej) => this.pending.set(id, [res, rej]));
  }
}

async function newPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: true }); // own window: a background tab stops animating
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const errors = [];
  cdp.listeners.add(d => {
    if (d.sessionId !== sessionId) return;
    if (d.method === 'Runtime.exceptionThrown') { const x = d.params.exceptionDetails; errors.push(x.exception?.description || x.text); }
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map(a => a.value ?? a.description).join(' '));
  });
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  const page = {
    errors,
    async eval(expr) {
      const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url) {
      const loaded = new Promise(r => { const l = d => { if (d.sessionId === sessionId && d.method === 'Page.loadEventFired') { cdp.listeners.delete(l); r(); } }; cdp.listeners.add(l); });
      await cdp.send('Page.navigate', { url }, sessionId);
      await loaded; await sleep(300);
      await page.eval(HELPERS);
    },
  };
  return page;
}

// Injected into each page: run the game loop with a fake clock (50 ms a frame), far faster than real time.
const HELPERS = `
window.__fast=(frames,step)=>{
  const realNow=performance.now.bind(performance),realRAF=window.requestAnimationFrame;
  let t=realNow();performance.now=()=>t;window.requestAnimationFrame=()=>0;
  try{for(let i=0;i<frames;i++){t+=50;if(step()===false)return i;}return frames;}
  finally{performance.now=realNow;window.requestAnimationFrame=realRAF;}
};
window.__shown=id=>getComputedStyle(document.getElementById(id)).display!=='none';
'ok'`;

// ── Test runner ──
const results = [];
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function test(name, pages, fn) {
  const t0 = Date.now(), before = pages.map(p => p.errors.length);
  try {
    const note = await fn();
    const errs = pages.flatMap((p, i) => p.errors.slice(before[i]));
    assert(!errs.length, 'page errors:\n        ' + errs.join('\n        '));
    results.push(true);
    console.log(`  ✓ ${name}${note ? ' — ' + note : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    results.push(false);
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

// ── Run ──
const browserPath = BROWSERS.find(p => existsSync(p));
if (!browserPath) { console.error('No Chrome or Edge found. Set CHROME=/path/to/browser.'); process.exit(1); }
const port = await freePort();
const BASE = `http://localhost:${port}/`;
const profile = mkdtempSync(join(tmpdir(), 'pong-smoke-'));
const server = spawn('python3', ['serve.py', String(port)], { cwd: ROOT, stdio: 'ignore' });
const browser = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let cdp;
try {
  await waitFor(() => fetch(BASE).then(r => r.ok), 10000, 'game server');
  const devPort = await waitFor(async () => readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0], 10000, 'browser');
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${devPort}/json/version`)).json();
  cdp = new CDP(webSocketDebuggerUrl); await cdp.open();
  console.log(`Pong smoke test (${browserPath.split(/[\\/]/).pop()})`);

  const page = await newPage(cdp);
  await test('menu loads', [page], async () => {
    await page.goto(BASE);
    const r = await page.eval(`({menu:__shown('menu'),tiles:document.querySelectorAll('canvas.skin-preview').length,skins:Object.keys(SKINS).length})`);
    assert(r.menu, 'menu not visible');
    assert(r.tiles === r.skins, `${r.tiles} skin previews for ${r.skins} skins`);
  });

  // A full AI-vs-AI match in each mode: the left paddle is driven by the same AI as the right
  for (const [gm, skin] of [['classic', 'modern'], ['chaos', 'neon'], ['bricks', 'abstract']]) {
    await test(`${gm} match plays to the end`, [page], async () => {
      const r = await page.eval(`(()=>{
        showMenu();setGameMode('${gm}');currentSkin='${skin}';setWin(3);setMatch(1);setDiff('medium');
        startMatch('ai');cancelAnimationFrame(animId);
        let rally=0;
        const frames=__fast(40000,()=>{
          if(__shown('game-over')||__shown('match-over'))return false;
          moveAI(state.left,state.ball,'left',3);
          if(serving&&countdown===0&&serveSide==='left')launchBall('left');
          updateFrame();rally=Math.max(rally,rallyHits);
        });
        return {l:state.left.score,r:state.right.score,rally,frames,over:__shown('game-over')||__shown('match-over')};
      })()`);
      assert(r.over, `no result screen after ${r.frames} frames (score ${r.l}-${r.r})`);
      assert(Math.max(r.l, r.r) === 3, `final score ${r.l}-${r.r}, expected someone on 3`);
      assert(r.rally > 0, 'nobody ever returned the ball');
      return `${r.l}-${r.r}, longest rally ${r.rally}`;
    });
  }

  await test('every skin draws', [page], async () => {
    const r = await page.eval(`(()=>{
      const out=[];
      for(const sk of Object.keys(SKINS)){
        showMenu();setGameMode('classic');currentSkin=sk;startMatch('ai');cancelAnimationFrame(animId);
        __fast(150,()=>{if(serving&&countdown===0&&serveSide==='left')launchBall('left');updateFrame();});
        const px=document.getElementById('c').getContext('2d').getImageData(0,0,700,450).data;
        let lit=0;for(let i=0;i<px.length;i+=400)if(px[i]+px[i+1]+px[i+2]>0)lit++;
        out.push([sk,lit]);
      }
      showMenu();return out;
    })()`);
    const blank = r.filter(([, lit]) => !lit).map(([sk]) => sk);
    assert(!blank.length, 'blank canvas for: ' + blank.join(', '));
    return r.length + ' skins';
  });

  await test('survival round ends with a result', [page], async () => {
    const r = await page.eval(`(async()=>{
      showMenu();setGameMode('survival');currentSkin='forest';startMatch('ai');survStartTurn();cancelAnimationFrame(animId);
      const frames=__fast(40000,()=>{if(!survState.alive)return false;survUpdate();});
      await new Promise(r=>setTimeout(r,2000));
      const res={alive:survState.alive,frames,result:__shown('game-over'),text:document.getElementById('wtxt').textContent,inGameplay};
      showMenu();setGameMode('classic');return res;
    })()`);
    assert(!r.alive, `still alive after ${r.frames} frames`);
    assert(r.result, 'no result screen');
    assert(!r.inGameplay, 'still flagged as in gameplay on the result screen');
    return r.text;
  });

  await test('ladder match starts and returns', [page], async () => {
    const r = await page.eval(`(()=>{
      showMenu();showLadder();ladderPlay(0);cancelAnimationFrame(animId);
      __fast(300,()=>{if(serving&&countdown===0&&serveSide==='left')launchBall('left');updateFrame();});
      const res={name:nameRight,game:__shown('game-ui')};
      showMenu();return {...res,menu:__shown('menu'),mode:gameMode};
    })()`);
    assert(r.game && r.menu, 'did not show the game and then the menu');
    assert(r.mode === 'classic', `menu mode left as ${r.mode}`);
    return 'vs ' + r.name;
  });

  await test('settings are saved', [page], async () => {
    await page.eval(`setVolume(30);setMotion(true);setMusic(false);'ok'`);
    await page.goto(BASE);
    const r = await page.eval(`({vol:document.getElementById('set-vol').value,reduced:prefersReducedMotion,music:SETTINGS.music})`);
    await page.eval(`localStorage.removeItem('pong_settings');'ok'`);
    assert(r.vol === '30' && r.reduced === true && r.music === false, 'not restored: ' + JSON.stringify(r));
  });

  if (ONLINE) {
    const guest = await newPage(cdp);
    await guest.goto(BASE);
    await test('online: connect, play, pause, reconnect', [page, guest], async () => {
      await page.goto(BASE);
      const code = await page.eval(`(async()=>{showOnlineLobby();onlineHost();
        for(let i=0;i<75&&!document.getElementById('online-host-status').textContent.includes('waiting');i++)await new Promise(r=>setTimeout(r,200));
        return onlineRoomCode;})()`);
      assert(code, 'host could not register a room (is the internet up?)');
      await guest.eval(`showOnlineLobby();onlineShowJoin();document.getElementById('online-code-input').value='${code}';onlineJoin();'ok'`);
      await waitFor(() => page.eval(`!!(onlineConn&&onlineConn.open)&&__shown('online-pregame')`), 30000, 'guest to connect');
      await page.eval(`onlineStartGame();state.left.score=2;'ok'`);
      await waitFor(() => guest.eval(`mode==='online'&&state&&state.left.score===2`), 8000, 'guest to receive the score');
      await guest.eval(`togglePause();'ok'`);
      await waitFor(() => page.eval(`paused===true`), 5000, 'pause to reach the host');
      await page.eval(`togglePause();'ok'`);
      await waitFor(() => guest.eval(`paused===false`), 5000, 'resume to reach the guest');
      await guest.eval(`onlineConn.peerConnection.close();'ok'`); // drop the link without warning
      await waitFor(() => guest.eval(`_reconnecting`), 10000, 'guest to notice the drop');
      await waitFor(async () => (await guest.eval(`!_reconnecting&&!!onlineConn&&onlineConn.open`)) && (await page.eval(`!_reconnecting&&!!onlineConn&&onlineConn.open`)), 30000, 'both sides to reconnect');
      const r = await guest.eval(`({score:state.left.score,paused})`);
      assert(r.score === 2, `score after reconnect is ${r.score}, expected 2`);
      await page.eval(`onlineCleanup();showMenu();'ok'`);
      await guest.eval(`onlineCleanup();showMenu();'ok'`);
      return 'room ' + code;
    });
  }

  // Last, because it stops the server
  await test('works offline after the first visit', [page], async () => {
    await page.goto(BASE);
    await waitFor(() => page.eval(`navigator.serviceWorker.ready.then(r=>!!r.active)`), 15000, 'service worker');
    await page.goto(BASE);
    assert(await page.eval(`!!navigator.serviceWorker.controller`), 'page not controlled by the service worker');
    server.kill();
    await waitFor(() => fetch(BASE).then(() => false, () => true), 5000, 'server to stop');
    await page.goto(BASE);
    const r = await page.eval(`({menu:__shown('menu'),started:typeof startMatch==='function'})`);
    assert(r.menu && r.started, 'game did not load offline');
  });
} catch (e) {
  results.push(false);
  console.log('  ✗ setup failed: ' + e.message);
} finally {
  try { cdp?.ws.close(); } catch {}
  browser.kill(); server.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
const failed = results.filter(r => !r).length;
console.log(failed ? `\n${failed} of ${results.length} checks failed` : `\nAll ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
