import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  Filter,
  Calendar,
  Tag,
  DollarSign,
  AlertCircle,
  ArrowDownCircle,
  Download
} from 'lucide-react';
import { secureFetch } from '../lib/api';
import { Expense } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const EXPENSE_CATEGORIES = [
  'Loyer',
  'Électricité',
  'Eau',
  'Salaires',
  'Transport',
  'Marketing',
  'Fournitures',
  'Maintenance',
  'Impôts',
  'Autre'
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Autre',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await secureFetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await secureFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewExpense({
          title: '',
          amount: '',
          category: 'Autre',
          description: '',
          date: format(new Date(), 'yyyy-MM-dd')
        });
        fetchExpenses();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de l\'ajout de la dépense');
      }
    } catch (error) {
      alert('Erreur de connexion au serveur');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await secureFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses();
        setConfirmDeleteId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete expense error:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const exportToExcel = () => {
    const data = filteredExpenses.map(e => ({
      'Date': format(new Date(e.date), 'dd/MM/yyyy'),
      'Titre': e.title,
      'Catégorie': e.category,
      'Montant': e.amount,
      'Description': e.description || '',
      'Par': e.userName
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dépenses");
    XLSX.writeFile(workbook, `Depenses_ShopMaster_Pro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="text-emerald-600" />
            Gestion des Dépenses
          </h1>
          <p className="text-slate-500">Suivez vos charges fixes et variables pour un profit net réel.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={20} />
          Nouvelle Dépense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600">
              <ArrowDownCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Dépenses (Filtré)</p>
              <p className="text-2xl font-bold text-slate-900">
                {totalExpenses.toLocaleString()} <span className="text-sm font-normal opacity-60">FCFA</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-bottom border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher une dépense..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={exportToExcel}
              className="px-4 py-3 bg-white border border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
              title="Exporter en Excel"
            >
              <Download size={20} />
              Exporter
            </button>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
              >
                <option value="all">Toutes catégories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Titre</th>
                <th className="px-6 py-4 font-semibold">Catégorie</th>
                <th className="px-6 py-4 font-semibold">Montant</th>
                <th className="px-6 py-4 font-semibold">Par</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Chargement...</td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Aucune dépense trouvée</td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(new Date(expense.date), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{expense.title}</p>
                      {expense.description && (
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{expense.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">
                      -{expense.amount.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {expense.userName}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setConfirmDeleteId(expense.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-400">Chargement...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">Aucune dépense trouvée</div>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900">{expense.title}</p>
                    <p className="text-[10px] text-slate-500">
                      {format(new Date(expense.date), 'dd/MM/yyyy')} • {expense.category}
                    </p>
                  </div>
                  <p className="font-black text-red-600">
                    -{expense.amount.toLocaleString()} <span className="text-[10px]">FCFA</span>
                  </p>
                </div>
                {expense.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl italic">
                    {expense.description}
                  </p>
                )}
                <div className="flex justify-between items-center pt-2">
                  <p className="text-[10px] text-slate-400">Par: {expense.userName}</p>
                  <button
                    onClick={() => setConfirmDeleteId(expense.id)}
                    className="p-2 text-red-600 bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Nouvelle Dépense</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Titre</label>
                  <input
                    required
                    type="text"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    placeholder="Ex: Loyer Boutique"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Montant (FCFA)</label>
                    <input
                      required
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Date</label>
                    <input
                      required
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Catégorie</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Description (Optionnel)</label>
                  <textarea
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 mt-4"
                >
                  Enregistrer la dépense
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirm Delete Modal */}
      <ConfirmModal 
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDeleteExpense(confirmDeleteId)}
        loading={isDeleting}
        title="Supprimer la dépense"
        message="Voulez-vous vraiment supprimer cette dépense ? Cette action est irréversible."
      />
    </div>
  );
}
