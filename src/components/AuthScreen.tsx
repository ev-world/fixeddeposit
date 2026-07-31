import React, { useState } from 'react';
import { db, isUsingRealSupabase, supabaseClient } from '../lib/supabase';
import { DBCustomer, DBUser } from '../types';
import { Landmark, ShieldAlert, KeyRound, Phone, UserSquare2, RefreshCw, Eye, EyeOff, Terminal, CheckCircle2, XCircle, Clock, AlertTriangle, Bug } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: { role: 'admin' | 'customer'; data?: DBCustomer; user?: DBUser }) => void;
}

export interface DebugStepReport {
  stepNumber: number;
  stepName: string;
  status: 'success' | 'failed' | 'pending' | 'skipped';
  executionTimeMs?: number;
  dbError?: string;
  supabaseErrorCode?: string | number;
  errorMessage?: string;
  suggestedCause?: string;
  details?: Record<string, any>;
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

  // Debug state for DEV mode
  const [debugReports, setDebugReports] = useState<DebugStepReport[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const isDevMode = Boolean((import.meta as any).env?.DEV ?? true);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setDebugReports([]);

    const stepsLog: DebugStepReport[] = [];

    try {
      if (activeTab === 'admin') {
        const enteredUsername = username.trim();
        const t0 = performance.now();

        if (isDevMode) {
          console.group('[LOGIN DEBUG REPORT]');
          console.info('Step 1 ✓ Username received:', enteredUsername);
        }

        // STEP 1 REPORT
        const step1: DebugStepReport = {
          stepNumber: 1,
          stepName: 'Step 1: Username Input Verification',
          status: 'success',
          executionTimeMs: Math.round(performance.now() - t0),
          details: { username: enteredUsername }
        };
        stepsLog.push(step1);

        if (isUsingRealSupabase() && supabaseClient) {
          // STEP 2: RPC EMAIL LOOKUP
          const tRpcStart = performance.now();
          if (isDevMode) {
            console.info('Step 2 RPC Started: get_user_email_by_username');
            console.info('RPC Parameters:', { username_input: enteredUsername });
          }

          const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_user_email_by_username', {
            username_input: enteredUsername
          });

          const tRpcDuration = Math.round(performance.now() - tRpcStart);

          if (isDevMode) {
            console.info('RPC Execution Time:', `${tRpcDuration}ms`);
          }

          if (rpcError || !rpcData) {
            if (isDevMode) {
              console.error('Step 2 ✗ RPC Lookup Failed', {
                error: rpcError,
                data: rpcData,
                executionTime: `${tRpcDuration}ms`
              });
              console.groupEnd();
            }

            const step2Fail: DebugStepReport = {
              stepNumber: 2,
              stepName: 'Step 2: RPC Email Lookup (get_user_email_by_username)',
              status: 'failed',
              executionTimeMs: tRpcDuration,
              supabaseErrorCode: rpcError?.code || 'NO_DATA',
              errorMessage: rpcError?.message || 'No active email found for username in RPC lookup.',
              suggestedCause: 'The entered username does not exist in the "users" table, is marked is_active = false, or the RPC function "get_user_email_by_username" is missing or misconfigured in Supabase.'
            };
            stepsLog.push(step2Fail);
            setDebugReports(stepsLog);
            setShowDebugPanel(true);

            setError('Invalid Username or Password.');
            await db.logActivity('Unauthorized', 'Failed Admin Access Attempt', `RPC lookup failed or username not found: ${enteredUsername}`);
            setLoading(false);
            return;
          }

          let userEmail = '';
          if (typeof rpcData === 'string') {
            userEmail = rpcData;
          } else if (Array.isArray(rpcData) && rpcData.length > 0) {
            userEmail = typeof rpcData[0] === 'string' ? rpcData[0] : (rpcData[0]?.email || '');
          } else if (rpcData && typeof rpcData === 'object') {
            userEmail = (rpcData as any).email || '';
          }

          if (!userEmail) {
            if (isDevMode) {
              console.error('Step 2 ✗ RPC Returned Blank Email', { rpcData });
              console.groupEnd();
            }

            const step2Empty: DebugStepReport = {
              stepNumber: 2,
              stepName: 'Step 2: RPC Email Lookup (get_user_email_by_username)',
              status: 'failed',
              executionTimeMs: tRpcDuration,
              errorMessage: 'RPC function returned an empty email result.',
              suggestedCause: 'Check if the username has a valid, non-null email address populated in the users table.'
            };
            stepsLog.push(step2Empty);
            setDebugReports(stepsLog);
            setShowDebugPanel(true);

            setError('Invalid Username or Password.');
            await db.logActivity('Unauthorized', 'Failed Admin Access Attempt', `No email returned for username: ${enteredUsername}`);
            setLoading(false);
            return;
          }

          if (isDevMode) {
            console.info('Step 2 ✓ RPC Response Success', { returnedEmail: userEmail, executionTime: `${tRpcDuration}ms` });
          }

          const step2Success: DebugStepReport = {
            stepNumber: 2,
            stepName: 'Step 2: RPC Email Lookup (get_user_email_by_username)',
            status: 'success',
            executionTimeMs: tRpcDuration,
            details: { returnedEmail: userEmail }
          };
          stepsLog.push(step2Success);

          // STEP 3: SUPABASE AUTHENTICATION
          const tAuthStart = performance.now();
          if (isDevMode) {
            console.info('Step 3 Calling supabase.auth.signInWithPassword()');
            console.info('Email used:', userEmail);
            console.info('Authentication Started');
          }

          const { data: authResult, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: userEmail,
            password: password
          });

          const tAuthDuration = Math.round(performance.now() - tAuthStart);

          if (authError || !authResult.session) {
            if (isDevMode) {
              console.error('Step 3 ✗ Authentication Failed', {
                emailUsed: userEmail,
                completeError: authError,
                statusCode: authError?.status,
                errorMessage: authError?.message,
                executionTime: `${tAuthDuration}ms`
              });
              console.groupEnd();
            }

            const step3Fail: DebugStepReport = {
              stepNumber: 3,
              stepName: 'Step 3: Supabase Auth (signInWithPassword)',
              status: 'failed',
              executionTimeMs: tAuthDuration,
              supabaseErrorCode: authError?.status || 'AUTH_400',
              errorMessage: authError?.message || 'Invalid credentials or failed session initialization.',
              suggestedCause: 'Password mismatch or user does not exist in Supabase Authentication (auth.users) for email: ' + userEmail
            };
            stepsLog.push(step3Fail);
            setDebugReports(stepsLog);
            setShowDebugPanel(true);

            setError('Invalid Username or Password.');
            await db.logActivity(enteredUsername, 'Failed Admin Access Attempt', `Auth failure for email: ${userEmail}`);
            setLoading(false);
            return;
          }

          if (isDevMode) {
            console.info('Step 3 ✓ Authentication Success', { executionTime: `${tAuthDuration}ms` });
          }

          const step3Success: DebugStepReport = {
            stepNumber: 3,
            stepName: 'Step 3: Supabase Auth (signInWithPassword)',
            status: 'success',
            executionTimeMs: tAuthDuration,
            details: { emailUsed: userEmail }
          };
          stepsLog.push(step3Success);

          // STEP 4: SESSION CREATION
          const tSessionStart = performance.now();
          const userId = authResult.user.id;
          const jwtExists = !!authResult.session.access_token;

          if (isDevMode) {
            console.info('Step 4 ✓ Session Created', {
              userId: userId,
              jwtExists: jwtExists,
              sessionCreated: true
            });
          }

          const step4Success: DebugStepReport = {
            stepNumber: 4,
            stepName: 'Step 4: Session Creation',
            status: 'success',
            executionTimeMs: Math.round(performance.now() - tSessionStart),
            details: { userId, jwtExists }
          };
          stepsLog.push(step4Success);

          // STEP 5: LOADING USER PROFILE
          const tProfileStart = performance.now();
          if (isDevMode) {
            console.info('Step 5 Reading users table for username:', enteredUsername);
          }

          let targetUser = await db.getUserByUsername(enteredUsername);

          // Fallback 1: Query by email returned from RPC / Auth
          if (!targetUser && userEmail && isUsingRealSupabase() && supabaseClient) {
            const { data: userByEmail } = await supabaseClient
              .from('users')
              .select('*')
              .ilike('email', userEmail)
              .limit(1);
            if (userByEmail && userByEmail.length > 0) {
              targetUser = userByEmail[0] as DBUser;
            }
          }

          // Fallback 2: Query by auth_user_id
          if (!targetUser && isUsingRealSupabase() && supabaseClient) {
            const { data: userByAuth } = await supabaseClient
              .from('users')
              .select('*')
              .eq('auth_user_id', authResult.user.id)
              .limit(1);
            if (userByAuth && userByAuth.length > 0) {
              targetUser = userByAuth[0] as DBUser;
            }
          }

          // Fallback 3: Auto-provision profile record if Supabase Auth succeeded but public.users row is missing
          if (!targetUser && isUsingRealSupabase() && supabaseClient) {
            const newAdminProfile: DBUser = {
              id: '00000000-0000-0000-0000-000000000002',
              auth_user_id: authResult.user.id,
              username: enteredUsername || 'admin',
              email: userEmail || 'admin@supermoneyfd.com',
              full_name: 'System Administrator',
              mobile: '+91 98765 43210',
              role: 'super_admin',
              is_active: true,
              created_at: new Date().toISOString()
            };
            const { data: inserted } = await supabaseClient
              .from('users')
              .upsert([newAdminProfile], { onConflict: 'email' })
              .select();
            if (inserted && inserted.length > 0) {
              targetUser = inserted[0] as DBUser;
            } else {
              targetUser = newAdminProfile;
            }
          }

          const tProfileDuration = Math.round(performance.now() - tProfileStart);

          if (!targetUser) {
            if (isDevMode) {
              console.error('Step 5 ✗ User Profile Record Missing in users table');
              console.groupEnd();
            }

            const step5Fail: DebugStepReport = {
              stepNumber: 5,
              stepName: 'Step 5: Loading User Profile (users table)',
              status: 'failed',
              executionTimeMs: tProfileDuration,
              errorMessage: 'Record missing in users table for username: ' + enteredUsername,
              suggestedCause: 'The user is authenticated in Supabase Auth but lacks a matching user record in the public.users database table.'
            };
            stepsLog.push(step5Fail);
            setDebugReports(stepsLog);
            setShowDebugPanel(true);

            setError('Invalid Username or Password.');
            setLoading(false);
            return;
          }

          if (!targetUser.is_active) {
            if (isDevMode) {
              console.warn('Step 5 ✗ User Account is Inactive (is_active = false)');
              console.groupEnd();
            }

            const step5Inactive: DebugStepReport = {
              stepNumber: 5,
              stepName: 'Step 5: Loading User Profile (users table)',
              status: 'failed',
              executionTimeMs: tProfileDuration,
              errorMessage: 'User account status is inactive.',
              suggestedCause: 'The account has been disabled in the users table by a System Administrator.'
            };
            stepsLog.push(step5Inactive);
            setDebugReports(stepsLog);
            setShowDebugPanel(true);

            setError('Your account has been disabled.');
            await db.logActivity(targetUser.username, 'Failed Admin Access Attempt', 'Account is inactive.');
            setLoading(false);
            return;
          }

          if (isDevMode) {
            console.info('Step 5 ✓ Returned Record Success', {
              role: targetUser.role,
              is_active: targetUser.is_active,
              auth_user_id: userId,
              executionTime: `${tProfileDuration}ms`
            });
          }

          const step5Success: DebugStepReport = {
            stepNumber: 5,
            stepName: 'Step 5: Loading User Profile (users table)',
            status: 'success',
            executionTimeMs: tProfileDuration,
            details: { role: targetUser.role, is_active: targetUser.is_active, auth_user_id: userId }
          };
          stepsLog.push(step5Success);

          // STEP 6: ROLE VALIDATION
          const tRoleStart = performance.now();
          if (isDevMode) {
            console.info('Step 6 ✓ Role Found:', targetUser.role);
            console.info('Allowed Route: Dashboard');
            console.info('Dashboard Redirect Initiated');
          }

          const step6Success: DebugStepReport = {
            stepNumber: 6,
            stepName: 'Step 6: Role & Route Authorization',
            status: 'success',
            executionTimeMs: Math.round(performance.now() - tRoleStart),
            details: { roleFound: targetUser.role, allowedRoute: 'Dashboard' }
          };
          stepsLog.push(step6Success);

          // STEP 7: NAVIGATION
          const tNavStart = performance.now();

          // Update last_login timestamp and auth_user_id
          const nowIso = new Date().toISOString();
          await db.updateUserLastLogin(targetUser.id, authResult.user.id);
          targetUser.last_login = nowIso;
          targetUser.auth_user_id = authResult.user.id;

          await db.logActivity(targetUser.username, 'Admin Login', `Admin authenticated via Supabase Auth (${targetUser.role}).`);

          if (isDevMode) {
            console.info('Step 7 ✓ Redirect Success');
            console.groupEnd();
          }

          const step7Success: DebugStepReport = {
            stepNumber: 7,
            stepName: 'Step 7: Dashboard Navigation Redirect',
            status: 'success',
            executionTimeMs: Math.round(performance.now() - tNavStart)
          };
          stepsLog.push(step7Success);

          setDebugReports(stepsLog);
          
          onLoginSuccess({
            role: 'admin',
            user: targetUser
          });
        } else {
          // Local fallback mode when Supabase is not connected
          if (isDevMode) {
            console.info('Step 2 [Local Fallback] Searching users table...');
          }

          const targetUser = await db.getUserByUsername(enteredUsername);

          if (!targetUser) {
            if (isDevMode) {
              console.error('Step 2 [Local Fallback] ✗ Username not found');
              console.groupEnd();
            }

            const step2Fail: DebugStepReport = {
              stepNumber: 2,
              stepName: 'Step 2: Local Database Username Lookup',
              status: 'failed',
              errorMessage: 'Username not found in local user storage.',
              suggestedCause: 'No user matching "' + enteredUsername + '" exists in local database.'
            };
            stepsLog.push(step2Fail);
            setDebugReports(stepsLog);
            setShowDebugPanel(true);

            setError('Invalid Username or Password.');
            await db.logActivity('Unauthorized', 'Failed Admin Access Attempt', `Username not found: ${enteredUsername}`);
            setLoading(false);
            return;
          }

          if (!targetUser.is_active) {
            setError('Your account has been disabled.');
            await db.logActivity(targetUser.username, 'Failed Admin Access Attempt', 'Account is inactive.');
            setLoading(false);
            return;
          }

          if (password === 'Password' || password === 'admin123') {
            const nowIso = new Date().toISOString();
            await db.updateUserLastLogin(targetUser.id);
            targetUser.last_login = nowIso;
            await db.logActivity(targetUser.username, 'Admin Login', `Admin local login successful.`);

            if (isDevMode) {
              console.info('Step 7 [Local Fallback] ✓ Local Redirect Success');
              console.groupEnd();
            }

            onLoginSuccess({
              role: 'admin',
              user: targetUser
            });
          } else {
            if (isDevMode) {
              console.error('Step 3 [Local Fallback] ✗ Invalid local password');
              console.groupEnd();
            }

            const step3LocalFail: DebugStepReport = {
              stepNumber: 3,
              stepName: 'Step 3: Local Password Verification',
              status: 'failed',
              errorMessage: 'Invalid local password provided.',
              suggestedCause: 'Use default fallback password "Password" or "admin123" when Supabase is disconnected.'
            };
            stepsLog.push(step3LocalFail);
            setDebugReports(stepsLog);
            setShowDebugPanel(true);

            setError('Invalid Username or Password.');
            await db.logActivity(targetUser.username, 'Failed Admin Access Attempt', 'Invalid local password.');
          }
        }
      } else {
        // Customer Authentication (Unchanged)
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
          const fourChars = cleanedName.substring(0, 4);
          expectedPrefix = fourChars.charAt(0).toUpperCase() + fourChars.slice(1).toLowerCase();
        }
        const expectedPassword = `${expectedPrefix}@123`;
        
        const alternateExpectedPassword = `${cleanedName.substring(0, 4)}@123`;

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
      if (isDevMode) {
        console.error('[LOGIN DEBUG REPORT] Exception Caught:', err);
        console.groupEnd();
      }
      setError('A network exception occurred during bank verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center relative overflow-hidden p-4 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Decorative background grid & subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500/15 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 mb-6 flex flex-col items-center gap-2.5 text-center">
        <div className="bg-gradient-to-tr from-blue-600 to-blue-500 text-white p-3.5 rounded-2xl shadow-xl shadow-blue-900/40 ring-1 ring-white/20">
          <Landmark className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-sans">
            Super Money Fixed Deposit
          </h1>
          <p className="text-[10px] text-amber-400 font-mono tracking-widest uppercase font-bold flex items-center justify-center gap-1.5 mt-1">
            Secure Core Banking Access Terminal
            {isDevMode && (
              <span className="bg-amber-400/20 text-amber-300 text-[9px] px-2 py-0.5 rounded-full border border-amber-400/30 font-mono flex items-center gap-1">
                <Bug className="h-2.5 w-2.5" /> DEBUG ACTIVE
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main card box */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-2xl p-6 md:p-8 text-slate-900 relative z-10 my-4">
        
        {/* Portal switcher tab header */}
        {!showForgot && (
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-6 border border-slate-200/80">
            <button
              onClick={() => {
                setActiveTab('customer');
                setError('');
                setUsername('');
                setPassword('');
                setDebugReports([]);
                setShowDebugPanel(false);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'customer' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-600 hover:text-slate-900'
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
                setDebugReports([]);
                setShowDebugPanel(false);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'admin' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-600 hover:text-slate-900'
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
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl w-fit mx-auto border border-blue-200/80 shadow-xs">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tamper-Proof Ledger Protection</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                To guarantee maximum depositor security, login credentials can only be verified or reset in-person. 
              </p>
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-left text-xxs text-slate-700 mt-4 leading-relaxed space-y-2">
                <p className="font-medium">1. Present your original Aadhaar Card or PAN Card to your local Super Money branch clerk.</p>
                <p className="font-medium">2. Ask the administrator to inspect your customer profile ledger inside the Customer Management panel.</p>
                <p className="font-medium">3. If password problems persist, administrators can update details via the "Edit Customer" form.</p>
              </div>
            </div>
            <button
              onClick={() => setShowForgot(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-slate-200/80"
            >
              Return to Login Interface
            </button>
          </div>
        ) : (
          /* Main auth input form */
          <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
            
            {/* Display error messages */}
            {error && (
              <div className="bg-rose-50 border border-rose-200/80 text-rose-700 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 shadow-2xs">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="leading-tight font-medium">
                  <div>{error}</div>
                  {isDevMode && debugReports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDebugPanel(!showDebugPanel)}
                      className="mt-2 text-[10px] bg-rose-100 hover:bg-rose-200 text-rose-900 font-mono px-2.5 py-1 rounded-lg border border-rose-300 flex items-center gap-1.5 cursor-pointer font-bold transition-all"
                    >
                      <Terminal className="h-3 w-3" />
                      {showDebugPanel ? 'Hide Login Debug Panel' : 'Inspect Login Failure Debug Panel'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {activeTab === 'customer' ? 'Customer Registered Mobile' : 'Branch Administrator ID'}
              </label>
              <div className="relative">
                {activeTab === 'customer' ? (
                  <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                ) : (
                  <UserSquare2 className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                )}
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'customer' ? "Enter 10-digit mobile number" : "admin"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50/50 focus:bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-mono transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Access Security Passkey
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-700 cursor-pointer font-bold uppercase tracking-wide hover:underline"
                >
                  Forgot Key?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={activeTab === 'customer' ? "Rame@123" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 focus:bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {activeTab === 'customer' && (
                <span className="block text-[10px] text-slate-500 mt-2.5 leading-relaxed font-sans text-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  Password Tip: Capitalized first letter of name + @123.
                  <strong className="block text-blue-700 font-mono mt-1 font-bold">Example: RAMESH KUMAR &rarr; Rame@123</strong>
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer text-xs active:scale-[0.99]"
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

        {/* LOGIN DEBUG PANEL (DEV MODE ONLY) */}
        {isDevMode && showDebugPanel && debugReports.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-200 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-mono">
                <Terminal className="h-4 w-4 text-amber-600" />
                <span>LOGIN DEBUG REPORT</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
                DEV MODE
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {debugReports.map((report) => (
                <div
                  key={report.stepNumber}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                    report.status === 'success'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : report.status === 'failed'
                      ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold">
                      {report.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      ) : report.status === 'failed' ? (
                        <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span>{report.stepName}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
                      {report.executionTimeMs !== undefined && (
                        <span className="text-slate-500 font-medium">
                          {report.executionTimeMs} ms
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded uppercase font-bold ${
                          report.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>

                  {/* Failure details */}
                  {report.status === 'failed' && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200/80 space-y-1.5 text-[11px]">
                      {report.supabaseErrorCode && (
                        <div>
                          <strong className="text-rose-900">Error Code:</strong>{' '}
                          <span className="font-semibold text-rose-800">{report.supabaseErrorCode}</span>
                        </div>
                      )}
                      {report.errorMessage && (
                        <div>
                          <strong className="text-rose-900">Error Message:</strong>{' '}
                          <span className="text-rose-800">{report.errorMessage}</span>
                        </div>
                      )}
                      {report.suggestedCause && (
                        <div className="bg-white/80 p-2 rounded-lg border border-rose-200 text-[10px] leading-relaxed text-slate-800 font-sans mt-1">
                          <strong className="text-amber-800 font-mono uppercase block mb-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-600 inline" /> Suggested Fix / Cause:
                          </strong>
                          {report.suggestedCause}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Success details */}
                  {report.status === 'success' && report.details && (
                    <div className="mt-1.5 text-[10px] text-emerald-800/80 font-mono space-y-0.5">
                      {Object.entries(report.details).map(([k, v]) => (
                        <div key={k}>
                          <strong>{k}:</strong> {String(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer copyright */}
      <span className="mt-6 text-slate-400 font-mono text-[10px] tracking-widest uppercase text-center">
        © 2026 Super Money Fixed Deposit. Encrypted by 256-Bit SSL Core Protocol.
      </span>

    </div>
  );
}

