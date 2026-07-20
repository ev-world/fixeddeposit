import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { DBCustomer, FDMaster } from '../types';
import { 
  Users, UserPlus, Eye, Edit, Trash2, Search, X, Check, Save, 
  RefreshCw, FileText, Landmark, User, HeartHandshake, ShieldAlert,
  HelpCircle, Calendar, MapPin, Phone, CreditCard, AlertTriangle
} from 'lucide-react';

interface CustomerManagementProps {
  onFDSelected: (fdNumber: string) => void;
  triggerAddForm: boolean;
  onFormClosed: () => void;
}

export default function CustomerManagement({ onFDSelected, triggerAddForm, onFormClosed }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [fds, setFds] = useState<FDMaster[]>([]);
  const [selectedCust, setSelectedCust] = useState<DBCustomer | null>(null);
  const [myFDs, setMyFDs] = useState<FDMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Omit<DBCustomer, 'id' | 'created_at'>>({
    name: '',
    relationship_type: 'S/O',
    father_husband_name: '',
    address: '',
    village: '',
    city: '',
    state: '',
    pincode: '',
    mobile_number: '',
    aadhaar_number: '',
    pan_number: '',
    dob: '',
    nominee_name: '',
    nominee_relation: '',
    nominee_mobile_number: '',
    bank_name: '',
    account_number: '',
    ifsc_code: ''
  });
  const [editId, setEditId] = useState('');
  const [formError, setFormError] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sync prop triggers
  useEffect(() => {
    if (triggerAddForm) {
      handleOpenNewForm();
    }
  }, [triggerAddForm]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const allCust = await db.getCustomers();
      const allFDs = await db.getFDs();
      setCustomers(allCust);
      setFds(allFDs);
      
      // Keep selected customer synced if we are updating
      if (selectedCust) {
        const updated = allCust.find(c => c.id === selectedCust.id);
        if (updated) {
          setSelectedCust(updated);
          setMyFDs(allFDs.filter(f => f.customer_id === updated.id));
        }
      } else if (allCust.length > 0) {
        setSelectedCust(allCust[0]);
        setMyFDs(allFDs.filter(f => f.customer_id === allCust[0].id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewForm = () => {
    setFormError('');
    setIsEditing(false);
    setFormData({
      name: '',
      relationship_type: 'S/O',
      father_husband_name: '',
      address: '',
      village: '',
      city: '',
      state: '',
      pincode: '',
      mobile_number: '',
      aadhaar_number: '',
      pan_number: '',
      dob: '',
      nominee_name: '',
      nominee_relation: '',
      nominee_mobile_number: '',
      bank_name: '',
      account_number: '',
      ifsc_code: ''
    });
    setShowForm(true);
  };

  const handleOpenEditForm = (cust: DBCustomer) => {
    setFormError('');
    setIsEditing(true);
    setEditId(cust.id);
    setFormData({
      name: cust.name,
      relationship_type: cust.relationship_type,
      father_husband_name: cust.father_husband_name,
      address: cust.address,
      village: cust.village || '',
      city: cust.city,
      state: cust.state,
      pincode: cust.pincode,
      mobile_number: cust.mobile_number,
      aadhaar_number: cust.aadhaar_number,
      pan_number: cust.pan_number,
      dob: cust.dob,
      nominee_name: cust.nominee_name,
      nominee_relation: cust.nominee_relation,
      nominee_mobile_number: cust.nominee_mobile_number,
      bank_name: cust.bank_name,
      account_number: cust.account_number,
      ifsc_code: cust.ifsc_code
    });
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    try {
      if (isEditing) {
        // Edit Customer
        const payload: DBCustomer = {
          ...formData,
          id: editId,
          created_at: customers.find(c => c.id === editId)?.created_at || new Date().toISOString()
        };
        await db.updateCustomer(payload);
      } else {
        // Create Customer
        await db.createCustomer(formData);
      }

      // Close and sync
      setShowForm(false);
      onFormClosed();
      await loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Verification check failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCust = (id: string) => {
    setConfirmDialog({
      show: true,
      title: 'Delete Customer Record',
      message: 'Are you sure you want to delete this customer record permanently? This will remove all personal details and cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, show: false }));
        setLoading(true);
        try {
          await db.deleteCustomer(id);
          setSelectedCust(null);
          await loadCustomers();
        } catch (err: any) {
          alert(err.message || 'Failed to delete customer profile.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSelectCust = (cust: DBCustomer) => {
    setSelectedCust(cust);
    setMyFDs(fds.filter(f => f.customer_id === cust.id));
  };

  // Filters
  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.mobile_number.includes(term) ||
      c.aadhaar_number.includes(term) ||
      c.pan_number.toLowerCase().includes(term)
    );
  });

  // Pagination calculation
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative">
      
      {/* --- FORM MODAL FOR NEW / EDIT CUSTOMER --- */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all duration-300">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center border-b border-slate-800 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserPlus className="text-blue-500 h-5 w-5" />
                  {isEditing ? 'Modify Depositor Profile' : 'Enroll New Fixed Deposit Depositor'}
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">Please ensure all identity documents are validated prior to database submission.</p>
              </div>
              <button 
                onClick={() => { setShowForm(false); onFormClosed(); }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <strong>Database Validation Error: {formError}</strong>
                </div>
              )}

              {/* 1. Demographics Section */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="h-4 w-4 text-blue-500" />
                  1. Depositor Demographics
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Full Name</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. RAMESH KUMAR"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Relation Type</label>
                    <div className="relative rounded-lg shadow-sm">
                      <select
                        value={formData.relationship_type}
                        onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value as any })}
                        className="block w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none cursor-pointer"
                      >
                        <option value="S/O">S/O (Son of)</option>
                        <option value="W/O">W/O (Wife of)</option>
                        <option value="D/O">D/O (Daughter of)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Father / Husband Name</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Users className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Fathers/Husbands Full Name"
                        value={formData.father_husband_name}
                        onChange={(e) => setFormData({ ...formData, father_husband_name: e.target.value.toUpperCase() })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Date of Birth</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Mobile Number</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="10-digit primary contact"
                        value={formData.mobile_number}
                        onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '') })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Aadhaar Document Number</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={12}
                        placeholder="12-digit Aadhaar Card"
                        value={formData.aadhaar_number}
                        onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value.replace(/\D/g, '') })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">PAN Document Number</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="10-digit Alphanumeric PAN"
                        value={formData.pan_number}
                        onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono uppercase transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Address Details Section */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  2. Residential Address Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Street / Plot / Area</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Village (Optional)</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={formData.village}
                        onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">City</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">State</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Pincode</label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Nominee & Bank Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Nominee Details */}
                <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                    <HeartHandshake className="h-4 w-4 text-blue-500" />
                    3. Nominee Designation
                  </h4>
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Nominee Full Name</label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.nominee_name}
                          onChange={(e) => setFormData({ ...formData, nominee_name: e.target.value.toUpperCase() })}
                          className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Relation</label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Users className="h-4 w-4" />
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Spouse, Son"
                            value={formData.nominee_relation}
                            onChange={(e) => setFormData({ ...formData, nominee_relation: e.target.value })}
                            className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Nominee Mobile</label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Phone className="h-4 w-4" />
                          </div>
                          <input
                            type="text"
                            required
                            maxLength={10}
                            value={formData.nominee_mobile_number}
                            onChange={(e) => setFormData({ ...formData, nominee_mobile_number: e.target.value.replace(/\D/g, '') })}
                            className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Account Details */}
                <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Landmark className="h-4 w-4 text-blue-500" />
                    4. Settlement Bank Account
                  </h4>
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Bank Name</label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="e.g. State Bank of India"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all duration-200 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Account Number</label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="Payout account"
                            value={formData.account_number}
                            onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                            className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all duration-200 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xxs font-bold text-slate-600 uppercase mb-1 tracking-wider">Bank IFSC Code</label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Check className="h-4 w-4" />
                          </div>
                          <input
                            type="text"
                            required
                            maxLength={11}
                            placeholder="e.g. SBIN0001234"
                            value={formData.ifsc_code}
                            onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                            className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono uppercase transition-all duration-200 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3.5 pt-6 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); onFormClosed(); }}
                  className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                  {isEditing ? 'Save Profile' : 'Enroll Depositor'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- CUSTOMER MASTER TABLE (8 cols on big desktop) --- */}
      <div className="xl:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
        
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-md font-bold text-slate-950 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Depositors Database
              </h3>
              <p className="text-xs text-slate-500">Master register of enrolled Fixed Deposit holders.</p>
            </div>
            
            <button
              onClick={handleOpenNewForm}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <UserPlus className="h-4 w-4 text-white" />
              Enroll Depositor
            </button>
          </div>

          {/* Search tool */}
          <div className="relative mb-5">
            <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name, Mobile, Aadhaar, PAN..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Grid Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-100 text-left">
              <thead>
                <tr className="text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="px-3.5 py-2.5">Holder name</th>
                  <th className="px-3.5 py-2.5">Mobile</th>
                  <th className="px-3.5 py-2.5">City</th>
                  <th className="px-3.5 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">No matching depositors found.</td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => handleSelectCust(c)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedCust?.id === c.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-3.5 py-3">
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">PAN: {c.pan_number}</span>
                      </td>
                      <td className="px-3.5 py-3 font-mono">{c.mobile_number}</td>
                      <td className="px-3.5 py-3">{c.city}</td>
                      <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => handleOpenEditForm(c)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCust(c.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Profile"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Pagination bar */}
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

      {/* --- SELECTED CUSTOMER PORTFOLIO & LEDGER (5 cols on big desktop) --- */}
      <div className="xl:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        
        {selectedCust ? (
          <div className="space-y-6 text-left">
            {/* Demographic card summary */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/50 p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-2">{selectedCust.name}</h3>
              <p className="text-xxs text-slate-400 font-mono">ID Reference: {selectedCust.id}</p>

              <div className="grid grid-cols-2 gap-4 text-xs mt-4">
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Relation</span>
                  <strong className="text-slate-800">{selectedCust.relationship_type} {selectedCust.father_husband_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">DOB / Age</span>
                  <strong className="text-slate-800">{selectedCust.dob}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Aadhaar Card</span>
                  <strong className="text-slate-800 font-mono">{selectedCust.aadhaar_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Nominee Person</span>
                  <strong className="text-slate-800">{selectedCust.nominee_name} ({selectedCust.nominee_relation})</strong>
                </div>
                <div className="col-span-2 border-t border-slate-200/60 pt-3">
                  <span className="text-slate-400 text-xxs uppercase tracking-wider block">Residential Address</span>
                  <span className="text-slate-800 text-xxs leading-relaxed block">
                    {selectedCust.address}, {selectedCust.village && selectedCust.village + ','} {selectedCust.city}, {selectedCust.state} - {selectedCust.pincode}
                  </span>
                </div>
              </div>
            </div>

            {/* Depositor Portal Passkey details */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 text-xxs text-slate-600 flex items-start gap-2.5">
              <KeyIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold mb-0.5">Depositor Portal Credentials</strong>
                <span>Username: <strong className="font-mono text-slate-950">{selectedCust.mobile_number}</strong></span>
                <span className="mx-2">|</span>
                <span>Password Code: <strong className="font-mono text-slate-950">
                  {selectedCust.name.substring(0, 4).charAt(0).toUpperCase() + selectedCust.name.substring(0, 4).slice(1).toLowerCase()}@123
                </strong></span>
              </div>
            </div>

            {/* FDs Ledger history subtable */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Customer Deposits Ledger
              </h4>

              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="min-w-full text-xxs font-medium text-left text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-3 py-2">FD Key</th>
                      <th className="px-3 py-2 text-right">Principal</th>
                      <th className="px-3 py-2 text-center">Rate</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myFDs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">No active Fixed Deposits registered for this customer.</td>
                      </tr>
                    ) : (
                      myFDs.map(f => (
                        <tr 
                          key={f.id}
                          onClick={() => onFDSelected(f.fd_number)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{f.fd_number}</td>
                          <td className="px-3 py-2.5 text-right font-mono">₹{f.deposit_amount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-center text-emerald-700 font-bold">{f.interest_rate.toFixed(2)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-block px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                              f.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                              f.status === 'Renewed' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {f.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank details card */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-slate-500" />
                Settlement Bank Account
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-xxs block">Settlement Bank</span>
                  <strong className="text-slate-800">{selectedCust.bank_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-xxs block">IFSC Code</span>
                  <strong className="text-slate-800 font-mono uppercase">{selectedCust.ifsc_code}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-xxs block">Account Payout Number</span>
                  <strong className="text-slate-800 font-mono">{selectedCust.account_number}</strong>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="py-24 text-center text-slate-400 text-xs">
            No depositor record selected.
          </div>
        )}

      </div>

      {/* Custom Confirmation Overlay Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-md z-[9999] flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
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
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-red-200 cursor-pointer transition-colors"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Micro SVG wrapper helpers
function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5 4a5 5 0 11-5-5h12m-2 4h.02" />
    </svg>
  );
}
