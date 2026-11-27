(function () {
  "use strict";

  const BACKEND_URL = "https://sagar-chat-bot.onrender.com/api";
  const SUPPORT_EMAIL = "adarshmishra210407@gmail.com";
  const SCRIPT_BASE =
    document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/sistec-ai\.js.*$/, "")
      : "assets/sistec-ai/";
  let chatHistory = [];

  function initWidget() {
    if (document.getElementById("saiCollapsedBar")) return;
    // Silently wake up Render free-tier server & keep alive while browsing
    fetch(`${BACKEND_URL}/health`).catch(() => {});
    setInterval(() => fetch(`${BACKEND_URL}/health`).catch(() => {}), 600000);

    const root = document.createElement("div");
    root.innerHTML = `
      <!-- Collapsed Bottom-Right Pill + Launcher -->
      <div class="sai-collapsed-bar" id="saiCollapsedBar">
        <div class="sai-mini-pill">
          <input type="text" id="saiMiniInput" class="sai-mini-input" placeholder="Write a message..." />
          <button type="button" id="saiMiniSend" class="sai-arrow-btn" title="Send">↑</button>
        </div>
        <button type="button" id="saiLauncherBtn" class="sai-launcher-circle" title="Chat with SISTec AI" aria-label="Chat with SISTec AI">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <line x1="18" y1="3" x2="18" y2="7.5" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="18" cy="2.8" r="2.2" fill="#fe553c" stroke="#ffffff" stroke-width="1.2"/>
            <rect x="3.5" y="14.5" width="3.5" height="8" rx="1.75" fill="#ffffff" opacity="0.9"/>
            <rect x="29" y="14.5" width="3.5" height="8" rx="1.75" fill="#ffffff" opacity="0.9"/>
            <rect x="6.5" y="7.5" width="23" height="20" rx="8.5" fill="#ffffff"/>
            <path d="M13 27.5L10.5 32.2L17.5 27.5H13Z" fill="#ffffff"/>
            <rect x="10" y="12.5" width="16" height="9.5" rx="4.75" fill="#1b1536"/>
            <circle cx="14.2" cy="17.2" r="1.8" fill="#5eead4"/>
            <circle cx="21.8" cy="17.2" r="1.8" fill="#5eead4"/>
            <path d="M15.8 20.2C16.8 21.1 19.2 21.1 20.2 20.2" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>
          </svg>
        </button>
      </div>

      <!-- Dim Backdrop -->
      <div class="sai-backdrop" id="saiBackdrop"></div>

      <!-- Expanded Chat Card -->
      <div class="sai-card" id="saiCard" role="dialog" aria-label="SISTec AI Assistant">
        <div class="sai-top-bar">
          <div class="sai-header-pill" title="SISTec AI Support">
            <img src="${SCRIPT_BASE}white-logo.png" alt="SISTec AI Support" class="sai-brand-logo" />
            <span class="sai-brand-tag"><span class="sai-online-dot"></span>AI</span>
          </div>
          <div class="sai-top-right">
            <button type="button" id="saiExpandBtn" class="sai-icon-btn" title="Expand / Collapse" aria-label="Expand or Collapse">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
            <button type="button" id="saiClearBtn" class="sai-icon-btn" title="Clear Chat" aria-label="Clear Chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
              </svg>
            </button>
            <button type="button" id="saiCloseBtn" class="sai-icon-btn" title="Close" aria-label="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="sai-messages" id="saiMessages">
          <div class="sai-bot-row" id="saiWelcomeRow">
            <div class="sai-mini-avatar"><img src="${SCRIPT_BASE}sistec-crest.png" alt="SISTec" class="sai-mini-avatar-img" /></div>
            <div class="sai-bubble bot">
              <div>Welcome to <strong>SISTec-GN</strong>! Ask anything about admissions, placements, courses, or campus life.</div>
              <div class="sai-quick-actions">
                <button type="button" class="sai-pill-coral" data-q="What is the admission process and eligibility for B.Tech 2027?">Admissions 2027</button>
                <button type="button" class="sai-pill-dark" data-q="What are the placement packages and top recruiters at SISTec?">Placements &amp; Fees</button>
              </div>
            </div>
          </div>
        </div>

        <div class="sai-prompts-tray" id="saiPromptsTray" hidden>
          <button type="button" class="sai-tray-chip" data-q="Tell me about B.Tech CSE & AI programs at SISTec.">🎓 Courses</button>
          <button type="button" class="sai-tray-chip" data-q="What are the hostel and mess facilities?">🏠 Hostel</button>
          <button type="button" class="sai-tray-chip" data-q="What scholarships are available at SISTec?">🏅 Scholarships</button>
          <button type="button" class="sai-tray-chip" data-q="How can I contact SISTec admission cell?">📞 Contact</button>
        </div>

        <div class="sai-input-wrap">
          <div class="sai-input-pill">
            <button type="button" id="saiMailBtn" class="sai-plus-btn" title="Draft Formal Email from Chat" aria-label="Draft Formal Email">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="3"></rect>
                <path d="M22 7l-10 6L2 7"></path>
              </svg>
            </button>
            <input type="text" id="saiChatInput" class="sai-chat-input" placeholder="Write a message..." />
            <button type="button" id="saiSendBtn" class="sai-arrow-btn" title="Send">↑</button>
          </div>
          <div class="sai-powered">Powered by <b>SISTec AI</b></div>
        </div>

        <div class="sai-mail-modal" id="saiMailModal" hidden>
          <div class="sai-mail-head">
            <div>
              <h5>Formal Email Draft</h5>
              <span class="sai-mail-status" id="saiMailStatus">Ready to review &amp; edit</span>
            </div>
            <button type="button" id="saiMailCloseBtn" class="sai-icon-btn" title="Back to Chat">✕</button>
          </div>
          <div class="sai-mail-field">
            <label for="saiMailTo">To</label>
            <input type="email" id="saiMailTo" value="${SUPPORT_EMAIL}" />
          </div>
          <div class="sai-mail-field">
            <label for="saiMailSubject">Subject</label>
            <input type="text" id="saiMailSubject" />
          </div>
          <div class="sai-mail-field grow">
            <label for="saiMailBody">Message (Edit before sending)</label>
            <textarea id="saiMailBody"></textarea>
          </div>
          <div class="sai-mail-actions">
            <button type="button" id="saiMailCopyBtn" class="sai-mail-copy">Copy</button>
            <button type="button" id="saiMailAppBtn" class="sai-mail-copy" title="Open default Mail app">Mail App</button>
            <button type="button" id="saiMailSendBtn" class="sai-mail-send">Send via Gmail →</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const collapsedBar = document.getElementById("saiCollapsedBar");
    const backdrop = document.getElementById("saiBackdrop");
    const card = document.getElementById("saiCard");
    const miniInput = document.getElementById("saiMiniInput");
    const miniSend = document.getElementById("saiMiniSend");
    const chatInput = document.getElementById("saiChatInput");
    const sendBtn = document.getElementById("saiSendBtn");
    const promptsTray = document.getElementById("saiPromptsTray");

    const openCard = () => {
      collapsedBar.style.display = "none";
      backdrop.classList.add("open");
      card.classList.add("open");
      document.body.style.overflow = "hidden";
      chatInput.focus();
    };

    const closeCard = () => {
      card.classList.remove("open");
      backdrop.classList.remove("open");
      document.body.style.overflow = "";
      collapsedBar.style.display = "flex";
    };

    backdrop.addEventListener("click", closeCard);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && card.classList.contains("open")) closeCard();
  });
  document.addEventListener("click", (e) => {
    if (card.classList.contains("open") && !card.contains(e.target) && !collapsedBar.contains(e.target)) {
      closeCard();
    }
  });

    document.getElementById("saiLauncherBtn").addEventListener("click", openCard);
    document.getElementById("saiCloseBtn").addEventListener("click", closeCard);
    document.getElementById("saiExpandBtn").addEventListener("click", () => {
      card.classList.toggle("expanded");
    });
    const mailModal = document.getElementById("saiMailModal");
    const mailTo = document.getElementById("saiMailTo");
    const mailSubject = document.getElementById("saiMailSubject");
    const mailBody = document.getElementById("saiMailBody");
    const mailStatus = document.getElementById("saiMailStatus");
    const mailCopyBtn = document.getElementById("saiMailCopyBtn");
    let mailUserEdited = false;

    [mailSubject, mailBody].forEach((el) => {
      el.addEventListener("input", () => { mailUserEdited = true; });
    });

    const buildLocalDraft = () => {
      const userMsgs = chatHistory.filter((m) => m.role === "user").map((m) => m.content.trim());
      if (!userMsgs.length) {
        return {
          subject: "Inquiry Regarding SISTec Admissions & Academic Support",
          body: "Respected Sir/Madam,\n\nI am writing to inquire about admissions, courses, and campus details at SISTec.\n\nKindly share the relevant information or connect me with the concerned department.\n\nThank you,\n[Your Name]\n[Your Contact Number]"
        };
      }
      const primaryTopic = userMsgs[0].slice(0, 70).replace(/[\r\n]+/g, " ");
      const summaryPoints = userMsgs.map((q, i) => `${i + 1}. ${q}`).join("\n");
      return {
        subject: `Support Inquiry: ${primaryTopic}`,
        body: `Respected Sir/Madam,\n\nI hope this email finds you well. While using the SISTec AI Assistant, I had the following query/issue that requires assistance:\n\n${summaryPoints}\n\nKindly review and assist me with the above.\n\nThank you,\n[Your Name]\n[Your Contact Number]`
      };
    };

    const openMailDraft = async () => {
      mailUserEdited = false;
      mailTo.value = SUPPORT_EMAIL;
      const local = buildLocalDraft();
      mailSubject.value = local.subject;
      mailBody.value = local.body;
      mailStatus.textContent = chatHistory.length ? "Polishing formal draft with AI..." : "Ready to review & edit";
      mailModal.hidden = false;

      if (!chatHistory.length) return;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const prompt =
          "Based on our chat history above, draft a concise, polite formal email to SISTec support summarizing my exact issue/request. Return ONLY two lines/sections:\nSubject: <subject>\nBody:\n<body>";
        const res = await fetch(`${BACKEND_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: prompt, chat_history: chatHistory }),
          signal: ctrl.signal
        });
        clearTimeout(t);
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        const ans = (data.answer || "").trim();
        const subjMatch = ans.match(/Subject:\s*(.+)/i);
        const bodyMatch = ans.match(/Body:\s*([\s\S]+)/i);
        if (!mailUserEdited && bodyMatch && bodyMatch[1].trim().length > 25) {
          if (subjMatch && subjMatch[1].trim()) mailSubject.value = subjMatch[1].trim();
          mailBody.value = bodyMatch[1].trim();
          mailStatus.textContent = "AI draft ready — review & edit before sending";
          return;
        }
      } catch {
        // Keep instant local formal draft on timeout/offline
      }
      mailStatus.textContent = "Draft ready — review & edit before sending";
    };

    document.getElementById("saiMailBtn").addEventListener("click", openMailDraft);
    document.getElementById("saiMailCloseBtn").addEventListener("click", () => {
      mailModal.hidden = true;
    });
    mailCopyBtn.addEventListener("click", async () => {
      const full = `To: ${mailTo.value}\nSubject: ${mailSubject.value}\n\n${mailBody.value}`;
      try {
        await navigator.clipboard.writeText(full);
        mailCopyBtn.textContent = "Copied ✓";
        setTimeout(() => { mailCopyBtn.textContent = "Copy"; }, 1800);
      } catch {}
    });
    const getMailPayload = () => ({
      to: encodeURIComponent(mailTo.value.trim() || SUPPORT_EMAIL),
      subject: encodeURIComponent(mailSubject.value.trim()),
      body: encodeURIComponent(mailBody.value.trim())
    });

    document.getElementById("saiMailSendBtn").addEventListener("click", () => {
      const { to, subject, body } = getMailPayload();
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
      const win = window.open(gmailUrl, "_blank", "noopener,noreferrer");
      if (!win) window.location.href = gmailUrl;
    });

    document.getElementById("saiMailAppBtn").addEventListener("click", () => {
      const { to, subject, body } = getMailPayload();
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
    document.getElementById("saiClearBtn").addEventListener("click", () => {
      chatHistory = [];
      const msgs = document.getElementById("saiMessages");
      const welcome = document.getElementById("saiWelcomeRow");
      msgs.innerHTML = "";
      if (welcome) msgs.appendChild(welcome);
    });

    miniInput.addEventListener("input", () => {
      miniSend.classList.toggle("active", miniInput.value.trim().length > 0);
    });
    chatInput.addEventListener("input", () => {
      sendBtn.classList.toggle("active", chatInput.value.trim().length > 0);
    });

    const handleMiniSend = () => {
      const text = miniInput.value.trim();
      openCard();
      if (text) {
        miniInput.value = "";
        miniSend.classList.remove("active");
        sendMessage(text);
      }
    };

    miniSend.addEventListener("click", handleMiniSend);
    miniInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleMiniSend();
    });

    const handleMainSend = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = "";
      sendBtn.classList.remove("active");
      promptsTray.hidden = true;
      sendMessage(text);
    };

    sendBtn.addEventListener("click", handleMainSend);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleMainSend();
    });

    card.querySelectorAll("[data-q]").forEach((btn) => {
      btn.addEventListener("click", () => {
        promptsTray.hidden = true;
        sendMessage(btn.getAttribute("data-q"));
      });
    });
  }

  function formatMarkdown(text) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return escaped
      .replace(/^#{1,3}\s+(.+)$/gm, '<div class="sai-md-h">$1</div>')
      .replace(/^\s*[-*]\s+(.+)$/gm, '<div class="sai-md-li">• $1</div>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function appendBubble(role, text, meta = null) {
    const container = document.getElementById("saiMessages");
    const html = formatMarkdown(text);

    if (role === "user") {
      const div = document.createElement("div");
      div.className = "sai-bubble user";
      div.innerHTML = html;
      container.appendChild(div);
    } else {
      const row = document.createElement("div");
      row.className = "sai-bot-row";
      let citationsHtml = "";
      if (meta && meta.citations && meta.citations.length) {
        const uniqueSources = [...new Set(meta.citations.map((c) => c.domain_name || c.source_file).filter(Boolean))].slice(0, 3);
        if (uniqueSources.length) {
          citationsHtml = `<div class="sai-sources">📚 ${uniqueSources.join(" • ")}</div>`;
        }
      }
      row.innerHTML = `<div class="sai-mini-avatar"><img src="${SCRIPT_BASE}sistec-crest.png" alt="SISTec" class="sai-mini-avatar-img" /></div><div class="sai-bubble bot">${html}${citationsHtml}</div>`;
      container.appendChild(row);
      row.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    container.scrollTop = container.scrollHeight;
  }

  async function sendMessage(query) {
    appendBubble("user", query);
    chatHistory.push({ role: "user", content: query });

    const container = document.getElementById("saiMessages");
    const typingRow = document.createElement("div");
    typingRow.className = "sai-bot-row";
    typingRow.innerHTML = `<div class="sai-mini-avatar"><img src="${SCRIPT_BASE}sistec-crest.png" alt="SISTec" class="sai-mini-avatar-img" /></div><div class="sai-bubble bot">Thinking...</div>`;
    container.appendChild(typingRow);
    container.scrollTop = container.scrollHeight;

    const slowTimer = setTimeout(() => {
      const b = typingRow.querySelector(".sai-bubble");
      if (b) b.textContent = "Waking up AI server, please wait (10–20s)...";
    }, 3500);

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 60000);

    const doChatFetch = () =>
      fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chat_history: chatHistory }),
        signal: controller.signal
      });

    try {
      let res = await doChatFetch();
      if (res.status === 502 || res.status === 503) {
        await new Promise((r) => setTimeout(r, 3000));
        res = await doChatFetch();
      }
      clearTimeout(abortTimer);
      clearTimeout(slowTimer);
      typingRow.remove();
      if (!res.ok) throw new Error("Backend unavailable");
      const data = await res.json();
      const reply = data.answer || "Sorry, I couldn't find an answer.";
      appendBubble("bot", reply, { citations: data.citations || [] });
      chatHistory.push({ role: "assistant", content: reply });
    } catch {
      clearTimeout(abortTimer);
      clearTimeout(slowTimer);
      typingRow.remove();
      const fallback = offlineReply(query);
      appendBubble("bot", fallback);
      chatHistory.push({ role: "assistant", content: fallback });
    }
  }

  function offlineReply(query) {
    const q = query.toLowerCase();
    if (q.includes("placement") || q.includes("package") || q.includes("fee")) {
      return "SISTec offers strong placements with **100+ recruiters** (TCS, Infosys, Cognizant, Wipro) and packages reaching **₹26 LPA**. Check the Placements page for branch-wise details.";
    }
    if (q.includes("admission") || q.includes("eligib")) {
      return "For **Admissions 2027**, B.Tech applicants need 10+2 with PCM via MP DTE Counselling / JEE Mains. Click **Admissions - 2027** or call **9109975760**!";
    }
    if (q.includes("hostel") || q.includes("mess")) {
      return "SISTec has separate on-campus **AC & Non-AC Hostels** for boys and girls with 24x7 Wi-Fi, mess, and sports facilities.";
    }
    if (q.includes("contact") || q.includes("phone") || q.includes("call")) {
      return "You can reach SISTec-GN Admissions at **9109975760** or visit the **Contact** page.";
    }
    return "AI server is waking up on Render (takes ~20s on first load). Please try sending your question again, or ask about **Admissions 2027**, **Placements**, or **Hostel**!";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
})();
