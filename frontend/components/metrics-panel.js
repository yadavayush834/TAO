/**
 * Metrics Panel Component
 * Token cost/latency calculation utilities
 */

// GPT-4o pricing as of 2025
const PRICING = {
  'gpt-4o': { input: 5.0, output: 15.0 },       // per 1M tokens
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'o1': { input: 15.0, output: 60.0 },
  'simulation': { input: 0, output: 0 },
};

export function estimateCost(tokens, model = 'gpt-4o') {
  const price = PRICING[model] || PRICING['gpt-4o'];
  // Assume 50/50 split between input and output
  return (tokens / 2 / 1e6 * price.input) + (tokens / 2 / 1e6 * price.output);
}

export function formatLatency(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatTokens(count) {
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
  return count.toString();
}
