
import React from 'react';
import { DiceResult, FANTASY_SYMBOLS, FANTASY_COLORS } from '../types';

interface ResultPanelProps {
  result: DiceResult | null;
  visible: boolean;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, visible }) => {
  if (!visible || !result) return null;

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-amber-300/45 p-4 md:p-5 w-full max-w-md shadow-[0_18px_55px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.2)] animate-fade-in-up bg-[#f3ddb1]/92 bg-[url('/ui/parchment-panel.png')] bg-cover bg-center text-[#2b1a10]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.52),transparent_35%),linear-gradient(180deg,rgba(84,46,13,0.06),rgba(22,14,8,0.13))]" />
      <div className="relative flex items-start justify-between gap-3 mb-4 border-b border-amber-900/20 pb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-900/55">Astrology Verdict</div>
          <h2 className="text-lg md:text-xl font-black text-[#71410f] tracking-wider font-serif shrink-0">占星裁决页</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-950/10 border border-emerald-800/25 px-2.5 py-1.5 text-right shadow-inner">
                <span className="block text-emerald-900/65 text-[10px] uppercase font-black leading-none">幸运值</span>
                <span className="text-xl md:text-2xl font-mono font-black text-emerald-800 leading-tight">{result.luckyValue}</span>
            </div>
            <div className="rounded-lg bg-sky-950/10 border border-sky-900/20 px-2.5 py-1.5 text-right shadow-inner">
                <span className="block text-sky-950/55 text-[10px] uppercase font-black leading-none">命运点数</span>
                <span className="text-xl md:text-2xl font-mono font-black text-sky-950 leading-tight">{result.destinyPoint}</span>
            </div>
        </div>
      </div>

      <div className="relative space-y-3 md:space-y-4">
        {/* 种族结果 */}
        <div className="flex items-center gap-3 md:gap-4 bg-[#1b2d4f]/10 p-3 rounded-xl border border-amber-900/20 shadow-inner">
            <div className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center text-2xl md:text-3xl bg-[#fff7df]/80 rounded-full border border-amber-700/25 shadow-sm shrink-0">
                {result.race?.char}
            </div>
            <div className="min-w-0">
                <div className="text-xs text-amber-950/50 uppercase font-black">主宰种族</div>
                <div
                    className="text-lg font-black truncate"
                    style={{ color: result.race?.color, textShadow: '0 1px 1px rgba(0,0,0,0.55), 0 0 10px rgba(255,255,255,0.35)' }}
                >
                    {result.race?.name}
                </div>
            </div>
        </div>

        {/* 属性网格 */}
        <div>
            <div className="text-xs text-amber-950/50 uppercase font-black mb-2">属性统计</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FANTASY_SYMBOLS.map((sym) => {
                    const count = result.attributes[sym.name] || 0;
                    return (
                        <div key={sym.name} className={`flex items-center gap-2 p-2 rounded-lg border min-w-0 ${count > 0 ? 'bg-[#12345e]/12 border-blue-900/20 shadow-sm' : 'bg-amber-100/35 border-amber-900/10 opacity-50'}`}>
                            <span className="text-lg filter drop-shadow-sm shrink-0">{sym.char}</span>
                            <span className="font-black text-[#38220f] text-sm truncate">{sym.name} <span className="ml-1 text-xs opacity-70">x{count}</span></span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* 元素共鸣 */}
        <div>
            <div className="text-xs text-amber-950/50 uppercase font-black mb-2">元素共鸣</div>
            <div className="flex justify-between px-2">
                {FANTASY_COLORS.map((color, idx) => {
                    const count = result.colors[idx.toString()] || 0;
                    return (
                        <div key={color} className="flex flex-col items-center gap-1">
                            <div 
                                className="w-4 h-4 rounded-full border border-black/10 shadow-sm transition-transform"
                                style={{ 
                                    backgroundColor: color,
                                    transform: count > 0 ? 'scale(1.2)' : 'scale(1)',
                                    opacity: count > 0 ? 1 : 0.2
                                }}
                            />
                            <span className={`text-xs font-mono ${count > 0 ? 'text-[#2b1a10] font-black' : 'text-amber-950/25'}`}>
                                {count}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPanel;
