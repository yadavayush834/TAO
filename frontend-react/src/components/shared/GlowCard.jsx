import { motion } from 'framer-motion';

const glowMap = {
  blue: { border: 'hover:border-neon-blue/25', shadow: '0 0 30px rgba(59, 130, 246, 0.08)' },
  purple: { border: 'hover:border-neon-purple/25', shadow: '0 0 30px rgba(139, 92, 246, 0.08)' },
  green: { border: 'hover:border-neon-green/25', shadow: '0 0 30px rgba(16, 185, 129, 0.08)' },
  amber: { border: 'hover:border-neon-amber/25', shadow: '0 0 30px rgba(245, 158, 11, 0.08)' },
  red: { border: 'hover:border-neon-red/25', shadow: '0 0 30px rgba(239, 68, 68, 0.08)' },
  cyan: { border: 'hover:border-neon-cyan/25', shadow: '0 0 30px rgba(6, 182, 212, 0.08)' },
  none: { border: 'hover:border-border-hover', shadow: 'none' },
};

export function GlowCard({ children, glow = 'none', className = '', onClick, delay = 0 }) {
  const g = glowMap[glow] || glowMap.none;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`
        glass-card rounded-2xl overflow-hidden
        ${g.border}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        hover:glass-card-hover
        ${className}
      `}
      style={{ boxShadow: glow !== 'none' ? g.shadow : undefined }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={onClick ? { scale: 1.005 } : {}}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, badge, className = '', icon, accent = 'blue' }) {
  const accentColors = {
    blue: 'from-neon-blue/10 to-transparent',
    purple: 'from-neon-purple/10 to-transparent',
    green: 'from-neon-green/10 to-transparent',
    amber: 'from-neon-amber/10 to-transparent',
    red: 'from-neon-red/10 to-transparent',
    cyan: 'from-neon-cyan/10 to-transparent',
  };

  return (
    <div className={`flex items-center justify-between px-5 py-3 border-b border-border/50 bg-gradient-to-r ${accentColors[accent] || accentColors.blue} ${className}`}>
      <div className="flex items-center gap-2.5 font-semibold text-[13px] text-text-primary">
        {icon && <span className="text-sm">{icon}</span>}
        {children}
      </div>
      {badge}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
