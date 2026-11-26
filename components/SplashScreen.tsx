import React, { useEffect, useState } from 'react';

export type SplashMode = 'launch' | 'login';

interface SplashScreenProps {
  isVisible: boolean;
  mode: SplashMode;
  memberName?: string;
  isNewMember?: boolean;
  canSkip?: boolean;
  onSkip?: () => void;
}

const EMBERS = [
  { left: '14%', size: 3, delay: '0.3s', dur: '4.4s' },
  { left: '24%', size: 4, delay: '1.1s', dur: '5.1s' },
  { left: '36%', size: 2.5, delay: '0.6s', dur: '4.2s' },
  { left: '48%', size: 3.5, delay: '1.5s', dur: '4.8s' },
  { left: '61%', size: 4, delay: '0.4s', dur: '5.3s' },
  { left: '74%', size: 3, delay: '1.3s', dur: '4.6s' },
  { left: '84%', size: 3.5, delay: '0.8s', dur: '4.9s' },
];

const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible,
  mode,
  memberName,
  isNewMember = false,
  canSkip = false,
  onSkip,
}) => {
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-theme') === 'light';
  });
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !canSkip || !onSkip) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, canSkip, onSkip]);

  const handleContainerClick = () => {
    if (isVisible && canSkip && onSkip) {
      onSkip();
    }
  };

  const isLoginMode = mode === 'login';
  const greetingText = isLoginMode
    ? memberName
      ? `${isNewMember ? 'Welcome' : 'Welcome back'}, ${memberName}`
      : 'Access verified'
    : 'House of Athletes';

  const subText = isLoginMode
    ? 'Loading your dashboard'
    : 'Membership Portal · Lagos';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isLoginMode ? greetingText : 'CrossFit Lagos splash screen'}
      onClick={handleContainerClick}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden font-ibm select-none transition-opacity duration-300 ease-out ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      } ${isLoginMode ? 'splash-fast' : ''} ${canSkip ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        background: isLight
          ? 'radial-gradient(120% 80% at 50% 26%, rgba(4, 101, 64, 0.08), transparent 58%), radial-gradient(120% 70% at 50% 118%, rgba(15, 23, 42, 0.05), transparent 55%), #F1F5F9'
          : 'radial-gradient(120% 85% at 50% 26%, rgba(6, 122, 80, 0.24) 0%, transparent 56%), radial-gradient(120% 70% at 50% 118%, #0F172A, transparent 62%), #191919',
      }}
    >
      {/* Subtle architectural dot matrix */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isLight
            ? 'radial-gradient(rgba(15, 23, 42, 0.06) 1px, transparent 1px)'
            : 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(80% 60% at 50% 42%, black, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(80% 60% at 50% 42%, black, transparent 78%)',
        }}
      />

      {/* Ambient forest-green spotlight */}
      <div
        aria-hidden="true"
        className="splash-glow-anim absolute top-[43%] left-1/2 w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full pointer-events-none blur-2xl opacity-0"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(6, 122, 80, 0.11), rgba(4, 101, 64, 0.05) 44%, transparent 72%)'
            : 'radial-gradient(circle, rgba(6, 122, 80, 0.24), rgba(4, 101, 64, 0.14) 42%, transparent 72%)',
        }}
      />

      {/* Subtle forest-emerald motes */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        {EMBERS.map((ember, idx) => (
          <span
            key={idx}
            className="splash-ember absolute bottom-[28%] rounded-full opacity-0"
            style={
              {
                left: ember.left,
                width: `${ember.size}px`,
                height: `${ember.size}px`,
                backgroundColor: isLight ? 'rgba(4, 101, 64, 0.35)' : 'rgba(6, 122, 80, 0.65)',
                boxShadow: isLight ? 'none' : '0 0 6px rgba(16, 185, 129, 0.4)',
                '--ember-delay': ember.delay,
                '--ember-dur': ember.dur,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Center brand lockup stage */}
      <div className="relative z-10 flex flex-col items-center px-6 -mt-6 w-full max-w-md">
        <div className="splash-logo-anim relative w-[280px] sm:w-[324px]">
          {/* Animated charcoal & forest-green hairline frame */}
          <svg
            aria-hidden="true"
            viewBox="0 0 324 146"
            className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none overflow-visible"
          >
            <rect
              x="1"
              y="1"
              width="322"
              height="144"
              rx="18"
              pathLength={1}
              fill="none"
              stroke={isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.18)'}
              strokeWidth="1.2"
              className="splash-frame-anim"
            />
            <line
              x1="18"
              y1="1"
              x2="76"
              y2="1"
              pathLength={1}
              stroke={isLight ? '#046540' : '#067A50'}
              strokeWidth="2"
              strokeLinecap="round"
              className="splash-frame-anim"
            />
            <line
              x1="248"
              y1="145"
              x2="306"
              y2="145"
              pathLength={1}
              stroke={isLight ? '#046540' : '#067A50'}
              strokeWidth="2"
              strokeLinecap="round"
              className="splash-frame-anim"
            />
          </svg>

          {/* Transparent brand logo stage synced to dark/light backgrounds */}
          <div className="relative w-full aspect-[100/44] overflow-hidden flex items-center justify-center">
            {!logoError ? (
              <img
                src="/assets/aistudio/New_CF_logo-removebg-preview_33dc3adb.png"
                alt="House of Athletes CrossFit Lagos"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="absolute left-1/2 top-1/2 w-[144%] max-w-none h-auto pointer-events-none"
                style={{
                  transform: 'translate(-50%, -44.25%)',
                  filter: isLight
                    ? 'none'
                    : 'invert(1) hue-rotate(180deg) brightness(1.06) contrast(1.08) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.5))',
                }}
              />
            ) : (
              <div className="px-4 py-3 text-center">
                <p
                  className={`text-[11px] font-extrabold tracking-[0.22em] uppercase ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  House of <span className="text-red-500">Athletes</span>
                </p>
                <p
                  className={`text-2xl font-black tracking-tight leading-none mt-1 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  crossfit lagos
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic contextual headline & subtitle */}
        <div
          className="splash-fade-up mt-7 text-center"
          style={{ '--splash-delay': isLoginMode ? '0.24s' : '0.68s' } as React.CSSProperties}
        >
          <p
            className={`text-lg sm:text-xl font-bold tracking-tight text-balance ${
              isLight ? 'text-slate-900' : 'text-[#FCFCFC]'
            }`}
          >
            {greetingText}
          </p>
          <p
            className={`mt-1.5 text-xs font-semibold tracking-[0.18em] uppercase ${
              isLight ? 'text-[#046540]' : 'text-emerald-400'
            }`}
          >
            {subText}
          </p>
        </div>

        {/* Minimal forest-green progress sweep bar */}
        <div
          className={`splash-fade-up mt-6 w-36 h-[3px] rounded-full overflow-hidden ${
            isLight ? 'bg-slate-200' : 'bg-white/12'
          }`}
          style={{ '--splash-delay': isLoginMode ? '0.32s' : '0.82s' } as React.CSSProperties}
        >
          <div
            className="splash-bar-slide h-full w-[42%] rounded-full"
            style={{
              background: isLight
                ? 'linear-gradient(90deg, #046540, #067A50, #046540)'
                : 'linear-gradient(90deg, #046540, #10B981, #067A50)',
              boxShadow: isLight ? 'none' : '0 0 8px rgba(6, 122, 80, 0.7)',
            }}
          />
        </div>
      </div>

      {/* Non-blocking skip affordance for returning members */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 px-4">
        {canSkip && onSkip && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#067A50] ${
              isLight
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-[#D4D4D4]/70 hover:text-white'
            }`}
          >
            Tap anywhere to continue
          </button>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
