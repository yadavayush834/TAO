/**
 * API Client — Handles communication with the TAO backend
 */

const API_BASE = window.location.origin;

export async function analyzeQuery(query, forceTier = null) {
  const body = { query };
  if (forceTier !== null) body.force_tier = forceTier;

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getConstitution() {
  const res = await fetch(`${API_BASE}/api/constitution`);
  return res.json();
}

export async function getHistory(limit = 20) {
  const res = await fetch(`${API_BASE}/api/history?limit=${limit}`);
  return res.json();
}

export async function getConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  return res.json();
}

export function createWebSocket() {
  const wsUrl = `ws://${window.location.host}/ws/pipeline`;
  return new WebSocket(wsUrl);
}
