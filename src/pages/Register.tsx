import React, { useState, useEffect } from 'react';
import { Link, useNavigate as navigateHook, useLocation } from 'react-router-dom';
import { User } from '../types';
import { Store, User as UserIcon, Mail, Lock, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithCustomToken
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

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
  const navigate = navigateHook();
  const location = useLocation();

  // Handle Google redirect data
  useEffect(() => {
    if (location.state) {
      const { email, name } = location.state;
      setFormData(prev => ({ ...prev, email: email || '', name: name || '' }));
    }
  }, [location.state]);

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

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          mode: 'register'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erreur lors de l'envoi du code");
      }

      setStep(2);
      setSuccess('Code de vérification envoyé !');
    } catch (err: any) {
      console.error("Send code error:", err);
      setError(err.message || "Erreur lors de l'envoi du code. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code) {
      setError('Veuillez entrer le code de vérification.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          shopName: formData.shopName,
          code: formData.code
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erreur lors de la création du compte");
      }

      const { token, user: userData, customToken } = await response.json();
      
      // If server provided a custom token, sign in to Firebase with it
      if (customToken) {
        try {
          await signInWithCustomToken(auth, customToken);
        } catch (e) {
          console.error("Failed to sign in with custom token:", e);
        }
      }

      onLogin(userData, token);
      navigate('/');
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Erreur lors de la création du compte. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      // Call server to check if user exists or create them
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idToken,
          shopName: formData.shopName || `${user.displayName || 'Ma'}'s Shop`
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        // If shop name is required but not provided
        if (response.status === 400 && errData.error && errData.error.includes("nom de boutique")) {
          setFormData({
            ...formData,
            email: user.email || '',
            name: user.displayName || '',
          });
          setStep(1);
          setError('Veuillez fournir un nom pour votre boutique.');
          return;
        }
        throw new Error(errData.error || "Erreur serveur lors de l'inscription Google");
      }

      const { token, user: userData } = await response.json();
      onLogin(userData, token);
      navigate('/');
    } catch (err: any) {
      console.error("Google register error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Ce domaine n'est pas autorisé dans Firebase. Veuillez l'ajouter dans la console Firebase.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Le popup a été bloqué par votre navigateur. Veuillez autoriser les popups.");
      } else {
        setError("Erreur lors de l'inscription avec Google : " + (err.message || "Inconnue"));
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
            {step === 1 ? 'Créer votre boutique' : 'Vérification'}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {step === 1 ? 'Rejoignez ShopMaster Pro aujourd\'hui' : 'Entrez le code envoyé par email'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {step === 1 ? (
          <>
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Nom de la boutique</label>
                <div className="relative group">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="Ma Boutique"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Votre Nom</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="Prénom Nom"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email professionnel</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                {formData.password && (
                  <div className="mt-2 px-1">
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                Continuer
              </button>
            </form>

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
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              S'inscrire avec Google
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-4 text-center">Code de vérification</label>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
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

        <p className="text-center mt-8 text-slate-600 font-medium">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-emerald-600 font-black hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
