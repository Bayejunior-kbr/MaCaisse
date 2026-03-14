import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  BrainCircuit, 
  Zap, 
  ShieldCheck, 
  Smartphone, 
  BarChart3, 
  Users,
  ChevronRight,
  Store,
  CheckCircle2,
  Globe,
  WifiOff
} from 'lucide-react';
import { motion } from 'motion/react';

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
  >
    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{description}</p>
  </motion.div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50">
              <Store size={22} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">ShopMaster Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Tarifs</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-emerald-600 px-4 py-2 transition-colors">Connexion</Link>
            <Link to="/register" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all hover:-translate-y-0.5">
              Essai Gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full -z-10"></div>
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-emerald-100">
              <Zap size={14} className="fill-emerald-600" />
              Le futur de la gestion commerciale
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tight leading-[1.1]">
              Gérez votre boutique <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">avec intelligence.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
              ShopMaster Pro est la solution tout-en-un pour les commerçants modernes. POS, Inventaire, IA et mode Hors-ligne intégrés.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
                Commencer maintenant
                <ChevronRight size={20} />
              </Link>
              <Link to="/login" className="w-full sm:w-auto bg-white text-slate-900 border border-slate-200 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                Voir la démo
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl -z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&q=80&w=1600&h=900" 
              alt="Dashboard Preview" 
              className="rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl mx-auto"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Utilisateurs", value: "10k+" },
              { label: "Transactions", value: "2M+" },
              { label: "Pays", value: "15+" },
              { label: "Disponibilité", value: "99.9%" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-black text-emerald-600 mb-2">{stat.value}</p>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              Tout ce dont vous avez besoin pour réussir.
            </h2>
            <p className="text-lg text-slate-600">
              Une suite complète d'outils conçus pour simplifier votre quotidien et booster votre croissance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={ShoppingCart}
              title="Point de Vente (POS)"
              description="Une interface de vente ultra-rapide, tactile et intuitive. Gérez les remises, les taxes et les reçus en un clic."
              delay={0.1}
            />
            <FeatureCard 
              icon={Package}
              title="Gestion de Stock"
              description="Suivez vos produits en temps réel. Alertes de stock bas, gestion des catégories et inventaire automatisé."
              delay={0.2}
            />
            <FeatureCard 
              icon={BrainCircuit}
              title="Intelligence Artificielle"
              description="L'IA analyse vos ventes pour prédire les tendances, suggérer des prix et optimiser vos commandes."
              delay={0.3}
            />
            <FeatureCard 
              icon={WifiOff}
              title="Mode Hors-ligne"
              description="Continuez à vendre même sans internet. Vos données se synchronisent automatiquement dès le retour du réseau."
              delay={0.4}
            />
            <FeatureCard 
              icon={BarChart3}
              title="Analyses Avancées"
              description="Des rapports détaillés sur vos performances, vos marges et vos meilleures ventes pour décider avec précision."
              delay={0.5}
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Sécurité & Cloud"
              description="Vos données sont cryptées et sauvegardées quotidiennement dans le cloud. Accessibles partout, tout le temps."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 px-6 bg-emerald-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tight">Simple comme bonjour.</h2>
              <div className="space-y-12">
                {[
                  { step: "01", title: "Créez votre compte", desc: "Inscrivez votre boutique en moins de 2 minutes et configurez vos paramètres de base." },
                  { step: "02", title: "Ajoutez vos produits", desc: "Importez votre inventaire ou ajoutez vos articles manuellement avec leurs prix et stocks." },
                  { step: "03", title: "Commencez à vendre", desc: "Utilisez l'interface POS pour encaisser vos clients et générer des reçus instantanément." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-4xl font-black text-emerald-300/50">{item.step}</span>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-emerald-50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <motion.div
                initial={{ rotate: 5, y: 20 }}
                whileInView={{ rotate: 0, y: 0 }}
                className="bg-white p-4 rounded-[2.5rem] shadow-2xl"
              >
                <img 
                  src="https://images.unsplash.com/photo-1556742111-a301076d9d18?auto=format&fit=crop&q=80&w=800&h=1000" 
                  alt="POS Interface" 
                  className="rounded-[2rem] w-full"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">Ils nous font confiance.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Mamadou Diallo", role: "Gérant de Supérette", text: "Depuis que j'utilise ShopMaster Pro, ma gestion de stock est devenue un jeu d'enfant. L'IA m'aide vraiment à ne jamais être en rupture." },
              { name: "Awa Ndiaye", role: "Propriétaire de Boutique", text: "Le mode hors-ligne est une bénédiction. Même quand la connexion coupe, je continue mes ventes sans stress. C'est magique !" },
              { name: "Jean-Pierre", role: "Directeur Commercial", text: "Les rapports d'analyse sont d'une précision incroyable. J'ai pu augmenter mes marges de 15% en seulement 3 mois." }
            ].map((t, i) => (
              <div key={i} className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Zap key={i} size={14} className="text-amber-500 fill-amber-500" />)}
                </div>
                <p className="text-slate-700 mb-6 italic">"{t.text}"</p>
                <div>
                  <p className="font-bold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              Des tarifs simples et transparents.
            </h2>
            <p className="text-lg text-slate-600">
              Choisissez le plan qui correspond à la taille de votre entreprise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Gratuit</h3>
              <p className="text-slate-500 mb-6">Pour les petites boutiques</p>
              <div className="mb-8">
                <span className="text-5xl font-black text-slate-900">0 FCFA</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-10">
                {["POS Illimité", "Gestion de Stock", "Historique 30 jours", "Mode Hors-ligne"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block w-full text-center py-4 bg-slate-100 text-slate-900 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                Commencer gratuitement
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-emerald-600 p-10 rounded-3xl shadow-2xl shadow-emerald-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Recommandé</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Premium</h3>
              <p className="text-emerald-100 mb-6">Pour une croissance maximale</p>
              <div className="mb-8">
                <span className="text-5xl font-black text-white">10,000 FCFA</span>
                <span className="text-emerald-100">/mois</span>
              </div>
              <ul className="space-y-4 mb-10">
                {["Tout du plan Gratuit", "IA Insights Illimité", "Gestion Clients (CRM)", "Rapports Multi-boutiques", "Support Prioritaire 24/7"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={18} className="text-emerald-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block w-full text-center py-4 bg-white text-emerald-600 font-bold rounded-2xl hover:shadow-lg transition-all">
                Passer au Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tight">
              Prêt à transformer votre commerce ?
            </h2>
            <p className="text-xl text-emerald-100 mb-12 max-w-2xl mx-auto">
              Rejoignez des milliers de commerçants qui font confiance à ShopMaster Pro pour gérer leur entreprise au quotidien.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/register" className="w-full sm:w-auto bg-white text-slate-900 px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition-all">
                Créer mon compte
              </Link>
              <Link to="/login" className="w-full sm:w-auto text-white border border-white/30 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all">
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center text-white">
                <Store size={18} strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">ShopMaster Pro</span>
            </div>
            <p className="text-slate-500 max-w-sm leading-relaxed">
              La plateforme de gestion commerciale intelligente pour les boutiques modernes. Simplifiez vos opérations, augmentez vos ventes.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Produit</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">POS</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Inventaire</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">IA Insights</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Mode Offline</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Légal</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Confidentialité</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Conditions</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Sécurité</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-50 flex flex-col md:row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">© 2026 ShopMaster Pro. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Globe size={20} className="text-slate-400 hover:text-emerald-600 cursor-pointer" />
            <Smartphone size={20} className="text-slate-400 hover:text-emerald-600 cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
