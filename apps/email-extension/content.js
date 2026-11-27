(() => {
  if (window.__extMailCopilotLoaded) return;
  window.__extMailCopilotLoaded = true;

  const DEFAULT_CLOUD_URL = "https://solitary-breeze-cc12.priyanshukesharwani-offical.workers.dev";

  let loadedContacts = [];
  let activeJobId = null;

  function getSettings() {
    return new Promise((resolve) => {
      try {
        if (chrome?.storage?.local) {
          return chrome.storage.local.get(["mailCopilotSettings"], (res) => {
            resolve(res?.mailCopilotSettings || {});
          });
        }
      } catch {}
      resolve({});
    });
  }

  function getAuth() {
    return new Promise((resolve) => {
      try {
        if (chrome?.storage?.local) {
          return chrome.storage.local.get(["mailCopilotAuth"], (res) => {
            resolve(res?.mailCopilotAuth || null);
          });
        }
      } catch {}
      try {
        const raw = localStorage.getItem("mailCopilotAuth");
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    });
  }

  function saveAuth(auth) {
    return new Promise((resolve) => {
      try {
        localStorage.setItem("mailCopilotAuth", JSON.stringify(auth));
      } catch {}
      try {
        if (chrome?.storage?.local) {
          return chrome.storage.local.set({ mailCopilotAuth: auth }, resolve);
        }
      } catch {}
      resolve();
    });
  }

  function clearAuth() {
    return new Promise((resolve) => {
      try {
        localStorage.removeItem("mailCopilotAuth");
      } catch {}
      try {
        if (chrome?.storage?.local) {
          return chrome.storage.local.remove(["mailCopilotAuth"], resolve);
        }
      } catch {}
      resolve();
    });
  }

  function sendBg(payload) {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome?.runtime?.sendMessage) {
          return reject(new Error("Extension updated — press F5 to refresh Gmail."));
        }
        chrome.runtime.sendMessage(payload, (resp) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!resp || !resp.ok) {
            return reject(new Error(resp?.error || "Request failed"));
          }
          resolve(resp.data);
        });
      } catch {
        reject(new Error("Extension updated — press F5 to refresh Gmail."));
      }
    });
  }

  // Simple zero-dependency CSV parser
  function parseCsvText(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return [];

    const parseRow = (line) => {
      const cells = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          cells.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      cells.push(cur.trim());
      return cells;
    };

    const headers = parseRow(lines[0]).map((h) => h.toLowerCase());
    const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
    if (emailIdx === -1) throw new Error("CSV must have an 'email' column.");

    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      const email = cols[emailIdx] || "";
      if (!email.includes("@")) continue;
      const obj = { email };
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || "";
      });
      contacts.push(obj);
    }
    return contacts;
  }

  function showToast(text, isError = false) {
    let toast = document.getElementById("ext-mail-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ext-mail-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.className = `ext-mail-toast ${isError ? "ext-mail-toast-err" : ""} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 3500);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function insertTextIntoEditor(editor, text) {
    editor.focus();
    editor.innerHTML = text
      .split("\n")
      .map((line) => (line.trim() === "" ? "<br>" : `<div>${escapeHtml(line)}</div>`))
      .join("");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function extractOpenEmailContext(composeRoot) {
    const subjectEl = document.querySelector("h2.hP");
    const subject = subjectEl ? subjectEl.innerText.trim() : "No Subject";
    const senders = document.querySelectorAll("span.gD");
    const lastSender = senders.length ? senders[senders.length - 1] : null;
    const sender = lastSender ? (lastSender.getAttribute("email") || lastSender.innerText.trim()) : "Unknown";
    const bodies = document.querySelectorAll("div.a3s.aiL");
    const lastBody = bodies.length ? bodies[bodies.length - 1] : null;
    let body = lastBody ? lastBody.innerText.trim() : "";

    if (!body && composeRoot) {
      const editor = composeRoot.querySelector('div[role="textbox"][contenteditable="true"]');
      if (editor) body = editor.innerText.trim();
    }
    return { sender, subject, body: body || "Please draft a polite professional reply." };
  }

  // Option 1: AI Reply inside Gmail reply/compose toolbar
  function injectAiReplyButtons() {
    const sendButtons = document.querySelectorAll('div[role="button"][aria-label*="Send"]');
    sendButtons.forEach((sendBtn) => {
      const toolbarRow = sendBtn.closest("tr");
      if (!toolbarRow || toolbarRow.querySelector(".ext-mail-ai-btn")) return;

      const composeRoot = sendBtn.closest('div[role="dialog"], div.M9, form')?.parentElement || document;
      const td = document.createElement("td");
      td.className = "ext-mail-ai-cell";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ext-mail-ai-btn";
      btn.textContent = "✨ AI";
      btn.title = "Generate AI Reply";

      btn.addEventListener("click", async () => {
        const auth = await getAuth();
        if (!auth || !auth.loggedIn) {
          showToast("Please connect Composio first.", true);
          openCampaignModal();
          return;
        }
        if (!auth.groqKey) {
          showToast("Add your Groq API Key in Bulk Campaign -> Logout & re-login for AI Reply.", true);
          return;
        }

        const editor =
          composeRoot.querySelector('div[role="textbox"][contenteditable="true"]') ||
          document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
        if (!editor) return showToast("Click Reply first.", true);

        const ctx = extractOpenEmailContext(composeRoot);
        btn.disabled = true;
        btn.textContent = "Drafting...";
        try {
          const res = await sendBg({ type: "AI_DRAFT", groqKey: auth.groqKey, ctx });
          if (res?.draft_reply) {
            const settings = await getSettings();
            const sig = settings.signature ? `\n\n${settings.signature}` : "";
            insertTextIntoEditor(editor, res.draft_reply + sig);
            showToast("AI draft inserted!");
          }
        } catch (err) {
          showToast(err.message, true);
        } finally {
          btn.disabled = false;
          btn.textContent = "✨ AI";
        }
      });

      td.appendChild(btn);
      const sendCell = sendBtn.closest("td");
      if (sendCell) {
        sendCell.insertAdjacentElement("afterend", td);
      } else {
        toolbarRow.appendChild(td);
      }
    });
  }

  // Option 2: Bulk Campaign button below Compose (or bottom-left fallback so it never covers Compose)
  function injectBulkCampaignButton() {
    let composeBtn =
      document.querySelector('div[gh="cm"]') ||
      document.querySelector('div.T-I.T-I-KE.L3');

    if (!composeBtn) {
      for (const b of document.querySelectorAll('div[role="button"]')) {
        if (b.innerText && b.innerText.trim() === "Compose") {
          composeBtn = b;
          break;
        }
      }
    }

    const existing = document.getElementById("ext-mail-bulk-trigger");
    if (existing) {
      // If it was in fallback mode and sidebar Compose now exists, move it to sidebar
      if (existing.dataset.fallback === "1" && composeBtn && composeBtn.parentElement) {
        existing.removeAttribute("style");
        delete existing.dataset.fallback;
        const wrapper = document.createElement("div");
        wrapper.className = "ext-mail-bulk-wrap";
        wrapper.appendChild(existing);
        composeBtn.parentElement.insertAdjacentElement("afterend", wrapper);
      }
      return;
    }

    const btn = document.createElement("button");
    btn.id = "ext-mail-bulk-trigger";
    btn.type = "button";
    btn.className = "ext-mail-bulk-btn";
    btn.innerHTML = `<span class="ext-mail-bulk-icon">📨</span><span>Bulk Campaign</span>`;
    btn.addEventListener("click", openCampaignModal);

    if (composeBtn && composeBtn.parentElement) {
      const wrapper = document.createElement("div");
      wrapper.className = "ext-mail-bulk-wrap";
      wrapper.appendChild(btn);
      composeBtn.parentElement.insertAdjacentElement("afterend", wrapper);
    } else if (document.body) {
      btn.dataset.fallback = "1";
      btn.style.position = "fixed";
      btn.style.bottom = "16px";
      btn.style.left = "16px";
      btn.style.zIndex = "99998";
      btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
      document.body.appendChild(btn);
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function refreshModalAuthState(overlay) {
    const auth = await getAuth();
    const loginView = overlay.querySelector("#ext-login-view");
    const appView = overlay.querySelector("#ext-app-view");
    const footer = overlay.querySelector("#ext-app-footer");
    const userBadge = overlay.querySelector("#ext-user-badge");

    if (auth && auth.loggedIn && auth.composioApiKey) {
      loginView.hidden = true;
      appView.hidden = false;
      footer.hidden = false;
      userBadge.hidden = false;
      userBadge.querySelector("#ext-user-email-text").textContent = auth.email || "Composio Connected";
    } else {
      loginView.hidden = false;
      appView.hidden = true;
      footer.hidden = true;
      userBadge.hidden = true;
    }
  }

  async function openCampaignModal() {
    let overlay = document.getElementById("ext-mail-modal-overlay");
    if (overlay) {
      await refreshModalAuthState(overlay);
      overlay.classList.add("open");
      return;
    }

    overlay = document.createElement("div");
    overlay.id = "ext-mail-modal-overlay";
    overlay.className = "ext-mail-modal-overlay open";
    overlay.innerHTML = `
      <div class="ext-mail-modal" role="dialog" aria-label="Mail Copilot">
        <div class="ext-mail-modal-header">
          <span class="ext-mail-modal-title">📨 Mail Copilot (Standalone)</span>
          <div class="ext-mail-header-right">
            <div id="ext-user-badge" class="ext-user-badge" hidden>
              <span id="ext-user-email-text"></span>
              <button type="button" id="ext-logout-btn" class="ext-logout-btn">Logout</button>
            </div>
            <button type="button" class="ext-mail-close-btn" id="ext-mail-close">✕</button>
          </div>
        </div>

        <!-- STANDALONE LOGIN GATE (NO .ENV NEEDED) -->
        <div id="ext-login-view" class="ext-mail-modal-body">
          <div class="ext-login-card">
            <div class="ext-login-title">🔒 Connect Gmail via Composio</div>
            <p class="ext-login-sub">100% browser-only — no backend or .env needed. Send 50–500 custom emails & use <b>✨ AI Reply</b>.</p>

            <div class="ext-mail-section">
              <label class="ext-mail-label">Composio API Key (Required)</label>
              <input type="password" id="ext-login-composio-key" class="ext-mail-input" placeholder="Paste Composio API Key..." />
            </div>

            <div class="ext-mail-section">
              <label class="ext-mail-label">Groq API Key (Optional — only for ✨ AI Reply)</label>
              <input type="password" id="ext-login-groq-key" class="ext-mail-input" placeholder="gsk_... (optional)" />
            </div>

            <button type="button" id="ext-login-composio-btn" class="ext-mail-btn-primary ext-full-btn">
              Continue with Composio Key
            </button>

            <details class="ext-mail-guide">
              <summary>How to setup Composio &amp; API Key (ak_...)? (5 steps)</summary>
              <ol>
                <li>Go to <b>dashboard.composio.dev</b> and sign in with Google.</li>
                <li>Top-left <b>Switch</b> menu me <b>PLATFORM</b> select karo (<i>FOR YOU</i> nahi) aur apna <b>Project</b> open karo.</li>
                <li>Left sidebar me <b>API Keys</b> se apni <b>ak_...</b> key copy karo.</li>
                <li>Left sidebar me <b>Toolkits → Gmail → + Add to Project → Create Auth Config</b> karo.</li>
                <li>Phir <b>+ Connect Account</b> par click karke apna Gmail link karo (ya extension khud link khol dega).</li>
              </ol>
            </details>
          </div>
        </div>

        <!-- BULK CAMPAIGN UI -->
        <div id="ext-app-view" class="ext-mail-modal-body" hidden>
          <div class="ext-mail-section">
            <label class="ext-mail-label">1. Upload Recipients (.csv — 50 to 500 rows)</label>
            <input type="file" id="ext-mail-file" accept=".csv" class="ext-mail-file-input" />
            <div id="ext-mail-recipients-info" class="ext-mail-info">Save your Excel sheet as .csv and upload here.</div>
          </div>

          <div class="ext-mail-section">
            <label class="ext-mail-label">2. Subject (supports {{name}} or {name})</label>
            <input type="text" id="ext-mail-subject" class="ext-mail-input" placeholder="e.g. Important Update for {{name}}" />
          </div>

          <div class="ext-mail-section">
            <div class="ext-mail-label-row">
              <label class="ext-mail-label">3. Email Body (supports {{name}}, etc.)</label>
              <button type="button" id="ext-ai-gen-toggle" class="ext-ai-mini-btn">✨ Generate with AI</button>
            </div>
            <div id="ext-ai-gen-box" class="ext-ai-gen-box" hidden>
              <input type="text" id="ext-ai-prompt" class="ext-mail-input" placeholder="What should this email say? (e.g. Invite students for seminar)" />
              <div class="ext-mail-row">
                <input type="password" id="ext-ai-groq-inline" class="ext-mail-input" style="flex:1" placeholder="Groq API Key (gsk_...) if not saved" hidden />
                <button type="button" id="ext-ai-gen-run" class="ext-mail-btn-primary">Generate</button>
              </div>
            </div>
            <textarea id="ext-mail-body" class="ext-mail-textarea" rows="5" placeholder="Dear {{name}},&#10;&#10;Write your message here..."></textarea>
          </div>

          <div class="ext-mail-section">
            <label class="ext-mail-label">4. Dispatch Mode</label>
            <div class="ext-mail-radio-row">
              <label><input type="radio" name="ext-dispatch-mode" value="custom" checked /> Custom Personalized ({{name}})</label>
              <label><input type="radio" name="ext-dispatch-mode" value="bcc" /> Fast Single BCC</label>
            </div>
          </div>

          <details class="ext-mail-guide">
            <summary>📎 Attachment &amp; ⏰ Schedule (Optional)</summary>
            <div class="ext-ai-gen-box" style="margin-top:6px;">
              <div class="ext-mail-row">
                <label class="ext-mail-label" style="min-width:90px;">Attach File:</label>
                <input type="file" id="ext-mail-attach" class="ext-mail-file-input" />
              </div>
              <div class="ext-mail-row">
                <label class="ext-mail-label" style="min-width:90px;">Schedule At:</label>
                <input type="datetime-local" id="ext-mail-schedule" class="ext-mail-input" style="flex:1" />
              </div>
            </div>
          </details>

          <div id="ext-mail-status-box" class="ext-mail-status-box" hidden></div>
        </div>

        <div id="ext-app-footer" class="ext-mail-modal-footer" hidden>
          <button type="button" class="ext-mail-btn-danger" id="ext-mail-stop" hidden>⛔ Stop Dispatch</button>
          <button type="button" class="ext-mail-btn-secondary" id="ext-mail-cancel">Close</button>
          <button type="button" class="ext-mail-btn-primary" id="ext-mail-send-campaign">Send Campaign</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    await refreshModalAuthState(overlay);

    const close = () => overlay.classList.remove("open");
    overlay.querySelector("#ext-mail-close").addEventListener("click", close);
    overlay.querySelector("#ext-mail-cancel").addEventListener("click", close);

    overlay.querySelector("#ext-login-composio-btn").addEventListener("click", async () => {
      const apiKey = overlay.querySelector("#ext-login-composio-key").value.trim();
      const groqKey = overlay.querySelector("#ext-login-groq-key").value.trim();
      if (!apiKey) return showToast("Please paste your Composio API Key.", true);

      try {
        const res = await sendBg({ type: "COMPOSIO_VERIFY_OR_CONNECT", apiKey });
        if (!res.connected && res.redirect_url) {
          window.open(res.redirect_url, "_blank");
          showToast("Gmail not linked yet — complete Google login in the new tab!");
        } else {
          showToast("Composio Gmail connected!");
        }
        await saveAuth({
          loggedIn: true,
          composioApiKey: apiKey,
          connectedAccountId: res.connectedAccountId || "",
          userId: res.userId || "",
          email: res.email || "",
          groqKey
        });
        await refreshModalAuthState(overlay);
      } catch (err) {
        showToast(err.message, true);
      }
    });

    overlay.querySelector("#ext-logout-btn").addEventListener("click", async () => {
      await clearAuth();
      await refreshModalAuthState(overlay);
      showToast("Logged out.");
    });

    const infoEl = overlay.querySelector("#ext-mail-recipients-info");
    const statusBox = overlay.querySelector("#ext-mail-status-box");
    const sendBtn = overlay.querySelector("#ext-mail-send-campaign");
    const stopBtn = overlay.querySelector("#ext-mail-stop");
    const aiGenBox = overlay.querySelector("#ext-ai-gen-box");
    const aiGroqInline = overlay.querySelector("#ext-ai-groq-inline");

    overlay.querySelector("#ext-ai-gen-toggle").addEventListener("click", async () => {
      aiGenBox.hidden = !aiGenBox.hidden;
      if (!aiGenBox.hidden) {
        const auth = await getAuth();
        aiGroqInline.hidden = Boolean(auth?.groqKey);
        overlay.querySelector("#ext-ai-prompt").focus();
      }
    });

    overlay.querySelector("#ext-ai-gen-run").addEventListener("click", async (e) => {
      const genBtn = e.currentTarget;
      const userPrompt = overlay.querySelector("#ext-ai-prompt").value.trim();
      if (!userPrompt) return showToast("Type what email you want to generate.", true);

      const auth = await getAuth();
      const groqKey = auth?.groqKey || aiGroqInline.value.trim();
      if (!groqKey) return showToast("Please enter your Groq API Key (gsk_...).", true);

      if (auth && !auth.groqKey && aiGroqInline.value.trim()) {
        await saveAuth({ ...auth, groqKey });
        aiGroqInline.hidden = true;
      }

      const tags = loadedContacts.length ? Object.keys(loadedContacts[0]).map((k) => `{{${k}}}`) : [];
      const subjEl = overlay.querySelector("#ext-mail-subject");
      const bodyEl = overlay.querySelector("#ext-mail-body");

      genBtn.disabled = true;
      genBtn.textContent = "Generating...";
      try {
        const res = await sendBg({
          type: "AI_CAMPAIGN_GENERATE",
          groqKey,
          apiKey: auth?.composioApiKey || "",
          connectedAccountId: auth?.connectedAccountId || "",
          userId: auth?.userId || "",
          userPrompt,
          subject: subjEl.value.trim(),
          tags,
          sampleRow: loadedContacts[0] || null
        });
        if (!subjEl.value.trim() && res.subject) subjEl.value = res.subject;
        if (res.body) bodyEl.value = res.body;
        aiGenBox.hidden = true;
        showToast("Email generated with AI (using your sent mail style + CSV tags)!");
      } catch (err) {
        showToast(err.message, true);
      } finally {
        genBtn.disabled = false;
        genBtn.textContent = "Generate";
      }
    });

    overlay.querySelector("#ext-mail-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          loadedContacts = parseCsvText(reader.result);
          if (!loadedContacts.length) {
            infoEl.textContent = "No valid email rows found in CSV.";
            return;
          }
          const keys = Object.keys(loadedContacts[0]).map((k) => `{{${k}}}`).join(", ");
          infoEl.textContent = `Loaded ${loadedContacts.length} recipients. Tags: ${keys}`;
        } catch (err) {
          infoEl.textContent = `Error: ${err.message}`;
        }
      };
      reader.readAsText(file);
    });

    stopBtn.addEventListener("click", async () => {
      stopBtn.disabled = true;
      stopBtn.textContent = "Stopping...";
      if (activeJobId) {
        try {
          await sendBg({ type: "DISPATCH_STOP", jobId: activeJobId });
        } catch {}
      }
    });

    sendBtn.addEventListener("click", async () => {
      const auth = await getAuth();
      const settings = await getSettings();
      const subject = overlay.querySelector("#ext-mail-subject").value.trim();
      let body = overlay.querySelector("#ext-mail-body").value.trim();
      const mode = overlay.querySelector('input[name="ext-dispatch-mode"]:checked').value;
      const attachFile = overlay.querySelector("#ext-mail-attach")?.files?.[0] || null;
      const scheduleAt = overlay.querySelector("#ext-mail-schedule")?.value || "";

      if (!auth?.composioApiKey) return showToast("Please login with Composio first.", true);
      if (!loadedContacts.length) return showToast("Upload a .csv file first.", true);
      if (!subject || !body) return showToast("Subject and Body are required.", true);

      if (settings.signature && !body.includes(settings.signature.trim())) {
        body = `${body}\n\n${settings.signature}`;
      }

      activeJobId = null;
      sendBtn.disabled = true;
      stopBtn.hidden = false;
      stopBtn.disabled = false;
      stopBtn.textContent = "⛔ Stop Dispatch";
      statusBox.hidden = false;
      statusBox.textContent = attachFile ? "Uploading attachment..." : "Starting Composio dispatch...";

      try {
        let attachment = null;
        if (attachFile) {
          const bytes = Array.from(new Uint8Array(await attachFile.arrayBuffer()));
          attachment = await sendBg({
            type: "UPLOAD_ATTACHMENT",
            apiKey: auth.composioApiKey,
            filename: attachFile.name,
            mimeType: attachFile.type,
            bytes
          });
        }

        if (scheduleAt) {
          const schedRes = await sendBg({
            type: "DISPATCH_SCHEDULE",
            cloudUrl: settings.cloudUrl || DEFAULT_CLOUD_URL,
            scheduleAt,
            apiKey: auth.composioApiKey,
            connectedAccountId: auth.connectedAccountId || "",
            userId: auth.userId || "",
            mode,
            recipients: loadedContacts,
            subject,
            body,
            attachment
          });
          statusBox.textContent = schedRes.mode === "cloud"
            ? `Scheduled on Cloud for ${scheduleAt} (runs even if PC is off)!`
            : `Scheduled locally for ${scheduleAt} (keep browser open).`;
          showToast("Campaign scheduled!");
          return;
        }

        const startRes = await sendBg({
          type: "DISPATCH_START",
          apiKey: auth.composioApiKey,
          connectedAccountId: auth.connectedAccountId || "",
          userId: auth.userId || "",
          mode,
          recipients: loadedContacts,
          subject,
          body,
          attachment
        });
        activeJobId = startRes.job_id;

        while (true) {
          await sleep(800);
          const st = await sendBg({ type: "DISPATCH_STATUS", jobId: activeJobId });
          const errNote = st.lastError ? ` | Last error: ${st.lastError}` : "";
          statusBox.textContent = `Status: ${st.status.toUpperCase()} | Sent: ${st.sent}/${st.total} | Failed: ${st.failed}${errNote}`;
          if (st.status === "done" || st.status === "stopped") break;
        }
        showToast("Dispatch finished!");
      } catch (err) {
        statusBox.textContent = `Error: ${err.message}`;
        showToast(err.message, true);
      } finally {
        sendBtn.disabled = false;
        stopBtn.hidden = true;
        activeJobId = null;
      }
    });
  }

  let debounceTimer = null;
  function scanAndInject() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      injectBulkCampaignButton();
      injectAiReplyButtons();
    }, 250);
  }

  new MutationObserver(scanAndInject).observe(document.body, { childList: true, subtree: true });
  scanAndInject();
})();
