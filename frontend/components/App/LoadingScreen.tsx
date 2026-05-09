import React, { useState, useEffect } from 'react';

export const LoadingScreen: React.FC<{ onComplete: () => void, isLightTheme: boolean }> = ({ onComplete, isLightTheme }) => {
  const [progress, setProgress] = useState(0);
  const logoUrl = isLightTheme ? 'https://i.postimg.cc/2ym1J8xp/lipinsky-sign.png' : 'https://i.postimg.cc/BbgjG9hG/lipinsky-sign-white.png';

  useEffect(() => {
    const startTime = Date.now();
    const duration = 4000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 200);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  const zigzagPoints = "0,12 20,0 40,24 60,0 80,24 100,12";

  return (
    <div className="fixed inset-0 bg-[var(--color-base)] flex flex-col items-center justify-center z-[9999] text-[var(--color-text)]">
      <img src={logoUrl} alt="Logo" className="h-24 mb-8 object-contain animate-bounce" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <h1 className="text-2xl font-bold mb-8 tracking-widest">Code-Lert (CodeLert AI 3.0)</h1>
      
      <div className="w-64 h-12 relative flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-0">
          <polyline points={zigzagPoints} fill="none" stroke="var(--color-border)" strokeWidth="2" />
          <polyline 
            points={zigzagPoints} 
            fill="none" 
            stroke="var(--color-accent)" 
            strokeWidth="3" 
            strokeDasharray="200"
            strokeDashoffset={200 - (progress * 2)}
            className="transition-all duration-75 ease-linear"
          />
        </svg>
        <div 
          className="absolute text-xl transition-all duration-75 ease-linear"
          style={{
            left: `${progress}%`,
            top: `${progress < 20 ? 12 - (progress/20)*12 : progress < 40 ? (progress-20)/20*24 : progress < 60 ? 24 - (progress-40)/20*24 : progress < 80 ? (progress-60)/20*24 : 24 - (progress-80)/20*12}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          ⛵
        </div>
      </div>
      <div className="mt-4 font-mono text-sm text-[var(--color-muted)]">{Math.floor(progress)}%</div>
    </div>
  );
};
