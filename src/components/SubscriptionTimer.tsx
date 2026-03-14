import React, { useState, useEffect } from 'react';
import { Clock, Zap, AlertTriangle } from 'lucide-react';
import { secureFetch } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';

export const SubscriptionTimer = ({ className, expiresAt, plan }: { className?: string, expiresAt?: string, plan?: string }) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    // If expiresAt is provided (e.g. from Admin Dashboard), use it.
    // Otherwise fetch for the current shop.
    if (expiresAt) {
      setSubscription({ subscription_expires_at: expiresAt, plan: plan || 'premium' });
      return;
    }

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
    const interval = setInterval(fetchSubscription, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [expiresAt, plan]);

  useEffect(() => {
    if (!subscription?.subscription_expires_at || subscription.plan === 'free') return;

    const updateTimer = () => {
      const expiry = new Date(subscription.subscription_expires_at).getTime();
      const now = Date.now();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expiré');
        setIsExpiringSoon(true);
        return;
      }

      // Calculate days, hours, minutes, seconds for a more "real-time" feel if it's close
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(formatDistanceToNow(expiry, { locale: fr, addSuffix: false }));
      }
      
      setIsExpiringSoon(diff < (3 * 24 * 60 * 60 * 1000)); // Less than 3 days
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [subscription]);

  if (!subscription || subscription.plan === 'free') return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
      isExpiringSoon 
        ? "bg-red-50 text-red-600 border border-red-100" 
        : "bg-amber-50 text-amber-600 border border-amber-100",
      className
    )}>
      <Clock size={12} className={cn(isExpiringSoon && "animate-spin-slow")} />
      <span>{timeLeft}</span>
      {isExpiringSoon && <AlertTriangle size={12} className="ml-1 animate-pulse" />}
    </div>
  );
};
