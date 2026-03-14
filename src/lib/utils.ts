import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode: string = 'XOF') {
  // Map our internal codes to ISO codes if necessary
  const isoCode = currencyCode === 'FCFA' ? 'XOF' : currencyCode;
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: isoCode,
    minimumFractionDigits: 0,
  }).format(amount).replace('XOF', 'FCFA');
}
