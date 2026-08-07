import React from 'react';
import { Keyboard, X, ArrowLeftRight, Trash2, Zap, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      keyCombo: ['Ctrl', 'Enter'],
      macCombo: ['⌘', 'Enter'],
      label: 'Traduzir Imediatamente',
      description: 'Força a execução da tradução do texto em tempo real sem aguardar.',
      icon: <Zap className="w-4 h-4 text-[#D3E2F1]/80" />
    },
    {
      keyCombo: ['Ctrl', 'S'],
      macCombo: ['⌘', 'S'],
      label: 'Inverter Idiomas & Textos',
      description: 'Troca a posição do idioma de origem e destino, alternando os textos.',
      icon: <ArrowLeftRight className="w-4 h-4 text-[#D3E2F1]/80" />
    },
    {
      keyCombo: ['Ctrl', 'K'],
      macCombo: ['⌘', 'K'],
      label: 'Limpar Todos os Campos',
      description: 'Esvazia a caixa de texto de origem, texto traduzido e vocabulário.',
      icon: <Trash2 className="w-4 h-4 text-[#D3E2F1]/80" />
    },
    {
      keyCombo: ['?'],
      macCombo: ['?'],
      label: 'Abrir Guia de Atalhos',
      description: 'Exibe este painel de atalhos rápidos de teclado.',
      icon: <Keyboard className="w-4 h-4 text-[#D3E2F1]/80" />
    }
  ];

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0f111a] border border-white/20 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] glass-panel-active">
        {/* Reflection beam */}
        <div className="absolute top-0 left-0 right-0 h-[1px] reflection-line opacity-70" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/15 text-[#D3E2F1]/80">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-wide">Atalhos de Teclado</h3>
              <p className="text-xs text-white/50">Navegue e controle o tradutor com mais agilidade</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-3 mb-6">
          {shortcuts.map((sc, i) => {
            const combo = isMac ? sc.macCombo : sc.keyCombo;
            return (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    {sc.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white/90">{sc.label}</h4>
                    <p className="text-[11px] text-white/40">{sc.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {combo.map((k, idx) => (
                    <kbd
                      key={idx}
                      className="px-2 py-1 rounded-md bg-white/10 border border-white/20 text-white font-mono text-[11px] font-bold shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-white/40 pt-3 border-t border-white/10">
          <span className="flex items-center gap-1 text-[11px]">
            <Command className="w-3 h-3 text-cyan-400" /> Atalhos habilitados globalmente
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
