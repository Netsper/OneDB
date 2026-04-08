import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ isVisible, message = 'Loading...', tc }) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-auto">
      {/* Backdrop with strong blur */}
      <div 
        className="absolute inset-0 bg-[#00000040] backdrop-blur-xl animate-in fade-in duration-500" 
        style={{ WebkitBackdropFilter: 'blur(24px)' }}
      />
      
      {/* Content */}
      <div className="relative flex flex-col items-center animate-in zoom-in-95 fade-in duration-300">
        <div className={`p-4 rounded-2xl bg-[#1c1c1c] border border-[#ffffff10] shadow-2xl flex flex-col items-center gap-3 min-w-[140px]`}>
          <div className="relative">
            <Loader2 className={`w-8 h-8 ${tc?.text || 'text-emerald-500'} animate-spin`} />
            <div className={`absolute inset-0 ${tc?.text || 'text-emerald-500'} blur-md opacity-40 animate-pulse`}>
              <Loader2 className="w-8 h-8" />
            </div>
          </div>
          <span className="text-sm font-medium text-zinc-200 tracking-wide">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
