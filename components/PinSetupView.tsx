import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from './Icons';
import { createPin, getMemberByPhone } from '../services/membershipService';
import { hashPin } from '../utils/encryption';
import { MemberData } from '../types';

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

    if (!newPin || newPin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    // Hash the PIN before sending to backend
    // Never send plain text PINs
    const hashedPin = hashPin(newPin, phone);

    const result = await createPin(phone, hashedPin);

    if (result.success) {
      setSuccess(`PIN ${isReset ? 'reset' : 'created'} successfully! Logging you in...`);
      
      // Fetch member data in parallel with the delay
      // This ensures we have data ready to auto-login the user
      try {
        const [member] = await Promise.all([
          getMemberByPhone(phone),
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);

        if (member) {
          onSuccess(member);
        } else {
          // If we can't fetch the member, fallback to onBack which goes to login
          setError('PIN created, but unable to auto-login. Please try logging in manually.');
          setTimeout(onBack, 2000);
        }
      } catch (e) {
        setError('PIN created, but an error occurred. Please try logging in manually.');
        setTimeout(onBack, 2000);
      }
    } else {
      setError(result.message || 'An error occurred');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="bg-brand-dark rounded-lg shadow-xl p-8 w-full max-w-md border border-brand-accent/20">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-brand-accent/10 rounded-full mb-4 text-brand-accent">
            <LockIcon />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isReset ? 'Reset Your PIN' : 'Setup Your PIN'}
          </h1>
          <p className="text-gray-400">
            {isReset ? 'Create a new 4-digit PIN for your account' : 'Create a 4-digit PIN for your account'}
          </p>
          <p className="text-sm text-brand-accent mt-2">Phone: {phone}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New PIN (4 digits)
            </label>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-accent"
              >
                {showNewPin ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm PIN
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-accent"
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
            className="w-full bg-brand-accent text-brand-black py-3 rounded-lg font-bold hover:bg-brand-accentHover transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? (isReset ? 'Resetting...' : 'Setting up...') : (isReset ? 'Reset PIN' : 'Setup PIN')}
          </button>

          <button
            onClick={onBack}
            className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinSetupView;