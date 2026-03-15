import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { Store, User as UserIcon, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Register({ onLogin }: { onLogin: (user: User, token: string) => void }) {
  const [formData, setFormData] = useState({
    shopName: '',
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength < 3) {
      setError('Le mot de passe est trop faible. Veuillez utiliser au moins 8 caractères avec des lettres et des chiffres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await res.json();
          setError(data.error || `Erreur ${res.status}: ${res.statusText}`);
        } else {
          const text = await res.text();
          setError(`Erreur ${res.status}: ${text.substring(0, 100)}`);
        }
        return;
      }

      const data = await res.json();
      onLogin(data.user, data.token);
    } catch (err: any) {
      console.error("Register error:", err);
      setError(`Erreur de connexion au serveur. Veuillez vérifier votre connexion internet ou si le serveur est en ligne. (${err.message})`);
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
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Erreur lors de l\'inscription Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 mx-auto mb-4">
            <Store size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Créer votre boutique</h1>
          <p className="text-slate-500 mt-2">Rejoignez ShopMaster Pro aujourd'hui</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la boutique</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                placeholder="Ma Boutique"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Votre Nom</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                placeholder="Prénom Nom"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email professionnel</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            Créer mon compte
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Ou s'inscrire avec</span>
          </div>
        </div>

        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Google
        </button>

        <p className="text-center mt-8 text-slate-600 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-emerald-600 font-bold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
