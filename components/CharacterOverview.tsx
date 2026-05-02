
import React from 'react';
import { CharacterInfo } from '../types';
import { User, Shield, Sparkles, Wand2 } from 'lucide-react';

interface Props {
  info: CharacterInfo | null;
  loading: boolean;
}

const CharacterOverview: React.FC<Props> = ({ info, loading }) => {
  if (loading) return (
    <div className="bg-white/80 backdrop-blur-xl border border-indigo-200 rounded-2xl p-6 w-full animate-pulse shadow-xl">
        <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-full"></div>
            <div className="h-4 bg-slate-100 rounded w-2/3"></div>
        </div>
    </div>
  );

  if (!info) return null;

  const rarityColor: Record<string, string> = {
    'UR': 'text-orange-500',
    'SSR': 'text-pink-600',
    'SR': 'text-purple-600',
    'R': 'text-blue-500'
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-6 w-full shadow-xl animate-fade-in text-slate-800">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`text-2xl font-black italic tracking-tighter ${rarityColor[info.rarity]}`}>{info.rarity}</h3>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{info.title}</div>
        </div>
        <div className="px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 text-xs font-bold border border-indigo-100">
          纹章传说 · 契约
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <User size={24} />
            </div>
            <div>
                <div className="text-xl font-bold text-slate-900">{info.name}</div>
                <div className="text-xs text-slate-500 flex gap-2">
                    <span>性别：{info.gender}</span>
                    <span>年龄：{info.age}</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            {/* Profession spans 2 columns to accommodate potentially long names */}
            <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Shield size={10} /> 职业
                </div>
                <div className="text-sm font-bold text-indigo-700">{info.profession}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Sparkles size={10} /> 种族
                </div>
                <div className="text-sm font-bold text-amber-700">{info.race}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Wand2 size={10} /> 属性
                </div>
                <div className="text-sm font-bold text-cyan-700">{info.attribute}</div>
            </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed italic">
                “{info.description}”
            </p>
        </div>
      </div>
    </div>
  );
};

export default CharacterOverview;
