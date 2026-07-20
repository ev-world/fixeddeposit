import React, { useState, useEffect } from 'react';
import { db, isUsingRealSupabase } from '../lib/supabase';
import { SUPABASE_SQL_SCHEMA } from '../lib/db-schema';
import { CompanySettings, InterestMaster, TenureMaster, ActivityLog } from '../types';
import { 
  Building2, Percent, CalendarClock, Settings2, ShieldCheck, Database,
  FileCode2, Copy, Check, RotateCcw, Save, Trash2, Search, RefreshCw, FileText, Download,
  HelpCircle
} from 'lucide-react';

interface SettingsPanelProps {
  onSettingsUpdated: () => void;
}

export default function SettingsPanel({ onSettingsUpdated }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'interest' | 'tenure' | 'database' | 'logs'>('profile');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom Confirmation Dialog State
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

  // Profile Form States
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  // Interest Master States
  const [interests, setInterests] = useState<InterestMaster[]>([]);
  const [newInterest, setNewInterest] = useState({
    tenure_months_min: 12,
    tenure_months_max: 24,
    interest_rate: 7.25,
    category: 'Regular'
  });

  // Tenure Master States
  const [tenures, setTenures] = useState<TenureMaster[]>([]);
  const [newTenure, setNewTenure] = useState({
    tenure_label: '1.5 Years',
    months: 18
  });

  // Logs States
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logSearch, setLogSearch] = useState('');

  // SQL Copy State
  const [copiedSql, setCopiedSql] = useState(false);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const sets = await db.getSettings();
      setSettings(sets);
      
      const rates = await db.getInterestRates();
      setInterests(rates);

      const tens = await db.getTenures();
      setTenures(tens);

      const activity = await db.getLogs();
      setLogs(activity);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load settings data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    try {
      await db.updateSettings(settings);
      showToast('success', 'Company profile and system configurations saved successfully.');
      onSettingsUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update company settings.');
    } finally {
      setLoading(false);
    }
  };

  // Add Interest Rate Slab
  const handleAddInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.addInterestRate(newInterest);
      showToast('success', `Interest Slab of ${newInterest.interest_rate}% added successfully.`);
      const rates = await db.getInterestRates();
      setInterests(rates);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create interest slab.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Interest Rate Slab
  const handleDeleteInterest = (id: string) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Interest Slab Rate',
      message: 'Are you sure you want to delete this interest slab rate? This will permanently remove the option from interest selection.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setLoading(true);
        try {
          await db.deleteInterestRate(id);
          showToast('success', 'Interest slab rate deleted successfully.');
          const rates = await db.getInterestRates();
          setInterests(rates);
        } catch (err: any) {
          showToast('error', err.message || 'Failed to delete interest slab.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Add Tenure Months
  const handleAddTenure = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await db.addTenure(newTenure);
      showToast('success', `Tenure option of ${newTenure.months} months added successfully.`);
      const tens = await db.getTenures();
      setTenures(tens);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create tenure.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Tenure
  const handleDeleteTenure = (id: string) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Tenure Option',
      message: 'Are you sure you want to delete this tenure option? This will permanently remove this period from the tenure configuration options.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setLoading(true);
        try {
          await db.deleteTenure(id);
          showToast('success', 'Tenure configuration deleted successfully.');
          const tens = await db.getTenures();
          setTenures(tens);
        } catch (err: any) {
          showToast('error', err.message || 'Failed to delete tenure.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Copy SQL Schema
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    showToast('success', 'Supabase SQL script copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // DB Backup
  const handleExportBackup = () => {
    try {
      const backupData = {
        customers: localStorage.getItem('supermoney_customers'),
        fds: localStorage.getItem('supermoney_fds'),
        transactions: localStorage.getItem('supermoney_transactions'),
        settings: localStorage.getItem('supermoney_settings'),
        interests: localStorage.getItem('supermoney_interests'),
        tenures: localStorage.getItem('supermoney_tenures'),
        scanHistory: localStorage.getItem('supermoney_scan_history'),
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `super_money_deposit_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Database Backup File (.json) exported successfully.');
    } catch (err) {
      showToast('error', 'Failed to generate database backup file.');
    }
  };

  // Reset Storage to Defaults
  const handleResetData = () => {
    setConfirmDialog({
      show: true,
      title: 'Irreversible System Reset',
      message: '⚠️ WARNING: This will permanently wipe out all local customer records, Fixed Deposit accounts, and audit log history! This action is completely irreversible. Are you absolutely sure?',
      isDanger: true,
      confirmText: 'Wipe All Data',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        localStorage.clear();
        window.location.reload();
      }
    });
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const term = logSearch.toLowerCase();
    return (
      log.username.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white transition-all font-medium ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-wrap md:divide-x divide-slate-100">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'profile' ? 'bg-blue-600/10 text-blue-950 font-semibold border-b-2 md:border-b-0 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="h-4 w-4 text-blue-600" />
          Company Profile
        </button>

        <button
          onClick={() => setActiveTab('interest')}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'interest' ? 'bg-blue-600/10 text-blue-950 font-semibold border-b-2 md:border-b-0 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Percent className="h-4 w-4 text-blue-600" />
          Interest Master
        </button>

        <button
          onClick={() => setActiveTab('tenure')}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'tenure' ? 'bg-blue-600/10 text-blue-950 font-semibold border-b-2 md:border-b-0 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarClock className="h-4 w-4 text-blue-600" />
          Tenure Master
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'database' ? 'bg-blue-600/10 text-blue-950 font-semibold border-b-2 md:border-b-0 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Database className="h-4 w-4 text-blue-600" />
          Database Integration
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'logs' ? 'bg-blue-600/10 text-blue-950 font-semibold border-b-2 md:border-b-0 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          Security Audit
        </button>
      </div>

      {/* Tab Panels */}
      {loading && !settings ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-100 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="text-slate-500">Loading configurations...</p>
        </div>
      ) : (
        <>
          {/* 1. Company Profile Panel */}
          {activeTab === 'profile' && settings && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Company & Receipt Master Profile</h3>
                  <p className="text-xs text-slate-500">These details are reflected on A4 Half-Page Fixed Deposit Receipts and verification portals.</p>
                </div>
                <Settings2 className="h-6 w-6 text-slate-400" />
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Company Registered Name</label>
                    <input
                      type="text"
                      required
                      value={settings.company_name}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">FD Series Prefix</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={settings.fd_prefix}
                        onChange={(e) => setSettings({ ...settings, fd_prefix: e.target.value.toUpperCase() })}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                        placeholder="FD"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Next FD Sequence</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={settings.next_fd_seq}
                        onChange={(e) => setSettings({ ...settings, next_fd_seq: parseInt(e.target.value, 10) || 1 })}
                        className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Helpline Support Email</label>
                    <input
                      type="email"
                      required
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Head Office Address</label>
                    <textarea
                      required
                      rows={2}
                      value={settings.company_address}
                      onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Authorized Signatory Stamp / Logo URL (Optional)</label>
                    <input
                      type="text"
                      value={settings.signature_url || ''}
                      onChange={(e) => setSettings({ ...settings, signature_url: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="https://example.com/signature-stamp.png"
                    />
                    <p className="text-xxs text-slate-400 mt-1">Leave empty to auto-simulate a highly professional signature on the printed receipt.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Terms & Conditions (Printed on Half A4 PDF)</label>
                    <textarea
                      required
                      rows={4}
                      value={settings.terms_conditions}
                      onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="h-5 w-5 text-white" />
                    Save Bank Configuration
                  </button>
                </div>
              </form>
            </div>
          )}
          {/* 2. Interest Slabs Master Panel */}
          {activeTab === 'interest' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to add */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-1 h-fit">
                <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Percent className="h-5 w-5 text-blue-600" />
                  Configure Interest Slab
                </h3>
                <form onSubmit={handleAddInterest} className="space-y-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Customer Age Category</label>
                    <select
                      value={newInterest.category}
                      onChange={(e) => setNewInterest({ ...newInterest, category: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Regular">Regular Customer (Under 60)</option>
                      <option value="Senior Citizen">Senior Citizen (Age 60+)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Min Tenure (M)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={newInterest.tenure_months_min}
                        onChange={(e) => setNewInterest({ ...newInterest, tenure_months_min: parseInt(e.target.value, 10) || 1 })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Max Tenure (M)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={newInterest.tenure_months_max}
                        onChange={(e) => setNewInterest({ ...newInterest, tenure_months_max: parseInt(e.target.value, 10) || 1 })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Annual Interest Rate (%)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min={0.1}
                      max={25}
                      value={newInterest.interest_rate}
                      onChange={(e) => setNewInterest({ ...newInterest, interest_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    Save Slab Configuration
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
                <h3 className="text-md font-bold text-slate-900 mb-4">Configured Active Interest slabs</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-slate-100">
                    <thead>
                      <tr className="text-slate-500 text-xxs font-bold uppercase tracking-wider text-left bg-slate-50/50">
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Min Tenure</th>
                        <th className="px-4 py-3">Max Tenure</th>
                        <th className="px-4 py-3">Interest Rate</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {interests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400">No interest slabs configured.</td>
                        </tr>
                      ) : (
                        interests.map((rate) => (
                          <tr key={rate.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-xxs font-bold uppercase ${
                                rate.category === 'Senior Citizen' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}>
                                {rate.category}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono">{rate.tenure_months_min} Months</td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono">{rate.tenure_months_max} Months</td>
                            <td className="px-4 py-3.5 font-bold text-emerald-700 font-mono">{rate.interest_rate.toFixed(2)}% P.A.</td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleDeleteInterest(rate.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Slab"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* 3. Tenure Master Panel */}
          {activeTab === 'tenure' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to add */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-1 h-fit">
                <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-blue-600" />
                  Add Tenure Option
                </h3>
                <form onSubmit={handleAddTenure} className="space-y-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Tenure Label (Display Name)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1 Year, 18 Months"
                      value={newTenure.tenure_label}
                      onChange={(e) => setNewTenure({ ...newTenure, tenure_label: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-700 uppercase mb-1">Equivalent Months</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newTenure.months}
                      onChange={(e) => setNewTenure({ ...newTenure, months: parseInt(e.target.value, 10) || 1 })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    Save Tenure Option
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
                <h3 className="text-md font-bold text-slate-900 mb-4">Standard Deposit Tenure Options</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm divide-y divide-slate-100">
                    <thead>
                      <tr className="text-slate-500 text-xxs font-bold uppercase tracking-wider text-left bg-slate-50/50">
                        <th className="px-4 py-3">Display Label</th>
                        <th className="px-4 py-3">Duration (Months)</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {tenures.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-slate-400">No tenures configured.</td>
                        </tr>
                      ) : (
                        tenures.map((ten) => (
                          <tr key={ten.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3.5 text-slate-900">{ten.tenure_label}</td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono">{ten.months} Months</td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleDeleteTenure(ten.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Tenure"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* 4. Database Integration Panel */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              {/* Connection Status Indicator */}
              <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isUsingRealSupabase() ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      Database Mode: {isUsingRealSupabase() ? 'Live Supabase Cloud' : 'Secure Local Database'}
                      <span className={`inline-block h-2.5 w-2.5 rounded-full animate-pulse ${isUsingRealSupabase() ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isUsingRealSupabase() 
                        ? 'App is actively synchronized with your live Supabase cloud database cluster.' 
                        : 'Running in Local secure database. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside your .env to connect to live Cloud Supabase.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportBackup}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Backup Data
                  </button>
                  <button
                    onClick={handleResetData}
                    className="bg-red-650/10 text-red-400 hover:bg-red-650/20 border border-red-500/30 px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset Data
                  </button>
                </div>
              </div>

              {/* Provisioning Instructions and SQL script */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                      <FileCode2 className="h-5 w-5 text-blue-600" />
                      Supabase Tables Setup SQL Script
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      To synchronize this application with your Supabase Cloud, copy and execute the script below in your <strong>Supabase SQL Editor</strong>. This creates all requested tables, foreign keys, defaults, and seeds necessary indexes.
                    </p>
                  </div>
                  <button
                    onClick={handleCopySql}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {copiedSql ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 text-white" />}
                    {copiedSql ? 'Copied!' : 'Copy SQL Schema'}
                  </button>
                </div>

                {/* SQL Code View */}
                <div className="bg-slate-950 rounded-lg p-4 max-h-96 overflow-y-auto border border-slate-900">
                  <pre className="text-xs font-mono text-slate-300 leading-relaxed text-left whitespace-pre">{SUPABASE_SQL_SCHEMA}</pre>
                </div>
              </div>
            </div>
          )}
          {/* 5. Security Audit Logs Panel */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Activity & Security Audit Trail</h3>
                  <p className="text-xs text-slate-500">Every transactional and user registry modification is logged with tamper-proof timestamps.</p>
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search logs by action, message..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-100">
                  <thead>
                    <tr className="text-slate-500 font-bold uppercase tracking-wider text-left bg-slate-50/50">
                      <th className="px-4 py-3">Timestamp (UTC)</th>
                      <th className="px-4 py-3">Operator</th>
                      <th className="px-4 py-3">Category Action</th>
                      <th className="px-4 py-3">Operation Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400 font-sans">No activity logs recorded matching search criteria.</td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800">{log.username}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block bg-blue-50 text-blue-900 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-200/50">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-sans text-xs">
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {/* Custom Confirmation Overlay Dialog */}
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

    </div>
  );
}
