
import { SCRIPT_URL, WOD_SCRIPT_URL, HMO_SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

/**
 * Common fetch wrapper for Apps Script POST requests.
 */
async function callAppsScript(payload: any, portalType: 'member' | 'hmo' = 'member') {
  // Select target URL based on portal type
  const targetUrl = portalType === 'hmo' ? HMO_SCRIPT_URL : SCRIPT_URL;

  // Demo Mode Bypass
  if (payload.phone === '08000000000') {
    if (payload.action === 'login') {
      // Mock successful login for demo
      return {
        success: true,
        member: {
          firstName: 'Demo',
          lastName: 'Member',
          email: 'demo@cflagos.com',
          phone: '08000000000',
          package: portalType === 'hmo' ? 'HMO Plan' : 'Unlimited Monthly',
          amount: '50,000',
          duration: '12 Months',
          startDate: '2026-02-01',
          expirationDate: '2027-02-01',
          status: 'Valid',
          pauseDays: '0'
        }
      };
    }
    if (payload.action === 'verifyPhone') {
      return { success: true, exists: true, message: 'Phone number verified' };
    }
    if (payload.action === 'requestResetOTP') {
      return { success: true, message: 'Recovery code sent to your email address.' };
    }
    if (payload.action === 'resetPinWithOTP') {
      return { success: true, message: 'Your PIN has been successfully reset. You can now log in.' };
    }
    if (payload.action === 'updateEmail') {
      return { success: true, message: 'Email address updated successfully', updatedEmail: payload.newEmail };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    console.log(`[MembershipService] Action: ${payload.action} | Phone: ${payload.phone} | Portal: ${portalType}`);
    
    if (!targetUrl) {
      throw new Error(`${portalType === 'hmo' ? 'HMO' : 'Member'} portal script URL is not configured.`);
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (text.trim().toLowerCase().startsWith('<!doctype html')) {
        throw new Error('Backend script error (HTML returned). Check GAS permissions.');
      }
      throw new Error('Invalid JSON response from server.');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[MembershipService] Request failed:', err.message);
    throw err;
  }
}

/**
 * Verifies if a phone number exists.
 * Uses the dedicated 'verifyPhone' action, with fallback to 'getMember'.
 */
export async function verifyPhoneExists(phone: string, portalType: 'member' | 'hmo' = 'member'): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[MembershipService] Verifying phone using "verifyPhone" on ${portalType} portal...`);
    const result = await callAppsScript({ action: 'verifyPhone', phone: phone.trim() }, portalType);
    
    if (result.success && result.exists) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.message || 'This phone number was not found in our membership records.' 
      };
    }
  } catch (err: any) {
    try {
      console.log(`[MembershipService] Fallback to "getMember" for verification...`);
      const fallbackResult = await callAppsScript({ action: 'getMember', phone: phone.trim() }, portalType);
      if (fallbackResult.success === true) {
        return { success: true };
      }
    } catch (_) {}
    return { success: false, error: 'Service temporarily unavailable. Please try again later.' };
  }
}

export async function loginMember(phone: string, hashedPin: string, portalType: 'member' | 'hmo' = 'member'): Promise<LoginResponse> {
  try {
    const result = await callAppsScript({
      action: 'login',
      phone: phone.trim(),
      hashedPin: hashedPin
    }, portalType);

    if (result.success) {
      if (result.invalidPin) return { success: false, error: 'Invalid PIN. Please try again.', invalidPin: true };
      if (result.needsPin) return { success: true, needsSetup: true };
      return { success: true, member: result.member };
    }

    return {
      success: false,
      error: result.message || 'Login failed.',
      needsSetup: result.needsPin,
      invalidPin: result.invalidPin
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Login failed.' };
  }
}

export async function createPin(phone: string, hashedPin: string, portalType: 'member' | 'hmo' = 'member'): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const result = await callAppsScript({
      action: 'setupPin',
      phone: phone.trim(),
      hashedPin: hashedPin
    }, portalType);
    return { success: result.success, message: result.message, data: result.data };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update PIN.' };
  }
}

export async function getMemberByPhone(phone: string, portalType: 'member' | 'hmo' = 'member'): Promise<MemberData | null> {
  try {
    const result = await callAppsScript({ action: 'getMember', phone: phone.trim() }, portalType);
    return (result.success && result.member) ? result.member : null;
  } catch (err: any) {
    return null;
  }
}

export async function saveNotificationToken(phone: string, token: string, portalType: 'member' | 'hmo' = 'member'): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await callAppsScript({
      action: 'saveNotificationToken',
      phone: phone.trim(),
      token: token
    }, portalType);
    return { success: result.success, message: result.message };
  } catch (err: any) {
    return { success: false, message: 'Failed to save token.' };
  }
}

/**
 * Fetches the status of the most recent pause request for a member.
 * Uses GET request as per the Google Apps Script doGet implementation.
 */
export async function getPauseStatus(phone: string, portalType: 'member' | 'hmo' = 'member'): Promise<{ status: string; date?: string }> {
  // Demo Mode Bypass
  if (phone === '08000000000') {
    return { status: 'Pending', date: '2026-03-02' };
  }

  try {
    // Select base script URL based on portal type
    const baseScriptUrl = portalType === 'hmo' ? HMO_SCRIPT_URL : SCRIPT_URL;
    
    // Use WOD_SCRIPT_URL if available for members, as it often contains the unified logic
    // For HMO, we strictly use HMO_SCRIPT_URL
    const targetUrl = portalType === 'hmo' ? HMO_SCRIPT_URL : (WOD_SCRIPT_URL || baseScriptUrl);
    
    if (!targetUrl) return { status: 'None' };

    // Sending both userId and phone for maximum compatibility with different script versions
    const encodedPhone = encodeURIComponent(phone.trim());
    const url = `${targetUrl}?mode=pauseStatus&userId=${encodedPhone}&phone=${encodedPhone}`;
    
    console.log(`[MembershipService] Checking pause status for: ${phone}`);
    
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    return {
      status: result.status || 'None',
      date: result.date || ''
    };
  } catch (err: any) {
    console.error('[MembershipService] Failed to fetch pause status:', err.message);
    return { status: 'Error' };
  }
}

/**
 * Requests a 6-digit OTP code to reset a member's PIN.
 * Requires their registered email to match the phone record.
 */
export async function requestResetOTP(
  phone: string,
  email: string,
  portalType: 'member' | 'hmo' = 'member'
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await callAppsScript({
      action: 'requestResetOTP',
      phone: phone.trim(),
      email: email.trim()
    }, portalType);
    return { success: result.success, message: result.message };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to send recovery code.' };
  }
}

/**
 * Resets the 4-digit PIN using the 6-digit OTP code received in email.
 */
export async function resetPinWithOTP(
  phone: string,
  otp: string,
  newHashedPin: string,
  portalType: 'member' | 'hmo' = 'member'
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await callAppsScript({
      action: 'resetPinWithOTP',
      phone: phone.trim(),
      otp: otp.trim(),
      newHashedPin: newHashedPin
    }, portalType);
    return { success: result.success, message: result.message };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to reset PIN.' };
  }
}

/**
 * Updates a member's email address in the sheet (authenticated by phone + hashed PIN).
 */
export async function updateEmail(
  phone: string,
  hashedPin: string,
  newEmail: string,
  portalType: 'member' | 'hmo' = 'member'
): Promise<{ success: boolean; message?: string; updatedEmail?: string }> {
  try {
    const result = await callAppsScript({
      action: 'updateEmail',
      phone: phone.trim(),
      hashedPin: hashedPin,
      newEmail: newEmail.trim()
    }, portalType);
    return { success: result.success, message: result.message, updatedEmail: result.updatedEmail };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update email.' };
  }
}
