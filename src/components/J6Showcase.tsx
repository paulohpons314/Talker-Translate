import React, { useState } from 'react';
import { J6Icon } from './J6Icon';

// Vitrine das diferentes versões do ícone/logo J6 animado, para conferência
// visual das especificações antes do uso em produção (header, favicon, splash,
// indicador de atividade). Acessível via ?j6-showcase na URL.
export const J6Showcase: React.FC = () => {
  const [processing, setProcessing] = useState(false);

  const cards: Array<{ label: string; description: string; children: React.ReactNode }> = [
    {
      label: 'Micro',
      description: 'Selos, avatares, favicon (28px) — sem bloom, custo mínimo.',
      children: <J6Icon variant="micro" />,
    },
    {
      label: 'Header',
      description: 'Logo da barra de navegação (44px) — acelera ao processar.',
      children: <J6Icon variant="header" active={processing} />,
    },
    {
      label: 'Loading',
      description: 'Indicador de atividade (96px) — pulso rápido e contínuo.',
      children: <J6Icon variant="loading" active={processing} />,
    },
    {
      label: 'Hero',
      description: 'Splash / marketing (320px) — fidelidade máxima, paralaxe ao mouse.',
      children: <J6Icon variant="hero" active={processing} />,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-white px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-light tracking-widest uppercase mb-2">
          Totem <span className="font-medium text-[#D3E2F1]">J6</span>
        </h1>
        <p className="text-sm text-slate-400 mb-8 max-w-2xl">
          Vórtice orbital de plasma âmbar ao redor de um totem de resina transparente,
          ancorado no monograma "J6" — implementado em three.js seguindo o plano de
          construção (RoundedBoxGeometry + MeshPhysicalMaterial, partículas em shader,
          TextGeometry, PointLight + UnrealBloomPass).
        </p>

        <button
          onClick={() => setProcessing((p) => !p)}
          className="mb-10 px-4 py-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-xs uppercase tracking-wider"
        >
          {processing ? 'Desativar' : 'Simular'} atividade (isProcessing)
        </button>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-16">
          {cards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <div className="flex items-center justify-center" style={{ minHeight: 96 }}>
                {card.children}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium tracking-wide text-[#D3E2F1]">{card.label}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{card.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 p-10 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
          <J6Icon variant="hero" size={420} active={processing} />
          <p className="text-xs text-slate-500">Versão hero em destaque, tamanho livre via prop `size`.</p>
        </div>
      </div>
    </div>
  );
};
