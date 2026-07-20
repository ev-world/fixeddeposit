export const SUPABASE_SQL_SCHEMA = `-- Super Money Fixed Deposit SQL Schema
-- Run this in your Supabase SQL Editor to set up your database tables!

-- 1. Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create CUSTOMERS Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(10) NOT NULL CHECK (relationship_type IN ('S/O', 'W/O', 'D/O')),
  father_husband_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  village VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  mobile_number VARCHAR(20) UNIQUE NOT NULL,
  aadhaar_number VARCHAR(20) UNIQUE NOT NULL,
  pan_number VARCHAR(20) UNIQUE NOT NULL,
  dob DATE NOT NULL,
  nominee_name VARCHAR(255) NOT NULL,
  nominee_relation VARCHAR(100) NOT NULL,
  nominee_mobile_number VARCHAR(20) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for fast searches
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_aadhaar ON customers(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_customers_pan ON customers(pan_number);

-- 3. Create FD MASTER Table
CREATE TABLE IF NOT EXISTS fd_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fd_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_mobile VARCHAR(20) NOT NULL,
  customer_aadhaar VARCHAR(20),
  customer_pan VARCHAR(20),
  deposit_amount NUMERIC(15, 2) NOT NULL CHECK (deposit_amount > 0),
  deposit_date DATE NOT NULL,
  deposit_time TIME NOT NULL,
  tenure_months INT NOT NULL CHECK (tenure_months > 0),
  interest_rate NUMERIC(5, 2) NOT NULL CHECK (interest_rate >= 0),
  interest_type VARCHAR(20) NOT NULL CHECK (interest_type IN ('Monthly', 'Quarterly', 'Yearly', 'Cumulative')),
  maturity_date DATE NOT NULL,
  maturity_amount NUMERIC(15, 2) NOT NULL,
  status VARCHAR(30) DEFAULT 'Active' NOT NULL CHECK (status IN ('Active', 'Renewed', 'Closed', 'Premature Closed')),
  
  -- Renewal Info
  parent_fd_number VARCHAR(50),
  old_fd_number VARCHAR(50),
  renew_count INT DEFAULT 0 NOT NULL,
  renew_date DATE,
  
  -- Premature / Close Info
  close_date DATE,
  close_time TIME,
  close_reason TEXT,
  close_interest_paid NUMERIC(15, 2),
  close_penalty NUMERIC(15, 2),
  close_final_amount NUMERIC(15, 2),
  close_payment_mode VARCHAR(50) CHECK (close_payment_mode IN ('Cash', 'Cheque', 'Bank Transfer', 'UPI')),
  close_remarks TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fd_master_number ON fd_master(fd_number);
CREATE INDEX IF NOT EXISTS idx_fd_master_status ON fd_master(status);
CREATE INDEX IF NOT EXISTS idx_fd_master_dates ON fd_master(deposit_date, maturity_date);

-- 4. Create FD TRANSACTIONS Table
CREATE TABLE IF NOT EXISTS fd_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fd_number VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Deposit', 'Renewal', 'Close', 'Premature Close')),
  amount NUMERIC(15, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_time TIME NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create INTEREST MASTER Table
CREATE TABLE IF NOT EXISTS interest_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_months_min INT NOT NULL,
  tenure_months_max INT NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create TENURE MASTER Table
CREATE TABLE IF NOT EXISTS tenure_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenure_label VARCHAR(100) NOT NULL,
  months INT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create COMPANY SETTINGS Table
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) DEFAULT 'Super Money Fixed Deposit' NOT NULL,
  company_address TEXT DEFAULT '123 Banking Enclave, Financial District, New Delhi - 110001' NOT NULL,
  phone VARCHAR(20) DEFAULT '+91 98765 43210' NOT NULL,
  email VARCHAR(100) DEFAULT 'info@supermoneyfd.com' NOT NULL,
  logo_url TEXT,
  signature_url TEXT,
  fd_prefix VARCHAR(10) DEFAULT 'FD' NOT NULL,
  next_fd_seq INT DEFAULT 1 NOT NULL,
  terms_conditions TEXT DEFAULT '1. Fixed Deposit once registered cannot be cancelled before 30 days.\\n2. Premature withdrawal attracts a 2.00% penalty on applicable rate.\\n3. Compounding interest is calculated on a quarterly basis for Cumulative deposits.' NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create ACTIVITY LOGS Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Initial Settings if empty
INSERT INTO company_settings (id, company_name, company_address, phone, email, fd_prefix, next_fd_seq)
VALUES ('00000000-0000-0000-0000-000000000001', 'Super Money Fixed Deposit', '123 Banking Enclave, Financial District, New Delhi - 110001', '+91 98765 43210', 'info@supermoneyfd.com', 'FD', 1)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Tenures if empty
INSERT INTO tenure_master (tenure_label, months) VALUES
('6 Months', 6),
('1 Year', 12),
('2 Years', 24),
('3 Years', 36),
('5 Years', 60)
ON CONFLICT (months) DO NOTHING;

-- Seed Default Interest Rates if empty
INSERT INTO interest_master (tenure_months_min, tenure_months_max, interest_rate, category) VALUES
(1, 6, 5.50, 'Regular'),
(7, 12, 6.75, 'Regular'),
(13, 24, 7.25, 'Regular'),
(25, 36, 7.50, 'Regular'),
(37, 120, 7.75, 'Regular'),
(1, 6, 6.00, 'Senior Citizen'),
(7, 12, 7.25, 'Senior Citizen'),
(13, 24, 7.75, 'Senior Citizen'),
(25, 36, 8.00, 'Senior Citizen'),
(37, 120, 8.25, 'Senior Citizen')
ON CONFLICT DO NOTHING;

-- 9. Disable Row Level Security (RLS) for all tables
-- This ensures the client application can read and write data seamlessly.
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE fd_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE fd_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE interest_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenure_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
`;
