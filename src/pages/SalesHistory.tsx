import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Calendar, 
  Download, 
  Eye, 
  ArrowLeft,
  User as UserIcon,
  Clock,
  X,
  Printer,
  FileText
} from 'lucide-react';
import { Sale, User } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { secureFetch } from '../lib/api';
import * as XLSX from 'xlsx';
import { useTranslation } from '../lib/translations';

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);

export default function SalesHistory() {
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchSales();
  }, []);

  const handleExportPDF = () => {
    if (user?.plan !== 'premium') {
      alert(t('premium_feature'));
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Autorisez les fenêtres pop-up pour exporter le rapport.');
      return;
    }
    const rows = filteredSales.map(sale => {
      const date = new Date(sale.created_at);
      return `<tr><td>#SALE-${String(sale.id).padStart(5, '0')}</td><td>${escapeHtml(date.toLocaleString())}</td><td>${escapeHtml(sale.userName || '')}</td><td>${escapeHtml(sale.customerName || t('guest_customer'))}</td><td>${escapeHtml(sale.payment_method || '')}</td><td class="amount">${escapeHtml(formatCurrency(sale.total_amount, sale.currency))}</td></tr>`;
    }).join('');
    const total = filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport des ventes - MaCaisse</title><style>
      body{font:14px Arial,sans-serif;color:#172b4d;margin:32px}h1{color:#044598;margin-bottom:4px}.meta{color:#64748b;margin-bottom:24px}table{width:100%;border-collapse:collapse}th,td{padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#eff6ff;color:#044598}.amount{text-align:right;white-space:nowrap}.total{text-align:right;font-size:18px;font-weight:bold;margin-top:20px}@media print{body{margin:12mm}}
      </style></head><body><h1>Rapport des ventes</h1><div class="meta">MaCaisse · ${new Date().toLocaleString()} · ${filteredSales.length} vente(s)</div><table><thead><tr><th>Référence</th><th>Date</th><th>Vendeur</th><th>Client</th><th>Paiement</th><th class="amount">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Aucune vente pour ces filtres.</td></tr>'}</tbody></table><div class="total">Total : ${escapeHtml(formatCurrency(total, user?.currency))}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const data = filteredSales.map(s => ({
      [t('sale_id')]: `#SALE-${s.id.toString().padStart(5, '0')}`,
      [t('date')]: new Date(s.created_at).toLocaleDateString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US'),
      [t('time')]: new Date(s.created_at).toLocaleTimeString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US'),
      [t('seller')]: s.userName,
      [t('customer')]: s.customerName || t('guest_customer'),
      [t('payment_method')]: s.payment_method === 'cash' ? t('cash') : t('mobile_money'),
      [t('total_amount')]: s.total_amount,
      ...(user?.role === 'owner' || user?.role === 'admin' ? { [t('total_profit')]: s.total_profit } : {}),
      [t('tax')]: s.tax_amount,
      [t('discount')]: s.discount_amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('sales'));
    XLSX.writeFile(workbook, `${t('sales')}_MaCaisse_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleViewDetails = async (saleId: number) => {
    setModalLoading(true);
    setShowModal(true);
    try {
      const res = await secureFetch(`/api/sales/${saleId}`);
      if (!res.ok) throw new Error(t('error'));
      const data = await res.json();
      setSelectedSale(data);
    } catch (err) {
      console.error(err);
      alert(t('error'));
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const getInvoiceHTML = (sale: Sale) => `
    <html>
      <head>
        <title>${t('invoice')} - ${sale.shopName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A4; margin: 20mm; }
          @media print {
            body { padding: 0; margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body class="bg-white text-slate-800 font-sans">
        <div class="max-w-[210mm] mx-auto p-8">
          <!-- Header -->
          <div class="flex justify-between items-start mb-12">
            <div>
              ${sale.logo_url ? `<img src="${sale.logo_url}" class="h-20 w-auto mb-4 object-contain" />` : ''}
              <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">${sale.shopName}</h1>
              <p class="text-slate-500 text-sm">Solutions de Gestion Intelligente</p>
            </div>
            <div class="text-right">
              <h2 class="text-5xl font-black text-slate-200 uppercase mb-4">${t('invoice').toUpperCase()}</h2>
              <div class="space-y-1 text-sm">
                <p><span class="font-bold text-slate-400 uppercase mr-2">${t('invoice')} N°:</span> <span class="font-mono">#INV-${sale.id.toString().padStart(6, '0')}</span></p>
                <p><span class="font-bold text-slate-400 uppercase mr-2">${t('date')}:</span> ${new Date(sale.created_at || '').toLocaleDateString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}</p>
                <p><span class="font-bold text-slate-400 uppercase mr-2">${t('seller')}:</span> ${sale.userName}</p>
              </div>
            </div>
          </div>

          <!-- Info Grid -->
          <div class="grid grid-cols-2 gap-12 mb-12">
            <div>
              <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">${t('customer')}</h3>
              ${sale.customerName ? `
                <p class="text-xl font-bold text-slate-900 mb-1">${sale.customerName}</p>
                <p class="text-slate-600">${sale.customerPhone || ''}</p>
                <p class="text-slate-600">${sale.customerAddress || ''}</p>
              ` : `<p class="text-slate-400 italic">${t('guest_customer')}</p>`}
            </div>
            <div>
              <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">${t('payment_method')}</h3>
              <p class="text-lg font-bold text-slate-900 uppercase">${sale.payment_method === 'cash' ? t('cash') : t('mobile_money')}</p>
            </div>
          </div>

          <!-- Table -->
          <table class="w-full mb-12">
            <thead>
              <tr class="border-b-2 border-slate-900">
                <th class="py-4 text-left text-xs font-black text-slate-900 uppercase tracking-widest">${t('description')}</th>
                <th class="py-4 text-center text-xs font-black text-slate-900 uppercase tracking-widest">${t('quantity')}</th>
                <th class="py-4 text-right text-xs font-black text-slate-900 uppercase tracking-widest">${t('unit_price')}</th>
                <th class="py-4 text-right text-xs font-black text-slate-900 uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${sale.items?.map(item => `
                <tr>
                  <td class="py-6">
                    <p class="font-bold text-slate-900">${item.productName}</p>
                  </td>
                  <td class="py-6 text-center text-slate-600">${item.quantity}</td>
                  <td class="py-6 text-right text-slate-600">${formatCurrency(item.unit_price, sale.currency)}</td>
                  <td class="py-6 text-right font-bold text-slate-900">${formatCurrency(item.unit_price * item.quantity, sale.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end">
            <div class="w-72 space-y-3">
              <div class="flex justify-between text-slate-500">
                <span class="font-bold uppercase text-xs tracking-widest">${t('subtotal')}</span>
                <span class="font-bold">${formatCurrency((sale.total_amount || 0) + (sale.discount_amount || 0) - (sale.tax_amount || 0), sale.currency)}</span>
              </div>
              ${sale.tax_amount ? `
                <div class="flex justify-between text-slate-500">
                  <span class="font-bold uppercase text-xs tracking-widest">${t('tax')}</span>
                  <span class="font-bold">${formatCurrency(sale.tax_amount, sale.currency)}</span>
                </div>
              ` : ''}
              ${sale.discount_amount ? `
                <div class="flex justify-between text-rose-500">
                  <span class="font-bold uppercase text-xs tracking-widest">${t('discount')}</span>
                  <span class="font-bold">-${formatCurrency(sale.discount_amount, sale.currency)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                <span class="font-black uppercase text-sm tracking-widest text-slate-900">${t('net_total')}</span>
                <span class="text-2xl font-black text-emerald-600">${formatCurrency(sale.total_amount || 0, sale.currency)}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="mt-24 pt-8 border-t border-slate-100 text-center">
            <p class="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">${sale.receipt_footer || t('thanks_trust')}</p>
            <p class="text-slate-300 text-[10px]">Généré par MaCaisse - Votre partenaire de croissance</p>
          </div>
        </div>
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const getReceiptHTML = (sale: Sale) => `
    <html>
      <head>
        <title>${t('receipt')} - MaCaisse</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { padding: 0; margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="p-4 max-w-[80mm] mx-auto text-slate-800 font-mono text-[10px]">
          <div class="text-center mb-4">
            ${sale.logo_url ? `<img src="${sale.logo_url}" class="h-12 w-auto mx-auto mb-2 object-contain" />` : ''}
            <h2 class="text-sm font-bold uppercase">${sale.shopName}</h2>
            <p class="text-[8px] opacity-50 uppercase">${t('receipt')}</p>
          </div>

          <div class="border-t border-b border-dashed border-slate-300 py-2 mb-4">
            <div class="flex justify-between"><span>${t('receipt')}:</span> <span>#${sale.id.toString().padStart(5, '0')}</span></div>
            <div class="flex justify-between"><span>${t('date')}:</span> <span>${new Date(sale.created_at || '').toLocaleString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}</span></div>
            <div class="flex justify-between"><span>${t('seller')}:</span> <span>${sale.userName}</span></div>
            ${sale.customerName ? `<div class="flex justify-between"><span>${t('customer')}:</span> <span>${sale.customerName}</span></div>` : ''}
          </div>

          <table class="w-full mb-4">
            <thead>
              <tr class="border-b border-slate-200">
                <th class="text-left py-1">${t('item')}</th>
                <th class="text-center py-1">${t('quantity')}</th>
                <th class="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              ${sale.items?.map(item => `
                <tr>
                  <td class="py-1">${item.productName}</td>
                  <td class="py-1 text-center">x${item.quantity}</td>
                  <td class="py-1 text-right">${formatCurrency(item.unit_price * item.quantity, sale.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="space-y-1 border-t border-slate-200 pt-2 mb-4">
            <div class="flex justify-between"><span>${t('subtotal')}:</span> <span>${formatCurrency((sale.total_amount || 0) + (sale.discount_amount || 0) - (sale.tax_amount || 0), sale.currency)}</span></div>
            ${sale.tax_amount ? `<div class="flex justify-between"><span>${t('tax')}:</span> <span>${formatCurrency(sale.tax_amount, sale.currency)}</span></div>` : ''}
            ${sale.discount_amount ? `<div class="flex justify-between text-rose-500"><span>${t('discount')}:</span> <span>-${formatCurrency(sale.discount_amount, sale.currency)}</span></div>` : ''}
            <div class="flex justify-between font-bold text-sm pt-1 border-t border-slate-100">
              <span>TOTAL:</span>
              <span>${formatCurrency(sale.total_amount || 0, sale.currency)}</span>
            </div>
          </div>

          <div class="text-center mt-6">
            <p class="italic mb-1">${sale.receipt_footer || t('thanks_trust')}</p>
            <p class="text-[6px] opacity-30">MaCaisse POS System</p>
          </div>
        </div>
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const handlePrintInvoice = () => {
    if (!selectedSale) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow) {
      printWindow.document.write(getInvoiceHTML(selectedSale));
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedSale) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow) {
      printWindow.document.write(getReceiptHTML(selectedSale));
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const fetchSales = async () => {
    try {
      const res = await secureFetch('/api/sales/history');
      if (!res.ok) throw new Error("Erreur historique");
      const data = await res.json();
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredSales = sales.filter(s => {
    const matchesQuery = !query ||
      s.userName?.toLowerCase().includes(query) ||
      s.customerName?.toLowerCase().includes(query) ||
      String(s.id).includes(query) ||
      s.payment_method?.toLowerCase().includes(query) ||
      s.payment_status?.toLowerCase().includes(query);
    const date = new Date(s.created_at);
    const localDate = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    return matchesQuery && (!selectedDate || localDate === selectedDate);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('sales_history')}</h2>
          <p className="text-slate-500">{t('sales_history_desc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium flex items-center gap-2">
            <Calendar size={18} className="shrink-0 text-slate-500" />
            <input type="date" aria-label={t('filter_by_date')} value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="min-w-0 bg-transparent text-sm outline-none" />
            {selectedDate && <button type="button" onClick={() => setSelectedDate('')} aria-label="Effacer la date" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>}
          </div>
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Excel
          </button>
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-[#044598] text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-[#033879] transition-colors flex items-center gap-2"
          >
            <FileText size={18} />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('search_sales')} 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('sale_id')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('date')} & {t('time')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('seller')} / {t('customer')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('payment_method')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('total_amount')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">{t('loading')}...</td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">{t('no_sales_found')}</td>
                </tr>
              ) : filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-400">#SALE-{sale.id.toString().padStart(5, '0')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-sm">{new Date(sale.created_at).toLocaleString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <UserIcon size={10} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{sale.userName}</span>
                      </div>
                      {sale.customerName && (
                        <span className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-wider">{t('customer')}: {sale.customerName}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      sale.payment_method === 'cash' 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {sale.payment_method === 'cash' ? t('cash') : t('mobile')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {formatCurrency(sale.total_amount, user?.currency)}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                    <button 
                      onClick={() => handleViewDetails(sale.id)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title={t('view_details')}
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-slate-500">{t('loading')}...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-10 text-center text-slate-500">{t('no_sales_found')}</div>
          ) : filteredSales.map((sale) => (
            <div key={sale.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold text-slate-400">#SALE-{sale.id.toString().padStart(5, '0')}</span>
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                    sale.payment_method === 'cash' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {sale.payment_method === 'cash' ? t('cash') : t('mobile')}
                  </span>
                </div>
                <div className="font-bold text-slate-800 text-sm truncate">{sale.userName}</div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                  <Clock size={10} />
                  {new Date(sale.created_at).toLocaleString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}
                </div>
                {sale.customerName && (
                  <div className="text-[9px] text-emerald-600 font-bold mt-1 uppercase">{t('customer')}: {sale.customerName}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-black text-slate-900 text-base">
                  {formatCurrency(sale.total_amount, user?.currency)}
                </div>
                <button 
                  onClick={() => handleViewDetails(sale.id)}
                  className="mt-2 px-3 py-1 bg-slate-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-slate-100"
                >
                  {t('view_details')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sale Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-emerald-600" />
                {t('sale_details')} #{selectedSale?.id.toString().padStart(5, '0')}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
              ) : selectedSale && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('date')} & {t('time')}</p>
                      <p className="text-slate-700 font-medium">
                        {new Date(selectedSale.created_at).toLocaleString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('seller')}</p>
                      <p className="text-slate-700 font-medium">{selectedSale.userName}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('items_sold')}</p>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">{t('product')}</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">{t('quantity')}</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">{t('unit_price')}</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedSale.items?.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 text-sm text-slate-700 font-medium">{item.productName}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-center">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-right">
                                {formatCurrency(item.unit_price, selectedSale.currency)}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-800 font-bold text-right">
                                {formatCurrency(item.unit_price * item.quantity, selectedSale.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50/50">
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-right font-bold text-slate-500">TOTAL</td>
                            <td className="px-4 py-4 text-right font-black text-emerald-600 text-lg">
                              {formatCurrency(selectedSale.total_amount, selectedSale.currency)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Hidden Receipt for Printing */}
                  <div className="hidden">
                    <div ref={receiptRef} className="text-center font-sans text-slate-800">
                      {selectedSale.logo_url && (
                        <img 
                          src={selectedSale.logo_url} 
                          alt="Logo" 
                          className="w-16 h-16 mx-auto mb-4 object-contain"
                        />
                      )}
                      <h2 className="text-xl font-bold mb-1 uppercase">{selectedSale.shopName}</h2>
                      <p className="text-xs text-slate-500 mb-4">{t('receipt')} #{selectedSale.id.toString().padStart(5, '0')}</p>
                      
                      <div className="border-t border-b border-dashed border-slate-300 py-2 mb-4 text-left text-xs">
                        <p>{t('date')}: {new Date(selectedSale.created_at).toLocaleString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}</p>
                        <p>{t('seller')}: {selectedSale.userName}</p>
                      </div>

                      <table className="w-full text-left text-xs mb-4">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-1">{t('item')}</th>
                            <th className="py-1 text-center">{t('quantity')}</th>
                            <th className="py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSale.items?.map((item) => (
                            <tr key={item.id}>
                              <td className="py-1">{item.productName}</td>
                              <td className="py-1 text-center">x{item.quantity}</td>
                              <td className="py-1 text-right">{formatCurrency(item.unit_price * item.quantity, selectedSale.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="border-t border-slate-200 pt-2 mb-6">
                        <div className="flex justify-between font-bold text-sm">
                          <span>TOTAL</span>
                          <span>{formatCurrency(selectedSale.total_amount, selectedSale.currency)}</span>
                        </div>
                      </div>

                      {selectedSale.receipt_footer && (
                        <p className="text-[10px] text-slate-400 italic">{selectedSale.receipt_footer}</p>
                      )}
                      <p className="text-[8px] text-slate-300 mt-4">{t('thanks_trust')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                {t('close')}
              </button>
              <button 
                onClick={handlePrintReceipt}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                {t('receipt')}
              </button>
              <button 
                onClick={handlePrintInvoice}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
              >
                <FileText size={18} />
                {t('invoice')} A4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
