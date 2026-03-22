import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  Filter,
  Download,
  Upload,
  X,
  Loader2,
  Package
} from 'lucide-react';
import { Product, Category, Supplier } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { ConfirmModal } from '../components/ConfirmModal';

import { secureFetch } from '../lib/api';

import { useTranslation, Language } from '../lib/translations';

export default function Inventory() {
  const [user, setUser] = useState<any>(null);
  const { t } = useTranslation(user?.language as Language || 'fr');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'product' | 'category', id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    image_url: '',
    category_id: '',
    supplier_id: '',
    purchase_price: '0',
    sale_price: '0',
    quantity: '0',
    min_quantity: '5'
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        secureFetch('/api/products'),
        secureFetch('/api/categories'),
        secureFetch('/api/suppliers')
      ]);
      
      if (!pRes.ok || !cRes.ok || !sRes.ok) {
        throw new Error("Erreur lors de la récupération des données");
      }

      const pData = await pRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      
      setProducts(pData);
      setCategories(cData);
      setSuppliers(sData);
    } catch (err) {
      console.error("Inventory fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setUploading(true);

    let currentImageUrl = formData.image_url;

    // Convert image to base64 if a new file is selected
    if (selectedFile) {
      try {
        // Simple image compression using Canvas
        const compressImage = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress to JPEG with 0.7 quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
              };
              img.onerror = reject;
            };
            reader.onerror = reject;
          });
        };

        currentImageUrl = await compressImage(selectedFile);
      } catch (err) {
        console.error("Image processing error:", err);
        alert("Erreur lors du traitement de l'image. Essayez une image plus petite.");
        setUploading(false);
        return;
      }
    }

    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    // Auto-generate barcode if missing for new products
    let finalBarcode = formData.barcode;
    if (!editingProduct && !finalBarcode) {
      finalBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          barcode: finalBarcode || null,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
          purchase_price: parseFloat(formData.purchase_price) || 0,
          sale_price: parseFloat(formData.sale_price) || 0,
          quantity: parseInt(formData.quantity) || 0,
          min_quantity: parseInt(formData.min_quantity) || 0,
          image_url: currentImageUrl || null
        })
      });
      
      if (res.ok) {
        alert(editingProduct ? "Produit mis à jour avec succès !" : "Produit ajouté avec succès !");
        setIsModalOpen(false);
        setEditingProduct(null);
        setSelectedFile(null);
        setFormData({ name: '', barcode: '', image_url: '', category_id: '', supplier_id: '', purchase_price: '0', sale_price: '0', quantity: '0', min_quantity: '5' });
        fetchData();
      } else {
        const errorData = await res.json();
        console.error("Save product error:", errorData);
        alert(`Erreur: ${errorData.error || 'Une erreur est survenue lors de l\'enregistrement'}`);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        alert("Erreur de connexion au serveur. L'image est peut-être trop lourde pour Vercel (max 4.5MB).");
      } else {
        alert("Erreur de connexion au serveur : " + err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchData();
        setConfirmDelete(null);
      } else {
        const data = await res.json();
        alert(`Erreur: ${data.error || 'Impossible de supprimer le produit'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur lors de la suppression du produit");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchData();
        setConfirmDelete(null);
      } else {
        const data = await res.json();
        alert(`Erreur: ${data.error || 'Impossible de supprimer la catégorie'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur lors de la suppression de la catégorie");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName })
      });
      if (res.ok) {
        setIsCategoryModalOpen(false);
        setNewCategoryName('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const data = filteredProducts.map(p => ({
      'Nom': p.name,
      'Code-barres': p.barcode || 'N/A',
      'Catégorie': p.categoryName || 'Sans catégorie',
      'Fournisseur': p.supplierName || 'N/A',
      'Prix d\'Achat': p.purchase_price,
      'Prix de Vente': p.sale_price,
      'Quantité': p.quantity,
      'Stock Min': p.min_quantity,
      'Valeur Stock (Vente)': p.quantity * p.sale_price,
      'Profit Potentiel': p.quantity * (p.sale_price - p.purchase_price)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire");
    XLSX.writeFile(workbook, `Inventaire_ShopMaster_Pro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('inventory_management')}</h2>
          <p className="text-slate-500">{t('stock_alerts')}</p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <>
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Filter size={18} />
                {t('categories')}
              </button>
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  setFormData({ name: '', barcode: '', image_url: '', category_id: '', supplier_id: '', purchase_price: '0', sale_price: '0', quantity: '0', min_quantity: '5' });
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                {t('add_product')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('search_product')} 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToExcel}
              className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
              title={t('export_excel')}
            >
              <Download size={20} />
            </button>
            <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
              <Upload size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('product')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('category')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('sale_price')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('stock')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">{t('loading')}</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">{t('no_product_found')}</td>
                </tr>
              ) : filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-slate-100" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          <Package size={20} />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-800">{product.name}</div>
                        {(user?.role === 'owner' || user?.role === 'admin') && (
                          <div className="text-xs text-slate-400">P.A: {formatCurrency(product.purchase_price, user?.currency)}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                      {product.categoryName || 'Sans catégorie'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">
                    {formatCurrency(product.sale_price, user?.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        product.quantity <= product.min_quantity ? "text-red-600" : "text-slate-700"
                      )}>
                        {product.quantity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {product.quantity <= product.min_quantity ? (
                      <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
                        <AlertCircle size={14} />
                        {t('low_stock_badge')}
                      </div>
                    ) : (
                      <div className="text-emerald-600 text-xs font-bold">{t('in_stock')}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(user?.role === 'owner' || user?.role === 'admin') && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingProduct(product);
                              setFormData({
                                name: product.name,
                                barcode: product.barcode || '',
                                image_url: product.image_url || '',
                                category_id: product.category_id?.toString() || '',
                                supplier_id: product.supplier_id?.toString() || '',
                                purchase_price: product.purchase_price.toString(),
                                sale_price: product.sale_price.toString(),
                                quantity: product.quantity.toString(),
                                min_quantity: product.min_quantity.toString()
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => setConfirmDelete({ type: 'product', id: product.id })}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
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
            <div className="p-10 text-center text-slate-500">{t('loading')}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-slate-500">{t('no_product_found')}</div>
          ) : filteredProducts.map((product) => (
            <div key={product.id} className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{product.name}</h4>
                  <span className="text-sm font-black text-emerald-600 whitespace-nowrap">
                    {formatCurrency(product.sale_price, user?.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">
                    {product.categoryName || 'Sans catégorie'}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                    product.quantity <= product.min_quantity ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    Stock: {product.quantity}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-3 mt-3">
                  {(user?.role === 'owner' || user?.role === 'admin') && (
                    <>
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setFormData({
                            name: product.name,
                            barcode: product.barcode || '',
                            image_url: product.image_url || '',
                            category_id: product.category_id?.toString() || '',
                            supplier_id: product.supplier_id?.toString() || '',
                            purchase_price: product.purchase_price.toString(),
                            sale_price: product.sale_price.toString(),
                            quantity: product.quantity.toString(),
                            min_quantity: product.min_quantity.toString()
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 text-xs font-bold flex items-center gap-1"
                      >
                        <Edit2 size={14} /> {t('edit')}
                      </button>
                      <button 
                        onClick={() => setConfirmDelete({ type: 'product', id: product.id })}
                        className="text-red-600 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 size={14} /> {t('delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editingProduct ? t('edit_product') : t('add_product')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('product_name')}</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('barcode')}</label>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Scanner ou vide pour auto-générer"
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                        value={formData.barcode}
                        onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, barcode: Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')})}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-xs font-bold whitespace-nowrap"
                      >
                        {t('generate')}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Laissez vide pour générer automatiquement à l'enregistrement.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('product_image')}</label>
                <div className="flex items-center gap-3 p-3 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  {(selectedFile || formData.image_url) ? (
                    <img 
                      src={selectedFile ? URL.createObjectURL(selectedFile) : formData.image_url} 
                      alt="Preview" 
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
                      <Upload size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <input 
                  type="url" 
                  placeholder="https://exemple.com/image.jpg"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 mt-2 text-sm"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('category')}</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">{t('select_category')}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('supplier')}</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  >
                    <option value="">{t('select_supplier')}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('initial_quantity')}</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('purchase_price')} ({user?.currency})</label>
                  <input 
                    type="number" 
                    min="0"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('sale_price')} ({user?.currency})</label>
                  <input 
                    type="number" 
                    min="0"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-emerald-800">{t('profit_per_product')}</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency((parseFloat(formData.sale_price) || 0) - (parseFloat(formData.purchase_price) || 0), user?.currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('min_stock_alert')}</label>
                <input 
                  type="number" 
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={uploading}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading && <Loader2 className="animate-spin" size={20} />}
                {editingProduct ? t('update_product') : t('save_product')}
              </button>
            </form>
          </div>
        </div>
      </div>
    )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">{t('manage_categories')}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
              <input 
                type="text" 
                required
                placeholder={t('new_category')}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button type="submit" className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700">
                <Plus size={24} />
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="font-medium text-slate-700">{c.name}</span>
                    <button 
                      onClick={() => setConfirmDelete({ type: 'category', id: c.id })}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Confirm Delete Modal */}
      <ConfirmModal 
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.type === 'product') handleDeleteProduct(confirmDelete.id);
          else if (confirmDelete?.type === 'category') handleDeleteCategory(confirmDelete.id);
        }}
        loading={isDeleting}
        title={confirmDelete?.type === 'product' ? t('confirm_delete_product') : t('confirm_delete_category')}
        message={confirmDelete?.type === 'product' 
          ? t('delete_product_warning') 
          : t('delete_category_warning')}
      />
    </div>
  );
}
