import CryptoJS from 'crypto-js';

/**
 * Hashes a PIN using SHA-256 with the phone number as a salt.
 * 
 * @param pin - The 4-digit PIN entered by the user
 * @param salt - The user's phone number used as a salt
 * @returns A 64-character hexadecimal hash string
 */
export const hashPin = (pin: string, salt: string): string => {
  // Clean the salt (phone number) to ensure consistency across logins
  // This removes spaces, dashes, parenthesis, etc.
  const cleanSalt = salt.replace(/[\s\-\(\)]/g, '');
  
  // Combine PIN and Salt and hash them
  return CryptoJS.SHA256(pin + cleanSalt).toString();
};