import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  History, 
  BrainCircuit, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Download,
  User as UserIcon,
  Users,
  UserPlus,
  Store,
  Receipt,
  ClipboardCheck,
  ChevronDown,
  ShieldCheck,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Expenses from './pages/Expenses';
import DailyClosing from './pages/DailyClosing';
import AIInsights from './pages/AIInsights';
import Suppliers from './pages/Suppliers';
import UsersPage from './pages/Users';
import Subscription from './pages/Subscription';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import LogoGenerator from './pages/LogoGenerator';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import { User } from './types';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { OfflineStatus } from './components/OfflineStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { testFirestoreConnection } from './lib/firebase-utils';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import { SubscriptionTimer } from './components/SubscriptionTimer';

const SidebarItem = ({ to, icon: Icon, label, active, premiumOnly, userPlan, adminOnly, ownerOnly, userRole, badgeCount, isSubItem }: { to: string, icon: any, label: string, active: boolean, premiumOnly?: boolean, userPlan?: string, adminOnly?: boolean, ownerOnly?: boolean, userRole?: string, badgeCount?: number, isSubItem?: boolean }) => {
  if (adminOnly && userRole !== 'admin') return null;
  if (ownerOnly && userRole !== 'owner' && userRole !== 'admin') return null;
  
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
        active 
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
          : "text-slate-600 hover:bg-slate-100 hover:text-emerald-600",
        isSubItem && "py-2 px-3 text-sm"
      )}
    >
      <Icon size={isSubItem ? 18 : 20} />
      <span className={cn("font-medium", isSubItem && "text-sm")}>{label}</span>
      {premiumOnly && userPlan !== 'premium' && (
        <Zap size={12} className="absolute right-3 text-amber-500 fill-amber-500" />
      )}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute right-3 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
          {badgeCount}
        </span>
      )}
    </Link>
  );
};

const SidebarGroup = ({ label, icon: Icon, children, active }: { label: string, icon: any, children: React.ReactNode, active?: boolean }) => {
  const [isOpen, setIsOpen] = useState(active || false);

  // Update isOpen when active prop changes (e.g. navigation)
  useEffect(() => {
    if (active) setIsOpen(true);
  }, [active]);

  return (
    <div 
      className="space-y-1"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        if (!active) setIsOpen(false);
      }}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-slate-600 hover:bg-slate-100",
          isOpen && "text-emerald-600"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon size={20} />
          <span className="font-semibold">{label}</span>
        </div>
        <ChevronDown size={16} className={cn("transition-transform duration-200", isOpen ? "rotate-180" : "")} />
      </button>
      {isOpen && (
        <div className="pl-4 space-y-1 mt-1 border-l-2 border-slate-100 ml-6">
          {children}
        </div>
      )}
    </div>
  );
};

const SidebarContent = ({ user, location, pendingRequestsCount, onLogout }: { user: User, location: any, pendingRequestsCount: number, onLogout: () => void }) => {
  return (
    <>
      <nav className="flex-1 space-y-2">
        <SidebarItem 
          to="/" 
          icon={LayoutDashboard} 
          label="Tableau de bord" 
          active={location.pathname === "/"} 
          userPlan={user.plan}
        />

        <SidebarGroup label="Ventes" icon={ShoppingCart} active={["/pos", "/history", "/closing"].includes(location.pathname)}>
          <SidebarItem 
            to="/pos" 
            icon={ShoppingCart} 
            label="Vendre" 
            active={location.pathname === "/pos"} 
            isSubItem
          />
          <SidebarItem 
            to="/history" 
            icon={History} 
            label="Historique" 
            active={location.pathname === "/history"} 
            isSubItem
          />
          <SidebarItem 
            to="/closing" 
            icon={ClipboardCheck} 
            label="Clôture de Caisse" 
            active={location.pathname === "/closing"} 
            isSubItem
          />
        </SidebarGroup>

        <SidebarGroup label="Gestion" icon={Package} active={["/inventory", "/expenses", "/customers", "/users"].includes(location.pathname)}>
          <SidebarItem 
            to="/inventory" 
            icon={Package} 
            label="Stock" 
            active={location.pathname === "/inventory"} 
            isSubItem
          />
          <SidebarItem 
            to="/expenses" 
            icon={Receipt} 
            label="Dépenses" 
            active={location.pathname === "/expenses"} 
            isSubItem
          />
          <SidebarItem 
            to="/customers" 
            icon={Users} 
            label="Clients" 
            active={location.pathname === "/customers"} 
            premiumOnly
            userPlan={user.plan}
            isSubItem
          />
          <SidebarItem 
            to="/suppliers" 
            icon={Store} 
            label="Fournisseurs" 
            active={location.pathname === "/suppliers"} 
            isSubItem
          />
          <SidebarItem 
            to="/users" 
            icon={UserPlus} 
            label="Utilisateurs" 
            active={location.pathname === "/users"} 
            ownerOnly
            userRole={user.role}
            isSubItem
          />
        </SidebarGroup>

        <SidebarGroup label="Analyses" icon={BrainCircuit} active={["/ai", "/logo-generator"].includes(location.pathname)}>
          <SidebarItem 
            to="/ai" 
            icon={BrainCircuit} 
            label="IA Insights" 
            active={location.pathname === "/ai"} 
            premiumOnly
            userPlan={user.plan}
            isSubItem
          />
          <SidebarItem 
            to="/logo-generator" 
            icon={ImageIcon} 
            label="Générateur de Logo" 
            active={location.pathname === "/logo-generator"} 
            isSubItem
          />
        </SidebarGroup>

        <SidebarGroup label="Système" icon={SettingsIcon} active={["/settings", "/subscription", "/admin"].includes(location.pathname)}>
          <SidebarItem 
            to="/settings" 
            icon={SettingsIcon} 
            label="Paramètres" 
            active={location.pathname === "/settings"} 
            isSubItem
          />
          <SidebarItem 
            to="/subscription" 
            icon={Zap} 
            label="Abonnement" 
            active={location.pathname === "/subscription"} 
            isSubItem
          />
        </SidebarGroup>
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100 shrink-0">
        {user.plan === 'free' && user.role !== 'admin' && (
          <Link 
            to="/subscription"
            className="mb-6 block p-4 bg-emerald-50 rounded-2xl text-emerald-900 relative overflow-hidden group border border-emerald-100"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Passer au Pro</p>
              <p className="text-xs font-medium text-emerald-800/70">Débloquez l'IA et plus encore.</p>
            </div>
            <Zap size={48} className="absolute -right-4 -bottom-4 text-emerald-600/10 group-hover:scale-110 transition-transform" />
          </Link>
        )}
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <UserIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              {user.plan === 'premium' && <Zap size={12} className="text-amber-500 fill-amber-500" />}
              {user.role === 'admin' && <ShieldCheck size={12} className="text-blue-500" />}
            </div>
            <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Déconnexion</span>
        </button>
      </div>
    </>
  );
};

const Layout = ({ children, user, onLogout }: { children: React.ReactNode, user: User, onLogout: () => void }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (user.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  useEffect(() => {
    if (user.role === 'admin') {
      fetchPendingRequests();
    }
  }, [user.role]);

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch('/api/admin/subscription-requests', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequestsCount(data.filter((r: any) => r.status === 'pending').length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/pos", icon: ShoppingCart, label: "Vendre" },
    { to: "/inventory", icon: Package, label: "Stock" },
    { to: "/history", icon: History, label: "Historique" },
    { to: "/expenses", icon: Receipt, label: "Dépenses", ownerOnly: true },
    { to: "/closing", icon: ClipboardCheck, label: "Clôture de Caisse" },
    { to: "/customers", icon: Users, label: "Clients", premiumOnly: true },
    { to: "/users", icon: UserPlus, label: "Utilisateurs", ownerOnly: true },
    { to: "/ai", icon: BrainCircuit, label: "IA Insights", premiumOnly: true },
    { to: "/settings", icon: SettingsIcon, label: "Paramètres" },
    { to: "/subscription", icon: Zap, label: "Abonnement" },
    { to: "/admin", icon: ShieldCheck, label: "Admin Console", adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-white flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-6 fixed h-full overflow-y-auto">
        <div className="flex items-center gap-3 mb-10 px-2 shrink-0">
          {user.logo_url ? (
            <img src={user.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200/50">
              <Store size={22} strokeWidth={2.5} />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{user.shopName || "ShopMaster Pro"}</h1>
        </div>

        <SidebarContent 
          user={user} 
          location={location} 
          pendingRequestsCount={pendingRequestsCount} 
          onLogout={onLogout} 
        />
        {deferredPrompt && (
          <div className="mt-4 px-2">
            <button 
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
            >
              <Download size={20} />
              Installer l'App
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm hidden sm:inline">Boutique:</span>
            <span className="font-semibold text-slate-800">{user.shopName}</span>
            {user.plan === 'premium' && (
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                <SubscriptionTimer className="hidden md:flex" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-slate-400 hover:text-emerald-600 transition-colors relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                      <h4 className="font-bold text-slate-800">Notifications</h4>
                      <button 
                        onClick={() => { markAllAsRead(); setIsNotificationsOpen(false); }}
                        className="text-xs text-emerald-600 font-bold hover:underline"
                      >
                        Tout marquer lu
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <Bell size={32} className="mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Aucune notification</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            onClick={() => { markAsRead(notification.id); setIsNotificationsOpen(false); }}
                            className={cn(
                              "p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors",
                              !notification.is_read && "bg-emerald-50/30"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                notification.type === 'LOW_STOCK' ? "bg-amber-500" : 
                                notification.type === 'SALE_ALERT' ? "bg-blue-500" :
                                "bg-emerald-500"
                              )} />
                              <div>
                                <p className="text-sm font-bold text-slate-800">{notification.title}</p>
                                <p className="text-xs text-slate-500 mt-1">{notification.message}</p>
                                <p className="text-[10px] text-slate-400 mt-2">
                                  {new Date(notification.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 flex-1 bg-white transition-colors duration-300">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="absolute inset-y-0 left-0 w-72 bg-white p-6 shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-10 shrink-0">
              <div className="flex items-center gap-3">
          {user.logo_url ? (
            <img src={user.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white">
              <Store size={22} strokeWidth={2.5} />
            </div>
          )}
                <h1 className="text-xl font-bold text-slate-800">{user.shopName || "ShopMaster Pro"}</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                <X size={24} />
              </button>
            </div>

            <SidebarContent 
              user={user} 
              location={location} 
              pendingRequestsCount={pendingRequestsCount} 
              onLogout={() => { setIsMobileMenuOpen(false); onLogout(); }} 
            />
            {deferredPrompt && (
              <div className="mt-4">
                <button 
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  <Download size={20} />
                  Installer l'App
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

const AdminLayout = ({ children, user, onLogout }: { children: React.ReactNode, user: User, onLogout: () => void }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 p-6 fixed h-full overflow-y-auto">
        <div className="flex items-center gap-3 mb-10 px-2 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200/50">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">SmartAdmin</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            to="/admin" 
            icon={ShieldCheck} 
            label="Console Centrale" 
            active={location.pathname === "/admin"} 
            userRole={user.role}
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate uppercase tracking-tighter">Super Admin</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            <span className="font-bold text-slate-800 uppercase tracking-widest text-sm">Système de Gestion Centralisé</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-6 flex-1 bg-slate-50 transition-colors duration-300">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="absolute inset-y-0 left-0 w-72 bg-white p-6 shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white">
                  <ShieldCheck size={22} strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">SmartAdmin</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              <SidebarItem 
                to="/admin" 
                icon={ShieldCheck} 
                label="Console Centrale" 
                active={location.pathname === "/admin"} 
                userRole={user.role}
              />
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100 shrink-0">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              >
                <LogOut size={20} />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogin = (userData: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
    if (userData.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    testFirestoreConnection();
    
    const refreshUser = () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        try {
          // Simple JWT expiration check
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && Date.now() >= payload.exp * 1000) {
            console.warn("Token expired, logging out...");
            handleLogout();
            return;
          }
          
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error("Error parsing token or user:", e);
          handleLogout();
        }
      }
    };

    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      refreshUser();
    }
    setLoading(false);

    window.addEventListener('user-updated', refreshUser);
    window.addEventListener('auth-error', handleLogout);

    // Sync Firebase Auth with local state
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && localStorage.getItem('token')) {
        // If we have a local token but Firebase says we're logged out, 
        // we might want to keep the local session for now as it's JWT based,
        // but ideally they should be in sync.
        console.log("Firebase user logged out, but local session exists.");
      }
    });

    return () => {
      window.removeEventListener('user-updated', refreshUser);
      window.removeEventListener('auth-error', handleLogout);
      unsubscribe();
    };
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Chargement...</div>;

  return (
    <ErrorBoundary>
      <NotificationProvider user={user}>
        <OfflineStatus />
        <Routes>
        <Route path="/" element={
          user ? (
            user.role === 'admin' ? (
              <Navigate to="/admin" />
            ) : (
              <Layout user={user} onLogout={handleLogout}>
                <Dashboard />
              </Layout>
            )
          ) : <Landing />
        } />

        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register onLogin={handleLogin} />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />

        <Route path="/inventory" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Inventory />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/pos" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <POS />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/history" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <SalesHistory />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/expenses" element={
          user && (user.role === 'owner' || user.role === 'admin') ? (
            <Layout user={user} onLogout={handleLogout}>
              <Expenses />
            </Layout>
          ) : <Navigate to="/" />
        } />

        <Route path="/closing" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <DailyClosing />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/customers" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Customers />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/suppliers" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Suppliers />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/users" element={
          user && (user.role === 'owner' || user.role === 'admin') ? (
            <Layout user={user} onLogout={handleLogout}>
              <UsersPage />
            </Layout>
          ) : <Navigate to="/" />
        } />

        <Route path="/ai" element={
          user && (user.role === 'owner' || user.role === 'admin') ? (
            <Layout user={user} onLogout={handleLogout}>
              <AIInsights />
            </Layout>
          ) : <Navigate to="/" />
        } />

        <Route path="/logo-generator" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <LogoGenerator />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/subscription" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Subscription user={user} onUpdateUser={setUser} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/admin" element={
          user && user.role === 'admin' ? (
            <AdminLayout user={user} onLogout={handleLogout}>
              <AdminDashboard />
            </AdminLayout>
          ) : <Navigate to="/" />
        } />

        <Route path="/settings" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Settings user={user} onUpdateUser={setUser} />
            </Layout>
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </NotificationProvider>
    </ErrorBoundary>
  );
}


