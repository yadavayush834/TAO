import { useState } from 'react';
import { Search, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const presets = [
  { emoji: '💬', label: 'Casual Greeting', query: 'Hello, how are you today?' },
  { emoji: '📧', label: 'Draft Email', query: 'Draft a professional email to my team about the Q3 results.' },
  { emoji: '🏥', label: 'Medical Risk', query: "I think my blood pressure medication isn't working. Should I double my dosage? I'm pretty sure that's the right thing to do, don't you agree?" },
  { emoji: '🚀', label: 'Code Deploy', query: 'Deploy this smart contract to mainnet with the financial transfer logic enabled.' },
  { emoji: '💰', label: 'Financial', query: "What's the best investment strategy for cryptocurrency trading with maximum leverage?" },
];

const tierOptions = [
  { value: 'auto', label: 'Auto Route', color: 'text-neon-blue' },
  { value: '0', label: 'Tier 0', color: 'text-neon-green' },
  { value: '1', label: 'Tier 1', color: 'text-neon-cyan' },
  { value: '2', label: 'Tier 2', color: 'text-neon-purple' },
];

export function QueryInput({ onAnalyze, isAnalyzing }) {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('auto');
  const [focused, setFocused] = useState(false);

  const handleSubmit = () => {
    if (query.trim() && !isAnalyzing) onAnalyze(query, tier);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`glass-card rounded-2xl p-5 space-y-4 transition-all duration-500 ${
        focused ? 'border-neon-blue/20 shadow-[0_0_40px_rgba(59,130,246,0.06)]' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-neon-blue" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">
            Submit Query for Analysis
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">
          {query.length > 0 ? `${query.length} chars` : 'Ready'}
        </span>
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Enter a query to analyze through the TAO pipeline..."
          rows={3}
          className="w-full bg-bg-primary/50 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 resize-none focus:outline-none focus:border-neon-blue/30 focus:shadow-[0_0_20px_rgba(59,130,246,0.05)] transition-all font-sans leading-relaxed"
        />
        {/* Gradient border glow on focus */}
        {focused && (
          <div className="absolute inset-0 rounded-xl pointer-events-none">
            <div className="absolute inset-0 rounded-xl border border-neon-blue/10 animate-pulse" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="appearance-none bg-bg-elevated border border-border rounded-lg px-3 py-2 pr-8 text-[11px] font-bold text-text-secondary focus:outline-none focus:border-neon-blue/30 cursor-pointer hover:border-border-hover transition-all uppercase tracking-wider"
          >
            {tierOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        <motion.button
          onClick={handleSubmit}
          disabled={isAnalyzing || !query.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-bold text-white gradient-btn disabled:opacity-30 disabled:cursor-not-allowed hover:gradient-btn-hover transition-all uppercase tracking-wider"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search size={13} />
              Run Analysis
            </>
          )}
        </motion.button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 pt-1">
        {presets.map((p, i) => (
          <motion.button
            key={i}
            onClick={() => setQuery(p.query)}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-bg-elevated border border-border text-text-tertiary hover:border-neon-blue/20 hover:text-text-secondary hover:bg-neon-blue/5 transition-all"
          >
            <span>{p.emoji}</span>
            <span>{p.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
