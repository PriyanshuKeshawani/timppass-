(function () {
  "use strict";

  const BACKEND_URL = "https://sagar-chat-bot.onrender.com/api";
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
        <button type="button" id="saiLauncherBtn" class="sai-launcher-circle" title="Chat with SISTec AI">
          <i class="fas fa-comment-dots"></i>
        </button>
      </div>

      <!-- Dim Backdrop -->
      <div class="sai-backdrop" id="saiBackdrop"></div>

      <!-- Expanded Chat Card -->
      <div class="sai-card" id="saiCard" role="dialog" aria-label="SISTec AI Assistant">
        <div class="sai-top-bar">
          <button type="button" id="saiExpandBtn" class="sai-icon-btn" title="Expand / Collapse">⛶</button>
          <div class="sai-top-right">
            <button type="button" id="saiClearBtn" class="sai-icon-btn" title="Clear Chat">⋯</button>
            <button type="button" id="saiCloseBtn" class="sai-icon-btn" title="Close">✕</button>
          </div>
        </div>

        <div style="text-align:center;">
          <div class="sai-header-pill">
            <div class="sai-avatar">
              <i class="fas fa-sparkles">✦</i>
              <span class="sai-online-dot"></span>
            </div>
            <div class="sai-header-text" style="text-align:left;">
              <h4>SISTec AI Support</h4>
              <span>Campus AI Assistant</span>
            </div>
          </div>
        </div>

        <div class="sai-messages" id="saiMessages">
          <div class="sai-bot-row" id="saiWelcomeRow">
            <div class="sai-mini-avatar">✦</div>
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
            <button type="button" id="saiPlusBtn" class="sai-plus-btn" title="Quick Topics">+</button>
            <input type="text" id="saiChatInput" class="sai-chat-input" placeholder="Write a message..." />
            <button type="button" id="saiSendBtn" class="sai-arrow-btn" title="Send">↑</button>
          </div>
          <div class="sai-powered">Powered by <b>SISTec AI</b></div>
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

    document.getElementById("saiLauncherBtn").addEventListener("click", openCard);
    document.getElementById("saiCloseBtn").addEventListener("click", closeCard);
    document.getElementById("saiExpandBtn").addEventListener("click", () => {
      card.classList.toggle("expanded");
    });
    document.getElementById("saiPlusBtn").addEventListener("click", () => {
      promptsTray.hidden = !promptsTray.hidden;
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
      row.innerHTML = `<div class="sai-mini-avatar">✦</div><div class="sai-bubble bot">${html}${citationsHtml}</div>`;
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
    typingRow.innerHTML = `<div class="sai-mini-avatar">✦</div><div class="sai-bubble bot">Thinking...</div>`;
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
