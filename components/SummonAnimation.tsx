
import React, { useEffect, useState } from 'react';

interface Props {
  rarity: string;
  onComplete: () => void;
}

const SummonAnimation: React.FC<Props> = ({ rarity, onComplete }) => {
  const [stage, setStage] = useState(0); // 0: Init, 1: Flash, 2: FadeOut

  useEffect(() => {
    // Sequence
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 2000); // Duration of summon
    const t3 = setTimeout(onComplete, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const getColorClasses = () => {
    switch (rarity) {
      case 'UR': 
        // RGB Rainbow Gradient
        return {
            core: 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500 shadow-[0_0_100px_rgba(255,255,255,0.9)]',
            ray: 'bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500' 
        };
      case 'SSR': 
        // Gold
        return {
            core: 'bg-yellow-400 shadow-[0_0_100px_50px_rgba(250,204,21,0.8)]',
            ray: 'bg-yellow-400'
        };
      case 'SR': 
        // Purple
        return {
            core: 'bg-purple-600 shadow-[0_0_80px_40px_rgba(147,51,234,0.8)]',
            ray: 'bg-purple-500'
        };
      default: 
        // Blue (R)
        return {
            core: 'bg-blue-500 shadow-blue-400',
            ray: 'bg-blue-500'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-500 ${stage === 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
       {/* Core Light */}
       <div 
         className={`w-4 h-4 rounded-full ${colors.core} transition-all duration-[2000ms] ease-out
         ${stage >= 1 ? 'scale-[60] opacity-0' : 'scale-1 opacity-100'}
         `}
       />
       
       {/* Rays */}
       <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${stage >= 1 ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-[200vw] h-[10px] ${colors.ray} absolute rotate-45 blur-2xl`} />
            <div className={`w-[200vw] h-[10px] ${colors.ray} absolute -rotate-45 blur-2xl`} />
            {rarity === 'UR' && (
                <>
                    <div className={`w-[200vw] h-[10px] bg-gradient-to-r from-cyan-400 to-pink-500 absolute rotate-90 blur-2xl`} />
                    <div className={`w-[200vw] h-[10px] bg-gradient-to-r from-lime-400 to-orange-500 absolute rotate-0 blur-2xl`} />
                </>
            )}
       </div>
       
       <div className="absolute bottom-20 text-white font-black tracking-[1em] uppercase animate-pulse">
           Summoning...
       </div>
    </div>
  );
};

export default SummonAnimation;
