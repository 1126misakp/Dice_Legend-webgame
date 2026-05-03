
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
    <div className="flex flex-wrap justify-center gap-2 md:gap-4 p-2 md:p-3 bg-[#0b1630]/82 backdrop-blur-md border border-amber-300/35 rounded-2xl shadow-[0_14px_40px_rgba(0,0,0,0.42),inset_0_0_0_1px_rgba(255,255,255,0.08)] max-w-full">
      {/* 刻印储备 */}
      <div className="relative flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-[linear-gradient(135deg,rgba(23,37,84,0.92),rgba(12,20,39,0.94))] rounded-xl border border-blue-300/35 shadow-[inset_0_0_18px_rgba(59,130,246,0.12)] group min-w-[9.5rem]">
        <div className="p-2 bg-blue-500/18 rounded-lg text-blue-200 shrink-0 border border-blue-200/25 shadow-[0_0_18px_rgba(59,130,246,0.22)]">
          <ShieldCheck size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-blue-100/65 uppercase font-black flex items-center gap-1 tracking-[0.12em]">
            刻印储备
            <div className="relative">
              <HelpCircle size={12} className="text-blue-100/60 cursor-help" />
              {/* 悬停提示 */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-[#111827] text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-amber-300/25">
                <div className="font-bold mb-1">刻印储备</div>
                <div className="text-slate-300">在投掷前点击骰子可锁定其点数，下次投掷时该骰子不会重新投掷。每锁定一个骰子消耗1个刻印。</div>
                {/* 小三角 */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#111827]"></div>
              </div>
            </div>
          </div>
          <div className="text-base md:text-lg font-mono font-black text-white whitespace-nowrap">{inventory.crests} <span className="text-xs text-blue-200/80">/ {activeFixedCount} 激活</span></div>
        </div>
      </div>

      {/* 灌铅骰子 */}
      <div className="relative flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-[linear-gradient(135deg,rgba(63,39,8,0.9),rgba(20,16,12,0.95))] rounded-xl border border-amber-300/45 shadow-[inset_0_0_18px_rgba(245,158,11,0.14)] group min-w-[9.5rem]">
        <div className="p-2 bg-amber-400/18 rounded-lg text-amber-200 shrink-0 border border-amber-200/30 shadow-[0_0_18px_rgba(245,158,11,0.25)]">
          <Anchor size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-amber-100/70 uppercase font-black flex items-center gap-1 tracking-[0.12em]">
            灌铅骰子
            <div className="relative">
              <HelpCircle size={12} className="text-amber-100/60 cursor-help" />
              {/* 悬停提示 */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-[#111827] text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-amber-300/25">
                <div className="font-bold mb-1">灌铅骰子</div>
                <div className="text-slate-300">在"缔结契约"阶段，长按骰子并拖拽可修改其朝上的面。每修改一个骰子消耗1个灌铅骰子。</div>
                {/* 小三角 */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#111827]"></div>
              </div>
            </div>
          </div>
          <div className="text-base md:text-lg font-mono font-black text-white flex items-center gap-2 whitespace-nowrap">
            {inventory.weightedDice} <span className="text-xs text-amber-200/85">/ {activeWeightedCount} 预设</span>
            {/* 取消按钮：仅在有激活的灌铅骰子时显示 */}
            {activeWeightedCount > 0 && onCancelWeightedDice && (
              <button
                onClick={onCancelWeightedDice}
                className="ml-1 w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/35 text-red-100 hover:text-white flex items-center justify-center transition-colors border border-red-200/35"
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
