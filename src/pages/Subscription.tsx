import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  BrainCircuit,
  Loader2,
  X,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { SubscriptionTimer } from '../components/SubscriptionTimer';

export default function Subscription({ user, onUpdateUser }: { user: User, onUpdateUser: (user: User) => void }) {
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'card'>('wave');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [duration, setDuration] = useState<1 | 3 | 6 | 12>(1);
  const [requests, setRequests] = useState<any[]>([]);

  const durations = [
    { months: 1, price: 10000, label: '1 Mois' },
    { months: 3, price: 27000, label: '3 Mois', discount: '10%' },
    { months: 6, price: 50000, label: '6 Mois', discount: '15%' },
    { months: 12, price: 90000, label: '1 An', discount: '25%' },
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscription/my-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscription/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          plan: 'premium',
          duration_months: duration,
          payment_method: paymentMethod,
          phone_number: phoneNumber,
          transaction_ref: transactionRef
        })
      });
      if (res.ok) {
        setShowPaymentModal(false);
        setPhoneNumber('');
        setTransactionRef('');
        fetchRequests();
        alert("Votre demande a été envoyée ! Elle sera validée par l'administrateur après vérification du paiement.");
      } else {
        const data = await res.json();
        alert(data.error || "Une erreur est survenue lors de l'envoi de la demande.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const selectedDuration = durations.find(d => d.months === duration);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">ShopMaster Pro Premium</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Débloquez toute la puissance de l'IA et gérez votre boutique comme un professionnel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800">Version Gratuite</h3>
            <p className="text-slate-400 text-sm">Pour débuter</p>
          </div>
          <div className="text-3xl font-bold text-slate-800 mb-8">0 CFA <span className="text-sm font-normal text-slate-400">/ mois</span></div>
          
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-center gap-3 text-slate-600">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>Jusqu'à 50 produits</span>
            </li>
            <li className="flex items-center gap-3 text-slate-600">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <span>Ventes basiques</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400 line-through">
              <X size={18} />
              <span>Analyses IA avancées</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400 line-through">
              <X size={18} />
              <span>Multi-utilisateurs</span>
            </li>
          </ul>

          <button disabled className="w-full py-3 rounded-xl border border-slate-200 text-slate-400 font-bold">
            {user.plan === 'free' ? 'Plan actuel' : 'Inclus'}
          </button>
        </div>

        {/* Premium Plan */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-900/20 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-widest">
            Recommandé
          </div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white">Version Premium</h3>
            <p className="text-slate-400 text-sm">Pour les boutiques ambitieuses</p>
          </div>
          <div className="text-3xl font-bold text-white mb-8">
            {selectedDuration?.price.toLocaleString()} CFA 
            <span className="text-sm font-normal text-slate-400"> / {selectedDuration?.label}</span>
          </div>
          
          <div className="mb-8 space-y-3">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Choisir la durée</p>
            <div className="grid grid-cols-2 gap-2">
              {durations.map((d) => (
                <button
                  key={d.months}
                  onClick={() => setDuration(d.months as any)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                    duration === d.months 
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50" 
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                  )}
                >
                  {d.label}
                  {d.discount && <span className="ml-1 text-[8px] bg-amber-500 text-white px-1 rounded">-{d.discount}</span>}
                </button>
              ))}
            </div>
          </div>
          
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-center gap-3 text-slate-300">
              <Zap size={18} className="text-emerald-400" />
              <span>Produits illimités</span>
            </li>
            <li className="flex items-center gap-3 text-slate-300">
              <BrainCircuit size={18} className="text-emerald-400" />
              <span>Analyses IA illimitées</span>
            </li>
            <li className="flex items-center gap-3 text-slate-300">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span>Sauvegarde automatique</span>
            </li>
            <li className="flex items-center gap-3 text-slate-300">
              <BarChart3 size={18} className="text-emerald-400" />
              <span>Rapports PDF personnalisés</span>
            </li>
          </ul>

          {user.plan === 'premium' ? (
            <div className="space-y-4">
              <button disabled className="w-full py-3 rounded-xl border border-emerald-500/30 text-emerald-400 font-bold">
                Plan actuel
              </button>
              <div className="p-4 bg-emerald-900/20 rounded-2xl border border-emerald-500/20 text-center">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Temps restant</p>
                <SubscriptionTimer className="inline-flex" />
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/50"
            >
              Passer au Premium
            </button>
          )}
        </div>
      </div>

      {requests.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Historique des demandes</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {requests.map(req => (
              <div key={req.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 uppercase text-sm">{req.payment_method}</p>
                  <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                      <Clock size={12} />
                      En attente
                    </span>
                  )}
                  {req.status === 'approved' && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                      <CheckCircle2 size={12} />
                      Approuvé
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                      <AlertCircle size={12} />
                      Rejeté
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Paiement Manuel</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setPaymentMethod('wave')}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all",
                    paymentMethod === 'wave' ? "border-blue-500 bg-blue-50" : "border-slate-100"
                  )}
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">W</div>
                  <span className="text-[10px] font-bold text-slate-700">Wave</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('orange')}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all",
                    paymentMethod === 'orange' ? "border-orange-500 bg-orange-50" : "border-slate-100"
                  )}
                >
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">OM</div>
                  <span className="text-[10px] font-bold text-slate-700">Orange Money</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    "p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all",
                    paymentMethod === 'card' ? "border-emerald-500 bg-emerald-50" : "border-slate-100"
                  )}
                >
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">CB</div>
                  <span className="text-[10px] font-bold text-slate-700">Carte Bancaire</span>
                </button>
              </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Récapitulatif</p>
                    <p className="text-sm font-bold text-emerald-600">{selectedDuration?.price.toLocaleString()} CFA</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 uppercase font-bold tracking-wider">Instructions de paiement</p>
                
                {paymentMethod === 'wave' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-800">
                      Ouvrez votre application <strong>Wave</strong> et envoyez le montant exact au numéro ci-dessous :
                    </p>
                    <div className="bg-white p-4 rounded-xl border border-blue-100 text-center shadow-sm">
                      <p className="text-2xl font-bold text-blue-600 tracking-tighter">78 307 01 14</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">Marchand: ShopMaster Pro SN</p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'orange' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-800">
                      Composez le <strong>#144#</strong> ou utilisez l'application <strong>Orange Money</strong> :
                    </p>
                    <div className="bg-white p-4 rounded-xl border border-orange-100 text-center shadow-sm">
                      <p className="text-2xl font-bold text-orange-600 tracking-tighter">78 307 01 14</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">Code Marchand: 123456</p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-800">
                      Pour le paiement par <strong>Carte Bancaire</strong>, veuillez effectuer un virement ou dépôt :
                    </p>
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
                      <p className="text-sm font-bold text-slate-800">SN012 01234 0123456789 01</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">Banque: CBAO Groupe Attijariwafa Bank</p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic mt-4 bg-white/50 p-2 rounded-lg border border-slate-100">
                  * Une fois le paiement effectué, veuillez saisir la référence de transaction reçue par SMS pour confirmation.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Votre numéro de téléphone</label>
                  <input 
                    type="tel" 
                    placeholder="78 000 00 00"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Référence de transaction (ID)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: TR-123456789"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleRequest}
                disabled={loading || !phoneNumber || !transactionRef}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Envoyer ma demande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
