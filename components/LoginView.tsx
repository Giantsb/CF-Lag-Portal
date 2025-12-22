
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
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(val);
    if (error) setError('');
  };

  const handleLogin = async () => {
    setError('');
    
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    // Logic for Smart Login: 
    // If PIN is missing, we check if the user is a first-time user
    if (!pin) {
      setLoading(true);
      try {
        // We use a dummy PIN hash to trigger the backend check
        const dummyHash = hashPin('0000', phone);
        const result = await loginMember(phone, dummyHash);
        
        if (result.needsSetup) {
          logAnalyticsEvent('auto_redirect_setup', { phone });
          onRequireSetup(phone);
          return;
        }
        
        if (result.success && result.member) {
          // Rare case: user actually has 0000 as PIN
          onSuccess(result.member);
          return;
        }

        // If they exist but have a PIN, prompt them to enter it
        setError('Welcome back! Please enter your 4-digit PIN to continue.');
      } catch (err) {
        setError('Could not verify account. Check your connection.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    setLoading(true);
    try {
      const hashedPin = hashPin(pin, phone);
      const result = await loginMember(phone, hashedPin);
      
      if (result.success && result.member) {
        localStorage.setItem('hoa_session', JSON.stringify({
           phone: phone,
           expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
        }));
        
        logAnalyticsEvent('user_login_success', { method: 'portal' });
        onSuccess(result.member);
      } else if (result.needsSetup) {
        onRequireSetup(phone);
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setError('Unable to connect. Please check your internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinClick = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('Please enter your phone number first');
      return;
    }
    
    setLoading(true);
    try {
      const result = await verifyPhoneExists(phone);
      if (result.success) {
        onResetPin(phone);
      } else {
        setError(result.error || 'Phone number not found in our records.');
      }
    } catch (err) {
      setError('Service currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="bg-brand-dark rounded-2xl shadow-2xl p-8 w-full max-w-md border border-brand-border animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-brand-accent/10 rounded-3xl mb-4 text-brand-accent">
            <DumbbellIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-brand-textPrimary mb-1">CrossFit Lagos</h1>
          <p className="text-brand-accent font-bold text-sm tracking-widest uppercase mb-4 opacity-80">Membership Portal</p>
          <p className="text-brand-textSecondary text-sm px-6">Access your subscription, schedule, and renewal status.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-2 ml-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="080 1234 5678"
              inputMode="tel"
              className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-medium"
            />
          </div>

          <div className="animate-slideInUp" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                4-Digit PIN
              </label>
            </div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (error) setError('');
                }}
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-mono text-xl tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent transition-colors"
              >
                {showPin ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-danger animate-pulse" />
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-brand-accent text-brand-accentText py-4 rounded-xl font-bold hover:bg-brand-accentHover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-brand-accent/20 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>{pin ? 'Login' : 'Continue'}</span>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-3 items-center pt-2">
            <button 
              type="button"
              onClick={handleForgotPinClick}
              className="text-xs text-brand-textSecondary hover:text-brand-accent font-bold transition-colors"
            >
              Forgot or Reset PIN?
            </button>
            
            <div className="h-px w-12 bg-brand-border" />
            
            <p className="text-[10px] text-brand-textSecondary/60 text-center leading-relaxed">
              New members will be automatically redirected <br/> to set up their PIN upon first login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
