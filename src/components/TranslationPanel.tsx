import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX,
  Mic, 
  MicOff, 
  Trash2, 
  Download, 
  Eye, 
  Code, 
  Sparkles, 
  BookOpen, 
  FileDown, 
  Wand2, 
  Loader2,
  X,
  Radio,
  Square
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Language, TranslationStyle, KeyTerm } from '../types';

interface TranslationPanelProps {
  sourceText: string;
  setSourceText: (text: string) => void;
  translatedText: string;
  sourceLang: Language;
  setSourceLang: (lang: Language) => void;
  targetLang: Language;
  setTargetLang: (lang: Language) => void;
  detectedLang?: Language;
  style: TranslationStyle;
  setStyle: (style: TranslationStyle) => void;
  isTranslating: boolean;
  onSwapLanguages: () => void;
  onClear: () => void;
  keyTerms?: KeyTerm[];
  onFileUpload: (file: File) => void;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  sourceText,
  setSourceText,
  translatedText,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  detectedLang,
  style,
  setStyle,
  isTranslating,
  onSwapLanguages,
  onClear,
  keyTerms = [],
  onFileUpload
}) => {
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [showKeyTerms, setShowKeyTerms] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Load browser voices for SpeechSynthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Toggle Microphone Speech-to-Text Recording
  const toggleMic = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Seu navegador não possui suporte para ditado por voz. Recomendamos usar o Google Chrome ou Microsoft Edge.');
      return;
    }

    // Request browser microphone permission first
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: any) {
      console.error('Microphone permission denied:', err);
      alert('Permissão do microfone negada. Por favor, habilite o acesso ao microfone no seu navegador e tente novamente.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Determine correct recognition language code
      const currentLang = sourceLang === 'pt' ? 'pt-BR' : sourceLang === 'en' ? 'en-US' : (detectedLang === 'pt' ? 'pt-BR' : 'en-US');
      recognition.lang = currentLang;

      let baseText = sourceText ? sourceText + (sourceText.endsWith(' ') || sourceText.endsWith('\n') ? '' : ' ') : '';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (finalChunk) {
          baseText += finalChunk;
          setSourceText(baseText);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setInterimTranscript('');
      alert('Não foi possível iniciar a captura de áudio. Tente novamente.');
    }
  };

  // TTS playback using Web Speech API
  const handleTTS = (text: string, lang: Language, isSource: boolean) => {
    if (!text || !text.trim()) return;

    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta leitura de áudio (Text-To-Speech).');
      return;
    }

    // Toggle off if already speaking the same text
    if ((isSource && isSpeakingSource) || (!isSource && isSpeakingTarget)) {
      window.speechSynthesis.cancel();
      setIsSpeakingSource(false);
      setIsSpeakingTarget(false);
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeakingSource(false);
    setIsSpeakingTarget(false);

    // Strip markdown tags and clean text for natural speech reading
    const cleanText = text
      .replace(/[*_#`~>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'Código omisso')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langCode = lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en-US' : (detectedLang === 'pt' ? 'pt-BR' : 'en-US');
    utterance.lang = langCode;
    utterance.rate = ttsSpeed;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferred = voices.find(
        (v) => v.lang.toLowerCase().replace('_', '-') === langCode.toLowerCase() ||
               v.lang.toLowerCase().startsWith(langCode.split('-')[0])
      );
      if (preferred) {
        utterance.voice = preferred;
      }
    }

    utterance.onstart = () => {
      if (isSource) setIsSpeakingSource(true);
      else setIsSpeakingTarget(true);
    };

    utterance.onend = () => {
      if (isSource) setIsSpeakingSource(false);
      else setIsSpeakingTarget(false);
    };

    utterance.onerror = () => {
      if (isSource) setIsSpeakingSource(false);
      else setIsSpeakingTarget(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text: string, isSource: boolean) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isSource) {
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    } else {
      setCopiedTarget(true);
      setTimeout(() => setCopiedTarget(false), 2000);
    }
  };

  // Download translated text in various formats
  const handleDownload = (format: 'txt' | 'md' | 'doc') => {
    if (!translatedText) return;
    let mimeType = 'text/plain';
    let filename = `traducao_talker.${format}`;

    if (format === 'md') {
      mimeType = 'text/markdown';
    } else if (format === 'doc') {
      mimeType = 'application/msword';
      filename = `traducao_talker.doc`;
    }

    const blob = new Blob([translatedText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
  const charCount = sourceText.length;

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-2 px-2 sm:px-4">
      {/* Side by side dual window grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative">

        {/* Swap Languages Button (Centered between windows) */}
        <div className="absolute left-1/2 top-12 -translate-x-1/2 z-30 hidden md:block">
          <button
            onClick={onSwapLanguages}
            title="Inverter Idiomas e Textos (Ctrl+S)"
            className="group p-3 rounded-full border border-white/20 text-[#D3E2F1]/70 hover:text-white bg-[#0a0c12]/90 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 hover:scale-110 active:scale-90 hover:rotate-180"
          >
            <ArrowLeftRight className="w-5 h-5 transition-transform duration-300" />
          </button>
        </div>

        {/* ================= LEFT WINDOW (TEXTO ORIGEM) ================= */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col rounded-2xl bg-white/[0.03] backdrop-blur-xl p-5 border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] transition-all duration-500 ${
            isDragOver 
              ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_30px_rgba(56,189,248,0.3)]' 
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Subtle top reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1px] reflection-line opacity-50" />

          {/* Left Window Header Toolbar */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[#D3E2F1]/60 font-medium">De:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as Language)}
                className="bg-black/60 text-[#D3E2F1] text-[14px] font-lora px-3 py-1.5 rounded-xl border border-white/15 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
              >
                <option value="auto" className="bg-[#0e1017] text-[#D3E2F1]">Detecção Automática {detectedLang ? `(${detectedLang.toUpperCase()})` : ''}</option>
                <option value="en" className="bg-[#0e1017] text-[#D3E2F1]">Inglês (EN)</option>
                <option value="pt" className="bg-[#0e1017] text-[#D3E2F1]">Português (BR)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white/30 font-mono tracking-tight">
              <span className="hidden sm:inline text-[10px] text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded font-sans">
                Ctrl+Enter
              </span>
              <span>{wordCount} palavras • {charCount} chars</span>
            </div>
          </div>

          {/* DEDICATED RECORDING BANNER (In-flow layout, non-overlapping) */}
          {isListening && (
            <div className="mb-3 p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl backdrop-blur-md shadow-lg text-xs text-rose-200 transition-all animate-fadeIn">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="font-semibold text-rose-300 text-xs uppercase tracking-wider">
                    Ditado por Voz Ativo
                  </span>
                </div>
                <button
                  onClick={toggleMic}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-xs tracking-wider shrink-0 transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" /> Parar Ditado
                </button>
              </div>

              {/* Interim / Live Speech Preview Box */}
              <div className="bg-black/50 rounded-lg p-2.5 border border-rose-500/30 text-rose-100 font-sans leading-relaxed max-h-[110px] overflow-y-auto">
                {interimTranscript ? (
                  <p className="text-xs text-rose-200">
                    <span className="font-semibold text-rose-400 mr-1.5">A capturar:</span>
                    <span className="italic">"{interimTranscript}"</span>
                  </p>
                ) : (
                  <p className="text-xs text-rose-300/70 italic">
                    🎙️ Fale ao microfone... As frases finalizadas são inseridas no campo abaixo.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Text Area */}
          <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] flex flex-col">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              spellCheck={false}
              placeholder={isListening ? "O texto ditado aparecerá aqui..." : "Cole ou digite seu texto aqui, ou clique no microfone para ditar, ou arraste um arquivo (.pdf, .docx, .md, .txt)..."}
              className="w-full flex-1 p-2 bg-transparent text-white/90 placeholder:text-white/20 text-lg font-light leading-relaxed focus:outline-none resize-none"
            />

            {/* Drag & drop helper notice when empty */}
            {!sourceText && !isDragOver && !isListening && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-600 text-xs gap-1 opacity-60">
                <span className="text-lg">📥</span>
                <span>Arraste um documento ou clique no microfone 🎙️ para falar</span>
              </div>
            )}

            {isDragOver && (
              <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center text-cyan-300 gap-2 z-10">
                <Sparkles className="w-8 h-8 animate-bounce" />
                <p className="text-sm font-semibold">Solte o arquivo para carregar e traduzir</p>
              </div>
            )}
          </div>

          {/* Left Window Bottom Toolbar (Borderless icon buttons) */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
            <div className="flex items-center gap-1">
              {/* Mic Speech Button */}
              <button
                onClick={toggleMic}
                title={isListening ? 'Parar gravação de voz' : 'Digitar por voz (Microfone)'}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex items-center gap-1.5 ${
                  isListening 
                    ? 'text-rose-400 bg-rose-500/20 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse' 
                    : 'text-[#D3E2F1]/60 hover:text-[#D3E2F1]'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
                {isListening && <span className="text-[11px] font-semibold text-rose-300 hidden sm:inline">Gravando</span>}
              </button>

              {/* TTS Listen Source Button */}
              <button
                onClick={() => handleTTS(sourceText, sourceLang === 'auto' ? (detectedLang || 'en') : sourceLang, true)}
                disabled={!sourceText}
                title={isSpeakingSource ? 'Parar leitura de áudio' : 'Ouvir pronúncia original (TTS)'}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30 flex items-center gap-1 ${
                  isSpeakingSource 
                    ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_15px_rgba(56,189,248,0.3)]' 
                    : 'text-[#D3E2F1]/60 hover:text-[#D3E2F1]'
                }`}
              >
                {isSpeakingSource ? <VolumeX className="w-4 h-4 animate-bounce" /> : <Volume2 className="w-4 h-4" />}
                {isSpeakingSource && <span className="text-[10px] text-cyan-300 font-mono animate-pulse">Lendo...</span>}
              </button>

              {/* TTS Speed Selector */}
              <button
                onClick={() => setTtsSpeed((prev) => (prev === 1.0 ? 1.2 : prev === 1.2 ? 0.8 : 1.0))}
                title="Velocidade da voz TTS (0.8x, 1.0x, 1.2x)"
                className="px-2 py-1 rounded-lg text-[10px] font-mono font-medium text-[#D3E2F1]/50 hover:text-[#D3E2F1] bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                {ttsSpeed}x
              </button>

              {/* Copy Source Button */}
              <button
                onClick={() => copyToClipboard(sourceText, true)}
                disabled={!sourceText}
                title="Copiar texto original"
                className="p-2 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30"
              >
                {copiedSource ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Clear Button */}
            {sourceText && (
              <button
                onClick={onClear}
                title="Limpar texto (Ctrl+K)"
                className="p-2 rounded-xl text-[#D3E2F1]/50 hover:text-rose-400 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>


        {/* Mobile Swap Button (Visible on mobile screens) */}
        <div className="flex md:hidden justify-center my-1">
          <button
            onClick={onSwapLanguages}
            className="p-3 rounded-full glass-panel border border-cyan-500/40 text-cyan-400 bg-slate-950/90 shadow-lg"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>


        {/* ================= RIGHT WINDOW (TEXTO TRADUZIDO) ================= */}
        <div className="relative flex flex-col rounded-2xl bg-white/[0.06] backdrop-blur-2xl p-5 border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-300">
          {/* Subtle top reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1px] reflection-line opacity-50" />

          {/* Right Window Header Toolbar */}
          <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-white/10 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[#D3E2F1]/60 font-medium">Para:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as Language)}
                className="bg-black/60 text-[#D3E2F1] text-[14px] font-lora px-3 py-1.5 rounded-xl border border-white/15 focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
              >
                <option value="pt" className="bg-[#0e1017] text-[#D3E2F1]">Português (BR)</option>
                <option value="en" className="bg-[#0e1017] text-[#D3E2F1]">Inglês (EN)</option>
              </select>
            </div>

            {/* Style Chips (Fluído, Formal, Literal, Criativo) */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              {(['fluid', 'formal', 'literal', 'creative'] as TranslationStyle[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStyle(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    style === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'fluid' ? 'Fluído' : st === 'formal' ? 'Formal' : st === 'literal' ? 'Literal' : 'Criativo'}
                </button>
              ))}
            </div>
          </div>

          {/* Translated Content Display Area */}
          <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] overflow-y-auto pr-1">
            {isTranslating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-cyan-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs font-medium animate-pulse">Traduzindo e formatando texto em tempo real...</p>
              </div>
            ) : translatedText ? (
              viewMode === 'formatted' ? (
                <div className="prose prose-invert prose-sm max-w-none text-lg font-light text-white/90 leading-relaxed">
                  <Markdown>{translatedText}</Markdown>
                </div>
              ) : (
                <textarea
                  readOnly
                  value={translatedText}
                  spellCheck={false}
                  className="w-full h-full p-2 bg-transparent text-white/80 text-base font-mono leading-relaxed focus:outline-none resize-none"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs gap-2">
                <Wand2 className="w-8 h-8 opacity-40 text-slate-500" />
                <p>A tradução aparecerá aqui automaticamente em tempo real.</p>
              </div>
            )}
          </div>

          {/* Key Terms Popover Drawer if present */}
          {showKeyTerms && keyTerms.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-cyan-300 font-semibold">
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Glossário de Termos Principais</span>
                <button onClick={() => setShowKeyTerms(false)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {keyTerms.map((kt, i) => (
                  <div key={i} className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <p className="font-semibold text-white">{kt.term} → <span className="text-cyan-400">{kt.translation}</span></p>
                    {kt.explanation && <p className="text-[10px] text-slate-400 mt-0.5">{kt.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Window Bottom Toolbar */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
            <div className="flex items-center gap-1">
              {/* View Mode Toggle (Formatted vs Raw) */}
              <button
                onClick={() => setViewMode(viewMode === 'formatted' ? 'raw' : 'formatted')}
                title={viewMode === 'formatted' ? 'Ver Texto Puro' : 'Ver Texto Formatado (Markdown)'}
                className="p-2 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95"
              >
                {viewMode === 'formatted' ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              {/* TTS Listen Target Button */}
              <button
                onClick={() => handleTTS(translatedText, targetLang, false)}
                disabled={!translatedText}
                title={isSpeakingTarget ? 'Parar leitura de áudio' : 'Ouvir tradução (TTS)'}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30 flex items-center gap-1 ${
                  isSpeakingTarget 
                    ? 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_15px_rgba(56,189,248,0.3)]' 
                    : 'text-[#D3E2F1]/60 hover:text-[#D3E2F1]'
                }`}
              >
                {isSpeakingTarget ? <VolumeX className="w-4 h-4 animate-bounce" /> : <Volume2 className="w-4 h-4" />}
                {isSpeakingTarget && <span className="text-[10px] text-cyan-300 font-mono animate-pulse">Lendo...</span>}
              </button>

              {/* Copy Target Button */}
              <button
                onClick={() => copyToClipboard(translatedText, false)}
                disabled={!translatedText}
                title="Copiar tradução"
                className="p-2 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30"
              >
                {copiedTarget ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Key Terms Glossar Badge Button */}
              {keyTerms.length > 0 && (
                <button
                  onClick={() => setShowKeyTerms(!showKeyTerms)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/15 text-[#D3E2F1]/80 text-[11px] font-medium hover:bg-white/10 transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#D3E2F1]/70" /> Termos ({keyTerms.length})
                </button>
              )}
            </div>

            {/* Download Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={!translatedText}
                title="Baixar Tradução"
                className="p-2 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-30"
              >
                <Download className="w-4 h-4" />
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 bottom-10 z-40 w-44 glass-panel rounded-xl border border-white/20 p-1.5 shadow-2xl bg-slate-900/95 space-y-1 text-xs">
                  <button
                    onClick={() => handleDownload('txt')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-slate-200 hover:bg-white/10 flex items-center justify-between"
                  >
                    <span>Texto (.txt)</span>
                    <FileDown className="w-3.5 h-3.5 text-[#D3E2F1]/50" />
                  </button>
                  <button
                    onClick={() => handleDownload('md')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-slate-200 hover:bg-white/10 flex items-center justify-between"
                  >
                    <span>Markdown (.md)</span>
                    <FileDown className="w-3.5 h-3.5 text-[#D3E2F1]/50" />
                  </button>
                  <button
                    onClick={() => handleDownload('doc')}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-slate-200 hover:bg-white/10 flex items-center justify-between"
                  >
                    <span>Word (.doc)</span>
                    <FileDown className="w-3.5 h-3.5 text-[#D3E2F1]/50" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
