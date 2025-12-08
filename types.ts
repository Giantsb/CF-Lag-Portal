export interface MemberData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  package: string;
  amount: string;
  duration: string;
  startDate: string;
  expirationDate: string;
  status: string;
  pauseDays: string;
}

export enum ViewState {
  LOGIN,
  SETUP_PIN,
  DASHBOARD
}

export interface LoginResponse {
  success: boolean;
  needsSetup?: boolean;
  member?: MemberData;
  error?: string;
}