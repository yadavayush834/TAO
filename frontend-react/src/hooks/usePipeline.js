import { useState, useCallback, useRef } from 'react';

const API = window.location.origin;
const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export function usePipeline() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const resetPipeline = useCallback(() => {
    setResult(null);
    setEvents([]);
    setError(null);
  }, []);

  const analyzeViaWebSocket = useCallback((body) => {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`${WS_BASE}/ws/pipeline`);
        wsRef.current = ws;
        let resolved = false;

        ws.onopen = () => {
          ws.send(JSON.stringify(body));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.event_type === 'final_result') {
            setResult(data.data);
            if (!resolved) { resolved = true; resolve(true); }
            ws.close();
          } else {
            setEvents(prev => [...prev, data]);
          }
        };

        ws.onerror = () => {
          if (!resolved) { resolved = true; resolve(false); }
        };

        ws.onclose = () => {
          if (!resolved) { resolved = true; resolve(false); }
        };

        setTimeout(() => {
          if (!resolved) { resolved = true; resolve(false); ws.close(); }
        }, 30000);
      } catch {
        resolve(false);
      }
    });
  }, []);

  const analyzeViaREST = useCallback(async (body) => {
    setEvents(prev => [...prev, { event_type: 'routing', data: {} }]);

    const res = await fetch(`${API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setResult(data);
  }, []);

  const analyze = useCallback(async (query, forceTier = 'auto') => {
    if (!query.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    resetPipeline();

    const body = {
      query: query.trim(),
      force_tier: forceTier === 'auto' ? null : parseInt(forceTier),
    };

    try {
      const wsOk = await analyzeViaWebSocket(body);
      if (!wsOk) {
        await analyzeViaREST(body);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Analysis failed. Check that the server is running.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, resetPipeline, analyzeViaWebSocket, analyzeViaREST]);

  return { analyze, isAnalyzing, result, events, error, resetPipeline };
}
