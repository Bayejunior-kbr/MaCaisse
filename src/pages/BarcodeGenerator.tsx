import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Barcode as BarcodeIcon, 
  Printer, 
  Search, 
  Package, 
  Download, 
  Settings, 
  Check,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import { secureFetch } from '../lib/api';
import { Product } from '../types';

export default function BarcodeGenerator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Label Settings
  const [settings, setSettings] = useState({
    width: 2,
    height: 60,
    fontSize: 14,
    margin: 10,
    displayValue: true,
    showPrice: true,
    showName: true,
    showShopName: true,
    format: 'CODE128' as 'CODE128' | 'EAN13' | 'UPC'
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await secureFetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        setError("Impossible de charger les produits.");
      }
    } catch (err) {
      setError("Erreur lors du chargement des produits.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Impression Étiquette - ${selectedProduct?.name}</title>
          <style>
            body { 
              margin: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh;
              font-family: sans-serif;
            }
            .label-container {
              padding: 20px;
              border: 1px dashed #ccc;
              text-align: center;
              display: inline-block;
            }
            @media print {
              body { height: auto; }
              .label-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadSVG = () => {
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `barcode-${selectedProduct?.barcode || 'product'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarcodeIcon className="text-emerald-600" />
            Générateur de Codes-Barres
          </h1>
          <p className="text-slate-500 mt-2">
            Générez et imprimez des étiquettes professionnelles pour vos produits.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Product Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-50 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-emerald-500" />
                Sélectionner un Produit
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Chargement...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Aucun produit trouvé</div>
              ) : (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      selectedProduct?.id === product.id 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "hover:bg-slate-50 text-slate-600 border border-transparent"
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-bold text-sm truncate max-w-[180px]">{product.name}</p>
                      <p className="text-xs opacity-70">Code: {product.barcode || 'N/A'}</p>
                    </div>
                    {selectedProduct?.id === product.id ? (
                      <Check size={16} className="text-emerald-600" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-300" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Preview & Settings */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {selectedProduct ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Preview Card */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      title="Paramètres"
                    >
                      <Settings size={20} />
                    </button>
                  </div>

                  <div ref={printRef} className="bg-white p-6 rounded-lg text-center flex flex-col items-center gap-2">
                    {settings.showShopName && (
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {user.shopName || "ShopMaster Pro"}
                      </p>
                    )}
                    {settings.showName && (
                      <p className="font-bold text-slate-800 mb-1">{selectedProduct.name}</p>
                    )}
                    
                    {selectedProduct.barcode ? (
                      <Barcode 
                        value={selectedProduct.barcode}
                        format={settings.format}
                        width={settings.width}
                        height={settings.height}
                        fontSize={settings.fontSize}
                        margin={settings.margin}
                        displayValue={settings.displayValue}
                      />
                    ) : (
                      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                        <AlertCircle className="mx-auto text-amber-500" size={32} />
                        <p className="text-sm font-medium text-amber-800">
                          Ce produit n'a pas de code-barres.
                        </p>
                        <button
                          onClick={async () => {
                            const newBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
                            try {
                              const res = await fetch(`/api/products/${selectedProduct.id}`, {
                                method: 'PUT',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({
                                  ...selectedProduct,
                                  barcode: newBarcode
                                })
                              });
                              if (res.ok) {
                                setSelectedProduct({ ...selectedProduct, barcode: newBarcode });
                                fetchProducts();
                              }
                            } catch (err) {
                              console.error("Error updating barcode:", err);
                            }
                          }}
                          className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
                        >
                          Générer un code maintenant
                        </button>
                      </div>
                    )}

                    {settings.showPrice && (
                      <p className="text-lg font-black text-emerald-600 mt-1">
                        {selectedProduct.sale_price.toLocaleString()} FCFA
                      </p>
                    )}
                  </div>

                  <div className="mt-10 flex flex-wrap justify-center gap-4">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <Printer size={20} />
                      Imprimer l'étiquette
                    </button>
                    <button
                      onClick={downloadSVG}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                      <Download size={20} />
                      Télécharger SVG
                    </button>
                  </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-hidden"
                  >
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Settings size={18} className="text-slate-400" />
                      Personnalisation de l'étiquette
                    </h4>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Format</label>
                        <select
                          value={settings.format}
                          onChange={(e) => setSettings({...settings, format: e.target.value as any})}
                          className="w-full p-2 bg-slate-50 rounded-lg text-sm border-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="CODE128">Code 128 (Standard)</option>
                          <option value="EAN13">EAN-13 (International)</option>
                          <option value="UPC">UPC (USA)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Largeur Barres</label>
                        <input
                          type="range" min="1" max="4" step="1"
                          value={settings.width}
                          onChange={(e) => setSettings({...settings, width: parseInt(e.target.value)})}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Hauteur</label>
                        <input
                          type="range" min="20" max="150" step="5"
                          value={settings.height}
                          onChange={(e) => setSettings({...settings, height: parseInt(e.target.value)})}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showPrice"
                          checked={settings.showPrice}
                          onChange={(e) => setSettings({...settings, showPrice: e.target.checked})}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="showPrice" className="text-sm font-medium text-slate-700">Afficher le prix</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showName"
                          checked={settings.showName}
                          onChange={(e) => setSettings({...settings, showName: e.target.checked})}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="showName" className="text-sm font-medium text-slate-700">Afficher le nom</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showShop"
                          checked={settings.showShopName}
                          onChange={(e) => setSettings({...settings, showShopName: e.target.checked})}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="showShop" className="text-sm font-medium text-slate-700">Afficher la boutique</label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center min-h-[400px]"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 text-slate-300">
                  <BarcodeIcon size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Aucun produit sélectionné</h3>
                <p className="text-slate-500 max-w-sm">
                  Choisissez un produit dans la liste à gauche pour générer son code-barres et son étiquette de prix.
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                  <Info size={14} />
                  Astuce: Assurez-vous que vos produits ont un SKU valide.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
