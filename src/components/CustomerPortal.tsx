import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { FDMaster, DBCustomer, CompanySettings } from '../types';
import PrintReceipt from './PrintReceipt';
import { 
  Landmark, Percent, ShieldCheck, LogOut, FileText, BadgeCheck, 
  HelpCircle, User2, MapPin, Eye, ArrowLeft, Printer
} from 'lucide-react';

interface CustomerPortalProps {
  customer: DBCustomer;
  onLogout: () => void;
}

export default function CustomerPortal({ customer, onLogout }: CustomerPortalProps) {
  const [myFDs, setMyFDs] = useState<FDMaster[]>([]);
  const [selectedFD, setSelectedFD] = useState<FDMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Stats
  const [totalInvested, setTotalInvested] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [estimatedMaturity, setEstimatedMaturity] = useState(0);

  useEffect(() => {
    loadMyData();
  }, []);

  const getTodayStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  const loadMyData = async () => {
    setLoading(true);
    try {
      // Fetch records only where customer_id = logged-in customer AND status = 'Active'
      const activeFDs = await db.getActiveFDsByCustomer(customer.id);
      
      const todayStr = getTodayStr();
      // Exclude matured FDs from display (where maturity_date <= todayStr)
      const filtered = activeFDs.filter(f => f.maturity_date > todayStr);
      setMyFDs(filtered);

      const sets = await db.getSettings();
      setSettings(sets);

      // Calculate aggregates based only on active, non-matured FDs
      const invested = filtered.reduce((sum, f) => sum + f.deposit_amount, 0);
      const count = filtered.length;
      const maturity = filtered.reduce((sum, f) => sum + f.maturity_amount, 0);

      setTotalInvested(invested);
      setActiveCount(count);
      setEstimatedMaturity(maturity);
    } catch (err) {
      console.error('Error fetching customer portal data', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyForQR = (val: number) => {
    if (val % 1 === 0) {
      return '₹' + val.toLocaleString('en-IN');
    }
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getQRImageUrlForSelected = () => {
    if (!selectedFD) return '';
    const text = `----------------------------------------
SUPER MONEY FIXED DEPOSIT

FD No : ${selectedFD.fd_number}

Name : ${selectedFD.customer_name}

Father Name : ${customer.father_husband_name}

Deposit Amount : ${formatCurrencyForQR(selectedFD.deposit_amount)}

Interest Rate : ${selectedFD.interest_rate.toFixed(2)}%

Deposit Date : ${selectedFD.deposit_date}

Maturity Date : ${selectedFD.maturity_date}

Maturity Amount : ${formatCurrencyForQR(selectedFD.maturity_amount)}

----------------------------------------`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header bar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold shadow-sm">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold font-sans tracking-tight">
                Super Money Fixed Deposit
              </h1>
              <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase font-bold">
                Secure Depositor Portal (Read-Only)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400 block">Welcome Depositor</span>
              <span className="text-sm font-bold text-slate-100">{customer.name}</span>
            </div>
            <button
              onClick={onLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 p-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Profile overview card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                <User2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">{customer.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    Relation: <strong>{customer.relationship_type} {customer.father_husband_name}</strong>
                  </span>
                  <span>•</span>
                  <span>Mobile: <strong>{customer.mobile_number}</strong></span>
                  <span>•</span>
                  <span>PAN: <strong className="uppercase font-mono">{customer.pan_number}</strong></span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 flex items-center gap-2 text-xs">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">
                {customer.city}, {customer.state} ({customer.pincode})
              </span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 flex justify-between items-center">
            <div>
              <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold block">Active Certificates</span>
              <strong className="text-2xl font-mono text-slate-900 mt-1 block">{activeCount} FDs</strong>
            </div>
            <FileText className="h-10 w-10 text-blue-500/10" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 flex justify-between items-center">
            <div>
              <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold block">Total Invested Principal</span>
              <strong className="text-2xl font-mono text-slate-900 mt-1 block">₹{totalInvested.toLocaleString('en-IN')}</strong>
            </div>
            <Landmark className="h-10 w-10 text-emerald-500/10" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 flex justify-between items-center">
            <div>
              <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold block">Projected Maturity Payout</span>
              <strong className="text-2xl font-mono text-blue-900 mt-1 block">₹{estimatedMaturity.toLocaleString('en-IN')}</strong>
            </div>
            <Percent className="h-10 w-10 text-rose-500/10" />
          </div>
        </div>

        {/* Selected FD details view */}
        {selectedFD ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                onClick={() => setSelectedFD(null)}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-bold uppercase tracking-wider"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to portfolio
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded">
                  Audit Record: {selectedFD.fd_number}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* General placement config */}
                <div className="md:col-span-3 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Deposit Financial Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-slate-400 text-xxs uppercase tracking-wider block">Principal Amount</span>
                        <strong className="text-slate-900 text-sm font-bold font-mono">₹{selectedFD.deposit_amount.toLocaleString()}</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-slate-400 text-xxs uppercase tracking-wider block">Interest Rate</span>
                        <strong className="text-emerald-700 text-sm font-bold">{selectedFD.interest_rate.toFixed(2)}% P.A.</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-slate-400 text-xxs uppercase tracking-wider block">Interest Type</span>
                        <strong className="text-slate-900 text-sm font-bold">{selectedFD.interest_type}</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-slate-400 text-xxs uppercase tracking-wider block">Tenure Plan</span>
                        <strong className="text-slate-900 text-sm font-bold">{selectedFD.tenure_months} Months</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="text-slate-400 text-xxs uppercase tracking-wider block">Placement Date</span>
                        <strong className="text-slate-900 text-sm font-bold">{selectedFD.deposit_date}</strong>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 bg-blue-50/50 border-blue-100">
                        <span className="text-blue-800 text-xxs uppercase tracking-wider block font-bold">Maturity Date</span>
                        <strong className="text-blue-950 text-sm font-bold">{selectedFD.maturity_date}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Maturity Ledger Payout</h3>
                      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="text-slate-400 text-xxs uppercase tracking-wider">Projected maturity amount</span>
                          <h4 className="text-xl font-mono font-bold text-blue-400 mt-1">₹{selectedFD.maturity_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                        </div>
                        <Landmark className="h-8 w-8 text-blue-500/20" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Nominee Designation</h3>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nominee Name:</span>
                          <strong className="text-slate-800">{customer.nominee_name}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Relationship:</span>
                          <strong className="text-slate-800">{customer.nominee_relation}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification QR section */}
                <div className="md:col-span-1 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between items-center text-center">
                  <div className="space-y-2">
                    <span className="text-slate-500 text-xxs font-bold uppercase tracking-wider block">Security QR Code</span>
                    <p className="text-xxs text-slate-400 leading-tight">Your official receipt contains this QR verification code. Bank managers scan this code to instant-verify authenticity.</p>
                  </div>

                  <img 
                    src={getQRImageUrlForSelected()} 
                    alt="Receipt QR" 
                    className="h-32 w-32 bg-white border border-slate-200 p-1 rounded-lg shadow-sm my-4"
                    referrerPolicy="no-referrer"
                  />

                  <div className="w-full text-center">
                    <span className="text-xxs font-bold text-slate-400 block uppercase">Placement status</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-bold uppercase mt-1.5 ${
                      selectedFD.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      selectedFD.status === 'Renewed' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-200 text-slate-800'
                    }`}>
                      {selectedFD.status}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          /* FD Ledger List Table */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                My Registered Fixed Deposits Ledger
              </h3>
              <span className="text-xxs bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                Audit Complete
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-100">
                <thead>
                  <tr className="text-slate-500 font-bold uppercase tracking-wider text-left bg-slate-50/20">
                    <th className="px-6 py-3">FD Number</th>
                    <th className="px-6 py-3 text-right">Deposit Amount</th>
                    <th className="px-6 py-3 text-right">Interest Rate</th>
                    <th className="px-6 py-3">Deposit Date</th>
                    <th className="px-6 py-3">Maturity Date</th>
                    <th className="px-6 py-3 text-right">Maturity Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">Syncing with secure banking records...</td>
                    </tr>
                  ) : myFDs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">No active deposit receipts registered under your profile. Contact support.</td>
                    </tr>
                  ) : (
                    myFDs.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-700">{f.fd_number}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          ₹{f.deposit_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-700 font-bold">{f.interest_rate.toFixed(2)}%</td>
                        <td className="px-6 py-4 font-mono">{f.deposit_date}</td>
                        <td className="px-6 py-4 font-mono">{f.maturity_date}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          ₹{f.maturity_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center">
                            <button
                              onClick={() => setSelectedFD(f)}
                              className="text-xxs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/50 px-2.5 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                              title="View FD Details"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showPrintModal && selectedFD && settings && (
          <PrintReceipt
            fd={selectedFD}
            customer={customer}
            settings={settings}
            onClose={() => setShowPrintModal(false)}
          />
        )}

      </main>

      {/* Footer support */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-center text-xs">
        <p className="max-w-md mx-auto leading-relaxed">
          Need assistance or notice a discrepancy in your Fixed Deposit portfolio? Contact our Head Office support desk at <strong className="text-white">{customer.bank_name}</strong> or email <strong className="text-white">support@supermoneyfd.com</strong>.
        </p>
        <span className="text-[10px] text-slate-600 block mt-3">© 2026 {customer.bank_name} Fixed Deposit. All Rights Reserved.</span>
      </footer>
    </div>
  );
}
