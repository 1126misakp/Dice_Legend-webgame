
import React from 'react';
import { DiceResult, FANTASY_SYMBOLS, FANTASY_COLORS } from '../types';

interface ResultPanelProps {
  result: DiceResult | null;
  visible: boolean;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, visible }) => {
  if (!visible || !result) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-in-up">
      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
        <h2 className="text-xl font-bold text-amber-600 tracking-wider font-serif">战斗裁决</h2>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs uppercase font-bold">幸运值</span>
                <span className="text-2xl font-mono font-bold text-emerald-600">{result.luckyValue}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs uppercase font-bold">命运点数</span>
                <span className="text-2xl font-mono font-bold text-slate-800">{result.destinyPoint}</span>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Race */}
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="w-12 h-12 flex items-center justify-center text-3xl bg-white rounded-full border border-slate-200 shadow-sm">
                {result.race?.char}
            </div>
            <div>
                <div className="text-xs text-slate-400 uppercase font-bold">主宰种族</div>
                <div className="text-lg font-bold" style={{ color: result.race?.color }}>
                    {result.race?.name}
                </div>
            </div>
        </div>

        {/* Attributes Grid */}
        <div>
            <div className="text-xs text-slate-400 uppercase font-bold mb-2">属性统计</div>
            <div className="grid grid-cols-3 gap-2">
                {FANTASY_SYMBOLS.map((sym) => {
                    const count = result.attributes[sym.name] || 0;
                    return (
                        <div key={sym.name} className={`flex items-center gap-2 p-2 rounded-lg border ${count > 0 ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                            <span className="text-lg filter drop-shadow-sm">{sym.char}</span>
                            <span className="font-bold text-slate-700 text-sm">{sym.name} <span className="ml-1 text-xs opacity-70">x{count}</span></span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Color Resonance */}
        <div>
            <div className="text-xs text-slate-400 uppercase font-bold mb-2">元素共鸣</div>
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
                            <span className={`text-xs font-mono ${count > 0 ? 'text-slate-800 font-bold' : 'text-slate-300'}`}>
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
