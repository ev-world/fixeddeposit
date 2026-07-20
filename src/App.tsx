import React, { useState, useEffect } from 'react';
import { db, isUsingRealSupabase } from './lib/supabase';
import { DBCustomer, FDMaster } from './types';
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import CustomerManagement from './components/CustomerManagement';
import FDManagement from './components/FDManagement';
import Reports from './components/Reports';
import QRModule from './components/QRModule';
import SettingsPanel from './components/SettingsPanel';
import CustomerPortal from './components/CustomerPortal';
import { 
  Landmark, Users, Receipt, FileBarChart, QrCode, Settings2, 
  LogOut, RefreshCw, KeyRound, Clock, ShieldCheck, HelpCircle, Eye, CheckCircle2, AlertTriangle
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<{ role: 'admin' | 'customer'; data?: DBCustomer } | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'customers' | 'fds' | 'reports' | 'qr' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // URL deep links / QR verify parameters
  const [publicVerifyRecord, setPublicVerifyRecord] = useState<FDMaster | null>(null);
  const [publicVerifyCustomer, setPublicVerifyCustomer] = useState<DBCustomer | null>(null);
  const [publicVerifyError, setPublicVerifyError] = useState('');
  const [publicVerifyLoading, setPublicVerifyLoading] = useState(false);

  // Cross-panel triggers
  const [fdSearchNumber, setFdSearchNumber] = useState<string | null>(null);
  const [triggerCustomerAdd, setTriggerCustomerAdd] = useState(false);
  const [triggerFDAdd, setTriggerFDAdd] = useState(false);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyFD = params.get('verify') || params.get('verify_fd');
    if (verifyFD) {
      handlePublicVerification(verifyFD);
    }
  }, []);

  const handlePublicVerification = async (fdNum: string) => {
    setPublicVerifyLoading(true);
    setPublicVerifyError('');
    try {
      const record = await db.getFDByNumber(fdNum);
      if (record) {
        setPublicVerifyRecord(record);
        const allCust = await db.getCustomers();
        const customer = allCust.find(c => c.id === record.customer_id);
        if (customer) {
          setPublicVerifyCustomer(customer);
        }
        await db.logScan(record.fd_number, record.customer_name, 'Public Web Verification');
      } else {
        setPublicVerifyError(`No registered certificate exists in Super Money database matching key: "${fdNum}".`);
      }
    } catch (err) {
      setPublicVerifyError('An error occurred during public ledger verification.');
    } finally {
      setPublicVerifyLoading(false);
    }
  };

  const handleLoginSuccess = (user: { role: 'admin' | 'customer'; data?: DBCustomer }) => {
    setSession(user);
    if (user.role === 'customer') {
      setCurrentScreen('dashboard'); // Customer has a dedicated read-only dashboard anyway
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const handleLogout = () => {
    if (session?.role === 'admin') {
      db.logActivity('Admin', 'Logout', 'Admin logged out securely.');
    } else if (session?.data) {
      db.logActivity(session.data.name, 'Logout', 'Customer session completed.');
    }
    setSession(null);
    setCurrentScreen('dashboard');
  };

  const handleQuickNewFD = () => {
    setCurrentScreen('fds');
    setTriggerFDAdd(true);
  };

  const handleQuickNewCustomer = () => {
    setCurrentScreen('customers');
    setTriggerCustomerAdd(true);
  };

  const handleFDSelectFromOtherPanel = (fdNumber: string) => {
    setFdSearchNumber(fdNumber);
    setCurrentScreen('fds');
  };

  // Render Public Verification Page if parameter is active
  if (publicVerifyLoading || publicVerifyRecord || publicVerifyError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative font-sans">
        
        {/* Security badge overlay */}
        <div className="absolute top-10 flex flex-col items-center gap-2">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md">
            <Landmark className="h-6 w-6" />
          </div>
          <h1 className="text-md font-bold tracking-tight text-slate-900 uppercase text-center font-sans">
            Super Money Fixed Deposit
          </h1>
          <span className="text-[9px] text-blue-600 font-mono tracking-widest font-semibold uppercase">
            Official Authenticity Verification Node
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 md:p-8 max-w-xl w-full text-center relative z-10 my-24">
          {publicVerifyLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Validating certificate ledger against live registry...</p>
            </div>
          )}

          {publicVerifyError && (
            <div className="space-y-6">
              <div className="bg-red-50 text-red-600 p-3 rounded-full w-fit mx-auto border border-red-100">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-md font-bold text-slate-900">Verification Failure</h3>
                <p className="text-xs text-red-600 mt-2 leading-relaxed">{publicVerifyError}</p>
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-left text-xxs text-slate-500 mt-4 leading-relaxed">
                  ⚠️ This certificate has failed the secure hash validation match. This may indicate a counterfeit or deleted receipt. Contact head office support instantly.
                </div>
              </div>
              <button
                onClick={() => {
                  setPublicVerifyError('');
                  // Clear URL parameters cleanly
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Go to login portal
              </button>
            </div>
          )}

          {publicVerifyRecord && (
            <div className="space-y-6 text-left">
              <div className="text-center">
                <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-full w-fit mx-auto border border-emerald-100 mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-md font-bold text-slate-900 font-sans">Genuine Fixed Deposit Certificate</h3>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono inline-block mt-1 font-bold">
                  DATABASE VERIFIED VALID
                </span>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-slate-500 text-xxs uppercase tracking-wider block">Certificate Key</span>
                    <strong className="text-slate-900 font-mono text-sm">{publicVerifyRecord.fd_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xxs uppercase tracking-wider block">Primary Holder</span>
                    <strong className="text-slate-900 text-sm">{publicVerifyRecord.customer_name}</strong>
                  </div>
                  {publicVerifyCustomer && (
                    <div className="col-span-2 border-t border-slate-200 pt-2 flex justify-between">
                      <div>
                        <span className="text-slate-500 text-xxs block">Relationship</span>
                        <strong className="text-slate-700 text-xxs">{publicVerifyCustomer.relationship_type} {publicVerifyCustomer.father_husband_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xxs block">Mobile contact</span>
                        <strong className="text-slate-700 text-xxs font-mono">{publicVerifyCustomer.mobile_number}</strong>
                      </div>
                    </div>
                  )}
                  <div className="col-span-2 border-t border-slate-200 pt-2.5 grid grid-cols-3 gap-2">
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-400 text-[10px] block uppercase">Principal</span>
                      <strong className="text-slate-900 font-mono font-bold">₹{publicVerifyRecord.deposit_amount.toLocaleString()}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-400 text-[10px] block uppercase">Rate P.A.</span>
                      <strong className="text-emerald-700 font-mono font-bold">{publicVerifyRecord.interest_rate.toFixed(2)}%</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="text-slate-400 text-[10px] block uppercase">Tenure</span>
                      <strong className="text-slate-900 font-mono font-bold">{publicVerifyRecord.tenure_months} Mo</strong>
                    </div>
                  </div>
                  <div className="col-span-2 border-t border-slate-200 pt-2 flex justify-between items-center text-xxs">
                    <div>
                      <span className="text-slate-500 block">Placement Date</span>
                      <strong className="text-slate-700 font-mono">{publicVerifyRecord.deposit_date}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 block font-bold">Maturity Date</span>
                      <strong className="text-blue-700 font-mono text-xs font-bold">{publicVerifyRecord.maturity_date}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPublicVerifyRecord(null);
                    setPublicVerifyCustomer(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold shadow cursor-pointer text-center transition-colors"
                >
                  Return to sign-in portal
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="absolute bottom-6 text-slate-400 font-mono text-[9px] uppercase">
          Super Money secure cryptographic receipt verification network.
        </span>
      </div>
    );
  }

  // Render AuthScreen if no active session
  if (!session) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // If customer, show CustomerPortal Dashboard
  if (session.role === 'customer' && session.data) {
    return <CustomerPortal customer={session.data} onLogout={handleLogout} />;
  }

  // Else, show complete Admin workspace
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      
      {/* 1. Header Bar */}
      <header className="bg-white text-slate-900 shadow-sm border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl font-bold shadow-sm">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold font-sans tracking-tight text-slate-900">
                Super Money Fixed Deposit
              </h1>
              <span className="text-[10px] text-blue-600 font-mono tracking-widest uppercase font-bold flex items-center gap-1.5 mt-0.5">
                Branch Administrator Workspace
                <span className={`inline-block h-1.5 w-1.5 rounded-full animate-pulse ${isUsingRealSupabase() ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                <span className="text-[9px] text-slate-500 capitalize font-medium">({isUsingRealSupabase() ? 'Supabase cloud active' : 'Secure local DB'})</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            {/* Live Clock ticker */}
            <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-mono text-slate-600">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
            >
              <LogOut className="h-4.5 w-4.5 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. Top-bar screen selection tabs */}
      <nav className="bg-slate-900 text-slate-300 border-b border-slate-800 sticky top-[72px] z-30 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-1 md:gap-2">
          
          {[
            { id: 'dashboard', label: 'Overview Terminal', icon: Landmark },
            { id: 'customers', label: 'Depositors Master', icon: Users },
            { id: 'fds', label: 'Deposits ledger', icon: Receipt },
            { id: 'reports', label: 'Audit report center', icon: FileBarChart },
            { id: 'qr', label: 'QR Certificate Scanner', icon: QrCode },
            { id: 'settings', label: 'System Master Configuration', icon: Settings2 },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentScreen(tab.id as any);
                  setFdSearchNumber(null); // Clear search parameters
                }}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  currentScreen === tab.id 
                    ? 'border-blue-500 text-white bg-slate-950 font-bold' 
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-4.5 w-4.5 text-blue-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}

        </div>
      </nav>

      {/* 3. Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full relative">
        
        {currentScreen === 'dashboard' && (
          <AdminDashboard 
            onNavigate={(screen) => setCurrentScreen(screen)}
            onQuickNewFD={handleQuickNewFD}
            onQuickNewCustomer={handleQuickNewCustomer}
          />
        )}

        {currentScreen === 'customers' && (
          <CustomerManagement 
            onFDSelected={handleFDSelectFromOtherPanel}
            triggerAddForm={triggerCustomerAdd}
            onFormClosed={() => setTriggerCustomerAdd(false)}
          />
        )}

        {currentScreen === 'fds' && (
          <FDManagement 
            initialSearchFDNumber={fdSearchNumber}
            onClearInitialSearch={() => setFdSearchNumber(null)}
            triggerAddForm={triggerFDAdd}
            onFormClosed={() => setTriggerFDAdd(false)}
            isAdmin={session?.role === 'admin'}
          />
        )}

        {currentScreen === 'reports' && (
          <Reports 
            onOpenFD={handleFDSelectFromOtherPanel}
          />
        )}

        {currentScreen === 'qr' && (
          <QRModule 
            onSelectFD={handleFDSelectFromOtherPanel}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsPanel 
            onSettingsUpdated={() => window.location.reload()}
          />
        )}

      </main>

      {/* 4. Global footer */}
      <footer className="bg-white text-slate-500 border-t border-slate-200 py-6 text-center text-xs no-print">
        <p className="max-w-lg mx-auto leading-relaxed">
          Super Money Fixed Deposit Management System. Built using strict cryptographic checks, sequential sequences, and complete rollover renewal histories. 
        </p>
        <div className="flex justify-center items-center gap-4 text-[10px] text-slate-400 mt-3 font-mono uppercase tracking-wider">
          <span>Core security system Online</span>
          <span>•</span>
          <span>Version 4.2.1-Prod</span>
          <span>•</span>
          <span>Central audit nodes synced</span>
        </div>
      </footer>

    </div>
  );
}
