
import React, { useState } from 'react';
import { DumbbellIcon, EyeIcon, EyeOffIcon } from './Icons';
import { loginMember, verifyPhoneExists } from '../services/membershipService';
import { logAnalyticsEvent } from '../services/firebase';
import { hashPin } from '../utils/encryption';
import { MemberData } from '../types';
import ThemeToggle from './ThemeToggle';

interface LoginViewProps {
  onSuccess: (member: MemberData) => void;
  onRequireSetup: (phone: string) => void;
  onResetPin: (phone: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onRequireSetup, onResetPin }) => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and max 11 characters
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(val);
  };

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

    console.log('Login attempt for:', phone);

    try {
      const hashedPin = hashPin(pin, phone);
      console.log('Generated hash:', hashedPin);

      const result = await loginMember(phone, hashedPin);
      console.log('API Response:', result);
      
      if (result.success && result.member) {
        console.log('Login Success:', result.member);
        
        // Handle session persistence
        localStorage.setItem('hoa_session', JSON.stringify({
           phone: phone,
           expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
        }));
        
        logAnalyticsEvent('user_login_success', { method: 'sheets_backend' });
        onSuccess(result.member);
      } else if (result.needsSetup) {
        console.log('Login Progress: Redirecting to PIN setup');
        onRequireSetup(phone);
      } else {
        const errorMsg = result.error || 'Invalid PIN or Phone Number';
        console.log('Login Failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Login system error:', err);
      setError('Login failed. Please check your connection.');
    }

    setLoading(false);
  };

  const handleForgotPinClick = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('Please enter your phone number to reset PIN');
      return;
    }
    
    setLoading(true);
    const result = await verifyPhoneExists(phone);
    setLoading(false);
    
    if (result.success) {
      onResetPin(phone);
    } else {
      setError(result.error || 'Phone number not found');
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="bg-brand-dark rounded-lg shadow-xl p-8 w-full max-w-md border border-brand-border">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-brand-accent/10 rounded-full mb-4 text-brand-accent">
            <DumbbellIcon />
          </div>
          <h1 className="text-3xl font-bold text-brand-textPrimary mb-2">CrossFit Lagos</h1>
          <p className="text-brand-accent font-semibold mb-1">Membership Portal</p>
          <p className="text-brand-textSecondary text-sm">Login to view your subscription</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-textSecondary mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="08012345678"
              inputMode="tel"
              className="w-full px-4 py-3 bg-brand-input border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none text-brand-textPrimary transition-all placeholder-brand-textSecondary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-textSecondary mb-2">
              4-Digit PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                className="w-full px-4 py-3 bg-brand-input border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/50"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent"
              >
                {showPin ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            
            <div className="flex justify-between items-start mt-1">
              <div className="flex items-center">
                 <input 
                   id="remember-me"
                   type="checkbox" 
                   checked={rememberMe}
                   onChange={(e) => setRememberMe(e.target.checked)}
                   className="h-4 w-4 rounded border-brand-border bg-brand-input text-brand-accent focus:ring-brand-accent accent-brand-accent"
                 />
                 <label htmlFor="remember-me" className="ml-2 block text-xs text-brand-textSecondary cursor-pointer">
                   Remember me
                 </label>
              </div>
              <button 
                type="button"
                onClick={handleForgotPinClick}
                className="text-xs text-brand-accent hover:underline focus:outline-none"
              >
                Forgot PIN?
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger text-brand-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-brand-accent text-brand-accentText py-3 rounded-lg font-bold hover:bg-brand-accentHover transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
