import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
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
import { DashboardStats } from '../types';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { secureFetch } from '../lib/api';
import { GoogleGenAI } from "@google/genai";
import { getCleanApiKey } from '../lib/gemini-config';

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue}
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

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

    const fetchStats = async () => {
      try {
        const res = await secureFetch('/api/dashboard/stats');
        if (!res.ok) {
          throw new Error(`Erreur serveur: ${res.status}`);
        }
        const data = await res.json();
        setStats(data);
        
        // Fetch quick AI insight if enabled
        const parsedUser = JSON.parse(storedUser || '{}');
        if (parsedUser.plan === 'premium' && parsedUser.has_ai_features) {
          fetchQuickInsight(data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
    fetchStats();
  }, []);

  const fetchQuickInsight = async (dashboardStats: any) => {
    setAiLoading(true);
    try {
      const apiKey = getCleanApiKey();
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set");
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Fournis un résumé très court (max 2 phrases) et percutant des statistiques suivantes pour un tableau de bord ERP. 
        Stats: ${JSON.stringify(dashboardStats)}`,
        config: {
          systemInstruction: "Tu es un expert en analyse de données commerciales. Ta réponse doit être en français, très concise et motivante."
        }
      });

      if (response.text) {
        setAiInsight(response.text);
      }
    } catch (err: any) {
      console.error("Quick insight error:", err);
      let msg = err.message || 'Impossible de générer des insights';
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "Quota d'IA épuisé.";
      }
      setAiInsight(`Erreur IA: ${msg}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Chargement...</div>;

  return (
    <div className="space-y-8">
      {subscription?.status === 'grace_period' && (
        <div className="bg-red-50 rounded-3xl p-6 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
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
        <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-emerald-900">
              <Zap className="text-emerald-600 fill-emerald-600" size={20} />
              Passez à ShopMaster Pro Premium
            </h3>
            <p className="text-emerald-700/70 text-sm">Débloquez l'IA, les rapports PDF et gérez des produits illimités.</p>
          </div>
          <Link to="/subscription" className="relative z-10 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-100 whitespace-nowrap">
            En savoir plus
          </Link>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-3xl -mr-20 -mt-20 rounded-full"></div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tableau de bord</h2>
          <p className="text-slate-500">Aperçu global de votre activité aujourd'hui</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          En direct
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ventes du jour" 
          value={formatCurrency(stats?.salesToday || 0, user?.currency)} 
          icon={DollarSign} 
          color="bg-emerald-600"
          trend="up"
          trendValue="+12%"
        />
        {(user?.role === 'owner' || user?.role === 'admin') && (
          <>
            <StatCard 
              title="Bénéfice Net" 
              value={formatCurrency((stats?.profitToday || 0) - (stats?.expensesToday || 0), user?.currency)} 
              icon={TrendingUp} 
              color="bg-blue-600"
              trend="up"
              trendValue="+8%"
            />
            <StatCard 
              title="Dépenses du jour" 
              value={formatCurrency(stats?.expensesToday || 0, user?.currency)} 
              icon={Receipt} 
              color="bg-red-500"
            />
          </>
        )}
        <StatCard 
          title="Dettes Clients" 
          value={formatCurrency(stats?.totalDebt || 0, user?.currency)} 
          icon={TrendingDown} 
          color="bg-amber-500"
          trend={stats?.totalDebt && stats.totalDebt > 0 ? "up" : undefined}
          trendValue="À recouvrer"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        <StatCard 
          title="Stock faible" 
          value={stats?.lowStockCount || 0} 
          icon={AlertTriangle} 
          color="bg-orange-500"
          trend={stats?.lowStockCount && stats.lowStockCount > 0 ? "down" : undefined}
          trendValue="Attention"
        />
        <StatCard 
          title="Total Produits" 
          value={stats?.totalProducts || 0} 
          icon={Package} 
          color="bg-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Ventes des 7 derniers jours</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.recentSales || []}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  formatter={(val: number) => [formatCurrency(val, user?.currency), 'Ventes']}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Conseils IA</h3>
          <div className="space-y-4">
            {aiLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            ) : aiInsight ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <BrainCircuit size={18} />
                  <span>Analyse Rapide</span>
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  {aiInsight}
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                    <BrainCircuit size={18} />
                    <span>Analyse Rapide</span>
                  </div>
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    Vos ventes ont augmenté de 12% aujourd'hui. Le produit "Lait Nido" est en rupture de stock imminente.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
                    <TrendingUp size={18} />
                    <span>Opportunité</span>
                  </div>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    La catégorie "Boissons" performe mieux le samedi. Pensez à faire une promotion groupée.
                  </p>
                </div>
              </>
            )}

            <Link to="/ai" className="block w-full text-center py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
              Voir tous les insights →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
