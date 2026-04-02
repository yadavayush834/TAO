import { useState, useCallback } from 'react';

const API = window.location.origin;

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      const data = await res.json();
      setLoading(false);
      return data;
    } catch (e) {
      setError(e.message);
      setLoading(false);
      throw e;
    }
  }, []);

  const get = useCallback((url) => request(url), [request]);
  const post = useCallback((url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }), [request]);

  return { get, post, loading, error };
}
