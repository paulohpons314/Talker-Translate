import React, { useEffect, useRef, useState } from 'react';
import { createJ6Totem, J6Quality, J6TotemHandle } from '../three/createJ6Totem';

// Versões do ícone J6 para diferentes contextos de uso no app, conforme
// pedido: um totem "vivo" (three.js) que se adapta ao lugar onde aparece.
export type J6Variant = 'micro' | 'header' | 'hero' | 'loading';

interface J6IconProps {
  /** Preset de contexto de uso — cada um ajusta qualidade, tamanho e comportamento padrão. */
  variant?: J6Variant;
  /** Sobrescreve o tamanho (px) do quadrado do ícone. */
  size?: number;
  /** Eleva a intensidade do vórtice/pulso — ex.: ligar durante processamento ativo. */
  active?: boolean;
  /** Sobrescreve se o totem reage ao mouse (tilt de paralaxe). */
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
  title?: string;
}

interface VariantConfig {
  quality: J6Quality;
  defaultSize: number;
  interactive: boolean;
  baseIntensity: number;
  activeIntensity: number;
  bloom?: boolean;
}

const VARIANT_CONFIG: Record<J6Variant, VariantConfig> = {
  // Selo pequeno (favicon-like, chips, avatares) — sem bloom, custo mínimo.
  micro: { quality: 'low', defaultSize: 28, interactive: false, baseIntensity: 0.08, activeIntensity: 0.6, bloom: false },
  // Logo da barra de navegação — sutil em repouso, acelera durante o processamento.
  header: { quality: 'low', defaultSize: 44, interactive: false, baseIntensity: 0.15, activeIntensity: 0.95 },
  // Versão hero/splash — máxima fidelidade, com paralaxe de mouse.
  hero: { quality: 'high', defaultSize: 320, interactive: true, baseIntensity: 0.25, activeIntensity: 1 },
  // Indicador de atividade (ex.: traduzindo) — sempre "respirando" rápido.
  loading: { quality: 'medium', defaultSize: 96, interactive: false, baseIntensity: 0.55, activeIntensity: 1 },
};

export const J6Icon: React.FC<J6IconProps> = ({
  variant = 'header',
  size,
  active = false,
  interactive,
  className,
  onClick,
  title = 'J6',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<J6TotemHandle | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const config = VARIANT_CONFIG[variant];
  const resolvedSize = size ?? config.defaultSize;
  const resolvedInteractive = interactive ?? config.interactive;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    let handle: J6TotemHandle | null = null;
    try {
      handle = createJ6Totem(container, {
        quality: config.quality,
        bloom: config.bloom,
        interactive: resolvedInteractive,
        autoRotate: true,
        intensity: config.baseIntensity,
      });
    } catch (err) {
      console.warn('J6Icon: WebGL indisponível neste dispositivo, usando selo estático.', err);
      setWebglFailed(true);
      return;
    }

    handleRef.current = handle;
    handle.setPaused(!!reduceMotionQuery?.matches);

    const handleMotionChange = (event: MediaQueryListEvent) => handle?.setPaused(event.matches);
    reduceMotionQuery?.addEventListener?.('change', handleMotionChange);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) handle?.setSize(width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      reduceMotionQuery?.removeEventListener?.('change', handleMotionChange);
      handle?.dispose();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, config.quality, config.bloom, resolvedInteractive]);

  useEffect(() => {
    handleRef.current?.setIntensity(active ? config.activeIntensity : config.baseIntensity);
  }, [active, config.activeIntensity, config.baseIntensity]);

  if (webglFailed) {
    return (
      <J6StaticBadge
        size={resolvedSize}
        active={active}
        className={className}
        onClick={onClick}
        title={title}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={className}
      role="img"
      aria-label={title}
      style={{
        width: resolvedSize,
        height: resolvedSize,
        cursor: onClick ? 'pointer' : undefined,
      }}
    />
  );
};

// Fallback sem WebGL: mesma identidade (halo âmbar + monograma), em CSS puro.
const J6StaticBadge: React.FC<{
  size: number;
  active: boolean;
  className?: string;
  onClick?: () => void;
  title: string;
}> = ({ size, active, className, onClick, title }) => (
  <div
    onClick={onClick}
    role="img"
    aria-label={title}
    className={className}
    style={{
      width: size,
      height: size,
      cursor: onClick ? 'pointer' : undefined,
      borderRadius: size * 0.28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 45%, rgba(255,178,61,0.9), rgba(60,38,10,0.9) 70%)',
      boxShadow: active
        ? '0 0 18px 4px rgba(255,164,44,0.55)'
        : '0 0 10px 2px rgba(255,164,44,0.3)',
      border: '1px solid rgba(255,225,170,0.35)',
      transition: 'box-shadow 300ms ease',
    }}
  >
    <span
      style={{
        fontFamily: 'Georgia, serif',
        fontWeight: 700,
        fontSize: size * 0.4,
        color: '#3a1f05',
        textShadow: '0 0 6px rgba(255,220,160,0.8)',
      }}
    >
      J6
    </span>
  </div>
);
