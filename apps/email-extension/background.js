const COMPOSIO_BASE = "https://backend.composio.dev/api/v3";
const JOBS = {};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "COMPOSIO_VERIFY_OR_CONNECT") {
    verifyOrConnectComposio(msg.apiKey)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "AI_DRAFT") {
    generateAiDraft(msg.groqKey, msg.ctx)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "AI_CAMPAIGN_GENERATE") {
    generateCampaignEmail(msg)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "UPLOAD_ATTACHMENT") {
    uploadComposioFile(msg)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "DISPATCH_SCHEDULE") {
    scheduleDispatch(msg)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "DISPATCH_START") {
    const jobId = startDispatchJob(msg);
    sendResponse({ ok: true, data: { job_id: jobId } });
    return false;
  }

  if (msg.type === "DISPATCH_STATUS") {
    const job = JOBS[msg.jobId];
    if (!job) return sendResponse({ ok: false, error: "Job not found" });
    sendResponse({ ok: true, data: { ...job } });
    return false;
  }

  if (msg.type === "DISPATCH_STOP") {
    const job = JOBS[msg.jobId];
    if (job) {
      job.stop = true;
      job.status = "stopped";
    }
    sendResponse({ ok: true, data: { status: "stopped" } });
    return false;
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith("mail_sched_")) return;
  chrome.storage.local.get([alarm.name], (res) => {
    const payload = res[alarm.name];
    if (payload) {
      startDispatchJob(payload);
      chrome.storage.local.remove([alarm.name]);
    }
  });
});

async function scheduleDispatch(msg) {
  const runAt = new Date(msg.scheduleAt).getTime();
  if (Number.isNaN(runAt) || runAt <= Date.now()) {
    throw new Error("Pick a future date & time for scheduling.");
  }

  // If Cloud Worker URL is configured, offload so it runs even when PC is shut down
  if (msg.cloudUrl) {
    const res = await fetch(`${msg.cloudUrl.replace(/\/$/, "")}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...msg, runAt })
    });
    if (!res.ok) throw new Error(`Cloud schedule failed (${res.status})`);
    return { scheduled: true, mode: "cloud" };
  }

  // Local browser alarm fallback (runs while browser is open)
  const key = `mail_sched_${Date.now()}`;
  await chrome.storage.local.set({ [key]: msg });
  chrome.alarms.create(key, { when: runAt });
  return { scheduled: true, mode: "local" };
}

function md5Hex(bytes) {
  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
  const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const len = bytes.length;
  const padLen = ((len + 8) >> 6) + 1;
  const words = new Uint32Array(padLen * 16);
  for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  words[len >> 2] |= 0x80 << ((len % 4) * 8);
  words[padLen * 16 - 2] = (len * 8) >>> 0;
  words[padLen * 16 - 1] = Math.floor((len * 8) / 0x100000000);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let i = 0; i < words.length; i += 16) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let j = 0; j < 64; j++) {
      let f, g;
      if (j < 16) { f = (b & c) | (~b & d); g = j; }
      else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; }
      else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * j) % 16; }
      const temp = d;
      d = c;
      c = b;
      const x = (a + f + K[j] + words[i + g]) >>> 0;
      b = (b + ((x << S[j]) | (x >>> (32 - S[j])))) >>> 0;
      a = temp;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map((v) =>
    [0, 8, 16, 24].map((s) => ((v >>> s) & 0xff).toString(16).padStart(2, "0")).join("")
  ).join("");
}

async function uploadComposioFile({ apiKey, filename, mimeType, bytes }) {
  if (!apiKey) throw new Error("Composio API Key required to upload attachment.");
  const uint8 = new Uint8Array(bytes);
  const res = await fetch(`${COMPOSIO_BASE}/files/upload/request`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      toolkit_slug: "gmail",
      tool_slug: "GMAIL_SEND_EMAIL",
      filename,
      mimetype: mimeType || "application/octet-stream",
      md5: md5Hex(uint8)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.new_presigned_url) {
    throw new Error(data.message || `File upload init failed (${res.status})`);
  }

  const putRes = await fetch(data.new_presigned_url, {
    method: "PUT",
    headers: { "Content-Type": mimeType || "application/octet-stream" },
    body: uint8
  });
  if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);

  return {
    name: filename,
    mimetype: mimeType || "application/octet-stream",
    s3key: data.key
  };
}

async function verifyOrConnectComposio(apiKey) {
  if (!apiKey) throw new Error("Please paste your Composio API Key (starts with ak_).");
  const headers = { "x-api-key": apiKey, "Content-Type": "application/json" };

  const accRes = await fetch(`${COMPOSIO_BASE}/connected_accounts?toolkit_slugs=gmail&statuses=ACTIVE`, { headers });
  const accData = await accRes.json().catch(() => ({}));
  if (!accRes.ok) {
    throw new Error(accData.message || accData.error?.message || `Composio API error (${accRes.status})`);
  }

  const active = (accData.items || [])[0];
  if (active) {
    return {
      connected: true,
      connectedAccountId: active.id,
      userId: active.user_id || "default",
      email: active.data?.displayName || ""
    };
  }

  const cfgRes = await fetch(`${COMPOSIO_BASE}/auth_configs?toolkit_slugs=gmail`, { headers });
  const cfgData = await cfgRes.json().catch(() => ({}));
  const authConfig = (cfgData.items || [])[0];
  if (!cfgRes.ok || !authConfig) {
    throw new Error("No active Gmail connection found. Connect Gmail once at dashboard.composio.dev.");
  }

  const connRes = await fetch(`${COMPOSIO_BASE}/connected_accounts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      auth_config: { id: authConfig.id },
      connection: { user_id: "default" }
    })
  });
  const connData = await connRes.json().catch(() => ({}));
  if (!connRes.ok) {
    throw new Error(connData.message || `Composio connect error (${connRes.status})`);
  }
  return {
    connected: false,
    redirect_url: connData.redirect_url || connData.redirectUrl,
    connectedAccountId: connData.id || ""
  };
}

async function groqChatCompletion(groqKey, messages, jsonMode = false) {
  const callModel = async (model) => {
    const body = { model, messages, temperature: 0.4 };
    if (jsonMode) body.response_format = { type: "json_object" };
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
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
    if (chatModel) {
      attempt = await callModel(chatModel.id);
    }
  }

  if (!attempt.ok) {
    throw new Error(attempt.data?.error?.message || `Groq error (${attempt.status})`);
  }
  return attempt.data.choices[0].message.content.trim();
}

async function generateAiDraft(groqKey, ctx) {
  if (!groqKey) throw new Error("Groq API Key is missing.");
  const prompt =
    `Write a short, polite, professional email reply.\n` +
    `From: ${ctx.sender}\nSubject: ${ctx.subject}\nEmail:\n${(ctx.body || "").slice(0, 2000)}\n\n` +
    `Return only the reply body text.`;

  const draft_reply = await groqChatCompletion(groqKey, [{ role: "user", content: prompt }], false);
  return { draft_reply };
}

async function fetchRecentSentSnippets(apiKey, connectedAccountId, userId) {
  if (!apiKey || !connectedAccountId) return "";
  try {
    const res = await fetch(`${COMPOSIO_BASE}/tools/execute/GMAIL_FETCH_EMAILS`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        connected_account_id: connectedAccountId,
        user_id: userId || "default",
        arguments: { query: "in:sent", max_results: 3, include_payload: false }
      })
    });
    const data = await res.json().catch(() => ({}));
    const msgs = data?.data?.messages || data?.messages || [];
    return msgs
      .slice(0, 3)
      .map((m) => `- Subject: ${m.subject || ""} | Snippet: ${(m.snippet || m.messageText || "").slice(0, 140)}`)
      .join("\n");
  } catch {
    return "";
  }
}

async function generateCampaignEmail({ groqKey, apiKey, connectedAccountId, userId, userPrompt, subject, tags, sampleRow }) {
  if (!groqKey) throw new Error("Groq API Key is missing.");
  const sentContext = await fetchRecentSentSnippets(apiKey, connectedAccountId, userId);

  const prompt =
    `You are an email writing assistant.\n` +
    (sentContext ? `User's recent sent emails (for tone/style reference):\n${sentContext}\n\n` : "") +
    (tags?.length ? `Available CSV template tags (use double curly braces like {{name}} if appropriate): ${tags.join(", ")}\n` : "") +
    (sampleRow ? `Sample recipient row: ${JSON.stringify(sampleRow)}\n` : "") +
    (subject ? `Current Subject: ${subject}\n` : "") +
    `User instruction: ${userPrompt}\n\n` +
    `Return JSON only with keys "subject" and "body" (no markdown fences).`;

  const raw = await groqChatCompletion(groqKey, [{ role: "user", content: prompt }], true);
  const parsed = JSON.parse(raw);
  return { subject: parsed.subject || "", body: parsed.body || "" };
}

function fillTags(template, row) {
  let text = template;
  for (const [k, v] of Object.entries(row)) {
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
  if (connectedAccountId) {
    payload.connected_account_id = connectedAccountId;
  }

  const res = await fetch(`${COMPOSIO_BASE}/tools/execute/GMAIL_SEND_EMAIL`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.successful === false) {
    throw new Error(data.error?.message || data.error || data.message || `HTTP ${res.status}`);
  }
}

function startDispatchJob({ apiKey, connectedAccountId, userId, mode, recipients, subject, body, attachment = null }) {
  const jobId = Math.random().toString(36).slice(2, 10);
  const job = {
    status: "running",
    sent: 0,
    failed: 0,
    total: recipients.length,
    stop: false,
    lastError: ""
  };
  JOBS[jobId] = job;

  (async () => {
    let resolvedAccId = connectedAccountId;
    let resolvedUserId = userId;
    if (!resolvedAccId || !resolvedUserId) {
      try {
        const info = await verifyOrConnectComposio(apiKey);
        if (info.connected) {
          resolvedAccId = info.connectedAccountId;
          resolvedUserId = info.userId;
        }
      } catch {}
    }

    if (mode === "bcc") {
      const emails = recipients.map((r) => r.email).filter(Boolean);
      if (!job.stop && emails.length) {
        try {
          await composioSendOne(apiKey, resolvedAccId, resolvedUserId, emails[0], subject, body, emails.slice(1), attachment);
          job.sent = emails.length;
        } catch (err) {
          job.failed = emails.length;
          job.lastError = err.message;
        }
      }
    } else {
      const BATCH_SIZE = 12;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        if (job.stop) break;
        const batch = recipients.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (row) => {
            if (job.stop) return;
            try {
              await composioSendOne(
                apiKey,
                resolvedAccId,
                resolvedUserId,
                row.email,
                fillTags(subject, row),
                fillTags(body, row),
                null,
                attachment
              );
              job.sent++;
            } catch (err) {
              job.failed++;
              job.lastError = err.message;
            }
          })
        );
      }
    }
    job.status = job.stop ? "stopped" : "done";
  })();

  return jobId;
}
