import React, { useState, useEffect } from 'react';
import { ShareIcon, XIcon, DumbbellIcon } from './Icons';

const InstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if running standalone (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) return;

    // Check if dismissed recently in this session (or localStorage for persistence)
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;

    if (isIosDevice) {
      setIsIOS(true);
      setShow(true);
    } else {
      // Capture the event for Android/Chrome
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] bg-brand-dark border border-brand-accent/30 rounded-xl shadow-2xl p-4 transition-all duration-500 transform translate-y-0 opacity-100">
       <button onClick={handleDismiss} className="absolute top-2 right-2 text-brand-textSecondary hover:text-brand-textPrimary">
         <XIcon className="w-5 h-5" />
       </button>

       <div className="flex gap-4">
         <div className="bg-brand-accent/10 p-3 rounded-lg h-fit shrink-0">
            <DumbbellIcon className="w-8 h-8 text-brand-accent" />
         </div>
         <div className="flex-1">
            <h3 className="font-bold text-brand-textPrimary mb-1">Install App</h3>
            <p className="text-sm text-brand-textSecondary mb-3">
              {isIOS 
                ? "Install this application on your home screen for quick and easy access." 
                : "Add CrossFit Lagos to your home screen for the best experience."}
            </p>
            
            {isIOS ? (
              <div className="text-sm text-brand-textPrimary p-2 bg-brand-surface rounded-lg border border-brand-border">
                 <p className="flex items-start gap-2">
                   <span>To install, tap the Share icon <ShareIcon className="w-5 h-5 inline mx-0.5 align-bottom text-brand-accent" /> and select <span className="font-bold whitespace-nowrap">'Add to Home Screen'</span>.</span>
                 </p>
              </div>
            ) : (
              <button 
                onClick={handleInstall}
                className="w-full bg-brand-accent text-brand-accentText font-bold py-2 rounded-lg hover:bg-brand-accentHover transition-colors"
              >
                Install Now
              </button>
            )}
         </div>
       </div>
    </div>
  );
};

export default InstallPrompt;