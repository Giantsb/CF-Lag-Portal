
import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from './Icons';
import { createPin, getMemberByPhone } from '../services/membershipService';
import { hashPin } from '../utils/encryption';
import { logAnalyticsEvent } from '../services/firebase';
import { MemberData } from '../types';
import ThemeToggle from './ThemeToggle';

interface PinSetupViewProps {
  phone: string;
  onSuccess: (member: MemberData) => void;
  onBack: () => void;
  isReset?: boolean;
}

const PinSetupView: React.FC<PinSetupViewProps> = ({ phone, onSuccess, onBack, isReset = false }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetupPin = async () => {
    setError('');
    setSuccess('');

    // 1. Validate PIN
    if (!newPin || newPin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      // 2. Hash PIN
      console.log(`[PinSetup] Hashing PIN for phone: ${phone}`);
      const hashedPin = hashPin(newPin, phone);
      console.log(`[PinSetup] Hash generated: ${hashedPin.substring(0, 10)}...`);

      // 3. Save to Google Sheets via createPin()
      console.log(`[PinSetup] Saving PIN to Google Sheets...`);
      const result = await createPin(phone, hashedPin);

      if (result.success) {
        console.log(`[PinSetup] Success: PIN ${isReset ? 'reset' : 'setup'} completed in backend.`);
        
        // Log Analytics Event
        logAnalyticsEvent(isReset ? 'pin_reset_success' : 'pin_setup_success', { 
          phone_hash: hashedPin.substring(0, 8) 
        });

        // 4. Show success message
        setSuccess(`PIN ${isReset ? 'reset' : 'created'} successfully! Logging you in...`);
        
        // Artificial delay for better UX visibility of success state
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 5. Auto-login via getMemberByPhone()
        console.log(`[PinSetup] Attempting auto-login for: ${phone}`);
        const member = await getMemberByPhone(phone);

        if (member) {
          console.log(`[PinSetup] Auto-login successful for ${member.firstName}`);
          // 6. Call onSuccess(member)
          onSuccess(member);
        } else {
          console.warn(`[PinSetup] PIN updated but could not fetch member data.`);
          setError('PIN updated, but unable to auto-login. Please try logging in manually.');
          setTimeout(onBack, 3000);
        }
      } else {
        console.error(`[PinSetup] Backend Error: ${result.message}`);
        setError(result.message || 'Failed to update PIN. Please try again.');
      }
    } catch (err: any) {
      console.error(`[PinSetup] Unexpected Exception:`, err);
      setError(err.message || 'An unexpected error occurred during setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="bg-brand-dark rounded-lg shadow-xl p-8 w-full max-w-md border border-brand-border">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-brand-accent/10 rounded-full mb-4 text-brand-accent">
            <LockIcon />
          </div>
          <h1 className="text-2xl font-bold text-brand-textPrimary mb-2">
            {isReset ? 'Reset Your PIN' : 'Setup Your PIN'}
          </h1>
          <p className="text-brand-textSecondary">
            {isReset ? 'Create a new 4-digit PIN for your account' : 'Create a 4-digit PIN for your account'}
          </p>
          <p className="text-sm text-brand-accent mt-2">Phone: {phone}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-textSecondary mb-2">
              New PIN (4 digits)
            </label>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                className="w-full px-4 py-3 bg-brand-input border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/50"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent"
              >
                {showNewPin ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-textSecondary mb-2">
              Confirm PIN
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                className="w-full px-4 py-3 bg-brand-input border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent"
              >
                {showConfirmPin ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger text-brand-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-brand-success/10 border border-brand-success text-brand-success px-4 py-3 rounded-lg text-sm whitespace-pre-line">
              {success}
            </div>
          )}

          <button
            onClick={handleSetupPin}
            disabled={loading}
            className="w-full bg-brand-accent text-brand-accentText py-3 rounded-lg font-bold hover:bg-brand-accentHover transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? (isReset ? 'Resetting...' : 'Setting up...') : (isReset ? 'Reset PIN' : 'Setup PIN')}
          </button>

          <button
            onClick={onBack}
            className="w-full bg-brand-surface text-brand-textPrimary py-3 rounded-lg font-semibold hover:bg-opacity-80 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinSetupView;
