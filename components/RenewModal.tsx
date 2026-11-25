import React, { useState, useMemo } from 'react';
import {
  XIcon,
  CreditCardIcon,
  CopyIcon,
  CheckCircleIcon,
  PhoneIcon,
  TagIcon,
} from './Icons';
import { MemberData } from '../types';
import {
  PRICING_PLANS,
  PlanCategory,
  PricingPlan,
  findMatchingPlan,
} from '../utils/pricing';

interface RenewModalProps {
  member: MemberData;
  onClose: () => void;
}

const CATEGORY_TABS: { id: PlanCategory; label: string }[] = [
  { id: 'unlimited', label: 'Unlimited' },
  { id: 'limited', label: 'Limited (3x/wk)' },
  { id: 'weekend', label: 'Weekend' },
];

const RenewModal: React.FC<RenewModalProps> = ({ member, onClose }) => {
  const currentMatchedPlan = useMemo(
    () => findMatchingPlan(member.package, member.duration),
    [member.package, member.duration]
  );

  const [activeCategory, setActiveCategory] = useState<PlanCategory>(
    currentMatchedPlan?.category || 'unlimited'
  );
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(
    currentMatchedPlan
  );
  const [copied, setCopied] = useState(false);

  const visiblePlans = useMemo(
    () => PRICING_PLANS.filter((p) => p.category === activeCategory),
    [activeCategory]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText('0078409920');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsAppUrl = useMemo(() => {
    if (!selectedPlan) return '';
    const fullName = `${member.firstName} ${member.lastName}`.trim();
    const message = `Hello, my name is ${fullName} (${member.phone}). I've just paid ${selectedPlan.price} for the ${selectedPlan.categoryLabel} (${selectedPlan.duration}) membership plan via the portal. Attached is my payment receipt.`;
    return `https://wa.me/2347059969059?text=${encodeURIComponent(message)}`;
  }, [member.firstName, member.lastName, member.phone, selectedPlan]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-brand-dark w-full max-w-lg rounded-3xl border border-brand-border p-6 sm:p-7 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4 mb-5">
          <div>
            <h3 className="font-black text-xl tracking-tight text-brand-textPrimary">
              Renew Membership
            </h3>
            <p className="text-xs text-brand-textSecondary mt-0.5">
              Select the plan you are paying for, then send your receipt on WhatsApp.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-brand-surface rounded-full text-brand-textSecondary hover:text-brand-accent transition-colors shrink-0"
            aria-label="Close renew modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Plan Selector */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-brand-textSecondary uppercase tracking-widest flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-brand-accent" />
              1. Select Plan
            </span>
            {selectedPlan && (
              <span className="text-[11px] font-bold text-brand-accent">
                {selectedPlan.categoryLabel} · {selectedPlan.duration}
              </span>
            )}
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-3 gap-1.5 bg-brand-surface p-1 rounded-2xl border border-brand-border mb-3">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.id);
                  if (tab.id === 'weekend') {
                    const weekendPlan = PRICING_PLANS.find((p) => p.category === 'weekend');
                    if (weekendPlan) setSelectedPlan(weekendPlan);
                  }
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all ${
                  activeCategory === tab.id
                    ? 'bg-brand-accent text-brand-accentText shadow-sm'
                    : 'text-brand-textSecondary hover:text-brand-textPrimary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Plan Cards */}
          <div className={`grid gap-2.5 ${visiblePlans.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {visiblePlans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              const isCurrent = currentMatchedPlan?.id === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-brand-accent bg-brand-accent/10 ring-1 ring-brand-accent'
                      : 'border-brand-border bg-brand-surface/70 hover:border-brand-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-textSecondary">
                      {plan.duration}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-accent/20 text-brand-accent">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black text-brand-textPrimary leading-tight">
                    {plan.price}
                  </p>
                  {(plan.perMonth || plan.save) && (
                    <div className="flex items-center justify-between gap-1 mt-1.5">
                      <span className="text-[10px] font-mono text-brand-textSecondary">
                        {plan.perMonth || ''}
                      </span>
                      {plan.save && (
                        <span className="text-[9px] font-black text-[#ff8a00] bg-[#ff8a00]/15 px-1.5 py-0.5 rounded">
                          {plan.save}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Electronic Transfer Details */}
        <div className="bg-brand-accent/10 rounded-2xl p-5 mb-5 border border-brand-accent/20">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-accent rounded-xl text-brand-accentText">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              <h4 className="text-brand-accent font-black text-xs uppercase tracking-widest">
                2. Electronic Transfer
              </h4>
            </div>
            {selectedPlan && (
              <span className="text-sm font-black text-brand-textPrimary">
                {selectedPlan.price}
              </span>
            )}
          </div>

          <div className="space-y-3 text-sm font-bold">
            <div className="flex justify-between items-center pb-2.5 border-b border-brand-accent/10">
              <span className="text-brand-textSecondary text-[10px] uppercase">Bank</span>
              <span className="text-brand-textPrimary">Access Bank</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-brand-accent/10">
              <span className="text-brand-textSecondary text-[10px] uppercase">Account</span>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-brand-textPrimary">0078409920</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-brand-accent hover:text-brand-accentHover bg-brand-accent/20 p-1.5 rounded-lg"
                  aria-label="Copy account number"
                >
                  {copied ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : (
                    <CopyIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-brand-accent/10">
              <span className="text-brand-textSecondary text-[10px] uppercase">Name</span>
              <span className="text-brand-textPrimary">CrossFit Lagos</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-brand-textSecondary text-[10px] uppercase">Selected Plan</span>
              <span className="text-brand-textPrimary text-xs sm:text-sm">
                {selectedPlan
                  ? `${selectedPlan.categoryLabel} (${selectedPlan.duration})`
                  : 'Select a plan above'}
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Preset WhatsApp Receipt CTA */}
        <div className="text-center space-y-2.5">
          {selectedPlan ? (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 text-white font-black py-4 px-4 rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-900/20 active:scale-[0.98] text-xs sm:text-sm"
            >
              <PhoneIcon className="w-4 h-4 shrink-0" />
              <span>WHATSAPP RECEIPT ({selectedPlan.price})</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 w-full bg-brand-surface text-brand-textSecondary font-black py-4 px-4 rounded-2xl border border-brand-border opacity-60 cursor-not-allowed text-xs sm:text-sm"
            >
              <PhoneIcon className="w-4 h-4 shrink-0" />
              <span>SELECT A PLAN TO SEND RECEIPT</span>
            </button>
          )}
          <p className="text-[11px] text-brand-textSecondary/75">
            {selectedPlan
              ? `Opens WhatsApp with your preset "${selectedPlan.categoryLabel} · ${selectedPlan.duration}" payment message ready to attach your receipt.`
              : 'Pick a plan above to include your plan and payment amount in the WhatsApp message.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RenewModal;
