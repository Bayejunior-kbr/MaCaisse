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
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError('Aucun compte n\'est associé à cet email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('L\'adresse email n\'est pas valide.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer plus tard.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 mx-auto mb-4">
            <Store size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Réinitialisation</h1>
          <p className="text-slate-500 mt-2">Retrouvez l'accès à votre compte</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Email envoyé !</h2>
            <p className="text-slate-600 mb-8">
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. 
              Veuillez vérifier votre boîte de réception (et vos spams).
            </p>
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
            >
              <ArrowLeft size={18} />
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email du compte</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                Envoyer le lien
              </button>

              <div className="text-center">
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium hover:text-emerald-600 transition-colors"
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
