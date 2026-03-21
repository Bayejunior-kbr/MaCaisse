import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Smartphone,
  Printer,
  CheckCircle2,
  X,
  Package,
  Camera,
  FileText,
  User as UserIcon,
  Percent,
  Receipt,
  Wallet,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Product, Sale, Customer } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import BarcodeScanner from '../components/BarcodeScanner';
import { secureFetch } from '../lib/api';
import { useTranslation, Language } from '../lib/translations';

interface CartItem extends Product {
  cartQuantity: number;
}

export default function POS() {
  const { t } = useTranslation(localStorage.getItem('language') as Language || 'fr');
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile' | 'debt'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'debt' | 'partial'>('paid');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [user, setUser] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showPremiumFeatures, setShowPremiumFeatures] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  const [showMobileCart, setShowMobileCart] = useState(false);

  // Sound effect for successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setShowPremiumFeatures(parsedUser.plan === 'premium');
    }
    fetchProducts();
    if (localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')!).plan === 'premium') {
      fetchCustomers();
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await secureFetch('/api/products');
      if (!res.ok) throw new Error(t('error'));
      const data = await res.json();
      setProducts(data.filter((p: Product) => p.quantity > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await secureFetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= product.quantity) return prev;
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, cartQuantity: item.cartQuantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // If user is typing in another input (like customer name), ignore
      if (isInput && target !== searchInputRef.current) {
        return;
      }

      const currentTime = Date.now();
      
      // Physical scanners are very fast (usually < 30ms between keys)
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) {
          const code = barcodeBuffer.current;
          const product = products.find(p => p.barcode === code);
          if (product) {
            addToCart(product);
            playBeep();
            setLastScannedProduct(product.name);
            setTimeout(() => setLastScannedProduct(null), 2000);
            setSearchTerm('');
            barcodeBuffer.current = '';
            e.preventDefault();
            
            // Keep focus on search input
            searchInputRef.current?.focus();
          }
        }
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }

      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products, addToCart]);

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.cartQuantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.quantity) return item;
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.cartQuantity), 0);
  const taxAmount = user?.show_tax ? subtotal * 0.18 : 0; // 18% VAT example
  const finalTotal = subtotal + taxAmount - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await secureFetch('/api/sales', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_amount: finalTotal,
          customer_id: selectedCustomer?.id,
          tax_amount: taxAmount,
          discount_amount: discount,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          amount_paid: paymentStatus === 'paid' ? finalTotal : amountPaid,
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.cartQuantity,
            unit_price: item.sale_price,
            product_name: item.name
          }))
        })
      });

      if (res.ok || res.status === 202) {
        const data = await res.json();
        
        if (res.status === 202) {
          // Offline mode
          const offlineSale = {
            id: Date.now(),
            created_at: new Date().toISOString(),
            total_amount: finalTotal,
            total_profit: 0, // Not calculated offline
            discount_amount: discount,
            tax_amount: taxAmount,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            amount_paid: paymentStatus === 'paid' ? finalTotal : amountPaid,
            userName: user?.name || 'Vendeur',
            shopName: user?.shopName || 'Ma Boutique',
            currency: user?.currency || 'FCFA',
            items: cart.map(item => ({
              productName: item.name,
              quantity: item.cartQuantity,
              unit_price: item.sale_price,
              total_price: item.sale_price * item.cartQuantity
            }))
          };
          setLastSale(offlineSale as any);
          alert("Vente enregistrée en mode hors-ligne. Elle sera synchronisée dès que la connexion sera rétablie.");
          setShowSuccess(true);
          setCart([]);
          setSelectedCustomer(null);
          setDiscount(0);
          fetchProducts();
          return;
        }

        const saleRes = await secureFetch(`/api/sales/${data.id}`);
        if (saleRes.ok) {
          const saleData = await saleRes.json();
          setLastSale(saleData);
        }
        setShowSuccess(true);
        setCart([]);
        setSelectedCustomer(null);
        setDiscount(0);
        fetchProducts();
      } else {
        const data = await res.json();
        alert(data.error || t('error'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintInvoice = () => {
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow && lastSale) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Facture - ${lastSale.shopName}</title>
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
              <div class="flex justify-between items-start mb-12">
                <div>
                  ${lastSale.logo_url ? `<img src="${lastSale.logo_url}" class="h-20 w-auto mb-4 object-contain" />` : ''}
                  <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">${lastSale.shopName}</h1>
                  <p class="text-slate-500 text-sm">Solutions de Gestion Intelligente</p>
                </div>
                <div class="text-right">
                  <h2 class="text-5xl font-black text-slate-200 uppercase mb-4">FACTURE</h2>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-bold text-slate-400 uppercase mr-2">N° Facture:</span> <span class="font-mono">#INV-${lastSale.id.toString().padStart(6, '0')}</span></p>
                    <p><span class="font-bold text-slate-400 uppercase mr-2">Date:</span> ${new Date(lastSale.created_at || '').toLocaleDateString('fr-FR')}</p>
                    <p><span class="font-bold text-slate-400 uppercase mr-2">Vendeur:</span> ${lastSale.userName}</p>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Client</h3>
                  ${lastSale.customerName ? `
                    <p class="text-xl font-bold text-slate-900 mb-1">${lastSale.customerName}</p>
                    <p class="text-slate-600">${lastSale.customerPhone || ''}</p>
                  ` : '<p class="text-slate-400 italic">Client de passage</p>'}
                </div>
                <div>
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Mode de Paiement</h3>
                  <p class="text-lg font-bold text-slate-900 uppercase">${lastSale.payment_method === 'cash' ? 'Espèces' : 'Mobile Money'}</p>
                </div>
              </div>

              <table class="w-full mb-12">
                <thead>
                  <tr class="border-b-2 border-slate-900">
                    <th class="py-4 text-left text-xs font-black text-slate-900 uppercase tracking-widest">Description</th>
                    <th class="py-4 text-center text-xs font-black text-slate-900 uppercase tracking-widest">Quantité</th>
                    <th class="py-4 text-right text-xs font-black text-slate-900 uppercase tracking-widest">Prix Unitaire</th>
                    <th class="py-4 text-right text-xs font-black text-slate-900 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${lastSale.items?.map(item => `
                    <tr>
                      <td class="py-6">
                        <p class="font-bold text-slate-900">${item.productName}</p>
                      </td>
                      <td class="py-6 text-center text-slate-600">${item.quantity}</td>
                      <td class="py-6 text-right text-slate-600">${formatCurrency(item.unit_price, lastSale.currency)}</td>
                      <td class="py-6 text-right font-bold text-slate-900">${formatCurrency(item.unit_price * item.quantity, lastSale.currency)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="flex justify-end">
                <div class="w-72 space-y-3">
                  <div class="flex justify-between text-slate-500">
                    <span class="font-bold uppercase text-xs tracking-widest">Sous-total</span>
                    <span class="font-bold">${formatCurrency((lastSale.total_amount || 0) + (lastSale.discount_amount || 0) - (lastSale.tax_amount || 0), lastSale.currency)}</span>
                  </div>
                  ${lastSale.tax_amount ? `
                    <div class="flex justify-between text-slate-500">
                      <span class="font-bold uppercase text-xs tracking-widest">TVA</span>
                      <span class="font-bold">${formatCurrency(lastSale.tax_amount, lastSale.currency)}</span>
                    </div>
                  ` : ''}
                  ${lastSale.discount_amount ? `
                    <div class="flex justify-between text-rose-500">
                      <span class="font-bold uppercase text-xs tracking-widest">Remise</span>
                      <span class="font-bold">-${formatCurrency(lastSale.discount_amount, lastSale.currency)}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                    <span class="font-black uppercase text-sm tracking-widest text-slate-900">Total Net</span>
                    <span class="text-2xl font-black text-emerald-600">${formatCurrency(lastSale.total_amount || 0, lastSale.currency)}</span>
                  </div>
                </div>
              </div>

              <div class="mt-24 pt-8 border-t border-slate-100 text-center">
                <p class="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">${lastSale.receipt_footer || 'Merci de votre confiance !'}</p>
                <p class="text-slate-300 text-[10px]">Généré par ShopMaster Pro</p>
              </div>
            </div>
            <script>
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handleDirectPrintInvoice = () => {
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow && lastSale) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Facture - ${lastSale.shopName}</title>
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
              <div class="flex justify-between items-start mb-12">
                <div>
                  ${lastSale.logo_url ? `<img src="${lastSale.logo_url}" class="h-20 w-auto mb-4 object-contain" />` : ''}
                  <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">${lastSale.shopName}</h1>
                  <p class="text-slate-500 text-sm">Solutions de Gestion Intelligente</p>
                </div>
                <div class="text-right">
                  <h2 class="text-5xl font-black text-slate-200 uppercase mb-4">FACTURE</h2>
                  <div class="space-y-1 text-sm">
                    <p><span class="font-bold text-slate-400 uppercase mr-2">N° Facture:</span> <span class="font-mono">#INV-${lastSale.id.toString().padStart(6, '0')}</span></p>
                    <p><span class="font-bold text-slate-400 uppercase mr-2">Date:</span> ${new Date(lastSale.created_at || '').toLocaleDateString('fr-FR')}</p>
                    <p><span class="font-bold text-slate-400 uppercase mr-2">Vendeur:</span> ${lastSale.userName}</p>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Client</h3>
                  ${lastSale.customerName ? `
                    <p class="text-xl font-bold text-slate-900 mb-1">${lastSale.customerName}</p>
                    <p class="text-slate-600">${lastSale.customerPhone || ''}</p>
                  ` : '<p class="text-slate-400 italic">Client de passage</p>'}
                </div>
                <div>
                  <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Mode de Paiement</h3>
                  <p class="text-lg font-bold text-slate-900 uppercase">${lastSale.payment_method === 'cash' ? 'Espèces' : 'Mobile Money'}</p>
                </div>
              </div>

              <table class="w-full mb-12">
                <thead>
                  <tr class="border-b-2 border-slate-900">
                    <th class="py-4 text-left text-xs font-black text-slate-900 uppercase tracking-widest">Description</th>
                    <th class="py-4 text-center text-xs font-black text-slate-900 uppercase tracking-widest">Quantité</th>
                    <th class="py-4 text-right text-xs font-black text-slate-900 uppercase tracking-widest">Prix Unitaire</th>
                    <th class="py-4 text-right text-xs font-black text-slate-900 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${lastSale.items?.map(item => `
                    <tr>
                      <td class="py-6">
                        <p class="font-bold text-slate-900">${item.productName}</p>
                      </td>
                      <td class="py-6 text-center text-slate-600">${item.quantity}</td>
                      <td class="py-6 text-right text-slate-600">${formatCurrency(item.unit_price, lastSale.currency)}</td>
                      <td class="py-6 text-right font-bold text-slate-900">${formatCurrency(item.unit_price * item.quantity, lastSale.currency)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="flex justify-end">
                <div class="w-72 space-y-3">
                  <div class="flex justify-between text-slate-500">
                    <span class="font-bold uppercase text-xs tracking-widest">Sous-total</span>
                    <span class="font-bold">${formatCurrency((lastSale.total_amount || 0) + (lastSale.discount_amount || 0) - (lastSale.tax_amount || 0), lastSale.currency)}</span>
                  </div>
                  ${lastSale.tax_amount ? `
                    <div class="flex justify-between text-slate-500">
                      <span class="font-bold uppercase text-xs tracking-widest">TVA</span>
                      <span class="font-bold">${formatCurrency(lastSale.tax_amount, lastSale.currency)}</span>
                    </div>
                  ` : ''}
                  ${lastSale.discount_amount ? `
                    <div class="flex justify-between text-rose-500">
                      <span class="font-bold uppercase text-xs tracking-widest">Remise</span>
                      <span class="font-bold">-${formatCurrency(lastSale.discount_amount, lastSale.currency)}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                    <span class="font-black uppercase text-sm tracking-widest text-slate-900">Total Net</span>
                    <span class="text-2xl font-black text-emerald-600">${formatCurrency(lastSale.total_amount || 0, lastSale.currency)}</span>
                  </div>
                </div>
              </div>

              <div class="mt-24 pt-8 border-t border-slate-100 text-center">
                <p class="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">${lastSale.receipt_footer || 'Merci de votre confiance !'}</p>
                <p class="text-slate-300 text-[10px]">Généré par ShopMaster Pro</p>
              </div>
            </div>
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handleDirectPrintReceipt = () => {
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow && lastSale) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${t('receipt')} - ShopMaster Pro</title>
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
                ${lastSale.logo_url ? `<img src="${lastSale.logo_url}" class="h-12 w-auto mx-auto mb-2 object-contain" />` : ''}
                <h2 class="text-sm font-bold uppercase">${lastSale.shopName}</h2>
                <p class="text-[8px] opacity-50">${t('receipt').toUpperCase()}</p>
              </div>

              <div class="border-t border-b border-dashed border-slate-300 py-2 mb-4">
                <div class="flex justify-between"><span>${t('ticket')}:</span> <span>#${lastSale.id.toString().padStart(5, '0')}</span></div>
                <div class="flex justify-between"><span>${t('date')}:</span> <span>${new Date(lastSale.created_at || '').toLocaleString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}</span></div>
                <div class="flex justify-between"><span>${t('seller')}:</span> <span>${lastSale.userName}</span></div>
                ${lastSale.customerName ? `<div class="flex justify-between"><span>${t('customer')}:</span> <span>${lastSale.customerName}</span></div>` : ''}
              </div>

              <table class="w-full mb-4">
                <thead>
                  <tr class="border-b border-slate-200">
                    <th class="text-left py-1">${t('item')}</th>
                    <th class="text-center py-1">${t('quantity')}</th>
                    <th class="text-right py-1">${t('total')}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  ${lastSale.items?.map(item => `
                    <tr>
                      <td class="py-1">${item.productName}</td>
                      <td class="py-1 text-center">x${item.quantity}</td>
                      <td class="py-1 text-right">${formatCurrency(item.unit_price * item.quantity, lastSale.currency)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="space-y-1 border-t border-slate-200 pt-2 mb-4">
                <div class="flex justify-between"><span>${t('subtotal')}:</span> <span>${formatCurrency((lastSale.total_amount || 0) + (lastSale.discount_amount || 0) - (lastSale.tax_amount || 0), lastSale.currency)}</span></div>
                ${lastSale.tax_amount ? `<div class="flex justify-between"><span>${t('tax')}:</span> <span>${formatCurrency(lastSale.tax_amount, lastSale.currency)}</span></div>` : ''}
                ${lastSale.discount_amount ? `<div class="flex justify-between text-rose-500"><span>${t('discount')}:</span> <span>-${formatCurrency(lastSale.discount_amount, lastSale.currency)}</span></div>` : ''}
                <div class="flex justify-between font-bold text-sm pt-1 border-t border-slate-100">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(lastSale.total_amount || 0, lastSale.currency)}</span>
                </div>
              </div>

              <div class="text-center mt-6">
                <p class="italic mb-1">${lastSale.receipt_footer || t('thanks_visit')}</p>
                <p class="text-[6px] opacity-30">${t('generated_by')}</p>
              </div>
            </div>
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handlePrintReceipt = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reçu - ShopMaster Pro</title>
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
                ${lastSale?.logo_url ? `<img src="${lastSale.logo_url}" class="h-12 w-auto mx-auto mb-2 object-contain" />` : ''}
                <h2 class="text-sm font-bold uppercase">${lastSale?.shopName}</h2>
                <p class="text-[8px] opacity-50">REÇU DE VENTE</p>
              </div>

              <div class="border-t border-b border-dashed border-slate-300 py-2 mb-4">
                <div class="flex justify-between"><span>Ticket:</span> <span>#${lastSale?.id.toString().padStart(5, '0')}</span></div>
                <div class="flex justify-between"><span>Date:</span> <span>${new Date(lastSale?.created_at || '').toLocaleString('fr-FR')}</span></div>
                <div class="flex justify-between"><span>Vendeur:</span> <span>${lastSale?.userName}</span></div>
                ${lastSale?.customerName ? `<div class="flex justify-between"><span>Client:</span> <span>${lastSale.customerName}</span></div>` : ''}
              </div>

              <table class="w-full mb-4">
                <thead>
                  <tr class="border-b border-slate-200">
                    <th class="text-left py-1">Item</th>
                    <th class="text-center py-1">Qté</th>
                    <th class="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  ${lastSale?.items?.map(item => `
                    <tr>
                      <td class="py-1">${item.productName}</td>
                      <td class="py-1 text-center">x${item.quantity}</td>
                      <td class="py-1 text-right">${formatCurrency(item.unit_price * item.quantity, lastSale.currency)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="space-y-1 border-t border-slate-200 pt-2 mb-4">
                <div class="flex justify-between"><span>Sous-total:</span> <span>${formatCurrency((lastSale?.total_amount || 0) + (lastSale?.discount_amount || 0) - (lastSale?.tax_amount || 0), lastSale?.currency)}</span></div>
                ${lastSale?.tax_amount ? `<div class="flex justify-between"><span>TVA:</span> <span>${formatCurrency(lastSale.tax_amount, lastSale.currency)}</span></div>` : ''}
                ${lastSale?.discount_amount ? `<div class="flex justify-between text-rose-500"><span>Remise:</span> <span>-${formatCurrency(lastSale.discount_amount, lastSale.currency)}</span></div>` : ''}
                <div class="flex justify-between font-bold text-sm pt-1 border-t border-slate-100">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(lastSale?.total_amount || 0, lastSale?.currency)}</span>
                </div>
              </div>

              <div class="text-center mt-6">
                <p class="italic mb-1">${lastSale?.receipt_footer || 'Merci de votre visite !'}</p>
                <p class="text-[6px] opacity-30">ShopMaster Pro POS System</p>
              </div>
            </div>
            <script>
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handleBarcodeScan = React.useCallback((code: string) => {
    const product = products.find(p => p.barcode === code);
    if (product) {
      addToCart(product);
      playBeep();
      setLastScannedProduct(product.name);
      setTimeout(() => setLastScannedProduct(null), 2000);
      setShowScanner(false);
    } else {
      alert(`${t('product')} "${code}" ${t('no_product_found')}.`);
    }
  }, [products, addToCart]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm) {
      const product = products.find(p => p.barcode === searchTerm);
      if (product) {
        addToCart(product);
        playBeep();
        setLastScannedProduct(product.name);
        setTimeout(() => setLastScannedProduct(null), 2000);
        setSearchTerm('');
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="h-full lg:h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4 overflow-hidden relative">
      {/* Products Selection */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300",
        showMobileCart ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t('catalogue')}</h2>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{t('select_products')}</p>
            </div>
            <button 
              onClick={() => setShowMobileCart(true)}
              className="lg:hidden relative p-2 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={t('search')} 
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all text-sm w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
            </div>
            <button 
              onClick={() => setShowScanner(true)}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
              title="Scanner"
            >
              <Camera size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin mb-3" size={32} />
              <p className="text-xs font-medium uppercase tracking-widest">{t('loading')}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Package size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">{t('no_products')}</p>
            </div>
          ) : filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white p-1.5 rounded-xl border border-slate-100 hover:border-emerald-500/30 hover:shadow-md transition-all text-left flex flex-col group active:scale-[0.98] relative"
            >
              <div className="aspect-square w-full bg-slate-50 rounded-lg overflow-hidden relative mb-1.5">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package size={20} />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-4">
                  <p className="text-[10px] font-bold text-white leading-none truncate">{formatCurrency(product.sale_price, user?.currency)}</p>
                </div>
                {product.quantity <= product.min_quantity && (
                  <div className="absolute top-1 right-1">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-sm" />
                  </div>
                )}
              </div>
              <div className="min-w-0 px-0.5">
                <h4 className="font-bold text-slate-800 text-[10px] line-clamp-1 leading-tight mb-0.5">{product.name}</h4>
                <p className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter">{t('stock')}: {product.quantity}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart / Checkout */}
      <div className={cn(
        "w-full lg:w-[420px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all duration-300",
        showMobileCart ? "flex h-full fixed inset-0 z-40 lg:relative lg:inset-auto lg:h-full" : "hidden lg:flex lg:h-full"
      )}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileCart(false)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-500"
            >
              <X size={20} />
            </button>
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-sm">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('cart')}</h3>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{cart.length} {t('item')}{cart.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={() => setCart([])}
              className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
            >
              {t('empty_cart')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-10">
              <ShoppingCart size={40} className="mb-3 opacity-20" />
              <p className="text-xs font-medium uppercase tracking-widest">{t('empty_cart')} {t('cart')}</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 border border-slate-100 group">
              <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-semibold text-slate-800 truncate">{item.name}</h5>
                <p className="text-emerald-600 font-bold text-xs">{formatCurrency(item.sale_price, user?.currency)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition-colors"><Minus size={12} /></button>
                  <span className="text-xs font-bold w-6 text-center text-slate-700">{item.cartQuantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors"><Plus size={12} /></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          {showPremiumFeatures && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="relative">
                <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select 
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500 transition-all appearance-none text-slate-700 uppercase"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === parseInt(e.target.value));
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <option value="">{t('guest_customer')}</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="number" 
                  placeholder={t('discount').toUpperCase()} 
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500 transition-all text-slate-700 placeholder:text-slate-300"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>{t('subtotal')}</span>
              <span className="text-slate-900">{formatCurrency(subtotal, user?.currency)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>{t('tax')} (18%)</span>
                <span className="text-slate-900">{formatCurrency(taxAmount, user?.currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-2 border-t border-slate-200">
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">{t('net_total')}</p>
                <h4 className="text-2xl font-bold text-slate-900">{formatCurrency(finalTotal, user?.currency)}</h4>
              </div>
              <div className="flex gap-1.5">
                {['cash', 'mobile', 'debt'].map((method) => (
                  <button
                    key={method}
                    disabled={method === 'debt' && !selectedCustomer}
                    onClick={() => {
                      setPaymentMethod(method as any);
                      setPaymentStatus(method === 'debt' ? 'debt' : 'paid');
                      if (method !== 'debt') setAmountPaid(0);
                    }}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                      paymentMethod === method 
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300",
                      method === 'debt' && !selectedCustomer && "opacity-20 cursor-not-allowed"
                    )}
                    title={method.toUpperCase()}
                  >
                    {method === 'cash' && <CreditCard size={14} />}
                    {method === 'mobile' && <Smartphone size={14} />}
                    {method === 'debt' && <Wallet size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {paymentMethod === 'debt' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{t('amount_paid')}</label>
                <span className="text-[10px] font-bold text-amber-500">{t('debt')}: {formatCurrency(finalTotal - amountPaid, user?.currency)}</span>
              </div>
              <input 
                type="number" 
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold outline-none focus:border-amber-500 text-slate-700"
                placeholder={t('amount_paid')}
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              />
            </motion.div>
          )}

          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCheckout}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-200 transition-all disabled:opacity-20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {isProcessing ? t('loading') : t('checkout')}
          </button>
        </div>
      </div>

      {/* Success Modal with Receipt */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowSuccess(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{t('sale_success')} !</h3>
            <p className="text-slate-500 mb-8">{t('success')}</p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handlePrintReceipt}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs"
                >
                  <Printer size={16} />
                  {t('receipt')}
                </button>
                <button 
                  onClick={handlePrintInvoice}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs"
                >
                  <FileText size={16} />
                  {t('invoice')} A4
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleDirectPrintReceipt}
                  className="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors text-[10px]"
                >
                  <Printer size={14} />
                  {t('print_receipt')} Direct
                </button>
                <button 
                  onClick={handleDirectPrintInvoice}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors text-[10px]"
                >
                  <Printer size={14} />
                  {t('print_invoice')} Direct
                </button>
              </div>
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                {t('new_sale')}
              </button>
            </div>

            {/* Hidden Receipt for Printing */}
            <div className="hidden">
              <div ref={receiptRef} className="text-center font-sans text-slate-800">
                {lastSale?.logo_url && (
                  <img 
                    src={lastSale.logo_url} 
                    alt="Logo" 
                    className="w-16 h-16 mx-auto mb-4 object-contain"
                  />
                )}
                <h2 className="text-xl font-bold mb-1 uppercase">{lastSale?.shopName}</h2>
                <p className="text-xs text-slate-500 mb-4">{t('receipt')} #{lastSale?.id.toString().padStart(5, '0')}</p>
                
                <div className="border-t border-b border-dashed border-slate-300 py-2 mb-4 text-left text-xs">
                  <p>{t('date')}: {lastSale?.created_at ? new Date(lastSale.created_at).toLocaleString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US') : ''}</p>
                  <p>{t('seller')}: {lastSale?.userName}</p>
                  {lastSale?.customerName && <p>{t('customer')}: {lastSale.customerName}</p>}
                </div>

                <table className="w-full text-left text-xs mb-4">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-1">{t('item')}</th>
                      <th className="py-1 text-center">{t('quantity')}</th>
                      <th className="py-1 text-right">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSale?.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1">{item.productName}</td>
                        <td className="py-1 text-center">x{item.quantity}</td>
                        <td className="py-1 text-right">{formatCurrency(item.unit_price * item.quantity, lastSale.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-slate-200 pt-2 mb-6 space-y-1">
                  <div className="flex justify-between text-[8px]">
                    <span>{t('subtotal')}</span>
                    <span>{formatCurrency((lastSale?.total_amount || 0) + (lastSale?.discount_amount || 0) - (lastSale?.tax_amount || 0), lastSale?.currency)}</span>
                  </div>
                  {lastSale?.tax_amount ? (
                    <div className="flex justify-between text-[8px]">
                      <span>{t('tax')}</span>
                      <span>{formatCurrency(lastSale.tax_amount, lastSale.currency)}</span>
                    </div>
                  ) : null}
                  {lastSale?.discount_amount ? (
                    <div className="flex justify-between text-[8px]">
                      <span>{t('discount')}</span>
                      <span>-{formatCurrency(lastSale.discount_amount, lastSale.currency)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-100">
                    <span>TOTAL</span>
                    <span>{formatCurrency(lastSale?.total_amount || 0, lastSale?.currency)}</span>
                  </div>
                </div>

                {lastSale?.receipt_footer && (
                  <p className="text-[10px] text-slate-400 italic">{lastSale.receipt_footer}</p>
                )}
                <p className="text-[8px] text-slate-300 mt-4">{t('thanks_trust')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
}
