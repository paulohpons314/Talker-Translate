import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Loader2, ChevronDown, ChevronUp, Copy, Check, MessageSquare } from 'lucide-react';
import { GeminiChatMessage } from '../types';

interface GeminiAssistantProps {
  sourceText: string;
  translatedText: string;
  onApplyTextChange?: (newSource?: string, newTranslated?: string) => void;
}

const QUICK_PROMPTS = [
  { label: '💡 Resumir em 3 tópicos', prompt: 'Resuma os pontos principais dos dois textos em 3 tópicos claros.' },
  { label: '👔 Tom Executivo / Formal', prompt: 'Reescreva a tradução mantendo um tom corporativo, altamente formal e elegante.' },
  { label: '📖 Explicar Expressões', prompt: 'Identifique e explique detalhadamente as expressões idiomáticas e termos técnicos deste texto.' },
  { label: '✉️ Criar E-mail', prompt: 'Elabore um e-mail de apresentação profissional baseado no conteúdo destes textos.' },
  { label: '🛠️ Corrigir Gramática', prompt: 'Verifique a gramática do texto original e aponte eventuais melhorias sintáticas.' }
];

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({
  sourceText,
  translatedText,
  onApplyTextChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [chatHistory, setChatHistory] = useState<GeminiChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || promptInput;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: GeminiChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setChatHistory((prev) => [...prev, userMsg]);
    if (!customPrompt) setPromptInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          sourceText,
          translatedText,
          history: chatHistory.map((msg) => ({ role: msg.role, content: msg.content }))
        })
      });

      const data = await response.json();

      const botMsg: GeminiChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Não foi possível obter resposta no momento.',
        timestamp: new Date()
      };

      setChatHistory((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Error querying Gemini:', err);
      const errorMsg: GeminiChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ocorreu um erro ao consultar o Gemini. Verifique a conexão.',
        timestamp: new Date()
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-4 px-2 sm:px-4">
      {/* Floating Header Toggle Bar */}
      <div className="relative overflow-hidden rounded-2xl glass-panel border border-cyan-500/30 bg-slate-950/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Subtle top ambient glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/15 text-[#D3E2F1]/80 shadow-inner">
              <Sparkles className="w-5 h-5 text-[#D3E2F1]/70" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Assistente Gemini & Consultas Inteligentes</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#D3E2F1]/80 border border-white/15 font-mono">
                  IA Interativa
                </span>
              </div>
              <p className="text-xs text-slate-400">Faça perguntas, solicite reescritas ou análises sobre o texto</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-cyan-300 border border-white/10 transition-colors shrink-0"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isOpen ? 'Ocultar Painel' : 'Expandir Assistente'}
          </button>
        </div>

        {/* Quick Action Chips Bar (Visible when opened or closed for quick one-click triggers) */}
        <div className="px-3 pb-3 sm:px-4 overflow-x-auto flex items-center gap-2 no-scrollbar">
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!isOpen) setIsOpen(true);
                handleSend(item.prompt);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-cyan-300 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 transition-all duration-200 shrink-0 hover:scale-105 active:scale-95"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Expanded Chat History & Prompt Area */}
        {isOpen && (
          <div className="border-t border-white/10 bg-black/40 p-3 sm:p-5 space-y-4 animate-fadeIn">
            {/* Messages scroll area */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
              {chatHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center gap-2">
                  <MessageSquare className="w-8 h-8 text-slate-600 opacity-60" />
                  <p>Pergunte algo sobre o texto original ou a tradução.</p>
                  <p className="text-[11px] text-slate-600">Ex: "Resuma em tópicos", "Explique as metáforas", "Adapte para e-mail profissional"</p>
                </div>
              ) : (
                chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 text-xs leading-relaxed ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`relative max-w-2xl p-3.5 rounded-2xl border ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-cyan-400/40 text-white rounded-tr-none'
                          : 'bg-white/[0.05] border-white/10 text-slate-200 rounded-tl-none shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {msg.role === 'assistant' && (
                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/10">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Copiar resposta"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini está processando sua solicitação...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Prompt Bar with Frosted Glass Halo Glow */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative group pt-2"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none" />
              <div className="relative flex items-center bg-[#0d0d11] border border-white/10 rounded-xl px-4 sm:px-6 py-3.5 gap-3">
                <Sparkles className="w-5 h-5 text-[#D3E2F1]/60 shrink-0" />
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  spellCheck={false}
                  placeholder="Pergunte ao Gemini para refinar, resumir ou explicar este texto..."
                  className="bg-transparent border-none outline-none flex-1 text-sm text-white/80 placeholder:text-white/20"
                />
                <button
                  type="submit"
                  disabled={!promptInput.trim() || isLoading}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all disabled:opacity-30 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
                <kbd className="hidden sm:inline-block text-[9px] border border-white/10 rounded px-1.5 py-0.5 text-white/30 uppercase tracking-tighter shrink-0 font-mono">
                  Enter
                </kbd>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
