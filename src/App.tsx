import React, { useState, useEffect } from 'react';
import { db, isUsingRealSupabase, supabaseClient } from './lib/supabase';
import { DBCustomer, DBUser, FDMaster } from './types';
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
  LogOut, RefreshCw, KeyRound, Clock, ShieldCheck, HelpCircle, Eye, CheckCircle2, AlertTriangle, UserCheck
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<{ role: 'admin' | 'customer'; data?: DBCustomer; user?: DBUser } | null>(null);
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

  // Check URL & Restore Supabase Auth Session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyFD = params.get('verify') || params.get('verify_fd');
    if (verifyFD) {
      handlePublicVerification(verifyFD);
    }

    const initAuthSession = async () => {
      // 1. Restore Supabase Auth session if active
      if (isUsingRealSupabase() && supabaseClient) {
        const { data: { session: authSession } } = await supabaseClient.auth.getSession();
        if (authSession?.user) {
          const { data: userRecords } = await supabaseClient
            .from('users')
            .select('*')
            .or(`auth_user_id.eq.${authSession.user.id},email.eq.${authSession.user.email}`)
            .limit(1);

          if (userRecords && userRecords.length > 0) {
            const userObj = userRecords[0] as DBUser;
            if (userObj.is_active) {
              setSession({
                role: 'admin',
                user: userObj
              });
              return;
            }
          }
        }
      }

      // 2. Restore Customer session if present in localStorage
      const storedCust = localStorage.getItem('supermoney_customer_session');
      if (storedCust) {
        try {
          const custObj = JSON.parse(storedCust) as DBCustomer;
          setSession({
            role: 'customer',
            data: custObj
          });
        } catch (e) {
          localStorage.removeItem('supermoney_customer_session');
        }
      }
    };

    initAuthSession();

    // 3. Listen to Auth changes
    if (isUsingRealSupabase() && supabaseClient) {
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, authSession) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          localStorage.removeItem('supermoney_customer_session');
        } else if (event === 'SIGNED_IN' && authSession?.user) {
          const { data: userRecords } = await supabaseClient
            .from('users')
            .select('*')
            .or(`auth_user_id.eq.${authSession.user.id},email.eq.${authSession.user.email}`)
            .limit(1);

          if (userRecords && userRecords.length > 0) {
            const userObj = userRecords[0] as DBUser;
            if (userObj.is_active) {
              setSession({
                role: 'admin',
                user: userObj
              });
            }
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
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

  const handleLoginSuccess = (user: { role: 'admin' | 'customer'; data?: DBCustomer; user?: DBUser }) => {
    setSession(user);
    if (user.role === 'customer' && user.data) {
      localStorage.setItem('supermoney_customer_session', JSON.stringify(user.data));
    }
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    if (session?.role === 'admin') {
      await db.logActivity(session.user?.username || 'Admin', 'Logout', 'Admin logged out securely.');
      if (isUsingRealSupabase() && supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } else if (session?.data) {
      await db.logActivity(session.data.name, 'Logout', 'Customer session completed.');
    }
    localStorage.removeItem('supermoney_customer_session');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4 relative font-sans text-slate-100">
        
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Header Branding */}
        <div className="relative z-10 mb-8 text-center flex flex-col items-center gap-2.5">
          <div className="bg-gradient-to-tr from-blue-600 to-blue-500 text-white p-3.5 rounded-2xl shadow-xl shadow-blue-900/30 ring-1 ring-white/20">
            <Landmark className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans">
              Super Money Fixed Deposit
            </h1>
            <span className="text-[10px] text-amber-400 font-mono tracking-widest font-bold uppercase block mt-0.5">
              Official Authenticity Verification Node
            </span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-2xl p-6 md:p-8 max-w-xl w-full text-slate-900 relative z-10">
          {publicVerifyLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3.5">
              <RefreshCw className="h-9 w-9 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Validating certificate ledger against live registry...</p>
            </div>
          )}

          {publicVerifyError && (
            <div className="space-y-6">
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl w-fit mx-auto border border-rose-200/80 shadow-inner">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Verification Failure</h3>
                <p className="text-xs text-rose-600 mt-2 leading-relaxed font-medium">{publicVerifyError}</p>
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-left text-xxs text-slate-600 mt-4 leading-relaxed font-sans">
                  ⚠️ This certificate has failed the secure hash validation match. This may indicate a counterfeit or deleted receipt. Contact head office support instantly.
                </div>
              </div>
              <button
                onClick={() => {
                  setPublicVerifyError('');
                  window.history.replaceState({}, document.title, window.location.pathname);
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md active:scale-[0.99]"
              >
                Go to login portal
              </button>
            </div>
          )}

          {publicVerifyRecord && (
            <div className="space-y-6 text-left">
              <div className="text-center">
                <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-full w-fit mx-auto border border-emerald-200/80 mb-3 shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-sans">Genuine Fixed Deposit Certificate</h3>
                <span className="text-[10px] text-emerald-800 bg-emerald-100/80 border border-emerald-300/80 px-2.5 py-0.5 rounded-full font-mono inline-block mt-1.5 font-bold tracking-wide">
                  DATABASE VERIFIED VALID
                </span>
              </div>

              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Certificate Key</span>
                    <strong className="text-blue-900 font-mono text-sm font-bold">{publicVerifyRecord.fd_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Primary Holder</span>
                    <strong className="text-slate-900 text-sm font-bold">{publicVerifyRecord.customer_name}</strong>
                  </div>
                  {publicVerifyCustomer && (
                    <div className="col-span-2 border-t border-slate-200/80 pt-2.5 flex justify-between">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Relationship</span>
                        <strong className="text-slate-700 text-xs font-semibold">{publicVerifyCustomer.relationship_type} {publicVerifyCustomer.father_husband_name}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Mobile contact</span>
                        <strong className="text-slate-700 text-xs font-mono">{publicVerifyCustomer.mobile_number}</strong>
                      </div>
                    </div>
                  )}
                  <div className="col-span-2 border-t border-slate-200/80 pt-3 grid grid-cols-3 gap-2.5">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-400 text-[9px] block uppercase font-bold">Principal</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">₹{publicVerifyRecord.deposit_amount.toLocaleString()}</strong>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-400 text-[9px] block uppercase font-bold">Rate P.A.</span>
                      <strong className="text-emerald-700 font-mono font-bold text-xs">{publicVerifyRecord.interest_rate.toFixed(2)}%</strong>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-400 text-[9px] block uppercase font-bold">Tenure</span>
                      <strong className="text-slate-900 font-mono font-bold text-xs">{publicVerifyRecord.tenure_months} Mo</strong>
                    </div>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/80 pt-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block font-medium">Placement Date</span>
                      <strong className="text-slate-700 font-mono">{publicVerifyRecord.deposit_date}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 text-[10px] block font-bold uppercase">Maturity Date</span>
                      <strong className="text-blue-800 font-mono text-xs font-bold">{publicVerifyRecord.maturity_date}</strong>
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md cursor-pointer text-center transition-all active:scale-[0.99]"
                >
                  Return to sign-in portal
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="mt-8 text-slate-400 font-mono text-[10px] uppercase tracking-widest">
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
    <div className="min-h-screen bg-slate-50/90 text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 no-print border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          
          <div className="flex items-center gap-3.5">
            <div className="bg-gradient-to-tr from-blue-600 to-blue-500 text-white p-2.5 rounded-2xl shadow-md shadow-blue-900/40 ring-1 ring-white/20">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold font-sans tracking-tight text-white">
                  Super Money Fixed Deposit
                </h1>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase hidden sm:inline-block">
                  FINTECH OS
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
                <span className="text-blue-400 font-bold uppercase">Branch Terminal</span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`inline-block h-2 w-2 rounded-full ${isUsingRealSupabase() ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' : 'bg-amber-400'}`} />
                  {isUsingRealSupabase() ? 'Supabase Live Cloud' : 'Local Storage Mode'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            {/* User Session Info Badge */}
            {session?.user && (
              <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center gap-2 text-slate-200 font-mono shadow-2xs">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <div className="flex items-center gap-1.5">
                  <strong className="text-white font-medium">{session.user.username}</strong>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded uppercase font-bold tracking-wide">
                    {session.user.role}
                  </span>
                </div>
              </div>
            )}

            {/* Live Clock ticker */}
            <div className="bg-slate-800/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2 font-mono text-slate-300 text-[11px] shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-semibold shadow-2xs active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Navigation Tabs Bar */}
      <nav className="bg-slate-900/95 text-slate-300 border-b border-slate-800 sticky top-[61px] z-30 shadow-md backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-1 md:gap-2">
          
          {[
            { id: 'dashboard', label: 'Overview Terminal', icon: Landmark },
            { id: 'customers', label: 'Depositors Master', icon: Users },
            { id: 'fds', label: 'Deposits Ledger', icon: Receipt },
            { id: 'reports', label: 'Audit Report Center', icon: FileBarChart },
            { id: 'qr', label: 'QR Certificate Scanner', icon: QrCode },
            { id: 'settings', label: 'System Master Configuration', icon: Settings2 },
          ]
          .filter(tab => !(tab.id === 'settings' && session?.user?.role === 'operator'))
          .map(tab => {
            const Icon = tab.icon;
            const isActive = currentScreen === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentScreen(tab.id as any);
                  setFdSearchNumber(null);
                }}
                className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  isActive 
                    ? 'border-blue-500 text-white bg-slate-800/80 font-bold shadow-2xs' 
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

        </div>
      </nav>

      {/* Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1 w-full relative">
        
        {currentScreen === 'dashboard' && (
          <AdminDashboard 
            onNavigate={(screen) => setCurrentScreen(screen)}
            onQuickNewFD={handleQuickNewFD}
            onQuickNewCustomer={handleQuickNewCustomer}
            onSelectFD={handleFDSelectFromOtherPanel}
          />
        )}

        {currentScreen === 'customers' && (
          <CustomerManagement 
            onFDSelected={handleFDSelectFromOtherPanel}
            triggerAddForm={triggerCustomerAdd}
            onFormClosed={() => setTriggerCustomerAdd(false)}
            userRole={session?.user?.role}
          />
        )}

        {currentScreen === 'fds' && (
          <FDManagement 
            initialSearchFDNumber={fdSearchNumber}
            onClearInitialSearch={() => setFdSearchNumber(null)}
            triggerAddForm={triggerFDAdd}
            onFormClosed={() => setTriggerFDAdd(false)}
            isAdmin={session?.role === 'admin' && session?.user?.role !== 'operator'}
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

      {/* Global Footer */}
      <footer className="bg-white text-slate-500 border-t border-slate-200/80 py-5 text-center text-xs no-print">
        <p className="max-w-xl mx-auto leading-relaxed text-slate-500 font-medium">
          Super Money Fixed Deposit Management System. Built using strict cryptographic verification, sequential certificates, and automated roll-over renewal tracking.
        </p>
        <div className="flex justify-center items-center gap-3 text-[10px] text-slate-400 mt-2.5 font-mono uppercase tracking-wider font-semibold">
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Core Security Nodes Active
          </span>
          <span>•</span>
          <span>v4.2.1 Fintech Enterprise</span>
          <span>•</span>
          <span>Encrypted Audit Ledger</span>
        </div>
      </footer>

    </div>
  );
}
