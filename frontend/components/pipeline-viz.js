/**
 * Pipeline Visualization Component
 * Exported as utility functions used by app.js
 */

export function createPipelineNode(id, icon, label) {
  const node = document.createElement('div');
  node.className = 'pipeline-node';
  node.id = id;
  node.innerHTML = `
    <span class="node-icon">${icon}</span>
    <span class="node-label">${label}</span>
  `;
  return node;
}

export function createConnector(id) {
  const conn = document.createElement('div');
  conn.className = 'pipeline-connector';
  conn.id = id;
  return conn;
}

export function animateNodeTransition(node, fromState, toState, duration = 300) {
  node.classList.remove(fromState);
  node.classList.add(toState);
  node.style.transition = `all ${duration}ms ease`;
}
