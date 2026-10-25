# Pong

A browser-based Pong game with multiple modes, themes, power-ups, tournaments, and local leaderboards.

## Features

- 2 player local play
- Play against AI with easy, medium, and hard difficulty
- Game modes: Classic, Chaos, Bricks, and Survival
- Tournament mode for 2-8 players
- Multiple visual skins, including the Modern pixel theme
- Power-ups with pixel-style icons and effects
- Local hall of fame saved in the browser
- Music for each skin
- Settings for volume, music, vibration and reduced motion, remembered between visits
- Mobile touch controls and installable PWA support, playable offline after the first visit (except online matches)

## How to Run

No build step is required. You can run it with the included Python server:

```bash
python3 serve.py
```

Then open:

```text
http://localhost:8080
```

You can also pass a custom port:

```bash
python3 serve.py 3000
```

## Testing

A smoke test opens the game in headless Chrome or Edge and plays it: every mode, every skin, a Survival round, the ladder, saved settings, an online match between two windows (including a dropped connection), and loading offline. It needs Node 22 or newer and nothing else:

```bash
node tests/smoke.mjs
```

Add `--no-online` to skip the online check, which needs internet. If no browser is found, set `CHROME=/path/to/browser`.

## Controls

- Left paddle: `W` / `S`
- Right paddle: arrow keys
- Serve: `Space`
- Pause: `P`
- Volume: `+` / `-`
- Test panel (developers): add `?debug` to the URL, e.g. `http://localhost:8080/?debug`, then press `T`

On mobile, use the touch zones on either side of the screen.

## Game Modes

- **Classic**: Standard Pong.
- **Chaos**: Faster power-up focused matches.
- **Bricks**: Pong with breakable brick obstacles.
- **Survival**: Single-player survival challenge.
- **Tournament**: Local bracket mode for multiple players and AI.

## Project Structure

```text
index.html
css/styles.css
js/01-audio.js
js/02-config-and-state.js
js/03-effects-powerups-bricks.js
js/04-classic-gameplay.js
js/05-rendering.js
js/06-survival.js
js/07-tournament.js
js/08-boot-and-test.js
js/09-online.js
js/10-ladder.js
tests/smoke.mjs
serve.py
manifest.json
icon.svg
sw.js
```

## Notes

This is a vanilla HTML, CSS, and JavaScript project. It does not require npm, a framework, or a bundler.

Game data such as leaderboard scores and achievements are stored locally in the browser.
