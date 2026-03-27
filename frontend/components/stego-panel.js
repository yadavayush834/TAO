/**
 * Steganography Panel Component
 * KL divergence visualization utilities
 */

export function getKLSeverity(kl, threshold) {
  const ratio = kl / threshold;
  if (ratio < 0.5) return { level: 'safe', color: '#10b981' };
  if (ratio < 1.0) return { level: 'warning', color: '#f59e0b' };
  return { level: 'danger', color: '#ef4444' };
}

export function tokenHeatmapColor(klContribution) {
  if (klContribution < 0.01) return 'token-low';
  if (klContribution < 0.03) return 'token-medium';
  return 'token-high';
}

export function formatPerplexity(value) {
  if (value < 10) return value.toFixed(2);
  if (value < 100) return value.toFixed(1);
  return Math.round(value).toString();
}
