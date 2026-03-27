/**
 * TAO Dashboard — Main Application Logic
 *
 * Manages:
 * - API communication (REST + WebSocket)
 * - Pipeline state and visualization
 * - Panel rendering for all tiers
 * - Real-time event streaming
 */

// ─── Configuration ──────────────────────────────────────────
const API_BASE = window.location.origin;
const WS_BASE = `ws://${window.location.host}`;

// ─── State ──────────────────────────────────────────────────
let isAnalyzing = false;
let currentResult = null;
let ws = null;

// ─── DOM References ─────────────────────────────────────────
const queryInput = document.getElementById('query-input');
const analyzeBtn = document.getElementById('analyze-btn');
const tierSelect = document.getElementById('tier-select');
const presets = document.getElementById('presets');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');

// Pipeline nodes
const nodeRouter = document.getElementById('node-router');
const nodeTier1 = document.getElementById('node-tier1');
const nodeTier2 = document.getElementById('node-tier2');
const nodeTier3 = document.getElementById('node-tier3');
const nodeOutput = document.getElementById('node-output');
const connectors = [
  document.getElementById('connector-0'),
  document.getElementById('connector-1'),
  document.getElementById('connector-2'),
  document.getElementById('connector-3'),
];

// Panel bodies
const responseBody = document.getElementById('response-body');
const tier1Body = document.getElementById('tier1-body');
const tier2Body = document.getElementById('tier2-body');
const tier3Body = document.getElementById('tier3-body');
const metricsBody = document.getElementById('metrics-body');

// Badges
const badgeResponse = document.getElementById('badge-response');
const badgeTier1 = document.getElementById('badge-tier1');
const badgeTier2 = document.getElementById('badge-tier2');
const badgeTier3 = document.getElementById('badge-tier3');
const badgeMetrics = document.getElementById('badge-metrics');

// ─── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkConfig();
  setupEventListeners();
});

async function checkConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    const config = await res.json();
    if (config.simulation_mode) {
      statusBadge.className = 'status-badge simulation';
      statusText.textContent = 'Simulation';
    } else {
      statusBadge.className = 'status-badge live';
      statusText.textContent = 'Live';
    }
  } catch (e) {
    statusText.textContent = 'Offline';
  }
}

function setupEventListeners() {
  analyzeBtn.addEventListener('click', () => analyzeQuery());

  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeQuery();
    }
  });

  presets.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (btn) {
      queryInput.value = btn.dataset.query;
      queryInput.focus();
    }
  });
}

// ─── Analysis ───────────────────────────────────────────────
async function analyzeQuery() {
  const query = queryInput.value.trim();
  if (!query || isAnalyzing) return;

  isAnalyzing = true;
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';

  resetPipeline();

  const forceT = tierSelect.value;
  const body = {
    query,
    force_tier: forceT === 'auto' ? null : parseInt(forceT),
  };

  try {
    // Try WebSocket first for real-time streaming
    const wsOk = await analyzeViaWebSocket(body);
    if (!wsOk) {
      // Fallback to REST
      await analyzeViaREST(body);
    }
  } catch (err) {
    console.error('Analysis error:', err);
    showError('Analysis failed. Check that the server is running.');
  } finally {
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '🔍 Analyze';
  }
}

async function analyzeViaWebSocket(body) {
  return new Promise((resolve) => {
    try {
      ws = new WebSocket(`${WS_BASE}/ws/pipeline`);
      let resolved = false;

      ws.onopen = () => {
        ws.send(JSON.stringify(body));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event_type === 'final_result') {
          currentResult = data.data;
          renderFullResult(currentResult);
          if (!resolved) { resolved = true; resolve(true); }
          ws.close();
        } else {
          handlePipelineEvent(data);
        }
      };

      ws.onerror = () => {
        if (!resolved) { resolved = true; resolve(false); }
      };

      ws.onclose = () => {
        if (!resolved) { resolved = true; resolve(false); }
      };

      // Timeout fallback
      setTimeout(() => {
        if (!resolved) { resolved = true; resolve(false); ws.close(); }
      }, 30000);
    } catch {
      resolve(false);
    }
  });
}

async function analyzeViaREST(body) {
  // Show routing animation
  setNodeState(nodeRouter, 'active');

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  currentResult = await res.json();
  renderFullResult(currentResult);
}

// ─── Pipeline Event Handling ──────────────────────────────
function handlePipelineEvent(event) {
  const { event_type, tier, data } = event;

  switch (event_type) {
    case 'routing':
      setNodeState(nodeRouter, 'active');
      setBadge(badgeResponse, 'active', 'Routing');
      break;

    case 'routing_complete':
      setNodeState(nodeRouter, 'completed');
      setConnectorActive(0);
      renderRouting(data);
      break;

    case 'tier1_start':
      setNodeState(nodeTier1, 'active');
      setBadge(badgeTier1, 'active', 'Processing');
      break;

    case 'tier1_complete':
      setNodeState(nodeTier1, data.passed ? 'completed' : 'flagged');
      setConnectorActive(1);
      setBadge(badgeTier1, data.passed ? 'passed' : 'flagged', data.passed ? 'Passed' : 'Flagged');
      break;

    case 'tier2_start':
      setNodeState(nodeTier2, 'active');
      setBadge(badgeTier2, 'active', 'Debating');
      break;

    case 'tier2_complete':
      const t2class = data.verdict === 'prover_wins' ? 'completed' : 'flagged';
      setNodeState(nodeTier2, t2class);
      setConnectorActive(2);
      setBadge(badgeTier2, t2class === 'completed' ? 'passed' : 'flagged',
        data.verdict.replace('_', ' '));
      break;

    case 'tier3_start':
      setNodeState(nodeTier3, 'active');
      setBadge(badgeTier3, 'active', 'Scanning');
      break;

    case 'tier3_complete':
      setNodeState(nodeTier3, data.alert_triggered ? 'flagged' : 'completed');
      setConnectorActive(3);
      setBadge(badgeTier3, data.alert_triggered ? 'flagged' : 'passed',
        data.alert_triggered ? 'Alert' : 'Clear');
      break;

    case 'pipeline_complete':
      setNodeState(nodeOutput, 'completed');
      break;
  }
}

// ─── Rendering ──────────────────────────────────────────────
function renderFullResult(result) {
  // Finalize pipeline visualization
  const maxTier = result.routing.tier;
  setNodeState(nodeRouter, 'completed');
  setConnectorActive(0);

  if (maxTier >= 0) {
    setNodeState(nodeTier1, 'completed');
    if (result.tier1_result && !result.tier1_result.passed) {
      setNodeState(nodeTier1, 'flagged');
    }
  } else {
    setNodeState(nodeTier1, 'skipped');
  }

  if (maxTier >= 2) {
    setConnectorActive(1);
    setNodeState(nodeTier2, 'completed');
    setConnectorActive(2);
    setNodeState(nodeTier3, result.tier3_result?.stego_analysis?.alert_triggered ? 'flagged' : 'completed');
    setConnectorActive(3);
  } else {
    setNodeState(nodeTier2, 'skipped');
    setNodeState(nodeTier3, 'skipped');
    if (maxTier >= 1) {
      setConnectorActive(1);
    }
  }

  setNodeState(nodeOutput, 'completed');
  if (maxTier < 2) setConnectorActive(connectors.length - 1 > maxTier ? maxTier + 1 : maxTier);

  // Render panels
  renderRouting(result.routing);
  renderResponse(result);
  renderTier1(result.tier1_result);
  renderTier2(result.tier2_result);
  renderTier3(result.tier3_result);
  renderMetrics(result.metrics, result.routing);
}

function renderRouting(routing) {
  const tierClass = `routing-tier-${routing.tier}`;
  const tierLabel = `Tier ${routing.tier}`;
  const riskPercent = Math.round((routing.risk_score || 0) * 100);

  setBadge(badgeResponse, 'passed', tierLabel);

  // Prepend routing info to response panel
  const existing = responseBody.querySelector('.routing-info');
  if (existing) existing.remove();

  const routingEl = document.createElement('div');
  routingEl.className = 'routing-info animate-in';
  routingEl.innerHTML = `
    <span class="routing-tier ${tierClass}">${tierLabel}</span>
    <span class="routing-details">
      Risk: <span class="routing-score">${riskPercent}%</span> · 
      Domain: <strong>${routing.domain || 'general'}</strong> · 
      ${routing.reasoning || ''}
    </span>
  `;

  responseBody.prepend(routingEl);
}

function renderResponse(result) {
  // Remove old response content (keep routing info)
  const oldRes = responseBody.querySelector('.response-content');
  if (oldRes) oldRes.remove();
  const oldData = responseBody.querySelector('.no-data');
  if (oldData) oldData.remove();

  const el = document.createElement('div');
  el.className = 'response-content animate-in';
  el.textContent = result.final_response || '(No response generated)';
  responseBody.appendChild(el);
}

function renderTier1(tier1) {
  if (!tier1) {
    setBadge(badgeTier1, 'idle', 'Skipped');
    return;
  }

  const passed = tier1.passed;
  setBadge(badgeTier1, passed ? 'passed' : 'flagged', passed ? 'Passed' : 'Flagged');

  let html = '';

  // CoT Steps
  if (tier1.generation?.cot_steps?.length) {
    html += '<div class="cot-steps animate-in">';
    for (const step of tier1.generation.cot_steps) {
      const scoreClass = step.safety_score >= 0.95 ? 'score-safe' :
                         step.safety_score >= 0.7 ? 'score-warning' : 'score-danger';
      const flagClass = step.flagged ? ' flagged' : '';
      html += `
        <div class="cot-step${flagClass}">
          <span class="cot-step-index">${step.index + 1}</span>
          <span class="cot-step-content">${escapeHtml(step.content)}</span>
          <span class="cot-step-score ${scoreClass}">${(step.safety_score * 100).toFixed(0)}%</span>
        </div>
      `;
    }
    html += '</div>';
  }

  // Violations
  if (tier1.violations?.length) {
    html += '<div class="violations-list" style="margin-top: 16px;">';
    for (const v of tier1.violations) {
      const sevClass = `severity-${v.severity}`;
      html += `
        <div class="violation-card animate-slide">
          <div class="violation-header">
            <span class="violation-type">${v.violation_type}</span>
            <span class="violation-severity ${sevClass}">${v.severity}</span>
          </div>
          <div class="violation-explanation">${escapeHtml(v.explanation)}</div>
          <div class="violation-guidance">💡 ${escapeHtml(v.correction_guidance)}</div>
        </div>
      `;
    }
    html += '</div>';
  }

  // Reasoning anomaly
  if (tier1.reasoning_anomaly) {
    html += `
      <div class="violation-card animate-slide" style="margin-top: 12px; border-color: rgba(245, 158, 11, 0.3);">
        <div class="violation-header">
          <span class="violation-type" style="background: rgba(245, 158, 11, 0.15); color: var(--color-warning);">
            REASONING ANOMALY
          </span>
        </div>
        <div class="violation-explanation">
          Disproportionate reasoning effort detected for query complexity.
          The model may be "thinking too hard" — a potential indicator of hidden reasoning.
        </div>
      </div>
    `;
  }

  tier1Body.innerHTML = html || '<div class="no-data"><div class="no-data-text">No findings</div></div>';
}

function renderTier2(tier2) {
  if (!tier2) {
    setBadge(badgeTier2, 'idle', 'Skipped');
    return;
  }

  const verdictClass = `verdict-${tier2.verdict.replace('_', '')}`;
  setBadge(badgeTier2,
    tier2.verdict === 'prover_wins' ? 'passed' : 'flagged',
    tier2.verdict.replace(/_/g, ' ')
  );

  let html = '<div class="debate-rounds animate-in">';

  for (const round of tier2.rounds) {
    const confPercent = Math.round((round.judge_confidence || 0) * 100);
    const confWidth = Math.min(confPercent, 100);

    html += `
      <div class="debate-round">
        <div class="round-header">
          <span>Round ${round.round_number + 1}</span>
          <div class="round-confidence">
            <span>Confidence: ${confPercent}%</span>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${confWidth}%"></div>
            </div>
          </div>
        </div>
        <div class="debate-arguments">
          <div class="debate-argument">
            <div class="argument-role role-prover"><span class="role-dot"></span> Prover</div>
            <div class="argument-content">${escapeHtml(round.prover_argument?.content || '')}</div>
          </div>
          <div class="debate-argument">
            <div class="argument-role role-skeptic"><span class="role-dot"></span> Skeptic</div>
            <div class="argument-content">${escapeHtml(round.skeptic_critique?.content || '')}</div>
          </div>
          <div class="debate-argument">
            <div class="argument-role role-judge"><span class="role-dot"></span> Judge</div>
            <div class="argument-content">${escapeHtml(round.judge_evaluation?.content || '')}</div>
          </div>
        </div>
      </div>
    `;
  }

  html += '</div>';

  // Verdict + Swap Test
  const swapClass = tier2.swap_test_passed ? 'swap-passed' : 'swap-failed';
  const swapText = tier2.swap_test_passed ? '✓ Swap Test Passed' : '✗ Positional Bias Detected';

  html += `
    <div class="debate-verdict animate-in" style="margin-top: 12px; padding: 14px; background: var(--bg-primary); border-radius: var(--radius-sm);">
      <span class="verdict-label ${verdictClass}">
        Verdict: ${tier2.verdict.replace(/_/g, ' ').toUpperCase()}
      </span>
      <span class="swap-test-badge ${swapClass}">${swapText}</span>
    </div>
  `;

  tier2Body.innerHTML = html;
}

function renderTier3(tier3) {
  if (!tier3) {
    setBadge(badgeTier3, 'idle', 'Skipped');
    return;
  }

  const stego = tier3.stego_analysis;
  const klPercent = Math.min(stego.kl_divergence / (stego.threshold_used * 2) * 100, 100);
  const gaugeClass = stego.alert_triggered ? 'gauge-danger' : klPercent > 50 ? 'gauge-warning' : 'gauge-safe';

  setBadge(badgeTier3, stego.alert_triggered ? 'flagged' : 'passed',
    stego.alert_triggered ? 'Alert!' : 'Clear');

  let html = `
    <div class="stego-gauge animate-in ${gaugeClass}">
      <div class="gauge-ring">
        <div class="gauge-inner">
          <div class="gauge-value">${stego.kl_divergence.toFixed(3)}</div>
          <div class="gauge-label">KL Divergence</div>
        </div>
      </div>
      <div style="text-align: center; font-size: 12px; color: var(--text-secondary);">
        Threshold: ${stego.threshold_used} · Perplexity: ${stego.perplexity?.toFixed(1) || 'N/A'}
      </div>
    </div>
  `;

  // Token heatmap
  if (stego.token_analyses?.length) {
    html += '<div style="margin-top: 16px;"><div class="query-label" style="margin-bottom: 8px;">Token Perplexity Heatmap</div>';
    html += '<div class="token-heatmap">';
    for (const t of stego.token_analyses) {
      const intensity = Math.abs(t.kl_contribution);
      const cls = intensity < 0.01 ? 'token-low' : intensity < 0.03 ? 'token-medium' : 'token-high';
      html += `<span class="token-cell ${cls}" title="logprob: ${t.logprob.toFixed(3)}, KL: ${t.kl_contribution.toFixed(4)}">${escapeHtml(t.token)}</span>`;
    }
    html += '</div></div>';
  }

  // Paraphrase comparison
  if (tier3.paraphrased) {
    html += `
      <div style="margin-top: 16px;">
        <div class="query-label" style="margin-bottom: 8px;">🔄 Paraphrase Firewall Applied (Similarity: ${(tier3.semantic_similarity * 100).toFixed(0)}%)</div>
        <div class="paraphrase-comparison">
          <div class="paraphrase-box">
            <div class="paraphrase-label" style="color: var(--color-danger);">Original (Potentially Encoded)</div>
            <div class="paraphrase-text">${escapeHtml(tier3.original_text)}</div>
          </div>
          <div class="paraphrase-box">
            <div class="paraphrase-label" style="color: var(--color-success);">Sanitized Output</div>
            <div class="paraphrase-text">${escapeHtml(tier3.sanitized_text)}</div>
          </div>
        </div>
      </div>
    `;
  }

  tier3Body.innerHTML = html;
}

function renderMetrics(metrics, routing) {
  if (!metrics) return;

  setBadge(badgeMetrics, 'passed', 'Complete');

  const totalLatency = metrics.total_latency_ms?.toFixed(0) || '0';
  const totalTokens = metrics.total_tokens || 0;
  const totalCost = metrics.total_cost_usd?.toFixed(4) || '0.0000';
  const tierExec = metrics.tier_executed ?? routing?.tier ?? 0;

  let html = `
    <div class="metrics-grid animate-in">
      <div class="metric-card">
        <div class="metric-value">${totalLatency}</div>
        <div class="metric-label">Total Latency</div>
        <div class="metric-sub">milliseconds</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatNumber(totalTokens)}</div>
        <div class="metric-label">Total Tokens</div>
        <div class="metric-sub">all tiers combined</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$${totalCost}</div>
        <div class="metric-label">Est. Cost</div>
        <div class="metric-sub">USD (GPT-4o rates)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">T${tierExec}</div>
        <div class="metric-label">Max Tier</div>
        <div class="metric-sub">${tierExec === 0 ? 'pass-through' : tierExec === 1 ? 'constitutional' : 'full debate'}</div>
      </div>
    </div>
  `;

  // Latency waterfall
  const maxLatency = Math.max(
    metrics.routing_latency_ms || 0,
    metrics.tier1_latency_ms || 0,
    metrics.tier2_latency_ms || 0,
    metrics.tier3_latency_ms || 0,
    1
  );

  html += `
    <div class="latency-waterfall">
      <div class="query-label" style="margin: 16px 0 8px;">Latency Waterfall</div>
      ${waterfallRow('Router', metrics.routing_latency_ms, maxLatency, 'router')}
      ${waterfallRow('Tier 1', metrics.tier1_latency_ms, maxLatency, 'tier1')}
      ${waterfallRow('Tier 2', metrics.tier2_latency_ms, maxLatency, 'tier2')}
      ${waterfallRow('Tier 3', metrics.tier3_latency_ms, maxLatency, 'tier3')}
    </div>
  `;

  metricsBody.innerHTML = html;
}

function waterfallRow(label, value, max, cls) {
  const width = max > 0 ? Math.max((value || 0) / max * 100, 2) : 0;
  const display = (value || 0).toFixed(0);
  return `
    <div class="waterfall-row">
      <span class="waterfall-label">${label}</span>
      <div class="waterfall-bar-container">
        <div class="waterfall-bar ${cls}" style="width: ${width}%"></div>
      </div>
      <span class="waterfall-value">${display}ms</span>
    </div>
  `;
}

// ─── Pipeline Visualization Helpers ─────────────────────────
function resetPipeline() {
  [nodeRouter, nodeTier1, nodeTier2, nodeTier3, nodeOutput].forEach(n => {
    n.className = 'pipeline-node';
  });
  connectors.forEach(c => {
    c.className = 'pipeline-connector';
  });

  // Reset badges
  [badgeResponse, badgeTier1, badgeTier2, badgeTier3, badgeMetrics].forEach(b => {
    b.className = 'panel-badge badge-idle';
    b.textContent = 'Idle';
  });
}

function setNodeState(node, state) {
  node.className = `pipeline-node ${state}`;
}

function setConnectorActive(index) {
  if (connectors[index]) {
    connectors[index].className = 'pipeline-connector active';
  }
}

function setBadge(badge, type, text) {
  badge.className = `panel-badge badge-${type}`;
  badge.textContent = text;
}

// ─── Utilities ──────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function showError(message) {
  responseBody.innerHTML = `
    <div class="violation-card animate-in">
      <div class="violation-header">
        <span class="violation-type" style="background: rgba(239, 68, 68, 0.15); color: var(--color-danger);">ERROR</span>
      </div>
      <div class="violation-explanation">${escapeHtml(message)}</div>
    </div>
  `;
}
