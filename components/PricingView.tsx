import React from 'react';
import { XIcon, TagIcon, DumbbellIcon } from './Icons';
import { PRICING_PLANS } from '../utils/pricing';

interface PricingViewProps {
  onClose: () => void;
}

const PricingView: React.FC<PricingViewProps> = ({ onClose }) => {
  const unlimitedPackages = PRICING_PLANS.filter((p) => p.category === 'unlimited');
  const limitedPackages = PRICING_PLANS.filter((p) => p.category === 'limited');
  const weekendPackage = PRICING_PLANS.find((p) => p.category === 'weekend');

  return (
    <div className="animate-scaleIn max-h-[85vh] overflow-y-auto pr-1">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-brand-dark pb-4 z-10 border-b border-brand-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-accent/10 rounded-xl text-brand-accent">
            <TagIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl tracking-tight text-brand-textPrimary">Subscription Pricing</h3>
            <p className="text-xs text-brand-textSecondary">Choose the package that fits your training style</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-brand-surface rounded-full text-brand-textSecondary hover:text-brand-accent hover:bg-brand-surface/80 transition-colors">
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-8 pb-4">
        {/* SECTION 1: Unlimited Packages */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-brand-border/30 pb-2">
            <span className="w-2 h-2 bg-brand-accent rounded-full"></span>
            <h4 className="text-xs font-black uppercase tracking-widest text-brand-textPrimary">Unlimited Packages</h4>
            <span className="text-[10px] bg-brand-accent/10 text-brand-accent font-bold px-2 py-0.5 rounded-full ml-auto">Best Value</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {unlimitedPackages.map((pkg) => (
              <div 
                key={pkg.id} 
                className="relative p-5 rounded-2xl border border-brand-border bg-brand-surface hover:border-brand-accent/30 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-brand-textSecondary font-bold uppercase tracking-wider">{pkg.duration}</p>
                    <p className="text-xl font-black text-brand-textPrimary mt-1">{pkg.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-brand-textSecondary font-mono">{pkg.perMonth}</p>
                    {pkg.save && (
                      <span className="inline-block text-[9px] text-[#ff8a00] font-black bg-[#ff8a00]/15 px-2 py-0.5 rounded-md mt-1">
                        {pkg.save}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Limited Packages */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-brand-border/30 pb-2">
            <span className="w-2 h-2 bg-brand-textSecondary rounded-full"></span>
            <h4 className="text-xs font-black uppercase tracking-widest text-brand-textPrimary">Limited Packages (3x/week)</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {limitedPackages.map((pkg) => (
              <div 
                key={pkg.id} 
                className="p-5 rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-accent/30 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-brand-textSecondary font-bold uppercase tracking-wider">{pkg.duration}</p>
                    <p className="text-xl font-black text-brand-textPrimary mt-1">{pkg.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-brand-textSecondary font-mono">{pkg.perMonth}</p>
                    {pkg.save && (
                      <span className="inline-block text-[9px] text-[#ff8a00] font-black bg-[#ff8a00]/15 px-2 py-0.5 rounded-md mt-1">
                        {pkg.save}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Weekend Package */}
        {weekendPackage && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border/30 pb-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-textPrimary">Weekend Package</h4>
            </div>
            <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-accent/30 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                <DumbbellIcon className="w-16 h-16" />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-xs text-brand-textSecondary font-bold uppercase tracking-wider">{weekendPackage.categoryLabel}</p>
                  <h5 className="font-black text-2xl text-brand-textPrimary mt-1">{weekendPackage.price} <span className="text-xs text-brand-textSecondary font-normal">/ {weekendPackage.duration}</span></h5>
                </div>
                <div className="bg-amber-500/10 text-amber-500 font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/20">
                  2x Classes / Week
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer/Note */}
        <div className="bg-brand-surface/40 p-4 rounded-xl border border-brand-border/50 text-[11px] text-brand-textSecondary leading-relaxed font-medium">
          <span className="font-bold text-brand-textPrimary">Note:</span> All subscription package rates are final and non-refundable. pausability and cancellation options are subjected to our official <span className="text-brand-accent font-bold">Gym Policies</span>.
        </div>
      </div>
    </div>
  );
};

export default PricingView;
