import React, { useState } from 'react';
import { Cloud, X, FileText, Check, ArrowRight, ExternalLink } from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSampleDoc: (text: string, title: string) => void;
}

const SAMPLE_DRIVE_DOCS = [
  {
    id: 'doc-1',
    title: 'Research Paper - Artificial Intelligence & Language Translation.gdoc',
    type: 'Google Doc',
    updatedAt: 'Hoje, 14:20',
    content: `Artificial intelligence has revolutionized cross-lingual communication. Modern neural machine translation models, enhanced by generative transformers, excel not only at word substitution but at grasping contextual nuances, cultural idioms, and tone. The interplay between human translators and machine learning creates a collaborative ecosystem where language barriers vanish.`
  },
  {
    id: 'doc-2',
    title: 'International Business Contract - Executive Summary.gdoc',
    type: 'Google Doc',
    updatedAt: 'Ontem, 09:45',
    content: `Esta Proposta de Acordo Comercial estabelece as diretrizes globais para colaboração técnica, licenciamento de tecnologia e conformidade regulatória. Ambas as partes concordam em manter confidencialidade estrita referente aos algoritmos proprietários e dados de treinamento de IA.`
  },
  {
    id: 'doc-3',
    title: 'Technical Specification - API & Cloud Run Infrastructure.gdoc',
    type: 'Google Doc',
    updatedAt: '03 de Ago, 18:10',
    content: `This document outlines the architecture for real-time bidirectional translation services hosted on Google Cloud Run. Key service requirements include sub-second response latency, full-stack security proxying, resilient connection fallbacks, and server-side model execution using Gemini 3.6 Flash.`
  }
];

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onSelectSampleDoc
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState('');

  if (!isOpen) return null;

  const handleImport = () => {
    if (selectedId) {
      const doc = SAMPLE_DRIVE_DOCS.find((d) => d.id === selectedId);
      if (doc) {
        onSelectSampleDoc(doc.content, doc.title);
        onClose();
      }
    } else if (driveUrl.trim()) {
      // Custom Drive link simulated import
      onSelectSampleDoc(
        `[Conteúdo importado do Google Drive via Link: ${driveUrl}]\n\nLanguage translation bridges human consciousness across cultural borders. By enabling smooth communication, we foster global empathy, literary exchange, and scientific collaboration.`,
        'Documento do Google Drive'
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel rounded-2xl p-6 border border-white/20 shadow-2xl bg-slate-900/90">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/15 text-[#D3E2F1]/80">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Google Drive</h3>
            <p className="text-xs text-slate-400">Selecione um documento da sua conta ou informe o link compartilhado</p>
          </div>
        </div>

        {/* Sample Files Selection */}
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-medium text-slate-300">
            Documentos Recentes do seu Google Drive:
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {SAMPLE_DRIVE_DOCS.map((doc) => {
              const isSelected = selectedId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedId(doc.id);
                    setDriveUrl('');
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className={`w-5 h-5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <p className="text-xs font-medium truncate">{doc.title}</p>
                      <p className="text-[10px] text-slate-500">{doc.type} • Modificado em {doc.updatedAt}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Or Paste Drive Link */}
        <div className="pt-3 border-t border-white/10">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Ou cole um link público do Google Docs/Drive:
          </label>
          <input
            type="url"
            value={driveUrl}
            onChange={(e) => {
              setDriveUrl(e.target.value);
              setSelectedId(null);
            }}
            placeholder="https://docs.google.com/document/d/1..."
            className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-blue-400 placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedId && !driveUrl.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            Importar Documento <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
