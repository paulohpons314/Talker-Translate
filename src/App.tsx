import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { TranslationPanel } from './components/TranslationPanel';
import { QuoteTicker } from './components/QuoteTicker';
import { GeminiAssistant } from './components/GeminiAssistant';
import { FileModal } from './components/FileModal';
import { WebLinkModal } from './components/WebLinkModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { OCRModal } from './components/OCRModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Language, TranslationStyle, KeyTerm } from './types';
import { Sparkles, Command, Check } from 'lucide-react';

export default function App() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<Language>('auto');
  const [targetLang, setTargetLang] = useState<Language>('pt');
  const [detectedLang, setDetectedLang] = useState<Language>('en');
  const [style, setStyle] = useState<TranslationStyle>('fluid');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isProcessingSource, setIsProcessingSource] = useState(false);
  const [keyTerms, setKeyTerms] = useState<KeyTerm[]>([]);
  const [activeSourceType, setActiveSourceType] = useState<string>('text');

  // Modal Visibility States
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isWebLinkModalOpen, setIsWebLinkModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Shortcut Toast Banner State
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (msg: string) => {
    setShortcutToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShortcutToast(null);
    }, 2000);
  };

  // Client-side cache for translations to avoid hitting 15 RPM limit
  const translationCacheRef = useRef<Record<string, { translatedText: string; detectedLanguage?: Language; keyTerms?: KeyTerm[] }>>({});

  // Load initial cache from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('talker_trans_cache');
      if (saved) {
        translationCacheRef.current = JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const saveCache = (key: string, data: { translatedText: string; detectedLanguage?: Language; keyTerms?: KeyTerm[] }) => {
    try {
      translationCacheRef.current[key] = data;
      // Keep max 100 entries in cache
      const keys = Object.keys(translationCacheRef.current);
      if (keys.length > 100) {
        delete translationCacheRef.current[keys[0]];
      }
      sessionStorage.setItem('talker_trans_cache', JSON.stringify(translationCacheRef.current));
    } catch (e) {
      // ignore
    }
  };

  const lastRequestedRef = useRef<string>('');

  // Immediate Translate Function
  const handleImmediateTranslate = useCallback(async (overrideText?: string) => {
    const textToTranslate = overrideText !== undefined ? overrideText : sourceText;
    const trimmed = textToTranslate.trim();

    if (!trimmed || trimmed.length < 2) {
      setTranslatedText('');
      setKeyTerms([]);
      setIsTranslating(false);
      return;
    }

    const requestSignature = `${sourceLang}:${targetLang}:${style}:${trimmed}`;

    // Check local cache first
    const cached = translationCacheRef.current[requestSignature];
    if (cached) {
      setTranslatedText(cached.translatedText);
      if (cached.detectedLanguage) setDetectedLang(cached.detectedLanguage);
      if (cached.keyTerms) setKeyTerms(cached.keyTerms);
      lastRequestedRef.current = requestSignature;
      setIsTranslating(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          sourceLang,
          targetLang,
          style,
          preserveFormatting: true,
        }),
      });

      const data = await response.json();
      if (response.ok && data.translatedText !== undefined) {
        setTranslatedText(data.translatedText);
        lastRequestedRef.current = requestSignature;
        const detLang = data.detectedLanguage as Language | undefined;
        if (detLang) {
          setDetectedLang(detLang);
        }
        if (data.keyTerms) {
          setKeyTerms(data.keyTerms);
        }

        // Save to cache
        saveCache(requestSignature, {
          translatedText: data.translatedText,
          detectedLanguage: detLang,
          keyTerms: data.keyTerms,
        });
      } else if (response.status === 429 || data.isQuotaError) {
        triggerToast('⚠️ Cota da API Gemini (15 req/min) atingida. Aguarde ~30s...');
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, style]);

  // Real-time Translation Debounce Effect
  useEffect(() => {
    const trimmed = sourceText.trim();

    if (!trimmed || trimmed.length < 2) {
      setTranslatedText('');
      setKeyTerms([]);
      setIsTranslating(false);
      lastRequestedRef.current = '';
      return;
    }

    const currentSignature = `${sourceLang}:${targetLang}:${style}:${trimmed}`;
    if (currentSignature === lastRequestedRef.current) {
      return;
    }

    // Check if it's already in cache -> display instantly!
    const cached = translationCacheRef.current[currentSignature];
    if (cached) {
      setTranslatedText(cached.translatedText);
      if (cached.detectedLanguage) setDetectedLang(cached.detectedLanguage);
      if (cached.keyTerms) setKeyTerms(cached.keyTerms);
      lastRequestedRef.current = currentSignature;
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 1200ms debounce to avoid rapid API calls and stay well under 15 RPM
    debounceTimerRef.current = setTimeout(() => {
      handleImmediateTranslate();
    }, 1200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [sourceText, sourceLang, targetLang, style, handleImmediateTranslate]);

  // Swap Languages & Text
  const handleSwapLanguages = useCallback(() => {
    const newSource = translatedText;
    const newTranslated = sourceText;
    setSourceText(newSource);
    setTranslatedText(newTranslated);

    if (sourceLang !== 'auto') {
      const prevSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(prevSource);
    } else {
      setSourceLang(targetLang);
      setTargetLang(detectedLang || 'en');
    }
  }, [translatedText, sourceText, sourceLang, targetLang, detectedLang]);

  const handleClear = useCallback(() => {
    setSourceText('');
    setTranslatedText('');
    setKeyTerms([]);
    setActiveSourceType('text');
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isControlOrCmd = e.ctrlKey || e.metaKey;
      const targetElement = e.target as HTMLElement;
      const targetTag = targetElement?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      // 1. Ctrl/Cmd + Enter -> Immediate Translation
      if (isControlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        if (sourceText.trim()) {
          handleImmediateTranslate(sourceText);
          triggerToast('Tradução instantânea (Ctrl+Enter)');
        }
        return;
      }

      // 2. Ctrl/Cmd + S -> Swap Languages
      if (isControlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSwapLanguages();
        triggerToast('Idiomas e textos invertidos (Ctrl+S)');
        return;
      }

      // 3. Ctrl/Cmd + K -> Clear Fields
      if (isControlOrCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleClear();
        triggerToast('Campos limpos (Ctrl+K)');
        return;
      }

      // 4. ? key (when not editing input) or Ctrl + / -> Shortcuts Legend
      if ((e.key === '?' && !isInput) || (isControlOrCmd && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sourceText, handleImmediateTranslate, handleSwapLanguages, handleClear]);

  // Process File Upload
  const handleProcessFile = async (fileBase64: string, mimeType: string, fileName: string) => {
    setIsProcessingSource(true);
    setActiveSourceType('file');
    try {
      const res = await fetch('/api/process-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, mimeType, fileName, targetLang }),
      });
      const data = await res.json();
      if (data.originalText) setSourceText(data.originalText);
      if (data.translatedText) setTranslatedText(data.translatedText);
    } catch (err) {
      console.error('Error processing file:', err);
    } finally {
      setIsProcessingSource(false);
    }
  };

  // Process Direct File Drop
  const handleDirectDropFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = (reader.result as string).split(',')[1];
      await handleProcessFile(base64String, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Process Web Link
  const handleProcessWebLink = async (url: string) => {
    setIsProcessingSource(true);
    setActiveSourceType('url');
    try {
      const res = await fetch('/api/process-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, targetLang }),
      });
      const data = await res.json();
      if (data.originalText) setSourceText(data.originalText);
      if (data.translatedText) setTranslatedText(data.translatedText);
    } catch (err) {
      console.error('Error processing link:', err);
      throw err;
    } finally {
      setIsProcessingSource(false);
    }
  };

  // Process Google Drive Selection
  const handleSelectDriveDoc = (content: string, title: string) => {
    setActiveSourceType('drive');
    setSourceText(content);
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0c] text-white font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Ambient Radial Frosted Glass Spots */}
      <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none ambient-spot-1" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/15 rounded-full blur-[150px] pointer-events-none ambient-spot-2" />

      <div>
        {/* Header Navigation */}
        <Header
          onOpenFileModal={() => setIsFileModalOpen(true)}
          onOpenWebLinkModal={() => setIsWebLinkModalOpen(true)}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          onOpenOCRModal={() => setIsOCRModalOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          isProcessing={isTranslating || isProcessingSource}
          activeSourceType={activeSourceType}
          onResetToText={() => setActiveSourceType('text')}
        />

        {/* Looping Quotes Visual Ticker */}
        <QuoteTicker isVisible={isTranslating || isProcessingSource || sourceText.length > 0} />

        {/* Main Dual-Window Translation Side-by-Side View */}
        <main className="container mx-auto px-2 py-2">
          <TranslationPanel
            sourceText={sourceText}
            setSourceText={(t) => {
              setSourceText(t);
              setActiveSourceType('text');
            }}
            translatedText={translatedText}
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            detectedLang={detectedLang}
            style={style}
            setStyle={setStyle}
            isTranslating={isTranslating || isProcessingSource}
            onSwapLanguages={handleSwapLanguages}
            onClear={handleClear}
            keyTerms={keyTerms}
            onFileUpload={handleDirectDropFile}
          />

          {/* Interactive Gemini Assistant Drawer / Prompt Bar */}
          <GeminiAssistant
            sourceText={sourceText}
            translatedText={translatedText}
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 px-6 border-t border-white/5 bg-black/40 backdrop-blur-md text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span>Talker Translate — Tradutor Inteligente EN-PT & PT-EN</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>Desenvolvido com</span>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 inline" />
          <span>Google Gemini AI Engine</span>
        </div>
      </footer>

      {/* Modals for Sources */}
      <FileModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        onSubmitFile={handleProcessFile}
        isLoading={isProcessingSource}
      />

      <WebLinkModal
        isOpen={isWebLinkModalOpen}
        onClose={() => setIsWebLinkModalOpen(false)}
        onSubmitUrl={handleProcessWebLink}
        isLoading={isProcessingSource}
      />

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSelectSampleDoc={handleSelectDriveDoc}
      />

      <OCRModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        onSubmitImage={handleProcessFile}
        isLoading={isProcessingSource}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Floating Shortcut Toast Notification */}
      {shortcutToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-[0_0_25px_rgba(56,189,248,0.3)] animate-fadeIn">
          <Command className="w-4 h-4 text-cyan-400" />
          <span>{shortcutToast}</span>
        </div>
      )}
    </div>
  );
}
