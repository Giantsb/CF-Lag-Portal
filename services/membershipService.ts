
import { SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

/**
 * Common fetch wrapper for Apps Script POST requests.
 * Google Apps Script (GAS) does not support CORS preflight (OPTIONS).
 * To avoid preflight, we MUST use a "Simple Request":
 * 1. Method must be POST
 * 2. Headers must be simple (text/plain is allowed)
 */
async function callAppsScript(payload: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s for cold starts

  try {
    const urlPreview = `${SCRIPT_URL.substring(0, 15)}...${SCRIPT_URL.substring(SCRIPT_URL.length - 10)}`;
    console.log(`[MembershipService] Sending ${payload.action} to: ${urlPreview}`);
    console.log(`[MembershipService] Payload Phone: "${payload.phone}"`);
    
    // Explicitly setting Content-Type to text/plain is the best practice for GAS simple requests
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Required for GAS redirects to work
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      // If we got HTML, the script likely crashed on the server or is private
      if (text.trim().toLowerCase().startsWith('<!doctype html')) {
        console.error('[MembershipService] CRITICAL: Backend returned HTML. Check if GAS is set to "Anyone" and verify CONFIG variables.');
        throw new Error('Backend script error. Please verify the Google Apps Script deployment.');
      }
      throw new Error('Server returned invalid data format.');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. The Google Script is taking too long.');
    }
    
    console.error('[MembershipService] Request failed:', err.message);
    throw err;
  }
}

export async function verifyPhoneExists(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callAppsScript({ action: 'verifyPhone', phone: phone.trim() });
    return result.success ? { success: true } : { success: false, error: result.message || 'Phone number not found' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Verification service error.' };
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
      if (result.invalidPin) {
        return { success: false, error: 'Invalid PIN. Please try again.', invalidPin: true };
      }
      if (result.needsPin) {
        return { success: true, needsSetup: true };
      }
      return { success: true, member: result.member };
    }

    return {
      success: false,
      error: result.message || 'Invalid credentials.',
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
