import React from 'react';

interface TataLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  subMessage?: string;
}

export const TataLoadingSpinner: React.FC<TataLoadingSpinnerProps> = ({
  size = 'md',
  message = 'Loading Tata AutoComp System...',
  subMessage = 'Varale (B300 Plant) Battery WMS',
}) => {
  const sizeMap = {
    sm: { container: 'w-12 h-12', logo: 'w-7 h-7', ring: 'border-2' },
    md: { container: 'w-20 h-20', logo: 'w-11 h-11', ring: 'border-3' },
    lg: { container: 'w-28 h-28', logo: 'w-16 h-16', ring: 'border-4' },
    xl: { container: 'w-36 h-36', logo: 'w-20 h-20', ring: 'border-4' },
  };

  const dim = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fadeIn">
      {/* Animated Circular Container */}
      <div className={`relative ${dim.container} flex items-center justify-center`}>
        {/* Outer Spinning Gradient Ring */}
        <div
          className={`absolute inset-0 rounded-full ${dim.ring} border-t-blue-600 border-r-blue-400 border-b-slate-200 border-l-slate-200 animate-spin`}
          style={{ animationDuration: '1.2s' }}
        />

        {/* Inner Pulsing Glowing Circle */}
        <div className="absolute inset-1 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-100 animate-pulse">
          {/* Official Tata Logo */}
          <img
            src="/tata-logo.png"
            alt="TATA Logo"
            className={`${dim.logo} object-contain`}
          />
        </div>
      </div>

      {/* Loading Message */}
      {message && (
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight font-display">
            {message}
          </p>
          {subMessage && (
            <p className="text-[11px] text-slate-500 font-mono-code">
              {subMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
