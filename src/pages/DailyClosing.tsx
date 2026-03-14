import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  DollarSign, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Printer, 
  Download,
  AlertCircle
} from 'lucide-react';
import { secureFetch } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface ClosingReport {
  date: string;
  salesByMethod: { payment_method: string; total: number; count: number }[];
  expenses: { category: string; total: number }[];
  totalSales: number;
  totalExpenses: number;
  netCash: number;
}

export default function DailyClosing() {
  const [report, setReport] = useState<ClosingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchReport();
  }, [selectedDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await secureFetch(`/api/reports/daily-closing?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Error fetching closing report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    if (!report) return;

    const summaryData = [
      { 'Libellé': 'Total Ventes', 'Valeur': report.totalSales },
      { 'Libellé': 'Total Dépenses', 'Valeur': report.totalExpenses },
      { 'Libellé': 'Profit Net du Jour', 'Valeur': report.netCash }
    ];

    const salesData = report.salesByMethod.map(s => ({
      'Mode de Paiement': s.payment_method === 'cash' ? 'Espèces' : 'Mobile Money',
      'Nombre de Ventes': s.count,
      'Total': s.total
    }));

    const expensesData = report.expenses.map(e => ({
      'Catégorie': e.category,
      'Total': e.total
    }));

    const workbook = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Résumé");

    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, wsSales, "Ventes par Mode");

    const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(workbook, wsExpenses, "Dépenses par Catégorie");

    XLSX.writeFile(workbook, `Cloture_Caisse_${selectedDate}.xlsx`);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center justify-center md:justify-start gap-3">
            <ClipboardCheck className="text-emerald-600 w-8 h-8 md:w-10 md:h-10" />
            Clôture de Caisse
          </h1>
          <p className="text-slate-500 text-sm md:text-base">Résumé financier quotidien pour la clôture.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
          <div className="relative flex-1 md:flex-none min-w-[160px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
              title="Imprimer"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={exportToExcel}
              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all active:scale-95"
              title="Exporter Excel"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Chargement du rapport...</div>
      ) : report ? (
        <div className="space-y-8 print:space-y-4">
          {/* Print Header */}
          <div className="hidden print:block text-center mb-8 border-b pb-4">
            <h2 className="text-2xl font-bold uppercase">{user?.shopName}</h2>
            <p className="text-sm">RAPPORT DE CLÔTURE DE CAISSE</p>
            <p className="font-mono text-lg mt-2">{format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <ArrowUpCircle size={20} />
                </div>
                <p className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Total Ventes</p>
              </div>
              <p className="text-3xl font-black text-emerald-600">
                {formatCurrency(report.totalSales, user?.currency)}
              </p>
            </div>

            <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-red-600 text-white rounded-xl">
                  <ArrowDownCircle size={20} />
                </div>
                <p className="text-sm font-bold text-red-900 uppercase tracking-wider">Total Dépenses</p>
              </div>
              <p className="text-3xl font-black text-red-600">
                {formatCurrency(report.totalExpenses, user?.currency)}
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <DollarSign size={20} />
                </div>
                <p className="text-sm font-bold text-blue-900 uppercase tracking-wider">Net en Caisse</p>
              </div>
              <p className="text-3xl font-black text-blue-600">
                {formatCurrency(report.netCash, user?.currency)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Ventes par Mode</h3>
              </div>
              <div className="p-6 space-y-4">
                {report.salesByMethod.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Aucune vente aujourd'hui</p>
                ) : (
                  report.salesByMethod.map(s => (
                    <div key={s.payment_method} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div>
                        <p className="font-bold text-slate-800 uppercase text-xs tracking-wider">
                          {s.payment_method === 'cash' ? 'Espèces' : 'Mobile Money'}
                        </p>
                        <p className="text-xs text-slate-500">{s.count} transactions</p>
                      </div>
                      <p className="text-lg font-black text-slate-900">
                        {formatCurrency(s.total, user?.currency)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Dépenses par Catégorie</h3>
              </div>
              <div className="p-6 space-y-4">
                {report.expenses.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">Aucune dépense aujourd'hui</p>
                ) : (
                  report.expenses.map(e => (
                    <div key={e.category} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <p className="font-bold text-slate-800 uppercase text-xs tracking-wider">{e.category}</p>
                      <p className="text-lg font-black text-red-600">
                        {formatCurrency(e.total, user?.currency)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4 no-print">
            <AlertCircle className="text-amber-600 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-amber-900">Note de Clôture</h4>
              <p className="text-sm text-amber-800/70 leading-relaxed">
                Vérifiez que le montant "Net en Caisse" correspond bien à la somme physique présente dans votre tiroir-caisse et sur vos comptes Mobile Money avant de quitter la boutique.
              </p>
            </div>
          </div>

          <div className="hidden print:block mt-20 pt-8 border-t border-slate-200 text-center">
            <div className="grid grid-cols-2 gap-20">
              <div className="space-y-12">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Signature Gérant</p>
                <div className="border-b border-slate-300 w-full"></div>
              </div>
              <div className="space-y-12">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Signature Propriétaire</p>
                <div className="border-b border-slate-300 w-full"></div>
              </div>
            </div>
            <p className="text-[10px] text-slate-300 mt-12">Généré par ShopMaster Pro - {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">Erreur lors du chargement du rapport</div>
      )}
    </div>
  );
}
