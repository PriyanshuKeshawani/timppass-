const COMPOSIO_BASE = "https://backend.composio.dev/api/v3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function fillTags(template, row) {
  let text = template || "";
  for (const [k, v] of Object.entries(row || {})) {
    const val = String(v ?? "");
    text = text.replaceAll(`{{${k}}}`, val).replaceAll(`{${k}}`, val);
  }
  return text;
}

async function composioSendOne(apiKey, connectedAccountId, userId, to, subject, body, bcc = null, attachment = null) {
  const args = { recipient_email: to, subject, body };
  if (bcc && bcc.length) args.bcc = bcc;
  if (attachment) args.attachment = attachment;

  const payload = { arguments: args, user_id: userId || "default" };
  if (connectedAccountId) payload.connected_account_id = connectedAccountId;

  const res = await fetch(`${COMPOSIO_BASE}/tools/execute/GMAIL_SEND_EMAIL`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Composio send failed (${res.status})`);
  }
}

async function runScheduledJob(job) {
  const { apiKey, connectedAccountId, userId, mode, recipients, subject, body, attachment } = job;
  if (mode === "bcc") {
    const emails = (recipients || []).map((r) => r.email).filter(Boolean);
    if (emails.length) {
      await composioSendOne(apiKey, connectedAccountId, userId, emails[0], subject, body, emails.slice(1), attachment);
    }
    return;
  }

  // Batch parallel sends (10 at a time) to handle multi-user schedules fast
  const list = recipients || [];
  for (let i = 0; i < list.length; i += 10) {
    await Promise.all(
      list.slice(i, i + 10).map((row) =>
        composioSendOne(
          apiKey,
          connectedAccountId,
          userId,
          row.email,
          fillTags(subject, row),
          fillTags(body, row),
          null,
          attachment
        ).catch(() => {})
      )
    );
  }
}

async function groqReply(groqKey, sender, subject, body) {
  const prompt =
    `Write a short, polite, professional email reply.\n` +
    `From: ${sender}\nSubject: ${subject}\nEmail:\n${(body || "").slice(0, 1500)}\n\n` +
    `Return only the reply body text.`;

  const callModel = async (model) => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.4 })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  let attempt = await callModel("llama-3.1-8b-instant");
  if (!attempt.ok && /does not exist|not have access/i.test(attempt.data?.error?.message || "")) {
    const mRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${groqKey}` }
    });
    const mData = await mRes.json().catch(() => ({}));
    const chatModel = (mData.data || []).find(
      (m) => m.id && !/whisper|guard|tts|safeguard|orpheus/i.test(m.id)
    );
    if (chatModel) attempt = await callModel(chatModel.id);
  }
  if (!attempt.ok) throw new Error(attempt.data?.error?.message || "Groq error");
  return attempt.data.choices[0].message.content.trim();
}

function extractEmail(str) {
  const m = String(str || "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : "";
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({ status: "Mail Copilot Cloudflare Worker Live" }, { headers: CORS });
    }

    if (url.pathname === "/status" && request.method === "GET") {
      const kvBound = Boolean(env.SCHED_KV);
      const users = kvBound ? (await env.SCHED_KV.list({ prefix: "user_" })).keys.length : 0;
      const jobs = kvBound ? (await env.SCHED_KV.list({ prefix: "job_" })).keys.length : 0;
      return Response.json({ ok: true, kv_bound: kvBound, users_registered: users, pending_jobs: jobs }, { headers: CORS });
    }

    // 1. Register / Sync User Keys & Settings to Cloudflare KV (for PC-off Auto-Reply)
    if (url.pathname === "/register-user" && request.method === "POST") {
      const cfg = await request.json();
      const keyId = cfg.connectedAccountId || cfg.userId || "default";
      await env.SCHED_KV.put(`user_${keyId}`, JSON.stringify(cfg));
      return Response.json({ ok: true, keyId }, { headers: CORS });
    }

    // 2. Save Scheduled Campaign from Extension
    if (url.pathname === "/schedule" && request.method === "POST") {
      const job = await request.json();
      const key = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await env.SCHED_KV.put(key, JSON.stringify(job));
      return Response.json({ ok: true, key }, { headers: CORS });
    }

    // 3. 24/7 Auto-Reply Webhook (Composio GMAIL_NEW_GMAIL_MESSAGE)
    if (url.pathname === "/webhook" && request.method === "POST") {
      const event = await request.json().catch(() => ({}));
      const msg = event.data || event.payload || event;
      const sender = msg.sender || msg.from || "";
      const subject = msg.subject || "Your Email";
      const body = msg.messageText || msg.snippet || msg.body || "";

      // Prevent auto-reply loops on bounces / noreply
      if (!sender || /noreply|no-reply|mailer-daemon|postmaster/i.test(sender)) {
        return Response.json({ skipped: true }, { headers: CORS });
      }

      // Lookup user's keys from KV by connectedAccountId or userId, fallback to env secrets
      const accId = event.connected_account_id || msg.connectedAccountId || "";
      const usrId = event.user_id || msg.userId || "default";
      const kvRaw = (accId && await env.SCHED_KV.get(`user_${accId}`)) || await env.SCHED_KV.get(`user_${usrId}`);
      const userCfg = kvRaw ? JSON.parse(kvRaw) : {};

      if (kvRaw && userCfg.autoReply === false) {
        return Response.json({ skipped: "autoReply disabled" }, { headers: CORS });
      }

      const groqKey = userCfg.groqKey || env.GROQ_API_KEY;
      const composioKey = userCfg.composioApiKey || env.COMPOSIO_API_KEY;
      const sig = userCfg.signature ? `\n\n${userCfg.signature}` : "";

      if (!groqKey || !composioKey) {
        return Response.json({ error: "Missing API keys in KV or secrets" }, { status: 400, headers: CORS });
      }

      const replyText = (await groqReply(groqKey, sender, subject, body)) + sig;
      await composioSendOne(
        composioKey,
        userCfg.connectedAccountId || accId || env.CONNECTED_ACCOUNT_ID || "",
        userCfg.userId || usrId || env.COMPOSIO_USER_ID || "default",
        sender,
        `Re: ${subject}`,
        replyText
      );
      return Response.json({ ok: true, replied_to: sender }, { headers: CORS });
    }

    return new Response("Not Found", { status: 404, headers: CORS });
  },

  // 4. Runs every 1 minute on Cloudflare even when PC is shut down
  async scheduled(_event, env) {
    const now = Date.now();

    // A) Run due scheduled campaigns
    const jobs = await env.SCHED_KV.list({ prefix: "job_" });
    for (const item of jobs.keys) {
      const raw = await env.SCHED_KV.get(item.name);
      if (!raw) continue;
      const job = JSON.parse(raw);
      if (job.runAt <= now) {
        await env.SCHED_KV.delete(item.name);
        await runScheduledJob(job);
      }
    }

    // B) Zero-webhook 24/7 Auto-Reply polling for all users with autoReply=true
    const users = await env.SCHED_KV.list({ prefix: "user_" });
    for (const u of users.keys) {
      const raw = await env.SCHED_KV.get(u.name);
      if (!raw) continue;
      const cfg = JSON.parse(raw);
      if (!cfg.autoReply || !cfg.composioApiKey || !cfg.groqKey) continue;

      try {
        const fetchRes = await fetch(`${COMPOSIO_BASE}/tools/execute/GMAIL_FETCH_EMAILS`, {
          method: "POST",
          headers: { "x-api-key": cfg.composioApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            connected_account_id: cfg.connectedAccountId || undefined,
            user_id: cfg.userId || "default",
            arguments: { query: "is:unread in:inbox -from:mailer-daemon -from:noreply", max_results: 5, include_payload: false }
          })
        });
        const fetchData = await fetchRes.json().catch(() => ({}));
        const msgs = fetchData?.data?.messages || fetchData?.messages || [];

        for (const m of msgs) {
          const msgId = m.messageId || m.id;
          const rawSender = m.sender || m.from || "";
          const sender = extractEmail(rawSender);
          if (!msgId || !sender || /noreply|no-reply|mailer-daemon|postmaster/i.test(sender)) continue;

          const seenKey = `replied_${msgId}`;
          if (await env.SCHED_KV.get(seenKey)) continue;
          await env.SCHED_KV.put(seenKey, "1", { expirationTtl: 86400 });

          const replyText =
            (await groqReply(cfg.groqKey, sender, m.subject || "Your Email", m.snippet || m.messageText || "")) +
            (cfg.signature ? `\n\n${cfg.signature}` : "");
          await composioSendOne(
            cfg.composioApiKey,
            cfg.connectedAccountId || "",
            cfg.userId || "default",
            sender,
            `Re: ${m.subject || "Your Email"}`,
            replyText
          );
        }
      } catch {
        // Skip failed user and continue others
      }
    }
  }
};
