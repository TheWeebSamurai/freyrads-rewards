import Express from 'express'
import config from './config'
import { Lootlabs } from './libs/lootlabs/lootlab'
const app = Express()
import { redis } from './libs/redis'
import cookieParser from "cookie-parser";

app.use(cookieParser());
app.use(Express.json())
app.get('/', (req, res) => { 
res.status(200).json({message: "Freyr Rewards API is running."})
})

// app.post('/test', async (req, res) => {
//     const lootlabs = new Lootlabs()
//     let link = await lootlabs.createLink("TESTCODE12345")
//     res.status(200).json({message: "Link created", link: link})
// })

app.post('/discord_bot/admin/create_link', async (req, res) => {
    const { code, password } = req.body;
    console.log(code, password)
    if(password !== config.api_password) return res.status(403).json({message: "Forbidden"})
    const lootlabs = new Lootlabs()


    let reward_code = await lootlabs.createLink(code)
    //     let redis_json_data = {
    //     reward_code: code,
    //     created_at: Date.now(),
    //     claimed: false,
        
    // }

    await redis.set(`reward:${code}` , JSON.stringify({created_at: Date.now(), claimed: false, reward_code: code}), ) 


    return res.status(200).json({message: "Link created", link: reward_code})


})

app.post('/rewards/discord/claim', async (req, res) => {
    const { code, password } = req.body;
    if (password !== config.api_password) {
        return res.status(403).json({ message: "Forbidden" });
    }
    
    const reward_data = await redis.get(`reward:${code}`);
    if (!reward_data) {
        return res.status(404).json({ message: "Invalid or expired reward code" });
    }

    const rewardInfo = JSON.parse(reward_data);
    if (rewardInfo.claimed) {
        return res.status(400).json({ message: "Already claimed" });
    }
    
    rewardInfo.claimed = true;
    await redis.set(`reward:${code}`, JSON.stringify(rewardInfo));
    return res.status(200).json({ message: "Reward claimed" });
});


app.get("/rewards/discord/:code", async (req, res) => {
  const { code } = req.params;

  const reward_data = await redis.get(`reward:${code}`);
  if (!reward_data) {
        return res.status(404).send(renderExpiredPage())
  }
    const rewardInfo = JSON.parse(reward_data);
    if (rewardInfo.claimed) {
        return res.status(400).send(renderAlreadyClaimedPage());
    } else {
            res.cookie("reward_code", rewardInfo.reward_code, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: 'lax' });
            return res.send(renderRewardPage(code));
    }
});

app.get("/rewards/discord", async (req, res) => {
    const reward_code = req.cookies.reward_code;
    console.log(req.cookies)
    console.log(reward_code)
    if (!reward_code) {
        return res.status(404).send(renderNoRewardCodeFoundPage());
    } else {
        return res.send(renderRewardPage(reward_code));
    }
})

function renderNoRewardCodeFoundPage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FreyrAds – No Reward Found</title>

<style>
:root {
  --bg: #0b0d12;
  --card: #151823;
  --accent: #6b7cff;
  --text: #e6e6f0;
  --muted: #9aa0b4;
}

* {
  box-sizing: border-box;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
  margin: 0;
  background: radial-gradient(1200px 600px at top, #1a1f2a, var(--bg));
  color: var(--text);
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.card {
  position: relative;
  background: var(--card);
  border-radius: 18px;
  padding: 28px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 30px 60px rgba(0,0,0,.6);
  animation: enter .6s ease-out;
  overflow: hidden;
}

.card::before {
  content: "";
  position: absolute;
  inset: -1px;
  background: radial-gradient(500px circle at top, rgba(107,124,255,.18), transparent 45%);
  pointer-events: none;
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.brand {
  font-weight: 700;
  letter-spacing: .4px;
  color: var(--accent);
  margin-bottom: 6px;
}

.icon {
  font-size: 46px;
  margin: 8px 0 12px;
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(20px, 4vw, 24px);
  color: var(--accent);
}

p {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 14px;
}

.hint {
  font-size: 13px;
  color: #b0b5c9;
}

footer {
  margin-top: 20px;
  font-size: 12px;
  color: var(--muted);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
</head>

<body>
  <div class="card">
    <div class="brand">FreyrAds</div>
    <div class="icon">🚫</div>
    <h1>No Reward Code Found</h1>
    <p>We couldn’t find a valid reward for this request.</p>
    <div class="hint">
      This link may be incorrect, expired, or already used.
    </div>
    <footer>Powered by FreyrAds</footer>
  </div>
</body>
</html>
`;
}





function renderRewardPage(code: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FreyrAds – Reward Unlocked</title>

<style>
:root {
  --bg: #0b0d12;
  --card: #151823;
  --accent: #7c7cff;
  --text: #e6e6f0;
  --muted: #9aa0b4;
}

* {
  box-sizing: border-box;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
  margin: 0;
  background: radial-gradient(1200px 600px at top, #1a1f3a, var(--bg));
  color: var(--text);
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.card {
  position: relative;
  background: var(--card);
  border-radius: 18px;
  padding: 28px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 30px 60px rgba(0,0,0,.6);
  animation: enter .6s ease-out;
  overflow: hidden;
}

.card::before {
  content: "";
  position: absolute;
  inset: -1px;
  background: radial-gradient(600px circle at top, rgba(124,124,255,.15), transparent 40%);
  pointer-events: none;
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.brand {
  font-weight: 700;
  letter-spacing: .4px;
  color: var(--accent);
  margin-bottom: 8px;
}

h1 {
  margin: 0 0 6px;
  font-size: clamp(20px, 4vw, 24px);
}

p {
  margin: 0 0 18px;
  color: var(--muted);
  font-size: 14px;
}

.code {
  background: #0e1020;
  border: 1px solid #2a2f55;
  border-radius: 12px;
  padding: 16px;
  font-size: 18px;
  letter-spacing: 1px;
  word-break: break-all;
  margin-bottom: 18px;
  transition: box-shadow .3s ease;
}

.code.copied {
  box-shadow: 0 0 0 2px rgba(124,124,255,.4);
}

button {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--accent), #5a5aff);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: transform .08s ease, box-shadow .15s ease;
}

button:hover {
  box-shadow: 0 10px 30px rgba(124,124,255,.35);
}

button:active {
  transform: scale(.96);
}

.copied-msg {
  margin-top: 12px;
  font-size: 12px;
  color: #7cff9a;
  opacity: 0;
  transform: translateY(4px);
  transition: all .25s ease;
}

.copied-msg.show {
  opacity: 1;
  transform: none;
}

footer {
  margin-top: 20px;
  font-size: 12px;
  color: var(--muted);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
</head>

<body>
  <div class="card">
    <div class="brand">FreyrAds</div>
    <h1>🎉 Reward Unlocked</h1>
    <p>This is your LootLabs reward code</p>

    <div class="code" id="rewardCode">${code}</div>

    <button onclick="copyCode()">Copy Code</button>
    <div class="copied-msg" id="copiedMsg">Copied to clipboard ✓</div>

    <footer>Powered by FreyrAds</footer>
  </div>

<script>
function copyCode() {
  const codeEl = document.getElementById("rewardCode");
  const msg = document.getElementById("copiedMsg");

  navigator.clipboard.writeText(codeEl.innerText).then(() => {
    codeEl.classList.add("copied");
    msg.classList.add("show");

    setTimeout(() => {
      codeEl.classList.remove("copied");
      msg.classList.remove("show");
    }, 2000);
  });
}
</script>
</body>
</html>
`;
}

function renderAlreadyClaimedPage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FreyrAds – Reward Claimed</title>

<style>
:root {
  --bg: #0b0d12;
  --card: #151823;
  --accent: #ff6b6b;
  --text: #e6e6f0;
  --muted: #9aa0b4;
}

* {
  box-sizing: border-box;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
  margin: 0;
  background: radial-gradient(1200px 600px at top, #2a1a1a, var(--bg));
  color: var(--text);
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.card {
  position: relative;
  background: var(--card);
  border-radius: 18px;
  padding: 28px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 30px 60px rgba(0,0,0,.6);
  animation: enter .6s ease-out;
  overflow: hidden;
}

.card::before {
  content: "";
  position: absolute;
  inset: -1px;
  background: radial-gradient(500px circle at top, rgba(255,107,107,.15), transparent 45%);
  pointer-events: none;
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.brand {
  font-weight: 700;
  letter-spacing: .4px;
  color: var(--accent);
  margin-bottom: 6px;
}

.icon {
  font-size: 46px;
  margin: 8px 0 12px;
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(20px, 4vw, 24px);
  color: var(--accent);
}

p {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 14px;
}

.hint {
  font-size: 13px;
  color: #b0b5c9;
}

footer {
  margin-top: 20px;
  font-size: 12px;
  color: var(--muted);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
</head>

<body>
  <div class="card">
    <div class="brand">FreyrAds</div>
    <div class="icon">⛔</div>
    <h1>Reward Already Claimed</h1>
    <p>You’ve already claimed today’s LootLabs reward.</p>
    <div class="hint">Come back later for a new reward 👀</div>
    <footer>Powered by FreyrAds</footer>
  </div>
</body>
</html>
`;
}



function renderExpiredPage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FreyrAds – Reward Expired</title>

<style>
:root {
  --bg: #0b0d12;
  --card: #151823;
  --accent: #ffb86b;
  --text: #e6e6f0;
  --muted: #9aa0b4;
}

* {
  box-sizing: border-box;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

body {
  margin: 0;
  background: radial-gradient(1200px 600px at top, #2a241a, var(--bg));
  color: var(--text);
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.card {
  position: relative;
  background: var(--card);
  border-radius: 18px;
  padding: 28px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 30px 60px rgba(0,0,0,.6);
  animation: enter .6s ease-out;
  overflow: hidden;
}

.card::before {
  content: "";
  position: absolute;
  inset: -1px;
  background: radial-gradient(500px circle at top, rgba(255,184,107,.18), transparent 45%);
  pointer-events: none;
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.brand {
  font-weight: 700;
  letter-spacing: .4px;
  color: var(--accent);
  margin-bottom: 6px;
}

.icon {
  font-size: 46px;
  margin: 8px 0 12px;
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(20px, 4vw, 24px);
  color: var(--accent);
}

p {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 14px;
}

.hint {
  font-size: 13px;
  color: #b0b5c9;
}

footer {
  margin-top: 20px;
  font-size: 12px;
  color: var(--muted);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
</head>

<body>
  <div class="card">
    <div class="brand">FreyrAds</div>
    <div class="icon">⌛</div>
    <h1>Reward Expired</h1>
    <p>This reward link is no longer valid.</p>
    <div class="hint">
      Please complete a new LootLabs offer to get today’s reward.
    </div>
    <footer>Powered by FreyrAds</footer>
  </div>
</body>
</html>
`;
}




app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`)
})