# PC-Off Scheduling & 24/7 Auto-Reply Setup (Cloud Guide)

A Chrome Extension only runs while your PC and browser are open. To run **Scheduled Campaigns** and **24/7 Auto-Replies** even when your PC is shut down:

## 1. Scheduled Bulk Mails (When PC is Off)
1. Deploy a free serverless endpoint (Vercel / Cloudflare Worker / Render) with 2 routes:
   - `POST /schedule`: saves `{ runAt, apiKey, connectedAccountId, userId, mode, recipients, subject, body, attachment }` to free KV/Redis/Supabase.
   - `GET /cron`: runs every 1 minute (via Vercel Cron or `cron-job.org`), checks due jobs (`runAt <= Date.now()`), and calls `https://backend.composio.dev/api/v3/tools/execute/GMAIL_SEND_EMAIL`.
2. Paste your deployed URL into the **`M` Icon → Settings → Cloud Worker URL**.
3. Pick a Date & Time in **Bulk Campaign → Schedule** — it will send even if your PC is shut down.
   *(If Cloud Worker URL is empty, the extension schedules locally using `chrome.alarms` while your browser is open).*

## 2. 24/7 Auto-Replies (When PC is Off)
1. Go to `dashboard.composio.dev` → **Triggers** → enable **`GMAIL_NEW_GMAIL_MESSAGE`**.
2. Set the Webhook URL to `https://your-worker.vercel.app/webhook`.
3. When a new email arrives, Composio sends the email payload to `/webhook` → your worker calls Groq (`llama-3.1-8b-instant`) → replies via `GMAIL_SEND_EMAIL`.

## 3. Attachments (Common & Personalized)
- **Common Attachment**: Use the **📎 Attach File** picker in Bulk Campaign (uploads once to Composio S3 and attaches to every mail).
- **Personalized Attachment**: Add an `attachment_url` column in your `.csv` (e.g. Google Drive link per student) and include `{{attachment_url}}` in the Email Body.
