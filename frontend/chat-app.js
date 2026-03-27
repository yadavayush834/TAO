/**
 * Chat App — Frontend logic for the Ollama Judge Chat
 *
 * Handles:
 * - Sending messages to /chat endpoint
 * - Rendering chat messages with typing indicators
 * - Displaying judge verdicts in the sidebar
 * - Animating the pipeline flow diagram
 * - Ollama connectivity checks
 */

const API_BASE = window.location.origin;

// ─── DOM ────────────────────────────────────────────────────
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const ollamaStatus = document.getElementById('ollama-status');
const ollamaStatusText = document.getElementById('ollama-status-text');

// Config
const cfgModel = document.getElementById('cfg-model');
const cfgRetries = document.getElementById('cfg-retries');

// Verdict panel
const verdictCard = document.getElementById('verdict-card');
const verdictBadge = document.getElementById('verdict-badge');
const verdictBody = document.getElementById('verdict-body');

// Metrics
const metricLatency = document.getElementById('metric-latency');
const metricTokens = document.getElementById('metric-tokens');
const metricAttempts = document.getElementById('metric-attempts');

// Flow diagram steps
const flowSteps = {
  input: document.getElementById('flow-input'),
  risk: document.getElementById('flow-risk'),
  generate: document.getElementById('flow-generate'),
  judge: document.getElementById('flow-judge'),
  refine: document.getElementById('flow-refine'),
  output: document.getElementById('flow-output'),
};

// Quick prompts
document.querySelectorAll('.quick-prompt').forEach(btn => {
  btn.addEventListener('click', () => {
    chatInput.value = btn.dataset.query;
    chatInput.focus();
  });
});

// ─── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkOllama();
  loadConfig();
  setupListeners();
});

function setupListeners() {
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ─── Ollama Health Check ────────────────────────────────────
async function checkOllama() {
  try {
    const res = await fetch(`${API_BASE}/chat/health`);
    const data = await res.json();

    if (data.status === 'healthy') {
      ollamaStatus.className = 'ollama-status connected';
      const modelOk = data.generator_available ? '✓' : '✗';
      ollamaStatusText.textContent = `Ollama ${modelOk} ${data.generator_model}`;
    } else {
      ollamaStatus.className = 'ollama-status disconnected';
      ollamaStatusText.textContent = data.error || 'Ollama offline';
    }
  } catch {
    ollamaStatus.className = 'ollama-status disconnected';
    ollamaStatusText.textContent = 'Server offline';
  }
}

async function loadConfig() {
  try {
    const res = await fetch(`${API_BASE}/chat/config`);
    const data = await res.json();
    cfgModel.textContent = data.generator_model || '—';
    cfgRetries.textContent = data.max_retries || '2';
  } catch {
    cfgModel.textContent = '—';
  }
}

// ─── Send Message ───────────────────────────────────────────
let isSending = false;

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message || isSending) return;

  isSending = true;
  sendBtn.disabled = true;
  chatInput.value = '';

  // Add user message
  addMessage(message, 'user');

  // Show typing indicator
  const typingEl = addTypingIndicator();

  // Animate flow
  resetFlow();
  setFlowStep('input', 'done');
  setFlowStep('risk', 'active');

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();

    // Remove typing indicator
    typingEl.remove();

    // Animate flow completion
    animateFlowForResult(data);

    // Add assistant message
    addMessage(data.response, 'assistant', data.risk);

    // Update sidebar
    updateVerdict(data);
    updateMetrics(data);

  } catch (err) {
    typingEl.remove();
    addMessage(`⚠️ Error: ${err.message}`, 'system-msg');
    resetFlow();
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ─── Message Rendering ──────────────────────────────────────
function addMessage(content, type, risk) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${type}`;

  let meta = '';
  if (type === 'user') {
    meta = '<div class="msg-meta">You</div>';
  } else if (type === 'assistant') {
    const riskBadge = risk
      ? `<span class="risk-badge risk-${risk.level}">${risk.level.toUpperCase()}</span>`
      : '';
    meta = `<div class="msg-meta">Assistant ${riskBadge}</div>`;
  }

  msg.innerHTML = meta + escapeHtml(content);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}

function addTypingIndicator() {
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

// ─── Flow Diagram ───────────────────────────────────────────
function resetFlow() {
  Object.values(flowSteps).forEach(el => {
    el.classList.remove('active', 'done');
  });
}

function setFlowStep(step, state) {
  const el = flowSteps[step];
  if (!el) return;
  el.classList.remove('active', 'done');
  el.classList.add(state);
}

function animateFlowForResult(data) {
  setFlowStep('input', 'done');
  setFlowStep('risk', 'done');
  setFlowStep('generate', 'done');
  setFlowStep('judge', 'done');

  // If there were retries, show refine as done
  if (data.attempts && data.attempts.length > 1) {
    setFlowStep('refine', 'done');
  }

  setFlowStep('output', 'done');
}

// ─── Verdict Sidebar ────────────────────────────────────────
function updateVerdict(data) {
  const { attempts, risk, final_decision } = data;

  // Update card border
  verdictCard.className = `judge-card ${final_decision === 'approve' ? 'approved' : 'rejected'}`;

  // Badge
  verdictBadge.style.display = 'inline';
  verdictBadge.className = `decision-badge decision-${final_decision}`;
  verdictBadge.textContent = final_decision === 'approve' ? '✓ Approved' : '✗ Rejected';

  // Build attempt list
  let html = '';

  // Risk classification
  html += `
    <div style="margin-bottom: 12px;">
      <span class="risk-badge risk-${risk.level}">${risk.level.toUpperCase()} — ${risk.domain}</span>
      <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${escapeHtml(risk.reasoning)}</div>
    </div>
  `;

  // Attempts
  html += '<div class="attempt-list">';
  for (const step of attempts) {
    const isApproved = step.judge_verdict.decision === 'approve';
    const cls = isApproved ? 'approved' : 'rejected';
    const badge = isApproved ? '✓ Approved' : '✗ Rejected';
    const badgeCls = isApproved ? 'decision-approve' : 'decision-reject';

    html += `
      <div class="attempt-step ${cls}">
        <div class="attempt-header">
          <span>Attempt ${step.attempt}</span>
          <span class="decision-badge ${badgeCls}">${badge}</span>
        </div>
        <div class="attempt-reason">${escapeHtml(step.judge_verdict.reason)}</div>
        ${step.judge_verdict.fix ? `<div style="margin-top: 6px; font-size: 11px; color: var(--accent-blue);">💡 Fix: ${escapeHtml(step.judge_verdict.fix).substring(0, 200)}${step.judge_verdict.fix.length > 200 ? '...' : ''}</div>` : ''}
      </div>
    `;
  }
  html += '</div>';

  verdictBody.innerHTML = html;
}

function updateMetrics(data) {
  metricLatency.textContent = data.total_latency_ms
    ? `${(data.total_latency_ms / 1000).toFixed(1)}s`
    : '—';
  metricTokens.textContent = data.total_tokens
    ? data.total_tokens.toLocaleString()
    : '—';
  metricAttempts.textContent = data.attempts
    ? data.attempts.length
    : '—';
}

// ─── Utilities ──────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
