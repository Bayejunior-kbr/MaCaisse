import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Cloud,
  Menu,
  Mail,
  Package,
  Play,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from 'motion/react';

const demoItems = [
  { name: 'Lait en poudre', quantity: 2, price: 2400 },
  { name: 'Pain baguette', quantity: 3, price: 450 },
  { name: 'Café Touba', quantity: 1, price: 1300 },
];

const features = [
  {
    icon: ShoppingCart,
    title: 'Encaissez simplement',
    description:
      'Enregistrez vos ventes rapidement et retrouvez le détail de vos opérations.',
  },
  {
    icon: Package,
    title: 'Suivez votre stock',
    description:
      'Consultez vos produits et repérez plus facilement ceux à renouveler.',
  },
  {
    icon: BarChart3,
    title: 'Suivez votre activité',
    description:
      'Retrouvez vos ventes et vos rapports pour mieux comprendre votre commerce.',
  },
  {
    icon: WifiOff,
    title: 'Continuez hors ligne',
    description:
      'Gardez votre caisse à portée de main, même si la connexion est indisponible.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Créez votre boutique',
    description: 'Inscrivez-vous et ajoutez les informations de votre commerce.',
  },
  {
    number: '02',
    title: 'Ajoutez vos produits',
    description: 'Renseignez les produits, les prix et les quantités disponibles.',
  },
  {
    number: '03',
    title: 'Commencez à vendre',
    description: 'Encaissez vos clients et suivez votre activité au même endroit.',
  },
];

const durations = [
  { label: '3 mois', price: '27 000', saving: 'Économie : 3 000 FCFA' },
  { label: '6 mois', price: '50 000', saving: 'Économie : 10 000 FCFA' },
  { label: '1 an', price: '90 000', saving: 'Économie : 30 000 FCFA' },
];

const questions = [
  {
    question: 'Puis-je commencer gratuitement ?',
    answer:
      'Oui. Le plan Gratuit est à 0 FCFA et permet de démarrer avec jusqu’à 50 produits et les ventes de base.',
  },
  {
    question: 'Que comprend le plan Premium ?',
    answer:
      'L’offre Premium comprend notamment les produits illimités, les analyses IA, la sauvegarde automatique et les rapports PDF.',
  },
  {
    question: 'Puis-je utiliser MaCaisse sur mon téléphone ?',
    answer:
      'Oui. MaCaisse est conçue pour être utilisée sur téléphone comme sur ordinateur.',
  },
  {
    question: 'Comment choisir une durée Premium ?',
    answer:
      'Créez votre compte, puis choisissez la durée souhaitée depuis votre espace.',
  },
];

function Reveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function Logo() {
  return (
    <Link
      to="/"
      aria-label="MaCaisse, accueil"
      className="flex shrink-0 items-center gap-2"
    >
      <img src="/logo.png" alt="" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
      <span className="text-xl font-extrabold tracking-tight text-slate-900">
        <span className="text-brand-600">Ma</span>Caisse
      </span>
    </Link>
  );
}

function CaisseDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(prefersReducedMotion ? 5 : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setStep(5);
      return;
    }

    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % 7);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  const itemCount = Math.min(step, demoItems.length);
  const visibleItems = demoItems.slice(0, itemCount);
  const total = visibleItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const saleComplete = step === 5 || step === 6;

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-5 rounded-[2.5rem] bg-brand-100/80 blur-2xl" />

      <div className="relative rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-brand-900/10 sm:p-5">
        <div className="flex items-center justify-between rounded-t-2xl bg-brand-600 px-4 py-4 text-white sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <ShoppingCart size={19} />
            </span>
            <span>
              <span className="block font-bold">Caisse</span>
              <span className="block text-xs text-brand-100">Nouvelle vente</span>
            </span>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="min-h-56 space-y-2.5 p-3 sm:p-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleItems.map((item) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -14, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-slate-100 px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Package size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-800">
                      {item.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      Quantité : {item.quantity}
                    </span>
                  </span>
                </div>
                <span className="whitespace-nowrap text-sm font-bold text-slate-900">
                  {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {itemCount === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center text-center text-slate-400">
              <ShoppingCart size={28} strokeWidth={1.5} />
              <p className="mt-3 text-sm">Votre vente apparaîtra ici</p>
            </div>
          )}

          {itemCount > 0 && itemCount < 3 && (
            <motion.p
              key={itemCount}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-2 py-1 text-center text-xs text-slate-400"
            >
              Ajout d’un produit à la vente…
            </motion.p>
          )}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total de la vente</span>
            <motion.span
              key={total}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-extrabold text-slate-950"
            >
              {total.toLocaleString('fr-FR')} FCFA
            </motion.span>
          </div>

          <motion.div
            animate={{ scale: saleComplete ? 1 : 0.99 }}
            className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold transition-colors ${
              saleComplete
                ? 'bg-emerald-600 text-white'
                : 'bg-accent-500 text-slate-950'
            }`}
          >
            {saleComplete ? (
              <>
                <Check size={18} />
                Vente enregistrée
              </>
            ) : (
              <>
                Encaisser
                <ArrowRight size={17} />
              </>
            )}
          </motion.div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Sparkles size={19} />
        </span>
        <span>
          <span className="block text-sm font-bold text-slate-900">Démo illustrative</span>
          <span className="block text-xs text-slate-500">Exemple de vente</span>
        </span>
      </div>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideVideoPlaying, setGuideVideoPlaying] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
        <style>{`
          @keyframes landing-marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .landing-marquee-track {
            animation: landing-marquee 32s linear infinite;
          }
          .landing-marquee:hover .landing-marquee-track,
          .landing-marquee:focus-within .landing-marquee-track {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .landing-marquee-track {
              animation: none;
            }
          }
        `}</style>

        <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:h-20 sm:px-6">
            <Logo />

            <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
              <a href="#avantages" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">
                Avantages
              </a>
              <a href="#fonctionnement" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">
                Fonctionnement
              </a>
              <a href="#guide-video" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">
                Guide vidéo
              </a>
              <a href="#tarifs" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-brand-50 hover:text-brand-700">
                Tarifs
              </a>
              <Link to="/login" className="ml-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:text-brand-700">
                Connexion
              </Link>
              <Link to="/register" className="ml-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700">
                Créer ma boutique
              </Link>
            </nav>

            <div className="flex items-center gap-2 md:hidden">
              <Link to="/register" className="rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-bold text-white">
                Démarrer
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={menuOpen}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
              >
                {menuOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden" aria-label="Menu mobile">
              {[
                ['#avantages', 'Avantages'],
                ['#fonctionnement', 'Fonctionnement'],
                ['#guide-video', 'Guide vidéo'],
                ['#tarifs', 'Tarifs'],
              ].map(([href, label]) => (
                <a key={href} href={href} onClick={closeMenu} className="block rounded-xl px-3 py-3 font-semibold text-slate-700 hover:bg-brand-50">
                  {label}
                </a>
              ))}
              <Link to="/login" onClick={closeMenu} className="block rounded-xl px-3 py-3 font-semibold text-slate-700 hover:bg-brand-50">
                Connexion
              </Link>
            </nav>
          )}
        </header>

        <div aria-hidden="true" className="h-16 sm:h-20" />

        <main>
          <section className="relative px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
            <div className="pointer-events-none absolute -right-40 -top-32 h-96 w-96 rounded-full bg-amber-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -left-40 bottom-0 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />

            <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
                  <Sparkles size={16} />
                  La gestion du commerce, en plus simple
                </p>

                <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Votre boutique bien gérée,{' '}
                  <span className="relative inline-block text-brand-600">
                    chaque jour.
                    <span className="absolute -bottom-1 left-0 -z-10 h-3 w-full rounded-full bg-accent-500/60" />
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                  Encaissez en FCFA, suivez votre stock et gardez un œil sur votre activité,
                  depuis votre téléphone ou votre ordinateur.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 font-bold text-white shadow-lg shadow-brand-900/15 transition hover:-translate-y-0.5 hover:bg-brand-700">
                    Créer ma boutique gratuitement
                    <ArrowRight size={19} />
                  </Link>
                  <a href="#guide-video" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
                    <Play size={17} fill="currentColor" />
                    Voir le guide vidéo
                  </a>
                </div>

                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-slate-600">
                  {['Plan gratuit disponible', 'Prix en FCFA', 'Sur téléphone et ordinateur'].map((item) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      <Check size={16} className="text-brand-600" />
                      {item}
                    </span>
                  ))}
                </div>
              </Reveal>

              <Reveal>
                <CaisseDemo />
              </Reveal>
            </div>
          </section>

          <section className="landing-marquee overflow-hidden border-y border-amber-300 bg-accent-500 py-4" aria-label="Les avantages de MaCaisse">
            <div className="landing-marquee-track flex w-max items-center">
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
                  {['Caisse rapide', 'Stock sous contrôle', 'Ventes et rapports', 'Fonctionne hors ligne', 'Pensé pour le FCFA'].map((item) => (
                    <span key={`${copy}-${item}`} className="mx-5 inline-flex items-center gap-3 whitespace-nowrap text-sm font-extrabold text-slate-950 sm:mx-8 sm:text-base">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-700" />
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section id="avantages" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-6xl">
              <Reveal className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand-600">
                  Tout au même endroit
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  Plus de visibilité sur votre commerce.
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">
                  Les outils essentiels pour vendre, gérer vos produits et suivre votre activité.
                </p>
              </Reveal>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {features.map(({ icon: Icon, title, description }, index) => (
                  <Reveal key={title}>
                    <article className="h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${index === 1 ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-600'}`}>
                        <Icon size={23} />
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
                      <p className="mt-2 leading-relaxed text-slate-600">{description}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section id="fonctionnement" className="scroll-mt-24 bg-slate-50 px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <Reveal>
                <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand-600">
                  Pour commencer
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  Trois étapes. Et vous êtes prêt.
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">
                  Mettez en place une gestion simple, adaptée au quotidien de votre boutique.
                </p>
                <Link to="/register" className="mt-6 inline-flex items-center gap-2 font-bold text-brand-700 hover:text-brand-900">
                  Créer ma boutique <ArrowRight size={18} />
                </Link>
              </Reveal>

              <div className="space-y-3">
                {steps.map((step) => (
                  <Reveal key={step.number}>
                    <article className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:gap-5 sm:p-6">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-extrabold text-white">
                        {step.number}
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                        <p className="mt-1 leading-relaxed text-slate-600">{step.description}</p>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand-900 px-6 py-9 text-white sm:px-10 sm:py-12">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <Reveal>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-accent-500">
                    <Smartphone size={25} />
                  </div>
                  <h2 className="mt-5 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Pensé pour votre quotidien.
                  </h2>
                  <p className="mt-4 max-w-2xl leading-relaxed text-brand-100">
                    Une interface en français, des montants en FCFA et un accès sur téléphone comme sur ordinateur.
                  </p>
                </Reveal>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Users, label: 'Gestion des clients' },
                    { icon: Cloud, label: 'Sauvegarde' },
                    { icon: ShieldCheck, label: 'Données protégées' },
                    { icon: Smartphone, label: 'Accès mobile' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white">
                      <Icon size={17} className="shrink-0 text-accent-500" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="guide-video" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
              <Reveal>
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-xl shadow-brand-900/10">
                  <div className="relative aspect-video">
                    {guideVideoPlaying ? (
                      <iframe
                        className="absolute inset-0 h-full w-full"
                        src="https://www.youtube-nocookie.com/embed/SJQ9IR__kA8?autoplay=1&rel=0"
                        title="Guide complet de MaCaisse"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setGuideVideoPlaying(true)}
                        aria-label="Lire le guide vidéo complet de MaCaisse"
                        className="group absolute inset-0 flex w-full items-center justify-center bg-slate-900 text-white"
                      >
                        <img
                          src="https://img.youtube.com/vi/SJQ9IR__kA8/hqdefault.jpg"
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-65"
                        />
                        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-slate-950 shadow-lg transition duration-200 group-hover:scale-110 sm:h-20 sm:w-20">
                          <Play size={30} fill="currentColor" className="ml-1" />
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand-600">
                  Le guide complet
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  Découvrez MaCaisse, étape par étape.
                </h2>
                <p className="mt-4 leading-relaxed text-slate-600 sm:text-lg">
                  Regardez la présentation complète pour découvrir l’application et voir comment elle accompagne votre commerce au quotidien.
                </p>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Play size={15} className="text-brand-600" />
                  La vidéo démarre uniquement quand vous appuyez sur lecture.
                </p>
              </Reveal>
            </div>
          </section>

          <section id="tarifs" className="scroll-mt-24 bg-slate-50 px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-5xl">
              <Reveal className="mb-8 text-center">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-600">
                  Nos tarifs
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                  Simple pour commencer, complet pour grandir.
                </h2>
              </Reveal>

              <div className="grid gap-4 md:grid-cols-2">
                <Reveal>
                  <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-950">Gratuit</h3>
                        <p className="mt-1 text-sm text-slate-500">Pour démarrer</p>
                      </div>
                      <p className="whitespace-nowrap text-xl font-extrabold text-slate-950">
                        0 <span className="text-sm">FCFA</span>
                      </p>
                    </div>

                    <ul className="mt-5 space-y-2 text-sm text-slate-700">
                      {['Jusqu’à 50 produits', 'Ventes de base'].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check size={16} className="shrink-0 text-brand-600" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <Link to="/register" className="mt-5 block rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-800 transition hover:border-brand-500 hover:text-brand-700">
                      Commencer gratuitement
                    </Link>
                  </article>
                </Reveal>

                <Reveal>
                  <article className="rounded-2xl bg-brand-900 p-5 text-white sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-accent-400">
                          Premium
                        </span>
                        <p className="mt-1 text-sm text-brand-100">Plus d’outils pour votre boutique</p>
                      </div>
                      <p className="whitespace-nowrap text-lg font-extrabold sm:text-xl">
                        10 000 <span className="text-xs font-semibold text-brand-100">FCFA/mois</span>
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {durations.map((duration) => (
                        <div key={duration.label} className="rounded-xl bg-white/10 px-2 py-2 text-center">
                          <p className="text-[11px] font-medium text-brand-100">{duration.label}</p>
                          <p className="mt-0.5 text-sm font-extrabold">{duration.price}</p>
                          <p className="text-[10px] text-brand-100">FCFA</p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-brand-100">
                      Produits illimités · Analyses IA · Sauvegarde · Rapports PDF
                    </p>

                    <Link to="/register" className="mt-4 block rounded-xl bg-accent-500 px-4 py-3 text-center text-sm font-extrabold text-slate-950 transition hover:bg-amber-400">
                      Créer ma boutique
                    </Link>
                    <p className="mt-2 text-center text-[11px] text-brand-100">
                      Choisissez votre durée depuis votre compte.
                    </p>
                  </article>
                </Reveal>
              </div>
            </div>
          </section>

          <section className="px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-3xl">
              <Reveal className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Sparkles size={22} />
                </div>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  Questions fréquentes
                </h2>
              </Reveal>

              <div className="mt-7 space-y-3">
                {questions.map((item) => (
                  <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-5 open:border-brand-200 open:bg-brand-50/40">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                      {item.question}
                      <ChevronDown size={19} className="shrink-0 text-brand-600 transition group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 pr-7 leading-relaxed text-slate-600">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 pb-16 sm:px-6 sm:pb-20">
            <Reveal>
              <div className="mx-auto max-w-5xl rounded-[2rem] bg-brand-50 px-6 py-11 text-center sm:px-10 sm:py-14">
                <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand-600">
                  MaCaisse
                </p>
                <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  Prêt à mieux gérer votre boutique ?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
                  Créez votre compte et découvrez les outils pensés pour votre activité.
                </p>
                <Link to="/register" className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 font-extrabold text-white shadow-lg shadow-brand-900/15 transition hover:-translate-y-0.5 hover:bg-brand-700">
                  Commencer gratuitement <ArrowRight size={19} />
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="border-t border-slate-200 px-4 py-9 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo />
              <p className="mt-2 text-sm text-slate-500">
                La caisse et la gestion de stock pour votre boutique.
              </p>
            </div>

            <nav aria-label="Liens de pied de page" className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-600">
              <a href="#avantages" className="hover:text-brand-700">Avantages</a>
              <a href="#tarifs" className="hover:text-brand-700">Tarifs</a>
              <Link to="/login" className="hover:text-brand-700">Connexion</Link>
              <Link to="/register" className="hover:text-brand-700">Créer ma boutique</Link>
              <Link to="/conditions-utilisation" className="hover:text-brand-700">Conditions d’utilisation</Link>
              <Link to="/confidentialite" className="hover:text-brand-700">Confidentialité</Link>
              <Link to="/mentions-legales" className="hover:text-brand-700">Mentions légales</Link>
              <a href="mailto:macaisse80@gmail.com" className="hover:text-brand-700">Contact</a>
            </nav>
          </div>

          <p className="mx-auto mt-7 max-w-6xl border-t border-slate-100 pt-5 text-xs text-slate-400">
            © {new Date().getFullYear()} MaCaisse. Tous droits réservés.
          </p>
        </footer>
      </div>
    </MotionConfig>
  );
}

type LegalKind = 'terms' | 'privacy' | 'notice';

const legalContent: Record<LegalKind, { title: string; intro: string; sections: { title: string; paragraphs: string[] }[] }> = {
  terms: {
    title: "Conditions d’utilisation",
    intro: "Ces conditions expliquent les règles de base pour utiliser MaCaisse, l’outil de gestion destiné aux commerçants.",
    sections: [
      { title: 'Le service', paragraphs: ['MaCaisse permet notamment de gérer une boutique, des produits, le stock, les ventes et les informations clients saisies par l’utilisateur.', 'Les fonctionnalités et les offres disponibles peuvent évoluer. Les tarifs et les conditions d’une offre payante sont ceux présentés dans l’application au moment de la souscription.'] },
      { title: 'Votre compte et vos informations', paragraphs: ['Vous devez fournir des informations exactes, protéger vos identifiants et prévenir le support si vous pensez que votre compte a été utilisé sans votre autorisation.', 'Vous êtes responsable des informations que vous ajoutez dans votre boutique et devez disposer des droits nécessaires pour les utiliser, notamment pour les données de vos clients.'] },
      { title: 'Utilisation correcte', paragraphs: ['Vous vous engagez à utiliser MaCaisse conformément aux lois applicables et à ne pas tenter de perturber le service, d’accéder aux comptes d’autrui ou de contourner ses mesures de sécurité.'] },
      { title: 'Disponibilité et assistance', paragraphs: ['Nous faisons notre possible pour maintenir le service accessible et corriger les problèmes signalés. Des interruptions peuvent toutefois survenir pour maintenance, incident ou mise à jour.', 'Pour toute question, contactez-nous à macaisse80@gmail.com.'] },
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    intro: 'Cette page résume les données utilisées par MaCaisse pour fournir les fonctionnalités de gestion et aider à protéger les comptes.',
    sections: [
      { title: 'Données concernées', paragraphs: ['Selon les fonctionnalités utilisées, MaCaisse peut traiter les informations de compte (nom et adresse email), les informations de boutique ainsi que les produits, stocks, ventes et données clients que vous ajoutez.', 'Les données des clients de votre boutique sont saisies sous votre responsabilité. Vous devez les informer de l’usage de leurs informations et ne saisir que les données nécessaires à votre activité.'] },
      { title: 'Pourquoi nous les utilisons', paragraphs: ['Ces informations servent à créer et gérer votre compte, faire fonctionner les outils de caisse et de gestion, sécuriser le service, répondre à vos demandes et envoyer les emails nécessaires, par exemple pour réinitialiser un mot de passe.', 'Certaines fonctions facultatives d’assistance par intelligence artificielle peuvent traiter les informations que vous leur soumettez afin de produire une réponse. Évitez d’y inclure des informations sensibles ou inutiles.'] },
      { title: 'Prestataires et conservation', paragraphs: ['Le service s’appuie sur des prestataires techniques pour l’hébergement, l’authentification, la base de données, l’envoi des emails et certaines fonctions facultatives. La liste détaillée, les lieux de traitement et les durées de conservation seront précisés avec les informations complètes de l’éditeur.', 'Les données sont conservées aussi longtemps que nécessaire au fonctionnement de votre compte et au respect des obligations applicables. Les modalités détaillées de suppression seront précisées dans la version complète de cette politique.'] },
      { title: 'Vos demandes', paragraphs: ['Pour demander l’accès, la correction ou la suppression de vos informations, écrivez à macaisse80@gmail.com depuis l’adresse associée à votre compte. Nous vérifierons votre demande avant d’agir.'] },
    ],
  },
  notice: {
    title: 'Mentions légales',
    intro: 'Les informations ci-dessous identifient le service et son moyen de contact. Les informations juridiques de l’entreprise seront complétées lorsque sa situation sera finalisée.',
    sections: [
      { title: 'Éditeur du service', paragraphs: ['Nom du service : MaCaisse.', 'Adresse de contact : macaisse80@gmail.com.', 'Nom légal de l’éditeur, adresse professionnelle et informations d’immatriculation : à compléter.'] },
      { title: 'Hébergement et contact', paragraphs: ['Pour toute question relative au site ou à ces informations, écrivez à macaisse80@gmail.com. Les coordonnées complètes de l’hébergeur et les informations juridiques de l’éditeur seront ajoutées dans la version mise à jour.'] },
      { title: 'Propriété intellectuelle', paragraphs: ['Les éléments propres à MaCaisse — notamment son nom, son logo, ses textes et son interface — ne peuvent pas être réutilisés sans autorisation, sauf disposition légale contraire.'] },
    ],
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const page = legalContent[kind];
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 transition hover:text-brand-900"><ArrowLeft size={17} /> Retour à l’accueil</Link>
        <article className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <img src="/logo.png" alt="MaCaisse" className="mb-5 h-12 w-12 object-contain" />
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-600">MaCaisse</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{page.title}</h1>
            <p className="mt-4 leading-relaxed text-slate-600">{page.intro}</p>
            <p className="mt-3 text-xs text-slate-400">Version initiale — informations de l’éditeur et modalités détaillées à compléter.</p>
          </div>
          <div className="space-y-7">
            {page.sections.map((section) => <section key={section.title}><h2 className="text-lg font-extrabold text-slate-900">{section.title}</h2><div className="mt-2 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></section>)}
          </div>
          <a href="mailto:macaisse80@gmail.com" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-100"><Mail size={17} /> Contacter MaCaisse</a>
        </article>
      </div>
    </main>
  );
}
