import React, { useState } from 'react';
import { Globe, X, ArrowRight, Loader2, Link2 } from 'lucide-react';

interface WebLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitUrl: (url: string) => Promise<void>;
  isLoading: boolean;
}

export const WebLinkModal: React.FC<WebLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmitUrl,
  isLoading
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Por favor, digite uma URL válida.');
      return;
    }
    setError('');
    try {
      await onSubmitUrl(url);
      setUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o link.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl p-6 border border-white/20 shadow-2xl bg-slate-900/90">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/15 text-[#D3E2F1]/80">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Traduzir da Web (WebLink)</h3>
            <p className="text-xs text-slate-400">Cole o link de uma página ou artigo para extração e tradução</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              URL da Página Web
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-600"
              />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Extraindo e Traduzindo...
                </>
              ) : (
                <>
                  Extrair & Traduzir <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
