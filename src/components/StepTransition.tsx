import React from 'react';
import { motion } from 'motion/react';

interface StepTransitionProps {
  nextStep: string;
  lang: 'en' | 'ar';
}

const STEP_LABELS: Record<string, Record<'en' | 'ar', string>> = {
  results: { en: 'Finding best fares...', ar: 'جاري البحث عن أفضل الرحلات...' },
  services: { en: 'Preparing cabin choices...', ar: 'جاري تجهيز خيارات المقصورة...' },
  seats: { en: 'Opening cabin map...', ar: 'جاري فتح خريطة الطائرة...' },
  success: { en: 'Finalizing booking...', ar: 'جاري تأكيد حجزك...' },
};

export const StepTransition: React.FC<StepTransitionProps> = ({ nextStep, lang }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center gap-12"
    >
      <div className="relative w-40 h-40">
        {/* Floating Aura */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-tarco-blue rounded-full blur-[60px]"
        />

        {/* Soaring Wings */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <img 
            src="/Images/TRC.svg" 
            className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.1)]" 
            alt="Transitioning"
          />
        </motion.div>
      </div>

      <div className="text-center space-y-4">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-tarco-blue text-sm font-black uppercase tracking-[0.3em]"
        >
          {STEP_LABELS[nextStep]?.[lang] || 'Please wait...'}
        </motion.p>
        
        {/* Modern Dot Progress */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 bg-tarco-red rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
