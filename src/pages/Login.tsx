import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { LogIn, Mail, Lock, Loader2, Store, CheckCircle2 } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (step === 2) setResendLoading(true);
    else setLoading(true);
    
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setStep(2);
        setMessage('Un code de vérification a été envoyé à votre adresse email.');
      } else {
        setError(data.error || 'Erreur lors de l\'envoi du code');
      }
    } catch (err: any) {
      setError(`Erreur de connexion. (${err.message})`);
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
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code: verificationCode }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Code ou mot de passe incorrect');
        return;
      }

      const data = await res.json();
      onLogin(data.user, data.token);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(`Erreur de connexion au serveur. (${err.message})`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
        setError(data.error || 'Erreur de connexion Google');
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('Le popup a été bloqué par votre navigateur. Veuillez autoriser les popups pour ce site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // No error message needed if user closed it
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Ce domaine n\'est pas autorisé pour l\'authentification Google. Veuillez contacter l\'administrateur.');
      } else {
        setError(`Erreur lors de la connexion Google: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 mx-auto mb-6">
            <Store size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bon retour !</h1>
          <p className="text-slate-500 mt-2">Connectez-vous pour gérer votre boutique</p>
        </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm border border-emerald-100">
              {message}
            </div>
          )}

          <form onSubmit={step === 1 ? handleSendCode : handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  disabled={step === 2}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50 disabled:opacity-50"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Code de vérification (OTP)</label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Mot de passe</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all bg-slate-50/50"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              {step === 1 ? 'Envoyer le code' : 'Se connecter'}
            </button>

            {step === 2 && (
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
                  className="w-full text-slate-500 text-xs font-bold hover:underline"
                >
                  Modifier l'email
                </button>
              </div>
            )}
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="px-4 bg-white">Ou continuer avec</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>

          <p className="text-center mt-10 text-slate-600 text-sm">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-emerald-600 font-black hover:underline">
              Créer une boutique
            </Link>
          </p>
      </div>
    </div>
  );
}
