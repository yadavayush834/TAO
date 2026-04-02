import { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, ChevronLeft, ChevronRight, Shield, Radar, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Pipeline Overview' },
  { id: 'chat', label: 'Judge AI', icon: MessageSquare, description: 'AI Safety Chat' },
];

export function Sidebar({ activeView, onViewChange, collapsed, onToggle }) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col border-r border-border glass-panel"
    >
      {/* Brand */}
      <div className="px-3 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center shrink-0 relative overflow-hidden"
          >
            <Shield size={18} className="text-white relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <h1 className="text-sm font-extrabold tracking-tight gradient-text">TAO GUARD</h1>
                <p className="text-[10px] text-text-muted font-medium tracking-wider uppercase">Adversarial Oversight</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-1">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 mb-2"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted">Navigation</span>
            </motion.div>
          )}
        </AnimatePresence>

        {navItems.map(({ id, label, icon: Icon, description }) => {
          const isActive = activeView === id;
          return (
            <motion.button
              key={id}
              onClick={() => onViewChange(id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 w-full text-left group
                ${isActive
                  ? 'text-white'
                  : 'text-text-tertiary hover:text-text-secondary'
                }`}
            >
              {/* Active Background */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-blue/15 to-neon-purple/10 border border-neon-blue/20"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                />
              )}

              <div className={`relative z-10 p-1.5 rounded-lg transition-all duration-300 ${
                isActive ? 'bg-neon-blue/20 text-neon-blue' : 'group-hover:bg-bg-elevated'
              }`}>
                <Icon size={16} />
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="relative z-10 overflow-hidden"
                  >
                    <span className="block text-[13px] font-semibold">{label}</span>
                    <span className={`block text-[10px] mt-0.5 transition-colors ${
                      isActive ? 'text-neon-blue/70' : 'text-text-muted'
                    }`}>
                      {description}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Footer Status */}
      <div className="px-2 pb-3 space-y-1.5 border-t border-border pt-3">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 mb-1"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted">System</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg bg-bg-elevated border border-border ${collapsed ? 'justify-center' : ''}`}>
          <div className="relative">
            <Radar size={12} className="text-neon-green" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          </div>
          {!collapsed && <span className="text-[11px] font-medium text-text-secondary">3 Tiers Active</span>}
        </div>

        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg bg-bg-elevated border border-border ${collapsed ? 'justify-center' : ''}`}>
          <Activity size={12} className="text-neon-cyan" />
          {!collapsed && <span className="text-[11px] font-medium text-text-secondary">Pipeline Ready</span>}
        </div>
      </div>

      {/* Collapse Toggle */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-bg-secondary border border-border flex items-center justify-center text-text-muted hover:text-neon-blue hover:border-neon-blue/30 transition-all z-50 shadow-lg shadow-black/20"
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </motion.button>
    </motion.aside>
  );
}
