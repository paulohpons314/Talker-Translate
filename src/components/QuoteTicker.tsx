import React, { useState, useEffect } from 'react';
import { TRANSLATION_QUOTES } from '../data/quotes';
import { Quote, Sparkles } from 'lucide-react';

interface QuoteTickerProps {
  isVisible: boolean;
}

export const QuoteTicker: React.FC<QuoteTickerProps> = ({ isVisible }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Display each quote for 10 seconds with smooth fade transition
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % TRANSLATION_QUOTES.length);
        setIsFading(false);
      }, 700);
    }, 10000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const currentQuote = TRANSLATION_QUOTES[currentIndex];

  return (
    <div className="w-full max-w-5xl mx-auto my-3 px-4 transition-all duration-500 ease-in-out">
      <div className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 border border-white/15 bg-white/[0.03] backdrop-blur-xl shadow-inner">
        {/* Top subtle line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D3E2F1]/30 to-transparent" />

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 rounded-xl bg-white/5 border border-white/15 text-[#D3E2F1]/70 shrink-0">
            <Quote className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
          </div>

          <div className="flex-1 overflow-hidden">
            <div className={`transition-all duration-700 ease-in-out transform ${
              isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            }`}>
              <p className="text-[11px] font-lora uppercase tracking-[0.25em] text-[#D3E2F1]/70 italic line-clamp-2">
                "{currentQuote.quote}" — {currentQuote.author}
              </p>
            </div>
          </div>

          {/* Animated subtle pulse dots */}
          <div className="flex items-center gap-1.5 px-2 shrink-0 opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D3E2F1]/70 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#D3E2F1]/50 animate-ping delay-150" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#D3E2F1]/30 animate-ping delay-300" />
          </div>
        </div>
      </div>
    </div>
  );
};
