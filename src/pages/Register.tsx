import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { Store, User as UserIcon, Mail, Lock, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Register({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [step, setStep] = useState(1); // 1: Details, 2: Verification
  const [formData, setFormData] = useState({
    shopName: '',
    name: '',
    email: '',
    password: '',
    code: '',
  });
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(formData.password);
  const strengthColor = [
    'bg-slate-200',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-emerald-500'
  ][strength];

  const strengthText = [
    '',
    'Très faible',
    'Faible',
    'Moyen',
    'Fort',
    'Très fort'
  ][strength];

  const handleSendCode = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.email || !formData.shopName || !formData.name || !formData.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    if (strength < 3) {
      setError('Le mot de passe est trop faible.');
      return;
    }

    if (step === 2) setResendLoading(true);
    else setLoading(true);
    
    setError('');
    try {
      const res = await fetch('/api/auth/send-registration-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setSuccess('Un code de vérification a été envoyé à votre adresse email.');
      } else {
        setError(data.error || 'Erreur lors de l\'envoi du code.');
      }
    } catch (err: any) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || 'Erreur lors de l\'inscription.');
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || 'Erreur d\'inscription Google');
      }
    } catch (err: any) {
      console.error("Google register error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('Le popup a été bloqué par votre navigateur.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Ce domaine n\'est pas autorisé pour l\'authentification Google.');
      } else {
        setError(`Erreur lors de l'inscription Google: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 mx-auto mb-6">
            <Store size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {step === 1 ? 'Créer votre boutique' : 'Vérification Email'}
          </h1>
          <p className="text-slate-500 mt-2">
            {step === 1 ? 'Rejoignez ShopMaster Pro aujourd\'hui' : 'Entrez le code envoyé par email'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex flex-col gap-2">
            <div>{error}</div>
            {error.includes("SMTP") && (
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/auth/test-email');
                    const data = await res.json();
                    if (data.success) {
                      setSuccess(data.message);
                      setError('');
                    } else {
                      setError(`Erreur SMTP: ${data.details}. ${data.hint}`);
                    }
                  } catch (e) {
                    setError('Erreur lors du test de connexion.');
                  }
                }}
                className="text-xs font-bold underline text-left"
              >
                Tester la configuration email
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nom de la boutique</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50 text-slate-900"
                  placeholder="Ma Boutique"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Votre Nom</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50 text-slate-900"
                  placeholder="Prénom Nom"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50 text-slate-900"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50 text-slate-900"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1.5 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level}
                        className={`flex-1 rounded-full transition-all duration-500 ${
                          level <= strength ? strengthColor : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    strength <= 2 ? 'text-red-500' : strength <= 3 ? 'text-orange-500' : 'text-emerald-500'
                  }`}>
                    Force: {strengthText}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
              Continuer
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 text-center">Code de vérification</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50 text-center text-2xl font-black tracking-[0.5em] text-slate-900"
                  placeholder="000000"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <p className="text-xs text-slate-500 text-center mt-4">
                Le code a été envoyé à <span className="font-bold text-slate-700">{formData.email}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Vérifier et créer mon compte
            </button>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={resendLoading || loading}
                onClick={handleSendCode}
                className="w-full text-emerald-600 font-bold text-sm hover:underline disabled:opacity-50"
              >
                {resendLoading ? 'Envoi en cours...' : 'Renvoyer le code'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors"
              >
                Modifier mes informations
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest text-slate-400">
                <span className="px-4 bg-white">Ou s'inscrire avec</span>
              </div>
            </div>

            <button
              onClick={handleGoogleRegister}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Google
            </button>
          </>
        )}

        <p className="text-center mt-8 text-slate-600 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-emerald-600 font-black hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
