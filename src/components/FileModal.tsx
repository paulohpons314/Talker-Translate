import React, { useState, useRef } from 'react';
import { FileText, X, Upload, ArrowRight, Loader2, FileCheck } from 'lucide-react';

interface FileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFile: (fileBase64: string, mimeType: string, fileName: string) => Promise<void>;
  isLoading: boolean;
}

export const FileModal: React.FC<FileModalProps> = ({
  isOpen,
  onClose,
  onSubmitFile,
  isLoading
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'md', 'txt'].includes(ext || '')) {
        setError('Por favor, escolha um arquivo nos formatos PDF, .docx, .md ou .txt');
        return;
      }
      setError('');
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        await onSubmitFile(base64String, selectedFile.type, selectedFile.name);
        setSelectedFile(null);
        onClose();
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o arquivo.');
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
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Upload de Documentos</h3>
            <p className="text-xs text-slate-400">Suporte completo para PDF, .docx, Markdown (.md) e Texto (.txt)</p>
          </div>
        </div>

        {/* Drop / Select zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-cyan-400/60 bg-white/[0.02] hover:bg-cyan-500/[0.05] cursor-pointer transition-all duration-300"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.md,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/40 text-cyan-300">
              <FileCheck className="w-6 h-6 text-cyan-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-semibold truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <p className="text-xs font-medium text-slate-200">Clique para selecionar seu arquivo</p>
              <p className="text-[10px] text-slate-500 mt-1">PDF, .DOCX, .MD, .TXT (máx 15MB)</p>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}

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
            onClick={handleSubmit}
            disabled={!selectedFile || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </>
            ) : (
              <>
                Enviar & Traduzir <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
