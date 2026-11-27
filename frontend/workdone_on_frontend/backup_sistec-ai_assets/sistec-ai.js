/**
 * SISTec AI Suite - Dedicated Multi-RAG Chatbot Integration
 * Connects SISTec Website to FastAPI Multi-RAG Backend (Port 8000):
 * - Health Check: GET /api/health
 * - Domain Vectors: GET /api/domains
 * - Conversational Query: POST /api/chat
 */

(function () {
  'use strict';

  const BACKEND_URL = 'http://localhost:8000/api';

  // State
  let backendStatus = 'checking'; // 'healthy' | 'offline'
  let domains = [];
  let selectedDomain = null;
  let chatHistory = [];

  function initSistecChatbot() {
    // 1. Floating Launcher Button (Bottom Right)
    const launcherHTML = `
      <div class="sistec-ai-floating-launcher" id="sistecAiLauncher">
        <button class="sistec-ai-launch-btn chat-btn" id="sistecChatToggleBtn" title="Ask SISTec AI Assistant">
          <i class="fas fa-robot text-white"></i>
          <span>SISTec AI Assistant</span>
          <span class="sistec-ai-badge-pulse"></span>
        </button>
      </div>
    `;

    // 2. Chatbot Window Modal
    const chatModalHTML = `
      <div class="sistec-chat-modal" id="sistecChatModal">
        <div class="sistec-chat-header">
          <div class="sistec-chat-header-info">
            <div class="sistec-chat-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div class="sistec-chat-title">
              <h4>SISTec Campus Assistant</h4>
              <div class="sistec-chat-status">
                <span class="sistec-status-dot" id="sistecChatStatusDot"></span>
                <span id="sistecChatStatusText">Connecting to LangGraph & ChromaDB...</span>
              </div>
            </div>
          </div>
          <button class="sistec-chat-close-btn" id="sistecChatCloseBtn" title="Close Chat">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Domain Filter Bar -->
        <div class="sistec-domain-strip" id="sistecDomainStrip">
          <span class="sistec-domain-chip active" data-domain="">All Domains (Auto Router)</span>
        </div>

        <!-- Chat Messages -->
        <div class="sistec-chat-messages" id="sistecChatMessages">
          <div class="sistec-chat-bubble bot">
            <div>
              Hello! 👋 Welcome to <strong>SISTec</strong>.
              <br><br>
              I am your <strong>Multi-RAG AI Assistant</strong> powered by Google Gemini and ChromaDB. Ask me anything about admissions, packages, syllabus, or hostel life!
            </div>
            <div class="sistec-chat-meta">
              <span>SISTec Knowledge Base</span>
              <span>Just now</span>
            </div>
          </div>
        </div>

        <!-- Suggested Prompt Chips (2x2 Grid Layout) -->
        <div class="sistec-suggested-prompts" id="sistecSuggestedPrompts">
          <button class="sistec-prompt-btn" data-query="What are the highest and average placement packages at SISTec?">
            <span>🎓</span> <span>Placement Packages</span>
          </button>
          <button class="sistec-prompt-btn" data-query="What is the admission procedure and eligibility for B.Tech?">
            <span>📝</span> <span>Admission Process</span>
          </button>
          <button class="sistec-prompt-btn" data-query="What are the hostel rules, fees, and mess food facilities?">
            <span>🏢</span> <span>Hostel & Mess</span>
          </button>
          <button class="sistec-prompt-btn" data-query="Which engineering branches are NBA accredited?">
            <span>⭐</span> <span>NBA Accreditation</span>
          </button>
        </div>

        <!-- Input Bar -->
        <form class="sistec-chat-input-bar" id="sistecChatForm">
          <input type="text" id="sistecChatInput" placeholder="Type your query (e.g. fees, placements, cutoff)..." autocomplete="off" />
          <button type="submit" class="sistec-chat-send-btn" id="sistecChatSendBtn" title="Send Question">
            <i class="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    `;

    // Append to document body
    const container = document.createElement('div');
    container.innerHTML = launcherHTML + chatModalHTML;
    document.body.appendChild(container);

    bindEvents();
    checkBackendHealth();
  }

  function bindEvents() {
    const chatModal = document.getElementById('sistecChatModal');
    const toggleBtn = document.getElementById('sistecChatToggleBtn');
    const closeBtn = document.getElementById('sistecChatCloseBtn');
    const chatForm = document.getElementById('sistecChatForm');
    const chatInput = document.getElementById('sistecChatInput');

    toggleBtn?.addEventListener('click', () => {
      chatModal.style.display = chatModal.style.display === 'flex' ? 'none' : 'flex';
      if (chatModal.style.display === 'flex') {
        chatInput?.focus();
      }
    });

    closeBtn?.addEventListener('click', () => {
      chatModal.style.display = 'none';
    });

    chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = chatInput.value.trim();
      if (!q) return;
      chatInput.value = '';
      sendChatMessage(q);
    });

    document.querySelectorAll('.sistec-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (query) sendChatMessage(query);
      });
    });
  }

  async function checkBackendHealth() {
    const statusDot = document.getElementById('sistecChatStatusDot');
    const statusText = document.getElementById('sistecChatStatusText');

    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        backendStatus = 'healthy';
        statusDot.className = 'sistec-status-dot';
        statusText.textContent = 'Multi-RAG & Gemini Live';
        loadDomains();
      } else {
        throw new Error('Backend non-200');
      }
    } catch (err) {
      backendStatus = 'offline';
      statusDot.className = 'sistec-status-dot offline';
      statusText.textContent = 'Backend Offline (Port 8000)';
    }
  }

  async function loadDomains() {
    try {
      const res = await fetch(`${BACKEND_URL}/domains`);
      if (res.ok) {
        domains = await res.json();
        const strip = document.getElementById('sistecDomainStrip');
        if (!strip || !domains.length) return;

        strip.innerHTML = '<span class="sistec-domain-chip active" data-domain="">All Domains (Auto Router)</span>';
        domains.forEach(d => {
          const chip = document.createElement('span');
          chip.className = 'sistec-domain-chip';
          chip.setAttribute('data-domain', d.key);
          chip.textContent = `${d.name} (${d.total_chunks})`;
          chip.addEventListener('click', () => {
            document.querySelectorAll('.sistec-domain-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedDomain = d.key;
          });
          strip.appendChild(chip);
        });

        strip.querySelector('.sistec-domain-chip')?.addEventListener('click', () => {
          document.querySelectorAll('.sistec-domain-chip').forEach(c => c.classList.remove('active'));
          strip.querySelector('.sistec-domain-chip').classList.add('active');
          selectedDomain = null;
        });
      }
    } catch (e) {
      console.warn('Could not load domains:', e);
    }
  }

  async function sendChatMessage(query) {
    const messagesContainer = document.getElementById('sistecChatMessages');

    appendMessage('user', query);
    chatHistory.push({ role: 'user', content: query });

    const loadingId = 'loading-' + Date.now();
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'sistec-chat-bubble bot';
    loadingBubble.id = loadingId;
    loadingBubble.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <i class="fas fa-spinner fa-spin" style="color:var(--sistec-purple)"></i>
        <span>Consulting SISTec ChromaDB knowledge vector...</span>
      </div>
    `;
    messagesContainer.appendChild(loadingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          chat_history: chatHistory.map(m => ({ role: m.role, content: m.content })),
          forced_domain: selectedDomain
        })
      });

      const loadingElem = document.getElementById(loadingId);
      if (loadingElem) loadingElem.remove();

      if (res.ok) {
        const data = await res.json();
        const routingInfo = data.routing?.domain ? `Domain: ${data.routing.domain}` : 'Auto Router';
        appendMessage('bot', data.answer, routingInfo);
        chatHistory.push({ role: 'assistant', content: data.answer });
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to get answer');
      }
    } catch (err) {
      const loadingElem = document.getElementById(loadingId);
      if (loadingElem) loadingElem.remove();

      const fallbackReply = generateLocalFallback(query);
      appendMessage('bot', fallbackReply, 'Offline Fallback Helper');
      chatHistory.push({ role: 'assistant', content: fallbackReply });
    }
  }

  function appendMessage(role, text, metaText = '') {
    const messagesContainer = document.getElementById('sistecChatMessages');
    const bubble = document.createElement('div');
    bubble.className = `sistec-chat-bubble ${role}`;

    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    bubble.innerHTML = `
      <div>${formattedText}</div>
      <div class="sistec-chat-meta">
        <span>${metaText || (role === 'bot' ? 'SISTec Assistant' : 'You')}</span>
        <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;

    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function generateLocalFallback(query) {
    const q = query.toLowerCase();
    if (q.includes('placement') || q.includes('package') || q.includes('salary')) {
      return "SISTec boasts excellent placement records! The highest package reached **₹26 LPA**, with 100+ top recruiters visiting annually including TCS, Infosys, Cognizant, and Wipro.";
    }
    if (q.includes('admission') || q.includes('fee') || q.includes('eligibility')) {
      return "For **B.Tech Admissions 2026-27**, candidates must pass 10+2 with Physics, Mathematics, and Chemistry through MP DTE Counselling / JEE Mains. Reach out via our Admissions page!";
    }
    if (q.includes('hostel') || q.includes('mess')) {
      return "SISTec provides separate on-campus **AC and Non-AC Hostels** for boys and girls, with 24x7 Wi-Fi, hygienic mess serving nutritious vegetarian meals, and sports facilities.";
    }
    return `Note: Backend server is currently offline on port 8000. Start the backend server via 'run_backend.bat' to enable full ChromaDB + Google Gemini search!`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSistecChatbot);
  } else {
    initSistecChatbot();
  }

  window.SistecAI = {
    openChat: () => {
      const modal = document.getElementById('sistecChatModal');
      if (modal) {
        modal.style.display = 'flex';
        document.getElementById('sistecChatInput')?.focus();
      }
    }
  };
})();
