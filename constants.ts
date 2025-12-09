
// Fix: Cast import.meta to any to avoid TypeScript error about 'env' property
const env = (import.meta as any).env;

export const SHEET_URL = env.VITE_GOOGLE_SHEET_URL;
export const SCRIPT_URL = env.VITE_GOOGLE_SCRIPT_URL;
