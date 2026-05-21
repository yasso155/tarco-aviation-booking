import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StartupLoaderProps {
  onComplete: () => void;
}

export const StartupLoader: React.FC<StartupLoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) {
          clearInterval(timer);
          setTimeout(onComplete, 800);
          return 100;
        }
        const diff = Math.random() * 15;
        return Math.min(oldProgress + diff, 100);
      });
    }, 200);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[1000] bg-tarco-blue flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(circle at center, #2a52be 0%, #1d4296 100%)'
      }}
    >
      {/* Background Vapor Trails */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0] }}
            transition={{ 
              duration: 4 + i, 
              repeat: Infinity, 
              ease: "linear",
              delay: i * 0.5
            }}
            className="absolute"
            style={{
              top: `${20 + i * 15}%`,
              left: '-10%',
              width: '120%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              rotate: `${-5 + i * 2}deg`
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-12 z-10">
        {/* Animated Wings Logo */}
        <div className="relative w-48 h-48 lg:w-64 lg:h-64">
          {/* Wings Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Blue Wing */}
            <motion.img
              initial={{ x: -100, opacity: 0, scale: 0.8, rotate: -20 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              src="/Images/TRC.svg"
              className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)] shimmer-effect-blue"
              style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)' }}
            />
            {/* Red Wing */}
            <motion.img
              initial={{ x: 100, opacity: 0, scale: 0.8, rotate: 20 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              src="/Images/TRC.svg"
              className="w-full h-full object-contain absolute inset-0 filter drop-shadow-[0_0_30px_rgba(239,68,68,0.3)] shimmer-effect-red"
              style={{ clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' }}
            />
          </div>

          {/* Shimmer Overlay */}
          <motion.div
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none"
          />
        </div>

        {/* Brand Text */}
        <div className="text-center space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-white text-3xl font-black tracking-[0.4em] uppercase"
          >
            Tarco <span className="text-tarco-red">Aviation</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em]"
          >
            Establishment of Excellence
          </motion.p>
        </div>

        {/* Progress Bar (Flight Path Style) */}
        <div className="w-64 space-y-3">
          <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-white/60">
            <span className={progress > 10 ? "text-tarco-red transition-colors" : ""}>KRT</span>
            <div className="flex-1 flex justify-center mb-1 px-4">
              <motion.div 
                animate={{ x: [-10, 10, -10] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tarco-red rotate-90">
                    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                 </svg>
              </motion.div>
            </div>
            <span className={progress === 100 ? "text-tarco-red transition-colors" : ""}>DXB</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="absolute inset-y-0 left-0 bg-tarco-red"
            />
          </div>
          <p className="text-center text-[9px] font-bold text-white/30 uppercase tracking-widest pt-2">
            Preparing your sky experience... {Math.round(progress)}%
          </p>
        </div>
      </div>
      
      <style>{`
        .shimmer-effect-blue {
          filter: brightness(1.1) contrast(1.1) drop-shadow(0 0 20px rgba(59,130,246,0.5));
        }
        .shimmer-effect-red {
          filter: brightness(1.1) contrast(1.1) drop-shadow(0 0 20px rgba(239,68,68,0.5));
        }
      `}</style>
    </motion.div>
  );
};
