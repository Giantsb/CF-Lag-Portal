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

    console.log('Headers found:', headers);

    const phoneIndex = headers.findIndex(h => {
      const normalized = h.toLowerCase().replace(/[""]/g, '').trim();
      return normalized === 'phone' || normalized.includes('phone');
    });
    
    if (phoneIndex === -1) {
      return { success: false, error: `Phone column not found. Headers: ${headers.join(', ')}` };
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

    // Specific mapping for known columns
    const firstName = getField('First Name');
    const lastName = getField('Last Name');
    const email = getField('email');
    const packageVal = getField('package');
    const amount = getField('amount');
    const duration = getField('duration');
    const startDate = getField('Start Date');
    const expirationDate = getField('Expiration Date');
    const status = getField('status');
    const pauseDays = getField('Pause Days') || '0';

    const member: MemberData = {
      firstName,
      lastName,
      email,
      phone: memberRow[phoneIndex] || '',
      package: packageVal,
      amount,
      duration,
      startDate,
      expirationDate,
      status,
      pauseDays
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
 * Sends a hashed PIN to the backend to create/reset the user's PIN.
 * @param phone - The user's phone number
 * @param hashedPin - The pre-hashed PIN (SHA-256)
 */
export const createPin = async (phone: string, hashedPin: string): Promise<{ success: boolean; message?: string }> => {
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      // Updated body to match the backend 'setupPin' action structure
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