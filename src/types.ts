export interface DBUser {
  id: string;
  username: string;
  role: 'admin' | 'customer';
  created_at: string;
}

export interface DBCustomer {
  id: string;
  name: string;
  relationship_type: 'S/O' | 'W/O' | 'D/O';
  father_husband_name: string;
  address: string;
  village: string;
  city: string;
  state: string;
  pincode: string;
  mobile_number: string;
  aadhaar_number: string;
  pan_number: string;
  dob: string;
  nominee_name: string;
  nominee_relation: string;
  nominee_mobile_number: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  created_at: string;
}

export type FDStatus = 'Active' | 'Renewed' | 'Closed' | 'Premature Closed';

export interface FDMaster {
  id: string;
  fd_number: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  customer_aadhaar?: string;
  customer_pan?: string;
  deposit_amount: number;
  deposit_date: string;
  deposit_time: string;
  tenure_months: number;
  interest_rate: number;
  interest_type: 'Monthly' | 'Quarterly' | 'Yearly' | 'Cumulative';
  maturity_date: string;
  maturity_amount: number;
  status: FDStatus;
  
  // Renewal Specifics
  parent_fd_number?: string;
  old_fd_number?: string;
  renew_count: number;
  renew_date?: string;
  created_by?: string;

  // Premature / Close Specifics
  close_date?: string;
  close_time?: string;
  close_reason?: string;
  close_interest_paid?: number;
  close_penalty?: number;
  close_final_amount?: number;
  close_payment_mode?: 'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI';
  close_remarks?: string;

  created_at: string;
}

export interface FDTransaction {
  id: string;
  fd_number: string;
  type: 'Deposit' | 'Renewal' | 'Close' | 'Premature Close';
  amount: number;
  transaction_date: string;
  transaction_time: string;
  details: string; // JSON String or description
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  company_address: string;
  phone: string;
  email: string;
  logo_url?: string;
  signature_url?: string;
  fd_prefix: string;
  next_fd_seq: number;
  terms_conditions: string;
}

export interface InterestMaster {
  id: string;
  tenure_months_min: number;
  tenure_months_max: number;
  interest_rate: number;
  category: string; // e.g. 'Regular', 'Senior Citizen'
}

export interface TenureMaster {
  id: string;
  tenure_label: string; // e.g., '1 Year', '2 Years', '6 Months'
  months: number;
}

export interface ActivityLog {
  id: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ScanHistoryItem {
  id: string;
  fd_number: string;
  customer_name: string;
  scanned_by: string;
  timestamp: string;
}
