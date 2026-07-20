import React, { useRef } from 'react';
import { FDMaster, DBCustomer, CompanySettings } from '../types';
import { Printer, Download, X, BadgeCheck, ShieldAlert } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

interface PrintReceiptProps {
  fd: FDMaster;
  customer: DBCustomer;
  settings: CompanySettings;
  onClose: () => void;
}

export default function PrintReceipt({ fd, customer, settings, onClose }: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatCurrencyForQR = (val: number) => {
    if (val % 1 === 0) {
      return '₹' + val.toLocaleString('en-IN');
    }
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const qrText = `----------------------------------------
SUPER MONEY FIXED DEPOSIT

FD No : ${fd.fd_number}

Name : ${customer.name}

Father Name : ${customer.father_husband_name}

Deposit Amount : ${formatCurrencyForQR(fd.deposit_amount)}

Interest Rate : ${fd.interest_rate.toFixed(2)}%

Deposit Date : ${fd.deposit_date}

Maturity Date : ${fd.maturity_date}

Maturity Amount : ${formatCurrencyForQR(fd.maturity_amount)}

----------------------------------------`;
  
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        #fd-receipt-print {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          transform: none !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          aspect-ratio: 1.414 !important;
          page-break-inside: avoid !important;
          border: 4px solid rgba(146, 64, 14, 0.4) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          margin: 0 auto !important;
          background-color: white !important;
        }
      }
    `,
  });

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 md:p-8">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-gray-100 overflow-hidden my-4">
        {/* Header toolbar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-500" />
              Fixed Deposit Receipt Preview
            </h2>
            <p className="text-xs text-slate-400">FD Number: {fd.fd_number} | A4 Half-Page Format</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handlePrint()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4 text-white" />
              Print Receipt
            </button>
            <button
              onClick={() => handlePrint()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-white" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Outer Receipt Stage */}
        <div className="p-8 bg-slate-100 flex justify-center items-center">
          {/* Printable half-page container */}
          <div 
            ref={printRef}
            id="fd-receipt-print"
            className="bg-amber-50/20 text-slate-900 font-sans p-6 rounded-lg shadow-md border-4 border-amber-800/40 relative overflow-hidden bg-white max-w-[800px] w-full"
            style={{ 
              backgroundImage: 'radial-gradient(#b45309 0.5px, transparent 0.5px), radial-gradient(#b45309 0.5px, #ffffff 0.5px)',
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 20px 20px',
              backgroundOpacity: 0.02,
              aspectRatio: '1.414', // Half of A4 aspect ratio 1.414 (A4 is 1:1.414)
            } as React.CSSProperties}
          >
            {/* Guilloche style border overlay */}
            <div className="absolute inset-2 border border-amber-800/20 pointer-events-none rounded"></div>
            <div className="absolute inset-3 border-2 border-amber-800/40 pointer-events-none rounded"></div>

            {/* Micro security background text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
              <span className="text-amber-900 text-7xl font-bold uppercase tracking-widest select-none rotate-12">
                SUPER MONEY SECURE
              </span>
            </div>

            {/* Content Body */}
            <div className="relative z-10 flex flex-col justify-between h-full">
              
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-amber-900/20 pb-4 mb-4">
                <div className="flex gap-4 items-center">
                  <div className="bg-gradient-to-br from-amber-600 to-amber-800 text-white p-2.5 rounded-lg shadow-sm">
                    {/* SVG bank logo */}
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-amber-900 font-sans uppercase">
                      {settings.company_name}
                    </h1>
                    <p className="text-xs text-slate-600 max-w-md line-clamp-1">
                      {settings.company_address}
                    </p>
                    <p className="text-xxs text-slate-500">
                      Email: {settings.email}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="inline-block bg-amber-100 text-amber-950 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border border-amber-300">
                    FD Certificate
                  </div>
                  <p className="text-xs font-mono font-bold text-amber-900 mt-1.5">{fd.fd_number}</p>
                  <p className="text-xxs text-slate-500">Date: {fd.deposit_date} {fd.deposit_time}</p>
                </div>
              </div>

              {/* Receipt Body Grid */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                {/* Left Side: Depositor Details (3 cols on desktop) */}
                <div className="col-span-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-xxs uppercase tracking-wider">Depositor Name</span>
                    <strong className="text-slate-900 font-semibold">{customer.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xxs uppercase tracking-wider">Relationship ({customer.relationship_type})</span>
                    <strong className="text-slate-900 font-semibold">{customer.father_husband_name}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-xxs uppercase tracking-wider">Residential Address</span>
                    <span className="text-slate-900 text-xxs block leading-relaxed max-w-md">
                      {customer.address}, {customer.village && customer.village + ','} {customer.city}, {customer.state} - {customer.pincode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xxs uppercase tracking-wider">Nominee Beneficiary</span>
                    <strong className="text-slate-900 font-semibold">{customer.nominee_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xxs uppercase tracking-wider">Nominee Relationship</span>
                    <strong className="text-slate-900 font-semibold">{customer.nominee_relation}</strong>
                  </div>
                </div>

                {/* Right Side: Quick Highlights */}
                <div className="col-span-1 bg-amber-50 border border-amber-900/10 p-2.5 rounded flex flex-col justify-between text-center">
                  <div>
                    <span className="text-amber-800 text-xxs font-semibold uppercase tracking-wider block">Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xxs font-bold uppercase mt-1 ${
                      fd.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      fd.status === 'Renewed' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {fd.status}
                    </span>
                  </div>
                  {fd.renew_count > 0 && (
                    <div className="mt-2 pt-1 border-t border-amber-900/10 text-xxs text-slate-600">
                      Renewed ({fd.renew_count}x)
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Terms Panel (Table Style) */}
              <div className="border border-amber-900/20 rounded overflow-hidden mb-4">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-amber-800/10 border-b border-amber-900/20 text-amber-900 font-bold uppercase text-xxs">
                      <th className="px-3 py-1.5 text-left font-semibold">Deposit Principal</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Tenure</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Interest Rate (P.A.)</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Interest Scheme</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-right">Maturity Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="divide-x divide-amber-900/10 font-medium">
                      <td className="px-3 py-2 text-slate-900 font-mono font-bold text-sm">
                        ₹{fd.deposit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-slate-800">{fd.tenure_months} Months</td>
                      <td className="px-3 py-2 text-emerald-700 font-bold">{fd.interest_rate.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-slate-800">{fd.interest_type}</td>
                      <td className="px-3 py-2 text-right text-amber-900 font-mono font-bold text-sm">
                        ₹{fd.maturity_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-t border-amber-900/10 text-xxs text-slate-500 bg-amber-50/50">
                      <td colSpan={2} className="px-3 py-1">
                        Placed on: <strong>{fd.deposit_date}</strong>
                      </td>
                      <td colSpan={3} className="px-3 py-1 text-right">
                        Maturity Date: <strong className="text-amber-950 text-xs">{fd.maturity_date}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Row: Terms & Signature QR */}
              <div className="grid grid-cols-4 gap-4 items-end pt-2 border-t border-amber-900/10">
                {/* Terms and conditions */}
                <div className="col-span-2 text-xxs text-slate-500 leading-relaxed pr-2">
                  <h4 className="font-semibold text-amber-900 uppercase text-[9px] mb-1">Receipt Terms & Verification</h4>
                  <div className="whitespace-pre-line text-[9px] scale-95 origin-left max-h-[64px] overflow-hidden">
                    {settings.terms_conditions}
                  </div>
                </div>

                {/* QR Code */}
                <div className="col-span-1 flex flex-col items-center justify-center border-l border-amber-900/10 px-2">
                  <img 
                    src={qrImageUrl} 
                    alt="Certificate QR Verification" 
                    className="h-24 w-24 bg-white border border-slate-200 p-2 rounded shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[8px] font-mono font-bold text-amber-900 mt-1 text-center leading-none">
                    SCAN TO VERIFY
                  </span>
                </div>

                {/* Authorized sign & seal */}
                <div className="col-span-1 flex flex-col justify-end items-center text-center h-full">
                  <div className="w-full relative flex flex-col items-center justify-center">
                    {/* Simulated Authorized Signature Stamp/Line */}
                    {settings.signature_url ? (
                      <img 
                        src={settings.signature_url} 
                        alt="Authorized Signature" 
                        className="h-9 object-contain mix-blend-multiply absolute -top-6"
                      />
                    ) : (
                      <div className="text-amber-800/20 font-serif italic text-sm absolute -top-5 rotate-[-4deg] font-bold">
                        Super Money FD Ltd
                      </div>
                    )}
                    <div className="w-full border-t border-slate-400 mt-5 pt-1">
                      <span className="text-[9px] font-semibold text-slate-700 uppercase block tracking-wider leading-none">
                        Authorized Sign
                      </span>
                      <span className="text-[8px] text-slate-400 block leading-none mt-1">
                        (With Bank Seal)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer tips */}
        <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center text-xs text-slate-500">
          <p className="flex items-center gap-1">
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            Verified secure receipt with anti-counterfeiting verification QR module.
          </p>
          <span className="font-mono text-[10px]">A4 Half (148 x 210 mm)</span>
        </div>
      </div>

      {/* Embedded CSS for Print Styling */}
      <style>{`
        @media print {
          /* Hide all elements on the body by default */
          body * {
            visibility: hidden !important;
          }
          
          /* Only show the print receipt container and its children */
          #fd-receipt-print,
          #fd-receipt-print * {
            visibility: visible !important;
          }
          
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #fd-receipt-print {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-width: 100% !important;
            border: 4px solid rgba(146, 64, 14, 0.4) !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
            margin: 0 auto !important;
            background-color: white !important;
            aspect-ratio: 1.414 !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          
          /* Ensure backgrounds of the receipt are printed (e.g. table header, highlights) */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
