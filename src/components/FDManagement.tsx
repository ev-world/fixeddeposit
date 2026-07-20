import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { calculateMaturityDate, calculateFDInterest, calculatePrematureClose } from '../lib/calculator';
import { FDMaster, DBCustomer, CompanySettings, InterestMaster, TenureMaster } from '../types';
import PrintReceipt from './PrintReceipt';
import { 
  PlusCircle, RefreshCw, Eye, Edit, Trash2, Printer, Search, 
  X, Save, CheckCircle, AlertTriangle, Play, HelpCircle, ArrowUpRight, FileText,
  Calendar, Clock, Coins, User, ShieldAlert
} from 'lucide-react';

const getTodayStr = () => {
  try {
    return new Date().toLocaleDateString('en-CA');
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
};

interface FDManagementProps {
  initialSearchFDNumber: string | null;
  onClearInitialSearch: () => void;
  triggerAddForm: boolean;
  onFormClosed: () => void;
  isAdmin?: boolean;
}

export default function FDManagement({ initialSearchFDNumber, onClearInitialSearch, triggerAddForm, onFormClosed, isAdmin = true }: FDManagementProps) {
  const [fds, setFds] = useState<FDMaster[]>([]);
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [interests, setInterests] = useState<InterestMaster[]>([]);
  const [tenures, setTenures] = useState<TenureMaster[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Form State
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFD, setEditFD] = useState<{
    id: string;
    fd_number: string;
    customer_id: string;
    customer_name: string;
    customer_mobile: string;
    deposit_amount: number;
    tenure_months: number;
    interest_rate: number;
    interest_type: 'Monthly' | 'Quarterly' | 'Yearly' | 'Cumulative';
    deposit_date: string;
    deposit_time: string;
    maturity_date: string;
    maturity_amount: number;
    originalFD: FDMaster | null;
  }>({
    id: '',
    fd_number: '',
    customer_id: '',
    customer_name: '',
    customer_mobile: '',
    deposit_amount: 0,
    tenure_months: 12,
    interest_rate: 0,
    interest_type: 'Cumulative',
    deposit_date: '',
    deposit_time: '',
    maturity_date: '',
    maturity_amount: 0,
    originalFD: null
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    show: false,
    title: '',
    message: '',
    confirmText: 'Yes, Proceed',
    cancelText: 'Cancel',
    isDanger: false,
    onConfirm: () => {}
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Renewed' | 'Closed' | 'Premature Closed' | 'Matured'>('All');

  // Modals state
  const [showPlacementForm, setShowPlacementForm] = useState(false);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFD, setSelectedFD] = useState<FDMaster | null>(null);
  const [viewingFD, setViewingFD] = useState<FDMaster | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // New Placement Form State
  const [newFD, setNewFD] = useState({
    customer_id: '',
    deposit_amount: 50000,
    deposit_date: new Date().toISOString().split('T')[0],
    deposit_time: new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5),
    tenure_months: 12,
    interest_rate: 7.25,
    interest_type: 'Cumulative' as 'Monthly' | 'Quarterly' | 'Yearly' | 'Cumulative',
    maturity_date: '',
    maturity_amount: 0,
    isManualRate: false
  });

  // Renewal Form State
  const [renewFD, setRenewFD] = useState({
    oldFDId: '',
    oldFDNumber: '',
    deposit_amount: 50000,
    deposit_date: new Date().toISOString().split('T')[0],
    deposit_time: new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5),
    tenure_months: 12,
    interest_rate: 7.25,
    interest_type: 'Cumulative' as 'Monthly' | 'Quarterly' | 'Yearly' | 'Cumulative',
    maturity_date: '',
    maturity_amount: 0
  });

  // Closing Form State
  const [closeFD, setCloseFD] = useState({
    fdId: '',
    fdNumber: '',
    close_date: new Date().toISOString().split('T')[0],
    close_time: new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5),
    isPremature: false,
    reason: '',
    depositAmount: 0,
    originalRate: 0,
    actualTenureMonths: 0,
    interestPaid: 0,
    penalty: 0,
    finalAmount: 0,
    paymentMode: 'Bank Transfer' as 'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI',
    remarks: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialSearchFDNumber) {
      setSearchTerm(initialSearchFDNumber);
      setStatusFilter('All');
      onClearInitialSearch();
    }
  }, [initialSearchFDNumber]);

  useEffect(() => {
    if (triggerAddForm) {
      handleOpenPlacement();
    }
  }, [triggerAddForm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allFDs = await db.getFDs();
      const allCust = await db.getCustomers();
      const rates = await db.getInterestRates();
      const tens = await db.getTenures();
      const sets = await db.getSettings();

      setFds(allFDs);
      setCustomers(allCust);
      setInterests(rates);
      setTenures(tens);
      setSettings(sets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // --- MATH TRIGGERS FOR PLACEMENT ---
  useEffect(() => {
    if (!newFD.customer_id) return;
    
    // Auto calculate interest rate based on customer and tenure
    let currentRate = newFD.interest_rate;
    if (!newFD.isManualRate) {
      const customer = customers.find(c => c.id === newFD.customer_id);
      const isSenior = customer ? isSeniorCitizen(customer.dob) : false;
      const category = isSenior ? 'Senior Citizen' : 'Regular';
      
      const slab = interests.find(
        r => r.category === category && 
        newFD.tenure_months >= r.tenure_months_min && 
        newFD.tenure_months <= r.tenure_months_max
      );
      if (slab) {
        currentRate = slab.interest_rate;
      }
    }

    // Auto calculate maturity date & amount
    const matDate = calculateMaturityDate(newFD.deposit_date, newFD.tenure_months);
    const math = calculateFDInterest(
      newFD.deposit_amount,
      currentRate,
      newFD.tenure_months,
      newFD.interest_type
    );

    setNewFD(prev => ({
      ...prev,
      interest_rate: currentRate,
      maturity_date: matDate,
      maturity_amount: math.maturityAmount
    }));
  }, [
    newFD.customer_id, 
    newFD.deposit_amount, 
    newFD.deposit_date, 
    newFD.tenure_months, 
    newFD.interest_type, 
    newFD.isManualRate,
    interests,
    customers
  ]);

  // --- MATH TRIGGERS FOR RENEWAL ---
  useEffect(() => {
    if (!renewFD.oldFDId) return;

    const matDate = calculateMaturityDate(renewFD.deposit_date, renewFD.tenure_months);
    const math = calculateFDInterest(
      renewFD.deposit_amount,
      renewFD.interest_rate,
      renewFD.tenure_months,
      renewFD.interest_type
    );

    setRenewFD(prev => {
      if (prev.maturity_date === matDate && prev.maturity_amount === math.maturityAmount) {
        return prev;
      }
      return {
        ...prev,
        maturity_date: matDate,
        maturity_amount: math.maturityAmount
      };
    });
  }, [
    renewFD.deposit_amount, 
    renewFD.deposit_date, 
    renewFD.tenure_months, 
    renewFD.interest_type, 
    renewFD.interest_rate,
    renewFD.oldFDId
  ]);

  // --- MATH TRIGGERS FOR EDIT MODE ---
  useEffect(() => {
    if (!showEditForm || !editFD.id) return;

    const matDate = calculateMaturityDate(editFD.deposit_date, editFD.tenure_months);
    const math = calculateFDInterest(
      editFD.deposit_amount,
      editFD.interest_rate,
      editFD.tenure_months,
      editFD.interest_type
    );

    setEditFD(prev => {
      if (prev.maturity_date === matDate && prev.maturity_amount === math.maturityAmount) {
        return prev;
      }
      return {
        ...prev,
        maturity_date: matDate,
        maturity_amount: math.maturityAmount
      };
    });
  }, [
    editFD.deposit_amount,
    editFD.deposit_date,
    editFD.tenure_months,
    editFD.interest_rate,
    editFD.interest_type,
    showEditForm
  ]);

  // --- MATH TRIGGERS FOR CLOSING ---
  useEffect(() => {
    if (!closeFD.fdId) return;

    if (closeFD.isPremature) {
      // Run penalty mathematical algorithm
      const result = calculatePrematureClose(
        closeFD.depositAmount,
        selectedFD?.deposit_date || '',
        closeFD.close_date,
        closeFD.originalRate,
        2.0 // 2% standard bank penalty
      );

      setCloseFD(prev => ({
        ...prev,
        actualTenureMonths: result.actualTenureMonths,
        interestPaid: result.interestEarned,
        penalty: 2.0,
        finalAmount: result.finalPayout,
        reason: prev.reason || 'Withdrawing due to personal emergency.'
      }));
    } else {
      // Normal maturity close
      const estInterest = Math.max(0, (selectedFD?.maturity_amount || 0) - (selectedFD?.deposit_amount || 0));
      setCloseFD(prev => ({
        ...prev,
        actualTenureMonths: selectedFD?.tenure_months || 0,
        interestPaid: estInterest,
        penalty: 0,
        finalAmount: selectedFD?.maturity_amount || 0,
        reason: 'Normal maturity tenure completed.'
      }));
    }
  }, [closeFD.isPremature, closeFD.close_date, closeFD.fdId]);

  // Helper age calculator
  const isSeniorCitizen = (dobStr: string): boolean => {
    if (!dobStr) return false;
    const birth = new Date(dobStr);
    const ageDifMs = Date.now() - birth.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return age >= 60;
  };

  const handleOpenPlacement = () => {
    if (customers.length === 0) {
      showToast('error', 'Please enroll at least one customer first prior to placing a Fixed Deposit.');
      return;
    }
    setNewFD({
      customer_id: customers[0].id,
      deposit_amount: 50000,
      deposit_date: new Date().toISOString().split('T')[0],
      deposit_time: new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5),
      tenure_months: 12,
      interest_rate: 7.25,
      interest_type: 'Cumulative',
      maturity_date: '',
      maturity_amount: 0,
      isManualRate: false
    });
    setShowPlacementForm(true);
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!newFD.customer_id) throw new Error('Please select a customer.');
      const customer = customers.find(c => c.id === newFD.customer_id);
      if (!customer) throw new Error('Customer profile not found.');

      if (!newFD.deposit_amount || newFD.deposit_amount <= 0) {
        throw new Error('Deposit Amount must be greater than zero.');
      }
      if (!newFD.deposit_date || !newFD.deposit_time) {
        throw new Error('Deposit date and time are required.');
      }
      if (!newFD.tenure_months || newFD.tenure_months <= 0) {
        throw new Error('Tenure (months) is required and must be greater than zero.');
      }
      if (newFD.interest_rate === undefined || newFD.interest_rate < 0) {
        throw new Error('Interest rate is required and cannot be negative.');
      }
      if (!newFD.interest_type) {
        throw new Error('Interest type is required.');
      }

      await db.createFD({
        customer_id: newFD.customer_id,
        customer_name: customer.name,
        customer_mobile: customer.mobile_number,
        customer_aadhaar: customer.aadhaar_number,
        customer_pan: customer.pan_number,
        deposit_amount: newFD.deposit_amount,
        deposit_date: newFD.deposit_date,
        deposit_time: newFD.deposit_time,
        tenure_months: newFD.tenure_months,
        interest_rate: newFD.interest_rate,
        interest_type: newFD.interest_type,
        maturity_date: newFD.maturity_date,
        maturity_amount: newFD.maturity_amount,
        status: 'Active',
        renew_count: 0,
        created_by: 'Admin'
      });

      showToast('success', 'Fixed Deposit created successfully.');
      setShowPlacementForm(false);
      onFormClosed();
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Placement verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Renew FD Action
  const handleOpenRenew = (fd: FDMaster) => {
    setSelectedFD(fd);
    setRenewFD({
      oldFDId: fd.id,
      oldFDNumber: fd.fd_number,
      deposit_amount: fd.maturity_amount, // Default rollover principal is the maturity amount
      deposit_date: new Date().toISOString().split('T')[0],
      deposit_time: new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5),
      tenure_months: fd.tenure_months,
      interest_rate: fd.interest_rate,
      interest_type: fd.interest_type,
      maturity_date: '',
      maturity_amount: 0
    });
    setShowRenewForm(true);
  };

  const handleRenewPlacement = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmDialog({
      show: true,
      title: 'Rollover & Renew FD Certificate',
      message: `Are you sure you want to rollover and Renew Fixed Deposit Certificate ${renewFD.oldFDNumber}?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setLoading(true);
        try {
          await db.renewFD(renewFD.oldFDId, {
            deposit_amount: renewFD.deposit_amount,
            deposit_date: renewFD.deposit_date,
            deposit_time: renewFD.deposit_time,
            tenure_months: renewFD.tenure_months,
            interest_rate: renewFD.interest_rate,
            interest_type: renewFD.interest_type,
            maturity_date: renewFD.maturity_date,
            maturity_amount: renewFD.maturity_amount
          }, 'Admin');

          showToast('success', `Rollover Successful. New sequential FD generated.`);
          setShowRenewForm(false);
          await loadData();
        } catch (err: any) {
          showToast('error', err.message || 'Renewal settlement failed.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Close FD Action
  const handleOpenClose = (fd: FDMaster, isPremature: boolean) => {
    setSelectedFD(fd);
    setCloseFD({
      fdId: fd.id,
      fdNumber: fd.fd_number,
      close_date: new Date().toISOString().split('T')[0],
      close_time: new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5),
      isPremature,
      reason: isPremature ? '' : 'Normal maturity payout.',
      depositAmount: fd.deposit_amount,
      originalRate: fd.interest_rate,
      actualTenureMonths: 0,
      interestPaid: 0,
      penalty: 0,
      finalAmount: 0,
      paymentMode: 'Bank Transfer',
      remarks: ''
    });
    setShowCloseForm(true);
  };

  const handleCloseSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    const actionLabel = closeFD.isPremature ? 'PREMATURE CLOSE' : 'MATURE CLOSE';
    setConfirmDialog({
      show: true,
      title: `${actionLabel} Settlement`,
      message: `⚠️ WARNING: Are you sure you want to execute ${actionLabel} settlement for certificate ${closeFD.fdNumber}?`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setLoading(true);
        try {
          await db.closeFD(closeFD.fdId, {
            close_date: closeFD.close_date,
            close_time: closeFD.close_time,
            close_reason: closeFD.reason,
            close_interest_paid: closeFD.interestPaid,
            close_penalty: closeFD.penalty,
            close_final_amount: closeFD.finalAmount,
            close_payment_mode: closeFD.paymentMode,
            close_remarks: closeFD.remarks,
            isPremature: closeFD.isPremature
          });

          showToast('success', `Certificate settled and closed. Ledger updated.`);
          setShowCloseForm(false);
          await loadData();
        } catch (err: any) {
          showToast('error', err.message || 'Close settlement failed.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Delete Action
  const handleDeleteFD = (id: string) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Fixed Deposit Ledger Record',
      message: '⚠️ SECURITY DANGER: Deleting a Fixed Deposit ledger record is highly discouraged for accounting. Are you absolutely certain you want to delete this record permanently?',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setLoading(true);
        try {
          await db.deleteFD(id);
          showToast('success', 'FD record deleted successfully.');
          await loadData();
        } catch (err: any) {
          showToast('error', 'Failed to delete record.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Edit Action Handlers
  const handleOpenEdit = (fd: FDMaster) => {
    if (!isAdmin) {
      showToast('error', 'Customer users are not authorized to edit Fixed Deposits.');
      return;
    }
    setEditFD({
      id: fd.id,
      fd_number: fd.fd_number,
      customer_id: fd.customer_id,
      customer_name: fd.customer_name,
      customer_mobile: fd.customer_mobile,
      deposit_amount: fd.deposit_amount,
      tenure_months: fd.tenure_months,
      interest_rate: fd.interest_rate,
      interest_type: fd.interest_type,
      deposit_date: fd.deposit_date,
      deposit_time: fd.deposit_time || '10:00',
      maturity_date: fd.maturity_date,
      maturity_amount: fd.maturity_amount,
      originalFD: fd
    });
    setEditError(null);
    setShowEditForm(true);
  };

  const handleUpdateFD = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFD.originalFD) return;
    setShowEditConfirm(true);
  };

  const confirmUpdateFD = async () => {
    if (!editFD.originalFD) return;

    setLoading(true);
    setEditError(null);
    setShowEditConfirm(false);
    try {
      const oldFD = editFD.originalFD;
      const updatedFD: FDMaster = {
        ...oldFD,
        deposit_amount: editFD.deposit_amount,
        tenure_months: editFD.tenure_months,
        interest_rate: editFD.interest_rate,
        interest_type: editFD.interest_type,
        deposit_date: editFD.deposit_date,
        deposit_time: editFD.deposit_time,
        maturity_date: editFD.maturity_date,
        maturity_amount: editFD.maturity_amount,
      };

      await db.updateFD(updatedFD);

      // 9. Audit log entry
      const editDateTime = new Date().toLocaleString();
      const logMessage = `FD Number: ${oldFD.fd_number}
Edited By: Admin
Edit Date & Time: ${editDateTime}
Old Deposit Amount: ₹${oldFD.deposit_amount.toLocaleString()}
New Deposit Amount: ₹${editFD.deposit_amount.toLocaleString()}
Old Interest Rate: ${oldFD.interest_rate.toFixed(2)}%
New Interest Rate: ${editFD.interest_rate.toFixed(2)}%
Old Tenure: ${oldFD.tenure_months} months
New Tenure: ${editFD.tenure_months} months
Old Maturity Date: ${oldFD.maturity_date}
New Maturity Date: ${editFD.maturity_date}
Old Maturity Amount: ₹${oldFD.maturity_amount.toLocaleString()}
New Maturity Amount: ₹${editFD.maturity_amount.toLocaleString()}`;

      await db.logActivity('Admin', 'Edit FD', logMessage);

      showToast('success', 'FD updated successfully.');
      setShowEditForm(false);
      await loadData();
    } catch (err: any) {
      setEditError(err.message || 'An error occurred while updating the Fixed Deposit.');
    } finally {
      setLoading(false);
    }
  };

  // Print Preview action
  const handleOpenPrintPreview = (fd: FDMaster) => {
    setSelectedFD(fd);
    setShowPrintModal(true);
  };

  // View action
  const handleOpenView = (fd: FDMaster) => {
    setViewingFD(fd);
    setShowViewModal(true);
  };

  // Filter logic
  const filteredFDs = fds.filter(f => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      f.fd_number.toLowerCase().includes(term) ||
      f.customer_name.toLowerCase().includes(term) ||
      f.customer_mobile.includes(term) ||
      (f.customer_aadhaar && f.customer_aadhaar.includes(term)) ||
      (f.customer_pan && f.customer_pan.toLowerCase().includes(term))
    );

    const todayStr = new Date().toISOString().split('T')[0];
    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Matured') return matchesSearch && f.status === 'Active' && f.maturity_date <= todayStr;
    return matchesSearch && f.status === statusFilter;
  });

  // Pagination calculation
  const totalItems = filteredFDs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedFDs = filteredFDs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toast && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[99999] flex justify-center items-center p-4" aria-modal="true" role="dialog">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-100 p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200"
            tabIndex={-1}
            ref={(el) => el?.focus()}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
              toast.type === 'success' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {toast.type === 'success' ? (
                <span className="text-3xl font-extrabold">✓</span>
              ) : (
                <span className="text-3xl font-extrabold">❌</span>
              )}
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className={`text-md font-bold ${toast.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                {toast.type === 'success' ? 'Success' : 'Error'}
              </h3>
              <p className="text-sm font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                {toast.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                autoFocus
                onClick={() => setToast(null)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer text-white ${
                  toast.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                }`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL: FD EDIT --- */}
      {showEditConfirm && (
        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-md z-[9999] flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100">
              <HelpCircle className="h-8 w-8 animate-bounce" />
            </div>
            
            <div className="space-y-1.5 text-center">
              <h3 className="text-lg font-bold text-slate-900">Confirm Ledger Update</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to update this Fixed Deposit certificate? This will rewrite key ledger details and recalculate interest values in the audit logs.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2 text-left font-mono border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">FD Number:</span>
                <span className="font-bold text-slate-800">{editFD.fd_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Principal:</span>
                <span className="font-bold text-slate-800">₹{editFD.deposit_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Tenure:</span>
                <span className="font-bold text-slate-800">{editFD.tenure_months} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Maturity:</span>
                <span className="font-bold text-blue-600">₹{editFD.maturity_amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditConfirm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpdateFD}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-200 cursor-pointer transition-colors"
              >
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Custom Confirmation Overlay Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-md z-[9999] flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
              confirmDialog.isDanger 
                ? 'bg-red-50 text-red-600 border-red-100' 
                : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              <HelpCircle className="h-8 w-8 animate-bounce" />
            </div>
            
            <div className="space-y-1.5 text-center">
              <h3 className="text-lg font-bold text-slate-900">{confirmDialog.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`text-white py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer ${
                  confirmDialog.isDanger 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                {confirmDialog.confirmText || 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: FD EDIT --- */}
      {showEditForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all duration-300">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center rounded-t-2xl border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2.5">
                  <Edit className="text-blue-500 h-5 w-5" />
                  Edit Fixed Deposit Certificate Details
                </h3>
                <p className="text-xxs text-slate-400 mt-1">Updating ledger parameters will recalculate maturity fields.</p>
              </div>
              <button type="button" onClick={() => setShowEditForm(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error display if edit fails */}
            {editError && (
              <div className="p-4 m-6 bg-red-50 border border-red-200 rounded-xl text-red-900 flex flex-col gap-1.5 text-xs">
                <strong className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Update Failed
                </strong>
                <p>{editError}</p>
              </div>
            )}

            <form onSubmit={handleUpdateFD} className="p-6 space-y-6 text-left text-xs">
              
              {/* Customer & Ledger Card */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xxs font-bold text-slate-400 uppercase mb-2 tracking-wider">Enrolled Customer (Read-Only)</label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      disabled
                      value={`${editFD.customer_name} (${editFD.customer_mobile})`}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold text-slate-400 uppercase mb-2 tracking-wider">FD Number (Read-Only)</label>
                    <input
                      type="text"
                      disabled
                      value={editFD.fd_number}
                      className="block w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-400 uppercase mb-2 tracking-wider">Maturity Date (Calculated)</label>
                    <input
                      type="text"
                      disabled
                      value={editFD.maturity_date}
                      className="block w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-500 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Parameters Card */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm space-y-5">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  FD Financial & Scheme Settings
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Deposit Amount (Principal ₹)</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        ₹
                      </div>
                      <input
                        type="number"
                        required
                        min={100}
                        value={editFD.deposit_amount}
                        onChange={(e) => setEditFD({ ...editFD, deposit_amount: parseFloat(e.target.value) || 0 })}
                        className="block w-full pl-8 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono font-bold text-slate-900 transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Tenure</label>
                      <select
                        value={editFD.tenure_months}
                        onChange={(e) => setEditFD({ ...editFD, tenure_months: parseInt(e.target.value, 10) || 1 })}
                        className="block w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none cursor-pointer"
                      >
                        {tenures.map(t => (
                          <option key={t.id} value={t.months}>{t.tenure_label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Interest Payout Scheme</label>
                      <select
                        value={editFD.interest_type}
                        onChange={(e) => setEditFD({ ...editFD, interest_type: e.target.value as any })}
                        className="block w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none cursor-pointer"
                      >
                        <option value="Cumulative">Cumulative (Compounded)</option>
                        <option value="Monthly">Monthly Payout</option>
                        <option value="Quarterly">Quarterly Payout</option>
                        <option value="Yearly">Yearly Payout</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Deposit Date</label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <input
                          type="date"
                          required
                          value={editFD.deposit_date}
                          onChange={(e) => setEditFD({ ...editFD, deposit_date: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Placement Time</label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Clock className="h-4 w-4" />
                        </div>
                        <input
                          type="time"
                          required
                          value={editFD.deposit_time}
                          onChange={(e) => setEditFD({ ...editFD, deposit_time: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Interest Rate (%)</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        %
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editFD.interest_rate}
                        onChange={(e) => setEditFD({ ...editFD, interest_rate: parseFloat(e.target.value) || 0 })}
                        className="block w-full pl-8 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-bold text-emerald-800 transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Summary computation */}
              <div className="bg-slate-900 text-white rounded-xl p-5 flex justify-between items-center shadow-xl">
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block font-semibold">Total Payable at Maturity</span>
                  <h4 className="text-2xl font-mono font-bold text-blue-400 mt-1">
                    ₹{editFD.maturity_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-xxs block">Accrued Interest yield</span>
                  <strong className="text-emerald-400 font-mono text-sm block mt-0.5">
                    +₹{(Math.max(0, editFD.maturity_amount - editFD.deposit_amount)).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-3.5 pt-6 border-t border-slate-150">
                <button type="button" onClick={() => setShowEditForm(false)} className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: FD PLACEMENT --- */}
      {showPlacementForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all duration-300">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center rounded-t-2xl border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2.5">
                  <PlusCircle className="text-blue-500 h-5 w-5" />
                  Issue New Fixed Deposit Certificate
                </h3>
                <p className="text-xxs text-slate-400 mt-1">Sequential certificate sequences are auto-allocated.</p>
              </div>
              <button onClick={() => { setShowPlacementForm(false); onFormClosed(); }} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCreatePlacement} className="p-6 space-y-6 text-left text-xs">
              
              {/* Customer Selector card */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Select Enrolled Customer</label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <select
                      value={newFD.customer_id}
                      onChange={(e) => setNewFD({ ...newFD, customer_id: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none cursor-pointer"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.mobile_number})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Deposit Date</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={newFD.deposit_date}
                        onChange={(e) => setNewFD({ ...newFD, deposit_date: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Placement Time</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      <input
                        type="time"
                        required
                        value={newFD.deposit_time}
                        onChange={(e) => setNewFD({ ...newFD, deposit_time: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Settings card */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm space-y-5">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  FD Financial & Scheme Settings
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Deposit Amount (Principal ₹)</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        ₹
                      </div>
                      <input
                        type="number"
                        required
                        min={100}
                        value={newFD.deposit_amount}
                        onChange={(e) => setNewFD({ ...newFD, deposit_amount: parseFloat(e.target.value) || 0 })}
                        className="block w-full pl-8 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono font-bold text-slate-900 transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Tenure</label>
                      <select
                        value={newFD.tenure_months}
                        onChange={(e) => setNewFD({ ...newFD, tenure_months: parseInt(e.target.value, 10) || 1 })}
                        className="block w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none cursor-pointer"
                      >
                        {tenures.map(t => (
                          <option key={t.id} value={t.months}>{t.tenure_label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Payout Scheme</label>
                      <select
                        value={newFD.interest_type}
                        onChange={(e) => setNewFD({ ...newFD, interest_type: e.target.value as any })}
                        className="block w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none cursor-pointer"
                      >
                        <option value="Cumulative">Cumulative (Compounded)</option>
                        <option value="Monthly">Monthly Payout</option>
                        <option value="Quarterly">Quarterly Payout</option>
                        <option value="Yearly">Yearly Payout</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-blue-200 rounded-xl bg-blue-50/30 p-5 col-span-2 grid grid-cols-2 gap-5 items-center">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xxs font-bold text-blue-900 uppercase tracking-wider">Applicable Interest Rate (%)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id="manualRateCheck"
                            checked={newFD.isManualRate}
                            onChange={(e) => setNewFD({ ...newFD, isManualRate: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-0 focus:outline-none cursor-pointer h-3.5 w-3.5 border-slate-300"
                          />
                          <label htmlFor="manualRateCheck" className="text-[10px] text-slate-600 cursor-pointer font-bold select-none">Override Rate</label>
                        </div>
                      </div>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                          %
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!newFD.isManualRate}
                          value={newFD.interest_rate}
                          onChange={(e) => setNewFD({ ...newFD, interest_rate: parseFloat(e.target.value) || 0 })}
                          className="block w-full pl-8 pr-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-bold text-emerald-800 disabled:bg-slate-100/50 disabled:border-slate-200 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-xxs block tracking-wider uppercase font-bold">Calculated Maturity Date</span>
                      <strong className="text-slate-900 text-md block font-mono mt-1 font-bold">{newFD.maturity_date}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Summary computation */}
              <div className="bg-slate-900 text-white rounded-xl p-5 flex justify-between items-center shadow-xl">
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block font-semibold">Total Payable at Maturity</span>
                  <h4 className="text-2xl font-mono font-bold text-blue-400 mt-1">
                    ₹{newFD.maturity_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-xxs block">Accrued Interest yield</span>
                  <strong className="text-emerald-400 font-mono text-sm block mt-0.5">
                    +₹{(Math.max(0, newFD.maturity_amount - newFD.deposit_amount)).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-3.5 pt-6 border-t border-slate-150">
                <button type="button" onClick={() => { setShowPlacementForm(false); onFormClosed(); }} className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                  Place Deposit
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: FD RENEWAL --- */}
      {showRenewForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2">
                  <RefreshCw className="text-blue-500 h-5 w-5 animate-spin-slow" />
                  Fixed Deposit Rollover (Renewal)
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">Rolls over the deposit balance into a fresh sequential ledger.</p>
              </div>
              <button onClick={() => setShowRenewForm(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleRenewPlacement} className="p-6 space-y-5 text-left text-xs">
              
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-xxs block">Original Certificate</span>
                  <strong className="text-blue-950 font-mono text-sm">{renewFD.oldFDNumber}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xxs block">Maturity Roll Amount</span>
                  <strong className="text-blue-950 font-mono text-sm">₹{renewFD.deposit_amount.toLocaleString()}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5">Renewal Placement Date</label>
                  <input
                    type="date"
                    required
                    value={renewFD.deposit_date}
                    onChange={(e) => setRenewFD({ ...renewFD, deposit_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5">Tenure</label>
                    <select
                      value={renewFD.tenure_months}
                      onChange={(e) => setRenewFD({ ...renewFD, tenure_months: parseInt(e.target.value, 10) || 1 })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      {tenures.map(t => (
                        <option key={t.id} value={t.months}>{t.tenure_label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5">Scheme</label>
                    <select
                      value={renewFD.interest_type}
                      onChange={(e) => setRenewFD({ ...renewFD, interest_type: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="Cumulative">Cumulative</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-1">Interest Rate (%)</label>
                  {isAdmin ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={renewFD.interest_rate}
                      onChange={(e) => setRenewFD({ ...renewFD, interest_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  ) : (
                    <strong className="text-emerald-700 text-sm font-bold block">{renewFD.interest_rate.toFixed(2)}%</strong>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xxs block mb-1">New Maturity Date</span>
                  <strong className="text-slate-900 text-sm font-mono block font-bold">{renewFD.maturity_date}</strong>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 flex justify-between items-center shadow-lg">
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block font-bold">New Maturity Amount</span>
                  <h4 className="text-lg font-mono font-bold text-blue-400 mt-0.5">₹{renewFD.maturity_amount.toLocaleString()}</h4>
                </div>
                <span className="text-xxs text-slate-400">Rollover count automatically increments.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowRenewForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                  Confirm Rollover
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: FD CLOSING (MATURE OR PREMATURE) --- */}
      {showCloseForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all duration-300">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center border-b border-slate-800 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2.5">
                  <AlertTriangle className="text-blue-500 h-5 w-5" />
                  {closeFD.isPremature ? 'Premature Liquidation Settlement' : 'Maturity Settlement'}
                </h3>
                <p className="text-xxs text-slate-400 mt-1">Process payouts and settle Fixed Deposit liabilities.</p>
              </div>
              <button onClick={() => setShowCloseForm(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCloseSettlement} className="p-6 space-y-6 text-left text-xs">
              
              <div className="bg-white rounded-xl border border-slate-200/60 p-4 grid grid-cols-2 gap-4 shadow-sm">
                <div>
                  <span className="text-slate-400 text-xxs block uppercase tracking-wider font-bold">Account Number</span>
                  <strong className="text-slate-900 font-mono text-sm font-extrabold">{closeFD.fdNumber}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-xxs block uppercase tracking-wider font-bold">Placed Principal</span>
                  <strong className="text-slate-900 font-mono text-sm font-extrabold">₹{closeFD.depositAmount.toLocaleString()}</strong>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Settlement Date</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={closeFD.close_date}
                        onChange={(e) => setCloseFD({ ...closeFD, close_date: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Payout Mode</label>
                    <select
                      value={closeFD.paymentMode}
                      onChange={(e) => setCloseFD({ ...closeFD, paymentMode: e.target.value as any })}
                      className="block w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none cursor-pointer"
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI Instant Payout</option>
                      <option value="Cheque">Bank Demand Draft/Cheque</option>
                      <option value="Cash">Cash Vault Disbursal</option>
                    </select>
                  </div>
                </div>

                {closeFD.isPremature && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-950 flex flex-col gap-1 text-xxs shadow-sm">
                    <strong className="text-red-900 block font-extrabold uppercase tracking-widest mb-1">⚠️ 2.00% Premature Penalty Enforced</strong>
                    <p>• The depositor is terminating the contract prior to maturity date.</p>
                    <p>• Standard 2.00% deduction is applied to the earned interest rate yield.</p>
                    <p>• Actual duration completed: <strong className="font-mono text-red-950 text-xs">{closeFD.actualTenureMonths} Months</strong>.</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Principal Payout</span>
                    <strong className="text-slate-900 font-mono text-sm block mt-1 font-extrabold">₹{closeFD.depositAmount.toLocaleString()}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-emerald-700 text-[10px] block uppercase font-bold tracking-wider">Interest Payout</span>
                    <strong className="text-emerald-700 font-mono text-sm block mt-1 font-extrabold">₹{closeFD.interestPaid.toLocaleString()}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-red-700 text-[10px] block uppercase font-bold tracking-wider">Penalty</span>
                    <strong className="text-red-700 font-mono text-sm block mt-1 font-extrabold">{closeFD.isPremature ? '2.0%' : '0.00'}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-600 uppercase mb-2 tracking-wider">Settlement Reason / Remarks</label>
                  <input
                    type="text"
                    required
                    placeholder="Reason for early liquidation or final payout remarks..."
                    value={closeFD.reason}
                    onChange={(e) => setCloseFD({ ...closeFD, reason: e.target.value })}
                    className="block w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-emerald-600 text-white rounded-xl p-5 flex justify-between items-center shadow-xl">
                <div>
                  <span className="text-emerald-100 text-xxs uppercase tracking-wider block font-bold">Total Disbursal amount</span>
                  <h4 className="text-2xl font-mono font-bold text-white mt-1">₹{closeFD.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                </div>
                <span className="text-xxs text-emerald-200 font-mono bg-emerald-700 border border-emerald-500 px-3 py-1 rounded-md uppercase font-bold tracking-widest">{closeFD.isPremature ? 'Premature Closed' : 'Normal Closed'}</span>
              </div>

              <div className="flex justify-end gap-3.5 pt-6 border-t border-slate-150">
                <button type="button" onClick={() => setShowCloseForm(false)} className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-200 cursor-pointer">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <CheckCircle className="h-4 w-4 text-white" />}
                  Confirm Settlement
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: FD RECEIPT PRINT DISPLAY --- */}
      {showPrintModal && selectedFD && (
        <PrintReceipt
          fd={selectedFD}
          customer={customers.find(c => c.id === selectedFD.customer_id)!}
          settings={settings!}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* --- FORM MODAL: FD DETAILS VIEW --- */}
      {showViewModal && viewingFD && (
        <div id="fd-view-modal" className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2">
                  <Eye className="text-blue-500 h-5 w-5" />
                  Fixed Deposit Details
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">Comprehensive overview of the fixed deposit ledger record.</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-6 text-left text-xs">
              {/* Row 1: FD Number & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase font-bold tracking-wider">FD Number</span>
                    <strong className="text-blue-700 font-mono text-sm block mt-1">{viewingFD.fd_number}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-xxs block uppercase font-bold tracking-wider">Status</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-bold uppercase mt-1.5 ${
                      viewingFD.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      viewingFD.status === 'Renewed' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                      viewingFD.status === 'Closed' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                      'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {viewingFD.status}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase font-bold tracking-wider">Created By</span>
                    <strong className="text-slate-900 text-sm block mt-1">{viewingFD.created_by || 'Admin'}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-xxs block uppercase font-bold tracking-wider">Creation Date</span>
                    <strong className="text-slate-900 text-sm block mt-1 font-mono">{viewingFD.created_at ? new Date(viewingFD.created_at).toLocaleDateString() : viewingFD.deposit_date}</strong>
                  </div>
                </div>
              </div>

              {/* Section 1: Customer Info */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xxs font-extrabold text-blue-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Primary Holder Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Holder Name</span>
                    <strong className="text-slate-800 text-xs block mt-0.5">{viewingFD.customer_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Mobile</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.customer_mobile}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Aadhaar Number</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.customer_aadhaar || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">PAN Number</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono uppercase">{viewingFD.customer_pan || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Deposit Financial parameters */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xxs font-extrabold text-emerald-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Financial Terms & Yields</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Principal Amount</span>
                    <strong className="text-slate-900 text-xs block mt-0.5 font-mono">₹{viewingFD.deposit_amount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Interest Rate (P.A.)</span>
                    <strong className="text-emerald-700 text-xs block mt-0.5 font-mono">{viewingFD.interest_rate.toFixed(2)}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Tenure</span>
                    <strong className="text-slate-800 text-xs block mt-0.5">{viewingFD.tenure_months} Months</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Interest Scheme</span>
                    <strong className="text-slate-800 text-xs block mt-0.5">{viewingFD.interest_type}</strong>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 col-span-2 md:col-span-4 grid grid-cols-3 gap-4 items-center">
                    <div>
                      <span className="text-slate-400 text-xxs block uppercase">Deposit Date</span>
                      <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.deposit_date} {viewingFD.deposit_time}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xxs block uppercase">Maturity Date</span>
                      <strong className="text-blue-900 text-xs block mt-0.5 font-mono">{viewingFD.maturity_date}</strong>
                    </div>
                    <div className="bg-slate-900 text-white p-2.5 rounded-lg text-center">
                      <span className="text-slate-400 text-[10px] block uppercase font-medium">Maturity Amount</span>
                      <strong className="text-blue-400 text-xs block mt-0.5 font-mono font-bold">₹{viewingFD.maturity_amount.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Nominee Details */}
              {customers.find(c => c.id === viewingFD.customer_id) && (
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <h4 className="text-xxs font-extrabold text-amber-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Nominee Details</h4>
                  {(() => {
                    const cust = customers.find(c => c.id === viewingFD.customer_id)!;
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-slate-400 text-xxs block uppercase">Nominee Name</span>
                          <strong className="text-slate-800 text-xs block mt-0.5">{cust.nominee_name || 'Not Declared'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xxs block uppercase">Relationship</span>
                          <strong className="text-slate-800 text-xs block mt-0.5">{cust.nominee_relation || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xxs block uppercase">Nominee Contact</span>
                          <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{cust.nominee_mobile_number || 'N/A'}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Section 4: Renewal / Rollover Details */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xxs font-extrabold text-blue-900 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">Renewal / Rollover Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Parent FD Number</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.parent_fd_number || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Old FD Number</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.old_fd_number || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Renewal Count</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.renew_count}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xxs block uppercase">Renewal Date</span>
                    <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.renew_date || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Section 5: Payout Settlement Details */}
              {(viewingFD.status === 'Closed' || viewingFD.status === 'Premature Closed') && (
                <div className="border border-red-100 rounded-xl p-4 bg-red-50/20">
                  <h4 className="text-xxs font-extrabold text-red-900 uppercase tracking-widest mb-3 border-b border-red-100 pb-1.5">Maturity Settlement Payout</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-400 text-xxs block uppercase">Close Date</span>
                      <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.close_date} {viewingFD.close_time}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xxs block uppercase">Interest Paid</span>
                      <strong className="text-slate-800 text-xs block mt-0.5 font-mono">₹{viewingFD.close_interest_paid?.toLocaleString() || '0.00'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xxs block uppercase">Penalty</span>
                      <strong className="text-slate-800 text-xs block mt-0.5 font-mono">₹{viewingFD.close_penalty || '0.00'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xxs block uppercase">Payment Mode</span>
                      <strong className="text-slate-800 text-xs block mt-0.5 font-mono">{viewingFD.close_payment_mode || 'N/A'}</strong>
                    </div>
                    <div className="col-span-2 md:col-span-4 mt-2">
                      <span className="text-slate-400 text-xxs block uppercase">Close Reason / Remarks</span>
                      <strong className="text-slate-800 text-xs block mt-0.5 font-sans font-normal leading-normal">{viewingFD.close_reason || 'N/A'}</strong>
                    </div>
                    <div className="col-span-2 md:col-span-4 bg-emerald-600 text-white rounded-lg p-3 flex justify-between items-center mt-2">
                      <span className="text-white text-xxs font-bold block uppercase">Final amount disbursed</span>
                      <strong className="text-white text-md font-mono font-bold">₹{viewingFD.close_final_amount?.toLocaleString() || '0.00'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-slate-100">
              <button type="button" onClick={() => setShowViewModal(false)} className="bg-slate-950 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-bold cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MASTER FD LEDGER TABLE GRID --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
        
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-md font-bold text-slate-950 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Consolidated deposits Registry
              </h3>
              <p className="text-xs text-slate-500">Search and audit across all active and liquidated contracts.</p>
            </div>

            <button
              onClick={handleOpenPlacement}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <PlusCircle className="h-4 w-4 text-white" />
              New Placement
            </button>
          </div>

          {/* Filters and search bar row */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by FD No, Holder, Phone, Aadhaar, PAN..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            {/* Status Pills Tab Filter */}
            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200/60">
              {(['All', 'Active', 'Renewed', 'Closed', 'Premature Closed', 'Matured'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setStatusFilter(tab); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded text-xxs font-semibold uppercase transition-all cursor-pointer ${
                    statusFilter === tab 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-100 text-left font-sans">
              <thead>
                <tr className="text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="px-3 py-2.5">FD Number</th>
                  <th className="px-3 py-2.5">Holder name</th>
                  <th className="px-3 py-2.5">Mobile</th>
                  <th className="px-3 py-2.5 text-right">Principal</th>
                  <th className="px-3 py-2.5 text-center">Rate</th>
                  <th className="px-3 py-2.5 text-center">Tenure</th>
                  <th className="px-3 py-2.5">Maturity Date</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedFDs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">No matching Fixed Deposits recorded.</td>
                  </tr>
                ) : (
                  paginatedFDs.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-mono font-bold text-blue-700">{f.fd_number}</td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-slate-900 block">{f.customer_name}</span>
                        {f.old_fd_number && (
                          <span className="text-[9px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded font-mono inline-block">
                            Rolled over from {f.old_fd_number}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px]">{f.customer_mobile}</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">₹{f.deposit_amount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center text-emerald-700 font-bold font-mono">{f.interest_rate.toFixed(2)}%</td>
                      <td className="px-3 py-3 text-center text-slate-500">{f.tenure_months} Mo</td>
                      <td className="px-3 py-3 font-mono text-[11px]">{f.maturity_date}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          f.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          f.status === 'Renewed' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          f.status === 'Closed' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                          'bg-red-50 text-red-800 border border-red-100'
                        }`}>
                          {f.status}
                        </span>
                        {f.status === 'Active' && getTodayStr() >= f.maturity_date && (
                          <div className="text-[8px] text-amber-600 font-extrabold uppercase mt-1 leading-none tracking-tight">
                            ★ Eligible for Renewal
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center items-center gap-1">
                          {/* View Button (Always visible for both admin and customers) */}
                          <button
                            onClick={() => handleOpenView(f)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded"
                            title="View FD Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Print Button (Only visible for admin, not customer) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenPrintPreview(f)}
                              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded"
                              title="Print / PDF Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          )}

                          {/* Admin Only Actions */}
                          {isAdmin && f.status === 'Active' && (
                            <>
                              {getTodayStr() >= f.maturity_date ? (
                                /* After Maturity Date */
                                <>
                                  <button
                                    onClick={() => handleOpenRenew(f)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded animate-pulse"
                                    title="Rollover / Renew FD"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenClose(f, false)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded font-bold text-[10px]"
                                    title="Normal Maturity Settlement"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                /* Before Maturity Date */
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(f)}
                                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                                    title="Edit FD Details"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenClose(f, true)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Premature Liquidation Close"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {/* Delete Record (Admin Only) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteFD(f.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-4 text-xs font-semibold text-slate-600">
            <span>Showing Page {currentPage} of {totalPages}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
