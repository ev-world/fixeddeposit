import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { FDMaster, DBCustomer, CompanySettings } from '../types';
import { 
  PlusCircle, Users, Receipt, Hourglass, CalendarRange, 
  Settings2, QrCode, FileBarChart, PiggyBank, Scale, AlertOctagon, TrendingUp,
  Search, ArrowUp, ArrowDown, Printer, Eye, X
} from 'lucide-react';
import PrintReceipt from './PrintReceipt';

interface AdminDashboardProps {
  onNavigate: (screen: 'customers' | 'fds' | 'reports' | 'qr' | 'settings') => void;
  onQuickNewFD: () => void;
  onQuickNewCustomer: () => void;
}

export default function AdminDashboard({ onNavigate, onQuickNewFD, onQuickNewCustomer }: AdminDashboardProps) {
  const [fds, setFds] = useState<FDMaster[]>([]);
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('fd_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingFD, setViewingFD] = useState<FDMaster | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedFDForPrint, setSelectedFDForPrint] = useState<FDMaster | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    todayFDsCount: 0,
    todayFDsVolume: 0,
    activeFDsCount: 0,
    maturityTodayCount: 0,
    renewDueCount: 0,
    prematureClosedTodayCount: 0,
    totalCustomersCount: 0,
    totalActiveDepositAmount: 0,
    totalInterestLiability: 0
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const allFDs = await db.getFDs();
      const allCustomers = await db.getCustomers();
      const settingsData = await db.getSettings();
      
      setFds(allFDs);
      setCustomers(allCustomers);
      setSettings(settingsData);

      // Calculations
      const todayStr = new Date().toISOString().split('T')[0];
      const todayInMs = new Date(todayStr).getTime();
      const sevenDaysLaterMs = todayInMs + 7 * 24 * 60 * 60 * 1000;

      const fdsPlacedToday = allFDs.filter(f => f.deposit_date === todayStr);
      const fdsPlacedTodayCount = fdsPlacedToday.length;
      const fdsPlacedTodayVolume = fdsPlacedToday.reduce((sum, f) => sum + f.deposit_amount, 0);

      const activeFDs = allFDs.filter(f => f.status === 'Active');
      const activeCount = activeFDs.length;
      const activeVolume = activeFDs.reduce((sum, f) => sum + f.deposit_amount, 0);

      const maturityToday = activeFDs.filter(f => f.maturity_date === todayStr).length;

      // Renew due: Active deposits maturing today or within next 7 days, or past maturity date
      const renewDue = activeFDs.filter(f => {
        const matTime = new Date(f.maturity_date).getTime();
        return matTime <= sevenDaysLaterMs;
      }).length;

      const prematureClosedToday = allFDs.filter(f => f.status === 'Premature Closed' && f.close_date === todayStr).length;

      // Total interest liability = total maturity amount - total deposit amount of active deposits
      const interestLiability = activeFDs.reduce((sum, f) => {
        const diff = Math.max(0, f.maturity_amount - f.deposit_amount);
        return sum + diff;
      }, 0);

      setStats({
        todayFDsCount: fdsPlacedTodayCount,
        todayFDsVolume: fdsPlacedTodayVolume,
        activeFDsCount: activeCount,
        maturityTodayCount: maturityToday,
        renewDueCount: renewDue,
        prematureClosedTodayCount: prematureClosedToday,
        totalCustomersCount: allCustomers.length,
        totalActiveDepositAmount: activeVolume,
        totalInterestLiability: interestLiability
      });
    } catch (err) {
      console.error('Error loading dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Search methods
  const getTodayStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getFDDisplayStatus = (f: FDMaster) => {
    const todayStr = getTodayStr();
    if (f.status === 'Active') {
      if (f.maturity_date <= todayStr) {
        return 'Matured';
      }
      return 'Active';
    }
    return f.status;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim() === '') {
      setHasSearched(false);
    } else {
      setHasSearched(true);
    }
    setCurrentPage(1); // Reset to first page
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() !== '') {
      setHasSearched(true);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleViewFD = (f: FDMaster) => {
    setViewingFD(f);
    setShowViewModal(true);
  };

  const handlePrintFD = (f: FDMaster) => {
    setSelectedFDForPrint(f);
    setShowPrintModal(true);
  };

  const getSearchResults = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    // 1. Find matched customer IDs
    const matchedCustomerIds = new Set<string>();
    customers.forEach(c => {
      const nameMatch = c.name.toLowerCase().includes(query);
      const mobileMatch = c.mobile_number.includes(query);
      const aadhaarMatch = c.aadhaar_number.includes(query);
      const panMatch = c.pan_number.toLowerCase().includes(query);

      if (nameMatch || mobileMatch || aadhaarMatch || panMatch) {
        matchedCustomerIds.add(c.id);
      }
    });

    // 2. Find matched FD numbers, and add their customer_ids
    fds.forEach(f => {
      const fdNoMatch = f.fd_number.toLowerCase().includes(query);
      const nameMatch = f.customer_name.toLowerCase().includes(query);
      const mobileMatch = f.customer_mobile.includes(query);
      const aadhaarMatch = f.customer_aadhaar?.includes(query);
      const panMatch = f.customer_pan?.toLowerCase().includes(query);

      if (fdNoMatch || nameMatch || mobileMatch || aadhaarMatch || panMatch) {
        matchedCustomerIds.add(f.customer_id);
      }
    });

    // 3. Return all FDs belonging to any matched customer
    return fds.filter(f => 
      matchedCustomerIds.has(f.customer_id) || 
      f.fd_number.toLowerCase().includes(query)
    );
  };

  const searchResults = getSearchResults();

  // Active FDs totals (Deposit, Interest, Maturity Value) of the searched customer
  // Do NOT include Closed, Renewed, Matured or Premature Closed FDs in these totals.
  const todayStrStr = getTodayStr();
  const activeSearchResults = searchResults.filter(f => f.status === 'Active' && f.maturity_date > todayStrStr);

  const searchSummary = {
    activeCount: activeSearchResults.length,
    totalDeposit: activeSearchResults.reduce((sum, f) => sum + f.deposit_amount, 0),
    totalInterest: activeSearchResults.reduce((sum, f) => sum + Math.max(0, f.maturity_amount - f.deposit_amount), 0),
    totalMaturity: activeSearchResults.reduce((sum, f) => sum + f.maturity_amount, 0)
  };

  // Sorting logic
  const sortedResults = [...searchResults].sort((a, b) => {
    let valA = a[sortField as keyof FDMaster] ?? '';
    let valB = b[sortField as keyof FDMaster] ?? '';

    // If sorting by customer name, we check it
    if (sortField === 'customer_name') {
      valA = a.customer_name;
      valB = b.customer_name;
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
    if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const pageSize = 5;
  const totalPages = Math.ceil(sortedResults.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedResults = sortedResults.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <div className="space-y-6">
      
      {/* 1. Header Grid Welcome */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
        <div>
          <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold">Super Money Deposit System</span>
          <h2 className="text-xl md:text-2xl font-bold font-sans mt-0.5 text-white">Admin Central Command Deck</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time visual monitoring of Fixed Deposit portfolios, liability accounts, and depositor file databases.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onQuickNewFD}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            New Placement
          </button>
          <button
            onClick={onQuickNewCustomer}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Users className="h-4 w-4" />
            New Customer
          </button>
        </div>
      </div>

      {/* 1.5 Global FD Search Module */}
      <div id="global-fd-search-module" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-blue-600" />
            Global FD Search Panel
          </h3>
          <p className="text-xxs text-slate-400 mt-0.5">Quickly query across the full depository network by certificate, holder name, contact info, or identity cards.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by FD No, Customer Name, Mobile, Aadhaar or PAN"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Search Results Area */}
        {hasSearched && (
          <div className="space-y-6 animate-fade-in">
            {searchResults.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-slate-500 text-sm font-semibold">No Fixed Deposit records found.</p>
              </div>
            ) : (
              <>
                {/* SUMMARY PANEL (Only active FDs of the searched customer(s)) */}
                <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active FDs</span>
                    <strong className="text-xl font-mono text-slate-900 block mt-1">
                      {searchSummary.activeCount}
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active Deposit Amount</span>
                    <strong className="text-xl font-mono text-slate-900 block mt-1">
                      ₹{searchSummary.totalDeposit.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active Interest Amount</span>
                    <strong className="text-xl font-mono text-emerald-800 block mt-1">
                      ₹{searchSummary.totalInterest.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active Maturity Value</span>
                    <strong className="text-xl font-mono text-blue-700 block mt-1">
                      ₹{searchSummary.totalMaturity.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* RESULTS TABLE */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="max-h-96 overflow-y-auto overflow-x-auto relative scrollbar-thin">
                    <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                      <thead className="sticky top-0 bg-slate-900 text-white font-semibold text-xxs uppercase tracking-wider z-10">
                        <tr>
                          {[
                            { key: 'fd_number', label: 'FD Number', sortable: true },
                            { key: 'customer_name', label: 'Customer Name', sortable: true },
                            { key: 'customer_mobile', label: 'Mobile Number', sortable: true },
                            { key: 'deposit_amount', label: 'Deposit Amount', sortable: true },
                            { key: 'interest_rate', label: 'Interest Rate', sortable: true },
                            { key: 'tenure_months', label: 'Tenure', sortable: true },
                            { key: 'deposit_date', label: 'Deposit Date', sortable: true },
                            { key: 'maturity_date', label: 'Maturity Date', sortable: true },
                            { key: 'maturity_amount', label: 'Maturity Amount', sortable: true },
                            { key: 'status', label: 'Status', sortable: true },
                            { key: 'actions_view', label: 'View', sortable: false },
                            { key: 'actions_print', label: 'Print', sortable: false },
                          ].map(col => (
                            <th 
                              key={col.key} 
                              onClick={() => col.sortable && handleSort(col.key)}
                              className={`px-4 py-3 border-b border-slate-800 bg-slate-900 select-none ${col.sortable ? 'cursor-pointer hover:bg-slate-800' : ''}`}
                            >
                              <div className="flex items-center gap-1.5">
                                {col.label}
                                {col.sortable && sortField === col.key && (
                                  sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-400" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedResults.map((f, idx) => {
                          const displayStatus = getFDDisplayStatus(f);
                          return (
                            <tr key={f.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/30 hover:bg-slate-50/50'}>
                              <td className="px-4 py-3.5 font-mono font-bold text-blue-700">{f.fd_number}</td>
                              <td className="px-4 py-3.5 font-bold text-slate-800">{f.customer_name}</td>
                              <td className="px-4 py-3.5 font-mono text-slate-600">{f.customer_mobile}</td>
                              <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">₹{f.deposit_amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3.5 font-mono text-emerald-700 font-bold">{f.interest_rate.toFixed(2)}%</td>
                              <td className="px-4 py-3.5 text-slate-600">{f.tenure_months} Mo</td>
                              <td className="px-4 py-3.5 font-mono text-slate-600">{f.deposit_date}</td>
                              <td className="px-4 py-3.5 font-mono text-slate-600">{f.maturity_date}</td>
                              <td className="px-4 py-3.5 font-mono font-semibold text-blue-700">₹{f.maturity_amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  displayStatus === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                  displayStatus === 'Renewed' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                  displayStatus === 'Matured' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                  displayStatus === 'Premature Closed' ? 'bg-red-50 text-red-800 border border-red-200' :
                                  'bg-slate-100 text-slate-800 border border-slate-200'
                                }`}>
                                  {displayStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => handleViewFD(f)}
                                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => handlePrintFD(f)}
                                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                                  title="Print Receipt"
                                >
                                  <Printer className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION PANEL */}
                  {totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                      <div className="text-xxs text-slate-500">
                        Showing <strong className="font-semibold text-slate-700">{startIndex + 1}</strong> to <strong className="font-semibold text-slate-700">{Math.min(startIndex + pageSize, sortedResults.length)}</strong> of <strong className="font-semibold text-slate-700">{sortedResults.length}</strong> records
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="px-2.5 py-1.5 border border-slate-200 rounded text-xxs font-semibold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="px-2.5 py-1.5 border border-slate-200 rounded text-xxs font-semibold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Critical Stats Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Today's New FDs</span>
            <strong className="text-2xl font-mono text-slate-900 block">{stats.todayFDsCount} Placed</strong>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              Volume: ₹{stats.todayFDsVolume.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Maturing Today</span>
            <strong className="text-2xl font-mono text-slate-900 block">{stats.maturityTodayCount} Due</strong>
            <span className="text-[10px] text-slate-500 block">Needs normal close settlement</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CalendarRange className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Renewal Dues (7D)</span>
            <strong className="text-2xl font-mono text-slate-900 block">{stats.renewDueCount} Due</strong>
            <span className="text-[10px] text-amber-700 font-semibold block">Awaiting rollover action</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Hourglass className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="space-y-1.5">
            <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Premature Closed Today</span>
            <strong className="text-2xl font-mono text-slate-900 block">{stats.prematureClosedTodayCount} Settled</strong>
            <span className="text-[10px] text-slate-500 block">Interest liquidated with penalty</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <AlertOctagon className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* 3. Global Financial Ledger Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Financial Liabilities & Volumes */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider mb-6 font-sans">Consolidated Deposit Portfolio Ledger</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                  <PiggyBank className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Total Active Deposits (Principal)</span>
                  <h4 className="text-xl font-mono font-bold text-slate-950 mt-1">₹{stats.totalActiveDepositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Outstanding active deposits liability.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 flex items-center gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Scale className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider block">Projected Interest Liabilities</span>
                  <h4 className="text-xl font-mono font-bold text-emerald-800 mt-1">₹{stats.totalInterestLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Projected payout obligation at maturity.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Quick graphical proportion meter */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="text-slate-500 font-medium">Deposit status distribution</span>
              <span className="font-mono font-bold text-slate-900">{stats.activeFDsCount} Active / {fds.length} Total</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-full" 
                style={{ width: `${fds.length ? (stats.activeFDsCount / fds.length) * 100 : 0}%` }} 
                title="Active" 
              />
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${fds.length ? (fds.filter(f => f.status === 'Renewed').length / fds.length) * 100 : 0}%` }} 
                title="Renewed" 
              />
              <div 
                className="bg-slate-300 h-full" 
                style={{ width: `${fds.length ? (fds.filter(f => f.status === 'Closed' || f.status === 'Premature Closed').length / fds.length) * 100 : 0}%` }} 
                title="Closed" 
              />
            </div>
            <div className="flex flex-wrap gap-x-4 mt-3 text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Active</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Renewed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300 inline-block" /> Closed/Settled</span>
            </div>
          </div>
        </div>

        {/* Right Side: Total customers and action directory */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider mb-5 font-sans">Depositor database metrics</h3>
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2.5 rounded-lg text-slate-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Registered Holders</span>
                  <strong className="text-lg font-mono text-slate-900 block font-bold">{stats.totalCustomersCount} Accounts</strong>
                </div>
              </div>
            </div>

            <p className="text-xxs text-slate-500 leading-relaxed">
              Customers can instantly access their portfolio read-only dashboard using their mobile number and dynamic name-based secure passkey.
            </p>
          </div>

          <div className="space-y-2 mt-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Command Shortcut</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('qr')}
                className="p-2.5 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xxs font-bold text-slate-800 block">QR Validator</span>
              </button>

              <button
                onClick={() => onNavigate('reports')}
                className="p-2.5 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all cursor-pointer"
              >
                <FileBarChart className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xxs font-bold text-slate-800 block">Report Center</span>
              </button>

              <button
                onClick={() => onNavigate('settings')}
                className="p-2.5 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all cursor-pointer col-span-2"
              >
                <Settings2 className="h-4 w-4 text-blue-600 mb-1 inline" />
                <span className="text-xxs font-bold text-slate-800 inline-block ml-1">System Master Configurations</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>

      {/* View Details Modal */}
      {showViewModal && viewingFD && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-blue-400 font-mono tracking-wider block font-bold uppercase">Fixed Deposit Account Details</span>
                <h3 className="text-sm font-bold mt-0.5">{viewingFD.fd_number}</h3>
              </div>
              <button
                onClick={() => { setShowViewModal(false); setViewingFD(null); }}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Account Status Badge */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <span className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Operational Status</span>
                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  getFDDisplayStatus(viewingFD) === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  getFDDisplayStatus(viewingFD) === 'Renewed' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                  getFDDisplayStatus(viewingFD) === 'Matured' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  getFDDisplayStatus(viewingFD) === 'Premature Closed' ? 'bg-red-50 text-red-800 border border-red-200' :
                  'bg-slate-100 text-slate-800 border border-slate-200'
                }`}>
                  {getFDDisplayStatus(viewingFD)}
                </span>
              </div>

              {/* Grid 1: Customer Info */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest font-mono">Depositor Profile</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Depositor Name</span>
                    <strong className="text-xs text-slate-800 font-semibold">{viewingFD.customer_name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Mobile Number</span>
                    <strong className="text-xs text-slate-800 font-mono">{viewingFD.customer_mobile}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Aadhaar Number</span>
                    <strong className="text-xs text-slate-800 font-mono">{viewingFD.customer_aadhaar || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">PAN Number</span>
                    <strong className="text-xs text-slate-800 font-mono uppercase">{viewingFD.customer_pan || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Grid 2: Financial Particulars */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest font-mono">Deposit Particulars</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Principal Amount</span>
                    <strong className="text-sm font-mono text-slate-900 font-bold">₹{viewingFD.deposit_amount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Interest Rate (Per Annum)</span>
                    <strong className="text-sm font-mono text-emerald-800 font-bold">{viewingFD.interest_rate.toFixed(2)}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Tenure (Months)</span>
                    <strong className="text-sm text-slate-800 font-bold">{viewingFD.tenure_months} Months</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Payout Frequency</span>
                    <strong className="text-sm text-slate-800 font-bold capitalize">{viewingFD.interest_payout_type || 'At Maturity'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Value Date</span>
                    <strong className="text-xs font-mono text-slate-800">{viewingFD.deposit_date}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Maturity Date</span>
                    <strong className="text-xs font-mono text-slate-800">{viewingFD.maturity_date}</strong>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Estimated Interest Payout</span>
                      <strong className="text-sm font-mono text-emerald-700 font-bold">₹{Math.max(0, viewingFD.maturity_amount - viewingFD.deposit_amount).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Maturity Settlement Amount</span>
                      <strong className="text-base font-mono text-blue-700 font-bold">₹{viewingFD.maturity_amount.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premature settlement ledger, if closed early */}
              {viewingFD.status === 'Premature Closed' && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-[11px] font-bold text-red-600 uppercase tracking-widest font-mono">Premature Liquidate Particulars</h4>
                  <div className="grid grid-cols-2 gap-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
                    <div>
                      <span className="text-[10px] text-red-400 block font-medium">Premature Closure Date</span>
                      <strong className="text-xs font-mono text-red-900 font-bold">{viewingFD.close_date || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-red-400 block font-medium">Premature Paid Amount</span>
                      <strong className="text-xs font-mono text-red-900 font-bold">₹{(viewingFD.premature_amount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-red-400 block font-medium">Premature Closed Remarks</span>
                      <p className="text-xs text-red-800 font-medium">{viewingFD.close_remarks || 'No remarks provided.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => { setShowViewModal(false); setViewingFD(null); }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Window
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handlePrintFD(viewingFD);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="h-4 w-4" />
                Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal Overlay */}
      {showPrintModal && selectedFDForPrint && settings && (
        <PrintReceipt
          fd={selectedFDForPrint}
          customer={customers.find(c => c.id === selectedFDForPrint.customer_id) || {
            id: selectedFDForPrint.customer_id,
            name: selectedFDForPrint.customer_name,
            mobile_number: selectedFDForPrint.customer_mobile,
            aadhaar_number: selectedFDForPrint.customer_aadhaar || '',
            pan_number: selectedFDForPrint.customer_pan || '',
            created_at: ''
          }}
          settings={settings}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedFDForPrint(null);
          }}
        />
      )}
    </>
  );
}
