import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { FDMaster, DBCustomer } from '../types';
import { 
  FileText, Download, Printer, Search, Calendar, Landmark, 
  Percent, ArrowRight, ShieldCheck, HelpCircle, FileSpreadsheet
} from 'lucide-react';

interface ReportsProps {
  onOpenFD: (fdNumber: string) => void;
}

type ReportType = 
  | 'today' | 'monthly' | 'yearly' | 'active' | 'closed' 
  | 'premature' | 'renewed' | 'interest' | 'customer' | 'maturity_due';

export default function Reports({ onOpenFD }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('active');
  const [fds, setFds] = useState<FDMaster[]>([]);
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Report Specific Aggregations
  const [aggregatedTotal, setAggregatedTotal] = useState(0);
  const [aggregatedCount, setAggregatedCount] = useState(0);
  const [aggregatedInterest, setAggregatedInterest] = useState(0);

  useEffect(() => {
    fetchData();
  }, [activeReport]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allFDs = await db.getFDs();
      const allCustomers = await db.getCustomers();
      setFds(allFDs);
      setCustomers(allCustomers);
      calculateMetrics(allFDs, activeReport);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (allFDs: FDMaster[], reportType: ReportType) => {
    const filtered = getFilteredData(allFDs, reportType);
    const sum = filtered.reduce((acc, curr) => acc + curr.deposit_amount, 0);
    const interestLiability = filtered.reduce((acc, curr) => {
      // Compounded simple or maturity difference
      const diff = Math.max(0, curr.maturity_amount - curr.deposit_amount);
      return acc + diff;
    }, 0);
    
    setAggregatedTotal(sum);
    setAggregatedCount(filtered.length);
    setAggregatedInterest(interestLiability);
  };

  const getFilteredData = (allFDs: FDMaster[], type: ReportType): FDMaster[] => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7); // YYYY-MM
    const currentYear = todayStr.substring(0, 4);  // YYYY

    switch (type) {
      case 'today':
        return allFDs.filter(f => f.deposit_date === todayStr);
      case 'monthly':
        return allFDs.filter(f => f.deposit_date.startsWith(currentMonth));
      case 'yearly':
        return allFDs.filter(f => f.deposit_date.startsWith(currentYear));
      case 'active':
        return allFDs.filter(f => f.status === 'Active');
      case 'closed':
        return allFDs.filter(f => f.status === 'Closed');
      case 'premature':
        return allFDs.filter(f => f.status === 'Premature Closed');
      case 'renewed':
        return allFDs.filter(f => f.status === 'Renewed');
      case 'interest':
        // Show cumulative/interest liabilities
        return allFDs.filter(f => f.status === 'Active');
      case 'maturity_due':
        // Maturity date <= today, and still active
        return allFDs.filter(f => f.status === 'Active' && f.maturity_date <= todayStr);
      default:
        return allFDs;
    }
  };

  // Get matching customers list if customer report
  const getCustomerReportData = () => {
    return customers.map(c => {
      const custFDs = fds.filter(f => f.customer_id === c.id);
      const totalPlaced = custFDs.reduce((acc, curr) => acc + curr.deposit_amount, 0);
      const activeCount = custFDs.filter(f => f.status === 'Active').length;
      return {
        ...c,
        totalPlaced,
        activeCount,
        fdCount: custFDs.length
      };
    });
  };

  const getReportTitle = () => {
    switch (activeReport) {
      case 'today': return "Today's New Placements Audit";
      case 'monthly': return "Monthly Consolidated FD Ledger";
      case 'yearly': return "Yearly Placements Ledger";
      case 'active': return "Active Fixed Deposits Portfolio";
      case 'closed': return "Normally Closed Settlements";
      case 'premature': return "Premature Liquidations Ledger";
      case 'renewed': return "Renewed Rollovers History";
      case 'interest': return "Interest Liabilities Audit";
      case 'customer': return "Registered Depositors Demographics";
      case 'maturity_due': return "Overdue & Maturity Pending Claims";
      default: return "Fixed Deposit Ledger Auditing";
    }
  };

  const filteredReportFDs = getFilteredData(fds, activeReport).filter(f => {
    const term = searchTerm.toLowerCase();
    return (
      f.fd_number.toLowerCase().includes(term) ||
      f.customer_name.toLowerCase().includes(term) ||
      f.customer_mobile.includes(term)
    );
  });

  const filteredCustomerReport = getCustomerReportData().filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.mobile_number.includes(term) ||
      c.pan_number.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term)
    );
  });

  // Export to CSV (Excel compatible)
  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeReport === 'customer') {
      csvContent += "Customer ID,Customer Name,Mobile,PAN,Village/City,FDs Placed,Active FDs,Total Investment Value\r\n";
      filteredCustomerReport.forEach(c => {
        csvContent += `"${c.id}","${c.name}","${c.mobile_number}","${c.pan_number}","${c.city}","${c.fdCount}","${c.activeCount}","${c.totalPlaced}"\r\n`;
      });
    } else {
      csvContent += "Certificate No,Customer Holder,Mobile,Placement Date,Tenure (M),Interest Rate,Maturity Date,Principal Value,Maturity Value,Status\r\n";
      filteredReportFDs.forEach(f => {
        csvContent += `"${f.fd_number}","${f.customer_name}","${f.customer_mobile}","${f.deposit_date}","${f.tenure_months}","${f.interest_rate}%","${f.maturity_date}","${f.deposit_amount}","${f.maturity_amount}","${f.status}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `super_money_${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct PDF Print
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Sidebar Tabs selector */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Side: Report Filters Index */}
        <div className="xl:w-64 bg-white rounded-xl shadow-sm border border-slate-100 p-4 h-fit flex-shrink-0 space-y-1 no-print">
          <h4 className="text-xxs font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-3">Audits & Ledgers</h4>
          
          {[
            { id: 'today', label: "Today's Placements" },
            { id: 'monthly', label: "Monthly Register" },
            { id: 'yearly', label: "Yearly Register" },
            { id: 'active', label: "Active Portfolio" },
            { id: 'closed', label: "Closed Accounts" },
            { id: 'premature', label: "Premature Liquidations" },
            { id: 'renewed', label: "Renewed Rollovers" },
            { id: 'maturity_due', label: "Maturity Due Today" },
            { id: 'interest', label: "Interest Liabilities" },
            { id: 'customer', label: "Depositors Directory" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveReport(item.id as ReportType);
                setSearchTerm('');
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeReport === item.id 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{item.label}</span>
              <ArrowRight className="h-3 w-3 opacity-60" />
            </button>
          ))}
        </div>

        {/* Right Side: Analytical Board and Table */}
        <div className="flex-1 space-y-6">
          
          {/* Summary Dashboard Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xxs font-semibold uppercase tracking-wider">Deposits count</span>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-1">{aggregatedCount}</h3>
              </div>
              <FileText className="h-9 w-9 text-blue-500/10" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xxs font-semibold uppercase tracking-wider">Total volume placement</span>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-1">₹{aggregatedTotal.toLocaleString('en-IN')}</h3>
              </div>
              <Landmark className="h-9 w-9 text-emerald-500/10" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xxs font-semibold uppercase tracking-wider">Projected Interest Expense</span>
                <h3 className="text-2xl font-mono font-bold text-slate-900 mt-1">₹{aggregatedInterest.toLocaleString('en-IN')}</h3>
              </div>
              <Percent className="h-9 w-9 text-rose-500/10" />
            </div>
          </div>

          {/* Central Report Stage */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6" id="printable-report-area">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-xxs font-bold text-blue-600 uppercase tracking-widest block no-print">Super Money Fixed Deposit</span>
                <h2 className="text-lg font-bold text-slate-900 font-sans">{getReportTitle()}</h2>
                <p className="text-xxs text-slate-400 mt-0.5 print-only">Generated on: {new Date().toLocaleString()}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto no-print">
                <div className="relative flex-1 md:w-60">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search table records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Export to Excel Spreadsheet (.csv)"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel CSV
                </button>

                <button
                  onClick={handlePrintReport}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Print Report"
                >
                  <Printer className="h-4 w-4" />
                  Print/PDF
                </button>
              </div>
            </div>

            {/* Table stage */}
            {loading ? (
              <div className="py-24 text-center text-slate-400 font-sans text-xs">
                Recalculating and loading ledger...
              </div>
            ) : (
              <div className="overflow-x-auto">
                {activeReport === 'customer' ? (
                  <table className="min-w-full text-xs divide-y divide-slate-100">
                    <thead>
                      <tr className="text-slate-500 font-bold uppercase tracking-wider text-left bg-slate-50/50">
                        <th className="px-4 py-3">Customer Name</th>
                        <th className="px-4 py-3">Mobile Phone</th>
                        <th className="px-4 py-3">PAN Number</th>
                        <th className="px-4 py-3">Pincode & City</th>
                        <th className="px-4 py-3">FD Placements</th>
                        <th className="px-4 py-3 text-right">Investment Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredCustomerReport.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">No matching customer files discovered.</td>
                        </tr>
                      ) : (
                        filteredCustomerReport.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-3.5">
                              <div>
                                <span className="font-bold text-slate-900 block">{c.name}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{c.relationship_type} {c.father_husband_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono">{c.mobile_number}</td>
                            <td className="px-4 py-3.5 font-mono uppercase">{c.pan_number}</td>
                            <td className="px-4 py-3.5">{c.city} ({c.pincode})</td>
                            <td className="px-4 py-3.5 text-slate-600 font-mono">
                              <strong>{c.fdCount}</strong> certificates ({c.activeCount} active)
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                              ₹{c.totalPlaced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full text-xs divide-y divide-slate-100">
                    <thead>
                      <tr className="text-slate-500 font-bold uppercase tracking-wider text-left bg-slate-50/50">
                        <th className="px-4 py-3">Receipt Key</th>
                        <th className="px-4 py-3">Depositor Name</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3">Placement Date</th>
                        <th className="px-4 py-3">Maturity Date</th>
                        <th className="px-4 py-3">Tenure</th>
                        <th className="px-4 py-3">Rate</th>
                        <th className="px-4 py-3 text-right">Principal Amount</th>
                        <th className="px-4 py-3 text-right">Maturity Amount</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredReportFDs.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-12 text-slate-400">No matching Fixed Deposits logged in this category.</td>
                        </tr>
                      ) : (
                        filteredReportFDs.map(f => (
                          <tr key={f.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-3.5 font-mono font-bold text-blue-700">{f.fd_number}</td>
                            <td className="px-4 py-3.5">
                              <div>
                                <span className="font-bold text-slate-900 block">{f.customer_name}</span>
                                {f.parent_fd_number && (
                                  <span className="text-[9px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono inline-block mt-0.5" title="Renewed child">
                                    Child of {f.parent_fd_number}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono">{f.customer_mobile}</td>
                            <td className="px-4 py-3.5 font-mono">{f.deposit_date}</td>
                            <td className="px-4 py-3.5 font-mono">{f.maturity_date}</td>
                            <td className="px-4 py-3.5 text-slate-500">{f.tenure_months} Mo</td>
                            <td className="px-4 py-3.5 text-emerald-700 font-bold">{f.interest_rate.toFixed(2)}%</td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                              ₹{f.deposit_amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                              ₹{f.maturity_amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                f.status === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                f.status === 'Renewed' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                                f.status === 'Closed' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                                'bg-red-50 text-red-800 border border-red-100'
                              }`}>
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
