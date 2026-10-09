import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { SubscriptionTimer } from '../components/SubscriptionTimer';

type Duration = 1 | 3 | 6 | 12;
type PaymentMethod = 'wave' | 'orange' | 'card';

type SubscriptionRequest = {
  id: string | number;
  payment_method: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | string;
};

const durations: {
  months: Duration;
  price: number;
  label: string;
  saving?: string;
}[] = [
  { months: 1, price: 10000, label: '1 mois' },
  { months: 3, price: 27000, label: '3 mois', saving: '−10 %' },
  { months: 6, price: 50000, label: '6 mois', saving: '−17 %' },
  { months: 12, price: 90000, label: '1 an', saving: '−25 %' },
];

const formatPrice = (price: number) => price.toLocaleString('fr-FR');

export default function Subscription({
  user,
  onUpdateUser: _onUpdateUser,
}: {
  user: User;
  onUpdateUser: (user: User) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [duration, setDuration] = useState<Duration>(1);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);

  const selectedDuration = durations.find((item) => item.months === duration)!;

  useEffect(() => {
    void fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscription/my-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setRequests(await response.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRequest = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscription/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: 'premium',
          duration_months: duration,
          payment_method: paymentMethod,
          phone_number: phoneNumber,
          transaction_ref: transactionRef,
        }),
      });

      if (response.ok) {
        setShowPaymentModal(false);
        setPhoneNumber('');
        setTransactionRef('');
        void fetchRequests();
        alert(
          "Votre demande a été envoyée ! Elle sera validée par l'administrateur après vérification du paiement.",
        );
      } else {
        const data = await response.json();
        alert(data.error || "Une erreur est survenue lors de l'envoi de la demande.");
      }
    } catch (error) {
      console.error(error);
      alert('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const statusDetails = (status: string) => {
    if (status === 'approved') {
      return {
        label: 'Approuvé',
        icon: CheckCircle2,
        className: 'bg-blue-50 text-blue-700',
      };
    }
    if (status === 'rejected') {
      return {
        label: 'Rejeté',
        icon: AlertCircle,
        className: 'bg-red-50 text-red-700',
      };
    }
    return {
      label: 'En attente',
      icon: Clock,
      className: 'bg-amber-50 text-amber-700',
    };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#044598]">
            <Sparkles size={14} />
            OFFRES MACAISSE
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Choisissez votre formule
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Des outils simples pour mieux gérer votre boutique.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
          Votre formule actuelle :{' '}
          <strong className="text-slate-900">
            {user.plan === 'premium' ? 'Premium' : 'Gratuite'}
          </strong>
        </div>
      </motion.header>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-500">Pour commencer</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Formule gratuite</h2>
          </div>

          <p className="mb-5 text-3xl font-extrabold text-slate-900">
            0 <span className="text-base font-semibold text-slate-500">FCFA / mois</span>
          </p>

          <ul className="mb-5 grid gap-3 text-sm text-slate-600">
            {['Jusqu’à 50 produits', 'Ventes basiques'].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <Check size={17} className="shrink-0 text-[#044598]" />
                {feature}
              </li>
            ))}
            {['Analyses IA avancées', 'Multi-utilisateurs'].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-slate-400">
                <X size={16} className="shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <button
            disabled
            className="mt-auto w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-500"
          >
            {user.plan === 'free' ? 'Votre formule actuelle' : 'Formule incluse'}
          </button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="relative flex flex-col overflow-hidden rounded-2xl bg-[#08264d] p-5 text-white shadow-lg sm:p-6"
        >
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-blue-400/15 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-200">Pour aller plus loin</p>
              <h2 className="mt-1 text-xl font-bold">MaCaisse Premium</h2>
            </div>
            <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-950">
              Recommandé
            </span>
          </div>

          <div className="relative mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={selectedDuration.price}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-3xl font-extrabold"
              >
                {formatPrice(selectedDuration.price)}
              </motion.p>
            </AnimatePresence>
            <span className="pb-1 text-sm text-blue-200">
              FCFA / {selectedDuration.label}
            </span>
          </div>

          <div className="relative mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-200">
              Durée de l’abonnement
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {durations.map((item) => {
                const isSelected = duration === item.months;
                return (
                  <button
                    key={item.months}
                    type="button"
                    onClick={() => setDuration(item.months)}
                    aria-pressed={isSelected}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5',
                      isSelected
                        ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-md'
                        : 'border-white/15 bg-white/5 text-white hover:bg-white/10',
                    )}
                  >
                    <span className="block text-sm font-bold">{item.label}</span>
                    {item.saving && (
                      <span
                        className={cn(
                          'mt-0.5 block text-[10px] font-semibold',
                          isSelected ? 'text-slate-800' : 'text-blue-200',
                        )}
                      >
                        {item.saving}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="relative mt-5 grid gap-3 text-sm text-blue-50 sm:grid-cols-2">
            {[
              { icon: Zap, label: 'Produits illimités' },
              { icon: BrainCircuit, label: 'Analyses IA illimitées' },
              { icon: ShieldCheck, label: 'Sauvegarde automatique' },
              { icon: BarChart3, label: 'Rapports PDF personnalisés' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon size={16} className="shrink-0 text-amber-400" />
                {label}
              </li>
            ))}
          </ul>

          <div className="relative mt-5">
            {user.plan === 'premium' ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm font-bold text-blue-100">
                  Votre formule actuelle
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-3">
                  <span className="text-xs font-semibold text-blue-100">Temps restant</span>
                  <SubscriptionTimer className="inline-flex" />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Passer au Premium
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>
            )}
          </div>
        </motion.section>
      </div>

      {requests.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="font-bold text-slate-900">Historique des demandes</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {requests.map((request) => {
              const status = statusDetails(request.status);
              const StatusIcon = status.icon;

              return (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-bold capitalize text-slate-800">
                      {request.payment_method}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
                      status.className,
                    )}
                  >
                    <StatusIcon size={13} />
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fermer la fenêtre de paiement"
              className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowPaymentModal(false)}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-title"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#044598]">
                    MaCaisse Premium
                  </p>
                  <h2 id="payment-title" className="mt-1 text-xl font-extrabold text-slate-900">
                    Finaliser le paiement
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  aria-label="Fermer"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'wave', label: 'Wave', mark: 'W', color: 'blue' },
                    { id: 'orange', label: 'Orange Money', mark: 'OM', color: 'orange' },
                    { id: 'card', label: 'Carte bancaire', mark: 'CB', color: 'slate' },
                  ] as const
                ).map((method) => {
                  const active = paymentMethod === method.id;
                  const colorClass =
                    method.color === 'blue'
                      ? 'bg-blue-500'
                      : method.color === 'orange'
                        ? 'bg-orange-500'
                        : 'bg-[#044598]';
                  const selectedClass =
                    method.color === 'blue'
                      ? 'border-blue-400 bg-blue-50'
                      : method.color === 'orange'
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-[#044598] bg-blue-50';

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border p-3 transition hover:-translate-y-0.5',
                        active ? selectedClass : 'border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white',
                          colorClass,
                        )}
                      >
                        {method.mark}
                      </span>
                      <span className="text-center text-[10px] font-bold text-slate-700">
                        {method.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Abonnement de {selectedDuration.label}
                  </span>
                  <strong className="text-[#044598]">
                    {formatPrice(selectedDuration.price)} FCFA
                  </strong>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Instructions de paiement
                  </p>

                  {paymentMethod === 'wave' && (
                    <div className="rounded-lg border border-blue-100 bg-white p-3">
                      <p className="text-sm text-slate-700">
                        Envoyez le montant exact depuis votre application Wave :
                      </p>
                      <p className="mt-2 text-xl font-extrabold text-blue-600">78 307 01 14</p>
                      <p className="text-[10px] text-slate-500">
                        Marchand : MaCaisse
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'orange' && (
                    <div className="rounded-lg border border-orange-100 bg-white p-3">
                      <p className="text-sm text-slate-700">
                        Composez <strong>#144#</strong> ou utilisez l’application Orange Money :
                      </p>
                      <p className="mt-2 text-xl font-extrabold text-orange-600">78 307 01 14</p>
                      <p className="text-[10px] text-slate-500">
                        Code marchand : 123456
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="rounded-lg border border-blue-100 bg-white p-3">
                      <p className="text-sm text-slate-700">
                        Effectuez un virement ou dépôt bancaire :
                      </p>
                      <p className="mt-2 break-all text-sm font-extrabold text-slate-800">
                        SN012 01234 0123456789 01
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Banque : CBAO Groupe Attijariwafa Bank
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Après le paiement, indiquez la référence de transaction reçue pour
                  permettre la vérification.
                </p>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Numéro de téléphone
                  <span className="relative mt-1.5 block">
                    <Smartphone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="78 000 00 00"
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#044598] focus:ring-2 focus:ring-blue-100"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                    />
                  </span>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Référence de transaction
                  <span className="relative mt-1.5 block">
                    <CreditCard
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Ex. TR-123456789"
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#044598] focus:ring-2 focus:ring-blue-100"
                      value={transactionRef}
                      onChange={(event) => setTransactionRef(event.target.value)}
                    />
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleRequest()}
                disabled={loading || !phoneNumber.trim() || !transactionRef.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#044598] px-4 py-3 font-bold text-white transition hover:bg-[#033875] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  'Envoyer ma demande'
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}