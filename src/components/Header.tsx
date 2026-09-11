import React from 'react';
import {
  Sparkles,
  FileText,
  Globe,
  Cloud,
  Image as ImageIcon,
  Zap,
  Keyboard
} from 'lucide-react';
import { J6Icon } from './J6Icon';

interface HeaderProps {
  onOpenFileModal: () => void;
  onOpenWebLinkModal: () => void;
  onOpenDriveModal: () => void;
  onOpenOCRModal: () => void;
  onOpenShortcutsModal: () => void;
  isProcessing: boolean;
  activeSourceType: string;
  onResetToText: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFileModal,
  onOpenWebLinkModal,
  onOpenDriveModal,
  onOpenOCRModal,
  onOpenShortcutsModal,
  isProcessing,
  activeSourceType,
  onResetToText
}) => {
  return (
    <header className="relative z-20 w-full px-4 sm:px-8 py-4 mb-2 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 bg-black/30 backdrop-blur-md">
      {/* Reflection beam */}
      <div className="absolute top-0 left-0 right-0 h-[1px] reflection-line opacity-70" />

      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div
          onClick={onResetToText}
          title="J6 — voltar ao modo texto"
          className="cursor-pointer group relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white/30 overflow-hidden"
        >
          <J6Icon variant="header" size={40} active={isProcessing} />
          <span className="absolute inset-0 rounded-xl bg-white/5 blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-light tracking-widest uppercase text-white/90">
              Talker<span className="font-medium text-[#D3E2F1]">Translate</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/15 text-[#D3E2F1]/80 font-mono">
              <Zap className="w-3 h-3 text-[#D3E2F1]/70 animate-pulse" /> Gemini Realtime
            </span>
          </div>
          <div className="h-[1px] w-12 bg-white/30 mt-1 shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
        </div>
      </div>

      {/* Borderless Icon Toolbar */}
      <div className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-inner">
        <span className="text-[11px] uppercase tracking-wider text-[#D3E2F1]/50 font-medium px-2 hidden lg:inline">
          Fontes:
        </span>

        {/* Upload File Button */}
        <button
          onClick={onOpenFileModal}
          title="Upload de Arquivo (PDF, DOCX, MD, TXT)"
          className={`group relative p-2.5 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95 ${
            activeSourceType === 'file' ? 'text-[#D3E2F1] bg-white/10 border border-white/20' : ''
          }`}
        >
          <FileText className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/90 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none border border-white/10 z-50">
            Documento (.pdf, .docx, .md, .txt)
          </span>
        </button>

        {/* WebLink Button */}
        <button
          onClick={onOpenWebLinkModal}
          title="Traduzir da Web (Link URL)"
          className={`group relative p-2.5 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95 ${
            activeSourceType === 'url' ? 'text-[#D3E2F1] bg-white/10 border border-white/20' : ''
          }`}
        >
          <Globe className="w-5 h-5 transition-transform duration-200 group-hover:rotate-45" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/90 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none border border-white/10 z-50">
            WebLink (URL)
          </span>
        </button>

        {/* Google Drive Button */}
        <button
          onClick={onOpenDriveModal}
          title="Conectar ao Google Drive"
          className={`group relative p-2.5 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95 ${
            activeSourceType === 'drive' ? 'text-[#D3E2F1] bg-white/10 border border-white/20' : ''
          }`}
        >
          <Cloud className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/90 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none border border-white/10 z-50">
            Google Drive
          </span>
        </button>

        {/* OCR Image Button */}
        <button
          onClick={onOpenOCRModal}
          title="Reconhecer texto em Imagem (OCR)"
          className={`group relative p-2.5 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95 ${
            activeSourceType === 'image' ? 'text-[#D3E2F1] bg-white/10 border border-white/20' : ''
          }`}
        >
          <ImageIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/90 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none border border-white/10 z-50">
            Imagem OCR
          </span>
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

        {/* Shortcuts Guide Button */}
        <button
          onClick={onOpenShortcutsModal}
          title="Atalhos de Teclado (Ctrl+Enter, Ctrl+S, Ctrl+K)"
          className="group relative p-2.5 rounded-xl text-[#D3E2F1]/60 hover:text-[#D3E2F1] transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <Keyboard className="w-5 h-5 transition-transform duration-200 group-hover:rotate-6" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/90 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none border border-white/10 z-50">
            Atalhos de Teclado (?)
          </span>
        </button>
      </div>

      {/* AI Processing Status */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all duration-300 ${
          isProcessing 
            ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
          {isProcessing ? 'Traduzindo com Gemini...' : 'Pronto para traduzir'}
        </div>
      </div>
    </header>
  );
};
