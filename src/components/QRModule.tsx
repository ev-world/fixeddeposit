import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { FDMaster, ScanHistoryItem, DBCustomer } from '../types';
import { 
  QrCode, Search, ScanLine, Clock, CalendarDays, User, ArrowRight,
  BadgeCheck, ShieldAlert, CheckCircle, RefreshCw, Smartphone
} from 'lucide-react';

interface QRModuleProps {
  onSelectFD: (fdNumber: string) => void;
}

export default function QRModule({ onSelectFD }: QRModuleProps) {
  const [fds, setFds] = useState<FDMaster[]>([]);
  const [selectedFD, setSelectedFD] = useState<FDMaster | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  
  // Verification states
  const [verifyInput, setVerifyInput] = useState('');
  const [verifiedRecord, setVerifiedRecord] = useState<FDMaster | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allFDs = await db.getFDs();
      setFds(allFDs);
      if (allFDs.length > 0) {
        setSelectedFD(allFDs[0]);
      }
      const history = await db.getScanHistory();
      setScanHistory(history);
      
      const allCustomers = await db.getCustomers();
      setCustomers(allCustomers);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    
    setIsVerifying(true);
    setVerifyError('');
    setVerifiedRecord(null);

    // Simulate 800ms network delay for a premium banking experience
    setTimeout(async () => {
      try {
        const record = await db.getFDByNumber(verifyInput.trim());
        if (record) {
          setVerifiedRecord(record);
          // Log scan
          await db.logScan(record.fd_number, record.customer_name, 'Admin Auditor');
          // Reload scan history
          const history = await db.getScanHistory();
          setScanHistory(history);
        } else {
          setVerifyError(`Invalid FD Certificate Number "${verifyInput}". Deposit records not found in bank central database.`);
        }
      } catch (err: any) {
        setVerifyError('An error occurred during secure database lookup.');
      } finally {
        setIsVerifying(false);
      }
    }, 800);
  };

  const handleSimulateScan = async (fdNumber: string) => {
    setVerifyInput(fdNumber);
    setIsVerifying(true);
    setVerifyError('');
    setVerifiedRecord(null);

    setTimeout(async () => {
      try {
        const record = await db.getFDByNumber(fdNumber);
        if (record) {
          setVerifiedRecord(record);
          await db.logScan(record.fd_number, record.customer_name, 'Mobile QR Scanner');
          const history = await db.getScanHistory();
          setScanHistory(history);
        }
      } catch (err) {
        setVerifyError('Verification failed.');
      } finally {
        setIsVerifying(false);
      }
    }, 700);
  };

  const getQRImageUrl = (fdNum: string) => {
    const fdItem = fds.find(f => f.fd_number === fdNum);
    if (!fdItem) return '';
    const cust = customers.find(c => c.id === fdItem.customer_id);
    const fatherName = cust ? cust.father_husband_name : '';

    const formatCurrencyForQR = (val: number) => {
      if (val % 1 === 0) {
        return '₹' + val.toLocaleString('en-IN');
      }
      return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const text = `----------------------------------------
SUPER MONEY FIXED DEPOSIT

FD No : ${fdItem.fd_number}

Name : ${fdItem.customer_name}

Father Name : ${fatherName}

Deposit Amount : ${formatCurrencyForQR(fdItem.deposit_amount)}

Interest Rate : ${fdItem.interest_rate.toFixed(2)}%

Deposit Date : ${fdItem.deposit_date}

Maturity Date : ${fdItem.maturity_date}

Maturity Amount : ${formatCurrencyForQR(fdItem.maturity_amount)}

----------------------------------------`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* 1. Left Side: QR Code Generator (Select and view FD QR) */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 mb-1">
            <QrCode className="h-5 w-5 text-amber-500" />
            Certificate QR Generator
          </h3>
          <p className="text-xs text-slate-500 mb-6">Select a Fixed Deposit from the master registry to render its anti-tamper verification QR Code.</p>

          <div className="mb-6">
            <label className="block text-xxs font-bold text-slate-700 uppercase mb-2">Select Fixed Deposit</label>
            <select
              value={selectedFD ? selectedFD.fd_number : ''}
              onChange={(e) => {
                const fdNum = e.target.value;
                const found = fds.find(f => f.fd_number === fdNum);
                if (found) setSelectedFD(found);
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
            >
              {fds.length === 0 ? (
                <option>No deposits registered</option>
              ) : (
                fds.map(f => (
                  <option key={f.id} value={f.fd_number}>
                    {f.fd_number} - {f.customer_name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {selectedFD ? (
          <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <img
              src={getQRImageUrl(selectedFD.fd_number)}
              alt="Verification QR"
              className="h-44 w-44 bg-white border border-slate-200 p-1.5 rounded-lg shadow-md mb-4"
              referrerPolicy="no-referrer"
            />
            <div className="text-center px-4">
              <strong className="text-sm font-mono text-slate-900 block font-bold">{selectedFD.fd_number}</strong>
              <span className="text-xs text-slate-500 block mt-0.5">{selectedFD.customer_name}</span>
              <span className="text-xxs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-block mt-2">
                Deposit Value: ₹{selectedFD.deposit_amount.toLocaleString()}
              </span>
            </div>
            
            <button
              onClick={() => handleSimulateScan(selectedFD.fd_number)}
              className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Simulate Scan
            </button>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            No Fixed Deposit records registered to generate QR.
          </div>
        )}
      </div>

      {/* 2. Middle: QR Verification Portal (Verify a QR code) */}
      <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 mb-1">
            <ScanLine className="h-5 w-5 text-amber-500 animate-pulse" />
            Audit Scanner Simulator
          </h3>
          <p className="text-xs text-slate-500 mb-6">Verify receipt authenticity by inputting/scanning the Certificate registration key.</p>

          <form onSubmit={handleVerifySubmit} className="flex gap-2 mb-6">
            <input
              type="text"
              required
              placeholder="Enter Certificate Number (e.g. FD202600001)"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 rounded-lg font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Verify
            </button>
          </form>
        </div>

        {/* Verification Status Feedback Card */}
        <div className="flex-1 flex flex-col justify-center">
          {isVerifying && (
            <div className="text-center py-12 flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Accessing secure bank records...</p>
            </div>
          )}

          {!isVerifying && !verifiedRecord && !verifyError && (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50 flex flex-col items-center justify-center p-4">
              <QrCode className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">Ready to audit. Run scan or type FD Certificate key above to execute central ledger verification.</p>
            </div>
          )}

          {!isVerifying && verifyError && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center flex flex-col items-center">
              <ShieldAlert className="h-10 w-10 text-red-500 mb-2" />
              <h4 className="text-sm font-bold text-red-950">Security Verification Failure</h4>
              <p className="text-xs text-red-700 mt-1">{verifyError}</p>
            </div>
          )}

          {!isVerifying && verifiedRecord && (
            <div className="bg-emerald-50/50 border border-emerald-200 p-5 rounded-xl text-left space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle className="h-5 w-5" />
                <h4 className="font-bold text-sm">Ledger Verification Match</h4>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Certificate Number</span>
                  <strong className="font-mono text-slate-900 text-sm font-semibold">{verifiedRecord.fd_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Customer Holder</span>
                  <strong className="text-slate-900 font-semibold">{verifiedRecord.customer_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Deposit Amount</span>
                  <strong className="text-slate-900 font-semibold">₹{verifiedRecord.deposit_amount.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Interest Rate P.A.</span>
                  <strong className="text-emerald-700 font-bold">{verifiedRecord.interest_rate.toFixed(2)}%</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Maturity Date</span>
                  <strong className="text-amber-950 font-bold">{verifiedRecord.maturity_date}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Ledger Status</span>
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                    verifiedRecord.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                    verifiedRecord.status === 'Renewed' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {verifiedRecord.status}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-100 flex justify-end">
                <button
                  onClick={() => onSelectFD(verifiedRecord.fd_number)}
                  className="text-xxs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                >
                  Open Record Details
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Right Side: Scan History Log (View history) */}
      <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-amber-500" />
            Verification History
          </h3>
          <p className="text-xs text-slate-500 mb-6">Recent certificate verification attempts logged.</p>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {scanHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No scan history logged.
              </div>
            ) : (
              scanHistory.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => onSelectFD(item.fd_number)}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-amber-300 hover:bg-amber-50/20 cursor-pointer transition-all flex justify-between items-start"
                >
                  <div className="text-left">
                    <span className="font-mono text-xxs font-bold text-slate-900 block">{item.fd_number}</span>
                    <span className="text-xxs text-slate-500 block truncate max-w-[140px]">{item.customer_name}</span>
                    <span className="text-[9px] text-slate-400 block mt-1">{item.scanned_by}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono text-right">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
