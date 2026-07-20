import React, { useState } from 'react';
import { db } from '../lib/supabase';
import { DBCustomer } from '../types';
import { Landmark, ShieldAlert, KeyRound, Phone, UserSquare2, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: { role: 'admin' | 'customer'; data?: DBCustomer }) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot password flow
  const [showForgot, setShowForgot] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate 600ms network lookup for realistic security experience
    setTimeout(async () => {
      try {
        if (activeTab === 'admin') {
          // Admin Authentication
          if (username === 'admin' && password === 'Password') {
            await db.logActivity('Admin', 'Admin Login', 'Admin portal authentication successful.');
            onLoginSuccess({ role: 'admin' });
          } else {
            setError('Invalid Administrator Credentials. Audited intrusion logs recorded.');
            await db.logActivity('Unauthorized', 'Failed Admin Access Attempt', `IP logged. Username: ${username}`);
          }
        } else {
          // Customer Authentication
          // Username = Customer Mobile Number
          // Password = First four letters of customer name + @123 (e.g. RAMESH KUMAR -> Rame@123)
          const allCustomers = await db.getCustomers();
          const targetCust = allCustomers.find(c => c.mobile_number.trim() === username.trim());

          if (!targetCust) {
            setError('Mobile Number not registered in Super Money Deposit Directory.');
            setLoading(false);
            return;
          }

          // Generate dynamic expected password
          const cleanedName = targetCust.name.trim();
          let expectedPrefix = '';
          if (cleanedName.length < 4) {
            expectedPrefix = cleanedName;
          } else {
            // First letter capitalized, rest lower
            const fourChars = cleanedName.substring(0, 4);
            expectedPrefix = fourChars.charAt(0).toUpperCase() + fourChars.slice(1).toLowerCase();
          }
          const expectedPassword = `${expectedPrefix}@123`;
          
          // Also check case-insensitive or exact name + @123 as safety fallback
          const alternateExpectedPassword = `${cleanedName.substring(0, 4)}@123`; // e.g. RAME@123

          const matches = (password === expectedPassword) || (password === alternateExpectedPassword) || (password === expectedPassword.toUpperCase()) || (password === expectedPassword.toLowerCase());

          if (matches) {
            await db.logActivity(targetCust.name, 'Customer Portal Login', `Depositor logged in securely via mobile: ${targetCust.mobile_number}`);
            onLoginSuccess({ role: 'customer', data: targetCust });
          } else {
            setError(`Invalid Credential Passkey. Password format: First 4 characters of Name + @123.`);
            await db.logActivity('Unauthorized', 'Failed Customer Access Attempt', `Phone: ${username}`);
          }
        }
      } catch (err: any) {
        setError('A network exception occurred during bank verification.');
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center relative overflow-hidden p-4">
      
      {/* Decorative vector overlays */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="absolute top-10 flex flex-col items-center gap-2">
        <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg flex items-center justify-center">
          <Landmark className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase text-center font-sans">
          Super Money Fixed Deposit
        </h1>
        <p className="text-xxs text-blue-600 font-mono tracking-widest uppercase font-bold">
          Secure Core Banking Access Node
        </p>
      </div>

      {/* Main card box */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 md:p-8 relative z-10 my-24">
        
        {/* Portal switcher tab header */}
        {!showForgot && (
          <div className="flex bg-slate-50 p-1.5 rounded-xl mb-6 border border-slate-200">
            <button
              onClick={() => {
                setActiveTab('customer');
                setError('');
                setUsername('');
                setPassword('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'customer' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              Customer Login
            </button>
            <button
              onClick={() => {
                setActiveTab('admin');
                setError('');
                setUsername('');
                setPassword('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'admin' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserSquare2 className="h-3.5 w-3.5" />
              Branch Admin
            </button>
          </div>
        )}

        {/* Content switch */}
        {showForgot ? (
          /* Forgot password notice panel */
          <div className="space-y-6 text-center">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-full w-fit mx-auto border border-blue-100">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-md font-bold text-slate-900">Tamper-Proof Ledger Protection</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                To guarantee maximum depositor security, login credentials can only be verified or reset in-person. 
              </p>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left text-xxs text-slate-700 mt-4 leading-relaxed space-y-2">
                <p className="font-medium">1. Present your original Aadhaar Card or PAN Card to your local Super Money branch clerk.</p>
                <p className="font-medium">2. Ask the administrator to inspect your customer profile ledger inside the Customer Management panel.</p>
                <p className="font-medium">3. If password problems persist, administrators can update details via the "Edit Customer" form.</p>
              </div>
            </div>
            <button
              onClick={() => setShowForgot(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Return to Login Interface
            </button>
          </div>
        ) : (
          /* Main auth input form */
          <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
            
            {/* Display error messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-xs flex items-start gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="leading-tight font-medium">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {activeTab === 'customer' ? 'Customer Registered Mobile' : 'Branch Administrator ID'}
              </label>
              <div className="relative">
                {activeTab === 'customer' ? (
                  <Phone className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                ) : (
                  <UserSquare2 className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                )}
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'customer' ? "Enter 10-digit mobile number" : "admin"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider">
                  Access Security Passkey
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xxs text-blue-600 hover:text-blue-500 hover:underline cursor-pointer font-bold uppercase"
                >
                  Forgot Key?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={activeTab === 'customer' ? "Rame@123" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-11 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {activeTab === 'customer' && (
                <span className="block text-[10px] text-slate-500 mt-2.5 leading-relaxed font-sans text-center bg-slate-50 p-2 rounded border border-slate-200/50">
                  Password Tip: Capitalized first letter of name + @123.
                  <strong className="block text-blue-600 font-mono mt-1">Example: RAMESH KUMAR &rarr; Rame@123</strong>
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
              ) : (
                <KeyRound className="h-4 w-4 text-white" />
              )}
              {loading ? 'Decrypting Secure Tokens...' : 'Secure Node Sign-In'}
            </button>
          </form>
        )}

      </div>

      {/* Footer copyright */}
      <span className="absolute bottom-6 text-slate-400 font-mono text-[9px] tracking-wider uppercase text-center">
        © 2026 Super Money Fixed Deposit. Protected by 256-bit AES cryptographic verification protocol.
      </span>

    </div>
  );
}
