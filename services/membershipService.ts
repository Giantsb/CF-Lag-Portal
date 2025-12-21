
import { SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

/**
 * Common fetch wrapper for Apps Script POST requests.
 */
async function callAppsScript(payload: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const urlPreview = `${SCRIPT_URL.substring(0, 15)}...${SCRIPT_URL.substring(SCRIPT_URL.length - 10)}`;
    console.log(`[MembershipService] Action: ${payload.action} | Phone: ${payload.phone}`);
    
    const response = await fetch(SCRIPT_URL, {
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
 * We use 'getMember' as a fail-safe because it exists in all backend versions.
 */
export async function verifyPhoneExists(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[MembershipService] Verifying phone using "getMember" action...');
    const result = await callAppsScript({ action: 'getMember', phone: phone.trim() });
    
    // If getMember succeeds, the member exists in the sheet
    if (result.success === true) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.message || 'This phone number was not found in our membership records.' 
      };
    }
  } catch (err: any) {
    return { success: false, error: 'Service temporarily unavailable. Please try again later.' };
  }
}

export async function loginMember(phone: string, hashedPin: string): Promise<LoginResponse> {
  try {
    const result = await callAppsScript({
      action: 'login',
      phone: phone.trim(),
      hashedPin: hashedPin
    });

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

export async function createPin(phone: string, hashedPin: string): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const result = await callAppsScript({
      action: 'setupPin',
      phone: phone.trim(),
      hashedPin: hashedPin
    });
    return { success: result.success, message: result.message, data: result.data };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update PIN.' };
  }
}

export async function getMemberByPhone(phone: string): Promise<MemberData | null> {
  try {
    const result = await callAppsScript({ action: 'getMember', phone: phone.trim() });
    return (result.success && result.member) ? result.member : null;
  } catch (err: any) {
    return null;
  }
}

export async function saveNotificationToken(phone: string, token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await callAppsScript({
      action: 'saveNotificationToken',
      phone: phone.trim(),
      token: token
    });
    return { success: result.success, message: result.message };
  } catch (err: any) {
    return { success: false, message: 'Failed to save token.' };
  }
}
