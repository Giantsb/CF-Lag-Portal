import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from './Icons';
import { createPin, getMemberByPhone } from '../services/membershipService';
import { hashPin } from '../utils/encryption';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  getEmailFromPhone, 
  getPasswordFromPin,
  db,
  doc,
  setDoc,
  logAnalyticsEvent
} from '../services/firebase';
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

    try {
      // 1. Create/Sync with Google Sheet (Legacy/Admin Backend)
      // We still do this so the Admin Sheet is updated
      const hashedPin = hashPin(newPin, phone);
      const sheetResult = await createPin(phone, hashedPin);

      if (!sheetResult.success) {
         throw new Error(sheetResult.message || 'Failed to update database');
      }

      // 2. Register with Firebase Auth (Persistence Layer)
      const email = getEmailFromPhone(phone);
      const password = getPasswordFromPin(newPin);

      // We attempt to create a user. If they exist (resetting PIN), we might need to handle that differently
      // ideally using updatePassword, but for simplicity in this "Setup" flow which acts as Register:
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 3. Store marker in Firestore
        await setDoc(doc(db, "users", user.uid), {
           phone: phone,
           registeredAt: new Date(),
           profile: 'main'
        });

        // Log analytics event
        logAnalyticsEvent('new_member_registered', { method: 'pin_setup' });

      } catch (authError: any) {
        // If user already exists (auth/email-already-in-use), this is a PIN RESET.
        // In a real email/pass flow, we'd need old password to change it.
        // However, since we are admin-controlled via Sheet, we might just want to 
        // let them "Login" if the PIN matches, OR strictly speaking, we can't update 
        // the Firebase password without the old one or an admin SDK.
        
        // For this specific implementation request:
        // If email in use, we assume they are trying to reset.
        if (authError.code === 'auth/email-already-in-use') {
           setError('Account exists. Please contact admin to reset Firebase password or try logging in.');
           setLoading(false);
           return;
        } else {
           throw authError;
        }
      }

      setSuccess(`PIN ${isReset ? 'reset' : 'created'} successfully! Logging you in...`);
      
      // 4. Fetch member data and finish
      const [member] = await Promise.all([
        getMemberByPhone(phone),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);

      if (member) {
        onSuccess(member);
      } else {
        setError('PIN created, but unable to auto-login. Please try logging in manually.');
        setTimeout(onBack, 2000);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during setup.');
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