import React, { useState, useEffect } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from './Icons';
import { createPin, getMemberByPhone, requestResetOTP, resetPinWithOTP } from '../services/membershipService';
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

  // OTP Reset Flow states
  const [resetStep, setResetStep] = useState<'request_otp' | 'verify_otp'>('request_otp');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Retrieve portal type from temporary local storage
  const portalType = (localStorage.getItem('hoa_portal_type') as 'member' | 'hmo') || 'member';

  // Handle resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOTP = async () => {
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError('Please enter a valid registered email address');
      return;
    }

    setLoading(true);
    try {
      console.log(`[PinSetup] Requesting OTP for phone: ${phone} / email: ${email}`);
      const result = await requestResetOTP(phone, email.trim(), portalType);

      if (result.success) {
        logAnalyticsEvent('otp_request_success', { portal: portalType });
        setSuccess('Recovery code sent! Please check your email.');
        setResetStep('verify_otp');
        setResendCooldown(60); // 60s cooldown
      } else {
        setError(result.message || 'Verification failed. Please check your email address.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPinSubmit = async () => {
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit recovery code');
      return;
    }

    if (!newPin || newPin.length !== 4) {
      setError('New PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      const hashedPin = hashPin(newPin, phone);
      console.log(`[PinSetup] Resetting PIN with OTP for ${phone}...`);
      const result = await resetPinWithOTP(phone, otp.trim(), hashedPin, portalType);

      if (result.success) {
        logAnalyticsEvent('otp_reset_success', { portal: portalType });
        setSuccess('PIN successfully reset! Logging you in...');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const member = await getMemberByPhone(phone, portalType);
        if (member) {
          onSuccess(member);
        } else {
          setError('PIN reset successfully, but unable to auto-login. Please log in manually.');
          setTimeout(onBack, 3000);
        }
      } else {
        setError(result.message || 'Reset failed. Please verify your OTP code and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

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
      console.log(`[PinSetup] Hashing PIN for phone: ${phone} (Portal: ${portalType})`);
      const hashedPin = hashPin(newPin, phone);
      console.log(`[PinSetup] Hash generated: ${hashedPin.substring(0, 10)}...`);

      // 3. Save to Google Sheets via createPin()
      console.log(`[PinSetup] Saving PIN to Google Sheets...`);
      const result = await createPin(phone, hashedPin, portalType);

      if (result.success) {
        console.log(`[PinSetup] Success: PIN setup completed in backend.`);
        
        // Log Analytics Event
        logAnalyticsEvent('pin_setup_success', { 
          phone_hash: hashedPin.substring(0, 8),
          portal: portalType
        });

        // 4. Show success message
        setSuccess(`PIN created successfully! Logging you in...`);
        
        // Artificial delay for better UX visibility of success state
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 5. Auto-login via getMemberByPhone()
        console.log(`[PinSetup] Attempting auto-login for: ${phone}`);
        const member = await getMemberByPhone(phone, portalType);

        if (member) {
          console.log(`[PinSetup] Auto-login successful for ${member.firstName}`);
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

      <div className="bg-brand-dark rounded-2xl shadow-2xl p-8 w-full max-w-md border border-brand-border animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-brand-accent/10 rounded-3xl mb-4 text-brand-accent">
            <LockIcon className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-brand-textPrimary mb-1">
            {isReset ? 'Reset PIN' : 'Set Up PIN'}
          </h1>
          <p className="text-brand-textSecondary text-sm">
            {isReset 
              ? 'Recover access to your membership portal' 
              : 'Create a secure 4-digit PIN for your account'}
          </p>
          <div className="inline-flex items-center gap-1.5 bg-brand-black/40 border border-brand-border/50 px-3 py-1.5 rounded-full mt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
            <p className="text-xs font-mono font-bold text-brand-textSecondary">{phone}</p>
          </div>
        </div>

        <div className="space-y-5">
          {isReset ? (
            // ==========================================
            // PIN RESET FLOW (OTP-BASED)
            // ==========================================
            resetStep === 'request_otp' ? (
              <div className="space-y-4 animate-slideInUp">
                <div>
                  <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-2 ml-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="e.g. member@email.com"
                    className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-medium text-sm"
                  />
                  <p className="text-[10px] text-brand-textSecondary/60 mt-2 leading-relaxed ml-1">
                    For security, your email must exactly match the one on record with the CrossFit Lagos database.
                  </p>
                </div>

                {error && (
                  <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-danger animate-pulse" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleRequestOTP}
                  disabled={loading}
                  className="w-full bg-brand-accent text-brand-accentText py-4 rounded-xl font-bold hover:bg-brand-accentHover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/25 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying Email...</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-slideInUp">
                <div>
                  <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-2 ml-1">
                    6-Digit Recovery Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                      if (error) setError('');
                    }}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-mono text-center text-lg tracking-widest font-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-2 ml-1">
                    New 4-Digit PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      value={newPin}
                      onChange={(e) => {
                        setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        if (error) setError('');
                      }}
                      placeholder="••••"
                      maxLength={4}
                      inputMode="numeric"
                      className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-mono text-lg tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent transition-colors"
                    >
                      {showNewPin ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-2 ml-1">
                    Confirm New PIN
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPin ? 'text' : 'password'}
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        if (error) setError('');
                      }}
                      placeholder="••••"
                      maxLength={4}
                      inputMode="numeric"
                      className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-mono text-lg tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent transition-colors"
                    >
                      {showConfirmPin ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-danger animate-pulse" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                    {success}
                  </div>
                )}

                <button
                  onClick={handleResetPinSubmit}
                  disabled={loading}
                  className="w-full bg-brand-accent text-brand-accentText py-4 rounded-xl font-bold hover:bg-brand-accentHover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/25 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Resetting PIN...</span>
                    </>
                  ) : (
                    <span>Reset PIN & Login</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={resendCooldown > 0 || loading}
                    className="text-xs text-brand-textSecondary hover:text-brand-accent font-bold transition-colors disabled:opacity-50 disabled:hover:text-brand-textSecondary"
                  >
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Recovery Code'}
                  </button>
                </div>
              </div>
            )
          ) : (
            // ==========================================
            // REGULAR FIRST-TIME SETUP FLOW
            // ==========================================
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-2 ml-1">
                  Create 4-Digit PIN
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      if (error) setError('');
                    }}
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-mono text-lg tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent transition-colors"
                  >
                    {showNewPin ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-textSecondary uppercase tracking-wider mb-2 ml-1">
                  Confirm PIN
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      if (error) setError('');
                    }}
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full px-4 py-4 bg-brand-input border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none pr-12 text-brand-textPrimary transition-all placeholder-brand-textSecondary/30 font-mono text-lg tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-accent transition-colors"
                  >
                    {showConfirmPin ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-danger animate-pulse" />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                  {success}
                </div>
              )}

              <button
                onClick={handleSetupPin}
                disabled={loading}
                className="w-full bg-brand-accent text-brand-accentText py-4 rounded-xl font-bold hover:bg-brand-accentHover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/25 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Setting PIN...</span>
                  </>
                ) : (
                  <span>Set Up PIN</span>
                )}
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={onBack}
              className="w-full bg-brand-surface text-brand-textPrimary py-4 rounded-xl font-bold hover:opacity-80 transition-all border border-brand-border active:scale-[0.98]"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinSetupView;
