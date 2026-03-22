import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2, Store } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Une erreur est survenue. Veuillez réessayer plus tard.');
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError('Une erreur est survenue. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 mx-auto mb-6">
            <Store size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Réinitialisation</h1>
          <p className="text-slate-500 mt-2 font-medium">Retrouvez l'accès à votre compte</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Email envoyé !</h2>
            <p className="text-slate-600 mb-10 leading-relaxed">
              Un lien de réinitialisation a été envoyé à <br />
              <strong className="text-slate-900">{email}</strong>. 
              Veuillez vérifier votre boîte de réception.
            </p>
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-emerald-600 font-black hover:underline group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Email du compte</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={22} /> : <Mail size={22} />}
                Envoyer le lien
              </button>

              <div className="text-center">
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 text-slate-500 text-sm font-bold hover:text-emerald-600 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
