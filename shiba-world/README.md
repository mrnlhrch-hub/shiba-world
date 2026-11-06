# Shiba World (online)

One tiny Node server hosts the game AND the multiplayer (WebSocket at /ws). No dependencies.

## Put it online (free, ~5 minutes, easiest from a computer)
1. Create a free GitHub account, make a new repository (e.g. `shiba-world`), and upload everything in this folder
   (server.js, package.json, render.yaml, the `public` folder).
2. Go to https://render.com, sign up with GitHub, choose New > Web Service, pick the repo.
   Runtime: Node. Build command: `echo no build`. Start command: `node server.js`. Plan: Free.
3. When it's live you get a link like https://shiba-world.onrender.com. Open it: tap the player bar (top left)
   to make a private room and share the link or the 5-letter code.

Note: free Render servers sleep after ~15 min idle, so the first open can take up to a minute.

## Install as an app
Open your link in Chrome on Android > menu > "Install app" / "Add to Home screen".
It opens full-screen with its own icon.

## Real .apk file (optional)
Go to https://www.pwabuilder.com, paste your link, choose Android, download the package.

## Run locally
`node server.js` then open http://localhost:3000 (two tabs = two players).
