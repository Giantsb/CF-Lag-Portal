
import { SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

/**
 * Common fetch wrapper for Apps Script POST requests.
 * Uses 'text/plain' to ensure a "Simple Request" that bypasses CORS preflight (OPTIONS).
 */
async function callAppsScript(payload: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased timeout to 20s for slow GAS cold starts

  try {
    console.log(`[MembershipService] Initiating POST to GAS...`, { action: payload.action });
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      // 'cors' is fine, but 'credentials: omit' and 'text/plain' are key to 
      // avoiding the preflight request that GAS doesn't handle.
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow', 
      headers: {
        'Content-Type': 'text/plain', 
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json;
    } catch (e) {
      console.error('[MembershipService] JSON Parse Error. Raw response:', text);
      throw new Error('Received malformed response from server.');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Server took too long to respond. Please try again.');
    }
    console.error('[MembershipService] Fetch operation failed:', err);
    throw err;
  }
}

/**
 * Verifies if a phone number exists in the database for PIN recovery.
 */
export async function verifyPhoneExists(phone: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[MembershipService] verifyPhoneExists called for: ${phone}`);
  try {
    const result = await callAppsScript({ action: 'verifyPhone', phone });
    if (result.success) {
      console.log('[MembershipService] verifyPhoneExists: Success');
      return { success: true };
    }
    console.warn('[MembershipService] verifyPhoneExists: Not found', result.message);
    return { success: false, error: result.message || 'Phone number not found' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error occurred.' };
  }
}

/**
 * Attempts to log in a member via the Apps Script API.
 */
export async function loginMember(phone: string, hashedPin: string): Promise<LoginResponse> {
  console.log(`[MembershipService] loginMember called for: ${phone}`);
  try {
    const result = await callAppsScript({
      action: 'login',
      phone: phone,
      hashedPin: hashedPin
    });

    if (result.success) {
      console.log('[MembershipService] loginMember: Success');
      return {
        success: true,
        member: result.member,
        needsSetup: result.needsPin
      };
    }

    console.warn('[MembershipService] loginMember: Failed', result.message);
    return {
      success: false,
      error: result.message || 'Invalid credentials',
      needsSetup: result.needsPin,
      invalidPin: result.error === 'invalidPin'
    };
  } catch (err: any) {
    return { 
      success: false, 
      error: err.message || 'Login service unavailable.' 
    };
  }
}

/**
 * Creates or resets a member's PIN in the Google Sheet backend.
 */
export async function createPin(phone: string, hashedPin: string): Promise<{ success: boolean; message?: string; data?: any }> {
  console.log(`[MembershipService] createPin called for: ${phone}`);
  try {
    const result = await callAppsScript({
      action: 'setupPin',
      phone: phone,
      hashedPin: hashedPin
    });

    if (result.success) {
      console.log('[MembershipService] createPin: Success');
    } else {
      console.warn('[MembershipService] createPin: Failed', result.message);
    }

    return {
      success: result.success,
      message: result.message,
      data: result.data
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to update PIN.'
    };
  }
}

/**
 * Retrieves member data for an active session by phone number.
 */
export async function getMemberByPhone(phone: string): Promise<MemberData | null> {
  console.log(`[MembershipService] getMemberByPhone called for: ${phone}`);
  try {
    const result = await callAppsScript({ action: 'getMember', phone });
    if (result.success && result.member) {
      console.log('[MembershipService] getMemberByPhone: Success');
      return result.member;
    }
    return null;
  } catch (err: any) {
    return null;
  }
}

/**
 * Saves the FCM notification token for a member.
 */
export async function saveNotificationToken(phone: string, token: string): Promise<{ success: boolean; message?: string }> {
  console.log(`[MembershipService] saveNotificationToken called for: ${phone}`);
  try {
    const result = await callAppsScript({
      action: 'saveNotificationToken',
      phone: phone,
      token: token
    });
    return {
      success: result.success,
      message: result.message
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to save token.'
    };
  }
}
