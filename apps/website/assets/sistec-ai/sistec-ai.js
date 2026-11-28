(function () {
  "use strict";

  // Automatically determine the backend API URL (probe port 8001 first, then 8000):
  let BACKEND_URL = "http://127.0.0.1:8001/api";

  async function resolveBackendUrl() {
    if (typeof window === "undefined" || !window.location) return;
    const loc = window.location;
    if (loc.port === "8001" || loc.port === "8000") {
      BACKEND_URL = `${loc.origin}/api`;
      return;
    }
    // Check 8001 (Multi-RAG dedicated port)
    try {
      const res = await fetch("http://127.0.0.1:8001/api/health", { signal: AbortSignal.timeout(1000) });
      const data = await res.json();
      if (data.langgraph_workflow_active) {
        BACKEND_URL = "http://127.0.0.1:8001/api";
        return;
      }
    } catch {}

    // Check 8000
    try {
      const res = await fetch("http://127.0.0.1:8000/api/health", { signal: AbortSignal.timeout(1000) });
      const data = await res.json();
      if (data.langgraph_workflow_active) {
        BACKEND_URL = "http://127.0.0.1:8000/api";
        return;
      }
    } catch {}

    BACKEND_URL = "http://127.0.0.1:8001/api";
  }
  const SUPPORT_EMAIL = "adarshmishra210407@gmail.com";
  const SCRIPT_BASE =
    document.currentScript && document.currentScript.src
      ? document.currentScript.src.replace(/sistec-ai\.js.*$/, "")
      : "assets/sistec-ai/";
  let chatHistory = [];

  async function initWidget() {
    if (document.getElementById("saiCollapsedBar")) return;
    await resolveBackendUrl();
    // Check health of local backend
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
            <button type="button" id="saiMailBtn" class="sai-plus-btn" title="Draft Formal Email with AI" aria-label="Draft Formal Email">
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
      </div>

      <!-- Left-Side Standalone Formal Email Assistant Modal -->
      <div class="sai-left-mail-card" id="saiLeftMailCard" role="dialog" aria-label="Formal Email Assistant">
        <div class="sai-mail-head">
          <div>
            <h5>Formal Email Assistant</h5>
            <span class="sai-mail-status" id="saiMailStatus">Type prompt above &amp; click Generate to draft with AI</span>
          </div>
          <button type="button" id="saiMailCloseBtn" class="sai-icon-btn" title="Close Mail Assistant">✕</button>
        </div>

        <!-- Prompt Box for AI Email Generation -->
        <div class="sai-mail-prompt-section">
          <div class="sai-mail-prompt-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            <span>AI Email Generator Prompt</span>
          </div>
          <div class="sai-mail-prompt-bar">
            <textarea id="saiMailUserPrompt" class="sai-mail-prompt-input" rows="2" placeholder="Tell AI what email to draft (e.g. Inquire about B.Tech CSE placements, hostel fees, request fee concession)..."></textarea>
            <button type="button" id="saiMailGenerateBtn" class="sai-mail-gen-btn" title="Generate Email Draft">
              <span id="saiMailGenBtnText">Generate</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </button>
          </div>
        </div>

        <!-- Confirmation Card: Ask User About Chat Reference -->
        <div class="sai-mail-confirm-card" id="saiMailConfirmCard" hidden>
          <div class="sai-mail-confirm-header">
            <div class="sai-mail-confirm-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div class="sai-mail-confirm-info">
              <h6>Use Chat History as Reference?</h6>
              <p>Do you want your previous conversation with SISTec AI to also be used as reference for this email?</p>
            </div>
          </div>
          <div class="sai-mail-confirm-actions">
            <button type="button" id="saiMailRefYes" class="sai-mail-ref-btn primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Yes, use chat reference
            </button>
            <button type="button" id="saiMailRefNo" class="sai-mail-ref-btn secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              No, only use prompt
            </button>
          </div>
        </div>

        <div class="sai-mail-field">
          <label for="saiMailTo">To</label>
          <input type="email" id="saiMailTo" value="${SUPPORT_EMAIL}" />
        </div>
        <div class="sai-mail-field">
          <label for="saiMailSubject">Subject</label>
          <input type="text" id="saiMailSubject" placeholder="Email subject line..." />
        </div>
        <div class="sai-mail-field grow">
          <label for="saiMailBody">Message (Review &amp; edit before sending)</label>
          <textarea id="saiMailBody" placeholder="Email draft will appear here..."></textarea>
        </div>
        <div class="sai-mail-actions">
          <button type="button" id="saiMailCopyBtn" class="sai-mail-copy">Copy</button>
          <button type="button" id="saiMailAppBtn" class="sai-mail-copy" title="Open default Mail app">Mail App</button>
          <button type="button" id="saiMailSendBtn" class="sai-mail-send">Send via Gmail →</button>
        </div>
      </div>

      <!-- Left-Side Standalone iPhone 14 AI Voice Call Card (Neerja SISTec) -->
      <div class="sai-left-call-card" id="saiLeftCallCard" role="dialog" aria-label="Neerja Sistec Voice Call">
        <!-- Dynamic Island / Top Speaker Mesh -->
        <div class="sai-call-dynamic-island">
          <div class="sai-call-camera-dot"></div>
          <div class="sai-call-speaker-mesh"></div>
        </div>

        <!-- Real-Time Clock Header & Close Button -->
        <div class="sai-call-top-bar">
          <span id="saiCallClock">12:00 PM</span>
          <button type="button" class="sai-call-close-btn" id="saiCallCloseBtn" title="Close Call Screen">✕</button>
        </div>

        <!-- Caller Section -->
        <div class="sai-caller-section">
          <div class="sai-call-duration" id="saiCallDuration">00:00</div>
          <div class="sai-caller-title">Neerja Sistec</div>
          <div class="sai-caller-subtitle">SISTec AI Campus Receptionist</div>
          <div class="sai-turn-pill" id="saiTurnIndicator">
            <span id="saiTurnDot">●</span>
            <span id="saiTurnText">Tap Call to connect</span>
          </div>
        </div>

        <!-- Dynamic Audio Waveform -->
        <div class="sai-waveform-box" id="saiWaveformBox" title="Tap to finish speaking or interrupt">
          <div class="sai-wave-line"></div>
          <div class="sai-wave-line"></div>
          <div class="sai-wave-line"></div>
          <div class="sai-wave-line"></div>
          <div class="sai-wave-line"></div>
          <div class="sai-wave-line"></div>
          <div class="sai-wave-line"></div>
        </div>

        <!-- Live Subtitles Card -->
        <div class="sai-call-subtitles" id="saiSubtitlesBox">
          <div class="sai-sub-speaker" id="saiSubSpeaker">NEERJA SISTEC</div>
          <div id="saiSubContent">Tap the green Call button below to begin.</div>
        </div>

        <!-- Direct Counselor Dialer Connect Button -->
        <div class="sai-dialer-bar">
          <a href="tel:7898832506" class="sai-btn-dialer" id="saiDialerBtn" title="Call Admissions Counselor Desk">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            <span>Call Desk: 7898832506</span>
          </a>
        </div>

        <!-- 3 Essential Buttons: Speaker | Call/Cut | Mute -->
        <div class="sai-call-dock">
          <!-- 1. Speaker -->
          <div class="sai-btn-item" id="saiSpeakerItem">
            <button type="button" class="sai-btn-circle active-white" id="saiSpeakerBtn" title="Speaker">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            </button>
            <span class="sai-btn-label" id="saiSpeakerLabel">Speaker</span>
          </div>

          <!-- 2. Call / Cut (Center Main) -->
          <div class="sai-btn-item" id="saiCallCutItem">
            <button type="button" class="sai-btn-circle sai-btn-call-cut disconnected" id="saiCallCutBtn" title="Call / Cut">
              <svg fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </button>
            <span class="sai-btn-label" id="saiCallCutLabel">Call</span>
          </div>

          <!-- 3. Mute -->
          <div class="sai-btn-item" id="saiMuteItem">
            <button type="button" class="sai-btn-circle" id="saiMuteBtn" title="Mute">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
            </button>
            <span class="sai-btn-label" id="saiMuteLabel">Mute</span>
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

    const leftMailCard = document.getElementById("saiLeftMailCard");

    const positionLeftMailCard = () => {
      if (!leftMailCard) return;
      if (window.innerWidth <= 768) {
        leftMailCard.style.top = "";
        leftMailCard.style.bottom = "";
        leftMailCard.style.left = "";
        leftMailCard.style.transformOrigin = "";
        return;
      }
      const mailBtn = document.getElementById("fixedMailBtn");
      if (mailBtn) {
        const rect = mailBtn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Position card horizontally 15px to the right of the button
        leftMailCard.style.left = `${Math.round(rect.right + 15)}px`;
        
        // Align bottom of card with bottom of mail button
        let bottomOffset = Math.max(16, Math.round(viewportHeight - rect.bottom));
        
        // Ensure top of card stays within viewport
        const cardHeight = leftMailCard.offsetHeight || 580;
        if (viewportHeight - bottomOffset - cardHeight < 20) {
          bottomOffset = Math.max(16, viewportHeight - cardHeight - 20);
        }
        
        leftMailCard.style.bottom = `${bottomOffset}px`;
        leftMailCard.style.top = "auto";
        
        // Center transform-origin on the circular mail button
        const btnCenterOffset = Math.max(20, Math.round(rect.height / 2));
        leftMailCard.style.transformOrigin = `0px calc(100% - ${btnCenterOffset}px)`;
      }
    };

    const openLeftMail = () => {
      if (card && card.classList.contains("open")) {
        closeCard();
      }
      mailUserEdited = false;
      if (mailTo) mailTo.value = SUPPORT_EMAIL;
      if (confirmCard) confirmCard.hidden = true;
      if (!mailSubject.value) {
        const initial = buildLocalDraft();
        mailSubject.value = initial.subject;
        mailBody.value = initial.body;
      }
      mailStatus.textContent = "Type prompt above & click Generate to draft with AI";
      positionLeftMailCard();
      backdrop.classList.add("open");
      leftMailCard.classList.add("open");
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        positionLeftMailCard();
        mailUserPrompt?.focus();
      }, 50);
    };

    const leftCallCard = document.getElementById("saiLeftCallCard");
    let isCallLive = false;
    let isMuted = false;
    let isSpeakerOn = true;
    let isBotSpeaking = false;
    let isMicActive = false;
    let callTimerSeconds = 0;
    let timerRef = null;
    let recognitionInstance = null;
    let silenceTimer = null;
    let accumulatedUserSentence = "";
    let voicesList = [];

    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        voicesList = window.speechSynthesis.getVoices();
      }
    };
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }

    const getBestVoice = () => {
      if (!voicesList.length) loadVoices();
      const preferences = ['Google हिन्दी', 'Microsoft Heera', 'Microsoft Neerja', 'Google UK English Female', 'Microsoft Zira', 'Google US English'];
      for (const p of preferences) {
        const found = voicesList.find((v) => (v.name && v.name.includes(p)) || v.lang === 'hi-IN' || v.lang === 'en-IN');
        if (found) return found;
      }
      return voicesList[0] || null;
    };

    const updateCallClock = () => {
      const el = document.getElementById("saiCallClock");
      if (!el) return;
      const now = new Date();
      let hrs = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, "0");
      const ampm = hrs >= 12 ? "PM" : "AM";
      hrs = hrs % 12 || 12;
      el.textContent = `${hrs}:${mins} ${ampm}`;
    };
    setInterval(updateCallClock, 1000);
    updateCallClock();

    const positionLeftCallCard = () => {
      if (!leftCallCard) return;
      if (window.innerWidth <= 768) {
        leftCallCard.style.top = "";
        leftCallCard.style.bottom = "";
        leftCallCard.style.left = "";
        leftCallCard.style.transformOrigin = "";
        return;
      }
      const mailBtn = document.getElementById("fixedMailBtn");
      const callBtn = document.getElementById("fixedCallBtn");
      const targetBtn = mailBtn || callBtn;
      if (targetBtn) {
        const rect = targetBtn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        leftCallCard.style.left = `${Math.round(rect.right + 15)}px`;
        
        // Align bottom of card with bottom of mail button (lower down as requested)
        let bottomOffset = Math.max(16, Math.round(viewportHeight - rect.bottom));
        const cardHeight = leftCallCard.offsetHeight || 560;
        if (viewportHeight - bottomOffset - cardHeight < 15) {
          bottomOffset = Math.max(12, viewportHeight - cardHeight - 15);
        }
        
        leftCallCard.style.bottom = `${bottomOffset}px`;
        leftCallCard.style.top = "auto";
        
        const btnCenterOffset = Math.max(20, Math.round(rect.height / 2));
        leftCallCard.style.transformOrigin = `0px calc(100% - ${btnCenterOffset}px)`;
      }
    };

    const SpeechRecognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    let ttsWatchdogTimer = null;
    let currentUtteranceRef = null;
    let lastBotSpokenText = "";
    let botSpeechEndTime = 0;
    let micStartedAt = 0;

    // Echo killer: Ignores audio if it matches Neerja's own recently spoken text
    const isEchoOfBot = (text) => {
      if (!lastBotSpokenText || !text) return false;
      const cleanUser = text.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanBot = lastBotSpokenText.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanUser.length < 8) return false;
      return cleanBot.includes(cleanUser);
    };

    const killMic = () => {
      clearTimeout(silenceTimer);
      if (recognitionInstance) {
        try {
          recognitionInstance.onend = null;
          recognitionInstance.onerror = null;
          recognitionInstance.onresult = null;
          recognitionInstance.abort();
        } catch (e) {}
        recognitionInstance = null;
      }
      isMicActive = false;
    };

    const createAndStartMic = () => {
      if (!isCallLive || isMuted || isBotSpeaking) return;
      if (!SpeechRecognition) {
        const subContent = document.getElementById("saiSubContent");
        if (subContent) subContent.innerText = "Speech recognition is not supported in this browser. Please use Google Chrome or Edge.";
        return;
      }

      killMic();

      try {
        recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-IN';
        recognitionInstance.maxAlternatives = 1;

        recognitionInstance.onstart = () => {
          isMicActive = true;
          micStartedAt = Date.now();
          setWaveState('listening');
          updateTurnUI("listening", "🎙️ Listening... Speak naturally");
          const subSpeaker = document.getElementById("saiSubSpeaker");
          const subContent = document.getElementById("saiSubContent");
          if (subSpeaker && subSpeaker.innerText !== "YOU (CALLER)") {
            subSpeaker.innerText = "LISTENING";
          }
          if (subContent && (!subContent.innerText || subContent.innerText.includes("Connecting") || subContent.innerText.includes("Tap the green"))) {
            subContent.innerText = "Speak now (e.g. fees, placements, hostel)...";
          }
        };

        recognitionInstance.onresult = (event) => {
          if (isBotSpeaking) {
            accumulatedUserSentence = "";
            return;
          }

          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const combined = (final + interim).trim();
          if (combined) {
            accumulatedUserSentence = combined;
            const subSpeaker = document.getElementById("saiSubSpeaker");
            const subContent = document.getElementById("saiSubContent");
            if (subSpeaker) subSpeaker.innerText = "YOU (CALLER)";
            if (subContent) subContent.innerText = `"${combined}"`;

            setWaveState('listening');
            updateTurnUI("listening", "🎙️ Listening...");

            clearTimeout(silenceTimer);
            const wordCount = combined.split(/\s+/).length;
            const silenceDelay = (final.trim().length > 0 && wordCount >= 3) ? 500 : 800;

            silenceTimer = setTimeout(() => {
              if (accumulatedUserSentence && accumulatedUserSentence.length > 2 && !isBotSpeaking) {
                if (isEchoOfBot(accumulatedUserSentence)) {
                  accumulatedUserSentence = "";
                  return;
                }
                const query = accumulatedUserSentence;
                accumulatedUserSentence = "";
                killMic();
                dispatchVoiceQuery(query);
              }
            }, silenceDelay);
          }
        };

        recognitionInstance.onerror = (event) => {
          console.warn("Speech recognition notice:", event.error);
          if (event.error === 'not-allowed') {
            const subSpeaker = document.getElementById("saiSubSpeaker");
            const subContent = document.getElementById("saiSubContent");
            if (subSpeaker) subSpeaker.innerText = "MIC PERMISSION REQUIRED";
            if (subContent) subContent.innerText = "Please allow microphone access in your browser to speak with Neerja.";
            updateTurnUI("idle", "Mic Access Denied");
          }
        };

        recognitionInstance.onend = () => {
          isMicActive = false;
          if (isCallLive && !isBotSpeaking && !isMuted) {
            setTimeout(() => {
              createAndStartMic();
            }, 200);
          }
        };

        recognitionInstance.start();
      } catch (err) {
        console.warn("Mic start notice:", err);
      }
    };

    const speakThroughPhoneSpeaker = (text, onFinished) => {
      isBotSpeaking = true;
      lastBotSpokenText = (text || "").toLowerCase().trim();
      killMic();

      if (!isSpeakerOn || !window.speechSynthesis) {
        setTimeout(() => {
          botSpeechEndTime = Date.now();
          isBotSpeaking = false;
          if (onFinished) onFinished();
        }, 1200);
        return;
      }

      clearTimeout(ttsWatchdogTimer);
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef = utterance;
      window._activeVoiceUtterance = utterance;

      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.15; // Fast, snappy, crisp conversation

      let hasFinished = false;
      const handleSpeechComplete = () => {
        if (hasFinished) return;
        hasFinished = true;
        clearTimeout(ttsWatchdogTimer);
        currentUtteranceRef = null;
        window._activeVoiceUtterance = null;
        botSpeechEndTime = Date.now();

        // Check if browser is still outputting audio before opening microphone
        const checkAudioFinished = (attempts = 0) => {
          if (attempts < 15 && window.speechSynthesis && window.speechSynthesis.speaking) {
            setTimeout(() => checkAudioFinished(attempts + 1), 150);
            return;
          }
          // 400ms room decay after speech is completely done
          setTimeout(() => {
            isBotSpeaking = false;
            if (onFinished) onFinished();
          }, 400);
        };

        checkAudioFinished();
      };

      utterance.onend = handleSpeechComplete;
      utterance.onerror = handleSpeechComplete;

      // Generous watchdog: Only fires if browser engine completely freezes (25s+ safety)
      const maxDuration = Math.max(25000, (text.length / 8) * 1000 + 10000);
      ttsWatchdogTimer = setTimeout(() => {
        handleSpeechComplete();
      }, maxDuration);

      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("SpeechSynthesis error:", err);
        handleSpeechComplete();
      }
    };

    const updateTurnUI = (state, text) => {
      const pill = document.getElementById("saiTurnIndicator");
      const txt = document.getElementById("saiTurnText");
      if (pill) pill.className = `sai-turn-pill ${state}-state`;
      if (txt) txt.innerText = text;
    };

    const setWaveState = (state) => {
      const box = document.getElementById("saiWaveformBox");
      if (!box) return;
      box.classList.remove("speaking", "listening");
      if (state === "speaking") {
        box.classList.add("speaking");
      } else if (state === "listening") {
        box.classList.add("listening");
      }
    };

    const connectCall = async () => {
      // 1. Mobile & desktop permission check on direct user gesture
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: { ideal: true },
              noiseSuppression: { ideal: true },
              autoGainControl: { ideal: true }
            }
          });
          stream.getTracks().forEach((t) => t.stop());
        } catch (permErr) {
          console.warn("Microphone permission prompt:", permErr);
        }
      }

      isCallLive = true;
      const callCutBtn = document.getElementById("saiCallCutBtn");
      const callCutLabel = document.getElementById("saiCallCutLabel");
      if (callCutBtn) callCutBtn.classList.remove("disconnected");
      if (callCutLabel) callCutLabel.innerText = "Cut";

      callTimerSeconds = 0;
      clearInterval(timerRef);
      timerRef = setInterval(() => {
        callTimerSeconds++;
        const m = String(Math.floor(callTimerSeconds / 60)).padStart(2, "0");
        const s = String(callTimerSeconds % 60).padStart(2, "0");
        const dur = document.getElementById("saiCallDuration");
        if (dur) dur.innerText = `${m}:${s}`;
      }, 1000);

      setWaveState("speaking");
      updateTurnUI("speaking", "🔊 Connecting to Neerja...");
      const subSpeaker = document.getElementById("saiSubSpeaker");
      const subContent = document.getElementById("saiSubContent");
      if (subSpeaker) subSpeaker.innerText = "NEERJA SISTEC";
      if (subContent) subContent.innerText = "Connecting to SISTec campus desk...";

      try {
        const res = await fetch(`${BACKEND_URL}/voice/greeting?use_edge_tts=false`);
        const data = await res.json();
        if (subContent) subContent.innerText = data.text;
        speakThroughPhoneSpeaker(data.text, () => {
          createAndStartMic();
        });
      } catch (err) {
        console.warn("Greeting fetch notice:", err);
        const fallback = "Namaste and hello! Welcome to SISTec College Bhopal helpdesk. Main Neerja hoon. Aap admissions, fees ya placements me se kis baare me janna chahte hain?";
        if (subContent) subContent.innerText = fallback;
        speakThroughPhoneSpeaker(fallback, () => {
          createAndStartMic();
        });
      }
    };

    const disconnectCall = () => {
      isCallLive = false;
      clearInterval(timerRef);
      killMic();
      clearTimeout(ttsWatchdogTimer);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      isBotSpeaking = false;

      const callCutBtn = document.getElementById("saiCallCutBtn");
      const callCutLabel = document.getElementById("saiCallCutLabel");
      const callDur = document.getElementById("saiCallDuration");
      const subSpeaker = document.getElementById("saiSubSpeaker");
      const subContent = document.getElementById("saiSubContent");

      if (callCutBtn) callCutBtn.classList.add("disconnected");
      if (callCutLabel) callCutLabel.innerText = "Call";
      if (callDur) callDur.innerText = "00:00";
      if (subSpeaker) subSpeaker.innerText = "SYSTEM";
      if (subContent) subContent.innerText = "Call ended. Tap the green Call button to connect again.";

      setWaveState("idle");
      updateTurnUI("idle", "Call ended");
    };

    const dispatchVoiceQuery = async (queryText) => {
      if (!queryText || !queryText.trim()) return;

      killMic();
      setWaveState("loading");
      updateTurnUI("loading", "⏳ Processing Answer...");
      const subSpeaker = document.getElementById("saiSubSpeaker");
      const subContent = document.getElementById("saiSubContent");
      if (subSpeaker) subSpeaker.innerText = "NEERJA SISTEC";
      if (subContent) subContent.innerText = "Looking up college records...";

      try {
        const res = await fetch(`${BACKEND_URL}/voice/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: queryText, use_edge_tts: false })
        });
        const data = await res.json();
        const reply = data.text || "Main aapki baat samajh nahi paayi, please dobara bolein.";

        if (subSpeaker) subSpeaker.innerText = "NEERJA SISTEC";
        if (subContent) subContent.innerText = reply;

        setWaveState("speaking");
        updateTurnUI("speaking", "🔊 Answering...");

        speakThroughPhoneSpeaker(reply, () => {
          createAndStartMic();
        });
      } catch (err) {
        console.warn("Voice chat notice:", err);
        const fb = "Connection thoda slow hai. Please ek baar phir se puchiye.";
        if (subContent) subContent.innerText = fb;
        speakThroughPhoneSpeaker(fb, () => {
          createAndStartMic();
        });
      }
    };

    const openLeftCall = () => {
      if (card && card.classList.contains("open")) {
        closeCard();
      }
      if (leftMailCard && leftMailCard.classList.contains("open")) {
        closeLeftMail();
      }
      positionLeftCallCard();
      backdrop.classList.add("open");
      leftCallCard.classList.add("open");
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        positionLeftCallCard();
      }, 50);
      if (!isCallLive) {
        connectCall();
      }
    };

    const closeLeftCall = () => {
      if (isCallLive) disconnectCall();
      if (leftCallCard) leftCallCard.classList.remove("open");
      if (!card.classList.contains("open") && (!leftMailCard || !leftMailCard.classList.contains("open"))) {
        backdrop.classList.remove("open");
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("resize", () => {
      if (leftMailCard && leftMailCard.classList.contains("open")) {
        positionLeftMailCard();
      }
      if (leftCallCard && leftCallCard.classList.contains("open")) {
        positionLeftCallCard();
      }
    });

    const closeLeftMail = () => {
      if (leftMailCard) leftMailCard.classList.remove("open");
      if (!card.classList.contains("open") && (!leftCallCard || !leftCallCard.classList.contains("open"))) {
        backdrop.classList.remove("open");
        document.body.style.overflow = "";
      }
      if (confirmCard) confirmCard.hidden = true;
    };

    backdrop.addEventListener("click", () => {
      closeCard();
      closeLeftMail();
      closeLeftCall();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (card.classList.contains("open")) closeCard();
        if (leftMailCard && leftMailCard.classList.contains("open")) closeLeftMail();
        if (leftCallCard && leftCallCard.classList.contains("open")) closeLeftCall();
      }
    });
    document.addEventListener("click", (e) => {
      if (card.classList.contains("open") && !card.contains(e.target) && !collapsedBar.contains(e.target)) {
        closeCard();
      }
      if (
        leftMailCard &&
        leftMailCard.classList.contains("open") &&
        !leftMailCard.contains(e.target) &&
        !document.getElementById("fixedMailBtn")?.contains(e.target) &&
        !document.getElementById("mobileMailBtn")?.contains(e.target) &&
        !document.getElementById("saiMailBtn")?.contains(e.target)
      ) {
        closeLeftMail();
      }
      if (
        leftCallCard &&
        leftCallCard.classList.contains("open") &&
        !leftCallCard.contains(e.target) &&
        !document.getElementById("fixedCallBtn")?.contains(e.target) &&
        !document.getElementById("mobileCallBtn")?.contains(e.target)
      ) {
        closeLeftCall();
      }
    });

    document.getElementById("saiCallCloseBtn")?.addEventListener("click", () => {
      closeLeftCall();
    });

    const toggleCallAction = () => {
      if (!isCallLive) connectCall();
      else disconnectCall();
    };

    document.getElementById("saiCallCutBtn")?.addEventListener("click", toggleCallAction);
    document.getElementById("saiCallCutItem")?.addEventListener("click", (e) => {
      if (e.target.closest("#saiCallCutBtn")) return;
      toggleCallAction();
    });

    const toggleSpeakerAction = () => {
      isSpeakerOn = !isSpeakerOn;
      document.getElementById("saiSpeakerBtn")?.classList.toggle("active-white", isSpeakerOn);
      if (!isSpeakerOn && window.speechSynthesis) window.speechSynthesis.cancel();
    };

    document.getElementById("saiSpeakerBtn")?.addEventListener("click", toggleSpeakerAction);
    document.getElementById("saiSpeakerItem")?.addEventListener("click", (e) => {
      if (e.target.closest("#saiSpeakerBtn")) return;
      toggleSpeakerAction();
    });

    const toggleMuteAction = () => {
      isMuted = !isMuted;
      document.getElementById("saiMuteBtn")?.classList.toggle("active-white", isMuted);
      if (isMuted) {
        killMic();
        updateTurnUI("idle", "Microphone Muted");
      } else {
        createAndStartMic();
      }
    };

    document.getElementById("saiMuteBtn")?.addEventListener("click", toggleMuteAction);
    document.getElementById("saiMuteItem")?.addEventListener("click", (e) => {
      if (e.target.closest("#saiMuteBtn")) return;
      toggleMuteAction();
    });

    document.getElementById("saiWaveformBox")?.addEventListener("click", () => {
      if (isBotSpeaking) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        isBotSpeaking = false;
        createAndStartMic();
        return;
      }
      if (accumulatedUserSentence && accumulatedUserSentence.length > 2) {
        const q = accumulatedUserSentence;
        accumulatedUserSentence = "";
        killMic();
        dispatchVoiceQuery(q);
      }
    });

    document.getElementById("saiDialerBtn")?.addEventListener("click", (e) => {
      if (isCallLive) disconnectCall();
    });

    document.getElementById("saiLauncherBtn").addEventListener("click", openCard);
    document.getElementById("saiCloseBtn").addEventListener("click", closeCard);
    document.getElementById("saiExpandBtn").addEventListener("click", () => {
      card.classList.toggle("expanded");
    });
    const mailTo = document.getElementById("saiMailTo");
    const mailSubject = document.getElementById("saiMailSubject");
    const mailBody = document.getElementById("saiMailBody");
    const mailStatus = document.getElementById("saiMailStatus");
    const mailCopyBtn = document.getElementById("saiMailCopyBtn");
    const mailUserPrompt = document.getElementById("saiMailUserPrompt");
    const mailGenerateBtn = document.getElementById("saiMailGenerateBtn");
    const mailGenBtnText = document.getElementById("saiMailGenBtnText");
    const confirmCard = document.getElementById("saiMailConfirmCard");
    const refYesBtn = document.getElementById("saiMailRefYes");
    const refNoBtn = document.getElementById("saiMailRefNo");
    let mailUserEdited = false;

    [mailSubject, mailBody].forEach((el) => {
      el.addEventListener("input", () => { mailUserEdited = true; });
    });

    const buildLocalDraft = (promptText = "", includeChat = false) => {
      const topic = promptText || "Inquiry Regarding SISTec Admissions & Academic Support";
      let summaryPoints = "";
      if (includeChat) {
        const userMsgs = chatHistory.filter((m) => m.role === "user").map((m) => m.content.trim());
        if (userMsgs.length) {
          summaryPoints = "\n\nRegarding the discussed points:\n" + userMsgs.map((q, i) => `${i + 1}. ${q}`).join("\n");
        }
      }
      return {
        subject: `Inquiry: ${topic.slice(0, 60)}`,
        body: `Respected Sir/Madam,\n\nI hope this email finds you well. I am writing regarding: ${topic}.${summaryPoints}\n\nKindly guide me through the relevant official process and requirements.\n\nThank you,\n[Your Name]\n[Your Contact Number]`
      };
    };

    const openMailDraft = () => {
      openLeftMail();
    };

    const executeMailGeneration = async (promptText, includeChat) => {
      if (confirmCard) confirmCard.hidden = true;
      mailUserEdited = false;
      mailStatus.textContent = includeChat
        ? "Drafting formal email with chat reference & AI..."
        : "Drafting formal email with AI...";

      if (mailGenerateBtn) mailGenerateBtn.disabled = true;
      if (mailGenBtnText) mailGenBtnText.textContent = "Drafting...";

      mailSubject.value = "Drafting subject line...";
      mailBody.value = "Drafting formal email body with AI, please wait...";

      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const instruction =
          `You are an expert formal email drafter for SISTec college students/parents. ` +
          `User request: "${promptText}". ` +
          (includeChat
            ? `Use the conversation history above as important context and reference to accurately incorporate discussed details (fees, programs, departments, facilities, hostel, etc.). `
            : `Do NOT use or reference past conversation history. Draft the email strictly based on the user request. `) +
          `Write a polite, well-structured, professional email. Return ONLY in this exact format:
Subject: <concise formal subject line>
Body:
<polite formal email body with proper greeting and sign-off placeholders like [Your Name] and [Contact Number]>`;

        const res = await fetch(`${BACKEND_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: instruction,
            chat_history: includeChat ? chatHistory : []
          }),
          signal: ctrl.signal
        });
        clearTimeout(t);

        if (!res.ok) throw new Error("Backend response error");
        const data = await res.json();
        const ans = (data.answer || "").trim();

        const subjMatch = ans.match(/Subject:\s*(.+)/i);
        const bodyMatch = ans.match(/Body:\s*([\s\S]+)/i);

        let finalSubj = "";
        let finalBody = "";

        if (subjMatch && subjMatch[1]) {
          finalSubj = subjMatch[1].replace(/\*\*/g, "").trim();
        }
        if (bodyMatch && bodyMatch[1]) {
          finalBody = bodyMatch[1].trim();
        } else if (subjMatch) {
          finalBody = ans.replace(subjMatch[0], "").trim();
        } else {
          finalBody = ans;
        }

        mailSubject.value = finalSubj || `Inquiry: ${promptText.slice(0, 50)}`;
        mailBody.value = finalBody || ans;
        mailStatus.textContent = includeChat
          ? "AI draft ready (with chat reference) — review & edit"
          : "AI draft ready — review & edit";
      } catch (err) {
        console.warn("AI Mail generation fallback:", err);
        const local = buildLocalDraft(promptText, includeChat);
        mailSubject.value = local.subject;
        mailBody.value = local.body;
        mailStatus.textContent = "Draft ready (local fallback) — review & edit";
      } finally {
        if (mailGenerateBtn) mailGenerateBtn.disabled = false;
        if (mailGenBtnText) mailGenBtnText.textContent = "Generate";
      }
    };

    const handlePromptSubmit = () => {
      const promptText = (mailUserPrompt?.value || "").trim();
      if (!promptText) {
        mailStatus.textContent = "Please enter an email topic or prompt above";
        mailUserPrompt?.focus();
        return;
      }

      // Check if there is existing user chat in history
      const hasChatHistory = chatHistory && chatHistory.some((m) => m.role === "user");

      if (hasChatHistory) {
        // Ask user if they want chat history to be used as reference
        if (confirmCard) {
          confirmCard.hidden = false;
          confirmCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } else {
        // No chat history to reference, directly generate
        executeMailGeneration(promptText, false);
      }
    };

    mailGenerateBtn?.addEventListener("click", handlePromptSubmit);
    mailUserPrompt?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handlePromptSubmit();
      }
    });

    refYesBtn?.addEventListener("click", () => {
      const promptText = (mailUserPrompt?.value || "").trim();
      executeMailGeneration(promptText, true);
    });

    refNoBtn?.addEventListener("click", () => {
      const promptText = (mailUserPrompt?.value || "").trim();
      executeMailGeneration(promptText, false);
    });

    document.getElementById("saiMailBtn").addEventListener("click", () => {
      openLeftMail();
    });
    document.getElementById("saiMailCloseBtn").addEventListener("click", () => {
      closeLeftMail();
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
      const a = document.createElement("a");
      a.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
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
    const openMailDirectly = () => {
      openLeftMail();
    };

    const attachFixedButtons = () => {
      const fixedDiv = document.querySelector("#fixed-controls > div");
      if (fixedDiv && !document.getElementById("fixedMailBtn")) {
        const btnDiv = document.createElement("div");
        btnDiv.className = "afn-btn-div";
        btnDiv.id = "fixedMailBtnDiv";
        btnDiv.innerHTML = `
          <a href="javascript:void(0)" class="afn-btn" id="fixedMailBtn" title="Draft Formal Email with AI" aria-label="AI Mail Assistant">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </a>
          <p>AI Mail Draft</p>
        `;
        fixedDiv.appendChild(btnDiv);
      }

      // Mail Button Event Listeners
      document.getElementById("fixedMailBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        if (leftMailCard && leftMailCard.classList.contains("open")) {
          closeLeftMail();
        } else {
          openLeftMail();
        }
      });

      document.getElementById("mobileMailBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        if (leftMailCard && leftMailCard.classList.contains("open")) {
          closeLeftMail();
        } else {
          openLeftMail();
        }
      });

      // Voice Call Button Event Listeners (Neerja SISTec)
      document.getElementById("fixedCallBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        if (leftCallCard && leftCallCard.classList.contains("open")) {
          closeLeftCall();
        } else {
          openLeftCall();
        }
      });

      document.getElementById("mobileCallBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        if (leftCallCard && leftCallCard.classList.contains("open")) {
          closeLeftCall();
        } else {
          openLeftCall();
        }
      });
    };

    attachFixedButtons();
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
      if (b) b.textContent = "Connecting to SISTec Multi-RAG AI, please wait...";
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
    return "Local SISTec Multi-RAG Backend is currently offline on port 8000. Please start the backend server via 'run_backend.bat' to enable full ChromaDB + Gemini search!";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
})();
