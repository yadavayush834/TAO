import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Shield, Swords, Scan, BarChart3 } from 'lucide-react';
import { GlowCard, CardHeader, CardBody } from '../shared/GlowCard';
import { StatusBadge } from '../shared/StatusBadge';

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ─── Empty State ───────────────────────────────────────────
function EmptyState({ icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mb-3">
        <span className="text-xl opacity-40">{icon}</span>
      </div>
      <div className="text-sm font-medium text-text-muted">{title}</div>
      {hint && <div className="text-[11px] text-text-muted/50 mt-1 max-w-[200px]">{hint}</div>}
    </div>
  );
}

// ─── Expandable Card Wrapper ──────────────────────────────
function ExpandableCard({ children, title, icon, badge, glow, accent, delay = 0, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <GlowCard glow={glow} delay={delay}>
      <CardHeader
        icon={icon}
        badge={
          <div className="flex items-center gap-2">
            {badge}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-md hover:bg-bg-elevated transition-colors text-text-muted hover:text-text-primary"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        }
        accent={accent}
      >
        {title}
      </CardHeader>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <CardBody>{children}</CardBody>
          </motion.div>
        )}
      </AnimatePresence>
    </GlowCard>
  );
}

// ─── Response Panel ───────────────────────────────────────
function ResponsePanel({ result }) {
  if (!result) {
    return (
      <ExpandableCard title="Routing & Response" icon="📋" badge={<StatusBadge status="idle" text="Idle" />} accent="blue" delay={0.05}>
        <EmptyState icon="📋" title="No analysis yet" hint="Submit a query above to begin pipeline analysis" />
      </ExpandableCard>
    );
  }

  const routing = result.routing;
  const riskPercent = Math.round((routing.risk_score || 0) * 100);
  const t = routing.tier;

  return (
    <ExpandableCard
      title="Routing & Response"
      icon="📋"
      badge={<StatusBadge status="passed" text={`Tier ${t}`} />}
      glow="blue"
      accent="blue"
      delay={0.05}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Risk Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border ${
            t === 0 ? 'border-neon-green/20 bg-neon-green/8 text-neon-green' :
            t === 1 ? 'border-neon-amber/20 bg-neon-amber/8 text-neon-amber' :
            'border-neon-red/20 bg-neon-red/8 text-neon-red'
          }`}>
            <Shield size={10} className="inline mr-1.5 -mt-0.5" />
            Tier {t}
          </span>
          <div className="flex items-center gap-3 text-[11px] text-text-secondary">
            <span>Risk: <span className="font-mono font-bold text-text-primary">{riskPercent}%</span></span>
            <span className="text-border">|</span>
            <span>Domain: <span className="font-semibold text-text-primary">{routing.domain || 'general'}</span></span>
          </div>
        </div>

        {/* Risk bar */}
        <div className="h-1 rounded-full bg-bg-elevated overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${riskPercent < 30 ? 'bg-neon-green' : riskPercent < 70 ? 'bg-neon-amber' : 'bg-neon-red'}`}
            initial={{ width: 0 }}
            animate={{ width: `${riskPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Response */}
        {result.final_response && (
          <div className="text-[13px] text-text-primary leading-relaxed bg-bg-primary/50 rounded-xl p-4 border border-border/50">
            {result.final_response}
          </div>
        )}
      </motion.div>
    </ExpandableCard>
  );
}

// ─── Tier 1 Panel ─────────────────────────────────────────
function Tier1Panel({ result }) {
  const tier1 = result?.tier1_result;

  if (!result) {
    return (
      <ExpandableCard title="Tier 1 — Reasoning Check" icon="📜" badge={<StatusBadge status="idle" text="Idle" />} accent="cyan" delay={0.1}>
        <EmptyState icon="📜" title="Process supervision inactive" hint="Chain-of-Thought validation will appear here" />
      </ExpandableCard>
    );
  }

  if (!tier1) {
    return (
      <ExpandableCard title="Tier 1 — Reasoning Check" icon="📜" badge={<StatusBadge status="idle" text="Skipped" />} accent="cyan" delay={0.1}>
        <EmptyState icon="📜" title="Skipped" hint="Not required for this query tier" />
      </ExpandableCard>
    );
  }

  const passed = tier1.passed;

  return (
    <ExpandableCard
      title="Tier 1 — Reasoning Check"
      icon="📜"
      badge={<StatusBadge status={passed ? 'passed' : 'flagged'} text={passed ? 'Passed' : 'Flagged'} />}
      glow={passed ? 'green' : 'red'}
      accent={passed ? 'green' : 'red'}
      delay={0.1}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        {/* CoT Steps — animated step-by-step */}
        {tier1.generation?.cot_steps?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-1 rounded-full bg-neon-cyan" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Step-by-Step Validation</span>
            </div>
            {tier1.generation.cot_steps.map((step, i) => {
              const scoreClass = step.safety_score >= 0.95 ? 'text-neon-green' :
                step.safety_score >= 0.7 ? 'text-neon-amber' : 'text-neon-red';
              const barColor = step.safety_score >= 0.95 ? 'bg-neon-green' :
                step.safety_score >= 0.7 ? 'bg-neon-amber' : 'bg-neon-red';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    step.flagged ? 'border-neon-red/15 bg-neon-red/5' : 'border-border bg-bg-elevated/50'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-bg-secondary flex items-center justify-center text-[10px] font-bold text-text-muted shrink-0 mt-0.5 border border-border">
                    {step.index + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-[12px] text-text-secondary leading-relaxed">{step.content}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-bg-secondary overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${step.safety_score * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.08 }}
                        />
                      </div>
                      <span className={`font-mono text-[11px] font-bold ${scoreClass} shrink-0`}>
                        {(step.safety_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {step.flagged && <AlertTriangle size={14} className="text-neon-red shrink-0 mt-1" />}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Violations */}
        {tier1.violations?.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={10} className="text-neon-red" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neon-red">Violations Detected</span>
            </div>
            {tier1.violations.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl border border-neon-red/15 bg-neon-red/5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neon-red">{v.violation_type}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    v.severity === 'critical' ? 'bg-neon-red/10 text-neon-red border-neon-red/20' :
                    v.severity === 'high' ? 'bg-neon-amber/10 text-neon-amber border-neon-amber/20' :
                    'bg-neon-amber/10 text-neon-amber border-neon-amber/20'
                  }`}>{v.severity}</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{v.explanation}</p>
                <p className="text-[11px] text-neon-cyan flex items-start gap-1">
                  <Sparkle size={10} className="mt-0.5 shrink-0" />
                  {v.correction_guidance}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {tier1.reasoning_anomaly && (
          <div className="p-3 rounded-xl border border-neon-amber/20 bg-neon-amber/5 flex items-start gap-2">
            <AlertTriangle size={14} className="text-neon-amber shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-extrabold uppercase text-neon-amber">Reasoning Anomaly</span>
              <p className="text-[11px] text-text-secondary mt-1">
                Disproportionate reasoning effort detected — potential indicator of hidden reasoning.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </ExpandableCard>
  );
}

// ─── Tier 2 Panel ─────────────────────────────────────────
function Tier2Panel({ result }) {
  const tier2 = result?.tier2_result;

  if (!result) {
    return (
      <ExpandableCard title="Tier 2 — AI Debate" icon="⚔️" badge={<StatusBadge status="idle" text="Idle" />} accent="purple" delay={0.15}>
        <EmptyState icon="⚔️" title="Debate protocol inactive" hint="Triggered for high-risk queries only" />
      </ExpandableCard>
    );
  }

  if (!tier2) {
    return (
      <ExpandableCard title="Tier 2 — AI Debate" icon="⚔️" badge={<StatusBadge status="idle" text="Skipped" />} accent="purple" delay={0.15}>
        <EmptyState icon="⚔️" title="Skipped" hint="Not required for this query tier" />
      </ExpandableCard>
    );
  }

  const verdictStatus = tier2.verdict === 'prover_wins' ? 'passed' : 'flagged';

  return (
    <ExpandableCard
      title="Tier 2 — AI Debate"
      icon="⚔️"
      badge={<StatusBadge status={verdictStatus} text={tier2.verdict.replace(/_/g, ' ')} />}
      glow={verdictStatus === 'passed' ? 'green' : 'red'}
      accent="purple"
      delay={0.15}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {tier2.rounds?.map((round, i) => {
          const confPercent = Math.round((round.judge_confidence || 0) * 100);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl border border-border bg-bg-elevated/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary">Round {round.round_number + 1}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(confPercent, 100)}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-text-secondary">{confPercent}%</span>
                </div>
              </div>

              {/* Chat-style debate */}
              <div className="space-y-2">
                <ChatBubble role="Prover" color="neon-blue" icon="🛡️" content={round.prover_argument?.content} side="left" />
                <ChatBubble role="Skeptic" color="neon-red" icon="🗡️" content={round.skeptic_critique?.content} side="right" />
                <ChatBubble role="Judge" color="neon-purple" icon="⚖️" content={round.judge_evaluation?.content} side="center" />
              </div>
            </motion.div>
          );
        })}

        {/* Verdict */}
        <div className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
          tier2.verdict === 'prover_wins'
            ? 'border-neon-green/20 bg-neon-green/5'
            : 'border-neon-red/20 bg-neon-red/5'
        }`}>
          <div className="flex items-center gap-2">
            {tier2.verdict === 'prover_wins' ? <CheckCircle2 size={16} className="text-neon-green" /> : <XCircle size={16} className="text-neon-red" />}
            <span className={`text-[12px] font-extrabold uppercase tracking-wider ${
              tier2.verdict === 'prover_wins' ? 'text-neon-green' : 'text-neon-red'
            }`}>
              {tier2.verdict.replace(/_/g, ' ')}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
            tier2.swap_test_passed ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : 'bg-neon-red/10 text-neon-red border-neon-red/20'
          }`}>
            {tier2.swap_test_passed ? '✓ Swap Test Passed' : '✗ Positional Bias'}
          </span>
        </div>
      </motion.div>
    </ExpandableCard>
  );
}

function ChatBubble({ role, color, icon, content, side }) {
  if (!content) return null;
  return (
    <div className={`flex ${side === 'right' ? 'justify-end' : side === 'center' ? 'justify-center' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${side === 'center' ? 'max-w-full' : ''}`}>
        <div className={`flex items-center gap-1.5 mb-1 ${side === 'right' ? 'justify-end' : ''}`}>
          <span className="text-xs">{icon}</span>
          <span className={`text-[9px] font-bold uppercase tracking-wider text-${color}`}>{role}</span>
        </div>
        <div className={`text-[11px] text-text-secondary leading-relaxed p-3 rounded-xl border ${
          side === 'center'
            ? `border-${color}/15 bg-${color}/5`
            : 'border-border bg-bg-elevated/50'
        }`}>
          {content}
        </div>
      </div>
    </div>
  );
}

// ─── Tier 3 Panel ─────────────────────────────────────────
function Tier3Panel({ result }) {
  const tier3 = result?.tier3_result;

  if (!result) {
    return (
      <ExpandableCard title="Tier 3 — Security Scan" icon="🔬" badge={<StatusBadge status="idle" text="Idle" />} accent="red" delay={0.2}>
        <EmptyState icon="🔬" title="Security scan inactive" hint="Activated with Tier 2 for high-security outputs" />
      </ExpandableCard>
    );
  }

  if (!tier3) {
    return (
      <ExpandableCard title="Tier 3 — Security Scan" icon="🔬" badge={<StatusBadge status="idle" text="Skipped" />} accent="red" delay={0.2}>
        <EmptyState icon="🔬" title="Skipped" hint="Not required for this query tier" />
      </ExpandableCard>
    );
  }

  const stego = tier3.stego_analysis;
  const alertTriggered = stego?.alert_triggered;
  const klVal = stego?.kl_divergence || 0;
  const threshold = stego?.threshold_used || 1;

  return (
    <ExpandableCard
      title="Tier 3 — Security Scan"
      icon="🔬"
      badge={<StatusBadge status={alertTriggered ? 'flagged' : 'passed'} text={alertTriggered ? 'Alert!' : 'Clear'} />}
      glow={alertTriggered ? 'red' : 'green'}
      accent={alertTriggered ? 'red' : 'green'}
      delay={0.2}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* KL Divergence Gauge */}
        {stego && (
          <div className="flex items-center gap-6">
            {/* Circular gauge */}
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={alertTriggered ? '#ef4444' : '#10b981'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - Math.min(klVal / (threshold * 2), 1)) }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-lg font-mono font-bold ${alertTriggered ? 'text-neon-red' : 'text-neon-green'}`}>
                  {klVal.toFixed(3)}
                </span>
                <span className="text-[8px] uppercase tracking-wider text-text-muted">KL Divergence</span>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3 flex-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Threshold</span>
                <span className="font-mono font-bold text-text-secondary">{threshold}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Perplexity</span>
                <span className="font-mono font-bold text-text-secondary">{stego.perplexity?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">Status</span>
                <StatusBadge status={alertTriggered ? 'flagged' : 'passed'} text={alertTriggered ? 'Alert' : 'Secure'} />
              </div>
            </div>
          </div>
        )}

        {/* Token Heatmap — animated waveform style */}
        {stego?.token_analyses?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scan size={10} className="text-neon-cyan" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Token Perplexity Heatmap</span>
            </div>
            <div className="flex flex-wrap gap-0.5 p-3 rounded-xl bg-bg-primary/50 border border-border/50">
              {stego.token_analyses.map((t, i) => {
                const intensity = Math.abs(t.kl_contribution);
                const bg = intensity < 0.01 ? 'bg-neon-green/10 text-neon-green/60' :
                  intensity < 0.03 ? 'bg-neon-amber/15 text-neon-amber/70' : 'bg-neon-red/15 text-neon-red/80';
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className={`px-1 py-0.5 rounded text-[10px] font-mono cursor-default ${bg}`}
                    title={`logprob: ${t.logprob.toFixed(3)}, KL: ${t.kl_contribution.toFixed(4)}`}
                  >
                    {t.token}
                  </motion.span>
                );
              })}
            </div>
          </div>
        )}

        {/* Paraphrase Firewall */}
        {tier3.paraphrased && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">
              🔄 Paraphrase Firewall — Similarity: {(tier3.semantic_similarity * 100).toFixed(0)}%
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl border border-neon-red/15 bg-neon-red/5">
                <div className="text-[9px] font-bold text-neon-red mb-1.5 uppercase">Original (Suspect)</div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{tier3.original_text}</p>
              </div>
              <div className="p-3 rounded-xl border border-neon-green/15 bg-neon-green/5">
                <div className="text-[9px] font-bold text-neon-green mb-1.5 uppercase">Sanitized Output</div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{tier3.sanitized_text}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </ExpandableCard>
  );
}

// ─── Metrics Panel ────────────────────────────────────────
function MetricsPanel({ result }) {
  if (!result) {
    return (
      <ExpandableCard title="Pipeline Metrics" icon="📊" badge={<StatusBadge status="idle" text="Idle" />} accent="blue" delay={0.25}>
        <EmptyState icon="📊" title="No metrics yet" hint="Token usage, latency, and cost will appear after analysis" />
      </ExpandableCard>
    );
  }

  const metrics = result.metrics;
  const routing = result.routing;
  if (!metrics) return null;

  const totalLatency = metrics.total_latency_ms?.toFixed(0) || '0';
  const totalTokens = metrics.total_tokens || 0;
  const totalCost = metrics.total_cost_usd?.toFixed(4) || '0.0000';
  const tierExec = metrics.tier_executed ?? routing?.tier ?? 0;

  const maxLatency = Math.max(metrics.routing_latency_ms || 0, metrics.tier1_latency_ms || 0, metrics.tier2_latency_ms || 0, metrics.tier3_latency_ms || 0, 1);

  const waterfall = [
    { label: 'Router', value: metrics.routing_latency_ms || 0, color: 'from-neon-blue to-neon-cyan' },
    { label: 'Tier 1', value: metrics.tier1_latency_ms || 0, color: 'from-neon-cyan to-neon-green' },
    { label: 'Tier 2', value: metrics.tier2_latency_ms || 0, color: 'from-neon-purple to-neon-pink' },
    { label: 'Tier 3', value: metrics.tier3_latency_ms || 0, color: 'from-neon-amber to-neon-red' },
  ];

  return (
    <ExpandableCard title="Pipeline Metrics" icon="📊" badge={<StatusBadge status="passed" text="Complete" />} glow="purple" accent="blue" delay={0.25}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { value: totalLatency, label: 'Total Latency', sub: 'milliseconds', icon: '⚡' },
            { value: formatNumber(totalTokens), label: 'Total Tokens', sub: 'all tiers', icon: '🔢' },
            { value: `$${totalCost}`, label: 'Est. Cost', sub: 'USD', icon: '💰' },
            { value: `T${tierExec}`, label: 'Max Tier', sub: tierExec === 0 ? 'pass-through' : tierExec === 1 ? 'constitutional' : 'full debate', icon: '🎯' },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-bg-elevated border border-border text-center group hover:border-neon-blue/20 transition-all"
            >
              <div className="text-lg mb-0.5">{m.icon}</div>
              <div className="text-lg font-mono font-extrabold gradient-text">{m.value}</div>
              <div className="text-[11px] font-semibold text-text-primary mt-1">{m.label}</div>
              <div className="text-[9px] text-text-muted">{m.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Waterfall */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={10} className="text-neon-purple" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Latency Waterfall</span>
          </div>
          <div className="space-y-2.5">
            {waterfall.map((row, i) => {
              const width = maxLatency > 0 ? Math.max((row.value / maxLatency) * 100, 3) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-text-muted w-12 shrink-0">{row.label}</span>
                  <div className="flex-1 h-3 bg-bg-secondary rounded-full overflow-hidden border border-border/50">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-text-secondary w-14 text-right shrink-0">{row.value.toFixed(0)}ms</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </ExpandableCard>
  );
}

// Helper component for Tier 1 violations
function Sparkle({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6" />
    </svg>
  );
}

// ─── Export ────────────────────────────────────────────────
export function ResultPanels({ result }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ResponsePanel result={result} />
      <Tier1Panel result={result} />
      <Tier2Panel result={result} />
      <Tier3Panel result={result} />
      <div className="lg:col-span-2">
        <MetricsPanel result={result} />
      </div>
    </div>
  );
}
