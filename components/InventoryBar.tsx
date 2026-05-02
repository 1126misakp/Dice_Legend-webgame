
import React from 'react';
import { Inventory } from '../types';
import { ShieldCheck, Anchor, X, HelpCircle } from 'lucide-react';

interface Props {
  inventory: Inventory;
  activeFixedCount: number;
  activeWeightedCount: number;
  onCancelWeightedDice?: () => void;
}

const InventoryBar: React.FC<Props> = ({ inventory, activeFixedCount, activeWeightedCount, onCancelWeightedDice }) => {
  return (
    <div className="flex gap-4 p-3 bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl">
      {/* 刻印储备 */}
      <div className="relative flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <ShieldCheck size={20} />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
            刻印储备
            <div className="relative">
              <HelpCircle size={12} className="text-slate-400 cursor-help" />
              {/* 悬停提示 */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="font-bold mb-1">刻印储备</div>
                <div className="text-slate-300">在投掷前点击骰子可锁定其点数，下次投掷时该骰子不会重新投掷。每锁定一个骰子消耗1个刻印。</div>
                {/* 小三角 */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-slate-800">{inventory.crests} <span className="text-xs text-blue-500">/ {activeFixedCount} 激活</span></div>
        </div>
      </div>

      {/* 灌铅骰子 */}
      <div className="relative flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 shadow-inner group">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
          <Anchor size={20} />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
            灌铅骰子
            <div className="relative">
              <HelpCircle size={12} className="text-slate-400 cursor-help" />
              {/* 悬停提示 */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="font-bold mb-1">灌铅骰子</div>
                <div className="text-slate-300">在"缔结契约"阶段，长按骰子并拖拽可修改其朝上的面。每修改一个骰子消耗1个灌铅骰子。</div>
                {/* 小三角 */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-slate-800 flex items-center gap-2">
            {inventory.weightedDice} <span className="text-xs text-amber-500">/ {activeWeightedCount} 预设</span>
            {/* 取消按钮：仅在有激活的灌铅骰子时显示 */}
            {activeWeightedCount > 0 && onCancelWeightedDice && (
              <button
                onClick={onCancelWeightedDice}
                className="ml-1 w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-600 flex items-center justify-center transition-colors border border-red-200"
                title="取消所有灌铅骰子操作"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryBar;
