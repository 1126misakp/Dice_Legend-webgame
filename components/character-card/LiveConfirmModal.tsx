import React from 'react';
import { AlertCircle } from 'lucide-react';

interface LiveConfirmModalProps {
  pendingQueueCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const LiveConfirmModal: React.FC<LiveConfirmModalProps> = ({ pendingQueueCount, onCancel, onConfirm }) => (
  <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
    <div className="bg-[#f3ddb1] bg-[url('/ui/parchment-panel.png')] bg-cover bg-center rounded-xl p-5 sm:p-6 w-full max-w-80 shadow-2xl animate-fade-in-up border border-amber-300/60 text-[#2b1a10]" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 bg-amber-900/10 text-amber-800 rounded-full flex items-center justify-center mb-2 border border-amber-800/20">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-black text-[#71410f] font-serif">启动动态化契约？</h3>
        <p className="text-sm text-[#5b3a18]">角色动态化需要较长等待时间（约1-3分钟），请耐心等候。</p>
        {pendingQueueCount > 0 && (
          <p className="text-xs text-amber-900 bg-amber-950/10 px-3 py-1.5 rounded-lg border border-amber-900/15">
            当前有 {pendingQueueCount} 个任务在队列中，您的任务将排队等待
          </p>
        )}
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-[#1b2d4f]/12 text-[#34405c] font-bold hover:bg-[#1b2d4f]/20 border border-[#1b2d4f]/15"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-gradient-to-b from-[#2f5b9a] to-[#0b1a39] text-amber-50 font-bold hover:brightness-110 shadow-md border border-amber-200/30"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default LiveConfirmModal;
