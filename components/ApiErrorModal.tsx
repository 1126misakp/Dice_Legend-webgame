import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ApiErrorModalProps {
  open: boolean;
  message: string;
  onReturn: () => void;
}

const ApiErrorModal: React.FC<ApiErrorModalProps> = ({ open, message, onReturn }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
      <div className="academy-parchment rounded-2xl border-2 border-red-500/50 shadow-2xl max-w-md w-full p-6 animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
        </div>
        <h3 className="text-red-400 font-black text-lg mb-4 text-center">API 调用失败</h3>
        <div className="bg-red-950/10 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto border border-red-900/15">
          <p className="text-[#4a2716] text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={onReturn}
          className="w-full py-3 px-4 rounded-xl bg-[#1b2d4f] hover:bg-[#25406d] text-amber-50 font-bold transition-all border-b-4 border-[#081221] active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          返回缔结契约
        </button>
      </div>
    </div>
  );
};

export default ApiErrorModal;
