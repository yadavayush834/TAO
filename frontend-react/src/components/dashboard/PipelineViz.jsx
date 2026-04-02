import { motion } from 'framer-motion';

const nodes = [
  { id: 'router', icon: '🔀', label: 'Router', sublabel: 'Risk Analysis', color: 'blue' },
  { id: 'tier1', icon: '📜', label: 'Tier 1', sublabel: 'Constitutional', color: 'cyan' },
  { id: 'tier2', icon: '⚔️', label: 'Tier 2', sublabel: 'AI Debate', color: 'purple' },
  { id: 'tier3', icon: '🔬', label: 'Tier 3', sublabel: 'Security Scan', color: 'pink' },
  { id: 'output', icon: '✅', label: 'Output', sublabel: 'Verified', color: 'green' },
];

const colorClasses = {
  blue: { active: 'border-neon-blue/60 bg-neon-blue/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]', dot: 'bg-neon-blue', ring: 'ring-neon-blue/30', text: 'text-neon-blue' },
  cyan: { active: 'border-neon-cyan/60 bg-neon-cyan/10 shadow-[0_0_30px_rgba(6,182,212,0.2)]', dot: 'bg-neon-cyan', ring: 'ring-neon-cyan/30', text: 'text-neon-cyan' },
  purple: { active: 'border-neon-purple/60 bg-neon-purple/10 shadow-[0_0_30px_rgba(139,92,246,0.2)]', dot: 'bg-neon-purple', ring: 'ring-neon-purple/30', text: 'text-neon-purple' },
  pink: { active: 'border-neon-pink/60 bg-neon-pink/10 shadow-[0_0_30px_rgba(236,72,153,0.2)]', dot: 'bg-neon-pink', ring: 'ring-neon-pink/30', text: 'text-neon-pink' },
  green: { active: 'border-neon-green/60 bg-neon-green/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]', dot: 'bg-neon-green', ring: 'ring-neon-green/30', text: 'text-neon-green' },
};

const stateStyles = {
  '': 'border-border bg-bg-card',
  active: 'animate-pulse',
  completed: '',
  flagged: '!border-neon-red/50 !bg-neon-red/10 shadow-[0_0_25px_rgba(239,68,68,0.15)]',
  skipped: 'opacity-30',
};

function getNodeState(nodeId, result, events) {
  if (!result && events.length === 0) return '';

  if (result) {
    const maxTier = result.routing?.tier ?? 0;
    if (nodeId === 'router' || nodeId === 'output') return 'completed';
    if (nodeId === 'tier1') {
      if (maxTier >= 0) return result.tier1_result && !result.tier1_result.passed ? 'flagged' : 'completed';
      return 'skipped';
    }
    if (nodeId === 'tier2') return maxTier >= 2 ? (result.tier2_result?.verdict !== 'prover_wins' ? 'flagged' : 'completed') : 'skipped';
    if (nodeId === 'tier3') return maxTier >= 2 ? (result.tier3_result?.stego_analysis?.alert_triggered ? 'flagged' : 'completed') : 'skipped';
  }

  const last = [...events].reverse().find(e => {
    if (nodeId === 'router') return e.event_type?.includes('routing');
    if (nodeId === 'tier1') return e.event_type?.includes('tier1');
    if (nodeId === 'tier2') return e.event_type?.includes('tier2');
    if (nodeId === 'tier3') return e.event_type?.includes('tier3');
    if (nodeId === 'output') return e.event_type === 'pipeline_complete';
    return false;
  });

  if (!last) return '';
  if (last.event_type?.includes('_start') || last.event_type === 'routing') return 'active';
  if (last.event_type?.includes('_complete')) return 'completed';
  return '';
}

function isConnectorActive(index, result, events) {
  if (result) {
    const maxTier = result.routing?.tier ?? 0;
    if (index === 0) return true;
    if (index === 1) return maxTier >= 2;
    if (index === 2) return maxTier >= 2;
    if (index === 3) return true;
  }
  return false;
}

export function PipelineViz({ result, events }) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-border/50 relative overflow-hidden">
      {/* Subtle scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-neon-blue/3 to-transparent animate-scan" />
      </div>

      {/* Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Live Pipeline</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">
          {result ? '● Processing Complete' : '○ Awaiting Input'}
        </span>
      </div>

      {/* Pipeline Nodes */}
      <div className="flex items-center justify-between gap-2">
        {nodes.map((node, i) => {
          const state = getNodeState(node.id, result, events);
          const cc = colorClasses[node.color];
          const isActive = state === 'active';
          const isCompleted = state === 'completed';
          const isFlagged = state === 'flagged';
          const isSkipped = state === 'skipped';

          return (
            <div key={node.id} className="flex items-center gap-2 flex-1">
              <motion.div
                className={`relative flex flex-col items-center gap-2 px-3 py-4 rounded-xl border transition-all duration-500 w-full
                  ${isActive ? cc.active : ''}
                  ${isCompleted ? cc.active : ''}
                  ${isFlagged ? stateStyles.flagged : ''}
                  ${isSkipped ? stateStyles.skipped : ''}
                  ${!state ? stateStyles[''] : ''}
                `}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isSkipped ? 0.3 : 1, scale: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                {/* Status dot */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {isActive && (
                    <>
                      <span className={`w-2 h-2 rounded-full ${cc.dot} animate-ping absolute`} />
                      <span className={`w-2 h-2 rounded-full ${cc.dot} relative`} />
                    </>
                  )}
                  {isCompleted && !isFlagged && <span className="w-2 h-2 rounded-full bg-neon-green" />}
                  {isFlagged && <span className="w-2 h-2 rounded-full bg-neon-red animate-pulse" />}
                </div>

                {/* Spinner ring for active */}
                {isActive && (
                  <div className={`absolute inset-0 rounded-xl border-2 ${cc.ring} animate-spin-slow opacity-30`}
                    style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }}
                  />
                )}

                <span className="text-2xl relative z-10">{node.icon}</span>
                <div className="text-center relative z-10">
                  <div className="text-[11px] font-bold text-text-primary">{node.label}</div>
                  <div className={`text-[9px] font-medium mt-0.5 ${isActive || isCompleted ? cc.text : 'text-text-muted'}`}>
                    {isActive ? 'Processing...' :
                     isCompleted ? (isFlagged ? 'Flagged' : 'Passed') :
                     isSkipped ? 'Skipped' :
                     node.sublabel}
                  </div>
                </div>

                {/* Mini progress bar */}
                {(isActive || isCompleted) && (
                  <div className="w-10 h-0.5 rounded-full bg-white/5 mt-1 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isFlagged ? 'bg-neon-red' : `bg-gradient-to-r from-${node.color === 'green' ? 'neon-green' : 'neon-blue'} to-neon-purple`}`}
                      initial={{ width: '0%' }}
                      animate={{ width: isCompleted ? '100%' : '60%' }}
                      transition={{ duration: isActive ? 2 : 0.5, ease: 'easeOut' }}
                      style={{ background: isFlagged ? '#ef4444' : `linear-gradient(to right, var(--color-neon-blue), var(--color-neon-purple))` }}
                    />
                  </div>
                )}
              </motion.div>

              {/* Connector */}
              {i < nodes.length - 1 && (
                <div className="flex items-center shrink-0 w-8">
                  <div className={`h-[2px] w-full rounded-full transition-all duration-700 relative overflow-hidden ${
                    isConnectorActive(i, result, events)
                      ? 'bg-gradient-to-r from-neon-blue/60 to-neon-purple/60'
                      : 'bg-border'
                  }`}>
                    {isConnectorActive(i, result, events) && (
                      <motion.div
                        className="absolute inset-y-0 w-4 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        animate={{ x: ['-16px', '40px'] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
