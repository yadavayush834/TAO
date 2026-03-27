/**
 * Debate Viewer Component
 * Utility functions for rendering debate rounds
 */

export function formatDebateRound(round) {
  const roles = {
    prover: { label: 'Prover', class: 'role-prover', icon: '🛡️' },
    skeptic: { label: 'Skeptic', class: 'role-skeptic', icon: '⚔️' },
    judge: { label: 'Judge', class: 'role-judge', icon: '⚖️' },
  };

  return { roles, round };
}

export function getVerdictDisplay(verdict) {
  const map = {
    prover_wins: { text: 'Prover Wins', class: 'verdict-prover', icon: '🛡️' },
    skeptic_wins: { text: 'Skeptic Wins', class: 'verdict-skeptic', icon: '⚔️' },
    inconclusive: { text: 'Inconclusive', class: 'verdict-inconclusive', icon: '❓' },
    consensus: { text: 'Consensus', class: 'verdict-consensus', icon: '🤝' },
  };
  return map[verdict] || map.inconclusive;
}
