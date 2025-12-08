import React, { useState } from 'react';
import { DumbbellIcon, EyeIcon, EyeOffIcon } from './Icons';
import { fetchMemberData, verifyPhoneExists } from '../services/membershipService';
import { hashPin } from '../utils/encryption';
import { ViewState, MemberData } from '../types';

interface LoginViewProps {
  onLoginSuccess: (member: MemberData) => void;
  onRequireSetup: (phone: string) => void;
  onForgotPassword: (phone: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onRequireSetup, onForgotPassword }) => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    if (!pin || pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      setLoading(false);
      return;
    }

    // Hash the PIN before sending to the backend service
    const hashedPin = hashPin(pin, phone);

    const result = await fetchMemberData(phone, hashedPin);

    if (result.success) {
      if (result.needsSetup) {
        onRequireSetup(phone);
      } else if (result.member) {
        if (rememberMe) {
          // Store the HASHED credential, never the plain text PIN
          localStorage.setItem('hoa_session', JSON.stringify({ phone, pin: hashedPin }));
        }
        onLoginSuccess(result.member);
      }
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  const handleForgotPasswordClick = async () => {
    setError('');
    
    if (!phone || phone.length < 10) {
      setError('Please enter your phone number to reset PIN');
      return;
    }
    
    setLoading(true);
    const result = await verifyPhoneExists(phone);
    setLoading(false);
    
    if (result.success) {
      onForgotPassword(phone);
    } else {
      setError(result.error || 'Phone number not found');
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="bg-brand-dark rounded-lg shadow-xl p-8 w-full max-w-md border border-brand-accent/20">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-brand-accent/10 rounded-full mb-4 text-brand-accent">
            <DumbbellIcon />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">HOUSE OF ATHLETES</h1>
          <p className="text-brand-accent font-semibold mb-1">Membership Portal</p>
          <p className="text-gray-400 text-sm">Login to view your subscription</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none text-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              4-Digit PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-accent"
              >
                {showPin ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            
            <div className="flex justify-between items-start mt-1">
              <p className="text-xs text-gray-500">
                First time? You'll be asked to create a PIN
              </p>
              <button 
                type="button"
                onClick={handleForgotPasswordClick}
                className="text-xs text-brand-accent hover:underline focus:outline-none"
              >
                Forgot PIN?
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 bg-brand-black text-brand-accent focus:ring-brand-accent accent-brand-accent"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-300 select-none cursor-pointer">
              Remember Me
            </label>
          </div>

          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger text-brand-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-brand-accent text-brand-black py-3 rounded-lg font-bold hover:bg-brand-accentHover transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Having trouble logging in?</p>
          <p className="mt-1">Contact House of Athletes administration</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;