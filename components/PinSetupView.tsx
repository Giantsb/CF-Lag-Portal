import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from './Icons';
import { createPin, getMemberByPhone } from '../services/membershipService';
import { hashPin } from '../utils/encryption';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updatePassword,
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
      // This is the source of truth for the Fallback Mechanism.
      const hashedPin = hashPin(newPin, phone);
      const sheetResult = await createPin(phone, hashedPin);

      if (!sheetResult.success) {
         throw new Error(sheetResult.message || 'Failed to update database');
      }

      // 2. Update Firebase Auth (Persistence Layer)
      const email = getEmailFromPhone(phone);
      const password = getPasswordFromPin(newPin);
      
      let user = auth.currentUser;
      let firebaseUpdated = false;

      // Case A: User is already logged in (e.g. valid session, just updating PIN)
      if (user) {
        try {
          await updatePassword(user, password);
          firebaseUpdated = true;
          console.log('Firebase password updated for existing session');
        } catch (e: any) {
          console.warn('Failed to update password for active session:', e);
          if (e.code === 'auth/requires-recent-login') {
             // We can't re-auth without the old PIN, so we treat this as a "soft" failure
             // and proceed to the Fallback.
             console.warn('Re-authentication required but not possible. Falling back to Sheet.');
          }
        }
      } 
      // Case B: User is not logged in (Reset Flow or New User)
      else {
        try {
          // Try to create new user
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
          firebaseUpdated = true;
          logAnalyticsEvent('new_member_registered', { method: 'pin_setup' });
        } catch (authError: any) {
          // If user already exists, this is a PIN RESET.
          if (authError.code === 'auth/email-already-in-use') {
             console.log('User exists, treating as PIN Reset/Update');
             
             // Attempt to sign in with the NEW PIN 
             // This handles the case where the user is resetting to the SAME pin,
             // or if an admin already reset it on the backend.
             try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
                firebaseUpdated = true;
                console.log('Signed in with new PIN, Firebase is in sync');
             } catch (signInErr) {
                // CRITICAL: If this fails, it means the Old PIN is still active in Firebase.
                // We CANNOT update the Firebase password without the Old PIN (which the user forgot).
                // We proceed anyway, relying on the 'fallbackLogin' mechanism in LoginView
                // which checks the Google Sheet (which we successfully updated in Step 1).
                console.warn('Cannot sync Firebase password without old credentials. Relying on Fallback Login.');
                logAnalyticsEvent('pin_reset_fallback_activated', { phone_hash: hashedPin });
             }
          } else {
             throw authError;
          }
        }
      }

      // 3. Update Firestore Profile if we have a valid user object
      if (user && firebaseUpdated) {
        try {
          await setDoc(doc(db, "users", user.uid), {
            phone: phone,
            registeredAt: new Date(),
            profile: 'main',
            lastPinUpdate: new Date()
          }, { merge: true });
        } catch (e) {
          console.warn('Failed to update Firestore profile', e);
        }
      }

      setSuccess(`PIN ${isReset ? 'reset' : 'created'} successfully! Logging you in...`);
      
      // 4. Fetch member data and finish
      // We wait a moment for the Sheet update to potentially propagate
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const member = await getMemberByPhone(phone);

      if (member) {
        onSuccess(member);
      } else {
        setError('PIN updated, but unable to auto-login. Please try logging in manually.');
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