
import { SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

/**
 * Common fetch wrapper for Apps Script POST requests.
 * Google Apps Script (GAS) does not support CORS preflight (OPTIONS).
 * To avoid preflight, we MUST use a "Simple Request":
 * 1. Method must be POST
 * 2. Headers must be simple (text/plain is allowed)
 * 3. No custom headers
 */
async function callAppsScript(payload: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); 

  try {
    console.log(`[MembershipService] Dispatching ${payload.action} to GAS...`);
    
    // Using a plain string as the body with NO explicit Content-Type header
    // is the most reliable way to force a Simple Request in modern browsers.
    // The browser will default to text/plain;charset=UTF-8 which GAS accepts.
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
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
      // If we got HTML, the script likely crashed on the server
      if (text.trim().toLowerCase().startsWith('<!doctype html')) {
        console.error('[MembershipService] CRITICAL: Backend returned HTML error page. This usually means your GAS script crashed (check for missing "CONFIG" variable) or Deployment Access is not set to "Anyone".');
        throw new Error('Backend script error. Please check Google Apps Script logs.');
      }
      throw new Error('Server returned invalid data format.');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. The backend is taking too long to respond.');
    }
    
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      console.error(
        '[MembershipService] CORS Failure Detected.\n' +
        '1. Ensure GAS is deployed as "Web App".\n' +
        '2. Set "Who has access" to "Anyone" (NOT "Anyone with Google Account").\n' +
        '3. Ensure the script itself is not crashing before it returns the response.'
      );
    }
    
    throw err;
  }
}

export async function verifyPhoneExists(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callAppsScript({ action: 'verifyPhone', phone });
    return result.success ? { success: true } : { success: false, error: result.message || 'Phone number not found' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Verification service error.' };
  }
}

export async function loginMember(phone: string, hashedPin: string): Promise<LoginResponse> {
  try {
    const result = await callAppsScript({
      action: 'login',
      phone: phone,
      hashedPin: hashedPin
    });

    if (result.success) {
      return {
        success: true,
        member: result.member,
        needsSetup: result.needsPin
      };
    }

    return {
      success: false,
      error: result.message || 'Invalid PIN',
      needsSetup: result.needsPin,
      invalidPin: result.error === 'invalidPin'
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Login failed.' };
  }
}

export async function createPin(phone: string, hashedPin: string): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const result = await callAppsScript({
      action: 'setupPin',
      phone: phone,
      hashedPin: hashedPin
    });
    return { success: result.success, message: result.message, data: result.data };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update PIN.' };
  }
}

export async function getMemberByPhone(phone: string): Promise<MemberData | null> {
  try {
    const result = await callAppsScript({ action: 'getMember', phone });
    return (result.success && result.member) ? result.member : null;
  } catch (err: any) {
    return null;
  }
}

export async function saveNotificationToken(phone: string, token: string): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await callAppsScript({
      action: 'saveNotificationToken',
      phone: phone,
      token: token
    });
    return { success: result.success, message: result.message };
  } catch (err: any) {
    return { success: false, message: 'Failed to save token.' };
  }
}
