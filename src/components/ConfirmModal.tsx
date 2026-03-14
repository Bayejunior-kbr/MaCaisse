import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      ></div>
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              variant === 'danger' ? "bg-red-50 text-red-600" :
              variant === 'warning' ? "bg-amber-50 text-amber-600" :
              "bg-blue-50 text-blue-600"
            )}>
              <AlertTriangle size={24} />
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500">{message}</p>
        </div>

        <div className="p-6 bg-slate-50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 px-6 py-3 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2",
              variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-100" :
              variant === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-100" :
              "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
            )}
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
