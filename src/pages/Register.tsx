import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Package,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  GoogleAuthProvider,
  signInWithCustomToken,
  signInWithPopup,
} from 'firebase/auth';
import type { User } from '../types';
import { auth } from '../firebase';

type RegisterProps = {
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

const benefits = [
  { icon: ShoppingCart, label: 'Caisse simple' },
  { icon: Package, label: 'Stock suivi' },
  { icon: Smartphone, label: 'Sur téléphone' },
  { icon: WifiOff, label: 'Mode hors ligne' },
];

export default function Register({ onLogin }: RegisterProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
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

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!location.state) return;

    const { email, name } = location.state as {
      email?: string;
      name?: string;
    };

    setFormData((previous) => ({
      ...previous,
      email: email || previous.email,
      name: name || previous.name,
    }));
  }, [location.state]);

  let passwordStrength = 0;
  if (formData.password.length >= 8) passwordStrength++;
  if (/[A-Z]/.test(formData.password)) passwordStrength++;
  if (/[a-z]/.test(formData.password)) passwordStrength++;
  if (/[0-9]/.test(formData.password)) passwordStrength++;
  if (/[^A-Za-z0-9]/.test(formData.password)) passwordStrength++;

  const strengthLabels = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const strengthColors = [
    'bg-slate-200',
    'bg-rose-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-emerald-500',
  ];

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (
      !formData.shopName.trim() ||
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password
    ) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (passwordStrength < 3) {
      setError('Choisissez un mot de passe plus solide pour continuer.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          mode: 'register',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Impossible d'envoyer le code.");
      }

      setStep(2);
      setSuccess('Le code de vérification a été envoyé.');
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'envoi du code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setResendLoading(true);

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          mode: 'register',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Impossible de renvoyer le code.');
      }

      setSuccess('Un nouveau code vient de vous être envoyé.');
    } catch (err: any) {
      setError(err.message || 'Impossible de renvoyer le code pour le moment.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.code.trim()) {
      setError('Saisissez le code reçu par e-mail.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          shopName: formData.shopName,
          code: formData.code,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'La création du compte a échoué.');
      }

      const { token, user: userData, customToken } = await response.json();

      if (customToken) {
        try {
          await signInWithCustomToken(auth, customToken);
        } catch (firebaseError) {
          console.error('Firebase sign-in error:', firebaseError);
        }
      }

      onLogin(userData, token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const idToken = await googleUser.getIdToken();

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          shopName: formData.shopName || 'Ma Boutique',
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        if (
          response.status === 400 &&
          data.error &&
          data.error.includes('nom de boutique')
        ) {
          setFormData((previous) => ({
            ...previous,
            email: googleUser.email || previous.email,
            name: googleUser.displayName || previous.name,
          }));
          setStep(1);
          setError('Ajoutez le nom de votre boutique pour terminer.');
          return;
        }

        throw new Error(data.error || "L'inscription avec Google a échoué.");
      }

      const { token, user: userData } = await response.json();
      onLogin(userData, token);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError("Ce domaine n'est pas autorisé dans Firebase.");
      } else if (err.code === 'auth/popup-blocked') {
        setError('La fenêtre Google a été bloquée par votre navigateur.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('La fenêtre de connexion a été fermée avant la fin.');
      } else {
        setError(err.message || "L'inscription avec Google a échoué.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-slate-50 lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[0.9fr_1.1fr] lg:overflow-hidden">
        <aside className="relative isolate overflow-hidden bg-brand-900 px-5 py-5 text-white sm:px-8 sm:py-6 lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:overflow-hidden lg:px-10 lg:py-7 xl:px-12">
          <motion.div
            aria-hidden="true"
            animate={{ x: [0, 12, 0], y: [0, 10, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -right-28 -top-28 -z-10 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
          />
          <motion.div
            aria-hidden="true"
            animate={{ x: [0, -10, 0], y: [0, -8, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -bottom-36 -left-24 -z-10 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl"
          />

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
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, 4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-3 hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-accent-400 lg:flex"
            >
              <Sparkles size={20} />
            </motion.div>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent-400 sm:text-xs">
              Votre commerce, mieux organisé
            </p>

            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl xl:text-5xl">
              Créez votre espace.
              <span className="block text-brand-200">Gérez plus simplement.</span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-brand-100 sm:text-base">
              Rassemblez votre caisse, vos produits et le suivi de votre boutique dans un seul outil.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
              {benefits.map(({ icon: Icon, label }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 + index * 0.07 }}
                  whileHover={{
                    y: -3,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold sm:gap-2.5 sm:px-3.5 sm:text-sm"
                >
                  <Icon size={16} className="shrink-0 text-accent-400" />
                  {label}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <p className="mt-5 hidden text-[11px] text-brand-200 lg:block">
            MaCaisse · La gestion du commerce en plus simple
          </p>
        </aside>

        <section className="min-h-0 px-4 py-6 sm:px-8 sm:py-8 lg:h-screen lg:overflow-y-auto lg:overscroll-y-contain lg:px-10">
          <div className="mx-auto w-full max-w-xl">
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
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-brand-600">
                    Étape {step} sur 2
                  </p>
                  <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-950">
                    {step === 1 ? 'Créer mon compte' : 'Vérifier mon e-mail'}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {step === 1
                      ? 'Quelques informations pour préparer votre boutique.'
                      : 'Saisissez le code à 6 chiffres reçu par e-mail.'}
                  </p>
                </div>

                <div className="mt-1 flex shrink-0 items-center gap-1.5" aria-hidden="true">
                  {[1, 2].map((number) => (
                    <motion.span
                      key={number}
                      animate={{ scaleX: number <= step ? 1 : 0.65 }}
                      transition={{ duration: 0.25 }}
                      className={`h-1.5 w-7 origin-left rounded-full ${
                        number <= step ? 'bg-brand-600' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="alert"
                    className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="status"
                    className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                  >
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                  <motion.div
                    key="account-details"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <form onSubmit={handleSendCode} className="space-y-3.5">
                      <div>
                        <label htmlFor="shopName" className="mb-1 block text-sm font-bold text-slate-700">
                          Nom de la boutique
                        </label>
                        <div className="relative">
                          <Store className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                          <input
                            id="shopName"
                            type="text"
                            required
                            autoComplete="organization"
                            value={formData.shopName}
                            onChange={(event) =>
                              setFormData({ ...formData, shopName: event.target.value })
                            }
                            placeholder="Ex. Boutique Awa"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="fullName" className="mb-1 block text-sm font-bold text-slate-700">
                          Votre nom
                        </label>
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                          <input
                            id="fullName"
                            type="text"
                            required
                            autoComplete="name"
                            value={formData.name}
                            onChange={(event) =>
                              setFormData({ ...formData, name: event.target.value })
                            }
                            placeholder="Prénom et nom"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="registerEmail" className="mb-1 block text-sm font-bold text-slate-700">
                          Adresse e-mail
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                          <input
                            id="registerEmail"
                            type="email"
                            required
                            autoComplete="email"
                            value={formData.email}
                            onChange={(event) =>
                              setFormData({ ...formData, email: event.target.value })
                            }
                            placeholder="vous@exemple.com"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="registerPassword" className="mb-1 block text-sm font-bold text-slate-700">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                          <input
                            id="registerPassword"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={(event) =>
                              setFormData({ ...formData, password: event.target.value })
                            }
                            placeholder="8 caractères minimum"
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

                        {formData.password && (
                          <div className="mt-2">
                            <div className="flex gap-1" aria-hidden="true">
                              {[1, 2, 3, 4, 5].map((level) => (
                                <span
                                  key={level}
                                  className={`h-1 flex-1 rounded-full transition-colors ${
                                    level <= passwordStrength
                                      ? strengthColors[passwordStrength]
                                      : 'bg-slate-100'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              Force : {strengthLabels[passwordStrength]}
                            </p>
                          </div>
                        )}
                      </div>

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileTap={{ scale: 0.98 }}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-extrabold text-white shadow-lg shadow-brand-900/10 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <LoaderCircle size={18} className="animate-spin" />
                            Envoi du code…
                          </>
                        ) : (
                          <>
                            Continuer
                            <ArrowRight size={18} />
                          </>
                        )}
                      </motion.button>
                    </form>

                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-slate-200" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        ou
                      </span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleRegister}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <LoaderCircle size={18} className="animate-spin" />
                      ) : (
                        <GoogleMark />
                      )}
                      Continuer avec Google
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="email-verification"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="rounded-xl bg-brand-50 p-3.5">
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                            <Mail size={17} />
                          </span>
                          <p className="min-w-0 text-sm leading-relaxed text-slate-600">
                            Code envoyé à{' '}
                            <strong className="break-all text-slate-900">{formData.email}</strong>
                          </p>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="verificationCode" className="mb-1 block text-sm font-bold text-slate-700">
                          Code de vérification
                        </label>
                        <div className="relative">
                          <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600" size={18} />
                          <input
                            id="verificationCode"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                            maxLength={6}
                            value={formData.code}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                code: event.target.value.replace(/\D/g, ''),
                              })
                            }
                            placeholder="000000"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-3 text-center text-xl font-extrabold tracking-[0.45em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                          />
                        </div>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileTap={{ scale: 0.98 }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-extrabold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <LoaderCircle size={18} className="animate-spin" />
                            Création du compte…
                          </>
                        ) : (
                          <>
                            <Check size={18} />
                            Vérifier et créer mon compte
                          </>
                        )}
                      </motion.button>
                    </form>

                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        disabled={resendLoading || loading}
                        onClick={handleResendCode}
                        className="text-sm font-bold text-brand-700 transition hover:text-brand-900 disabled:opacity-50"
                      >
                        {resendLoading ? 'Envoi en cours…' : 'Renvoyer le code'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setError('');
                          setSuccess('');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
                      >
                        <ArrowLeft size={14} />
                        Modifier mes informations
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
                Déjà un compte ?{' '}
                <Link to="/login" className="font-extrabold text-brand-700 transition hover:text-brand-900">
                  Se connecter
                </Link>
              </p>
            </motion.div>

            <p className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
              <ShieldCheck size={13} />
              Vos informations servent à créer votre espace MaCaisse.
            </p>
          </div>
        </section>
      </main>
    </MotionConfig>
  );
}