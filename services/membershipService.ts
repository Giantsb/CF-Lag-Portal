
import { SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

/**
 * Common fetch wrapper for Apps Script POST requests.
 * We must ensure this stays a "Simple Request" to bypass CORS preflight.
 */
async function callAppsScript(payload: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); 

  try {
    console.log(`[MembershipService] POSTing to: ${SCRIPT_URL.substring(0, 45)}...`);
    
    // Simple Request requirements:
    // 1. Method is POST
    // 2. Content-Type is 'text/plain'
    // 3. No custom headers
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
      redirect: 'follow', // Vital for GAS redirects
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Network response error: ${response.status}`);
    }

    const text = await response.text();
    
    try {
      return JSON.parse(text);
    } catch (e) {
      if (text.includes('<!DOCTYPE html>')) {
        throw new Error('Server returned an HTML error page. Check GAS permissions.');
      }
      throw new Error('Invalid JSON response from server.');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[MembershipService] Error:', err.message);
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
    return { success: false, error: 'Failed to connect to login server.' };
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
    return { success: false, message: 'Failed to update PIN.' };
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
