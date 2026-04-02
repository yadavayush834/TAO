const variants = {
  idle: { bg: 'bg-bg-elevated', text: 'text-text-muted', dot: 'bg-text-muted', border: 'border-border' },
  active: { bg: 'bg-neon-blue/10', text: 'text-neon-blue', dot: 'bg-neon-blue animate-pulse', border: 'border-neon-blue/20' },
  passed: { bg: 'bg-neon-green/10', text: 'text-neon-green', dot: 'bg-neon-green', border: 'border-neon-green/20' },
  flagged: { bg: 'bg-neon-red/10', text: 'text-neon-red', dot: 'bg-neon-red', border: 'border-neon-red/20' },
  warning: { bg: 'bg-neon-amber/10', text: 'text-neon-amber', dot: 'bg-neon-amber animate-pulse', border: 'border-neon-amber/20' },
  success: { bg: 'bg-neon-green/10', text: 'text-neon-green', dot: 'bg-neon-green', border: 'border-neon-green/20' },
  danger: { bg: 'bg-neon-red/10', text: 'text-neon-red', dot: 'bg-neon-red', border: 'border-neon-red/20' },
  info: { bg: 'bg-neon-cyan/10', text: 'text-neon-cyan', dot: 'bg-neon-cyan', border: 'border-neon-cyan/20' },
  processing: { bg: 'bg-neon-purple/10', text: 'text-neon-purple', dot: 'bg-neon-purple animate-pulse', border: 'border-neon-purple/20' },
};

export function StatusBadge({ variant, status, text, children, className = '' }) {
  const v = variants[variant || status || 'idle'] || variants.idle;
  const label = children || text;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border ${v.bg} ${v.text} ${v.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {label}
    </span>
  );
}

export function RiskBadge({ level, domain }) {
  const v = level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success';
  return (
    <StatusBadge variant={v}>
      {level}{domain ? ` · ${domain}` : ''}
    </StatusBadge>
  );
}

export function DecisionBadge({ decision }) {
  return (
    <StatusBadge variant={decision === 'approve' ? 'success' : 'danger'}>
      {decision === 'approve' ? '✓ Approved' : '✗ Rejected'}
    </StatusBadge>
  );
}
