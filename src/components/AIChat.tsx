'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ModelOption {
  id: string;
  name: string;
}

interface AIChatProps {
  systemPrompt: string;
  placeholder?: string;
  models?: ModelOption[];
  className?: string;
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat' },
];

export default function AIChat({
  systemPrompt,
  placeholder = '输入你的问题...',
  models = DEFAULT_MODELS,
  className = '',
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(models[0]?.id || '');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userContent = input.trim();
    setInput('');
    setStreaming(true);

    const updatedMessages = [...messages, { role: 'user' as const, content: userContent }];
    setMessages(updatedMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, model, systemPrompt, stream: true }),
      });

      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantContent += data.content;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: assistantContent };
                return copy;
              });
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (e) {
      console.error('AIChat error:', e);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">AI 助手</span>
        {models.length > 0 && (
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {messages.length === 0 && (
          <p className="text-gray-400 text-xs text-center py-6">AI 助手已就绪，输入问题开始对话</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-purple-50 text-purple-900 ml-6'
                : 'bg-gray-50 text-gray-800 mr-2'
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content || (m.role === 'assistant' && streaming ? '...' : '')}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 border-t border-gray-100 pt-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          disabled={streaming}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!input.trim() || streaming}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors shrink-0"
        >
          {streaming ? '...' : '发送'}
        </button>
      </div>
    </div>
  );
}
