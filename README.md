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
- Mobile touch controls and installable PWA support

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

## Controls

- Left paddle: `W` / `S`
- Right paddle: arrow keys
- Serve: `Space`
- Pause: `P`
- Volume: `+` / `-`
- Test panel: `T`

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
serve.py
manifest.json
sw.js
```

## Notes

This is a vanilla HTML, CSS, and JavaScript project. It does not require npm, a framework, or a bundler.

Game data such as leaderboard scores and achievements are stored locally in the browser.
