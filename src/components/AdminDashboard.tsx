import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { FDMaster, DBCustomer, CompanySettings } from '../types';
import { 
  PlusCircle, Users, Receipt, Hourglass, CalendarRange, 
  Settings2, QrCode, FileBarChart, PiggyBank, Scale, AlertOctagon, TrendingUp,
  Search, ArrowUp, ArrowDown, Printer, Eye, X, RotateCcw, ArrowRight
} from 'lucide-react';
import PrintReceipt from './PrintReceipt';

interface AdminDashboardProps {
  onNavigate: (screen: 'customers' | 'fds' | 'reports' | 'qr' | 'settings') => void;
  onQuickNewFD: () => void;
  onQuickNewCustomer: () => void;
  onSelectFD?: (fdNumber: string) => void;
}

export default function AdminDashboard({ onNavigate, onQuickNewFD, onQuickNewCustomer, onSelectFD }: AdminDashboardProps) {
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
    todayFDsMaturityVolume: 0,
    activeFDsCount: 0,
    maturityTodayCount: 0,
    maturityTodayPrincipal: 0,
    maturityTodayAmount: 0,
    renewDueCount: 0,
    renewDuePrincipal: 0,
    renewDueMaturity: 0,
    prematureClosedTodayCount: 0,
    prematureClosedTodayPrincipal: 0,
    prematureClosedTodayMaturity: 0,
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
      const fdsPlacedTodayMaturityVolume = fdsPlacedToday.reduce((sum, f) => sum + f.maturity_amount, 0);

      const activeFDs = allFDs.filter(f => f.status === 'Active');
      const activeCount = activeFDs.length;
      const activeVolume = activeFDs.reduce((sum, f) => sum + f.deposit_amount, 0);

      const maturingTodayFDs = activeFDs.filter(f => f.maturity_date === todayStr);
      const maturityToday = maturingTodayFDs.length;
      const maturityTodayPrincipal = maturingTodayFDs.reduce((sum, f) => sum + f.deposit_amount, 0);
      const maturityTodayAmount = maturingTodayFDs.reduce((sum, f) => sum + f.maturity_amount, 0);

      // Renew due: Active deposits maturing today or within next 7 days, or past maturity date
      const renewDueFDs = activeFDs.filter(f => {
        const matTime = new Date(f.maturity_date).getTime();
        return matTime <= sevenDaysLaterMs;
      });
      const renewDue = renewDueFDs.length;
      const renewDuePrincipal = renewDueFDs.reduce((sum, f) => sum + f.deposit_amount, 0);
      const renewDueMaturity = renewDueFDs.reduce((sum, f) => sum + f.maturity_amount, 0);

      const prematureClosedTodayFDs = allFDs.filter(f => f.status === 'Premature Closed' && f.close_date === todayStr);
      const prematureClosedToday = prematureClosedTodayFDs.length;
      const prematureClosedTodayPrincipal = prematureClosedTodayFDs.reduce((sum, f) => sum + f.deposit_amount, 0);
      const prematureClosedTodayMaturity = prematureClosedTodayFDs.reduce((sum, f) => sum + f.maturity_amount, 0);

      // Total interest liability = total maturity amount - total deposit amount of active deposits
      const interestLiability = activeFDs.reduce((sum, f) => {
        const diff = Math.max(0, f.maturity_amount - f.deposit_amount);
        return sum + diff;
      }, 0);

      setStats({
        todayFDsCount: fdsPlacedTodayCount,
        todayFDsVolume: fdsPlacedTodayVolume,
        todayFDsMaturityVolume: fdsPlacedTodayMaturityVolume,
        activeFDsCount: activeCount,
        maturityTodayCount: maturityToday,
        maturityTodayPrincipal,
        maturityTodayAmount,
        renewDueCount: renewDue,
        renewDuePrincipal,
        renewDueMaturity,
        prematureClosedTodayCount: prematureClosedToday,
        prematureClosedTodayPrincipal,
        prematureClosedTodayMaturity,
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

  // Stat Card Filter state
  type StatCardFilter = 'today_new' | 'maturing_today' | 'renewal_dues' | 'premature_closed' | null;
  const [selectedCardFilter, setSelectedCardFilter] = useState<StatCardFilter>(null);
  const [cardFilterSearch, setCardFilterSearch] = useState('');
  const [cardFilterPage, setCardFilterPage] = useState(1);
  const [cardFilterSortField, setCardFilterSortField] = useState<string>('maturity_date');
  const [cardFilterSortOrder, setCardFilterSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleToggleCardFilter = (filterKey: 'today_new' | 'maturing_today' | 'renewal_dues' | 'premature_closed') => {
    if (selectedCardFilter === filterKey) {
      setSelectedCardFilter(null);
    } else {
      setSelectedCardFilter(filterKey);
      setCardFilterSearch('');
      setCardFilterPage(1);
      setTimeout(() => {
        const el = document.getElementById('stat-card-filtered-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  };

  const getFilteredCardFDs = (): FDMaster[] => {
    if (!selectedCardFilter) return [];
    const todayStr = getTodayStr();
    const todayInMs = new Date(todayStr).getTime();
    const sevenDaysLaterMs = todayInMs + 7 * 24 * 60 * 60 * 1000;

    let baseList: FDMaster[] = [];

    if (selectedCardFilter === 'today_new') {
      baseList = fds.filter(f => f.deposit_date === todayStr);
    } else if (selectedCardFilter === 'maturing_today') {
      baseList = fds.filter(f => f.status === 'Active' && f.maturity_date === todayStr);
    } else if (selectedCardFilter === 'renewal_dues') {
      baseList = fds.filter(f => {
        if (f.status !== 'Active') return false;
        const matTime = new Date(f.maturity_date).getTime();
        return matTime <= sevenDaysLaterMs;
      });
    } else if (selectedCardFilter === 'premature_closed') {
      baseList = fds.filter(f => f.status === 'Premature Closed' && f.close_date === todayStr);
    }

    if (!cardFilterSearch.trim()) return baseList;

    const query = cardFilterSearch.trim().toLowerCase();
    return baseList.filter(f => 
      f.fd_number.toLowerCase().includes(query) ||
      f.customer_name.toLowerCase().includes(query) ||
      f.customer_mobile.includes(query) ||
      (f.customer_aadhaar && f.customer_aadhaar.includes(query)) ||
      (f.customer_pan && f.customer_pan.toLowerCase().includes(query))
    );
  };

  const cardFilteredFDs = getFilteredCardFDs();

  const sortedCardFDs = [...cardFilteredFDs].sort((a, b) => {
    let valA = a[cardFilterSortField as keyof FDMaster] ?? '';
    let valB = b[cardFilterSortField as keyof FDMaster] ?? '';

    if (cardFilterSortField === 'customer_name') {
      valA = a.customer_name;
      valB = b.customer_name;
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return cardFilterSortOrder === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (strA < strB) return cardFilterSortOrder === 'asc' ? -1 : 1;
    if (strA > strB) return cardFilterSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const cardFilterPageSize = 6;
  const cardFilterTotalPages = Math.ceil(sortedCardFDs.length / cardFilterPageSize);
  const cardFilterStartIndex = (cardFilterPage - 1) * cardFilterPageSize;
  const paginatedCardFDs = sortedCardFDs.slice(cardFilterStartIndex, cardFilterStartIndex + cardFilterPageSize);

  const cardFilteredTotals = {
    count: cardFilteredFDs.length,
    totalDeposit: cardFilteredFDs.reduce((sum, f) => sum + f.deposit_amount, 0),
    totalInterest: cardFilteredFDs.reduce((sum, f) => sum + Math.max(0, f.maturity_amount - f.deposit_amount), 0),
    totalMaturity: cardFilteredFDs.reduce((sum, f) => sum + f.maturity_amount, 0),
  };

  const getCardFilterMeta = () => {
    switch (selectedCardFilter) {
      case 'today_new':
        return {
          title: "Today's New Fixed Deposits",
          badge: "New Placements Today",
          subtitle: "All Fixed Deposit certificates created and funded on today's business date.",
          icon: Receipt,
          theme: "blue",
          accentBorder: "border-blue-200",
          accentBg: "bg-blue-50 text-blue-700",
          emptyNotice: "No new Fixed Deposits booked today yet."
        };
      case 'maturing_today':
        return {
          title: "Active Deposits Maturing Today",
          badge: "Due for Settlement Today",
          subtitle: "Fixed Deposits completing their agreed tenure today, requiring payout settlement or rollover.",
          icon: CalendarRange,
          theme: "emerald",
          accentBorder: "border-emerald-200",
          accentBg: "bg-emerald-50 text-emerald-700",
          emptyNotice: "No active Fixed Deposits are maturing today."
        };
      case 'renewal_dues':
        return {
          title: "Renewal Dues (Upcoming 7 Days & Overdue)",
          badge: "Rollover Queue (7 Days)",
          subtitle: "Active certificates maturing within the next 7 calendar days or past maturity awaiting depositor rollover instruction.",
          icon: Hourglass,
          theme: "amber",
          accentBorder: "border-amber-200",
          accentBg: "bg-amber-50 text-amber-700",
          emptyNotice: "No active Fixed Deposits due for renewal within the next 7 days."
        };
      case 'premature_closed':
        return {
          title: "Premature Liquidations Settled Today",
          badge: "Early Liquidation Today",
          subtitle: "Certificates liquidated early on today's business date with early termination penalty.",
          icon: AlertOctagon,
          theme: "rose",
          accentBorder: "border-rose-200",
          accentBg: "bg-rose-50 text-rose-700",
          emptyNotice: "No premature closures processed today."
        };
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6">
      
      {/* 1. Header Grid Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Super Money Central Node
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-sans mt-2 text-white tracking-tight">
            Admin Central Command Deck
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Real-time visual monitoring of Fixed Deposit portfolios, liability accounts, and depositor file databases.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <button
            onClick={onQuickNewFD}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all cursor-pointer active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            New Placement
          </button>
          <button
            onClick={onQuickNewCustomer}
            className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Users className="h-4 w-4 text-blue-400" />
            New Customer
          </button>
        </div>
      </div>

      {/* 1.5 Global FD Search Module */}
      <div id="global-fd-search-module" className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-blue-600" />
            Global FD Search Panel
          </h3>
          <p className="text-xs text-slate-500 mt-1">Quickly query across the full depository network by certificate, holder name, contact info, or identity cards.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by FD No, Customer Name, Mobile, Aadhaar or PAN"
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer p-1"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/10 active:scale-[0.98]"
          >
            Search
          </button>
        </form>

        {/* Search Results Area */}
        {hasSearched && (
          <div className="space-y-6 animate-fade-in">
            {searchResults.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <p className="text-slate-500 text-sm font-semibold">No Fixed Deposit records found.</p>
              </div>
            ) : (
              <>
                {/* SUMMARY PANEL (Only active FDs of the searched customer(s)) */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active FDs</span>
                    <strong className="text-xl font-mono text-slate-900 block mt-1">
                      {searchSummary.activeCount}
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active Deposit Amount</span>
                    <strong className="text-xl font-mono text-slate-900 block mt-1">
                      ₹{searchSummary.totalDeposit.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active Interest Amount</span>
                    <strong className="text-xl font-mono text-emerald-600 block mt-1">
                      ₹{searchSummary.totalInterest.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active Maturity Value</span>
                    <strong className="text-xl font-mono text-blue-600 block mt-1">
                      ₹{searchSummary.totalMaturity.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* RESULTS TABLE */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="max-h-96 overflow-y-auto overflow-x-auto relative scrollbar-thin">
                    <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                      <thead className="sticky top-0 bg-slate-900 text-white font-semibold text-[10px] uppercase tracking-wider z-10">
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
                              className={`px-4 py-3.5 border-b border-slate-800 bg-slate-900 select-none ${col.sortable ? 'cursor-pointer hover:bg-slate-800' : ''}`}
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
                            <tr key={f.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/30 transition-colors' : 'bg-slate-50/40 hover:bg-blue-50/30 transition-colors'}>
                              <td className="px-4 py-3.5 font-mono font-bold text-blue-600">{f.fd_number}</td>
                              <td className="px-4 py-3.5 font-bold text-slate-800">{f.customer_name}</td>
                              <td className="px-4 py-3.5 font-mono text-slate-600">{f.customer_mobile}</td>
                              <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">₹{f.deposit_amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3.5 font-mono text-emerald-600 font-bold">{f.interest_rate.toFixed(2)}%</td>
                              <td className="px-4 py-3.5 text-slate-600">{f.tenure_months} Mo</td>
                              <td className="px-4 py-3.5 font-mono text-slate-600">{f.deposit_date}</td>
                              <td className="px-4 py-3.5 font-mono text-slate-600">{f.maturity_date}</td>
                              <td className="px-4 py-3.5 font-mono font-semibold text-blue-600">₹{f.maturity_amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  displayStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  displayStatus === 'Renewed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  displayStatus === 'Matured' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  displayStatus === 'Premature Closed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {displayStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => handleViewFD(f)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => handlePrintFD(f)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
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
                    <div className="bg-slate-50/80 border-t border-slate-200/80 px-4 py-3 flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 font-mono">
                        Showing <strong className="font-bold text-slate-700">{startIndex + 1}</strong> to <strong className="font-bold text-slate-700">{Math.min(startIndex + pageSize, sortedResults.length)}</strong> of <strong className="font-bold text-slate-700">{sortedResults.length}</strong> records
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
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
        
        {/* Card 1: Today's New FDs */}
        <div 
          onClick={() => handleToggleCardFilter('today_new')}
          className={`p-5.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group select-none ${
            selectedCardFilter === 'today_new'
              ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-600 shadow-md scale-[1.01]'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 shadow-2xs'
          }`}
          role="button"
          tabIndex={0}
          title="Click to filter Today's New FDs"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Today's New FDs</span>
                {selectedCardFilter === 'today_new' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-600 text-white">Active</span>
                )}
              </div>
              <strong className="text-2xl font-mono text-slate-900 block tracking-tight">{stats.todayFDsCount} Placed</strong>
              <div className="space-y-0.5 text-[10.5px]">
                <div className="text-slate-600 font-semibold flex items-center justify-between gap-2">
                  <span>Principal:</span>
                  <strong className="font-mono text-slate-900">₹{stats.todayFDsVolume.toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-blue-600 font-bold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3 inline" /> Maturity:
                  </span>
                  <strong className="font-mono text-blue-700">₹{stats.todayFDsMaturityVolume.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-xl border transition-colors ${
              selectedCardFilter === 'today_new' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                : 'bg-blue-50 text-blue-600 border-blue-100/50 group-hover:bg-blue-100'
            }`}>
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className={`font-semibold ${selectedCardFilter === 'today_new' ? 'text-blue-700 font-bold' : 'text-slate-400 group-hover:text-blue-600'}`}>
              {selectedCardFilter === 'today_new' ? 'Showing filtered records below ✕' : `Click to view data (${stats.todayFDsCount}) →`}
            </span>
            {selectedCardFilter === 'today_new' && <span className="text-blue-600 font-bold">Clear</span>}
          </div>
        </div>

        {/* Card 2: Maturing Today */}
        <div 
          onClick={() => handleToggleCardFilter('maturing_today')}
          className={`p-5.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group select-none ${
            selectedCardFilter === 'maturing_today'
              ? 'bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-600 shadow-md scale-[1.01]'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 shadow-2xs'
          }`}
          role="button"
          tabIndex={0}
          title="Click to filter Maturing Today FDs"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Maturing Today</span>
                {selectedCardFilter === 'maturing_today' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-600 text-white">Active</span>
                )}
              </div>
              <strong className="text-2xl font-mono text-slate-900 block tracking-tight">{stats.maturityTodayCount} Due</strong>
              <div className="space-y-0.5 text-[10.5px]">
                <div className="text-slate-600 font-semibold flex items-center justify-between gap-2">
                  <span>Principal:</span>
                  <strong className="font-mono text-slate-900">₹{stats.maturityTodayPrincipal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-emerald-600 font-bold flex items-center justify-between gap-2">
                  <span>Maturity:</span>
                  <strong className="font-mono text-emerald-700">₹{stats.maturityTodayAmount.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-xl border transition-colors ${
              selectedCardFilter === 'maturing_today' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-100/50 group-hover:bg-emerald-100'
            }`}>
              <CalendarRange className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className={`font-semibold ${selectedCardFilter === 'maturing_today' ? 'text-emerald-700 font-bold' : 'text-slate-400 group-hover:text-emerald-600'}`}>
              {selectedCardFilter === 'maturing_today' ? 'Showing filtered records below ✕' : `Click to view data (${stats.maturityTodayCount}) →`}
            </span>
            {selectedCardFilter === 'maturing_today' && <span className="text-emerald-600 font-bold">Clear</span>}
          </div>
        </div>

        {/* Card 3: Renewal Dues (7D) */}
        <div 
          onClick={() => handleToggleCardFilter('renewal_dues')}
          className={`p-5.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group select-none ${
            selectedCardFilter === 'renewal_dues'
              ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-500 shadow-md scale-[1.01]'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 shadow-2xs'
          }`}
          role="button"
          tabIndex={0}
          title="Click to filter Renewal Dues (7D)"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Renewal Dues (7D)</span>
                {selectedCardFilter === 'renewal_dues' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-600 text-white">Active</span>
                )}
              </div>
              <strong className="text-2xl font-mono text-slate-900 block tracking-tight">{stats.renewDueCount} Due</strong>
              <div className="space-y-0.5 text-[10.5px]">
                <div className="text-slate-600 font-semibold flex items-center justify-between gap-2">
                  <span>Principal:</span>
                  <strong className="font-mono text-slate-900">₹{stats.renewDuePrincipal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-amber-700 font-bold flex items-center justify-between gap-2">
                  <span>Maturity:</span>
                  <strong className="font-mono text-amber-800">₹{stats.renewDueMaturity.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-xl border transition-colors ${
              selectedCardFilter === 'renewal_dues' 
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                : 'bg-amber-50 text-amber-600 border-amber-100/50 group-hover:bg-amber-100'
            }`}>
              <Hourglass className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className={`font-semibold ${selectedCardFilter === 'renewal_dues' ? 'text-amber-700 font-bold' : 'text-slate-400 group-hover:text-amber-600'}`}>
              {selectedCardFilter === 'renewal_dues' ? 'Showing filtered records below ✕' : `Click to view data (${stats.renewDueCount}) →`}
            </span>
            {selectedCardFilter === 'renewal_dues' && <span className="text-amber-600 font-bold">Clear</span>}
          </div>
        </div>

        {/* Card 4: Premature Closed Today */}
        <div 
          onClick={() => handleToggleCardFilter('premature_closed')}
          className={`p-5.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group select-none ${
            selectedCardFilter === 'premature_closed'
              ? 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-500 shadow-md scale-[1.01]'
              : 'bg-white border-slate-200/80 hover:border-rose-300 hover:shadow-md hover:-translate-y-0.5 shadow-2xs'
          }`}
          role="button"
          tabIndex={0}
          title="Click to filter Premature Closed Today FDs"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Premature Closed Today</span>
                {selectedCardFilter === 'premature_closed' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-600 text-white">Active</span>
                )}
              </div>
              <strong className="text-2xl font-mono text-slate-900 block tracking-tight">{stats.prematureClosedTodayCount} Settled</strong>
              <div className="space-y-0.5 text-[10.5px]">
                <div className="text-slate-600 font-semibold flex items-center justify-between gap-2">
                  <span>Principal:</span>
                  <strong className="font-mono text-slate-900">₹{stats.prematureClosedTodayPrincipal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-rose-600 font-bold flex items-center justify-between gap-2">
                  <span>Maturity:</span>
                  <strong className="font-mono text-rose-700">₹{stats.prematureClosedTodayMaturity.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-xl border transition-colors ${
              selectedCardFilter === 'premature_closed' 
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                : 'bg-slate-100 text-slate-600 border-slate-200/50 group-hover:bg-slate-200'
            }`}>
              <AlertOctagon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className={`font-semibold ${selectedCardFilter === 'premature_closed' ? 'text-rose-700 font-bold' : 'text-slate-400 group-hover:text-rose-600'}`}>
              {selectedCardFilter === 'premature_closed' ? 'Showing filtered records below ✕' : `Click to view data (${stats.prematureClosedTodayCount}) →`}
            </span>
            {selectedCardFilter === 'premature_closed' && <span className="text-rose-600 font-bold">Clear</span>}
          </div>
        </div>

      </div>

      {/* 2.5 STAT-CARD FILTERED RECORDS PANEL */}
      {selectedCardFilter && (() => {
        const meta = getCardFilterMeta();
        if (!meta) return null;
        const IconComponent = meta.icon;

        return (
          <div 
            id="stat-card-filtered-section" 
            className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-md space-y-6 animate-in fade-in slide-in-from-top-3 duration-200"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-2xl border shrink-0 ${
                  meta.theme === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  meta.theme === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  meta.theme === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                  'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight">
                      {meta.title}
                    </h3>
                    <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${meta.accentBg} ${meta.accentBorder}`}>
                      {cardFilteredTotals.count} Record{cardFilteredTotals.count !== 1 ? 's' : ''} Found
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    {meta.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCardFilter(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <X className="h-4 w-4 text-slate-500" />
                  Clear Filter
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('fds')}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <span>Open Full Ledger</span>
                  <span className="text-[10px]">→</span>
                </button>
              </div>
            </div>

            {/* Quick Financial Summary of this Filter */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Filtered Certificates</span>
                <strong className="text-lg font-mono text-slate-900 block mt-0.5">{cardFilteredTotals.count}</strong>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Principal</span>
                <strong className="text-lg font-mono text-slate-900 block mt-0.5">₹{cardFilteredTotals.totalDeposit.toLocaleString('en-IN')}</strong>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Interest Yield</span>
                <strong className="text-lg font-mono text-emerald-600 block mt-0.5">₹{cardFilteredTotals.totalInterest.toLocaleString('en-IN')}</strong>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Maturity Value</span>
                <strong className="text-lg font-mono text-blue-600 block mt-0.5">₹{cardFilteredTotals.totalMaturity.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {/* Filter Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={cardFilterSearch}
                onChange={(e) => { setCardFilterSearch(e.target.value); setCardFilterPage(1); }}
                placeholder={`Search within filtered records by FD Number, Holder Name, Mobile, Aadhaar, PAN...`}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-800 transition-all outline-none"
              />
              {cardFilterSearch && (
                <button
                  type="button"
                  onClick={() => { setCardFilterSearch(''); setCardFilterPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer p-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Table or Empty Notice */}
            {sortedCardFDs.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                <p className="text-slate-500 text-sm font-semibold">{meta.emptyNotice}</p>
                <p className="text-xs text-slate-400">Try placing new certificates or clearing the search query.</p>
              </div>
            ) : (
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="max-h-[460px] overflow-y-auto overflow-x-auto relative scrollbar-thin">
                  <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                    <thead className="sticky top-0 bg-slate-900 text-white font-semibold text-[10px] uppercase tracking-wider z-10">
                      <tr>
                        {[
                          { key: 'fd_number', label: 'FD Number', sortable: true },
                          { key: 'customer_name', label: 'Customer Name', sortable: true },
                          { key: 'customer_mobile', label: 'Mobile Number', sortable: true },
                          { key: 'deposit_amount', label: 'Principal (₹)', sortable: true },
                          { key: 'interest_rate', label: 'Rate (P.A.)', sortable: true },
                          { key: 'tenure_months', label: 'Tenure', sortable: true },
                          { key: 'deposit_date', label: 'Deposit Date', sortable: true },
                          { key: 'maturity_date', label: 'Maturity Date', sortable: true },
                          { key: 'maturity_amount', label: 'Maturity (₹)', sortable: true },
                          { key: 'status', label: 'Status', sortable: true },
                          { key: 'actions', label: 'Actions & Rollover', sortable: false },
                        ].map(col => (
                          <th 
                            key={col.key} 
                            onClick={() => {
                              if (col.sortable) {
                                if (cardFilterSortField === col.key) {
                                  setCardFilterSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setCardFilterSortField(col.key);
                                  setCardFilterSortOrder('asc');
                                }
                                setCardFilterPage(1);
                              }
                            }}
                            className={`px-4 py-3.5 border-b border-slate-800 bg-slate-900 select-none ${col.sortable ? 'cursor-pointer hover:bg-slate-800' : ''}`}
                          >
                            <div className="flex items-center gap-1.5">
                              {col.label}
                              {col.sortable && cardFilterSortField === col.key && (
                                cardFilterSortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-blue-400" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedCardFDs.map((f, idx) => {
                        const displayStatus = getFDDisplayStatus(f);
                        const todayStr = getTodayStr();
                        const isMaturityNearOrPast = f.status === 'Active' && f.maturity_date <= todayStr;

                        return (
                          <tr key={f.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/30 transition-colors' : 'bg-slate-50/40 hover:bg-blue-50/30 transition-colors'}>
                            <td className="px-4 py-3.5 font-mono font-bold text-blue-600">{f.fd_number}</td>
                            <td className="px-4 py-3.5 font-bold text-slate-800">
                              <div>{f.customer_name}</div>
                              {f.customer_pan && (
                                <span className="text-[10px] text-slate-400 font-mono uppercase block">{f.customer_pan}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">{f.customer_mobile}</td>
                            <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">₹{f.deposit_amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3.5 font-mono text-emerald-600 font-bold">{f.interest_rate.toFixed(2)}%</td>
                            <td className="px-4 py-3.5 text-slate-600">{f.tenure_months} Mo</td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">{f.deposit_date}</td>
                            <td className="px-4 py-3.5 font-mono">
                              <span className={`px-2 py-0.5 rounded font-semibold ${
                                isMaturityNearOrPast 
                                  ? 'bg-amber-100 text-amber-900 font-bold' 
                                  : 'text-slate-700'
                              }`}>
                                {f.maturity_date}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono font-semibold text-blue-600">₹{f.maturity_amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                displayStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                displayStatus === 'Renewed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                displayStatus === 'Matured' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                displayStatus === 'Premature Closed' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {displayStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewFD(f)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                  title="View Full Certificate Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintFD(f)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                  title="Print Certificate Receipt"
                                >
                                  <Printer className="h-4 w-4" />
                                </button>
                                {onSelectFD ? (
                                  <button
                                    type="button"
                                    onClick={() => onSelectFD(f.fd_number)}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                      selectedCardFilter === 'renewal_dues'
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                    }`}
                                    title="Open and take action in Deposits Ledger"
                                  >
                                    {selectedCardFilter === 'renewal_dues' ? (
                                      <>
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Rollover</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Manage</span>
                                        <ArrowRight className="h-3 w-3" />
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onNavigate('fds')}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                                  >
                                    Ledger
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION PANEL FOR FILTER */}
                {cardFilterTotalPages > 1 && (
                  <div className="bg-slate-50/80 border-t border-slate-200/80 px-4 py-3 flex items-center justify-between">
                    <div className="text-[10px] text-slate-500 font-mono">
                      Showing <strong className="font-bold text-slate-700">{cardFilterStartIndex + 1}</strong> to <strong className="font-bold text-slate-700">{Math.min(cardFilterStartIndex + cardFilterPageSize, sortedCardFDs.length)}</strong> of <strong className="font-bold text-slate-700">{sortedCardFDs.length}</strong> records
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        disabled={cardFilterPage === 1}
                        onClick={() => setCardFilterPage(prev => Math.max(prev - 1, 1))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>
                      <button
                        disabled={cardFilterPage === cardFilterTotalPages}
                        onClick={() => setCardFilterPage(prev => Math.min(prev + 1, cardFilterTotalPages))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        );
      })()}

      {/* 3. Global Financial Ledger Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Financial Liabilities & Volumes */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-2xs border border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 font-sans">Consolidated Deposit Portfolio Ledger</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100/50">
                  <PiggyBank className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Active Principal</span>
                  <h4 className="text-xl font-mono font-bold text-slate-900 mt-0.5">₹{stats.totalActiveDepositAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Outstanding active deposits liability.</p>
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50">
                  <Scale className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Interest Liabilities</span>
                  <h4 className="text-xl font-mono font-bold text-emerald-600 mt-0.5">₹{stats.totalInterestLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Projected payout obligation at maturity.</p>
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4">
                <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
                  <Receipt className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Maturity Amount</span>
                  <h4 className="text-xl font-mono font-bold text-indigo-600 mt-0.5">₹{(stats.totalActiveDepositAmount + stats.totalInterestLiability).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Total payout receivable at maturity.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Quick graphical proportion meter */}
          <div className="mt-8 pt-6 border-t border-slate-200/80">
            <div className="flex justify-between items-center mb-2.5 text-xs">
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
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Active</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Renewed</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300 inline-block" /> Closed/Settled</span>
            </div>
          </div>
        </div>

        {/* Right Side: Total customers and action directory */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-2xs border border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-5 font-sans">Depositor database metrics</h3>
            
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-3 rounded-2xl text-slate-700">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Registered Holders</span>
                  <strong className="text-lg font-mono text-slate-900 block font-bold">{stats.totalCustomersCount} Accounts</strong>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Customers can instantly access their portfolio read-only dashboard using their mobile number and dynamic name-based passkey.
            </p>
          </div>

          <div className="space-y-3 mt-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Command Center Shortcuts</h4>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigate('qr')}
                className="p-3 bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer hover:bg-blue-50/30"
              >
                <QrCode className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xs font-bold text-slate-800 block">QR Validator</span>
              </button>

              <button
                onClick={() => onNavigate('reports')}
                className="p-3 bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer hover:bg-blue-50/30"
              >
                <FileBarChart className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xs font-bold text-slate-800 block">Report Center</span>
              </button>

              <button
                onClick={() => onNavigate('settings')}
                className="p-3 bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer col-span-2 hover:bg-blue-50/30"
              >
                <Settings2 className="h-4 w-4 text-blue-600 mb-1 inline" />
                <span className="text-xs font-bold text-slate-800 inline-block ml-1.5">System Master Configurations</span>
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
