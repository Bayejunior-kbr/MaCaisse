import React, { useState } from 'react';
import { 
  User, 
  Globe, 
  Palette, 
  Image as ImageIcon, 
  FileText, 
  Zap,
  Check,
  ChevronRight,
  Plus,
  Bell,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation, Language } from '../lib/translations';
import { User as UserType } from '../types';

export default function Settings({ user, onUpdateUser }: { user: UserType, onUpdateUser: (user: UserType) => void }) {
  const { t } = useTranslation(user.language as Language || 'fr');
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'shop' | 'notifications'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: user.name || '',
    language: user.language || 'fr',
    currency: user.currency || 'FCFA',
    receipt_footer: user.receipt_footer || '',
    show_tax: user.show_tax || false,
    logo_url: user.logo_url || '',
    sms_enabled: user.sms_enabled || false,
    whatsapp_enabled: user.whatsapp_enabled || false,
    notification_template: user.notification_template || '',
    has_ai_features: user.has_ai_features || false
  });
  // Twilio status removed as requested

  const isPremium = user.plan === 'premium';

  const handleUpgrade = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/shop/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: 'premium' })
      });

      if (res.ok) {
        const updatedUser = { ...user, plan: 'premium' as const };
        onUpdateUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Upgrade failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (newSettings: Partial<typeof settings>) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      if (newSettings.name) {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: newSettings.name })
        });
      }

      const { name, ...shopSettings } = newSettings;
      if (Object.keys(shopSettings).length > 0) {
        if (!isPremium && activeTab !== 'profile') {
          console.log("Premium required for this action");
          return;
        }

        const endpoint = activeTab === 'notifications' ? '/api/shop/notifications/settings' : '/api/shop/settings';

        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(shopSettings)
        });
      }

      const updatedUser = { ...user, ...newSettings };
      if (newSettings.language) {
        localStorage.setItem('language', newSettings.language);
      }
      onUpdateUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      handleSave({ logo_url: base64 });
    } catch (err) {
      console.error("Logo conversion failed:", err);
      alert("Erreur lors de la lecture du logo");
    }
  };

  const tabs = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'appearance', label: t('appearance'), icon: Palette, premium: true },
    ...(user.role === 'owner' || user.role === 'admin' ? [
      { id: 'shop', label: t('shop'), icon: ImageIcon, premium: true },
      { id: 'notifications', label: t('notifications'), icon: Bell, premium: true }
    ] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{t('settings')}</h2>
        <p className="text-slate-500">Gérez votre compte et personnalisez votre expérience</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar Tabs - Scrollable on mobile */}
        <div className="w-full md:w-64 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal flex-shrink-0 md:flex-shrink",
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                  : "text-slate-600 hover:bg-white hover:text-emerald-600"
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={20} />
                <span className="font-bold text-sm">{tab.label}</span>
              </div>
              {tab.premium && !isPremium && (
                <Zap size={14} className="ml-2 text-amber-500 fill-amber-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {activeTab === 'profile' && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 text-center sm:text-left">
                <div className="w-20 h-20 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
                  <p className="text-slate-500 text-sm">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('name')}</label>
                  <input 
                    type="text" 
                    value={settings.name}
                    onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">{t('email')}</label>
                  <input 
                    type="email" 
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => handleSave({ name: settings.name })}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? t('saving') : t('save_changes')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="p-6 md:p-8 space-y-8">
              <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Globe size={20} className="text-emerald-600" />
                    {t('language')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'fr', name: 'Français' },
                      { id: 'en', name: 'English' },
                      { id: 'es', name: 'Español' },
                      { id: 'ar', name: 'العربية' }
                    ].map((lang) => (
                      <button 
                        key={lang.id}
                        onClick={() => handleSave({ language: lang.id })}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                          settings.language === lang.id 
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700" 
                            : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200"
                        )}
                      >
                        <span className="font-bold text-sm">{lang.name}</span>
                        {settings.language === lang.id && <Check size={16} className="text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Globe size={20} className="text-emerald-600" />
                    {t('currency')}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['FCFA', 'EUR', 'USD'].map((curr) => (
                      <button 
                        key={curr}
                        onClick={() => handleSave({ currency: curr })}
                        className={cn(
                          "flex items-center justify-center p-4 rounded-2xl border-2 transition-all font-black text-sm",
                          settings.currency === curr 
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700" 
                            : "border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200"
                        )}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'shop' && (
            <div className="p-6 md:p-8 space-y-8">
              <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ImageIcon size={20} className="text-emerald-600" />
                    {t('shop_logo')}
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div 
                      className="w-28 h-28 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer overflow-hidden relative shadow-inner"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <>
                          <Plus size={24} />
                          <span className="text-[10px] font-bold mt-1">Logo</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        id="logo-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-sm text-slate-600 mb-3">Format recommandé: PNG ou SVG (max 2Mo)</p>
                      <button 
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all"
                      >
                        Charger une image
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={20} className="text-emerald-600" />
                    Configuration des factures
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">{t('receipt_footer')}</label>
                      <textarea 
                        value={settings.receipt_footer}
                        onChange={(e) => setSettings(prev => ({ ...prev, receipt_footer: e.target.value }))}
                        onBlur={() => handleSave({ receipt_footer: settings.receipt_footer })}
                        placeholder="Ex: Merci de votre visite ! À bientôt."
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none h-24 resize-none transition-all"
                      ></textarea>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <input 
                        type="checkbox" 
                        id="show-tax" 
                        checked={settings.show_tax}
                        onChange={(e) => handleSave({ show_tax: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 bg-white" 
                      />
                      <label htmlFor="show-tax" className="text-sm font-bold text-slate-700">{t('show_tax')}</label>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <input 
                        type="checkbox" 
                        id="has-ai-features" 
                        checked={settings.has_ai_features}
                        onChange={(e) => handleSave({ has_ai_features: e.target.checked })}
                        className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 bg-white" 
                      />
                      <label htmlFor="has-ai-features" className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Zap size={14} className="text-amber-500 fill-amber-500" />
                        {t('enable_ai')}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6 md:p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Bell size={20} className="text-emerald-600" />
                  {t('notification_channels')}
                </h3>
                
                {/* Twilio status check removed */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">SMS</p>
                        <p className="text-[10px] text-slate-500">Envoyer des SMS</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.sms_enabled}
                        onChange={(e) => handleSave({ sms_enabled: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">WhatsApp</p>
                        <p className="text-[10px] text-slate-500">Messages WhatsApp</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.whatsapp_enabled}
                        onChange={(e) => handleSave({ whatsapp_enabled: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" />
                  Modèle de message
                </h3>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Modèle de notification</label>
                  <textarea 
                    value={settings.notification_template}
                    onChange={(e) => setSettings(prev => ({ ...prev, notification_template: e.target.value }))}
                    onBlur={() => handleSave({ notification_template: settings.notification_template })}
                    placeholder="Ex: Bonjour {customer_name}, votre achat de {amount} {currency} a été enregistré avec succès. Merci de votre confiance !"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none h-32 resize-none transition-all"
                  ></textarea>
                  <p className="text-[10px] text-slate-500 px-1">
                    Variables: <code className="bg-slate-100 px-1 rounded">{"{customer_name}"}</code>, <code className="bg-slate-100 px-1 rounded">{"{amount}"}</code>, <code className="bg-slate-100 px-1 rounded">{"{currency}"}</code>, <code className="bg-slate-100 px-1 rounded">{"{shop_name}"}</code>
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Zap size={20} className="text-amber-500" />
                  {t('test_config')}
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    placeholder="Numéro (ex: +22177...)"
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    id="test-phone"
                  />
                  <button 
                    onClick={async () => {
                      const phone = (document.getElementById('test-phone') as HTMLInputElement).value;
                      if (!phone) return alert('Veuillez saisir un numéro');
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch('/api/notifications/send', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            to: phone,
                            message: "Ceci est un message de test de ShopMaster Pro.",
                            type: settings.whatsapp_enabled ? 'whatsapp' : 'sms'
                          })
                        });
                        if (res.ok) alert('Message de test envoyé !');
                        else alert('Erreur lors de l\'envoi');
                      } catch (err) {
                        alert('Erreur réseau');
                      }
                    }}
                    className="px-8 py-3 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-100"
                  >
                    {t('test')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
