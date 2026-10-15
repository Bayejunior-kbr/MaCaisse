import { motion } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  DollarSign,
  BrainCircuit,
  Zap,
  Receipt
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation, Language } from '../lib/translations';
import { DashboardStats } from '../types';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { secureFetch } from '../lib/api';
import { GoogleGenAI } from '@google/genai';
import { getCleanApiKey } from '../lib/gemini-config';

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3 }}
    transition={{ duration: 0.25 }}
    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
  >
    <div className="mb-3 flex items-start justify-between">
      <div className={cn('rounded-xl p-2.5', color)}>
        <Icon size={21} className="text-white" />
      </div>

      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold',
            trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
          )}
        >
          {trendValue}
        </div>
      )}
    </div>

    <h3 className="mb-1 text-sm font-medium text-slate-500">{title}</h3>
    <p className="text-xl font-bold text-slate-800 sm:text-2xl">{value}</p>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { t } = useTranslation(user?.language as Language || 'fr');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    const fetchSubscription = async () => {
      try {
        const res = await secureFetch('/api/shop/subscription');
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setSubscription(data);
          } else {
            console.warn("Subscription API returned non-JSON response");
          }
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
      }
    };

    fetchSubscription();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await secureFetch(`/api/dashboard/stats?date=${selectedDate}`);
        if (!res.ok) {
          throw new Error(`Erreur serveur: ${res.status}`);
        }
        const data = await res.json();
        setStats(data);
        
        // Fetch quick AI insight if enabled
        const storedUser = localStorage.getItem('user');
        const parsedUser = JSON.parse(storedUser || '{}');
        if (parsedUser.plan === 'premium' || parsedUser.role === 'owner') {
          fetchQuickInsight(data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedDate]);

  const fetchQuickInsight = async (dashboardStats: DashboardStats) => {
    setAiLoading(true);
    try {
      const apiKey = getCleanApiKey();
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set");
        return;
      }
      
      const lang = localStorage.getItem('language') || 'fr';
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyse ces statistiques de vente d'aujourd'hui pour un commerçant et donne un conseil stratégique très court (max 2 phrases). 
        Stats du jour: 
        - Ventes: ${dashboardStats.salesToday}
        - Bénéfice: ${dashboardStats.profitToday}
        - Dépenses: ${dashboardStats.expensesToday}
        - Produits en stock faible: ${dashboardStats.lowStockCount}
        - Total produits: ${dashboardStats.totalProducts}
        - Dettes clients: ${dashboardStats.totalDebt}
        - Historique récent: ${JSON.stringify(dashboardStats.recentSales)}`,
        config: {
          systemInstruction: lang === 'fr' 
            ? "Tu es un expert en gestion de commerce de détail. Ta réponse doit être en français, très concise, basée uniquement sur les chiffres fournis, et offrir une action concrète immédiate."
            : "You are a retail management expert. Your response must be in English, very concise, based only on the provided figures, and offer an immediate concrete action."
        }
      });

      if (response.text) {
        setAiInsight(response.text);
      }
    } catch (err: any) {
      console.error("Quick insight error:", err);
      const lang = localStorage.getItem('language') || 'fr';
      let msg = err.message || (lang === 'fr' ? 'Impossible de générer des insights' : 'Unable to generate insights');
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = lang === 'fr' ? "Quota d'IA épuisé." : "AI Quota exhausted.";
      }
      setAiInsight(lang === 'fr' ? `Erreur IA: ${msg}` : `AI Error: ${msg}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Chargement...</div>;

  return (
    <div className="space-y-5">
      {subscription?.status === 'grace_period' && (
        <div className="bg-red-50 rounded-3xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-red-900">
              <AlertTriangle className="text-red-600" size={20} />
              Abonnement Expiré - Période de Grâce
            </h3>
            <p className="text-red-700/70 text-sm">Votre abonnement a expiré. Veuillez renouveler rapidement pour éviter la suppression de vos données.</p>
          </div>
          <Link to="/subscription" className="relative z-10 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-100 whitespace-nowrap">
            Renouveler maintenant
          </Link>
        </div>
      )}

      {user?.plan === 'free' && subscription?.status !== 'grace_period' && (
  <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="relative z-10">
      <h3 className="flex items-center gap-2 text-base font-bold text-brand-900 sm:text-lg">
        <Zap className="shrink-0 text-brand-600" size={19} />
        Passez à MaCaisse Premium
      </h3>
      <p className="mt-1 text-sm text-brand-800/80">
        Débloquez l’IA, les rapports PDF et les produits illimités.
      </p>
    </div>

    <Link
      to="/subscription"
      className="relative z-10 inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-700"
    >
      Voir Premium
    </Link>
  </div>
)}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('dashboard')}</h2>
          <p className="text-slate-500">
            {selectedDate === new Date().toISOString().split('T')[0] 
              ? t('dashboard_overview_today')
              : `${t('dashboard_overview_date')} ${new Date(selectedDate).toLocaleDateString(localStorage.getItem('language') === 'fr' ? 'fr-FR' : 'en-US')}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white shadow-sm hover:border-emerald-300 cursor-pointer"
            />
            <CalendarIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 flex items-center gap-2 shadow-sm">
            <div className={cn(
              "w-2 h-2 rounded-full",
              selectedDate === new Date().toISOString().split('T')[0] ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            )}></div>
            {selectedDate === new Date().toISOString().split('T')[0] ? t('live') : t('history')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={selectedDate === new Date().toISOString().split('T')[0] ? t('daily_sales') : t('period_sales')} 
          value={formatCurrency(stats?.salesToday || 0, user?.currency)} 
          icon={DollarSign} 
          color="bg-emerald-600"
        />
        {(user?.role === 'owner' || user?.role === 'admin') && (
          <>
            <StatCard 
              title={selectedDate === new Date().toISOString().split('T')[0] ? t('net_profit') : t('period_profit')} 
              value={formatCurrency((stats?.profitToday || 0) - (stats?.expensesToday || 0), user?.currency)} 
              icon={TrendingUp} 
              color="bg-blue-600"
            />
            <StatCard 
              title={selectedDate === new Date().toISOString().split('T')[0] ? t('daily_expenses') : t('period_expenses')} 
              value={formatCurrency(stats?.expensesToday || 0, user?.currency)} 
              icon={Receipt} 
              color="bg-red-500"
            />
          </>
        )}
        <StatCard 
          title={t('customer_debts')} 
          value={formatCurrency(stats?.totalDebt || 0, user?.currency)} 
          icon={TrendingDown} 
          color="bg-amber-500"
          trend={stats?.totalDebt && stats.totalDebt > 0 ? "up" : undefined}
          trendValue={t('to_recover')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <StatCard 
          title={t('low_stock')} 
          value={stats?.lowStockCount || 0} 
          icon={AlertTriangle} 
          color="bg-orange-500"
          trend={stats?.lowStockCount && stats.lowStockCount > 0 ? "down" : undefined}
          trendValue="Attention"
        />
        <StatCard 
          title={t('total_products')} 
          value={stats?.totalProducts || 0} 
          icon={Package} 
          color="bg-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">{t('last_7_days_sales')}</h3>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.recentSales || []}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#044598" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#044598" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'currentColor', fontSize: 12}}
                  className="text-slate-500"
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'currentColor', fontSize: 12}}
                  className="text-slate-500"
                  tickFormatter={(val) => `${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#ffffff',
                    color: '#1e293b'
                  }}
                  itemStyle={{
                    color: '#1e293b'
                  }}
                  formatter={(val: number) => [formatCurrency(val, user?.currency), 'Ventes']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#044598"
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">{t('ai_advice')}</h3>
          <div className="space-y-4">
            {aiLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            ) : aiInsight ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <BrainCircuit size={18} />
                  <span>{t('real_time_analysis')}</span>
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  {aiInsight}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-2">
                  <BrainCircuit size={18} />
                  <span>{t('ai_advice')}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  {t('ai_premium_only')}
                </p>
              </div>
            )}

            <Link to="/ai" className="block w-full text-center py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
              {t('view_all_insights')} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
