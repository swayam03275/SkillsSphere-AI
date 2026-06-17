import React, { useState, useEffect } from 'react';

const TopLoadingBar = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const startHandler = () => setIsLoading(true);
    const stopHandler = () => setIsLoading(false);

    window.addEventListener('route-loading-start', startHandler);
    window.addEventListener('route-loading-stop', stopHandler);

    return () => {
      window.removeEventListener('route-loading-start', startHandler);
      window.removeEventListener('route-loading-stop', stopHandler);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999] overflow-hidden bg-brand-100/20">
      <div 
        className="h-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 shadow-[0_0_10px_var(--primary)] w-1/2 [animation:route-progress_1.5s_infinite_ease-in-out] origin-left"
      />
      <style>{`
        @keyframes route-progress {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(50%) scaleX(0.6); }
          100% { transform: translateX(200%) scaleX(0.2); }
        }
      `}</style>
    </div>
  );
};

export default TopLoadingBar;
