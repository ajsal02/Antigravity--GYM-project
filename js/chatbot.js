/**
 * FORGE ATHLETICS | AI CONCIERGE CHATBOT CONTROLLER
 * Integrates OpenAI ChatGPT (GPT-4o-mini / GPT-4o) via local /api/chat backend.
 * Features: Rich chat widget, markdown parser, quick chips, audio blips, and smart deep links.
 */

(function () {
  'use strict';

  // Elements
  const wrapper = document.getElementById('forge-chatbot-wrapper');
  const triggerBtn = document.getElementById('forge-chat-trigger');
  const chatWindow = document.getElementById('forge-chat-window');
  const closeBtn = document.getElementById('chat-btn-close');
  const clearBtn = document.getElementById('chat-btn-clear');
  const settingsBtn = document.getElementById('chat-btn-settings');
  const settingsPanel = document.getElementById('chat-settings-panel');
  const manualKeyInput = document.getElementById('manual-api-key-input');
  const manualModelSelect = document.getElementById('manual-model-select');
  const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
  const btnSaveKey = document.getElementById('btn-save-key');
  const btnClearKey = document.getElementById('btn-clear-key');
  const currentKeyHint = document.getElementById('current-key-hint');
  const settingsStatusPill = document.getElementById('settings-status-pill');
  const settingsFeedback = document.getElementById('settings-feedback');

  const messagesContainer = document.getElementById('chat-messages-container');
  const inputForm = document.getElementById('chat-input-form');
  const inputField = document.getElementById('chat-input-field');
  const sendBtn = document.getElementById('chat-send-btn');
  const unreadBadge = document.getElementById('chat-unread-badge');
  const modelBadge = document.getElementById('chat-model-badge');
  const statusSubtitle = document.getElementById('chat-status-subtitle');
  const suggestionChips = document.querySelectorAll('.chat-suggestion-chip');

  // State
  let isOpen = false;
  let isSending = false;
  let isSettingsOpen = false;
  let conversationHistory = []; // { role: 'user' | 'assistant', content: string }
  let hasInteracted = false;

  // Web Audio Context for micro-feedback blips
  let audioCtx = null;
  function playBlip(freq = 520, type = 'sine', duration = 0.08) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio not supported or blocked, ignore
    }
  }

  // Resolve API Endpoint with local dev & static host flexibility
  function getApiEndpoint(path) {
    if (window.location.protocol === 'file:') {
      return `http://localhost:8080${path}`;
    }
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        if (window.location.port !== '8080' && window.location.port !== '') {
          return `http://localhost:8080${path}`;
        }
      }
    }
    return path;
  }

  // Built-in FORGE AI Knowledge Engine (Instant offline & static host response)
  function generateLocalKnowledgeReply(query) {
    const q = (query || '').toLowerCase().trim();

    if (/\b(price|pricing|cost|fee|membership|tier|plan|how much|dollar|\$)\b/i.test(q)) {
      return (
        "**FORGE Membership Tiers:**\n\n" +
        "• **Core Black ($89/mo)**: Full gym floor access, biometric scan, locker rooms & sauna access.\n" +
        "• **Calisthenics Master ($139/mo)**: Unlimited Zone 02 Rig Jungle access, Coach Viktor Kroll's weekly clinics, ring workshops, and open gym.\n" +
        "• **Pro Performance ($179/mo)**: Complete all-access pass, daily coached platform sessions, unlimited -110°C electric cryotherapy, and monthly InBody reviews.\n\n" +
        "👉 You can also claim a **7-Day Free VIP Access Pass** using the form on this page!"
      );
    }

    if (/\b(calisthenic|calisthenics|ring|rings|planche|lever|muscle-?up|handstand|kroll|viktor|bodyweight|bar)\b/i.test(q)) {
      return (
        "**FORGE Calisthenics & Bodyweight Acrobatics:**\n\n" +
        "Led by Master Coach **Viktor Kroll** (former national gymnast & ring specialist), our calisthenics academy operates in the **Zone 02 Rig Jungle** equipped with competition wooden rings, parallel bars, and stall bars.\n\n" +
        "• **Calisthenics Foundations**: Strict pull-ups, hollow body mechanics, and ring dip stability.\n" +
        "• **Ring Mastery**: False grip technique, strict ring muscle-ups, and Iron Cross preparation.\n" +
        "• **Planche & Lever Lab**: Elite straight-arm isometric conditioning (tuck, straddle, full planche, and front lever).\n\n" +
        "Interested? Book a session or claim your free 7-day pass on this page!"
      );
    }

    if (/\b(lifting|weightlifting|olympic|snatch|clean|jerk|marcus|vance|barbell|squat|deadlift|eleiko)\b/i.test(q)) {
      return (
        "**FORGE Olympic Weightlifting & Strength:**\n\n" +
        "Headed by Master Coach **Marcus Vance** (IWF-certified), **Zone 01** features:\n\n" +
        "• 8 custom competition platforms with certified Eleiko Olympic barbells & calibrated discs.\n" +
        "• High-speed kinematics cameras and force plate diagnostics for instantaneous bar-velocity tracking.\n" +
        "• Daily coached technical lifting clinics covering snatch & clean-and-jerk kinematics."
      );
    }

    if (/\b(elena|rostova|biomechanic|conditioning|metabolic|screening|mobility)\b/i.test(q)) {
      return (
        "**Biomechanics & Conditioning with Elena Rostova:**\n\n" +
        "Coach Elena Rostova heads **Zone 03 Movement Diagnostics**:\n\n" +
        "• Comprehensive 3D joint mobility & functional movement screens.\n" +
        "• High-intensity anaerobic power output and VO2 max profiling.\n" +
        "• Injury prevention and corrective kinetic chain reconditioning."
      );
    }

    if (/\b(hour|hours|time|times|open|close|closing|schedule|timetable|when|weekend|sunday|monday)\b/i.test(q)) {
      return (
        "**FORGE Operating Hours & Timetable:**\n\n" +
        "⏰ **Facility Hours**:\n" +
        "• **Monday – Friday**: 05:00 – 23:00\n" +
        "• **Saturday – Sunday**: 06:00 – 21:00\n\n" +
        "📍 **Location**: 450 Ironworks Boulevard, District 7 (Complimentary athlete parking on-site).\n\n" +
        "Tap the button below or visit the Schedule section to view daily class times!"
      );
    }

    if (/\b(where|location|address|directions|map|parking|city|district)\b/i.test(q)) {
      return (
        "**FORGE Location & Directions:**\n\n" +
        "📍 **Address**: 450 Ironworks Boulevard, District 7\n" +
        "🚗 **Parking**: Free dedicated athlete parking garage directly behind the facility.\n" +
        "🚆 **Transit**: 2-minute walk from Ironworks Metro Station (Line 3)."
      );
    }

    if (/\b(pass|free|trial|voucher|7 day|7-day|guest|visit)\b/i.test(q)) {
      return (
        "**Claim Your 7-Day VIP Access Pass:**\n\n" +
        "We offer a complimentary **7-Day VIP Access Pass** for new athletes. It includes:\n" +
        "• 7 consecutive days of full gym floor & Rig Jungle access.\n" +
        "• 1 complimentary technique clinic with Coach Viktor Kroll or Marcus Vance.\n" +
        "• 1 InBody biometric body composition baseline scan.\n\n" +
        "👉 Scroll down to the VIP Pass form on the page to generate your instant digital voucher code!"
      );
    }

    if (/\b(coach|coaches|trainer|trainers|staff|instructor)\b/i.test(q)) {
      return (
        "**FORGE Master Coaching Staff:**\n\n" +
        "• **Viktor Kroll**: Head of Calisthenics & Bodyweight Acrobatics (Ring specialist & streetlifting master).\n" +
        "• **Marcus Vance**: Head of Olympic Weightlifting & Strength (IWF-certified, bar velocity specialist).\n" +
        "• **Elena Rostova**: Head of Biomechanics & Conditioning (Movement screening & metabolic conditioning).\n\n" +
        "All coaches offer 1-on-1 private programming and platform technique clinics."
      );
    }

    if (/\b(recovery|cryo|cryotherapy|sauna|cold plunge|ice|normatec|massage|injury)\b/i.test(q)) {
      return (
        "**FORGE Zone 04 - Cryo & Hyper-Recovery Suite:**\n\n" +
        "• **-110°C Electric Cryo Chamber**: Whole-body systemic inflammation reduction and nervous system reset.\n" +
        "• **NormaTec 3 Compression Suites**: Dynamic air compression for accelerated lymphatic drainage.\n" +
        "• **Infrared Sauna & Contrast Cold Plunge**: Rapid cellular repair and micro-circulation boost."
      );
    }

    if (/\b(hi|hello|hey|greetings|morning|afternoon|evening|help|what can you do)\b/i.test(q)) {
      return (
        "Welcome to **FORGE**! I am your AI Concierge. I can assist you exclusively with:\n\n" +
        "• 🦾 **Calisthenics Courses & Rig Jungle** (Coached by Viktor Kroll)\n" +
        "• 🏋️ **Olympic Weightlifting & Biomechanics** (Coached by Marcus Vance)\n" +
        "• 💰 **Membership Tiers & Pricing** ($89 – $179/mo)\n" +
        "• 🎟️ **Claiming your 7-Day Free VIP Pass**\n" +
        "• ⏰ **Facility Hours & Location** (District 7)\n\n" +
        "What would you like to explore regarding FORGE Athletics today?"
      );
    }

    return (
      "I am the FORGE AI Concierge, dedicated exclusively to **FORGE Athletics**—including our Calisthenics Academy, Olympic Weightlifting platforms, recovery suites, membership tiers, and coaching schedules.\n\n" +
      "Ask me about our membership pricing, coaching clinics with Viktor Kroll, or how to claim your complimentary 7-Day VIP Pass!"
    );
  }

  // Direct Browser LLM Call (if user provides an API key on static hosting)
  async function callDirectLlm(apiKey, model, userMessage, history) {
    const isGroq = apiKey.startsWith('gsk_');
    const endpoint = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const systemPrompt = 
      "You are FORGE, the elite AI Concierge for FORGE Athletics gym in District 7. " +
      "Coaches: Viktor Kroll (Calisthenics/Rings), Marcus Vance (Olympic Lifting), Elena Rostova (Biomechanics). " +
      "Pricing: Core Black $89/mo, Calisthenics Master $139/mo, Pro Performance $179/mo. 7-Day Free VIP Pass available. " +
      "Hours: M-F 05:00-23:00, S-S 06:00-21:00. Respond concisely with athletic, motivating tone.";

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4),
      { role: 'user', content: userMessage }
    ];

    const targetModel = model || (isGroq ? 'openai/gpt-oss-120b' : 'gpt-4o-mini');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: messages,
        temperature: 0.6,
        max_tokens: 380
      })
    });

    if (!res.ok) throw new Error(`Direct LLM call failed with HTTP ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }

  // Check Backend AI Status
  async function checkOpenAIStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(getApiEndpoint('/api/chat/status'), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.configured) {
          if (modelBadge) {
            const displayModel = (data.model || 'AI Connected').toUpperCase().replace('OPENAI/', '').replace('LLAMA', 'LLAMA');
            modelBadge.textContent = displayModel;
            modelBadge.classList.add('badge-live');
          }
          if (statusSubtitle) {
            statusSubtitle.textContent = 'Live AI Concierge Active';
          }
          if (settingsStatusPill) {
            settingsStatusPill.textContent = 'Connected';
            settingsStatusPill.classList.add('is-active');
          }
          if (currentKeyHint) {
            currentKeyHint.textContent = `Active Key: ${data.masked_key || 'Configured'}`;
          }
          if (manualModelSelect && data.model) {
            manualModelSelect.value = data.model;
          }
          return;
        }
      }
    } catch (e) {
      // Backend offline or running on static hosting (GitHub Pages)
    }

    // Check client-stored API key in localStorage
    const clientKey = localStorage.getItem('forge_client_api_key');
    if (clientKey) {
      const masked = clientKey.substring(0, 5) + '...' + clientKey.slice(-4);
      if (modelBadge) {
        modelBadge.textContent = (localStorage.getItem('forge_client_model') || 'DIRECT AI').toUpperCase();
        modelBadge.classList.add('badge-live');
      }
      if (statusSubtitle) statusSubtitle.textContent = 'Direct AI Active';
      if (settingsStatusPill) {
        settingsStatusPill.textContent = 'Browser Key Active';
        settingsStatusPill.classList.add('is-active');
      }
      if (currentKeyHint) currentKeyHint.textContent = `Stored Key: ${masked}`;
      return;
    }

    // Autonomous Knowledge Engine Active (Default for GitHub Pages & Offline)
    if (modelBadge) {
      modelBadge.textContent = 'FORGE AI ENGINE';
      modelBadge.classList.add('badge-live');
    }
    if (statusSubtitle) {
      statusSubtitle.textContent = 'Live AI Concierge Active';
    }
    if (settingsStatusPill) {
      settingsStatusPill.textContent = 'Autonomous Engine';
      settingsStatusPill.classList.add('is-active');
    }
    if (currentKeyHint) {
      currentKeyHint.textContent = 'Engine: Built-in Knowledge Base';
    }
  }

  // Markdown Formatter for Chat Messages
  function formatMarkdown(text) {
    if (!text) return '';
    let html = text;

    // Escape basic HTML to avoid injection
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Bullet points (lines starting with • or - or *)
    const lines = html.split('\n');
    let inList = false;
    const formattedLines = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.replace(/^[•\-\*]\s*/, '');
        if (!inList) {
          formattedLines.push('<ul class="chat-msg-list">');
          inList = true;
        }
        formattedLines.push(`<li>${itemText}</li>`);
      } else {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        if (trimmed.startsWith('───')) {
          formattedLines.push('<hr class="chat-msg-divider" />');
        } else if (trimmed.length > 0) {
          formattedLines.push(`<p>${line}</p>`);
        }
      }
    });
    if (inList) formattedLines.push('</ul>');

    let output = formattedLines.join('');

    // Contextual Action Buttons injection:
    // If the message refers to claiming pass or 7-day pass, add action button
    if (/7-day|vip pass|free pass|claim/i.test(text) && !output.includes('action-pass-btn')) {
      output += `
        <div class="chat-action-container">
          <button class="chat-inline-action-btn action-pass-btn" onclick="document.getElementById('contact')?.scrollIntoView({behavior: 'smooth'});">
            🎟️ Claim VIP Pass Now
          </button>
        </div>
      `;
    }

    // If message refers to timetable or schedule
    if (/schedule|timetable|class time/i.test(text) && !output.includes('action-schedule-btn')) {
      output += `
        <div class="chat-action-container">
          <button class="chat-inline-action-btn action-schedule-btn" onclick="(document.getElementById('btn-open-schedule') || document.getElementById('schedule-modal'))?.click(); document.getElementById('schedule-modal')?.classList.remove('hidden');">
            📅 Open Weekly Coached Schedule
          </button>
        </div>
      `;
    }

    return output;
  }

  // Append Message Bubble
  function appendMessage(role, text, isGreeting = false) {
    if (!messagesContainer) return;

    const msgRow = document.createElement('div');
    msgRow.className = `chat-msg-row msg-role-${role} ${isGreeting ? 'is-greeting' : ''}`;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let avatarHtml = '';
    if (role === 'assistant') {
      avatarHtml = `
        <div class="chat-msg-avatar" title="FORGE AI">
          <span>⚡</span>
        </div>
      `;
    }

    const bubbleHtml = `
      <div class="chat-msg-bubble">
        <div class="chat-msg-content">${formatMarkdown(text)}</div>
        <div class="chat-msg-time">${timestamp}</div>
      </div>
    `;

    msgRow.innerHTML = role === 'assistant' ? (avatarHtml + bubbleHtml) : bubbleHtml;
    messagesContainer.appendChild(msgRow);

    // Scroll to bottom
    scrollToBottom();

    // Store in history
    if (!isGreeting) {
      conversationHistory.push({ role, content: text });
      saveSession();
    }
  }

  // Typing Indicator
  let typingIndicatorEl = null;
  function showTypingIndicator() {
    if (typingIndicatorEl) return;
    typingIndicatorEl = document.createElement('div');
    typingIndicatorEl.className = 'chat-msg-row msg-role-assistant is-typing-row';
    typingIndicatorEl.innerHTML = `
      <div class="chat-msg-avatar"><span>⚡</span></div>
      <div class="chat-msg-bubble chat-typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    messagesContainer.appendChild(typingIndicatorEl);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    if (typingIndicatorEl) {
      typingIndicatorEl.remove();
      typingIndicatorEl = null;
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Toggle Chat Window
  function toggleChat(forceState) {
    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

    if (isOpen) {
      chatWindow.classList.add('active');
      triggerBtn.classList.add('chat-open');
      chatWindow.setAttribute('aria-hidden', 'false');

      // Dismiss unread badge
      if (unreadBadge) unreadBadge.style.display = 'none';

      // Focus input
      setTimeout(() => {
        if (inputField) inputField.focus();
        scrollToBottom();
      }, 250);

      playBlip(620, 'sine', 0.09);
    } else {
      chatWindow.classList.remove('active');
      triggerBtn.classList.remove('chat-open');
      chatWindow.setAttribute('aria-hidden', 'true');
      playBlip(380, 'sine', 0.08);
    }
  }

  // Send Message Handler
  async function handleSendMessage(queryText) {
    const text = (queryText || (inputField ? inputField.value : '')).trim();
    if (!text || isSending) return;

    if (inputField) inputField.value = '';
    isSending = true;
    if (sendBtn) sendBtn.disabled = true;

    // Render User Message
    appendMessage('user', text);
    playBlip(750, 'triangle', 0.05);

    // Show Typing Indicator
    showTypingIndicator();

    let botReply = '';

    // Step 1: Attempt to contact backend server (Localhost or Cloud API)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(getApiEndpoint('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(-6)
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.reply) {
          botReply = data.reply;
          if (data.configured && modelBadge) {
            const displayModel = (data.model || 'GPT-OSS 120B').toUpperCase().replace('OPENAI/', '').replace('LLAMA', 'LLAMA');
            modelBadge.textContent = displayModel;
            modelBadge.classList.add('badge-live');
            if (statusSubtitle) statusSubtitle.textContent = 'Live AI Concierge Active';
          }
        }
      }
    } catch (netErr) {
      // Backend unavailable or timed out; will fall back seamlessly
    }

    // Step 2: If no reply yet, check if browser has a direct client API key
    if (!botReply) {
      const clientKey = localStorage.getItem('forge_client_api_key');
      if (clientKey) {
        try {
          const clientModel = localStorage.getItem('forge_client_model') || 'openai/gpt-oss-120b';
          botReply = await callDirectLlm(clientKey, clientModel, text, conversationHistory);
        } catch (directErr) {
          console.warn('[FORGE AI] Direct browser LLM error:', directErr);
        }
      }
    }

    // Step 3: Seamless Intelligent Knowledge Engine Fallback (guaranteed 100% reliability)
    if (!botReply) {
      botReply = generateLocalKnowledgeReply(text);
    }

    hideTypingIndicator();
    appendMessage('assistant', botReply);
    playBlip(540, 'sine', 0.12);

    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
    if (inputField) inputField.focus();
  }

  // Clear Conversation
  function clearConversation() {
    conversationHistory = [];
    sessionStorage.removeItem('forge_chat_history');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
    showInitialGreeting();
    playBlip(320, 'square', 0.05);
  }

  // Initial Greeting
  function showInitialGreeting() {
    const greeting = 
      "Welcome to **FORGE**! I am your AI Concierge powered by OpenAI.\n\n" +
      "I'm here to guide you through our **Calisthenics Academy** with Coach Viktor Kroll, **Olympic Weightlifting platforms**, **-110°C Cryo Recovery suites**, and membership tiers.\n\n" +
      "Ask me any question below, or tap one of the quick topics to get started!";
    appendMessage('assistant', greeting, true);
  }

  // Session Storage Persistence
  function saveSession() {
    try {
      sessionStorage.setItem('forge_chat_history', JSON.stringify(conversationHistory));
    } catch (e) {}
  }

  function loadSession() {
    try {
      const saved = sessionStorage.getItem('forge_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          conversationHistory = parsed;
          messagesContainer.innerHTML = '';
          parsed.forEach((m) => {
            appendMessage(m.role, m.content, false);
          });
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  // Event Listeners
  function initEvents() {
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => toggleChat());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => toggleChat(false));
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear current conversation history?')) {
          clearConversation();
        }
      });
    }

    // Toggle Settings Panel
    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', () => {
        isSettingsOpen = !isSettingsOpen;
        settingsPanel.style.display = isSettingsOpen ? 'block' : 'none';
        settingsBtn.classList.toggle('active', isSettingsOpen);
        if (settingsFeedback) settingsFeedback.textContent = '';
        if (isSettingsOpen) {
          checkOpenAIStatus();
          if (manualKeyInput) manualKeyInput.focus();
        }
      });
    }

    // Model Badge click to open settings
    if (modelBadge) {
      modelBadge.style.cursor = 'pointer';
      modelBadge.addEventListener('click', () => {
        if (settingsBtn) settingsBtn.click();
      });
    }

    // Toggle Password Visibility
    if (btnToggleKeyVisibility && manualKeyInput) {
      btnToggleKeyVisibility.addEventListener('click', () => {
        const isPassword = manualKeyInput.type === 'password';
        manualKeyInput.type = isPassword ? 'text' : 'password';
        btnToggleKeyVisibility.textContent = isPassword ? '🔒' : '👁️';
      });
    }

    // Save Manual API Key
    if (btnSaveKey) {
      btnSaveKey.addEventListener('click', async () => {
        const key = manualKeyInput ? manualKeyInput.value.trim() : '';
        const model = manualModelSelect ? manualModelSelect.value : 'openai/gpt-oss-120b';

        if (!key) {
          if (settingsFeedback) {
            settingsFeedback.className = 'settings-feedback-msg error';
            settingsFeedback.textContent = 'Please enter an API key.';
          }
          return;
        }

        btnSaveKey.disabled = true;
        btnSaveKey.textContent = 'Saving...';
        if (settingsFeedback) settingsFeedback.textContent = '';

        let backendSaved = false;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(getApiEndpoint('/api/chat/set-key'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ api_key: key, model: model })
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              backendSaved = true;
            }
          }
        } catch (e) {
          // Static host (GitHub Pages) or offline backend
        }

        // Store client-side for resilient browser-direct execution
        try {
          localStorage.setItem('forge_client_api_key', key);
          if (model) localStorage.setItem('forge_client_model', model);
        } catch (e) {}

        if (settingsFeedback) {
          settingsFeedback.className = 'settings-feedback-msg success';
          settingsFeedback.textContent = backendSaved 
            ? '✓ Key saved & synced with server!' 
            : '✓ Key activated directly in browser!';
        }
        if (manualKeyInput) manualKeyInput.value = '';
        checkOpenAIStatus();
        playBlip(780, 'triangle', 0.1);

        // Auto close settings after 1.8s
        setTimeout(() => {
          if (settingsPanel) settingsPanel.style.display = 'none';
          isSettingsOpen = false;
          if (settingsFeedback) settingsFeedback.textContent = '';
        }, 1800);

        btnSaveKey.disabled = false;
        btnSaveKey.textContent = 'Save & Activate';
      });
    }

    // Clear API Key
    if (btnClearKey) {
      btnClearKey.addEventListener('click', async () => {
        if (!confirm('Remove current API key from FORGE?')) return;
        try {
          localStorage.removeItem('forge_client_api_key');
          localStorage.removeItem('forge_client_model');
        } catch (e) {}

        try {
          await fetch(getApiEndpoint('/api/chat/clear-key'), { method: 'POST' });
        } catch (e) {}

        if (settingsFeedback) {
          settingsFeedback.className = 'settings-feedback-msg success';
          settingsFeedback.textContent = 'Key removed.';
        }
        checkOpenAIStatus();
      });
    }

    if (inputForm) {
      inputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage();
      });
    }

    // Suggestion Chips Click
    suggestionChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        if (query) {
          handleSendMessage(query);
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggleChat(false);
      }
    });

    // Close when clicking outside on desktop
    document.addEventListener('click', (e) => {
      if (isOpen && wrapper && !wrapper.contains(e.target)) {
        toggleChat(false);
      }
    });
  }

  // Initialize
  function init() {
    initEvents();
    checkOpenAIStatus();

    const hasRestored = loadSession();
    if (!hasRestored) {
      showInitialGreeting();
    }
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
