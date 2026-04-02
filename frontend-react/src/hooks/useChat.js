import { useState, useCallback, useEffect } from 'react';

const API = window.location.origin;

export function useChat() {
  const [messages, setMessages] = useState([
    {
      id: 'system-0',
      type: 'system',
      content: '⚖️ Judge AI Chat — Every response is evaluated by a Judge LLM before delivery.\nRisk level is auto-detected. High-risk queries get stricter judging.',
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [chatMetrics, setChatMetrics] = useState({ latency: null, tokens: null, attempts: null });
  const [config, setConfig] = useState({ model: '—', retries: 2 });
  const [ollamaStatus, setOllamaStatus] = useState({ ok: false, text: 'Checking...' });
  const [flowSteps, setFlowSteps] = useState({
    input: '', risk: '', generate: '', judge: '', refine: '', output: '',
  });

  // Check ollama health
  const checkOllama = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/health`);
      const data = await res.json();
      if (data.status === 'healthy') {
        const modelOk = data.generator_available ? '✓' : '✗';
        setOllamaStatus({ ok: true, text: `Ollama ${modelOk} ${data.generator_model}` });
      } else {
        setOllamaStatus({ ok: false, text: data.error || 'Ollama offline' });
      }
    } catch {
      setOllamaStatus({ ok: false, text: 'Server offline' });
    }
  }, []);

  // Load chat config
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/config`);
      const data = await res.json();
      setConfig({ model: data.generator_model || '—', retries: data.max_retries || 2 });
    } catch {
      setConfig({ model: '—', retries: 2 });
    }
  }, []);

  useEffect(() => {
    checkOllama();
    loadConfig();
  }, [checkOllama, loadConfig]);

  const resetFlow = useCallback(() => {
    setFlowSteps({ input: '', risk: '', generate: '', judge: '', refine: '', output: '' });
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isSending) return;

    setIsSending(true);
    const userMsg = { id: `user-${Date.now()}`, type: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);

    // Show typing
    const typingId = `typing-${Date.now()}`;
    setMessages(prev => [...prev, { id: typingId, type: 'typing', content: '' }]);

    resetFlow();
    setFlowSteps(prev => ({ ...prev, input: 'done', risk: 'active' }));

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();

      // Remove typing indicator and add response
      setMessages(prev => [
        ...prev.filter(m => m.id !== typingId),
        {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: data.response,
          risk: data.risk,
        },
      ]);

      // Animate flow
      const newFlow = { input: 'done', risk: 'done', generate: 'done', judge: 'done', refine: '', output: 'done' };
      if (data.attempts && data.attempts.length > 1) {
        newFlow.refine = 'done';
      }
      setFlowSteps(newFlow);

      // Update verdict
      setVerdict({
        attempts: data.attempts,
        risk: data.risk,
        final_decision: data.final_decision,
      });

      // Update metrics
      setChatMetrics({
        latency: data.total_latency_ms ? `${(data.total_latency_ms / 1000).toFixed(1)}s` : '—',
        tokens: data.total_tokens ? data.total_tokens.toLocaleString() : '—',
        attempts: data.attempts ? data.attempts.length : '—',
      });

    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== typingId),
        { id: `error-${Date.now()}`, type: 'system', content: `⚠️ Error: ${err.message}` },
      ]);
      resetFlow();
    } finally {
      setIsSending(false);
    }
  }, [isSending, resetFlow]);

  return {
    messages, sendMessage, isSending,
    verdict, chatMetrics, config, ollamaStatus,
    flowSteps, resetFlow, checkOllama,
  };
}
