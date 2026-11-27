# Cloudflare Worker — PC-Off Schedules & 24/7 Auto-Reply

Runs **100% free on Cloudflare** (built-in 1-minute Cron + KV storage), even when your PC is shut down.

## Deploy in 3 Minutes
1. Install Wrangler & login (once):
   ```powershell
   npm install -g wrangler
   wrangler login
   ```
2. Create a KV namespace & copy its `id` into `wrangler.toml`:
   ```powershell
   cd "D:\CODE JAANI CODE\minor\backend\cloudflare_worker"
   wrangler kv namespace create SCHED_KV
   ```
3. Add your secrets for 24/7 Auto-Reply:
   ```powershell
   wrangler secret put COMPOSIO_API_KEY
   wrangler secret put GROQ_API_KEY
   wrangler secret put CONNECTED_ACCOUNT_ID
   wrangler secret put COMPOSIO_USER_ID
   ```
4. Deploy:
   ```powershell
   wrangler deploy
   ```
5. Paste the deployed `https://mail-copilot-worker.<subdomain>.workers.dev` URL into:
   - **`M` Icon → Settings → Cloud Worker URL** (for PC-off Schedules)
   - **`dashboard.composio.dev` → Triggers → `GMAIL_NEW_GMAIL_MESSAGE` → Webhook URL** (`https://.../webhook`, for 24/7 Auto-Reply)
