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

const AnimatedStock = () => (
  <div className="relative w-full h-full min-h-[400px] bg-slate-50 rounded-3xl overflow-hidden flex items-center justify-center border border-slate-100 shadow-inner">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent"></div>
    <div className="grid grid-cols-3 gap-4 p-8 w-full max-w-md">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            delay: i * 0.1, 
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 2
          }}
          className="aspect-square bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 group hover:border-emerald-200 transition-colors"
        >
          <Package className="text-emerald-500" size={24} />
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: ["20%", "80%", "40%", "90%"] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="h-full bg-emerald-500"
            />
          </div>
        </motion.div>
      ))}
    </div>
    
    {/* Floating Elements */}
    <motion.div 
      animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
      transition={{ duration: 5, repeat: Infinity }}
      className="absolute top-10 right-10 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
    >
      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
        <Zap size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alerte Stock</p>
        <p className="text-sm font-bold text-slate-900">Sucre: 5kg restant</p>
      </div>
    </motion.div>

    <motion.div 
      animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
      transition={{ duration: 6, repeat: Infinity, delay: 1 }}
      className="absolute bottom-10 left-10 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
    >
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
        <ShoppingCart size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vente Récente</p>
        <p className="text-sm font-bold text-slate-900">+12,500 FCFA</p>
      </div>
    </motion.div>
  </div>
);

const AnimatedPOS = () => (
  <div className="relative w-full aspect-[3/4] bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border-8 border-slate-800 overflow-hidden">
    <div className="h-full flex flex-col">
      {/* POS Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
            <Store size={16} />
          </div>
          <span className="text-xs font-bold text-white">Caisse 01</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        </div>
      </div>

      {/* POS Items List */}
      <div className="flex-1 space-y-3">
        {[
          { name: "Lait Bonnet Rouge", qty: 2, price: "1,200" },
          { name: "Pain Baguette", qty: 3, price: "450" },
          { name: "Café Touba", qty: 1, price: "2,500" }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.2 }}
            className="p-3 bg-white/5 rounded-xl flex items-center justify-between border border-white/10"
          >
            <div>
              <p className="text-xs font-bold text-white">{item.name}</p>
              <p className="text-[10px] text-slate-400">x{item.qty}</p>
            </div>
            <p className="text-xs font-bold text-emerald-400">{item.price} F</p>
          </motion.div>
        ))}
      </div>

      {/* POS Total */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex justify-between mb-4">
          <span className="text-slate-400 text-sm">Total</span>
          <span className="text-xl font-black text-white">4,150 FCFA</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-colors"
        >
          Encaisser
        </motion.button>
      </div>
    </div>

    {/* AI Badge */}
    <motion.div
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/30 rounded-full"
    >
      <BrainCircuit className="text-emerald-400" size={40} />
    </motion.div>
  </div>
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
              Propulsez votre commerce <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">vers le succès.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
              La solution de gestion intelligente conçue pour les entrepreneurs africains. POS, Stocks, IA et Cloud réunis dans une seule application.
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
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-emerald-500/20 to-transparent blur-3xl -z-10"></div>
            <AnimatedStock />
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

          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={ShoppingCart}
              title="Vente Rapide (POS)"
              description="Interface tactile optimisée. Encaissez en quelques secondes, gérez les remises et les modes de paiement (Cash, Mobile Money)."
              delay={0.1}
            />
            <FeatureCard 
              icon={Package}
              title="Stocks & Inventaire"
              description="Suivi précis des quantités. Alertes automatiques de rupture et historique complet des mouvements de stock."
              delay={0.2}
            />
            <FeatureCard 
              icon={BarChart3}
              title="Rapports de Ventes"
              description="Visualisez vos bénéfices réels. Rapports journaliers, hebdomadaires et mensuels exportables en PDF."
              delay={0.3}
            />
            <FeatureCard 
              icon={BrainCircuit}
              title="IA & Prédictions"
              description="L'intelligence artificielle analyse vos données pour vous dire quoi commander et quand, selon les tendances."
              delay={0.4}
            />
            <FeatureCard 
              icon={Globe}
              title="Multi-boutiques"
              description="Gérez plusieurs points de vente depuis un seul compte. Centralisez vos stocks et comparez les performances."
              delay={0.5}
            />
            <FeatureCard 
              icon={Smartphone}
              title="Reçus Numériques"
              description="Générez des reçus professionnels et partagez-les instantanément avec vos clients. Économisez sur le papier et modernisez votre image."
              delay={0.6}
            />
            <FeatureCard 
              icon={WifiOff}
              title="Mode Hors-ligne"
              description="Pas d'internet ? Pas de problème. Vendez normalement, vos données se synchronisent dès que vous êtes connecté."
              delay={0.7}
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Cloud Sécurisé"
              description="Vos données sont protégées et sauvegardées automatiquement. Accédez à votre boutique depuis n'importe quel appareil."
              delay={0.8}
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
                <AnimatedPOS />
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
              { name: "Moussa Traoré", role: "Propriétaire de Quincaillerie", text: "ShopMaster Pro a changé ma vie. Je sais exactement ce qu'il me reste en stock sans avoir à tout compter chaque soir." },
              { name: "Fatou Diop", role: "Gérante de Prêt-à-porter", text: "L'envoi des reçus par WhatsApp est génial ! Mes clientes adorent et ça me donne une image très professionnelle." },
              { name: "Koffi Mensah", role: "Directeur de Supérette", text: "Gérer mes trois boutiques depuis mon téléphone est devenu possible grâce à cette application. Un gain de temps énorme." }
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
                {["POS Illimité", "Gestion de Stock", "Historique 30 jours", "Mode Hors-ligne"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={18} className="text-emerald-300" />
                    {item}
                  </li>
                ))}
                {["Gestion Clients", "Gestion Fournisseurs", "Gestion Utilisateurs", "IA Insights", "Multi-boutiques"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-emerald-200/50">
                    <CheckCircle2 size={18} />
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
          <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/5 backdrop-blur-3xl"></div>
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
