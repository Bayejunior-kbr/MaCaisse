import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  WifiOff,
} from 'lucide-react';
import {
  GoogleAuthProvider,
  signInWithCustomToken,
  signInWithPopup,
} from 'firebase/auth';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { auth } from '../firebase';

type LoginProps = {
  onLogin: (user: User, token: string) => void;
};

const GoogleMark = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
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
);

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const idToken = await googleUser.getIdToken();

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = await response.json();

        if (
          response.status === 404 ||
          (data.error && data.error.includes('non trouvé'))
        ) {
          navigate('/register', {
            state: {
              email: googleUser.email,
              name: googleUser.displayName,
              uid: googleUser.uid,
              photoURL: googleUser.photoURL,
            },
          });
          return;
        }

        throw new Error(data.error || 'La connexion Google a échoué.');
      }

      const { token, user: userData } = await response.json();
      onLogin(userData, token);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError("Ce domaine n'est pas autorisé dans Firebase.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("La connexion Google n'est pas activée pour le moment.");
      } else if (err.code === 'auth/popup-blocked') {
        setError('La fenêtre Google a été bloquée par votre navigateur.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('La fenêtre de connexion a été fermée avant la fin.');
      } else {
        setError(err.message || 'Une erreur est survenue avec Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Vérifiez votre adresse e-mail et votre mot de passe.');
        return;
      }

      onLogin(data.user, data.token);

      if (data.customToken) {
        try {
          await signInWithCustomToken(auth, data.customToken);
        } catch (firebaseError) {
          console.error('Firebase sign-in error:', firebaseError);
        }
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Connexion impossible. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const highlights = [
    { icon: ShoppingCart, label: 'Caisse' },
    { icon: Package, label: 'Stock' },
    { icon: BarChart3, label: 'Rapports' },
    { icon: WifiOff, label: 'Mode hors ligne' },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-slate-50 lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[0.9fr_1.1fr] lg:overflow-hidden">
        <aside className="relative isolate overflow-hidden bg-brand-900 px-5 py-5 text-white sm:px-8 sm:py-6 lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:overflow-hidden lg:px-10 lg:py-7 xl:px-12">
          <div className="pointer-events-none absolute -right-28 -top-28 -z-10 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 -left-24 -z-10 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />

          <Link to="/" aria-label="MaCaisse, accueil" className="inline-flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
            <span className="text-xl font-extrabold tracking-tight">
              Ma<span className="text-accent-500">Caisse</span>
            </span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-6 max-w-xl sm:mt-7 lg:mt-12"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent-400 sm:text-xs">
              Heureux de vous revoir
            </p>

            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl xl:text-5xl">
              Votre boutique vous attend.
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-brand-100 sm:text-base">
              Retrouvez votre caisse, vos produits et le suivi de votre activité dans un seul espace.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
              {highlights.map(({ icon: Icon, label }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 + index * 0.07 }}
                  whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold sm:gap-2.5 sm:px-3.5 sm:text-sm"
                >
                  <Icon size={16} className="shrink-0 text-accent-400" />
                  {label}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="mt-5 hidden max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:block"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-accent-400">
                    <Store size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-white">Votre espace MaCaisse</span>
                    <span className="block text-xs text-brand-200">Prêt pour votre journée</span>
                  </span>
                </div>
                <motion.span
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.65, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-2.5 w-2.5 rounded-full bg-accent-400"
                  aria-label="En ligne"
                />
              </div>

              <div className="mt-4 flex h-12 items-end gap-2" aria-hidden="true">
                {[35, 55, 42, 76, 58, 88, 68, 100, 75, 92].map((height, index) => (
                  <motion.span
                    key={index}
                    initial={{ height: 4 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.45, delay: 0.25 + index * 0.04 }}
                    className={`flex-1 rounded-t-md ${
                      index === 7 ? 'bg-accent-400' : 'bg-brand-300/70'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-brand-200">Illustration de votre espace</p>
            </motion.div>
          </motion.div>

          <p className="mt-5 hidden text-[11px] text-brand-200 lg:mt-auto lg:block">
            MaCaisse · La gestion du commerce en plus simple
          </p>
        </aside>

        <section className="min-h-0 px-4 py-6 sm:px-8 sm:py-8 lg:h-screen lg:overflow-y-auto lg:overscroll-y-contain lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-700"
            >
              <ArrowLeft size={16} />
              Retour à l’accueil
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7"
            >
              <div className="mb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Store size={21} />
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
                  Bon retour !
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  Connectez-vous à votre espace MaCaisse.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="login-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <LoaderCircle size={18} className="animate-spin" /> : <GoogleMark />}
                Continuer avec Google
              </button>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  ou par e-mail
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="loginEmail" className="mb-1 block text-sm font-bold text-slate-700">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      id="loginEmail"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="vous@exemple.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label htmlFor="loginPassword" className="text-sm font-bold text-slate-700">
                      Mot de passe
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-brand-700 transition hover:text-brand-900"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      id="loginPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Votre mot de passe"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.985 }}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-extrabold text-white shadow-lg shadow-brand-900/10 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" />
                      Connexion…
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>

              <p className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
                Pas encore de compte ?{' '}
                <Link to="/register" className="font-extrabold text-brand-700 transition hover:text-brand-900">
                  Créer ma boutique
                </Link>
              </p>
            </motion.div>

            <p className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
              <ShieldCheck size={13} />
              Connexion sécurisée à votre espace MaCaisse.
            </p>
          </div>
        </section>
      </main>
    </MotionConfig>
  );
}