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

  // Check Backend AI Status
  async function checkOpenAIStatus() {
    try {
      const res = await fetch('/api/chat/status');
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
        } else {
          if (modelBadge) {
            modelBadge.textContent = 'Setup Mode';
            modelBadge.classList.remove('badge-live');
          }
          if (statusSubtitle) {
            statusSubtitle.textContent = 'Click ⚙️ to add your API Key';
          }
          if (settingsStatusPill) {
            settingsStatusPill.textContent = 'Not Configured';
            settingsStatusPill.classList.remove('is-active');
          }
          if (currentKeyHint) {
            currentKeyHint.textContent = 'Current: No key stored';
          }
        }
      }
    } catch (e) {
      console.warn('[FORGE AI] Status check offline:', e);
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(-6)
        })
      });

      hideTypingIndicator();

      if (response.ok) {
        const data = await response.json();
        const botReply = data.reply || "I'm here to help. What would you like to know about FORGE?";
        appendMessage('assistant', botReply);
        playBlip(540, 'sine', 0.12);

        // Update badge if model changed or configured
        if (data.configured && modelBadge) {
          modelBadge.textContent = (data.model || 'GPT-4o Mini').toUpperCase();
          modelBadge.classList.add('badge-live');
          if (statusSubtitle) statusSubtitle.textContent = 'Live GPT-4 Assistant Connected';
        }
      } else {
        appendMessage('assistant', "⚠️ Could not connect to the FORGE AI service. Please make sure the server is running on `http://localhost:8080`.");
      }
    } catch (err) {
      hideTypingIndicator();
      console.error('[FORGE AI] Error:', err);
      appendMessage('assistant', "⚠️ Network connection issue. Please check your connection and try again.");
    } finally {
      isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      if (inputField) inputField.focus();
    }
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

        try {
          const res = await fetch('/api/chat/set-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key, model: model })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            if (settingsFeedback) {
              settingsFeedback.className = 'settings-feedback-msg success';
              settingsFeedback.textContent = '✓ ' + (data.message || 'Key saved successfully!');
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
          } else {
            if (settingsFeedback) {
              settingsFeedback.className = 'settings-feedback-msg error';
              settingsFeedback.textContent = data.error || 'Failed to save key.';
            }
          }
        } catch (e) {
          if (settingsFeedback) {
            settingsFeedback.className = 'settings-feedback-msg error';
            settingsFeedback.textContent = 'Network error saving key.';
          }
        } finally {
          btnSaveKey.disabled = false;
          btnSaveKey.textContent = 'Save & Activate';
        }
      });
    }

    // Clear API Key
    if (btnClearKey) {
      btnClearKey.addEventListener('click', async () => {
        if (!confirm('Remove current API key from FORGE?')) return;
        try {
          const res = await fetch('/api/chat/clear-key', { method: 'POST' });
          if (res.ok) {
            if (settingsFeedback) {
              settingsFeedback.className = 'settings-feedback-msg success';
              settingsFeedback.textContent = 'Key removed.';
            }
            checkOpenAIStatus();
          }
        } catch (e) {
          console.error(e);
        }
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
