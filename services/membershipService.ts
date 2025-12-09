import { SHEET_URL, SCRIPT_URL } from '../constants';
import { MemberData, LoginResponse } from '../types';

export const parseCSV = (csvText: string): string[][] => {
  return csvText.split('\n').map(row => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
};

export const verifyPhoneExists = async (phone: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(SHEET_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    if (!csvText || csvText.trim().length === 0) {
      return { success: false, error: 'Empty response from server' };
    }
    
    const rows = parseCSV(csvText);

    const HEADER_ROW = 7;
    if (rows.length <= HEADER_ROW) {
        return { success: false, error: 'Invalid data format from server' };
    }

    const headers = rows[HEADER_ROW].map(h => h.replace(/[""]/g, '').trim());
    const data = rows.slice(HEADER_ROW + 1).filter(row => row.some(cell => cell && cell.trim()));

    const phoneIndex = headers.findIndex(h => {
      const normalized = h.toLowerCase().replace(/[""]/g, '').trim();
      return normalized === 'phone' || normalized.includes('phone');
    });
    
    if (phoneIndex === -1) {
      return { success: false, error: `Phone column not found` };
    }
    
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    const memberRow = data.find(row => {
      const rowPhone = row[phoneIndex]?.replace(/[\s\-\(\)]/g, '');
      return rowPhone && rowPhone.includes(cleanPhone.slice(-10));
    });

    if (!memberRow) {
      return { success: false, error: 'Phone number not found in our records' };
    }

    return { success: true };

  } catch (err: any) {
    console.error('Verification error:', err);
    return { success: false, error: err.message || 'Unable to verify phone number.' };
  }
};

/**
 * Fetches member data verifying with a hashed PIN.
 * @param phone - The user's phone number
 * @param hashedPin - The pre-hashed PIN (SHA-256)
 */
export const fetchMemberData = async (phone: string, hashedPin: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(SHEET_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    if (!csvText || csvText.trim().length === 0) {
      return { success: false, error: 'Empty response from server' };
    }
    
    const rows = parseCSV(csvText);

    // Assuming header is at row index 7 as per original code
    const HEADER_ROW = 7;
    if (rows.length <= HEADER_ROW) {
        return { success: false, error: 'Invalid data format from server' };
    }

    const headers = rows[HEADER_ROW].map(h => h.replace(/[""]/g, '').trim());
    const data = rows.slice(HEADER_ROW + 1).filter(row => row.some(cell => cell && cell.trim()));

    const phoneIndex = headers.findIndex(h => {
      const normalized = h.toLowerCase().replace(/[""]/g, '').trim();
      return normalized === 'phone' || normalized.includes('phone');
    });
    
    if (phoneIndex === -1) {
      return { success: false, error: `Phone column not found.` };
    }

    const pinIndex = headers.findIndex(h => {
      const normalized = h.toLowerCase().replace(/[""]/g, '').trim();
      return normalized === 'pin' || normalized.includes('pin');
    });
    
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    const memberRow = data.find(row => {
      const rowPhone = row[phoneIndex]?.replace(/[\s\-\(\)]/g, '');
      return rowPhone && rowPhone.includes(cleanPhone.slice(-10));
    });

    if (!memberRow) {
      return { success: false, error: 'Phone number not found' };
    }

    const storedPin = memberRow[pinIndex];
    
    if (!storedPin || storedPin === '' || storedPin.toString().trim() === '') {
      return { success: true, needsSetup: true };
    }

    const cleanStoredPin = storedPin.toString().trim();
    const cleanEnteredPin = hashedPin.toString().trim();
    
    if (cleanEnteredPin !== cleanStoredPin) {
      return { success: false, error: 'Invalid PIN' };
    }

    // Map fields dynamically based on header names
    const getField = (keyword: string) => {
        const idx = headers.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()));
        return idx !== -1 ? memberRow[idx] || '' : '';
    };

    const member: MemberData = {
      firstName: getField('First Name'),
      lastName: getField('Last Name'),
      email: getField('email'),
      phone: memberRow[phoneIndex] || '',
      package: getField('package'),
      amount: getField('amount'),
      duration: getField('duration'),
      startDate: getField('Start Date'),
      expirationDate: getField('Expiration Date'),
      status: getField('status'),
      pauseDays: getField('Pause Days') || '0'
    };

    return { success: true, member };

  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: err.message || 'Unable to fetch membership data.' };
  }
};

export const getMemberByPhone = async (phone: string): Promise<MemberData | null> => {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) return null;
    
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const HEADER_ROW = 7;
    
    if (rows.length <= HEADER_ROW) return null;

    const headers = rows[HEADER_ROW].map(h => h.replace(/[""]/g, '').trim());
    const data = rows.slice(HEADER_ROW + 1).filter(row => row.some(cell => cell && cell.trim()));

    const phoneIndex = headers.findIndex(h => {
      const normalized = h.toLowerCase().replace(/[""]/g, '').trim();
      return normalized === 'phone' || normalized.includes('phone');
    });
    
    if (phoneIndex === -1) return null;
    
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    const memberRow = data.find(row => {
      const rowPhone = row[phoneIndex]?.replace(/[\s\-\(\)]/g, '');
      return rowPhone && rowPhone.includes(cleanPhone.slice(-10));
    });

    if (!memberRow) return null;

    // Mapping logic
    const getField = (keyword: string) => {
        const idx = headers.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()));
        return idx !== -1 ? memberRow[idx] || '' : '';
    };

    const member: MemberData = {
      firstName: getField('First Name'),
      lastName: getField('Last Name'),
      email: getField('email'),
      phone: memberRow[phoneIndex] || '',
      package: getField('package'),
      amount: getField('amount'),
      duration: getField('duration'),
      startDate: getField('Start Date'),
      expirationDate: getField('Expiration Date'),
      status: getField('status'),
      pauseDays: getField('Pause Days') || '0'
    };

    return member;
  } catch (err) {
    console.error(err);
    return null;
  }
};

/**
 * Direct login via Google Script (Bypasses CSV cache)
 */
export const login = async (phone: string, hashedPin: string): Promise<LoginResponse> => {
  try {
    // Try without no-cors first to see if we get a response (Script needs valid CORS headers)
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'login',
        phone: phone,
        hashedPin: hashedPin
      })
    });
    
    if (!response.ok) throw new Error('Network error');
    
    const result = await response.json();
    
    if (result.success) {
      if (result.member) {
         return { success: true, member: result.member };
      }
      if (result.needsPin) {
         return { success: true, needsSetup: true };
      }
    }
    
    return { success: false, error: result.message || 'Invalid PIN' };
    
  } catch (err) {
    console.log('Direct script login failed (likely CORS), falling back to CSV fetch', err);
    // Fallback to CSV method if direct script fails (e.g. CORS issues)
    return fetchMemberData(phone, hashedPin);
  }
};

/**
 * Sends a hashed PIN to the backend to create/reset the user's PIN.
 * @param phone - The user's phone number
 * @param hashedPin - The pre-hashed PIN (SHA-256)
 */
export const createPin = async (phone: string, hashedPin: string): Promise<{ success: boolean; message?: string }> => {
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // We use no-cors here as a failsafe for updates
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'setupPin',
        phone: phone,
        hashedPin: hashedPin
      })
    });
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, message: 'Unable to setup PIN. Please contact gym administration.' };
  }
};

/**
 * Saves the FCM notification token to the backend.
 * @param phone - The user's phone number
 * @param token - The Firebase Cloud Messaging token
 */
export const saveNotificationToken = async (phone: string, token: string): Promise<void> => {
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'saveNotificationToken',
        phone: phone,
        token: token
      })
    });
    console.log('Token saved to backend');
  } catch (err) {
    console.error('Failed to save token:', err);
  }
};