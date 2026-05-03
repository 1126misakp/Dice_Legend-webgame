import React from 'react';
import { Download, EyeOff, Loader2 } from 'lucide-react';

interface FullArtToolbarProps {
  isDownloading: boolean;
  onDownload: (event: React.MouseEvent) => void;
  onCloseFullArt: () => void;
}

const FullArtToolbar: React.FC<FullArtToolbarProps> = ({ isDownloading, onDownload, onCloseFullArt }) => (
  <div className="absolute top-2 right-2 md:top-0 md:-right-16 flex flex-row md:flex-col gap-2 md:gap-4 animate-fade-in z-50">
    <button
      onClick={onCloseFullArt}
      className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-950/70 md:bg-blue-950/55 text-amber-100 flex items-center justify-center border border-amber-200/30 hover:bg-amber-200 hover:text-slate-950 transition-colors backdrop-blur-md shadow-lg"
      title="显示卡面信息"
    >
      <EyeOff size={24} />
    </button>

    <button
      onClick={onDownload}
      disabled={isDownloading}
      className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-950/70 md:bg-blue-950/55 text-amber-100 flex items-center justify-center border border-amber-200/30 transition-colors backdrop-blur-md shadow-lg ${isDownloading ? 'opacity-50 cursor-wait' : 'hover:bg-emerald-600 hover:border-emerald-300 hover:text-white'}`}
      title={isDownloading ? '下载中...' : '下载原图'}
    >
      {isDownloading ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
    </button>
  </div>
);

export default FullArtToolbar;
