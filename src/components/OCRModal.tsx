import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Upload, ArrowRight, Loader2, FileImage } from 'lucide-react';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitImage: (fileBase64: string, mimeType: string, fileName: string) => Promise<void>;
  isLoading: boolean;
}

export const OCRModal: React.FC<OCRModalProps> = ({
  isOpen,
  onClose,
  onSubmitImage,
  isLoading
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
        return;
      }
      setError('');
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione uma imagem.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        await onSubmitImage(base64String, selectedFile.type, selectedFile.name);
        setSelectedFile(null);
        setPreviewUrl(null);
        onClose();
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar imagem.');
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
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Reconhecimento de Imagem (OCR)</h3>
            <p className="text-xs text-slate-400">Extraia textos de fotos, capturas de tela ou documentos digitalizados</p>
          </div>
        </div>

        {/* Drop / Select zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-purple-400/60 bg-white/[0.02] hover:bg-purple-500/[0.05] cursor-pointer transition-all duration-300"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative w-full max-h-48 overflow-hidden rounded-xl border border-white/20">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white transition-opacity">
                Clique para trocar a imagem
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400 group-hover:text-purple-400 transition-colors" />
              <p className="text-xs font-medium text-slate-200">Clique ou arraste uma imagem aqui</p>
              <p className="text-[10px] text-slate-500 mt-1">Formatos suportados: PNG, JPG, WEBP</p>
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando OCR...
              </>
            ) : (
              <>
                Reconhecer & Traduzir <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
