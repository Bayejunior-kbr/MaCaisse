import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical,
  Edit2,
  Trash2,
  X,
  User as UserIcon,
  Wallet,
  History,
  DollarSign,
  Receipt
} from 'lucide-react';
import { Customer, User, Sale, CustomerPayment } from '../types';
import { secureFetch } from '../lib/api';
import { cn, formatCurrency } from '../lib/utils';
import { ConfirmModal } from '../components/ConfirmModal';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<{ sales: Sale[], payments: CustomerPayment[] }>({ sales: [], payments: [] });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await secureFetch('/api/customers');
      if (!res.ok) throw new Error("Erreur clients");
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const res = await secureFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || ''
    });
    setShowModal(true);
  };

  const handleShowPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount(customer.total_debt?.toString() || '0');
    setShowPaymentModal(true);
  };

  const handleShowHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const res = await secureFetch(`/api/customers/${customer.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        setShowHistoryModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const res = await secureFetch(`/api/customers/${selectedCustomer.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          notes: paymentNotes
        })
      });
      if (res.ok) {
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await secureFetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
        setConfirmDeleteId(null);
      } else {
        const data = await res.json();
        alert(`Erreur: ${data.error || 'Impossible de supprimer le client'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur lors de la suppression du client");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  if (user?.plan !== 'premium') {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <UserIcon size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Gestion Clientèle Premium</h2>
        <p className="text-slate-500 max-w-md mb-8">
          La gestion de base de données clients est une fonctionnalité exclusive de ShopMaster Pro Premium. 
          Suivez vos clients fidèles, gérez leurs crédits et améliorez votre relation client.
        </p>
        <button 
          onClick={() => window.location.href = '/subscription'}
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm"
        >
          Passer à Premium
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clients</h2>
          <p className="text-slate-500">Gérez votre base de données clients</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <UserPlus size={18} />
          Nouveau Client
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un client..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dette</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">Chargement...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">Aucun client trouvé</td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone size={12} />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Mail size={12} />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin size={12} />
                      {customer.address || 'Non renseignée'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "text-sm font-bold",
                      (customer.total_debt || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {formatCurrency(customer.total_debt || 0, user?.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(customer.total_debt || 0) > 0 && (
                        <button 
                          onClick={() => handleShowPayment(customer)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Enregistrer un paiement"
                        >
                          <Wallet size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleShowHistory(customer)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Historique"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(customer)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(customer.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-slate-500">Chargement...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Aucun client trouvé</div>
          ) : filteredCustomers.map((customer) => (
            <div key={customer.id} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg flex-shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{customer.name}</h4>
                  <span className={cn(
                    "text-xs font-black whitespace-nowrap",
                    (customer.total_debt || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                  )}>
                    {formatCurrency(customer.total_debt || 0, user?.currency)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Phone size={10} />
                      {customer.phone}
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin size={10} />
                      {customer.address}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 mt-3">
                  {(customer.total_debt || 0) > 0 && (
                    <button 
                      onClick={() => handleShowPayment(customer)}
                      className="text-amber-600 text-[10px] font-black uppercase flex items-center gap-1"
                    >
                      <Wallet size={12} /> Payer
                    </button>
                  )}
                  <button 
                    onClick={() => handleShowHistory(customer)}
                    className="text-blue-600 text-[10px] font-black uppercase flex items-center gap-1"
                  >
                    <History size={12} /> Historique
                  </button>
                  <button 
                    onClick={() => handleEdit(customer)}
                    className="text-slate-500 text-[10px] font-black uppercase flex items-center gap-1"
                  >
                    <Edit2 size={12} /> Editer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Enregistrer un Paiement</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-4">
                <p className="text-xs text-rose-600 font-bold uppercase mb-1">Dette Actuelle</p>
                <p className="text-2xl font-black text-rose-700">{formatCurrency(selectedCustomer.total_debt || 0, user?.currency)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant versé</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required
                    type="number" 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode de Paiement</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Espèces</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="bank">Virement Bancaire</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes (Optionnel)</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Historique : {selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500">Ventes et paiements récents</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Receipt size={16} className="text-blue-500" />
                  Ventes à crédit
                </h4>
                <div className="space-y-3">
                  {history.sales.map(sale => (
                    <div key={sale.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-700">Vente #{sale.id}</p>
                        <p className="text-[10px] text-slate-400">{new Date(sale.created_at).toLocaleString('fr-FR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(sale.total_amount, user?.currency)}</p>
                        <p className={cn(
                          "text-[10px] font-bold",
                          sale.payment_status === 'paid' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {sale.payment_status === 'paid' ? 'Payé' : sale.payment_status === 'partial' ? 'Partiel' : 'Dette'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {history.sales.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucune vente enregistrée</p>}
                </div>
              </section>

              <section>
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Wallet size={16} className="text-emerald-500" />
                  Paiements reçus
                </h4>
                <div className="space-y-3">
                  {history.payments.map(payment => (
                    <div key={payment.id} className="p-4 bg-emerald-50/50 rounded-2xl flex items-center justify-between border border-emerald-100">
                      <div>
                        <p className="text-sm font-bold text-emerald-700">Paiement reçu</p>
                        <p className="text-[10px] text-slate-400">{new Date(payment.created_at).toLocaleString('fr-FR')}</p>
                        {payment.notes && <p className="text-[10px] text-slate-500 italic mt-1">{payment.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">+{formatCurrency(payment.amount, user?.currency)}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{payment.payment_method}</p>
                      </div>
                    </div>
                  ))}
                  {history.payments.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucun paiement enregistré</p>}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                {editingCustomer ? 'Modifier le Client' : 'Nouveau Client'}
              </h3>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingCustomer(null);
                  setFormData({ name: '', phone: '', email: '', address: '' });
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nom Complet</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                ></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        loading={isDeleting}
        title="Supprimer le client"
        message="Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible."
      />
    </div>
  );
}
