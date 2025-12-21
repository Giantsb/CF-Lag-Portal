import { SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

/**
 * Attempts to log in a member via the Apps Script API.
 */
export const loginMember = async (phone: string, hashedPin: string): Promise<LoginResponse> => {
  console.log(`[MembershipService] Attempting login for phone: ${phone}`);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'login',
        phone: phone,
        hashedPin: hashedPin
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[MembershipService] Login API response:', result);

    if (result.success) {
      console.log('[MembershipService] Login successful');
      return { 
        success: true, 
        member: result.member,
        needsSetup: result.needsPin // Maps backend 'needsPin' to 'needsSetup'
      };
    }

    // Handle specific error cases
    const errorMsg = result.message || 'Login failed';
    console.warn(`[MembershipService] Login failed: ${errorMsg}`);
    
    return { 
      success: false, 
      error: errorMsg,
      needsSetup: result.needsPin,
      invalidPin: result.error === 'invalidPin'
    };
  } catch (err: any) {
    console.error('[MembershipService] Login request exception:', err);
    return { success: false, error: err.message || 'Network error occurred during login.' };
  }
};

/**
 * Verifies if a phone number exists in the database for PIN recovery.
 */
export const verifyPhoneExists = async (phone: string): Promise<{ success: boolean; error?: string }> => {
  console.log(`[MembershipService] Verifying phone: ${phone}`);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'verifyPhone',
        phone: phone
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.message || 'Phone number not found' };
  } catch (err: any) {
    console.error('[MembershipService] Verify phone exception:', err);
    return { success: false, error: err.message || 'Network error occurred.' };
  }
};

/**
 * Creates or resets a member's PIN in the Google Sheet backend.
 */
export const createPin = async (phone: string, hashedPin: string): Promise<{ success: boolean; message?: string; data?: any }> => {
  console.log(`[MembershipService] Setting up PIN for phone: ${phone}`);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'setupPin',
        phone: phone,
        hashedPin: hashedPin
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[MembershipService] PIN setup response:', result);

    if (result.success) {
      console.log('[MembershipService] PIN setup successful');
      return { success: true, message: result.message, data: result.data };
    }

    console.warn('[MembershipService] PIN setup failed:', result.message);
    return { success: false, message: result.message || 'Failed to setup PIN' };
  } catch (err: any) {
    console.error('[MembershipService] PIN setup exception:', err);
    return { success: false, message: err.message || 'Network error during PIN setup.' };
  }
};

/**
 * Retrieves member data for an active session by phone number.
 */
export const getMemberByPhone = async (phone: string): Promise<MemberData | null> => {
  console.log(`[MembershipService] Fetching member data for: ${phone}`);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'getMember',
        phone: phone
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.member) {
      console.log('[MembershipService] Member data retrieved successfully');
      return result.member;
    }

    console.warn('[MembershipService] Member not found or retrieval failed');
    return null;
  } catch (err: any) {
    console.error('[MembershipService] GetMember exception:', err);
    return null;
  }
};

/**
 * Saves the FCM notification token for a member.
 */
export const saveNotificationToken = async (phone: string, token: string): Promise<{ success: boolean; message?: string }> => {
  console.log(`[MembershipService] Saving notification token for: ${phone}`);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveNotificationToken',
        phone: phone,
        token: token
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[MembershipService] Save notification token response:', result);

    if (result.success) {
      console.log('[MembershipService] Token saved successfully');
      return { success: true, message: result.message };
    }

    console.warn('[MembershipService] Failed to save token:', result.message);
    return { success: false, message: result.message || 'Failed to save notification token' };
  } catch (err: any) {
    console.error('[MembershipService] Save token exception:', err);
    return { success: false, message: err.message || 'Network error while saving notification token.' };
  }
};