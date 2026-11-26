import React, { useEffect, useState } from 'react';
import { LagosSkylineSvg } from './Icons';

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
    : 'Membership Portal · Lagos';

  const subText = isLoginMode ? 'Loading your dashboard' : null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isLoginMode ? greetingText : 'House of Athletes CrossFit Lagos splash screen'}
      onClick={handleContainerClick}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden font-ibm select-none transition-[opacity,transform,filter] duration-300 ease-out ${
        isVisible
          ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
          : 'opacity-0 scale-[1.03] blur-[6px] pointer-events-none'
      } ${isLoginMode ? 'splash-fast' : ''} ${canSkip ? 'cursor-pointer' : 'cursor-default'} ${
        isLight ? 'text-slate-900' : 'text-[#FCFCFC]'
      }`}
      style={{
        background: isLight
          ? 'radial-gradient(120% 80% at 50% 34%, rgba(4, 101, 64, 0.08), transparent 58%), radial-gradient(120% 70% at 50% 118%, rgba(15, 23, 42, 0.05), transparent 55%), #F1F5F9'
          : 'radial-gradient(120% 85% at 50% 34%, rgba(6, 122, 80, 0.22) 0%, transparent 56%), radial-gradient(120% 70% at 50% 118%, #0F172A, transparent 62%), #191919',
      }}
    >
      {/* Subtle architectural grid backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isLight
            ? 'linear-gradient(rgba(15, 23, 42, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.055) 1px, transparent 1px)'
            : 'linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          backgroundPosition: 'center center',
          maskImage: 'radial-gradient(85% 65% at 50% 45%, black, transparent 82%)',
          WebkitMaskImage: 'radial-gradient(85% 65% at 50% 45%, black, transparent 82%)',
        }}
      />

      {/* Ambient forest-green spotlight behind skyline */}
      <div
        aria-hidden="true"
        className="splash-glow-anim absolute top-[42%] left-1/2 w-[300px] h-[220px] sm:w-[380px] sm:h-[260px] rounded-full pointer-events-none blur-3xl opacity-0"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(6, 122, 80, 0.14), rgba(4, 101, 64, 0.05) 48%, transparent 74%)'
            : 'radial-gradient(circle, rgba(6, 122, 80, 0.28), rgba(4, 101, 64, 0.14) 46%, transparent 74%)',
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

      {/* Center vector Lagos skyline + typographic brand lockup */}
      <div className="relative z-10 flex flex-col items-center px-6 -mt-6 w-full max-w-lg">
        {/* 1. Vector Lagos Skyline Silhouette & Sweeping Horizon Arc */}
        <div className="relative w-full max-w-[210px] sm:max-w-[250px] overflow-hidden">
          <LagosSkylineSvg
            className="w-full h-auto overflow-visible"
            skylineClassName="splash-skyline-anim"
            horizonClassName="splash-horizon-anim"
          />

          {/* Diagonal Specular Sheen over Skyline */}
          <div
            aria-hidden="true"
            className="splash-sheen-anim pointer-events-none absolute inset-0 w-1/3 h-full"
            style={{
              background: isLight
                ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent)',
            }}
          />
        </div>

        {/* 2. "HOUSE OF ATHLETES" Tracked Kicker with Red "ATHLETES" Accent */}
        <div className="splash-kicker-anim text-center">
          <p className="text-[8.5px] sm:text-[9.5px] font-extrabold uppercase tracking-[0.22em] leading-none">
            <span>HOUSE OF </span>
            <span className={isLight ? 'text-[#cc1d1d]' : 'text-[#dc2626]'}>ATHLETES</span>
          </p>
        </div>

        {/* 3. Bold Lowercase "crossfit lagos" Primary Wordmark */}
        <div className="splash-wordmark-anim mt-0.5 sm:mt-1 text-center">
          <h1 className="font-logo text-[42px] sm:text-[54px] font-black tracking-[-0.04em] lowercase leading-[0.92]">
            crossfit lagos
          </h1>
        </div>

        {/* Contextual Portal / Member Greeting Copy */}
        <div
          className="splash-fade-up mt-6 text-center"
          style={{ '--splash-delay': isLoginMode ? '0.28s' : '0.72s' } as React.CSSProperties}
        >
          {isLoginMode ? (
            <>
              <p
                className={`text-base sm:text-lg font-bold tracking-tight text-balance ${
                  isLight ? 'text-slate-900' : 'text-[#FCFCFC]'
                }`}
              >
                {greetingText}
              </p>
              {subText && (
                <p
                  className={`mt-1 text-xs font-semibold tracking-[0.18em] uppercase ${
                    isLight ? 'text-[#046540]' : 'text-emerald-400'
                  }`}
                >
                  {subText}
                </p>
              )}
            </>
          ) : (
            <p
              className={`text-xs font-semibold tracking-[0.2em] uppercase ${
                isLight ? 'text-[#046540]' : 'text-emerald-400'
              }`}
            >
              {greetingText}
            </p>
          )}
        </div>

        {/* Minimal Forest-Green Progress Sweep Bar */}
        <div
          className={`splash-fade-up mt-5 w-36 h-[3px] rounded-full overflow-hidden ${
            isLight ? 'bg-slate-200' : 'bg-white/12'
          }`}
          style={{ '--splash-delay': isLoginMode ? '0.34s' : '0.82s' } as React.CSSProperties}
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
