import { useState, useEffect } from 'react';
import { Shield, Activity, Cpu, Bell, User, Zap, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export function Navbar({ simMode, ollamaOk }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[52px] flex items-center justify-between px-5 border-b border-border glass-panel shrink-0 z-40 relative"
    >
      {/* Left: System Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Shield size={15} className="text-neon-blue" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          </div>
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
            System Active
          </span>
        </div>

        <div className="w-px h-4 bg-border" />

        <div className="flex items-center gap-4">
          {/* Simulation Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            simMode
              ? 'border-neon-amber/20 bg-neon-amber/5 text-neon-amber'
              : 'border-neon-green/20 bg-neon-green/5 text-neon-green'
          }`}>
            <Activity size={10} className={simMode ? 'animate-pulse' : ''} />
            {simMode ? 'Simulation' : 'Live'}
          </div>

          {/* Ollama Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            ollamaOk
              ? 'border-neon-green/20 bg-neon-green/5 text-neon-green'
              : 'border-neon-red/20 bg-neon-red/5 text-neon-red'
          }`}>
            {ollamaOk ? <Wifi size={10} /> : <WifiOff size={10} />}
            {ollamaOk ? 'Ollama Connected' : 'Ollama Offline'}
          </div>
        </div>
      </div>

      {/* Center: Brand */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-neon-blue" />
          <span className="text-xs font-mono font-bold text-text-secondary tracking-wider">
            v1.0.0
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Model Info */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-elevated border border-border text-[10px] font-mono text-text-tertiary">
          <Cpu size={10} className="text-neon-purple" />
          <span className="text-text-secondary">LLaMA 3.2</span>
        </div>

        {/* Time */}
        <span className="text-[10px] font-mono text-text-muted tabular-nums">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>

        <div className="w-px h-4 bg-border" />

        {/* Notifications */}
        <button className="relative p-1.5 rounded-lg hover:bg-bg-elevated transition-colors group">
          <Bell size={14} className="text-text-muted group-hover:text-text-primary transition-colors" />
        </button>

        {/* User */}
        <button className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-neon-blue/20">
          <User size={13} />
        </button>
      </div>
    </motion.header>
  );
}
