import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  DBCustomer, 
  FDMaster, 
  FDTransaction, 
  CompanySettings, 
  InterestMaster, 
  TenureMaster, 
  ActivityLog,
  ScanHistoryItem
} from '../types';

// Read Vite Environment Variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const isUsingRealSupabase = (): boolean => {
  return !!(supabaseUrl && supabaseUrl !== 'MY_SUPABASE_URL' && supabaseAnonKey && supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY');
};

let supabaseClient: SupabaseClient | null = null;

if (isUsingRealSupabase()) {
  try {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);
  } catch (err) {
    console.error('Failed to initialize Supabase Client', err);
  }
}

// -------------------------------------------------------------
// LOCAL STORAGE BACKEND FALLBACK
// -------------------------------------------------------------
const LOCAL_STORAGE_KEYS = {
  CUSTOMERS: 'supermoney_customers',
  FDS: 'supermoney_fds',
  TRANSACTIONS: 'supermoney_transactions',
  SETTINGS: 'supermoney_settings',
  INTERESTS: 'supermoney_interests',
  TENURES: 'supermoney_tenures',
  ACTIVITY_LOGS: 'supermoney_activity_logs',
  SCAN_HISTORY: 'supermoney_scan_history'
};

// Seed Defaults
const DEFAULT_SETTINGS: CompanySettings = {
  id: '00000000-0000-0000-0000-000000000001',
  company_name: 'Super Money Fixed Deposit',
  company_address: '123 Banking Enclave, Financial District, New Delhi - 110001',
  phone: '+91 98765 43210',
  email: 'info@supermoneyfd.com',
  fd_prefix: 'FD',
  next_fd_seq: 1,
  terms_conditions: `1. Fixed Deposit once registered cannot be cancelled before 30 days.\n2. Premature withdrawal attracts a 2.00% penalty on the interest rate.\n3. Maturity amount calculations are based on standard quarterly compounding interest rate calculations.\n4. Original Fixed Deposit Certificate or Verification QR code must be presented at the time of claim.`
};

const DEFAULT_TENURES: TenureMaster[] = [
  { id: 't1', tenure_label: '6 Months', months: 6 },
  { id: 't2', tenure_label: '1 Year', months: 12 },
  { id: 't3', tenure_label: '2 Years', months: 24 },
  { id: 't4', tenure_label: '3 Years', months: 36 },
  { id: 't5', tenure_label: '5 Years', months: 60 }
];

const DEFAULT_INTERESTS: InterestMaster[] = [
  { id: 'i1', tenure_months_min: 1, tenure_months_max: 6, interest_rate: 5.50, category: 'Regular' },
  { id: 'i2', tenure_months_min: 7, tenure_months_max: 12, interest_rate: 6.75, category: 'Regular' },
  { id: 'i3', tenure_months_min: 13, tenure_months_max: 24, interest_rate: 7.25, category: 'Regular' },
  { id: 'i4', tenure_months_min: 25, tenure_months_max: 36, interest_rate: 7.50, category: 'Regular' },
  { id: 'i5', tenure_months_min: 37, tenure_months_max: 120, interest_rate: 7.75, category: 'Regular' },
  { id: 'i6', tenure_months_min: 1, tenure_months_max: 6, interest_rate: 6.00, category: 'Senior Citizen' },
  { id: 'i7', tenure_months_min: 7, tenure_months_max: 12, interest_rate: 7.25, category: 'Senior Citizen' },
  { id: 'i8', tenure_months_min: 13, tenure_months_max: 24, interest_rate: 7.75, category: 'Senior Citizen' },
  { id: 'i9', tenure_months_min: 25, tenure_months_max: 36, interest_rate: 8.00, category: 'Senior Citizen' },
  { id: 'i10', tenure_months_min: 37, tenure_months_max: 120, interest_rate: 8.25, category: 'Senior Citizen' }
];

// Helper to initialize Local Storage
const initLocalStorage = () => {
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.TENURES)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TENURES, JSON.stringify(DEFAULT_TENURES));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.INTERESTS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.INTERESTS, JSON.stringify(DEFAULT_INTERESTS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.FDS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FDS, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.TRANSACTIONS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVITY_LOGS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify([
      {
        id: 'log-init',
        username: 'System',
        action: 'Database Setup',
        details: 'Initial Secure Banking database schema bootstrapped successfully.',
        timestamp: new Date().toISOString()
      }
    ]));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.SCAN_HISTORY)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SCAN_HISTORY, JSON.stringify([]));
  }
};

initLocalStorage();

// Standard Getter/Setter
function getLocalItem<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key) || '[]') as T;
}

function setLocalItem<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// -------------------------------------------------------------
// DATABASE INTERFACE IMPLEMENTATIONS (REAL OR FALLBACK)
// -------------------------------------------------------------

export const db = {
  // --- ACTIVITY LOGS ---
  async getLogs(): Promise<ActivityLog[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('activity_logs').select('*').order('timestamp', { ascending: false });
      if (!error && data) return data as ActivityLog[];
    }
    return getLocalItem<ActivityLog[]>(LOCAL_STORAGE_KEYS.ACTIVITY_LOGS).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async logActivity(username: string, action: string, details: string): Promise<void> {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      username,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    if (supabaseClient) {
      await supabaseClient.from('activity_logs').insert([log]);
    } else {
      const logs = getLocalItem<ActivityLog[]>(LOCAL_STORAGE_KEYS.ACTIVITY_LOGS);
      logs.unshift(log);
      setLocalItem(LOCAL_STORAGE_KEYS.ACTIVITY_LOGS, logs.slice(0, 500)); // Keep last 500
    }
  },

  // --- SETTINGS ---
  async getSettings(): Promise<CompanySettings> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('company_settings').select('*').single();
      if (!error && data) return data as CompanySettings;
    }
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
    if (stored) return JSON.parse(stored) as CompanySettings;
    return DEFAULT_SETTINGS;
  },

  async updateSettings(settings: CompanySettings): Promise<CompanySettings> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('company_settings').upsert([settings]).select().single();
      if (!error && data) {
        await this.logActivity('Admin', 'Update Settings', `Company profile and prefix details updated.`);
        return data as CompanySettings;
      }
    }
    setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
    await this.logActivity('Admin', 'Update Settings', `Company profile and prefix details updated.`);
    return settings;
  },

  // --- INTEREST RATES ---
  async getInterestRates(): Promise<InterestMaster[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('interest_master').select('*').order('tenure_months_min', { ascending: true });
      if (!error && data) return data as InterestMaster[];
    }
    return getLocalItem<InterestMaster[]>(LOCAL_STORAGE_KEYS.INTERESTS).sort((a, b) => a.tenure_months_min - b.tenure_months_min);
  },

  async addInterestRate(rate: Omit<InterestMaster, 'id'>): Promise<InterestMaster> {
    const newRate: InterestMaster = { ...rate, id: crypto.randomUUID() };
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('interest_master').insert([newRate]).select().single();
      if (!error && data) {
        await this.logActivity('Admin', 'Add Interest Rate', `Rate ${rate.interest_rate}% added for tenure range ${rate.tenure_months_min}-${rate.tenure_months_max} months (${rate.category}).`);
        return data as InterestMaster;
      }
    }
    const list = getLocalItem<InterestMaster[]>(LOCAL_STORAGE_KEYS.INTERESTS);
    list.push(newRate);
    setLocalItem(LOCAL_STORAGE_KEYS.INTERESTS, list);
    await this.logActivity('Admin', 'Add Interest Rate', `Rate ${rate.interest_rate}% added for tenure range ${rate.tenure_months_min}-${rate.tenure_months_max} months (${rate.category}).`);
    return newRate;
  },

  async updateInterestRate(rate: InterestMaster): Promise<InterestMaster> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('interest_master').update(rate).eq('id', rate.id).select().single();
      if (!error && data) {
        await this.logActivity('Admin', 'Update Interest Rate', `Updated rate config to ${rate.interest_rate}%.`);
        return data as InterestMaster;
      }
    }
    let list = getLocalItem<InterestMaster[]>(LOCAL_STORAGE_KEYS.INTERESTS);
    list = list.map(item => item.id === rate.id ? rate : item);
    setLocalItem(LOCAL_STORAGE_KEYS.INTERESTS, list);
    await this.logActivity('Admin', 'Update Interest Rate', `Updated rate config to ${rate.interest_rate}%.`);
    return rate;
  },

  async deleteInterestRate(id: string): Promise<void> {
    const list = await this.getInterestRates();
    const item = list.find(r => r.id === id);
    if (supabaseClient) {
      await supabaseClient.from('interest_master').delete().eq('id', id);
    } else {
      const localList = getLocalItem<InterestMaster[]>(LOCAL_STORAGE_KEYS.INTERESTS);
      setLocalItem(LOCAL_STORAGE_KEYS.INTERESTS, localList.filter(r => r.id !== id));
    }
    await this.logActivity('Admin', 'Delete Interest Rate', `Interest rate configuration deleted: ${item ? item.interest_rate : 'ID ' + id}%.`);
  },

  // --- TENURE MASTER ---
  async getTenures(): Promise<TenureMaster[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('tenure_master').select('*').order('months', { ascending: true });
      if (!error && data) return data as TenureMaster[];
    }
    return getLocalItem<TenureMaster[]>(LOCAL_STORAGE_KEYS.TENURES).sort((a, b) => a.months - b.months);
  },

  async addTenure(tenure: Omit<TenureMaster, 'id'>): Promise<TenureMaster> {
    const list = await this.getTenures();
    // Prevent duplicate months
    if (list.some(t => t.months === tenure.months)) {
      throw new Error(`A tenure for ${tenure.months} months already exists.`);
    }

    const newTenure: TenureMaster = { ...tenure, id: crypto.randomUUID() };
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('tenure_master').insert([newTenure]).select().single();
      if (!error && data) {
        await this.logActivity('Admin', 'Add Tenure Option', `Tenure option '${tenure.tenure_label}' (${tenure.months} months) created.`);
        return data as TenureMaster;
      }
    }
    const localList = getLocalItem<TenureMaster[]>(LOCAL_STORAGE_KEYS.TENURES);
    localList.push(newTenure);
    setLocalItem(LOCAL_STORAGE_KEYS.TENURES, localList);
    await this.logActivity('Admin', 'Add Tenure Option', `Tenure option '${tenure.tenure_label}' (${tenure.months} months) created.`);
    return newTenure;
  },

  async deleteTenure(id: string): Promise<void> {
    const list = await this.getTenures();
    const item = list.find(t => t.id === id);
    if (supabaseClient) {
      await supabaseClient.from('tenure_master').delete().eq('id', id);
    } else {
      const localList = getLocalItem<TenureMaster[]>(LOCAL_STORAGE_KEYS.TENURES);
      setLocalItem(LOCAL_STORAGE_KEYS.TENURES, localList.filter(t => t.id !== id));
    }
    await this.logActivity('Admin', 'Delete Tenure Option', `Tenure option deleted: ${item ? item.tenure_label : 'ID ' + id}.`);
  },

  // --- CUSTOMERS ---
  async getCustomers(): Promise<DBCustomer[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('customers').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as DBCustomer[];
    }
    return getLocalItem<DBCustomer[]>(LOCAL_STORAGE_KEYS.CUSTOMERS).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createCustomer(customer: Omit<DBCustomer, 'id' | 'created_at'>): Promise<DBCustomer> {
    const list = await this.getCustomers();
    
    // Prevent Duplicate Aadhaar / PAN / Mobile
    if (list.some(c => c.mobile_number === customer.mobile_number)) {
      throw new Error(`A customer with Mobile Number ${customer.mobile_number} already exists.`);
    }
    if (list.some(c => c.aadhaar_number === customer.aadhaar_number)) {
      throw new Error(`A customer with Aadhaar Number ${customer.aadhaar_number} already exists.`);
    }
    if (list.some(c => c.pan_number === customer.pan_number)) {
      throw new Error(`A customer with PAN Number ${customer.pan_number} already exists.`);
    }

    const newCust: DBCustomer = {
      ...customer,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('customers').insert([newCust]).select().single();
      if (error) throw new Error(error.message);
      if (data) {
        await this.logActivity('Admin', 'Create Customer', `Registered new customer: ${customer.name} (Mobile: ${customer.mobile_number}).`);
        return data as DBCustomer;
      }
    }
    const localList = getLocalItem<DBCustomer[]>(LOCAL_STORAGE_KEYS.CUSTOMERS);
    localList.push(newCust);
    setLocalItem(LOCAL_STORAGE_KEYS.CUSTOMERS, localList);
    await this.logActivity('Admin', 'Create Customer', `Registered new customer: ${customer.name} (Mobile: ${customer.mobile_number}).`);
    return newCust;
  },

  async updateCustomer(customer: DBCustomer): Promise<DBCustomer> {
    const list = await this.getCustomers();
    // Duplicate checks excluding self
    if (list.some(c => c.mobile_number === customer.mobile_number && c.id !== customer.id)) {
      throw new Error(`Another customer with Mobile Number ${customer.mobile_number} already exists.`);
    }
    if (list.some(c => c.aadhaar_number === customer.aadhaar_number && c.id !== customer.id)) {
      throw new Error(`Another customer with Aadhaar Number ${customer.aadhaar_number} already exists.`);
    }
    if (list.some(c => c.pan_number === customer.pan_number && c.id !== customer.id)) {
      throw new Error(`Another customer with PAN Number ${customer.pan_number} already exists.`);
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('customers').update(customer).eq('id', customer.id).select().single();
      if (error) throw new Error(error.message);
      if (data) {
        await this.logActivity('Admin', 'Update Customer', `Updated profile for ${customer.name}.`);
        return data as DBCustomer;
      }
    }
    const localList = getLocalItem<DBCustomer[]>(LOCAL_STORAGE_KEYS.CUSTOMERS);
    const updatedList = localList.map(c => c.id === customer.id ? customer : c);
    setLocalItem(LOCAL_STORAGE_KEYS.CUSTOMERS, updatedList);
    await this.logActivity('Admin', 'Update Customer', `Updated profile for ${customer.name}.`);
    return customer;
  },

  async deleteCustomer(id: string): Promise<void> {
    // Also check if they have active FDs
    const fds = await this.getFDs();
    const hasActiveFDs = fds.some(f => f.customer_id === id && (f.status === 'Active' || f.status === 'Renewed'));
    if (hasActiveFDs) {
      throw new Error('Cannot delete customer. They have Active or Renewed Fixed Deposits in their profile.');
    }

    const list = await this.getCustomers();
    const target = list.find(c => c.id === id);

    if (supabaseClient) {
      const { error } = await supabaseClient.from('customers').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const localList = getLocalItem<DBCustomer[]>(LOCAL_STORAGE_KEYS.CUSTOMERS);
      setLocalItem(LOCAL_STORAGE_KEYS.CUSTOMERS, localList.filter(c => c.id !== id));
    }
    await this.logActivity('Admin', 'Delete Customer', `Deleted customer account: ${target ? target.name : 'ID ' + id}.`);
  },

  // --- FIXED DEPOSITS (FD MASTER) ---
  async getFDs(): Promise<FDMaster[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('fd_master').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as FDMaster[];
    }
    return getLocalItem<FDMaster[]>(LOCAL_STORAGE_KEYS.FDS).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getActiveFDsByCustomer(customerId: string): Promise<FDMaster[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('fd_master')
        .select('*')
        .eq('customer_id', customerId)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
      if (!error && data) return data as FDMaster[];
    }
    return getLocalItem<FDMaster[]>(LOCAL_STORAGE_KEYS.FDS)
      .filter(f => f.customer_id === customerId && f.status === 'Active')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getFDByNumber(fdNumber: string): Promise<FDMaster | null> {
    const fds = await this.getFDs();
    return fds.find(f => f.fd_number.toUpperCase() === fdNumber.toUpperCase()) || null;
  },

  async generateNextFDNumber(): Promise<string> {
    const settings = await this.getSettings();
    const prefix = settings.fd_prefix || 'FD';
    const nextSeq = settings.next_fd_seq || 1;
    
    // Find absolute highest sequentially to prevent duplicates if user deleted settings
    const fds = await this.getFDs();
    const currentYear = new Date().getFullYear();
    
    let maxSeq = nextSeq;
    fds.forEach(f => {
      // Format is prefix + year + seq. e.g., FD202600001
      const yearPart = currentYear.toString();
      const startOfSeq = prefix.length + yearPart.length;
      const seqStr = f.fd_number.substring(startOfSeq);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed >= maxSeq) {
        maxSeq = parsed + 1;
      }
    });

    const paddedSeq = String(maxSeq).padStart(5, '0');
    return `${prefix}${currentYear}${paddedSeq}`;
  },

  async createFD(fd: Omit<FDMaster, 'id' | 'fd_number' | 'created_at'>): Promise<FDMaster> {
    const fds = await this.getFDs();
    const fd_number = await this.generateNextFDNumber();

    // Prevent duplicates
    if (fds.some(f => f.fd_number === fd_number)) {
      throw new Error(`FD number ${fd_number} already exists.`);
    }

    const newFD: FDMaster = {
      ...fd,
      id: crypto.randomUUID(),
      fd_number,
      created_at: new Date().toISOString()
    };

    // Save
    if (supabaseClient) {
      const { created_by, ...insertPayload } = newFD;
      const { data, error } = await supabaseClient.from('fd_master').insert([insertPayload]).select().single();
      if (error) throw new Error(error.message);
      
      // Update seq inside settings
      const settings = await this.getSettings();
      await this.updateSettings({
        ...settings,
        next_fd_seq: settings.next_fd_seq + 1
      });

      await this.logActivity('Admin', 'Create FD', `Created FD ${fd_number} for customer ${fd.customer_name} of amount ₹${fd.deposit_amount.toLocaleString()}.`);
      await this.createTransaction(fd_number, 'Deposit', fd.deposit_amount, fd.deposit_date, fd.deposit_time, `Initial deposit placement`);
      
      return data as FDMaster;
    }

    const localFDs = getLocalItem<FDMaster[]>(LOCAL_STORAGE_KEYS.FDS);
    localFDs.push(newFD);
    setLocalItem(LOCAL_STORAGE_KEYS.FDS, localFDs);

    // Increment Settings Seq
    const settings = await this.getSettings();
    await this.updateSettings({
      ...settings,
      next_fd_seq: settings.next_fd_seq + 1
    });

    await this.logActivity('Admin', 'Create FD', `Created FD ${fd_number} for customer ${fd.customer_name} of amount ₹${fd.deposit_amount.toLocaleString()}.`);
    await this.createTransaction(fd_number, 'Deposit', fd.deposit_amount, fd.deposit_date, fd.deposit_time, `Initial deposit placement`);

    return newFD;
  },

  async updateFD(fd: FDMaster): Promise<FDMaster> {
    if (supabaseClient) {
      const { id, created_at, created_by, ...updatePayload } = fd;
      const { data, error } = await supabaseClient.from('fd_master').update(updatePayload).eq('id', fd.id).select().single();
      if (error) throw new Error(error.message);
      if (data) {
        await this.logActivity('Admin', 'Update FD Details', `Updated FD account settings for ${fd.fd_number}.`);
        return data as FDMaster;
      }
    }
    let list = getLocalItem<FDMaster[]>(LOCAL_STORAGE_KEYS.FDS);
    list = list.map(item => item.id === fd.id ? fd : item);
    setLocalItem(LOCAL_STORAGE_KEYS.FDS, list);
    await this.logActivity('Admin', 'Update FD Details', `Updated FD account settings for ${fd.fd_number}.`);
    return fd;
  },

  async deleteFD(id: string): Promise<void> {
    const list = await this.getFDs();
    const target = list.find(f => f.id === id);
    if (!target) return;

    if (supabaseClient) {
      const { error } = await supabaseClient.from('fd_master').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const localList = getLocalItem<FDMaster[]>(LOCAL_STORAGE_KEYS.FDS);
      setLocalItem(LOCAL_STORAGE_KEYS.FDS, localList.filter(f => f.id !== id));
    }
    
    await this.logActivity('Admin', 'Delete FD Record', `Deleted FD record ${target.fd_number} belonging to customer ${target.customer_name}.`);
  },

  // --- RENEW FD ---
  async renewFD(
    oldFDId: string, 
    newFDParams: {
      deposit_amount: number;
      deposit_date: string;
      deposit_time: string;
      tenure_months: number;
      interest_rate: number;
      interest_type: 'Monthly' | 'Quarterly' | 'Yearly' | 'Cumulative';
      maturity_date: string;
      maturity_amount: number;
    },
    createdBy: string = 'Admin'
  ): Promise<FDMaster> {
    const fds = await this.getFDs();
    const oldFD = fds.find(f => f.id === oldFDId);
    if (!oldFD) throw new Error('Original FD not found.');
    if (oldFD.status !== 'Active') throw new Error('Only active deposits can be renewed.');

    // 1. Update old FD to status = 'Renewed'
    const updatedOldFD: FDMaster = {
      ...oldFD,
      status: 'Renewed',
      renew_date: newFDParams.deposit_date
    };
    await this.updateFD(updatedOldFD);

    // 2. Generate and create completely new FD
    const nextSeqFDNum = await this.generateNextFDNumber();
    const newFD: Omit<FDMaster, 'id' | 'fd_number' | 'created_at'> = {
      customer_id: oldFD.customer_id,
      customer_name: oldFD.customer_name,
      customer_mobile: oldFD.customer_mobile,
      customer_aadhaar: oldFD.customer_aadhaar,
      customer_pan: oldFD.customer_pan,
      deposit_amount: newFDParams.deposit_amount,
      deposit_date: newFDParams.deposit_date,
      deposit_time: newFDParams.deposit_time,
      tenure_months: newFDParams.tenure_months,
      interest_rate: newFDParams.interest_rate,
      interest_type: newFDParams.interest_type,
      maturity_date: newFDParams.maturity_date,
      maturity_amount: newFDParams.maturity_amount,
      status: 'Active',
      
      parent_fd_number: oldFD.parent_fd_number || oldFD.fd_number, // Maintain root parent
      old_fd_number: oldFD.fd_number,
      renew_count: oldFD.renew_count + 1,
      renew_date: newFDParams.deposit_date,
      created_by: createdBy
    };

    const savedNewFD = await this.createFD(newFD);

    // Log transaction
    await this.createTransaction(
      oldFD.fd_number, 
      'Renewal', 
      oldFD.deposit_amount, 
      newFDParams.deposit_date, 
      newFDParams.deposit_time, 
      `Renewed into new account ${savedNewFD.fd_number}`
    );

    await this.logActivity(
      'Admin', 
      'Renew FD', 
      `Successfully renewed FD ${oldFD.fd_number} into new FD ${savedNewFD.fd_number} (Renew count: ${newFD.renew_count}).`
    );

    return savedNewFD;
  },

  // --- CLOSE FD (NORMAL OR PREMATURE) ---
  async closeFD(
    fdId: string,
    closingParams: {
      close_date: string;
      close_time: string;
      close_reason: string;
      close_interest_paid: number;
      close_penalty: number;
      close_final_amount: number;
      close_payment_mode: 'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI';
      close_remarks: string;
      isPremature: boolean;
    }
  ): Promise<FDMaster> {
    const fds = await this.getFDs();
    const target = fds.find(f => f.id === fdId);
    if (!target) throw new Error('FD not found.');
    if (target.status !== 'Active') throw new Error('Only active deposits can be closed.');

    const updatedFD: FDMaster = {
      ...target,
      status: closingParams.isPremature ? 'Premature Closed' : 'Closed',
      close_date: closingParams.close_date,
      close_time: closingParams.close_time,
      close_reason: closingParams.close_reason,
      close_interest_paid: closingParams.close_interest_paid,
      close_penalty: closingParams.close_penalty,
      close_final_amount: closingParams.close_final_amount,
      close_payment_mode: closingParams.close_payment_mode,
      close_remarks: closingParams.close_remarks
    };

    const saved = await this.updateFD(updatedFD);

    const txType = closingParams.isPremature ? 'Premature Close' : 'Close';
    await this.createTransaction(
      target.fd_number,
      txType,
      closingParams.close_final_amount,
      closingParams.close_date,
      closingParams.close_time,
      `Settled via ${closingParams.close_payment_mode}. Total payout: ₹${closingParams.close_final_amount.toLocaleString()}`
    );

    await this.logActivity(
      'Admin',
      txType,
      `Settled and closed account ${target.fd_number}. Paid: ₹${closingParams.close_final_amount.toLocaleString()} (${txType}).`
    );

    return saved;
  },

  // --- TRANSACTIONS ---
  async getTransactions(fdNumber?: string): Promise<FDTransaction[]> {
    if (supabaseClient) {
      let query = supabaseClient.from('fd_transactions').select('*');
      if (fdNumber) {
        query = query.eq('fd_number', fdNumber);
      }
      const { data, error } = await query.order('transaction_date', { ascending: false });
      if (!error && data) return data as FDTransaction[];
    }
    const all = getLocalItem<FDTransaction[]>(LOCAL_STORAGE_KEYS.TRANSACTIONS);
    if (fdNumber) {
      return all.filter(t => t.fd_number === fdNumber).sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    }
    return all.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  },

  async createTransaction(
    fd_number: string, 
    type: 'Deposit' | 'Renewal' | 'Close' | 'Premature Close', 
    amount: number, 
    date: string, 
    time: string, 
    details: string
  ): Promise<FDTransaction> {
    const tx: FDTransaction = {
      id: crypto.randomUUID(),
      fd_number,
      type,
      amount,
      transaction_date: date,
      transaction_time: time,
      details,
      created_at: new Date().toISOString()
    };

    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('fd_transactions').insert([tx]).select().single();
      if (!error && data) return data as FDTransaction;
    }
    const list = getLocalItem<FDTransaction[]>(LOCAL_STORAGE_KEYS.TRANSACTIONS);
    list.unshift(tx);
    setLocalItem(LOCAL_STORAGE_KEYS.TRANSACTIONS, list);
    return tx;
  },

  // --- SCAN HISTORY ---
  async getScanHistory(): Promise<ScanHistoryItem[]> {
    return getLocalItem<ScanHistoryItem[]>(LOCAL_STORAGE_KEYS.SCAN_HISTORY).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async logScan(fd_number: string, customer_name: string, scanned_by: string): Promise<void> {
    const item: ScanHistoryItem = {
      id: crypto.randomUUID(),
      fd_number,
      customer_name,
      scanned_by,
      timestamp: new Date().toISOString()
    };
    const list = getLocalItem<ScanHistoryItem[]>(LOCAL_STORAGE_KEYS.SCAN_HISTORY);
    list.unshift(item);
    setLocalItem(LOCAL_STORAGE_KEYS.SCAN_HISTORY, list.slice(0, 100)); // Keep last 100
    await this.logActivity(scanned_by, 'QR Verification Scan', `Verified FD QR code for receipt ${fd_number} (${customer_name}).`);
  }
};
